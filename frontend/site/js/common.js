const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2l4 7 4-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="5.5" y="9" width="13" height="13" rx="3" fill="var(--highlight)" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="14" r="1.7" fill="currentColor"/></svg>';

// Calls the AutoInterns API. Sends people to the login page when their session has ended.
async function api(method, path, body) {
  const opts = { method, headers: {}, credentials: "same-origin" };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const res = await fetch("/api" + path, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/auth")) {
    location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search);
    throw new Error(data.error || "Log in to continue.");
  }
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Try again."), { status: res.status });
  return data;
}

// Shows a short message in a role="status" element. kind: "ok" | "err" | ""
function say(el, text, kind = "") {
  if (!el) return;
  el.textContent = text;
  el.className = (el.className.replace(/\b(ok|err)\b/g, "").trim() + " " + kind).trim();
}

function renderBar(active, mode) {
  const el = document.getElementById("bar");
  if (!el) return Promise.resolve(null);
  const links = mode === "app"
    ? `<nav aria-label="Main"><a href="app.html" ${active === "app" ? 'aria-current="page"' : ""}>My applications</a><a href="review.html" ${active === "review" ? 'aria-current="page"' : ""}>Ready for your OK</a><a href="onboarding.html" ${active === "profile" ? 'aria-current="page"' : ""}>Fields and profile</a></nav>
       <div class="right"><span class="small muted" id="barUsage"></span><a class="btn sm" href="index.html#pricing">See plans</a><button type="button" class="btn ghost sm" id="logout">Log out</button><span class="avatar" id="barAvatar" title="Your account"></span></div>`
    : `<nav aria-label="Main"><a href="index.html#how">What we handle</a><a href="index.html#fields">Fields</a><a href="index.html#pricing">Pricing</a><a href="index.html#faq">Questions</a></nav>
       <div class="right"><a class="btn ghost sm" href="login.html">Log in</a><a class="btn sm" href="login.html?mode=signup">Get started</a></div>`;
  el.innerHTML = `<div class="wrap"><a class="wordmark" href="${mode === "app" ? "app.html" : "index.html"}">${LOGO}Lanyard</a>${links}</div>`;
  if (mode !== "app") return Promise.resolve(null);
  document.getElementById("logout").addEventListener("click", async () => { await api("POST", "/auth/logout").catch(() => {}); location.href = "login.html"; });
  return api("GET", "/me").then(me => {
    const initials = (me.name || me.email).split(/[\s@]+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    document.getElementById("barAvatar").textContent = initials;
    document.getElementById("barAvatar").title = me.email;
    if (me.usage.limit != null) document.getElementById("barUsage").textContent = `${Math.min(me.usage.used, me.usage.limit)} of ${me.usage.limit} free applications used`;
    return me;
  });
}

function chipButton(cat, pressed) {
  return `<button type="button" class="chip" data-hue="${cat.hue}" data-id="${cat.id}" aria-pressed="${pressed ? "true" : "false"}">${esc(cat.name)}</button>`;
}
function dueLabel(n) {
  if (n == null) return "";
  if (n < 0) return `<span class="tag">Closed ${-n} days ago</span>`;
  if (n <= 7) return `<span class="tag due">Due in ${n} days</span>`;
  return `<span class="tag">Due in ${n} days</span>`;
}
