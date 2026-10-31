import express from "express";
import fs from "node:fs";
import path from "node:path";
import { admin, asUser } from "../db.js";
import { config } from "../config.js";
import { requireUser } from "../auth.js";
import { canPrepare } from "../usage.js";
import { addToTracker } from "./postings.js";

export const applications = express.Router();

const UUID = /^[0-9a-f-]{36}$/i;
applications.param("id", (req, res, next, id) => (UUID.test(id) ? next() : res.status(404).json({ error: "Application not found." })));

const SELECT = `
  select a.id, a.posting_id, a.company, a.role, a.status, a.fill_state, a.fill_note, a.deadline,
         (a.deadline - current_date) as deadline_in, a.applied, a.link, a.portal, a.mode, a.location, a.category,
         a.next_action, a.notes, a.updated_at, p.opportunity_type, p.paid
    from applications a left join postings p on p.id = a.posting_id`;

applications.get("/applications", requireUser, async (req, res) => {
  const { rows } = await asUser(req.user.id, c => c.query(`${SELECT} order by a.deadline nulls last, a.updated_at desc`));
  res.json(rows);
});

applications.post("/applications", requireUser, async (req, res) => {
  const postingId = String(req.body?.posting_id || "");
  const exists = await admin.query("select 1 from postings where id = $1 and not closed", [postingId]);
  if (!exists.rowCount) return res.status(404).json({ error: "That posting isn't available anymore." });
  res.status(201).json(await addToTracker(req.user.id, postingId));
});

const STATUSES = ["found", "drafted", "awaiting", "submitted", "interview", "offer", "rejected", "skipped"];

// The student updates where things stand (for example, an interview invite or an offer).
applications.patch("/applications/:id", requireUser, async (req, res) => {
  const { status, notes } = req.body || {};
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status." });
  const { rowCount } = await asUser(req.user.id, c => c.query(
    `update applications set status = coalesce($2, status), notes = coalesce($3, notes),
            version = version + 1, updated_at = now() where id = $1`,
    [req.params.id, status ?? null, notes === undefined ? null : String(notes).slice(0, 5000)]));
  if (!rowCount) return res.status(404).json({ error: "Application not found." });
  res.json({ ok: true });
});

applications.get("/applications/:id", requireUser, async (req, res) => {
  const result = await asUser(req.user.id, async c => {
    const app = (await c.query(`${SELECT} where a.id = $1`, [req.params.id])).rows[0];
    if (!app) return null;
    const approval = (await c.query(
      `select id, answers, cover_letter, screenshot_url is not null as has_screenshot,
              confirmation_screenshot_url is not null as has_confirmation, requested_at, decided_at, decision
         from approvals where application_id = $1 order by requested_at desc limit 1`, [req.params.id])).rows[0] || null;
    return { ...app, approval };
  });
  if (!result) return res.status(404).json({ error: "Application not found." });
  res.json(result);
});

// Queue the worker to fill out the employer's form. Nothing is submitted.
applications.post("/applications/:id/prepare", requireUser, async (req, res) => {
  const app = await asUser(req.user.id, c => c.query("select id, fill_state, link from applications where id = $1", [req.params.id]));
  const row = app.rows[0];
  if (!row) return res.status(404).json({ error: "Application not found." });
  if (!row.link) return res.status(400).json({ error: "This posting has no application link yet." });
  if (["queued", "filling", "submitting", "submitted"].includes(row.fill_state)) return res.status(409).json({ error: "We're already working on this one." });
  if (!(await canPrepare(req.user))) {
    return res.status(402).json({ error: `You've used your ${config.freeMonthlyApplications} free applications this month. Pick a plan to keep going.` });
  }
  const profile = await asUser(req.user.id, c => c.query("select resume_url from profiles where user_id = $1", [req.user.id]));
  if (!profile.rows[0]?.resume_url) return res.status(400).json({ error: "Add your resume first. Applications need it." });
  await queue(req.user.id, req.params.id, "fill");
  res.status(202).json({ ok: true, fill_state: "queued" });
});

// Body: { answers: [{ key, value }], cover_letter }
applications.put("/applications/:id/answers", requireUser, async (req, res) => {
  const edits = new Map((Array.isArray(req.body?.answers) ? req.body.answers : []).map(a => [String(a.key), String(a.value ?? "").slice(0, 5000)]));
  const letter = req.body?.cover_letter === undefined ? null : String(req.body.cover_letter).slice(0, 10000);
  const ok = await asUser(req.user.id, async c => {
    const ap = (await c.query(
      `select ap.id, ap.answers from approvals ap join applications a on a.id = ap.application_id
        where ap.application_id = $1 and ap.decided_at is null and a.fill_state in ('ready','needs_you')
        order by ap.requested_at desc limit 1`, [req.params.id])).rows[0];
    if (!ap) return false;
    const answers = ap.answers.map(a => (edits.has(a.key) && edits.get(a.key) !== a.value ? { ...a, value: edits.get(a.key), source: "you", flag: false } : a));
    await c.query("update approvals set answers = $2, cover_letter = coalesce($3, cover_letter) where id = $1", [ap.id, JSON.stringify(answers), letter]);
    return true;
  });
  if (!ok) return res.status(409).json({ error: "This application can't be edited right now." });
  res.json({ ok: true });
});

// The student's yes. The worker refills the form with the approved answers and submits it.
applications.post("/applications/:id/approve", requireUser, async (req, res) => {
  const result = await asUser(req.user.id, async c => {
    const ap = (await c.query(
      `select ap.id, ap.answers, a.portal from approvals ap join applications a on a.id = ap.application_id
        where ap.application_id = $1 and ap.decided_at is null and a.fill_state = 'ready'
        order by ap.requested_at desc limit 1`, [req.params.id])).rows[0];
    if (!ap) return { error: "There's nothing waiting for your approval on this application." };
    const missing = ap.answers.filter(a => a.required && !String(a.value || "").trim() && a.type !== "file");
    if (missing.length) return { error: `Fill in ${missing.length === 1 ? "this question" : "these questions"} first: ${missing.map(m => m.label).join("; ")}` };
    await c.query("update approvals set decided_at = now(), decision = 'approved' where id = $1", [ap.id]);
    return { ok: true };
  });
  if (result.error) return res.status(409).json(result);
  await queue(req.user.id, req.params.id, "submit");
  res.status(202).json({ ok: true });
});

applications.post("/applications/:id/decline", requireUser, async (req, res) => {
  await asUser(req.user.id, async c => {
    await c.query("update approvals set decided_at = now(), decision = 'rejected' where application_id = $1 and decided_at is null", [req.params.id]);
    await c.query("update applications set status = 'skipped', fill_state = 'idle', updated_at = now() where id = $1", [req.params.id]);
  });
  res.json({ ok: true });
});

// Screenshots of the filled form (kind=review) or the employer's confirmation page (kind=confirmation).
applications.get("/applications/:id/screenshot", requireUser, async (req, res) => {
  const col = req.query.kind === "confirmation" ? "confirmation_screenshot_url" : "screenshot_url";
  const { rows } = await asUser(req.user.id, c => c.query(
    `select ${col} as file from approvals where application_id = $1 and ${col} is not null order by requested_at desc limit 1`, [req.params.id]));
  const file = rows[0]?.file;
  const base = path.join(config.storageDir, req.user.id);
  if (!file || !path.resolve(file).startsWith(base + path.sep) || !fs.existsSync(file)) return res.status(404).end();
  res.set("Cache-Control", "private, no-store").sendFile(path.resolve(file));
});

async function queue(userId, applicationId, kind) {
  await asUser(userId, c => c.query(
    "update applications set fill_state = 'queued', fill_note = '', updated_at = now() where id = $1", [applicationId]));
  await admin.query("insert into jobs (kind, application_id, user_id) values ($1,$2,$3)", [kind, applicationId, userId]);
}
