const store = {
  get(k, d) { try { const v = localStorage.getItem("lanyard." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("lanyard." + k, JSON.stringify(v)); } catch (e) {} },
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2l4 7 4-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="5.5" y="9" width="13" height="13" rx="3" fill="var(--highlight)" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="14" r="1.7" fill="currentColor"/></svg>';

function renderBar(active, mode) {
  const el = document.getElementById("bar");
  if (!el) return;
  const profile = store.get("profile", null);
  const initials = profile && profile.name ? profile.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() : "JS";
  const links = mode === "app"
    ? `<nav aria-label="Main"><a href="app.html" ${active === "app" ? 'aria-current="page"' : ""}>Dashboard</a><a href="review.html" ${active === "review" ? 'aria-current="page"' : ""}>Review queue</a><a href="onboarding.html" ${active === "profile" ? 'aria-current="page"' : ""}>Fields and profile</a></nav>
       <div class="right"><span class="small muted">2 of 3 assisted applications used</span><a class="btn sm" href="index.html#pricing">Upgrade</a><span class="avatar" title="Your account">${esc(initials)}</span></div>`
    : `<nav aria-label="Main"><a href="index.html#how">How it works</a><a href="index.html#fields">Fields</a><a href="index.html#pricing">Pricing</a><a href="index.html#faq">Questions</a></nav>
       <div class="right"><a class="btn ghost sm" href="app.html">Log in</a><a class="btn sm" href="onboarding.html">Get started</a></div>`;
  el.innerHTML = `<div class="wrap"><a class="wordmark" href="${mode === "app" ? "app.html" : "index.html"}">${LOGO}Lanyard</a>${links}</div>`;
}

function chipButton(cat, pressed) {
  return `<button type="button" class="chip" data-hue="${cat.hue}" data-id="${cat.id}" aria-pressed="${pressed ? "true" : "false"}">${esc(cat.name)}</button>`;
}
function dueLabel(n) {
  if (n < 0) return `<span class="tag">Closed ${-n} days ago</span>`;
  if (n <= 7) return `<span class="tag due">Due in ${n} days</span>`;
  return `<span class="tag">Due in ${n} days</span>`;
}
