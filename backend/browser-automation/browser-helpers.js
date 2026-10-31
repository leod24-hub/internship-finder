// Browser helpers used to fill job applications (Summer 2027 campaign).
// Paste into the page's JS console (or run through a browser-automation tool's
// "execute JavaScript" call) while the application form is open.
// Built from snippets used on real applications, Sept–Oct 2026.
// See backend/playbooks/ats-playbook.md for the "why" behind each one.
//
// Rule: these fill and inspect forms only. The final Submit stays a human click
// after the student approves each application. Passwords, CAPTCHAs and verification
// codes are also never automated.

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// WORKDAY (myworkdayjobs.com)
// ---------------------------------------------------------------------------

// Dump every form field label and its current value: dropdown text, radios,
// checkboxes, and whether text inputs are filled. Run after each step.
window.__wd = () => [...document.querySelectorAll('main [data-automation-id^="formField-"]')].map(f => {
  const l = (f.querySelector('label,legend') || {}).innerText || '?';
  const b = f.querySelector('button[aria-haspopup="listbox"]');
  const ins = [...f.querySelectorAll('input:not([type=hidden]),textarea')];
  const sel = [...f.querySelectorAll('[data-automation-id="selectedItem"]')].map(x => x.innerText).join(',');
  const r = f.querySelector('input[type=radio]:checked');
  const v = b ? b.innerText.trim()
    : (sel || (r ? ('radio:' + (r.closest('div')?.innerText || '').trim())
      : ins.map(i => i.type === 'checkbox' ? ('chk:' + i.checked) : (i.value ? '[filled ' + i.value.length + ']' : '[empty]')).join(' ')));
  return l.replace(/\n/g, ' ').slice(0, 80) + ' => ' + v;
}).join('\n');

// Pick an option in the currently open Workday dropdown (listbox) by its
// starting text. Open the dropdown first (click its button), then call this.
window.__opt = (txt) => {
  const o = [...document.querySelectorAll('[role=option]')].find(o => o.innerText.trim().startsWith(txt));
  if (!o) return 'not found';
  o.click();
  return 'ok';
};

// Open the Nth listbox button in <main> and choose an option by starting text.
// Index order matches window.__wd() output (dropdowns only).
window.__wdPick = async (index, startsWith) => {
  const b = [...document.querySelectorAll('main button[aria-haspopup="listbox"]')][index];
  if (!b) return 'no dropdown #' + index;
  b.scrollIntoView({ block: 'center' });
  b.click();
  await sleep(600);
  const res = window.__opt(startsWith);
  await sleep(500);
  return res + ' -> ' + b.innerText.trim();
};

// Go to the next step ("Save and Continue") and report validation errors.
// This is NOT the final submit: on the Review page the button is "Submit",
// and that one is left for the human.
window.__wdNext = async () => {
  const btn = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Save and Continue');
  if (!btn) return 'no Save and Continue button (Review page?)';
  btn.click();
  await sleep(4500);
  const errs = [...document.querySelectorAll('[data-automation-id="errorMessage"],[role=alert]')].map(e => e.innerText).join(' | ');
  const t = document.querySelector('main').innerText;
  return (t.match(/current step \d of \d\n[^\n]+/) || ['?'])[0] + '\nERR: ' + (errs || 'none');
};

// Workday notes:
// - Element refs go stale after each re-render. Re-find them, then scroll into
//   view before clicking or typing, or the value silently doesn't stick.
// - "Use my last application" only works when the same browser profile is
//   signed in to that tenant.
// - Consent dropdowns (AI / texts) can revert on Back/Next. Re-check them on
//   the Review page (TIAA did this).
// - A stray "Discard application?" modal can appear. Click Continue.
// - Pay fields that only take numbers want an annual number (e.g. 50000), not "$24-27".

// ---------------------------------------------------------------------------
// iCIMS (*.icims.com): the form lives in an iframe "icims_content_iframe"
// ---------------------------------------------------------------------------

// The iframe is same-origin, so the parent page can reach into it.
window.__icDoc = () => document.getElementById('icims_content_iframe').contentDocument;

// List every question with its id and options.
window.__icFields = () => {
  const d = window.__icDoc();
  const lab = e => {
    const l = e.id && d.querySelector(`label[for="${CSS.escape(e.id)}"]`);
    return (l ? l.innerText : (e.name || e.id)).trim().replace(/\s+/g, ' ').slice(0, 160);
  };
  return [...d.querySelectorAll('select,textarea,input:not([type=hidden])')].map(e =>
    e.id + ' [' + e.tagName + '/' + e.type + '] ' + lab(e) +
    (e.tagName === 'SELECT' ? ' || ' + [...e.options].slice(1).map(o => o.text.trim()).join(' / ') : '')
  ).join('\n');
};

// Snapshot non-password values BEFORE uploading a resume. The iCIMS parser
// overwrites email, address, GPA, school and "Did you graduate".
window.__icSnap = () => {
  const d = window.__icDoc();
  window.__snap = [...d.querySelectorAll('input:not([type=password]):not([type=file]):not([type=hidden]),select,textarea')]
    .map(e => ({ id: e.id, v: (e.type === 'checkbox' || e.type === 'radio') ? e.checked : e.value }));
  return window.__snap.length + ' fields saved';
};

// After the resume parses, put back any text fields the parser changed.
window.__icRestore = () => {
  const d = window.__icDoc(), w = d.defaultView, out = [];
  const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
  for (const s of window.__snap || []) {
    const e = d.getElementById(s.id);
    if (!e || e.tagName !== 'INPUT' || e.type === 'checkbox' || e.type === 'radio' || !s.v || e.value === s.v) continue;
    setter.call(e, s.v);
    ['input', 'change', 'blur'].forEach(t => e.dispatchEvent(new Event(t, { bubbles: true })));
    out.push(s.id + ' -> ' + s.v);
  }
  return out.join('\n') || 'nothing to restore';
};

// Answer a set of iCIMS <select> questions: { Q113: 'Yes', Q145: 'High school diploma' }.
// Matching is by option text prefix.
window.__icAnswer = (answers) => {
  const d = window.__icDoc(), w = d.defaultView, out = [];
  for (const [id, t] of Object.entries(answers)) {
    const s = d.getElementById(id);
    const o = s && [...s.options].find(o => o.text.trim().startsWith(t));
    if (!o) { out.push(id + ': NOT FOUND'); continue; }
    s.value = o.value;
    s.dispatchEvent(new Event('change', { bubbles: true }));
    if (w.jQuery) w.jQuery(s).trigger('change');
    out.push(id + '=' + o.text.trim());
  }
  return out.join('\n');
};

// Set an iCIMS text input or textarea by id.
window.__icText = (id, value) => {
  const d = window.__icDoc(), w = d.defaultView, e = d.getElementById(id);
  const proto = e.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement : w.HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(e, value);
  ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles: true })));
  return id + ' = ' + e.value;
};

// Resume upload into the iframe. Automation tools usually can't target a file
// input inside an iframe, so:
//  1) __icUploadHost() adds a visible file input on the TOP page;
//  2) the automation tool uploads the PDF into that input (#cc_upl);
//  3) __icUploadForward() copies the File into the iframe's resume input and
//     fires change. iCIMS reloads with "uploadResume=1".
//  Call __icSnap() before step 3 and __icRestore() after the reload.
window.__icUploadHost = () => {
  let h = document.getElementById('cc_upl');
  if (!h) {
    h = document.createElement('input');
    h.type = 'file'; h.id = 'cc_upl';
    h.setAttribute('aria-label', 'helper resume upload');
    h.style.cssText = 'position:fixed;top:80px;left:10px;z-index:99999';
    document.body.appendChild(h);
  }
  return 'helper input ready';
};
window.__icUploadForward = (inputId = 'PortalProfileFields.Resume_File') => {
  const d = window.__icDoc(), fi = d.getElementById(inputId);
  const src = document.getElementById('cc_upl');
  if (!src || !src.files.length) return 'upload the file into #cc_upl first';
  const dt = new DataTransfer();
  dt.items.add(src.files[0]);
  fi.files = dt.files;
  ['input', 'change'].forEach(t => fi.dispatchEvent(new Event(t, { bubbles: true })));
  src.remove();
  return 'forwarded ' + fi.files[0].name;
};
// iCIMS notes:
// - "Submit Profile" creates the candidate account, so the human clicks it.
// - The Job Questions "Submit" may itself send the application, so the human clicks it too.
// - "Highest COMPLETED education" = High school diploma (bachelor's is in progress).
// - Each company's iCIMS site (campus-firstcitizens, jobs-selective, ...) is a separate account.

// ---------------------------------------------------------------------------
// SmartRecruiters (and other sites with file inputs inside shadow DOM)
// ---------------------------------------------------------------------------

// Find file inputs, including ones inside shadow roots.
window.__findFileInputs = () => {
  const all = [];
  const walk = r => r.querySelectorAll('*').forEach(e => {
    if (e.tagName === 'INPUT' && e.type === 'file') all.push(e);
    if (e.shadowRoot) walk(e.shadowRoot);
  });
  walk(document);
  return all;
};

// Move the shadow-DOM file inputs into a fixed host div in the light DOM, so
// an automation tool's "find + upload file" can reach them. The inputs keep
// their listeners, so the upload still registers with the widget.
window.__liftFileInputs = () => {
  let host = document.getElementById('cc_host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'cc_host';
    host.style.cssText = 'position:fixed;top:60px;left:10px;z-index:99999;background:#fff;padding:6px';
    document.body.appendChild(host);
  }
  const ins = window.__findFileInputs().filter(i => !host.contains(i));
  ins.forEach((i, n) => { i.setAttribute('aria-label', 'lifted file input ' + n); i.style.display = 'block'; host.appendChild(i); });
  return ins.length + ' file input(s) lifted';
};
// SmartRecruiters notes: the resume parser set country UK and phone +44. Fix
// country, email and phone by hand afterward.

// ---------------------------------------------------------------------------
// Other ATS quirks (no code needed)
// ---------------------------------------------------------------------------
// UKG (Welltower): never triple-click the date widget, because it disappears.
//   Single-click the month, then type MMDDYYYY. Answer "No" to "save documents?".
// SuccessFactors (Reckitt): "Upload a CV" opens a dialog that holds the file input.
// ADP (SuMi Trust): e-signature = type the full legal name.
// Oracle (Verisk): sign-in needs an emailed code, so the human does it.
//
// LinkedIn guest API (no login, from a terminal):
//   curl -sL -A "Mozilla/5.0" https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/<id>
//   curl -sL -A "Mozilla/5.0" "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=real%20estate%20intern&location=New%20Jersey"
