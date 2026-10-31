// Application worker. Takes jobs from the queue one at a time:
//   fill:   open the employer's form, fill it from the profile and drafts, screenshot it, and wait
//           for the student's approval. Never submits.
//   submit: after approval, open the form again, fill it with the approved answers, and submit.
// Sites that need a sign-in, a CAPTCHA or that don't allow automation are handed to the student.
//   npm run worker
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { admin, asUser, closePools } from "../src/db.js";
import { config } from "../src/config.js";
import { loadProfile } from "../src/profile.js";
import { draftApplication } from "../src/draft.js";
import { recordUsage } from "../src/usage.js";
import { HANDS_OFF } from "../src/links.js";
import { openForm, inspect, findBlocker, answerFromProfile, fill, submitForm, remap } from "./forms.js";
import { coverLetterPdf } from "./letter-pdf.js";

let browser;
let stopping = false;

async function claim() {
  const { rows } = await admin.query(
    `update jobs set status = 'running', attempts = attempts + 1, updated_at = now()
      where id = (select id from jobs where status = 'queued' order by created_at for update skip locked limit 1)
      returning *`);
  return rows[0];
}

async function setApp(userId, appId, fields) {
  const keys = Object.keys(fields);
  await asUser(userId, c => c.query(
    `update applications set ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")}, updated_at = now() where id = $1`,
    [appId, ...keys.map(k => fields[k])]));
}

async function loadContext(job) {
  return asUser(job.user_id, async c => {
    const app = (await c.query(
      `select a.*, p.location as posting_location from applications a left join postings p on p.id = a.posting_id where a.id = $1`,
      [job.application_id])).rows[0];
    const profile = await loadProfile(c, job.user_id);
    return { app, profile };
  });
}

async function runFill(job, page) {
  const { app, profile } = await loadContext(job);
  const dir = path.join(config.storageDir, job.user_id, "applications", app.id);
  await fs.mkdir(dir, { recursive: true });
  await setApp(job.user_id, app.id, { fill_state: "filling", fill_note: "" });

  const handsOff = HANDS_OFF.has(app.portal);
  const fields = handsOff ? [] : await openForm(page, app.link);
  const blocker = handsOff
    ? `${app.portal[0].toUpperCase()}${app.portal.slice(1)} needs you to sign in, so you'll submit this one yourself. We've prepared your cover letter below.`
    : await findBlocker(page, fields);

  // Fill in everything the profile answers; collect the rest for the drafter.
  const answers = {};
  const questions = [];
  for (const f of fields) {
    const a = answerFromProfile(f, profile);
    if (a) answers[f.key] = a;
    else if (f.type !== "file") questions.push({ key: f.key, label: f.label, type: f.type, options: f.options, required: f.required });
  }
  const postingText = handsOff ? "" : await page.evaluate(() => document.body.innerText.slice(0, 8000)).catch(() => "");
  if (/title not read yet/.test(app.role) && !handsOff) {
    const title = (await page.title().catch(() => "")).split(/\s[|–-]\s/)[0].trim();
    if (title) { app.role = title.slice(0, 160); await setApp(job.user_id, app.id, { role: app.role }); }
  }
  const draft = await draftApplication({
    profile, questions,
    posting: { company: app.company, role: app.role, location: app.location || app.posting_location, text: postingText },
  });
  for (const q of questions) {
    const d = draft.answers[q.key];
    answers[q.key] = { value: d.value, source: d.value ? "drafted" : "you", flag: d.flag, note: d.value ? "" : "Write this one yourself." };
  }

  const letterPath = path.join(dir, "cover-letter.pdf");
  await fs.writeFile(letterPath, await coverLetterPdf(draft.coverLetter, profile.name));
  let screenshot = null;
  let problems = [];
  if (!blocker) {
    problems = await fill(page, fields, answers, { resume: profile.resumePath, coverLetter: letterPath, coverLetterText: draft.coverLetter });
    screenshot = path.join(dir, "filled.png");
    await page.screenshot({ path: screenshot, fullPage: true });
  }

  const stored = fields.map(f => ({
    key: f.key, name: f.name, label: f.label, type: f.type, options: f.options, required: f.required,
    value: answers[f.key]?.value || "", source: answers[f.key]?.source || "you",
    flag: Boolean(answers[f.key]?.flag), note: answers[f.key]?.note || "",
  }));
  const notes = [blocker, draft.note, problems.length ? `Some fields didn't fill: ${problems.join("; ")}` : ""].filter(Boolean).join(" ");
  await asUser(job.user_id, async c => {
    await c.query("update approvals set decided_at = now(), decision = 'edit_requested' where application_id = $1 and decided_at is null", [app.id]);
    await c.query(
      `insert into approvals (user_id, application_id, answers, cover_letter, screenshot_url) values ($1,$2,$3,$4,$5)`,
      [job.user_id, app.id, JSON.stringify(stored), draft.coverLetter, screenshot]);
  });
  await setApp(job.user_id, app.id, {
    fill_state: blocker ? "needs_you" : "ready", fill_note: notes, status: "awaiting",
    next_action: blocker ? "Submit it yourself on the employer's site." : "Review your answers and approve.",
  });
  await recordUsage(job.user_id, "application_filled");
  await recordUsage(job.user_id, "cover_letter");
}

async function runSubmit(job, page) {
  const { app, profile } = await loadContext(job);
  const approval = (await asUser(job.user_id, c => c.query(
    `select id, answers, cover_letter from approvals where application_id = $1 and decision = 'approved'
      order by decided_at desc limit 1`, [app.id]))).rows[0];
  if (!approval) throw new Error("No approved answers to submit.");
  await setApp(job.user_id, app.id, { fill_state: "submitting", fill_note: "" });

  const dir = path.join(config.storageDir, job.user_id, "applications", app.id);
  const letterPath = path.join(dir, "cover-letter.pdf");
  await fs.writeFile(letterPath, await coverLetterPdf(approval.cover_letter, profile.name));

  const fields = await openForm(page, app.link);
  const blocker = await findBlocker(page, fields);
  const handBack = async note => setApp(job.user_id, app.id, {
    fill_state: "needs_you", fill_note: note, next_action: "Submit it yourself on the employer's site.",
  });
  if (blocker) return handBack(blocker);

  const answers = remap(fields, approval.answers);
  const missing = fields.filter(f => f.required && !answers[f.key] && f.type !== "file");
  if (missing.length) return handBack(`The form changed since you reviewed it. New required questions: ${missing.map(m => m.label).join("; ")}.`);
  const problems = await fill(page, fields, answers, { resume: profile.resumePath, coverLetter: letterPath, coverLetterText: approval.cover_letter });
  if (problems.length) return handBack(`We couldn't fill some fields, so we didn't submit: ${problems.join("; ")}`);

  const result = await submitForm(page);
  const shot = path.join(dir, "confirmation.png");
  await page.screenshot({ path: shot, fullPage: true });
  await asUser(job.user_id, c => c.query("update approvals set confirmation_screenshot_url = $2 where id = $1", [approval.id, shot]));
  if (!result.ok) return handBack("We pressed submit but didn't see a confirmation from the employer. Check the screenshot, then open the link to make sure it went through.");
  await setApp(job.user_id, app.id, {
    fill_state: "submitted", status: "submitted", applied: new Date().toLocaleDateString("en-CA", { timeZone: profile.timezone || "America/New_York" }),
    next_action: "Watch your email for next steps.", fill_note: "",
  });
}

async function runJob(job) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    if (job.kind === "fill") await runFill(job, page);
    else await runSubmit(job, page);
    await admin.query("update jobs set status = 'done', updated_at = now() where id = $1", [job.id]);
    console.log(`job ${job.id} ${job.kind} done`);
  } catch (e) {
    console.error(`job ${job.id} ${job.kind} failed:`, e);
    await admin.query("update jobs set status = 'failed', error = $2, updated_at = now() where id = $1", [job.id, String(e.message || e).slice(0, 2000)]);
    await setApp(job.user_id, job.application_id, {
      fill_state: "failed", fill_note: "Something went wrong while working on this application. Try again, or open the link and apply yourself.",
    }).catch(() => {});
  } finally {
    await context.close();
  }
}

async function main() {
  browser = await chromium.launch({ headless: config.headless });
  // Jobs left running by a crash go back in the queue.
  await admin.query("update jobs set status = 'queued' where status = 'running'");
  console.log("Worker ready. Waiting for applications to fill.");
  while (!stopping) {
    const job = await claim();
    if (job) await runJob(job);
    else await new Promise(r => setTimeout(r, 1500));
  }
  await browser.close();
  await closePools();
}

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { stopping = true; });
main().catch(e => { console.error(e); process.exit(1); });
