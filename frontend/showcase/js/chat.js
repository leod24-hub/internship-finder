/* Lanyard preview assistant.
   No live AI here: a live model needs a server to hold the API key. This widget answers from the
   FAQ below, drawn from the page copy. To make it real later, replace answer() with a call to your backend. */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const store = { get(k) { try { return sessionStorage.getItem("lanyard." + k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem("lanyard." + k, v); } catch (e) {} } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const SIGNUP = { label: "Take me to sign-up", go: "#join" };
  const KB = [
    { keys: ["hi", "hello", "hey", "yo", "sup"], exact: true, a: "Hi! I'm the Lanyard assistant. Ask me what it does, what it costs, whether it's allowed, or when you can use it.", chips: ["What does Lanyard do?", "How much does it cost?", "When can I use it?"] },
    { keys: ["thanks", "thank you", "thx", "appreciate"], exact: true, a: "Anytime. Anything else you want to know?" },
    { keys: ["what is", "what does", "what do you do", "company", "explain", "lanyard do", "purpose", "overview"], a: "Lanyard fills out internship applications for you. You pick your fields, it finds matching openings, and it fills in the employer's form from your profile. Then it stops so you can review and approve before anything is sent. It's built for any major, not just tech or business.", chips: ["How does it work?", "Is it allowed?"] },
    { keys: ["how does", "how it works", "how do i", "steps", "process", "work"], a: "Four steps:\n1. Pick your fields, location, and timing.\n2. Get matching openings, or paste a link to any posting.\n3. Lanyard fills the application from your profile and drafts a cover letter from your real resume.\n4. You review every answer and approve, or say no.", actions: [{ label: "See it fill a form", go: "#demo" }] },
    { keys: ["when", "launch", "available", "release", "live", "ready", "beta", "early access", "waitlist", "wait list", "sign up", "signup", "join"], a: "Not yet. Lanyard is still being built, and this page is a design preview. The early-access list at the bottom of the page is the way to hear first.", actions: [SIGNUP] },
    { keys: ["price", "cost", "pricing", "how much", "free", "cheap", "pay", "plan", "subscription", "season pass", "pro", "$", "money", "afford"], a: "Draft prices, which may change before launch:\n• Free: $0. Tracker, matches, and 3 assisted applications a month.\n• Season pass: $49 one time. Up to 60 assisted applications for one recruiting season.\n• Pro: $19 a month. 40 assisted applications a month.", actions: [{ label: "See pricing", go: "#price" }] },
    { keys: ["cancel", "refund", "money back"], a: "Pro is meant to be cancel-any-time. Refund rules aren't decided yet, since nothing is on sale." },
    { keys: ["allowed", "legal", "terms", "ban", "banned", "rules", "tos", "cheat", "cheating", "against", "trouble", "safe", "linkedin"], a: "Some sites forbid automation, so Lanyard is designed to skip those and leave them to you. LinkedIn is one example. It works in your own browser, you approve every application, and it never creates accounts or gets around bot checks. Employers set their own rules about AI tools, so read them for anything you submit." },
    { keys: ["password", "login", "log in", "account", "captcha", "bot check", "verification", "code"], a: "Lanyard never types your passwords, creates accounts, or enters verification codes, and it doesn't get around CAPTCHAs. When one of those comes up, it pauses and hands that step to you." },
    { keys: ["privacy", "data", "private", "store", "secure", "security", "share", "delete", "personal"], a: "The plan: your profile is used only to fill your own applications, it isn't shared with other students, and you can export or delete it. Demographic questions are answered only if you choose to, and the default is \"decline.\" These are goals while we build, so the details will be in a privacy policy before launch." },
    { keys: ["approve", "approval", "control", "review", "send without", "automatic", "automatically"], a: "Nothing is sent without your approval. For every application you see each answer and the cover letter first, fix anything that's off, then approve or decline." },
    { keys: ["major", "field", "fields", "category", "nursing", "engineering", "business", "design", "not tech"], a: "Any major. There are 29 fields so far, including healthcare, engineering, education, design, policy, media, nonprofit work, and trades. If your field has few listings, paste a link to any posting and Lanyard can still help with the form.", actions: [{ label: "Browse fields", go: "#fields" }] },
    { keys: ["site", "sites", "portal", "portals", "workday", "icims", "greenhouse", "lever", "support", "supports", "employers", "which"], a: "We're building around the application systems most employers use, like Workday, iCIMS, Greenhouse, and Lever. Coverage isn't final and will grow based on what students ask for. It will be listed in your dashboard." },
    { keys: ["extension", "chrome", "app", "mobile", "phone", "download", "install", "browser"], a: "The plan is a Chrome extension plus a web dashboard, so it works inside your own browser. That's not final yet." },
    { keys: ["lie", "fake", "invent", "accurate", "accuracy", "true", "honest", "cover letter", "resume", "made up"], a: "Answers and cover letters come only from your profile and resume. Lanyard doesn't invent experience, and you check every answer before it goes." },
    { keys: ["interview", "guarantee", "offer", "job", "hired", "chances", "results"], a: "No tool can promise interviews or offers. Lanyard saves you the repetitive typing so you can put your time into applications that fit." },
    { keys: ["time", "hours", "save", "faster", "minutes", "long"], a: "It's an estimate, but we assume about 25 minutes per application by hand and about 4 to review one that Lanyard filled. Try the calculator with your own number.", actions: [{ label: "Open the calculator", go: "#math" }] },
    { keys: ["who", "team", "founder", "built", "made", "student", "students", "behind"], a: "Lanyard is a working name for an early-stage project from a small team of students. This page is a design mock with made-up examples, so there are no real customers or testimonials yet." },
    { keys: ["contact", "support", "email", "reach", "human", "person", "talk to", "help"], a: "There's no live support yet. Join the early-access list and we'll reach out. I can also answer questions about pricing, privacy, and how it works.", actions: [SIGNUP] },
  ];
  const FALLBACK = { a: "I don't have an answer to that yet. I can help with what Lanyard does, pricing, privacy, which sites it works with, and when it launches. To ask us something else, join the early-access list.", chips: ["What does Lanyard do?", "How much does it cost?", "Is it allowed?"], actions: [SIGNUP] };

  function norm(s) { return " " + s.toLowerCase().replace(/[^a-z0-9$' ]/g, " ").replace(/\s+/g, " ").trim() + " "; }
  function answer(q) {
    const n = norm(q); let best = null, bestScore = 0;
    KB.forEach(e => {
      let s = 0;
      e.keys.forEach(k => {
        const kk = norm(k);
        if (e.exact) { if (n.trim() === k || n.indexOf(" " + k + " ") >= 0 && n.trim().split(" ").length <= 3) s += 3; return; }
        if (n.indexOf(kk) >= 0) s += (k.indexOf(" ") >= 0 ? 3 : 2) + k.length / 100; // longer match wins a tie
      });
      if (s > bestScore) { bestScore = s; best = e; }
    });
    return bestScore >= 2 ? best : FALLBACK;
  }

  const ICON_BUB = '<svg class="bub" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.7A8 8 0 1 1 21 12z"/><path d="M9 11.5h.01M12.5 11.5h.01M16 11.5h.01"/></svg>';
  const ICON_X = '<svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_BADGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2l4 7 4-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="5.5" y="9" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="14" r="1.7" fill="currentColor"/></svg>';

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="chat-nudge" id="chatNudge" role="status">Questions about Lanyard? Ask me.<button type="button" aria-label="Dismiss">&times;</button></div>
    <button class="chat-launch" id="chatLaunch" type="button" aria-expanded="false" aria-controls="chatPanel" aria-label="Open chat assistant">${ICON_BUB}${ICON_X}<span class="chat-dot"></span></button>
    <section class="chat-panel" id="chatPanel" role="dialog" aria-label="Lanyard assistant" aria-hidden="true">
      <div class="chat-head"><span class="chat-av">${ICON_BADGE}</span><div class="grow"><b>Lanyard assistant</b><small>Preview. Answers come from a built-in FAQ, not live AI.</small></div><button class="chat-close" type="button" aria-label="Close chat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="chat-log" id="chatLog" role="log" aria-live="polite"></div>
      <div class="chat-chips" id="chatChips"></div>
      <form class="chat-form" id="chatForm"><label class="sr" for="chatIn">Your question</label><input id="chatIn" type="text" autocomplete="off" placeholder="Ask about Lanyard" maxlength="200"><button type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>
    </section>`;
  document.body.append(...wrap.children);

  const $ = id => document.getElementById(id);
  const launch = $("chatLaunch"), panel = $("chatPanel"), log = $("chatLog"), chips = $("chatChips"), form = $("chatForm"), input = $("chatIn"), nudge = $("chatNudge");
  let greeted = false, busy = false;

  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function addMsg(text, who, actions) {
    const m = document.createElement("div"); m.className = "msg " + who; m.innerHTML = esc(text);
    if (actions && actions.length) {
      const box = document.createElement("div"); box.className = "acts";
      actions.forEach(a => { const b = document.createElement("button"); b.type = "button"; b.textContent = a.label; b.addEventListener("click", () => { setOpen(false); const t = document.querySelector(a.go); if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }); box.appendChild(b); });
      m.appendChild(box);
    }
    log.appendChild(m); scrollDown(); return m;
  }
  function setChips(list) {
    chips.innerHTML = "";
    (list || []).forEach(t => { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.addEventListener("click", () => ask(t)); chips.appendChild(b); });
  }
  function reply(entry) {
    busy = true;
    const t = document.createElement("div"); t.className = "msg bot typing"; t.setAttribute("aria-label", "Assistant is typing"); t.innerHTML = "<i></i><i></i><i></i>"; log.appendChild(t); scrollDown();
    const delay = reduce ? 0 : Math.min(1100, 450 + entry.a.length * 4);
    setTimeout(() => { t.remove(); addMsg(entry.a, "bot", entry.actions); setChips(entry.chips || ["What does Lanyard do?", "How much does it cost?", "Is it allowed?", "When can I use it?"]); busy = false; }, delay);
  }
  function ask(q) { q = q.trim(); if (!q || busy) return; addMsg(q, "me"); setChips([]); reply(answer(q)); }

  function setOpen(open) {
    root.classList.toggle("chat-open", open); launch.setAttribute("aria-expanded", open); panel.setAttribute("aria-hidden", !open);
    launch.setAttribute("aria-label", open ? "Close chat assistant" : "Open chat assistant");
    if (open) {
      root.classList.add("chat-seen"); nudge.classList.remove("show"); store.set("nudge", "1");
      if (!greeted) { greeted = true; reply({ a: "Hi! I'm the Lanyard assistant. I can answer questions about what Lanyard does, pricing, privacy, and when it launches.", chips: ["What does Lanyard do?", "How much does it cost?", "Is it allowed?", "When can I use it?"] }); }
      setTimeout(() => input.focus(), reduce ? 0 : 300);
    } else launch.focus({ preventScroll: true });
  }
  launch.addEventListener("click", () => setOpen(!root.classList.contains("chat-open")));
  panel.querySelector(".chat-close").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && root.classList.contains("chat-open")) setOpen(false); });
  form.addEventListener("submit", e => { e.preventDefault(); const v = input.value; input.value = ""; ask(v); });
  nudge.querySelector("button").addEventListener("click", e => { e.stopPropagation(); nudge.classList.remove("show"); store.set("nudge", "1"); });
  nudge.addEventListener("click", () => setOpen(true));
  if (!store.get("nudge")) setTimeout(() => { if (!root.classList.contains("chat-open")) nudge.classList.add("show"); }, 7000);
})();
