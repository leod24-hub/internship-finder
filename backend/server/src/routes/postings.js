import express from "express";
import crypto from "node:crypto";
import { admin, asUser } from "../db.js";
import { requireUser } from "../auth.js";
import { checkLink, readPosting, detectAts } from "../links.js";

export const postings = express.Router();

// Open postings in the student's fields that aren't on their tracker yet.
// With no fields picked, every open posting is a match.
postings.get("/postings/matches", requireUser, async (req, res) => {
  const { rows } = await asUser(req.user.id, c => c.query(
    `with mine as (select category_id from user_interests where user_id = $1)
     select p.id, p.company, p.role, p.location, p.mode, p.category, p.deadline, p.ats, p.opportunity_type, p.paid,
            (p.deadline - current_date) as deadline_in
       from postings p
      where not p.closed
        and (p.deadline is null or p.deadline >= current_date)
        and p.source is distinct from 'student'
        and not exists (select 1 from applications a where a.posting_id = p.id and a.user_id = $1)
        and (not exists (select 1 from mine)
             or exists (select 1 from posting_categories pc join mine m on m.category_id = pc.category_id where pc.posting_id = p.id))
      order by p.deadline nulls last
      limit 100`, [req.user.id]));
  res.json(rows);
});

// A student pastes a posting link: store the posting and put it on their tracker.
postings.post("/postings/from-link", requireUser, async (req, res) => {
  let url;
  try { url = await checkLink(String(req.body?.url || "").trim()); } catch (e) { return res.status(400).json({ error: e.message }); }
  const link = url.toString();
  const id = "link-" + crypto.createHash("sha256").update(link).digest("hex").slice(0, 16);
  const existing = await admin.query("select id from postings where id = $1", [id]);
  if (!existing.rowCount) {
    const { role, company } = await readPosting(link);
    await admin.query(
      `insert into postings (id, company, role, link, ats, source) values ($1,$2,$3,$4,$5,'student') on conflict (id) do nothing`,
      [id, company || url.hostname.replace(/^www\./, ""), role || "Internship (title not read yet)", link, detectAts(link)]);
  }
  const app = await addToTracker(req.user.id, id);
  res.status(201).json(app);
});

export async function addToTracker(userId, postingId) {
  return asUser(userId, async c => {
    const { rows } = await c.query(
      `insert into applications (user_id, posting_id, company, role, deadline, link, portal, mode, location, category, source)
       select $1, p.id, p.company, p.role, p.deadline, p.link, p.ats, p.mode, p.location, p.category, p.source
         from postings p where p.id = $2
       on conflict (user_id, posting_id) do update set updated_at = now()
       returning id, status`, [userId, postingId]);
    return rows[0];
  });
}
