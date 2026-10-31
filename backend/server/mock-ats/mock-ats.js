// A local test job site shaped like a typical employer application form (Greenhouse-style).
// The demo postings link here, so the worker's fill, review and submit cycle can run without
// touching a real employer. Submissions are written to storage/mock-ats/submissions.jsonl.
import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import { admin } from "../src/db.js";
import { config } from "../src/config.js";

export const mockAts = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px 16px;color:#1d2427;background:#fff}
.banner{background:#fff4d6;border:1px solid #e6c56a;padding:8px 12px;border-radius:6px;font-size:14px;margin-bottom:20px}
label{display:block;font-weight:600;margin:18px 0 6px} input,select,textarea{font:inherit;width:100%;padding:8px;border:1px solid #bbb;border-radius:4px;box-sizing:border-box}
fieldset{border:0;padding:0;margin:18px 0 0} legend{font-weight:600;margin-bottom:6px} fieldset label{display:inline-flex;gap:6px;font-weight:400;margin:0 18px 0 0;align-items:center} fieldset input{width:auto}
button{margin-top:28px;font:inherit;font-weight:600;padding:10px 18px;background:#1f6b4f;color:#fff;border:0;border-radius:6px;cursor:pointer}
.req{color:#a3342f}</style></head><body><div class="banner">Test employer site for AutoInterns development. Nothing here is a real job.</div>${body}</body></html>`;

mockAts.get("/jobs/:id", async (req, res) => {
  const { rows } = await admin.query("select company, role, location, category from postings where id = $1", [req.params.id]);
  const p = rows[0] || { company: "Example Employer", role: "Summer Intern", location: "Remote", category: "" };
  res.send(page(`${p.role} at ${p.company}`, `
<h1>${esc(p.role)}</h1><p>${esc(p.company)} · ${esc(p.location)}</p>
<p>Join our ${esc(p.category || "summer")} team for a 10-week paid internship. You'll work on real projects with a mentor, present your work at the end of the summer, and meet other interns across the company.</p>
<h2>Apply for this job</h2>
<form method="post" action="/mock-ats/jobs/${esc(req.params.id)}/apply" enctype="multipart/form-data" id="application_form">
<label for="first_name">First Name <span class="req">*</span></label><input id="first_name" name="first_name" required>
<label for="last_name">Last Name <span class="req">*</span></label><input id="last_name" name="last_name" required>
<label for="email">Email <span class="req">*</span></label><input id="email" name="email" type="email" required>
<label for="phone">Phone <span class="req">*</span></label><input id="phone" name="phone" type="tel" required>
<label for="resume">Resume/CV <span class="req">*</span></label><input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" required>
<label for="cover_letter">Cover Letter</label><input id="cover_letter" name="cover_letter" type="file" accept=".pdf,.doc,.docx">
<label for="linkedin">LinkedIn Profile</label><input id="linkedin" name="linkedin">
<label for="school">School <span class="req">*</span></label><input id="school" name="school" required>
<label for="degree">Degree</label><select id="degree" name="degree"><option value="">Select...</option><option>Associate's Degree</option><option>Bachelor's Degree</option><option>Master's Degree</option><option>Other</option></select>
<label for="discipline">Discipline <span class="req">*</span></label><input id="discipline" name="discipline" required>
<label for="grad">Expected graduation date (MM/YYYY) <span class="req">*</span></label><input id="grad" name="grad" required>
<label for="gpa">GPA</label><input id="gpa" name="gpa">
<fieldset><legend>Are you legally authorized to work in the United States? <span class="req">*</span></legend>
<label><input type="radio" name="authorized" value="Yes" required> Yes</label><label><input type="radio" name="authorized" value="No"> No</label></fieldset>
<label for="sponsorship">Will you now or in the future require sponsorship for employment visa status? <span class="req">*</span></label>
<select id="sponsorship" name="sponsorship" required><option value="">Select...</option><option>Yes</option><option>No</option></select>
<label for="source">How did you hear about this job?</label><select id="source" name="source"><option value="">Select...</option><option>LinkedIn</option><option>Online job board</option><option>School career site</option><option>Referral</option><option>Other</option></select>
<label for="why">Why are you interested in this role at ${esc(p.company)}? <span class="req">*</span></label><textarea id="why" name="why" rows="4" required></textarea>
<label for="project">Tell us about a project or experience you're proud of.</label><textarea id="project" name="project" rows="4"></textarea>
<label for="gender">Gender</label><select id="gender" name="gender"><option value="">Select...</option><option>Male</option><option>Female</option><option>Non-binary</option><option>Decline to self-identify</option></select>
<label for="race">Race/Ethnicity</label><select id="race" name="race"><option value="">Select...</option><option>Asian</option><option>Black or African American</option><option>Hispanic or Latino</option><option>White</option><option>Two or more races</option><option>Decline to self-identify</option></select>
<label for="veteran">Veteran Status</label><select id="veteran" name="veteran"><option value="">Select...</option><option>I am a protected veteran</option><option>I am not a protected veteran</option><option>I don't wish to answer</option></select>
<button type="submit">Submit Application</button>
</form>`));
});

mockAts.post("/jobs/:id/apply", upload.any(), async (req, res) => {
  const files = Object.fromEntries((req.files || []).map(f => [f.fieldname, { name: f.originalname, bytes: f.size }]));
  const record = { posting_id: req.params.id, at: new Date().toISOString(), fields: req.body, files };
  const dir = path.join(config.storageDir, "mock-ats");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(path.join(dir, "submissions.jsonl"), JSON.stringify(record) + "\n");
  res.send(page("Application received", `<h1>Thank you for applying!</h1><p>We've received your application and will be in touch if there's a match.</p>`));
});

mockAts.get("/submissions", async (_req, res) => {
  const file = path.join(config.storageDir, "mock-ats", "submissions.jsonl");
  const text = await fs.readFile(file, "utf8").catch(() => "");
  res.json(text.trim() ? text.trim().split("\n").map(l => JSON.parse(l)) : []);
});
