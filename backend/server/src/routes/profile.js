import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import { pdfText } from "../pdf-text.js";
import { admin, asUser } from "../db.js";
import { config } from "../config.js";
import { requireUser } from "../auth.js";
import { loadProfile, readProfileInput, saveProfile } from "../profile.js";

export const profile = express.Router();

// Fields, majors and schools for every picker. Public: the landing page uses it too.
profile.get("/taxonomy", async (_req, res) => {
  const [cats, majors, schools] = await Promise.all([
    admin.query("select id, parent_id, name, slug, sort_order from categories order by sort_order, name"),
    admin.query("select name from majors order by name"),
    admin.query("select name from schools order by name"),
  ]);
  const top = cats.rows.filter(c => !c.parent_id).map(c => ({
    name: c.name, slug: c.slug, subs: cats.rows.filter(s => s.parent_id === c.id).map(s => s.name),
  }));
  res.set("Cache-Control", "public, max-age=300");
  res.json({ fields: top, majors: majors.rows.map(r => r.name), schools: schools.rows.map(r => r.name) });
});

profile.get("/profile", requireUser, async (req, res) => {
  const p = await asUser(req.user.id, c => loadProfile(c, req.user.id));
  delete p.resumeText;
  delete p.resumePath;
  res.json(p);
});

profile.put("/profile", requireUser, async (req, res) => {
  const { values, error } = readProfileInput(req.body);
  if (error) return res.status(400).json({ error });
  await asUser(req.user.id, c => saveProfile(c, req.user.id, values));
  res.json({ ok: true });
});

// Body: { fields: [{ name, top }], subfields: [{ parent, name }] }
profile.put("/interests", requireUser, async (req, res) => {
  const fields = Array.isArray(req.body?.fields) ? req.body.fields.slice(0, 40) : [];
  const subs = Array.isArray(req.body?.subfields) ? req.body.subfields.slice(0, 200) : [];
  await asUser(req.user.id, async c => {
    await c.query("delete from user_interests where user_id = $1", [req.user.id]);
    for (const f of fields) {
      await c.query(
        `insert into user_interests (user_id, category_id, priority)
         select $1, id, $3 from categories where name = $2 and parent_id is null on conflict do nothing`,
        [req.user.id, String(f.name), f.top ? 1 : 2]);
    }
    for (const s of subs) {
      await c.query(
        `insert into user_interests (user_id, category_id, priority)
         select $1, c.id, 2 from categories c join categories p on p.id = c.parent_id
          where p.name = $2 and c.name = $3 on conflict do nothing`,
        [req.user.id, String(s.parent), String(s.name)]);
    }
  });
  res.json({ ok: true });
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

profile.post("/profile/resume", requireUser, upload.single("resume"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Choose a PDF of your resume." });
  if (file.mimetype !== "application/pdf" || file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    return res.status(400).json({ error: "Your resume needs to be a PDF." });
  }
  let text = "";
  try {
    text = (await pdfText(file.buffer)).trim();
  } catch {
    text = "";
  }
  const dir = path.join(config.storageDir, req.user.id);
  await fs.mkdir(dir, { recursive: true });
  const stored = path.join(dir, "resume.pdf");
  await fs.writeFile(stored, file.buffer);
  const filename = path.basename(file.originalname || "resume.pdf").slice(0, 120);
  await asUser(req.user.id, c => c.query(
    "update profiles set resume_url = $2, resume_filename = $3, resume_text = $4, updated_at = now() where user_id = $1",
    [req.user.id, stored, filename, text || null]));
  res.json({
    ok: true, resumeName: filename, hasResumeText: Boolean(text),
    note: text ? "" : "We saved your resume, but couldn't read its text. If it's a scanned image, upload a PDF exported from Word or Google Docs.",
  });
});
