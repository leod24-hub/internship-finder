// End-to-end check of the full cycle against the local test job site:
// sign up -> profile -> resume -> add a posting -> prepare (worker fills) -> review -> approve -> submitted.
// Needs the server and the worker running:  npm start   and   npm run worker
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { config } from "../src/config.js";

const BASE = config.publicUrl;
let cookie = "";

async function api(method, path, body, { form } = {}) {
  const res = await fetch(BASE + "/api" + path, {
    method,
    headers: { ...(cookie && { cookie }), ...(!form && body && { "Content-Type": "application/json" }), Origin: BASE },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data.error || ""}`);
  return data;
}

async function waitFor(appId, states, timeoutMs = 120000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const app = await api("GET", `/applications/${appId}`);
    if (states.includes(app.fill_state)) return app;
    if (app.fill_state === "failed") throw new Error(`Worker failed: ${app.fill_note}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for ${states.join("/")}`);
}

async function resumePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  const lines = ["Jordan Rivera", "State University, B.S. Nursing, expected May 2028, GPA 3.7",
    "Experience: Patient care volunteer, City General Hospital (2025-2026), 150 hours assisting nurses with intake.",
    "Certifications: BLS/CPR (American Heart Association)", "Skills: vital signs, patient intake, Epic charting basics, Spanish (conversational)"];
  lines.forEach((l, i) => page.drawText(l, { x: 60, y: 720 - i * 22, size: 11, font }));
  return Buffer.from(await doc.save());
}

const email = `e2e-${Date.now()}@example.edu`;
await api("POST", "/auth/signup", { email, password: "e2e-password-123", name: "Jordan Rivera" });
await api("PUT", "/profile", {
  name: "Jordan Rivera", school: "State University", major: "Nursing", classYear: "junior", grad: "May 2028", gpa: "3.7",
  phone: "555-010-2233", address: { city: "Columbus", state: "OH", zip: "43210" },
  auth: "Authorized to work in the US, no sponsorship needed", eeoDecline: true, modes: ["onsite"], types: ["Internship"],
});
await api("PUT", "/interests", { fields: [{ name: "Healthcare & Clinical", top: true }] });
const form = new FormData();
form.append("resume", new Blob([await resumePdf()], { type: "application/pdf" }), "jordan-rivera-resume.pdf");
const up = await api("POST", "/profile/resume", null, { form });
assert.equal(up.hasResumeText, true, "resume text should be extracted");

const matches = await api("GET", "/postings/matches");
assert.ok(matches.length > 0, "expected at least one match in Healthcare & Clinical");
const { id } = await api("POST", "/applications", { posting_id: matches[0].id });
console.log(`Preparing ${matches[0].role} at ${matches[0].company}`);
await api("POST", `/applications/${id}/prepare`);

const ready = await waitFor(id, ["ready", "needs_you"]);
assert.equal(ready.fill_state, "ready", ready.fill_note);
const answers = ready.approval.answers;
const by = label => answers.find(a => a.label.toLowerCase().includes(label));
assert.equal(by("first name").value, "Jordan");
assert.equal(by("email").value, email);
assert.equal(by("gpa").value, "3.7");
assert.equal(by("expected graduation").value, "05/2028");
assert.equal(by("legally authorized").value, "Yes");
assert.equal(by("sponsorship").value, "No");
assert.match(by("gender").value, /decline/i);
assert.match(by("veteran").value, /don't wish/i);
assert.ok(ready.approval.cover_letter.includes("Jordan Rivera"), "cover letter should be signed");
console.log(`Filled ${answers.length} fields. Drafted by: ${answers.some(a => a.source === "drafted") ? "Claude" : "template (no API key)"}`);

// The student writes anything left blank, then approves.
const blanks = answers.filter(a => a.required && !a.value && a.type !== "file");
if (blanks.length) {
  await api("PUT", `/applications/${id}/answers`, { answers: blanks.map(a => ({ key: a.key, value: "I want to grow my patient care skills on a hospital team, building on 150 hours volunteering at City General." })) });
}
await api("POST", `/applications/${id}/approve`);
const done = await waitFor(id, ["submitted", "needs_you"]);
assert.equal(done.fill_state, "submitted", done.fill_note);
assert.equal(done.status, "submitted");

const subs = await (await fetch(`${BASE}/mock-ats/submissions`)).json();
const mine = subs.filter(s => s.fields.email === email).at(-1);
assert.ok(mine, "the test job site should have received the application");
assert.equal(mine.fields.first_name, "Jordan");
assert.equal(mine.fields.sponsorship, "No");
assert.equal(mine.files.resume?.name, "resume.pdf");
assert.equal(mine.files.cover_letter?.name, "cover-letter.pdf");
console.log("End-to-end check passed: the application was filled, approved and submitted.");
