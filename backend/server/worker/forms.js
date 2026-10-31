// Reads an application form in a real browser page, decides what goes in each field, and fills it.
// Standard fields come from the profile; open questions go to the drafter; demographic questions
// default to "decline". Nothing here clicks submit except submitForm().

// Runs inside the page. Tags each field with data-ai-key and describes it.
function inspectInPage() {
  const clean = s => String(s || "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
  const shown = el => {
    if (el.type === "file") return true; // file inputs are often visually hidden behind a button
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const ownText = el => {
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return clean(l.innerText);
    }
    const wrap = el.closest("label");
    if (wrap) return clean(wrap.innerText);
    if (el.getAttribute("aria-label")) return clean(el.getAttribute("aria-label"));
    const by = el.getAttribute("aria-labelledby");
    if (by) return clean(by.split(/\s+/).map(id => document.getElementById(id)?.innerText || "").join(" "));
    return "";
  };
  const nearbyText = el => {
    let p = el.parentElement;
    for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
      const t = clean([...p.childNodes].filter(n => !n.contains?.(el) && n.nodeName !== "SELECT" && n.nodeName !== "OPTION").map(n => n.textContent).join(" "));
      if (t) return t.slice(0, 300);
    }
    return "";
  };
  const fields = [];
  const radios = new Set();
  let n = 0;
  for (const el of document.querySelectorAll("input, select, textarea")) {
    const type = el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : (el.type || "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image", "search"].includes(type) || !shown(el)) continue;
    if (type === "radio") {
      if (radios.has(el.name)) continue;
      radios.add(el.name);
      const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)];
      const key = `f${n++}`;
      group.forEach(g => g.setAttribute("data-ai-key", key));
      const legend = el.closest("fieldset")?.querySelector("legend");
      fields.push({
        key, type, name: el.name, label: clean(legend?.innerText) || nearbyText(el.closest("fieldset") || el.parentElement),
        required: group.some(g => g.required), options: group.map(g => ownText(g) || g.value),
      });
      continue;
    }
    const key = `f${n++}`;
    el.setAttribute("data-ai-key", key);
    fields.push({
      key, type, name: el.name || el.id || "",
      label: ownText(el) || clean(el.placeholder) || nearbyText(el) || el.name || "",
      required: el.required || el.getAttribute("aria-required") === "true",
      options: type === "select" ? [...el.options].map(o => clean(o.text)).filter(t => t && !/^(select|choose|please select|--)/i.test(t)) : undefined,
    });
  }
  return fields;
}

export async function inspect(page) {
  return page.evaluate(inspectInPage);
}

// Reasons we stop and hand the application to the student.
export async function findBlocker(page, fields) {
  const signals = await page.evaluate(() => ({
    password: Boolean(document.querySelector('input[type="password"]')),
    captcha: Boolean(document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .g-recaptcha, .h-captcha')),
    text: document.body.innerText.slice(0, 5000),
  }));
  if (signals.captcha) return "This employer's site shows a check to prove you're a person. Open the link and submit it yourself with the answers below.";
  if (signals.password) return "This employer's site needs you to sign in or create an account first. Open the link, sign in, and use the answers below.";
  if (!fields.length) return "We couldn't find an application form on this page. Open the link and look for an Apply button.";
  return null;
}

// Clicks through a job description page's "Apply" button when the form isn't on the first page.
export async function openForm(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  let fields = await inspect(page);
  if (fields.filter(f => f.type !== "checkbox").length < 3) {
    const apply = page.getByRole("link", { name: /^apply( now| for this (job|position|role))?$/i })
      .or(page.getByRole("button", { name: /^apply( now| for this (job|position|role))?$/i })).first();
    if (await apply.count()) {
      await apply.click().catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      fields = await inspect(page);
    }
  }
  return fields;
}

const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function pickOption(options, wanted) {
  if (!options?.length || !wanted) return "";
  const w = norm(wanted);
  return options.find(o => norm(o) === w)
    || options.find(o => norm(o).startsWith(w) || w.startsWith(norm(o)))
    || options.find(o => norm(o).includes(w) || w.includes(norm(o)))
    || "";
}

const DECLINE = /decline|prefer not|not wish|don.?t wish|choose not|rather not|not to (answer|disclose|say)|i do not want/i;
const DEMOGRAPHIC = /gender|race|ethnic|hispanic|latin|veteran|disabilit|sexual orientation|transgender|pronoun/i;

// Returns { value, source, flag, note } for fields the profile can answer, or null for open questions.
export function answerFromProfile(field, p) {
  const label = field.label;
  const [first, ...rest] = (p.name || "").trim().split(/\s+/);
  const last = rest.join(" ");
  const yes = field.type === "select" || field.type === "radio" ? v => pickOption(field.options, v ? "Yes" : "No") : v => (v ? "Yes" : "No");
  const authorized = p.auth ? !/not applying in the us/i.test(p.auth) : null;
  const sponsor = p.auth ? /need sponsorship|will need/i.test(p.auth) : null;
  const gradText = /mm\s*\/\s*yyyy|mm\/yy/i.test(label) && p.grad ? toMonthYear(p.grad) : p.grad;
  const rules = [
    [/resume|\bcv\b/i, () => (field.type === "file" ? { value: "resume.pdf", source: "file" } : null)],
    [/cover letter/i, () => ({ value: field.type === "file" ? "cover-letter.pdf" : "(cover letter)", source: "cover_letter" })],
    [/first name|given name/i, () => ({ value: first })],
    [/last name|surname|family name/i, () => ({ value: last })],
    [/preferred (first )?name/i, () => ({ value: p.preferredName || first })],
    [/^(full |legal )?name$|^your name/i, () => ({ value: p.name })],
    [/e-?mail/i, () => ({ value: p.email })],
    [/phone|mobile/i, () => ({ value: p.phone })],
    [/linkedin/i, () => ({ value: p.li })],
    [/website|portfolio|github|personal site/i, () => ({ value: p.site })],
    [/street|address line 1|^address$/i, () => ({ value: p.address?.street })],
    [/\bcity\b/i, () => ({ value: p.address?.city })],
    [/\bstate\b|province/i, () => ({ value: p.address?.state })],
    [/zip|postal/i, () => ({ value: p.address?.zip })],
    [/country/i, () => ({ value: p.address?.country || "United States" })],
    [/school|university|college|institution/i, () => ({ value: p.school })],
    [/degree/i, () => ({ value: p.degree || (p.classYear === "grad" ? "Master's" : "Bachelor's") })],
    [/major|discipline|field of study|concentration|area of study/i, () => ({ value: p.major })],
    [/graduat|class of|expected.*(date|year)/i, () => ({ value: gradText })],
    [/\bgpa\b|grade point/i, () => ({ value: p.gpa, flag: true, note: "Check that this matches your transcript." })],
    [/sponsor/i, () => (sponsor == null ? null : { value: yes(sponsor), flag: true, note: "From your work authorization answer." })],
    [/authori[sz]ed to work|work authori[sz]ation|eligible to work|legally (able|permitted)/i, () => (authorized == null ? null : { value: yes(authorized), flag: true, note: "From your work authorization answer." })],
    [/how did you (hear|find|learn)|where did you (hear|find)|source/i, () => ({ value: pickOption(field.options, "Online job board") || pickOption(field.options, "Job board") || pickOption(field.options, "Other") || "Online job posting" })],
  ];
  if (DEMOGRAPHIC.test(label) && field.type !== "textarea") {
    if (!p.eeoDecline) return { value: "", source: "you", flag: true, note: "You chose to answer demographic questions yourself." };
    const decline = (field.options || []).find(o => DECLINE.test(o));
    return decline ? { value: decline, source: "decline" } : { value: "", source: "decline", note: "No decline option. Left blank." };
  }
  for (const [re, fn] of rules) {
    if (!re.test(label)) continue;
    const r = fn();
    if (!r) return null;
    let value = r.value || "";
    if ((field.type === "select" || field.type === "radio") && value && r.source !== "cover_letter") value = pickOption(field.options, value) || "";
    return { source: "profile", flag: false, ...r, value };
  }
  return null;
}

function toMonthYear(text) {
  const d = new Date(`1 ${text}`);
  return Number.isNaN(d.getTime()) ? text : `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Fills every field that has a value. files: { resume, coverLetter } paths.
export async function fill(page, fields, answers, files) {
  const problems = [];
  for (const f of fields) {
    const a = answers[f.key];
    if (!a) continue;
    const loc = page.locator(`[data-ai-key="${f.key}"]`);
    try {
      if (f.type === "file") {
        const file = a.source === "cover_letter" ? files.coverLetter : a.source === "file" ? files.resume : null;
        if (file) await loc.setInputFiles(file);
      } else if (a.source === "cover_letter") {
        await loc.fill(files.coverLetterText || "");
      } else if (!a.value) {
        continue;
      } else if (f.type === "select") {
        await loc.selectOption({ label: pickOption(f.options, a.value) || a.value });
      } else if (f.type === "radio") {
        const i = f.options.indexOf(pickOption(f.options, a.value));
        if (i >= 0) await loc.nth(i).check();
      } else if (f.type === "checkbox") {
        if (/^(yes|true|checked|agree)/i.test(a.value)) await loc.check();
      } else {
        await loc.fill(a.value);
      }
    } catch (e) {
      problems.push(`${f.label}: ${e.message.split("\n")[0]}`);
    }
  }
  return problems;
}

// Clicks the form's submit button and checks for a confirmation. Returns { ok, text }.
export async function submitForm(page) {
  const button = page.locator('form button[type="submit"], form input[type="submit"]')
    .or(page.getByRole("button", { name: /^(submit|submit application|send application|apply)$/i })).first();
  if (!(await button.count())) return { ok: false, text: "We couldn't find the submit button." };
  await Promise.all([
    page.waitForLoadState("load", { timeout: 20000 }).catch(() => {}),
    button.click(),
  ]);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  const text = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  const ok = /thank you|thanks for applying|application (has been )?(received|submitted)|we.?ve received|successfully submitted/i.test(text);
  const invalid = await page.evaluate(() => [...document.querySelectorAll("input, select, textarea")].some(el => !el.checkValidity?.()));
  return { ok: ok && !invalid, text };
}

// Matches approved answers (stored with the field's name and label) to a fresh inspection of the form.
export function remap(fields, approved) {
  const out = {};
  for (const f of fields) {
    const a = approved.find(x => x.name && x.name === f.name && x.type === f.type)
      || approved.find(x => norm(x.label) === norm(f.label) && x.type === f.type);
    if (a) out[f.key] = a;
  }
  return out;
}
