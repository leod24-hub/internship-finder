(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  if (reduce) root.classList.add("nomo");
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- theme switch (default is light; choice is remembered) ---------- */
  const tgl = $("#themeToggle");
  tgl.setAttribute("aria-checked", root.dataset.theme === "dark");
  function applyTheme(t) {
    root.dataset.theme = t; tgl.setAttribute("aria-checked", t === "dark");
    try { localStorage.setItem("lanyard.theme", t); } catch (e) {}
  }
  tgl.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark", r = tgl.getBoundingClientRect();
    root.style.setProperty("--tx", r.left + r.width / 2 + "px"); root.style.setProperty("--ty", r.top + r.height / 2 + "px");
    if (document.startViewTransition && !reduce) document.startViewTransition(() => applyTheme(next));
    else { root.classList.add("theme-anim"); applyTheme(next); setTimeout(() => root.classList.remove("theme-anim"), 600); }
  });

  /* ---------- split headings into masked words ---------- */
  function split(el) {
    const label = el.textContent.replace(/\s+/g, " ").trim(), out = [];
    el.childNodes.forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { out.push(document.createTextNode(" ")); return; }
          const w = document.createElement("span"); w.className = "w"; w.setAttribute("aria-hidden", "true");
          const i = document.createElement("span"); i.className = "wi"; i.textContent = t; w.appendChild(i); out.push(w);
        });
      } else out.push(n);
    });
    el.textContent = ""; out.forEach(n => el.appendChild(n)); el.setAttribute("aria-label", label);
  }
  $$("[data-split]").forEach(split);
  if (!reduce) gsap.set(".wi", { yPercent: 115 });
  root.classList.add("is-ready");

  if (!reduce) gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.2 } });

  const CATS = LAN.categories;

  /* ---------- hero: headline intro, condense on scroll ---------- */
  if (!reduce) {
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .to(".hero h1 .wi", { yPercent: 0, duration: 1.2, stagger: 0.07 }, 0.15)
      .from(".hero [data-rise]", { y: 36, opacity: 0, duration: 1, stagger: 0.12 }, 0.6)
      .from(".nav", { yPercent: -160, duration: 0.9 }, 0.3)
      .from(".hero .stage", { y: 70, opacity: 0, duration: 1.2 }, 0.5);
    gsap.fromTo(".hero h1", { "--w": 100 }, { "--w": 80, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero .copy", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* ---------- other headings reveal ---------- */
  if (!reduce) {
    $$("[data-split]").filter(h => !h.closest(".hero")).forEach(h => {
      const st = h.closest(".pin") ? { trigger: "#demo", start: "top 75%" } : h.closest(".pain-stick") ? { trigger: "#pain", start: "top 60%" } : { trigger: h, start: "top 88%" };
      gsap.to($$(".wi", h), { yPercent: 0, duration: 1.1, stagger: 0.07, ease: "expo.out", scrollTrigger: st });
    });
    $$("[data-rise]").filter(e => !e.closest(".hero")).forEach(e => gsap.from(e, { y: 40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: e, start: "top 90%" } }));
  }

  /* ---------- hero form fills itself, on a loop ---------- */
  const hfd = $$("#hform .fd"), hcur = $("#hcur");
  function fillTimeline(fields, cursor, extras, opts) {
    const tl = gsap.timeline(opts || {}); let at = 0;
    const pos = el => ({ x: () => el.offsetLeft + 30, y: () => el.offsetTop + el.offsetHeight / 2 - 4 });
    gsap.set(cursor, { x: 20, y: 20, opacity: 0 });
    tl.to(cursor, { opacity: 1, duration: 0.25 }, at);
    fields.forEach((fd, i) => {
      const text = fd.dataset.t, o = { n: 0 }, dur = Math.min(1.8, 0.35 + text.length * 0.028);
      tl.to(cursor, { ...pos(fd), duration: 0.4, ease: "power2.inOut" }, at)
        .call(() => fd.classList.add("hot"), null, at + 0.4)
        .to(o, { n: text.length, duration: dur, ease: "none", onUpdate() { fd.textContent = text.slice(0, Math.round(o.n)); } }, at + 0.4)
        .call(() => fd.classList.remove("hot"), null, at + 0.4 + dur);
      at += 0.4 + dur + 0.1;
    });
    extras(tl, at);
    return tl;
  }
  if (!reduce) {
    const clear = () => hfd.forEach(f => { f.classList.remove("hot"); });
    fillTimeline(hfd, hcur, (tl, at) => {
      tl.to("#hatt1", { opacity: 1, duration: 0.3 }, at).fromTo("#hatt1", { y: 10 }, { y: 0, duration: 0.3 }, at)
        .to("#hatt2", { opacity: 1, duration: 0.3 }, at + 0.25).fromTo("#hatt2", { y: 10 }, { y: 0, duration: 0.3 }, at + 0.25)
        .to(hcur, { opacity: 0, duration: 0.2 }, at + 0.6)
        .fromTo("#ready", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" }, at + 0.7)
        .to({}, { duration: 3 }, at + 1.2);
    }, { repeat: -1, repeatDelay: 0.6, delay: 1.6, onRepeat: clear });
  } else {
    hfd.forEach(f => { f.textContent = f.dataset.t; }); $("#hatt1").style.opacity = 1; $("#hatt2").style.opacity = 1; $("#ready").style.opacity = 1; hcur.style.display = "none";
  }

  /* ---------- badge: slot words, barcodes, scan, pendulum physics ---------- */
  const words = [["Nursing", "teal"], ["Robotics", "blue"], ["Journalism", "rose"], ["Public policy", "slate"], ["Architecture", "yellow"], ["Music", "purple"], ["Biology", "green"], ["Hospitality", "orange"]];
  const HEX = { blue: "#8394d8", teal: "#67b3a8", green: "#86b88f", yellow: "#d9ae6e", orange: "#d58e6a", rose: "#d07f9a", purple: "#9d8fd6", slate: "#98a0b8" };
  const list = $("#slotlist");
  list.innerHTML = words.concat([words[0]]).map(w => `<li>${w[0]}</li>`).join("");
  $("#slotbar").style.background = HEX[words[0][1]];
  $$(".codes").forEach(c => { c.innerHTML = Array.from({ length: 34 }, () => "<i></i>").join(""); });
  if (!reduce) {
    const n = words.length, tl = gsap.timeline({ repeat: -1, delay: 1.8 });
    words.forEach((w, i) => {
      tl.to(list, { yPercent: -100 * (i + 1) / (n + 1), duration: 0.7, ease: "expo.inOut" }, "+=1.3")
        .to("#slotbar", { backgroundColor: HEX[words[(i + 1) % n][1]], duration: 0.7, ease: "none" }, "<");
    });
    tl.set(list, { yPercent: 0 });
    gsap.fromTo("#scan", { y: 0 }, { y: "-2.6em", duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
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
  function angleFor(e) { const p = hang.parentElement.getBoundingClientRect(); const px = p.left + p.width / 2, py = p.top + parseFloat(getComputedStyle(hang).top); return -Math.atan2(e.clientX - px, e.clientY - py); }
  hang.addEventListener("pointerdown", e => { dragging = true; moved = 0; hang.classList.add("drag"); hang.setPointerCapture(e.pointerId); lastTh = th; lastT = performance.now(); w = 0; kick(); });
  hang.addEventListener("pointermove", e => {
    if (!dragging) return;
    const a = Math.max(-1.1, Math.min(1.1, angleFor(e))), now = performance.now();
    w = Math.max(-9, Math.min(9, (a - lastTh) / Math.max(0.008, (now - lastT) / 1000)));
    moved += Math.abs(a - th); th = a; lastTh = a; lastT = now;
  });
  const end = () => { if (!dragging) return; dragging = false; hang.classList.remove("drag"); if (moved < 0.04) { badge.classList.toggle("flip"); w += 1.6; } kick(); };
  hang.addEventListener("pointerup", end); hang.addEventListener("pointercancel", end);
  hang.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); badge.classList.toggle("flip"); w += 2; kick(); } });
  hang.tabIndex = 0; hang.setAttribute("role", "button"); hang.setAttribute("aria-label", "Name badge. Press to flip it.");
  $(".hero").addEventListener("pointermove", e => { if (dragging || reduce) return; w += (e.movementX || 0) * 0.0035; if (Math.abs(w) > 0.02) kick(); });
  if (!reduce) gsap.from(hang, { y: -420, duration: 1.4, delay: 0.7, ease: "bounce.out", onComplete: () => { hang.style.transform = ""; w = 2.4; kick(); } });

  /* ---------- ribbons ---------- */
  function ribbon(el, items, dir, speed) {
    const star = '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M50 0l11 33 34-8-24 26 24 26-34-8-11 33-11-33-34 8 24-26L5 25l34 8z"/></svg>';
    const one = items.map(t => `<span>${t}${star}</span>`).join(""); el.innerHTML = one + one;
    if (reduce) return null;
    return gsap.fromTo(el, { xPercent: dir > 0 ? -50 : 0 }, { xPercent: dir > 0 ? 0 : -50, duration: speed, ease: "none", repeat: -1 });
  }
  const names = CATS.map(c => c.name);
  const t1 = ribbon($("#r1"), names.slice(0, 14), -1, 40), t2 = ribbon($("#r2"), names.slice(14), 1, 46);
  if (!reduce) ScrollTrigger.create({ trigger: ".ribbons", start: "top bottom", end: "bottom top", onUpdate: s => { const v = Math.min(6, 1 + Math.abs(s.getVelocity()) / 350); gsap.to([t1, t2], { timeScale: v, duration: 0.25, overwrite: true }); gsap.to([t1, t2], { timeScale: 1, duration: 1.1, delay: 0.25, overwrite: "auto" }); } });

  /* ---------- the before: forty forms collapse into one profile ---------- */
  (function pain() {
    const stage = $("#pstage"), head = $(".pain-head"), count = $(".pain-count");
    const employers = ["Northwind Health", "Atlas Aerospace", "Civic Forward", "Greenfield Energy", "Brightpath Schools", "Meridian Media", "Studio Kite", "Pioneer Biosciences", "Summit Consulting", "Open Hands", "Keystone Architects", "Evergreen Marketing"];
    const row = (k, v, cls) => `<i>${k}<em>${v}</em></i>`;
    stage.innerHTML = employers.map(n => `<div class="pc"><b>${n}</b>${row("Name", "Jordan Sample")}${row("School", "State University")}${row("GPA", "3.6")}${row("Work authorization", "Authorized")}</div>`).join("")
      + `<div class="pc profile"><span class="tag">Filled once</span><b>Your Lanyard profile</b>${row("Name", "Jordan Sample")}${row("School", "State University")}${row("GPA", "3.6")}${row("Work authorization", "Authorized")}</div>`;
    // second copy line and label, stacked so they can cross-fade
    const p1 = $("#ptext"), px = document.createElement("div"); px.className = "px"; p1.replaceWith(px); px.appendChild(p1);
    const p2 = document.createElement("p"); p2.textContent = "Lanyard keeps one profile and fills every form from it. You type it once, then review."; px.appendChild(p2);
    const l1 = $("#plbl"), lx = document.createElement("div"); lx.className = "lblx"; l1.replaceWith(lx); lx.appendChild(l1);
    const l2 = document.createElement("div"); l2.className = "lbl"; l2.textContent = "time you type it with Lanyard"; lx.appendChild(l2);
    const num = $("#pnum"), cards = $$(".pc:not(.profile)", stage), prof = $(".pc.profile", stage);
    if (reduce) { num.textContent = "1"; count.classList.add("ok"); p1.style.display = "none"; l1.style.display = "none"; return; }
    gsap.set(p2, { opacity: 0 }); gsap.set(l2, { opacity: 0 }); gsap.set(prof, { opacity: 0 });
    const xs = [-.33, .3, -.06, .36, -.38, .1, -.2, .32, -.1, .2, -.3, .02], ys = [-.3, -.26, -.12, 0, .13, .22, .3, -.33, .34, .31, .02, -.18], rs = [-7, 5, -3, 8, -6, 4, -9, 6, -4, 9, -5, 3];
    const v = { n: 0 }, paint = () => { num.textContent = Math.round(v.n); };
    const tl = gsap.timeline({ defaults: { ease: "none" }, onUpdate() { count.classList.toggle("ok", this.time() > 3.3); }, scrollTrigger: { trigger: "#painwrap", start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true } });
    tl.fromTo(cards, { y: () => -stage.clientHeight, opacity: 0, rotation: -24, scale: 0.9 }, { x: i => xs[i] * stage.clientWidth * 0.75, y: i => ys[i] * stage.clientHeight * 0.62, rotation: i => rs[i], opacity: 1, scale: 1, duration: 0.7, ease: "power2.out", stagger: 0.14 }, 0)
      .to(v, { n: 40, duration: 2.3, onUpdate: paint }, 0)
      .to({}, { duration: 0.5 }, 2.3)
      .to([p1, l1], { opacity: 0, duration: 0.3 }, 2.8).to([p2, l2], { opacity: 1, duration: 0.3 }, 3.0)
      .to(cards, { x: 0, y: 0, rotation: 0, scale: 0.5, opacity: 0, duration: 0.8, ease: "power3.inOut", stagger: 0.04 }, 2.8)
      .to(v, { n: 1, duration: 0.9, onUpdate: paint }, 2.9)
      .fromTo(prof, { scale: 0.55, opacity: 0 }, { scale: 1.12, opacity: 1, duration: 0.8, ease: "back.out(1.5)" }, 3.4)
      .to(prof.querySelector(".tag"), { opacity: 1, duration: 0.3 }, 4.0)
      .to({}, { duration: 1 }, 4.2);
  })();

  /* ---------- pinned demo, scrubbed ---------- */
  const steps = $$("#steps li"), setStep = i => steps.forEach((li, k) => li.classList.toggle("on", k === i)), fds = $$("#form .fd");
  if (!reduce) {
    fds.forEach(f => f.textContent = "");
    const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: "#demo", start: "top top", end: "+=360%", pin: "#demo", scrub: 0.5, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: self => { const t = self.progress * 10; setStep(t < 1.6 ? 0 : t < 3 ? 1 : t < 7.1 ? 2 : 3); } } });
    tl.fromTo("#sa .mini span", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.2, duration: 0.6 }, 0)
      .fromTo("#sa .mrow", { x: 70, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.35, duration: 0.8 }, 1.1)
      .to("#sa .mrow:first-of-type", { backgroundColor: "rgba(233,184,114,0.18)", borderColor: "#e9b872", duration: 0.4 }, 2.6)
      .to("#sa", { opacity: 0, duration: 0.5 }, 3.2).to("#sb", { opacity: 1, duration: 0.5 }, 3.2)
      .to("#url", { duration: 0.01, onStart() { this.targets()[0].textContent = "northwindhealth.example/apply"; }, onReverseComplete() { this.targets()[0].textContent = "lanyard.example/matches"; } }, 3.3);
    let at = 3.9; const cur = $("#cur"), pos = el => ({ x: () => el.offsetLeft + 30, y: () => el.offsetTop + el.offsetHeight / 2 - 6 });
    gsap.set(cur, { x: 20, y: 20, opacity: 0 }); tl.to(cur, { opacity: 1, duration: 0.2 }, 3.7);
    fds.forEach((fd, i) => {
      const text = fd.dataset.t, dur = i === 4 ? 1.6 : 0.6, o = { n: 0 };
      tl.to(cur, { ...pos(fd), duration: 0.35, ease: "power2.inOut" }, at)
        .to(fd, { duration: 0.01, onStart() { fd.classList.add("hot"); }, onReverseComplete() { fd.classList.remove("hot"); } }, at + 0.35)
        .to(o, { n: text.length, duration: dur, onUpdate() { fd.textContent = text.slice(0, Math.round(o.n)); } }, at + 0.35);
      at += 0.35 + dur + 0.08;
    });
    tl.to("#att1", { opacity: 1, duration: 0.25 }, at).to("#att2", { opacity: 1, duration: 0.25 }, at + 0.3); at += 0.8;
    tl.to(cur, { opacity: 0, duration: 0.2 }, at).fromTo("#rv", { y: 200, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, at + 0.1);
    $$("#chk .bx").forEach((bx, i) => { tl.to(bx.firstElementChild, { opacity: 1, duration: 0.15 }, at + 0.9 + i * 0.35).to(bx, { backgroundColor: "rgba(141,189,152,.2)", borderColor: "#8dbd98", duration: 0.15 }, at + 0.9 + i * 0.35); });
    tl.to("#appr", { scale: 0.94, duration: 0.1 }, at + 2.5).to("#appr", { scale: 1, backgroundColor: "#8dbd98", duration: 0.1 }, at + 2.6)
      .fromTo("#stampx", { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, at + 2.7).to({}, { duration: 0.8 }, at + 3);
  } else {
    fds.forEach(f => { f.textContent = f.dataset.t; }); $("#sa").style.display = "none"; $("#sb").style.opacity = 1;
    ["#att1", "#att2", "#rv", "#stampx"].forEach(s => $(s).style.opacity = 1); $$("#chk .bx svg").forEach(s => s.style.opacity = 1); $("#url").textContent = "northwindhealth.example/apply"; setStep(3);
  }

  /* ---------- dashboard (interactive mock) ---------- */
  (function dash() {
    const fig = { a: 4, i: 1, w: 3 }, el = { a: $("#fApplied"), i: $("#fInt"), w: $("#fWait") };
    const show = () => { el.a.textContent = Math.round(fig.a); el.i.textContent = Math.round(fig.i); el.w.textContent = Math.round(fig.w); };
    $$("#queue .q2").forEach(row => {
      const btn = $("button", row), pill = $(".pill", row);
      btn.addEventListener("click", () => {
        if (row.classList.contains("done")) return;
        row.classList.add("done"); btn.style.display = "none"; pill.textContent = "Approved"; pill.classList.add("ok");
        const to = { a: fig.a + 1, w: Math.max(0, fig.w - 1) };
        if (reduce) { Object.assign(fig, to); show(); } else gsap.to(fig, { ...to, duration: 0.6, ease: "power2.out", onUpdate: show });
      });
    });
    if (reduce) return;
    fig.a = fig.i = fig.w = 0; show();
    gsap.to(fig, { a: 4, i: 1, w: 3, duration: 1.4, ease: "power2.out", onUpdate: show, scrollTrigger: { trigger: "#laptop", start: "top 70%", once: true } });
    gsap.from("#queue .q2, .mt", { x: -40, opacity: 0, stagger: 0.12, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: "#laptop", start: "top 70%" } });
    gsap.fromTo(".lid", { rotateX: 24, transformPerspective: 1600, transformOrigin: "50% 100%", y: 40 }, { rotateX: 0, y: 0, ease: "none", scrollTrigger: { trigger: "#laptop", start: "top 95%", end: "top 40%", scrub: true } });
  })();

  /* ---------- example week ---------- */
  if (!reduce) {
    gsap.to("#rail", { "--p": 1, ease: "none", scrollTrigger: { trigger: "#days", start: "top 75%", end: "bottom 60%", scrub: true } });
    gsap.from(".day", { y: 50, opacity: 0, stagger: 0.18, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: "#days", start: "top 85%" } });
    gsap.from(".eg", { x: -30, opacity: 0, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: ".eg", start: "top 92%" } });
  } else $("#rail").style.setProperty("--p", 1);

  /* ---------- tiles ---------- */
  const tiles = $("#tiles"), picked = new Set(["healthcare-clinical", "design-creative-arts"]);
  tiles.innerHTML = CATS.map((c, i) => {
    const cls = i % 9 === 0 ? "big" : i % 4 === 1 ? "wide" : "";
    return `<button type="button" class="tile ${cls}" data-hue="${c.hue}" data-id="${c.id}" aria-pressed="${picked.has(c.id)}"><span class="ck"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7.5l3.2 3L12 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="t">${c.name}</span><span class="s">${c.subs.slice(0, 3).map(s => s.name).join(", ")}</span></button>`;
  }).join("");
  function paintPicked(animate) {
    const ns = CATS.filter(c => picked.has(c.id)).map(c => c.name), el = $("#picked");
    el.textContent = ns.length ? `You picked ${ns.length}: ${ns.join(", ")}.` : "Pick a field. Any field.";
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

  /* ---------- time math ---------- */
  const nIn = $("#n"), counter = { h: 0, l: 0, s: 0 };
  function calc() {
    const n = +nIn.value, hand = n * 25 / 60, me = n * 4 / 60, save = hand - me, maxH = 150 * 25 / 60;
    $("#nout").textContent = n;
    const apply = () => { $("#hh").textContent = counter.h.toFixed(1); $("#ll").textContent = counter.l.toFixed(1); $("#saved").textContent = Math.round(counter.s); };
    if (reduce) { counter.h = hand; counter.l = me; counter.s = save; apply(); $("#b1").style.width = hand / maxH * 100 + "%"; $("#b2").style.width = Math.max(2, me / maxH * 100) + "%"; return; }
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

  /* ---------- pricing tilt ---------- */
  if (!reduce) {
    gsap.from(".tk", { y: 120, rotate: () => gsap.utils.random(-6, 6), opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.14, scrollTrigger: { trigger: ".tickets", start: "top 85%" } });
    $$(".tk").forEach(c => {
      const rx = gsap.quickTo(c, "rotationX", { duration: 0.4, ease: "power3" }), ry = gsap.quickTo(c, "rotationY", { duration: 0.4, ease: "power3" });
      c.addEventListener("pointermove", e => { const r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 12); rx(-((e.clientY - r.top) / r.height - 0.5) * 12); });
      c.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
  }

  /* ---------- sign-up + confetti (nothing is sent anywhere) ---------- */
  $("#joinform").addEventListener("submit", e => {
    e.preventDefault(); $("#joinform").style.display = "none"; const t = $("#thanks"); t.style.display = "block";
    if (reduce) return;
    gsap.from(t, { scale: 0.6, opacity: 0, duration: 0.8, ease: "elastic.out(1,.5)" });
    const cols = ["#e9b872", "#e0896a", "#8dbd98", "#9d8fd6", "#8394d8"], box = $("#confetti");
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
