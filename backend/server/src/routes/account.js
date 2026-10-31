import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { admin, asUser } from "../db.js";
import { config } from "../config.js";
import { hashPassword, verifyPassword, startSession, endSession, requireUser, limitAttempts } from "../auth.js";
import { loadProfile } from "../profile.js";
import { usageThisMonth } from "../usage.js";

export const account = express.Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

account.post("/auth/signup", limitAttempts, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const name = String(req.body?.name || "").trim().slice(0, 120);
  if (!EMAIL.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ error: "Use at least 8 characters for your password." });
  const hash = await hashPassword(password);
  const client = await admin.connect();
  try {
    await client.query("begin");
    const dup = await client.query("select 1 from users where email = $1", [email]);
    if (dup.rowCount) {
      await client.query("rollback");
      return res.status(409).json({ error: "An account with this email already exists. Log in instead." });
    }
    const { rows } = await client.query("insert into users (email) values ($1) returning id", [email]);
    await client.query("insert into credentials (user_id, password_hash) values ($1,$2)", [rows[0].id, hash]);
    await client.query("insert into profiles (user_id, legal_name, application_email) values ($1,$2,$3)", [rows[0].id, name || null, email]);
    await client.query("commit");
    await startSession(res, rows[0].id);
    res.status(201).json({ ok: true });
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
});

account.post("/auth/login", limitAttempts, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const { rows } = await admin.query(
    "select u.id, c.password_hash from users u join credentials c on c.user_id = u.id where u.email = $1", [email]);
  const ok = rows[0] && await verifyPassword(String(req.body?.password || ""), rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "That email and password don't match an account." });
  await startSession(res, rows[0].id);
  res.json({ ok: true });
});

account.post("/auth/logout", async (req, res) => {
  await endSession(req, res);
  res.json({ ok: true });
});

account.get("/me", requireUser, async (req, res) => {
  const profile = await asUser(req.user.id, c => loadProfile(c, req.user.id));
  const used = await usageThisMonth(req.user.id);
  res.json({
    email: req.user.email,
    plan: req.user.plan,
    name: profile?.name || "",
    onboarded: Boolean(profile?.school && profile?.major),
    usage: { used, limit: req.user.plan === "free" ? config.freeMonthlyApplications : null },
  });
});

// Everything we hold about the student, as JSON.
account.get("/account/export", requireUser, async (req, res) => {
  const data = await asUser(req.user.id, async c => ({
    profile: await loadProfile(c, req.user.id),
    applications: (await c.query("select * from applications order by updated_at desc")).rows,
    approvals: (await c.query("select id, application_id, answers, cover_letter, requested_at, decided_at, decision from approvals")).rows,
  }));
  res.setHeader("Content-Disposition", 'attachment; filename="autointerns-export.json"');
  res.json(data);
});

// Deletes the account, every row that belongs to it (cascades), and stored files.
account.delete("/account", requireUser, async (req, res) => {
  await admin.query("delete from users where id = $1", [req.user.id]);
  await fs.rm(path.join(config.storageDir, req.user.id), { recursive: true, force: true });
  res.setHeader("Set-Cookie", "ai_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.json({ ok: true });
});
