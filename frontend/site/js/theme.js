// Light is the default on every page. Dark is a choice the visitor makes with the switch in the top bar,
// remembered here and shared with the landing page (same key). The system setting is never used.
// Loaded in <head> so the saved choice is applied before the page paints.
(function () {
  const KEY = "lanyard.theme", root = document.documentElement;
  const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const mark = t => document.querySelectorAll("[data-theme-toggle]").forEach(b => b.setAttribute("aria-checked", t === "dark"));

  root.dataset.theme = saved() === "dark" ? "dark" : "light";

  window.setTheme = function (t) {
    root.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch (e) {}
    mark(t);
  };
  window.toggleTheme = () => window.setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  window.syncThemeToggle = () => mark(root.dataset.theme);

  // Another tab or page changed it: follow along.
  addEventListener("storage", e => {
    if (e.key !== KEY) return;
    root.dataset.theme = e.newValue === "dark" ? "dark" : "light";
    mark(root.dataset.theme);
  });
})();
