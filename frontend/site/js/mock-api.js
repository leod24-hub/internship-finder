/* Mock mode: the whole app runs in the browser with no server or database.
   Turn it on with ?mock=1 on any page (it stays on), and off with ?mock=0.
   Data is kept in localStorage, laid out as the Supabase tables will be (users, profiles,
   user_interests, applications, approvals), so the "What we know about you" page can show
   real rows. Nothing is sent anywhere. Passwords are never checked or stored. */
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get("mock") === "1") localStorage.setItem("ai-mock", "1");
  if (params.get("mock") === "0") localStorage.removeItem("ai-mock");
  if (localStorage.getItem("ai-mock") !== "1") return;

  const KEY = "ai-mock-db";
  const empty = () => ({ session: null, users: [], profiles: [], user_interests: [], applications: [], approvals: [] });
  const load = () => { try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return empty(); } };
  const save = db => localStorage.setItem(KEY, JSON.stringify(db));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const now = () => new Date().toISOString();
  const err = (status, message) => Object.assign(new Error(message), { status });
  const FREE_LIMIT = 3;
  const HANDS_OFF = ["workday", "icims", "handshake", "linkedin"];

  // Postings come from the made-up list in data.js, plus more made-up ones so every field has a few.
  // In production they live in a shared postings table.
  const EXTRA = [
    ["Riverbend Medical Center", "Patient Experience Intern", "Columbus, OH", "onsite", "Healthcare & Clinical", "Paid", 11, "Greenhouse"],
    ["Clearwater Public Health", "Community Health Intern", "Remote", "remote", "Healthcare & Clinical", "Stipend", 19, "Lever"],
    ["Helix Therapeutics", "Biology Research Intern", "Boston, MA", "onsite", "Biotech & Life Sciences", "Paid", 8, "Ashby"],
    ["Northfield Bio", "Quality Control Lab Intern", "Indianapolis, IN", "onsite", "Biotech & Life Sciences", "Paid", 23, "Greenhouse"],
    ["Lakeshore Research Institute", "Summer Undergraduate Research Fellow", "Ann Arbor, MI", "onsite", "Research & Labs", "Stipend", 14, "Lever"],
    ["Prairie State University Labs", "Neuroscience Lab Assistant", "Remote", "hybrid", "Research & Labs", "Paid", 30, "Greenhouse"],
    ["Brightline Software", "Frontend Engineering Intern", "Remote", "remote", "Software & IT", "Paid", 16, "Ashby"],
    ["Copperleaf Capital", "Finance Intern", "Charlotte, NC", "hybrid", "Finance & Accounting", "Paid", 20, "Greenhouse"],
    ["Tidewater Conservancy", "Field Conservation Intern", "Savannah, GA", "onsite", "Environment & Sustainability", "Stipend", 26, "Lever"],
    ["Northstar Press", "Reporting Intern", "Chicago, IL", "hybrid", "Media & Communications", "Paid", 10, "Greenhouse"],
  ].map(([company, role, location, mode, category, pay, deadlineIn, ats], i) => ({ id: "x" + i, company, role, location, mode, category, type: "Internship", pay, deadlineIn, ats }));
  const postings = () => [...(window.LAN?.postings || []), ...EXTRA].map(p => ({
    id: "mock-" + p.id, company: p.company, role: p.role, location: p.location, mode: p.mode, category: p.category,
    deadline_in: p.deadlineIn, ats: p.ats.toLowerCase(), link: null, opportunity_type: p.type === "Co-op" ? "co_op" : "internship",
    paid: p.pay === "Unpaid" ? "no" : p.pay === "Paid" ? "yes" : "unknown", hands_off: HANDS_OFF.includes(p.ats.toLowerCase()),
  })).filter(p => p.deadline_in == null || p.deadline_in >= 0);

  // ---- profiles row <-> the shape the pages use (mirrors loadProfile/readProfileInput on the server) ----
  function toRow(userId, b, prev) {
    const list = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(x => String(x).trim()).filter(Boolean);
    return {
      ...prev, user_id: userId,
      legal_name: b.name || null, preferred_name: b.preferredName || null,
      phone: b.phone || null, address: b.address || {},
      school: b.school || null, degree: b.degree || null, major: b.major || null, minor: b.minor || null,
      class_year: b.classYear || null, grad_date: b.grad || null, gpa: b.gpa === "" || b.gpa == null ? null : Number(b.gpa),
      work_auth: b.auth || null, needs_sponsorship: b.auth ? /need sponsorship|will need/i.test(b.auth) : null,
      linkedin: b.li || null, website: b.site || null, eeo_opt_in: b.eeoDecline === false,
      preferred_modes: list(b.modes), preferred_locations: list(b.where),
      targets: { types: list(b.types), term: b.term || "Summer 2027", pay: b.pay || "any" },
      category_data: b.fieldDetails || {},
      positioning: { answers: clean(b.answers), stories: clean(b.stories) },
      updated_at: now(),
    };
  }
  const clean = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => String(v || "").trim()));
  function fromRow(db, user) {
    const p = db.profiles.find(r => r.user_id === user.id) || {};
    const t = p.targets || {};
    const ints = db.user_interests.filter(i => i.user_id === user.id);
    return {
      email: user.email, plan: user.plan, name: p.legal_name || "", preferredName: p.preferred_name || "",
      phone: p.phone || "", address: p.address || {}, school: p.school || "", degree: p.degree || "", major: p.major || "", minor: p.minor || "",
      classYear: p.class_year || "", grad: p.grad_date || "", gpa: p.gpa == null ? "" : String(p.gpa),
      auth: p.work_auth || "", needsSponsorship: p.needs_sponsorship ?? null, li: p.linkedin || "", site: p.website || "",
      eeoDecline: !p.eeo_opt_in, types: t.types || ["Internship"], modes: p.preferred_modes?.length ? p.preferred_modes : ["remote", "hybrid", "onsite"],
      where: (p.preferred_locations || []).join(", "), term: t.term || "Summer 2027", pay: t.pay || "any",
      answers: p.positioning?.answers || {}, stories: p.positioning?.stories || {}, fieldDetails: p.category_data || {},
      resumeName: p.resume_filename || "", hasResumeText: Boolean(p.resume_filename),
      fields: ints.filter(i => !i.parent).map(i => ({ name: i.category, top: i.priority === 1 })),
      subfields: ints.filter(i => i.parent).map(i => ({ parent: i.parent, name: i.category })),
    };
  }

  // ---- a pretend "prepare": builds the answers the worker would fill, from the profile ----
  function draft(db, user, app) {
    const p = fromRow(db, user);
    const a = p.answers, s = p.stories;
    const [first, ...rest] = (p.name || "").split(/\s+/);
    const yn = v => (v ? (/^y/i.test(v) ? "Yes" : "No") : "");
    const authorized = p.auth ? (/not applying in the us/i.test(p.auth) ? "No" : "Yes") : "";
    const sponsor = p.auth ? (/need sponsorship|will need/i.test(p.auth) ? "Yes" : "No") : "";
    const q = (label, value, extra = {}) => ({ key: uuid().slice(0, 8), label, type: "text", required: true, value: value || "", source: value ? "profile" : "you", ...extra });
    const answers = [
      q("First name", first), q("Last name", rest.join(" ")), q("Email", p.email), q("Phone", p.phone),
      q("School", p.school), q("Degree", p.degree), q("Major", p.major), q("Expected graduation", p.grad),
      q("GPA", p.gpa, { required: false, flag: Boolean(p.gpa), note: p.gpa ? "Check that this matches your transcript." : "" }),
      q("Are you legally authorized to work in the United States?", authorized, { type: "select", options: ["Yes", "No"], flag: Boolean(authorized), note: authorized ? "From your work authorization answer." : "" }),
      q("Will you now or in the future require sponsorship?", sponsor, { type: "select", options: ["Yes", "No"], flag: Boolean(sponsor), note: sponsor ? "From your work authorization answer." : "" }),
      q("Are you at least 18 years old?", yn(a.over18), { type: "select", options: ["Yes", "No"] }),
      q("Earliest start date", a.startDate),
      q("How did you hear about this position?", a.hearAbout || "Online job board", { required: false }),
      q(`Why are you interested in this role at ${app.company}?`, s.whyField || s.aboutMe ? [s.whyField, s.proudOf].filter(Boolean).join(" ") : "",
        { type: "textarea", source: s.whyField || s.aboutMe ? "drafted" : "you", note: s.whyField ? "Mock: the real version is written by Claude from your own words and resume." : "Add \"Why these fields?\" to your questionnaire and we'll draft this for you." }),
      { key: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Non-binary", "Decline to self-identify"], required: false, value: p.eeoDecline ? "Decline to self-identify" : "", source: p.eeoDecline ? "decline" : "you" },
      { key: "resume", label: "Resume", type: "file", required: true, value: "resume.pdf", source: p.resumeName ? "file" : "you" },
      { key: "letter", label: "Cover letter", type: "file", required: false, value: "cover-letter.pdf", source: "cover_letter" },
    ];
    const letter = [
      `Dear ${app.company} Hiring Team,`,
      `I'm ${p.classYear ? `a ${p.classYear === "grad" ? "graduate student" : p.classYear}` : "a student"} at ${p.school || "my school"} studying ${p.major || "my major"}, and I'm applying for the ${app.role} role.`,
      s.whyField || s.aboutMe || "[In the real version, this paragraph is written from your own words and resume.]",
      s.proudOf ? `One thing I'm proud of: ${s.proudOf}` : "",
      `I'd welcome the chance to bring that to ${app.company}. Thank you for considering my application.`,
      `Sincerely,\n${p.preferredName || first || "Your name"}`,
    ].filter(Boolean).join("\n\n");
    return { id: uuid(), application_id: app.id, user_id: user.id, answers, cover_letter: letter, requested_at: now(), decided_at: null, decision: null };
  }

  // Applications move along on a timer, as if the worker were running: queued -> ready, submitting -> submitted.
  function tick(db) {
    const t = Date.now();
    for (const a of db.applications) {
      if (a.fill_state === "filling" && t - Date.parse(a.updated_at) > 2500) {
        a.fill_state = a.hands_off ? "needs_you" : "ready";
        a.fill_note = a.hands_off ? `${portalName(a.portal)} needs you to sign in. Your answers and cover letter are ready to copy below.` : "";
        a.status = "awaiting"; a.updated_at = now();
      }
      if (a.fill_state === "submitting" && t - Date.parse(a.updated_at) > 2500) {
        a.fill_state = "submitted"; a.status = "submitted"; a.applied = now(); a.updated_at = now();
        const ap = latestApproval(db, a.id); if (ap) ap.confirmation = true;
      }
    }
  }
  const latestApproval = (db, id) => db.approvals.filter(x => x.application_id === id).sort((x, y) => (x.requested_at < y.requested_at ? 1 : -1))[0];
  const view = (db, a) => ({ ...a, deadline_in: a.deadline_in, opportunity_type: "internship", paid: a.paid });

  async function handle(method, path, body) {
    await new Promise(r => setTimeout(r, 120));
    const db = load();
    tick(db);
    const user = db.users.find(u => u.id === db.session);
    const need = () => { if (!user) throw err(401, "Log in to continue."); return user; };
    const route = `${method} ${path.split("?")[0]}`;
    let m;
    const out = (v) => { save(db); return v; };

    if (route === "POST /auth/signup") {
      const email = String(body?.email || "").trim().toLowerCase();
      if (db.users.some(u => u.email === email)) throw err(409, "There's already an account with that email. Log in instead.");
      if (String(body?.password || "").length < 8) throw err(400, "Use at least 8 characters for your password.");
      const u = { id: uuid(), email, plan: "free", created_at: now() };
      db.users.push(u);
      db.profiles.push({ user_id: u.id, legal_name: String(body?.name || "").trim() || null, updated_at: now() });
      db.session = u.id;
      return out({ ok: true });
    }
    if (route === "POST /auth/login") {
      const u = db.users.find(x => x.email === String(body?.email || "").trim().toLowerCase());
      if (!u) throw err(401, "No mock account with that email. Create one instead.");
      db.session = u.id;
      return out({ ok: true });
    }
    if (route === "POST /auth/logout") { db.session = null; return out({ ok: true }); }
    if (route === "GET /me") {
      need();
      const p = fromRow(db, user);
      const used = db.applications.filter(a => a.user_id === user.id && a.prepared_at && a.prepared_at.slice(0, 7) === now().slice(0, 7)).length;
      return out({ email: user.email, plan: user.plan, name: p.name, onboarded: Boolean(p.school && p.major), usage: { used, limit: FREE_LIMIT } });
    }
    if (route === "GET /profile") { need(); return out(fromRow(db, user)); }
    if (route === "PUT /profile") {
      need();
      if (body?.gpa !== undefined && String(body.gpa).trim() !== "" && !(Number(body.gpa) >= 0 && Number(body.gpa) <= 5)) throw err(400, "Enter your GPA as a number, like 3.6.");
      const i = db.profiles.findIndex(r => r.user_id === user.id);
      const row = toRow(user.id, body || {}, db.profiles[i] || {});
      if (i >= 0) db.profiles[i] = row; else db.profiles.push(row);
      return out({ ok: true });
    }
    if (route === "PUT /interests") {
      need();
      db.user_interests = db.user_interests.filter(r => r.user_id !== user.id)
        .concat((body?.fields || []).map(f => ({ user_id: user.id, category: f.name, parent: null, priority: f.top ? 1 : 2 })))
        .concat((body?.subfields || []).map(f => ({ user_id: user.id, category: f.name, parent: f.parent, priority: 2 })));
      return out({ ok: true });
    }
    if (route === "POST /profile/resume") {
      need();
      const f = body instanceof FormData ? body.get("resume") : null;
      if (!f || !/\.pdf$/i.test(f.name)) throw err(400, "Your resume needs to be a PDF.");
      const p = db.profiles.find(r => r.user_id === user.id);
      p.resume_filename = f.name; p.resume_url = `resumes/${user.id}/resume.pdf`; p.updated_at = now();
      return out({ ok: true, resumeName: f.name, note: "Mock: only the file name is kept. In Supabase the PDF goes to Storage." });
    }
    if (route === "GET /postings/matches") {
      need();
      const mine = db.user_interests.filter(i => i.user_id === user.id && !i.parent).map(i => i.category);
      const taken = new Set(db.applications.filter(a => a.user_id === user.id).map(a => a.posting_id));
      return out(postings().filter(p => !taken.has(p.id) && (!mine.length || mine.includes(p.category))).sort((a, b) => (a.deadline_in ?? 999) - (b.deadline_in ?? 999)));
    }
    if (route === "POST /postings/from-link") {
      need();
      const url = String(body?.url || "");
      let host; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { throw err(400, "That doesn't look like a link. Copy the full address, starting with https://"); }
      const a = { id: uuid(), user_id: user.id, posting_id: "link-" + host + Date.now(), company: host, role: "Internship (title not read in mock mode)", status: "found", fill_state: "idle", link: url, portal: "company site", category: null, deadline_in: null, updated_at: now() };
      db.applications.push(a);
      return out({ id: a.id, status: a.status });
    }
    if (route === "GET /applications") { need(); return out(db.applications.filter(a => a.user_id === user.id).map(a => view(db, a))); }
    if (route === "POST /applications") {
      need();
      const p = postings().find(x => x.id === body?.posting_id);
      if (!p) throw err(404, "That posting isn't available anymore.");
      let a = db.applications.find(x => x.user_id === user.id && x.posting_id === p.id);
      if (!a) {
        a = { id: uuid(), user_id: user.id, posting_id: p.id, company: p.company, role: p.role, status: "found", fill_state: "idle", fill_note: "",
          deadline_in: p.deadline_in, link: p.link, portal: p.ats, mode: p.mode, location: p.location, category: p.category, paid: p.paid, hands_off: p.hands_off, updated_at: now() };
        db.applications.push(a);
      }
      return out({ id: a.id, status: a.status });
    }
    if ((m = route.match(/^(GET|PATCH) \/applications\/([\w-]+)$/))) {
      need();
      const a = db.applications.find(x => x.id === m[2] && x.user_id === user.id);
      if (!a) throw err(404, "Application not found.");
      if (m[1] === "PATCH") { if (body?.status) a.status = body.status; if (body?.notes != null) a.notes = body.notes; a.updated_at = now(); return out({ ok: true }); }
      const ap = latestApproval(db, a.id);
      return out({ ...view(db, a), approval: ap ? { id: ap.id, answers: ap.answers, cover_letter: ap.cover_letter, has_screenshot: false, has_confirmation: false, requested_at: ap.requested_at, decided_at: ap.decided_at, decision: ap.decision } : null });
    }
    if ((m = route.match(/^(POST|PUT) \/applications\/([\w-]+)\/(prepare|answers|approve|decline)$/))) {
      need();
      const a = db.applications.find(x => x.id === m[2] && x.user_id === user.id);
      if (!a) throw err(404, "Application not found.");
      if (m[3] === "prepare") {
        if (["filling", "submitting", "submitted"].includes(a.fill_state)) throw err(409, "We're already working on this one.");
        const used = db.applications.filter(x => x.user_id === user.id && x.prepared_at && x.prepared_at.slice(0, 7) === now().slice(0, 7)).length;
        if (used >= FREE_LIMIT) throw err(402, `You've used your ${FREE_LIMIT} free applications this month. Pick a plan to keep going.`);
        if (!db.profiles.find(r => r.user_id === user.id)?.resume_filename) throw err(400, "Add your resume first. Applications need it.");
        db.approvals.push(draft(db, user, a));
        a.fill_state = "filling"; a.prepared_at = now(); a.updated_at = now();
        return out({ ok: true, fill_state: "queued" });
      }
      const ap = latestApproval(db, a.id);
      if (m[3] === "answers") {
        if (ap) { for (const e of body?.answers || []) { const x = ap.answers.find(y => y.key === e.key); if (x) x.value = e.value; } if (body?.cover_letter != null) ap.cover_letter = body.cover_letter; }
        return out({ ok: true });
      }
      if (m[3] === "approve") {
        if (!ap || ap.decided_at) throw err(409, "There's nothing waiting for your approval on this application.");
        ap.decided_at = now(); ap.decision = "approved";
        a.fill_state = "submitting"; a.updated_at = now();
        return out({ ok: true });
      }
      if (ap && !ap.decided_at) { ap.decided_at = now(); ap.decision = "rejected"; }
      a.status = "skipped"; a.fill_state = "idle"; a.updated_at = now();
      return out({ ok: true });
    }
    if (route === "GET /mock/db") { need(); return out(db); }
    throw err(404, `Mock mode doesn't handle ${route} yet.`);
  }

  window.MOCK_API = { handle, reset: () => localStorage.removeItem(KEY), dump: () => load() };

  // A strip at the top of every page, so nobody mistakes the mock for the real thing.
  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div");
    bar.className = "mockbar";
    bar.innerHTML = `<div class="wrap"><strong>Mock mode</strong><span>Nothing is sent anywhere. Your answers stay in this browser, stored the way Supabase will store them.</span>
      <a href="profile.html">See stored data</a><button type="button" id="mockReset">Start over</button><a href="?mock=0">Exit mock</a></div>`;
    document.body.prepend(bar);
    bar.querySelector("#mockReset").addEventListener("click", () => {
      if (confirm("Erase every mock account and answer in this browser?")) { localStorage.removeItem(KEY); location.href = "index.html"; }
    });
  });
})();
