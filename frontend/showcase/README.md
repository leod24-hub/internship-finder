# Lanyard marketing page (animated)

The page that sets the site's vibe. Static files, no build step.

```bash
cd frontend && python3 -m http.server 8766
# open http://localhost:8766/showcase/index.html
```

It reads the field list from `../site/js/data.js`, so keep that file in place. GSAP and ScrollTrigger load from cdnjs, so the page needs internet.

## Sections, in order
Hero (pain-first headline, a form that fills itself on a loop, a swingable name badge) · field ribbons · "Same questions. Forty portals." (forty forms collapse into one profile as you scroll) · pinned scroll demo · the dashboard in a laptop frame (the one contrast section, with working Review buttons) · an example student's week · field tiles · time calculator · "Things Lanyard will not do" · pricing tickets · early-access sign-up.

## Features
- **Light and dark.** Loads in light. The switch in the nav changes theme with a circular reveal and remembers the choice. Tokens live in `css/style.css` (dark) and `css/theme.css` (light overrides).
- **Chat assistant** (bottom right). `js/chat.js`. It is a **preview**: it answers from a fixed FAQ (`KB` in that file), not a live AI, and says so in its header. Making it real needs a server that holds the API key and a call from `answer()`.
- **Reduced motion.** All animation is skipped for people who ask for it, and the demos show their finished state.

## Draft items
The name "Lanyard", the prices, the time-saved assumptions (25 minutes by hand, 4 to review), and every example (the dashboard, the "Maya" week) are placeholders and made up. The sign-up form sends nothing. See `CLAUDE.md` in the repo root for the honesty rules.

## Not yet verified
The phone layout of the newest sections and the reduced-motion mode have not been tested in a browser.
