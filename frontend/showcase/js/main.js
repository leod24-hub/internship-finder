(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  if (reduce) root.classList.add("nomo");
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- split headings into masked words ---------- */
  function split(el) {
    const out = [];
    el.childNodes.forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { out.push(document.createTextNode(" ")); return; }
          const w = document.createElement("span"); w.className = "w";
          const i = document.createElement("span"); i.className = "wi"; i.textContent = t;
          w.appendChild(i); out.push(w);
        });
      } else out.push(n);
    });
    el.textContent = ""; out.forEach(n => el.appendChild(n));
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  }
  $$("[data-split]").forEach(el => { const label = el.textContent.replace(/\s+/g, " ").trim(); split(el); el.setAttribute("aria-label", label); $$(".w", el).forEach(w => w.setAttribute("aria-hidden", "true")); });

  if (!reduce) gsap.set(".wi", { yPercent: 115 });
  root.classList.add("ready");

  /* ---------- progress bar ---------- */
  if (!reduce) gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.2 } });

  /* ---------- data: categories ---------- */
  const CATS = LAN.categories;
  const HUE = { blue: 1, teal: 1, green: 1, yellow: 1, orange: 1, rose: 1, purple: 1, slate: 1 };

  /* ---------- hero: headline intro, condense on scroll ---------- */
  if (!reduce) {
    const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
    intro.to(".hero h1 .wi", { yPercent: 0, duration: 1.3, stagger: 0.11 }, 0.15)
      .from("[data-rise]", { y: 36, opacity: 0, duration: 1, stagger: 0.12 }, 0.7)
      .from(".nav", { yPercent: -160, duration: 0.9 }, 0.4)
      .from(".deco.star", { scale: 0, rotate: -120, duration: 1.2, ease: "back.out(2)" }, 0.6)
      .from(".deco.blob", { x: -160, opacity: 0, duration: 1.4 }, 0.5);
    gsap.to(".deco.star", { rotate: 360, duration: 16, repeat: -1, ease: "none" });
    gsap.to(".deco.blob", { y: -30, rotate: 8, duration: 5, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.fromTo(".hero h1", { "--w": 100 }, { "--w": 75, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero .copy", { yPercent: -12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".deco.star", { y: 160, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* ---------- other headings reveal ---------- */
  if (!reduce) {
    $$("[data-split]").filter(h => !h.closest(".hero")).forEach(h => gsap.to($$(".wi", h), { yPercent: 0, duration: 1.1, stagger: 0.07, ease: "expo.out", scrollTrigger: h.closest(".pin") ? { trigger: "#demo", start: "top 75%" } : { trigger: h, start: "top 88%" } }));
    $$("[data-rise]").filter(e => !e.closest(".hero")).forEach(e => gsap.from(e, { y: 40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: e, start: "top 90%" } }));
  }

  /* ---------- badge: slot words, barcodes, scan, physics ---------- */
  const words = [["Nursing", "teal"], ["Robotics", "blue"], ["Journalism", "rose"], ["Public policy", "slate"], ["Architecture", "yellow"], ["Music", "purple"], ["Biology", "green"], ["Hospitality", "orange"]];
  const HEX = { blue: "#9aa5ff", teal: "#19c3b0", green: "#3ddc84", yellow: "#ffe14d", orange: "#ff8a3d", rose: "#ff5c9a", purple: "#c9b8ff", slate: "#cbd0e2" };
  const list = $("#slotlist");
  list.innerHTML = words.concat([words[0]]).map(w => `<li>${w[0]}</li>`).join("");
  $("#slotbar").style.background = HEX[words[0][1]];
  $$(".codes").forEach(c => { c.innerHTML = Array.from({ length: 34 }, () => "<i></i>").join(""); });
  if (!reduce) {
    const n = words.length, tl = gsap.timeline({ repeat: -1, delay: 1.8 });
    words.forEach((w, i) => {
      const nextHue = words[(i + 1) % n][1];
      tl.to(list, { yPercent: -100 * (i + 1) / (n + 1), duration: 0.7, ease: "expo.inOut" }, "+=1.3")
        .to("#slotbar", { backgroundColor: HEX[nextHue], duration: 0.7, ease: "none" }, "<");
    });
    tl.set(list, { yPercent: 0 });
    gsap.fromTo("#scan", { y: 0, opacity: 1 }, { y: -48, duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }

  const hang = $("#hang"), badge = $("#badge");
  let th = 0, w = 0, dragging = false, running = false, last = 0, moved = 0, lastTh = 0, lastT = 0;
  const G = 30, C = 1.15;
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
    if (!dragging) { w += (-G * Math.sin(th) - C * w) * dt; th += w * dt; }
    hang.style.transform = `rotate(${th}rad)`;
    if (!dragging && Math.abs(th) < 0.0015 && Math.abs(w) < 0.01) { running = false; th = 0; hang.style.transform = ""; return; }
    requestAnimationFrame(frame);
  }
  function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function pivot() { const r = hang.getBoundingClientRect(), cx = r.left + r.width / 2; const top = r.top - 0; return { x: cx, y: hang.offsetTop ? hang.parentElement.getBoundingClientRect().top + hang.offsetTop : r.top }; }
  function angleFor(e) { const p = hang.parentElement.getBoundingClientRect(); const px = p.left + p.width / 2, py = p.top + parseFloat(getComputedStyle(hang).top); return -Math.atan2(e.clientX - px, e.clientY - py); }
  hang.addEventListener("pointerdown", e => { dragging = true; moved = 0; hang.classList.add("drag"); hang.setPointerCapture(e.pointerId); lastTh = th; lastT = performance.now(); w = 0; kick(); });
  hang.addEventListener("pointermove", e => {
    if (!dragging) return;
    const a = Math.max(-1.1, Math.min(1.1, angleFor(e))); const now = performance.now();
    w = (a - lastTh) / Math.max(0.008, (now - lastT) / 1000); w = Math.max(-9, Math.min(9, w));
    moved += Math.abs(a - th); th = a; lastTh = a; lastT = now;
  });
  const end = () => { if (!dragging) return; dragging = false; hang.classList.remove("drag"); if (moved < 0.04) { badge.classList.toggle("flip"); w += 1.6; } kick(); };
  hang.addEventListener("pointerup", end); hang.addEventListener("pointercancel", end);
  hang.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { badge.classList.toggle("flip"); w += 2; kick(); } });
  hang.tabIndex = 0; hang.setAttribute("role", "button"); hang.setAttribute("aria-label", "Name badge. Press to flip it.");
  document.querySelector(".hero").addEventListener("pointermove", e => { if (dragging || reduce) return; w += (e.movementX || 0) * 0.0035; if (Math.abs(w) > 0.02) kick(); });
  if (!reduce) { gsap.from(hang, { y: -520, duration: 1.4, delay: 0.5, ease: "bounce.out", onComplete: () => { w = 2.4; kick(); } }); }

  /* ---------- ribbons ---------- */
  function ribbon(el, items, dir, speed) {
    const star = '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M50 0l11 33 34-8-24 26 24 26-34-8-11 33-11-33-34 8 24-26L5 25l34 8z"/></svg>';
    const one = items.map(t => `<span>${t}${star}</span>`).join("");
    el.innerHTML = one + one;
    if (reduce) return null;
    const tw = gsap.fromTo(el, { xPercent: dir > 0 ? -50 : 0 }, { xPercent: dir > 0 ? 0 : -50, duration: speed, ease: "none", repeat: -1 });
    return tw;
  }
  const names = CATS.map(c => c.name);
  const t1 = ribbon($("#r1"), names.slice(0, 14), -1, 40), t2 = ribbon($("#r2"), names.slice(14), 1, 46);
  if (!reduce) ScrollTrigger.create({ trigger: ".ribbons", start: "top bottom", end: "bottom top", onUpdate: s => { const v = Math.min(6, 1 + Math.abs(s.getVelocity()) / 350); gsap.to([t1, t2], { timeScale: v, duration: 0.25, overwrite: true }); gsap.to([t1, t2], { timeScale: 1, duration: 1.1, delay: 0.25, overwrite: "auto" }); } });
  if (!reduce) gsap.fromTo(".ribbons", { rotate: -2 }, { rotate: 0, ease: "none", scrollTrigger: { trigger: ".ribbons", start: "top bottom", end: "top 30%", scrub: true } });

  /* ---------- tiles ---------- */
  const tiles = $("#tiles"), picked = new Set(["healthcare-clinical", "design-creative-arts"]);
  tiles.innerHTML = CATS.map((c, i) => {
    const cls = i % 9 === 0 ? "big" : i % 4 === 1 ? "wide" : "";
    return `<button type="button" class="tile ${cls}" data-hue="${c.hue}" data-id="${c.id}" aria-pressed="${picked.has(c.id)}"><span class="ck"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7.5l3.2 3L12 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="t">${c.name}</span><span class="s">${c.subs.slice(0, 3).map(s => s.name).join(", ")}</span></button>`;
  }).join("");
  function paintPicked(animate) {
    const names = CATS.filter(c => picked.has(c.id)).map(c => c.name), el = $("#picked");
    el.textContent = names.length ? `You picked ${names.length}: ${names.join(", ")}.` : "Pick a field. Any field.";
    if (animate && !reduce) gsap.fromTo(el, { y: 14, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" });
  }
  tiles.addEventListener("click", e => {
    const b = e.target.closest(".tile"); if (!b) return;
    const id = b.dataset.id, on = !picked.has(id); on ? picked.add(id) : picked.delete(id);
    b.setAttribute("aria-pressed", on); paintPicked(true);
    if (!reduce) gsap.fromTo(b, { scale: 0.94 }, { scale: 1, duration: 0.6, ease: "elastic.out(1,.5)" });
  });
  paintPicked(false);
  if (!reduce) gsap.from(".tile", { y: 70, opacity: 0, rotate: () => gsap.utils.random(-4, 4), duration: 0.9, ease: "expo.out", stagger: { each: 0.035, from: "random" }, scrollTrigger: { trigger: "#tiles", start: "top 85%" } });

  /* ---------- pinned demo, scrubbed ---------- */
  const steps = $$("#steps li");
  const setStep = i => steps.forEach((li, k) => li.classList.toggle("on", k === i));
  const fds = $$("#form .fd");
  function buildDemo() {
    const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: "#demo", start: "top top", end: "+=360%", pin: "#demo", scrub: 0.5, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: self => { const t = self.progress * 10; setStep(t < 1.6 ? 0 : t < 3 ? 1 : t < 7.1 ? 2 : 3); } } });
    tl.fromTo("#sa .mini span", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.2, duration: 0.6 }, 0)
      .fromTo("#sa .mrow", { x: 70, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.35, duration: 0.8 }, 1.1)
      .to("#sa .mrow:first-of-type", { backgroundColor: "#ffe14d", duration: 0.4 }, 2.6)
      .to("#sa", { opacity: 0, duration: 0.5 }, 3.2)
      .to("#sb", { opacity: 1, duration: 0.5 }, 3.2)
      .to("#url", { duration: 0.01, onStart() { this.targets()[0].textContent = "northwindhealth.example/apply"; }, onReverseComplete() { this.targets()[0].textContent = "lanyard.example/matches"; } }, 3.3);
    // the page url text swap is only decorative; reset on reverse via function below
    let at = 3.9;
    const cur = $("#cur"), form = $("#form");
    const pos = el => ({ x: () => el.offsetLeft + 30, y: () => el.offsetTop + el.offsetHeight / 2 - 6 });
    gsap.set(cur, { x: 20, y: 20, opacity: 0 });
    tl.to(cur, { opacity: 1, duration: 0.2 }, 3.7);
    fds.forEach((fd, i) => {
      const text = fd.dataset.t, dur = i === 4 ? 1.6 : 0.6, o = { n: 0 };
      tl.to(cur, { ...pos(fd), duration: 0.35, ease: "power2.inOut" }, at)
        .to(fd, { duration: 0.01, onStart() { fd.classList.add("hot"); }, onReverseComplete() { fd.classList.remove("hot"); } }, at + 0.35)
        .to(o, { n: text.length, duration: dur, onUpdate() { fd.textContent = text.slice(0, Math.round(o.n)); } }, at + 0.35);
      at += 0.35 + dur + 0.08;
    });
    tl.to("#att1", { opacity: 1, y: 0, duration: 0.25 }, at).fromTo("#att1", { y: 12 }, { y: 0, duration: 0.25 }, at)
      .to("#att2", { opacity: 1, duration: 0.25 }, at + 0.3).fromTo("#att2", { y: 12 }, { y: 0, duration: 0.25 }, at + 0.3);
    at += 0.8;
    tl.to(cur, { opacity: 0, duration: 0.2 }, at);
    tl.fromTo("#rv", { y: 200, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, at + 0.1);
    $$("#chk .bx").forEach((bx, i) => { tl.to(bx.firstElementChild, { opacity: 1, duration: 0.15 }, at + 0.9 + i * 0.35).to(bx, { backgroundColor: "rgba(127,227,181,.18)", borderColor: "#7fe3b5", duration: 0.15 }, at + 0.9 + i * 0.35); });
    tl.to("#appr", { scale: 0.94, duration: 0.1 }, at + 2.5).to("#appr", { scale: 1, backgroundColor: "#7fe3b5", duration: 0.1 }, at + 2.6)
      .fromTo("#stampx", { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, at + 2.7)
      .to({}, { duration: 0.8 }, at + 3);
    return tl;
  }
  if (!reduce && innerWidth > 0) {
    // reset text when scrubbing starts (so builds are idempotent)
    fds.forEach(f => f.textContent = "");
    const demo = buildDemo();
  } else {
    // reduced motion: show the finished state as static content
    fds.forEach(f => { f.textContent = f.dataset.t; });
    $("#sa").style.display = "none"; $("#sb").style.opacity = 1; $("#att1").style.opacity = 1; $("#att2").style.opacity = 1; $("#rv").style.opacity = 1; $("#stampx").style.opacity = 1;
    $$("#chk .bx svg").forEach(s => s.style.opacity = 1); $("#url").textContent = "northwindhealth.example/apply"; setStep(3);
    $("#demo").style.paddingBottom = "0";
  }

  /* ---------- time math ---------- */
  const nIn = $("#n"), counter = { h: 0, l: 0, s: 0 };
  function calc() {
    const n = +nIn.value, hand = n * 25 / 60, me = n * 4 / 60, save = hand - me;
    $("#nout").textContent = n;
    const apply = () => { $("#hh").textContent = counter.h.toFixed(1); $("#ll").textContent = counter.l.toFixed(1); $("#saved").textContent = Math.round(counter.s); };
    const maxH = 150 * 25 / 60;
    if (reduce) { counter.h = hand; counter.l = me; counter.s = save; apply(); $("#b1").style.width = hand / maxH * 100 + "%"; $("#b2").style.width = me / maxH * 100 + "%"; return; }
    gsap.to(counter, { h: hand, l: me, s: save, duration: 0.7, ease: "power3.out", onUpdate: apply });
    gsap.to("#b1", { width: hand / maxH * 100 + "%", duration: 0.7, ease: "power3.out" });
    gsap.to("#b2", { width: Math.max(2, me / maxH * 100) + "%", duration: 0.7, ease: "power3.out" });
  }
  nIn.addEventListener("input", calc);
  if (!reduce) ScrollTrigger.create({ trigger: "#math", start: "top 70%", once: true, onEnter: calc }); else calc();

  /* ---------- won't list ---------- */
  if (!reduce) $$(".nots li").forEach(li => {
    gsap.from(li, { x: -60, opacity: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: li, start: "top 90%" } });
    gsap.to($(".no", li), { strokeDashoffset: 0, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: li, start: "top 85%" }, delay: 0.3 });
  });

  /* ---------- pricing: tilt + entrance ---------- */
  if (!reduce) {
    gsap.from(".tk", { y: 120, rotate: () => gsap.utils.random(-6, 6), opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.14, scrollTrigger: { trigger: ".tickets", start: "top 85%" } });
    $$(".tk").forEach(c => {
      const rx = gsap.quickTo(c, "rotationX", { duration: 0.4, ease: "power3" }), ry = gsap.quickTo(c, "rotationY", { duration: 0.4, ease: "power3" });
      c.addEventListener("pointermove", e => { const r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 12); rx(-((e.clientY - r.top) / r.height - 0.5) * 12); });
      c.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
  }

  /* ---------- CTA: submit + confetti ---------- */
  $("#joinform").addEventListener("submit", e => {
    e.preventDefault();
    $("#joinform").style.display = "none"; const t = $("#thanks"); t.style.display = "block";
    if (reduce) return;
    gsap.from(t, { scale: 0.6, opacity: 0, duration: 0.8, ease: "elastic.out(1,.5)" });
    const cols = ["#ffe14d", "#ff6b4a", "#7fe3b5", "#c9b8ff", "#ffffff"], box = $("#confetti");
    for (let i = 0; i < 70; i++) {
      const p = document.createElement("i"); p.style.background = cols[i % cols.length]; box.appendChild(p);
      gsap.fromTo(p, { x: 0, y: 0, rotate: 0, opacity: 1 }, { x: gsap.utils.random(-520, 520), y: gsap.utils.random(-460, 160), rotate: gsap.utils.random(-540, 540), duration: gsap.utils.random(1.1, 1.9), ease: "power3.out", onComplete: () => gsap.to(p, { y: "+=380", opacity: 0, duration: 0.9, ease: "power1.in", onComplete: () => p.remove() }) });
    }
  });

  /* ---------- cursor + magnetic buttons ---------- */
  if (!reduce && matchMedia("(pointer:fine)").matches) {
    const cur = $("#cursor"), qx = gsap.quickTo(cur, "x", { duration: 0.2, ease: "power3" }), qy = gsap.quickTo(cur, "y", { duration: 0.2, ease: "power3" });
    addEventListener("pointermove", e => { cur.style.opacity = 1; qx(e.clientX); qy(e.clientY); });
    document.addEventListener("pointerover", e => cur.classList.toggle("big", !!e.target.closest("a,button,.tile,.hang,input[type=range]")));
    $$(".magnet").forEach(b => {
      const mx = gsap.quickTo(b, "x", { duration: 0.4, ease: "power3" }), my = gsap.quickTo(b, "y", { duration: 0.4, ease: "power3" });
      b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.28); my((e.clientY - r.top - r.height / 2) * 0.4); });
      b.addEventListener("pointerleave", () => { mx(0); my(0); });
    });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
