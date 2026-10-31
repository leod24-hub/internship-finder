# Lanyard showcase (animated mock)

A single-page marketing mock for the product. Static files, no build step.

```bash
cd frontend && python3 -m http.server 8766
# open http://localhost:8766/showcase/index.html
```

It reads the field list from `../site/js/data.js`, so keep that file in place. GSAP and ScrollTrigger load from cdnjs, so the page needs internet.

What moves: headline word reveals and scroll-driven width, a swingable and flippable badge (pointer physics), a field slot that cycles, scroll-speed marquee ribbons, flood-on-hover field tiles, a pinned scroll-scrubbed demo (form fills, review ticks, approve stamp), a time-saved calculator, strike-drawn "will not" list, tilting price tickets, a confetti sign-up, a cursor follower and magnetic buttons.

Accessibility: all motion is skipped under `prefers-reduced-motion`, with the demo shown in its finished state. Keyboard focus is visible, and the badge flips with Enter or Space.

Draft items: the "Lanyard" name, the prices, and the time-saved assumptions (25 minutes by hand, 4 to review) are placeholders. The sign-up form sends nothing.
