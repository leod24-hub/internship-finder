# Project briefing for Claude Code

Read this first. It tells you what this project is, who does what, what the site should feel like, and what you must not claim.

## What this is
A pre-launch product that fills out internship applications for college students, then waits for the student to review and approve before anything is sent. Working names: **Lanyard** (the app and the animated marketing page) and **AutoInterns** (the backend's internal name and a separate landing page). **The name is not decided.** Write copy so the name is easy to swap, and ask before treating either as final.

One-line pitch used on the site: *"Stop retyping your GPA into 40 different forms. Lanyard fills out internship applications for you, in any major, then waits for your OK before anything is sent."*

## Who does what
- **Repo owner (GitHub: leod24-hub)** is in charge of the **front end and back end**: everything in `backend/` and the app code in `frontend/site/`.
- **JP** is in charge of **marketing**: positioning, copy, content, launch, student research, and growth.
- Ownership of the company is 50/50.

If you are working for JP, stay in the marketing lane. You may propose and edit copy, write content, and run research. **Do not change `backend/` or app logic without asking the owner.** Work on a branch named `jp/<topic>` and open a pull request, so the owner can review.

## Status, honestly
There are no customers, no launch date, no real testimonials, and no real user numbers. Everything on the marketing pages that looks like data is **made up for illustration**. The product exists in pieces:

| Piece | Where | State |
|---|---|---|
| Agent prompts, ATS playbook, browser helpers | `backend/agent-prompts`, `backend/playbooks`, `backend/browser-automation` | Worked on one student's real search. Needs a rewrite for multi-user use. |
| Database schema and category list | `backend/schema/` | Designed. Includes row-level security and 29 field categories. |
| Server and worker | `backend/server/` | In progress, per the owner. Express, Postgres, a Playwright worker, a mock job site, Claude API for drafting. Ask the owner what is working. |
| App UI draft | `frontend/site/` | Clickable draft with sample data. Not the marketing page. |
| **Marketing page (Lanyard)** | `frontend/showcase/` | The animated page. **This is the vibe reference.** |
| Alternate landing page (AutoInterns) | `frontend/autointerns/` | Aimed at finance, consulting and business students. Different positioning from the Lanyard page. |

**Open decision for the owner and JP:** one product for *every major* (Lanyard page) or a sharper wedge for *finance, consulting and business students* (AutoInterns page). Do not merge or pick between them yourself.

## The vibe in short
Full guide: `docs/BRAND_AND_VIBE.md`. The short version:
- **Pain first.** Open on the annoying thing (retyping the same answers into 40 portals), then show relief.
- **Show the product, don't describe it.** A form that fills itself beats a feature list.
- **Familiar, warm, inviting.** Light by default with a dark mode. One soft amber accent, like lamplight. Colors carry meaning: amber means a deadline or waiting on you, green means approved, ember means repeated work.
- **Student to student.** Plain, specific, a little wry. Short sentences. Sentence case.
- **Motion with a purpose.** A swingable name badge, a form that types itself, forty forms collapsing into one profile.
- **Trust is a feature.** The page says what Lanyard will *not* do.

## Honesty rules (these are not optional)
1. **No invented testimonials, student quotes, logos, user counts, statistics, or press.** If it needs evidence, mark it as an example or leave a clearly labeled placeholder.
2. **Never promise interviews, offers, or results.**
3. **Do not claim a feature exists unless the owner confirms it is built.** Copy describes intent ("designed to", "the plan is") until then.
4. **Keep the approval-first promise.** Nothing is submitted without the student's approval. Lanyard does not create accounts, type passwords, enter verification codes, or get around CAPTCHAs or bot checks. Do not write copy or content that suggests otherwise.
5. **Be straight about rules.** Some sites (LinkedIn is one) prohibit automation, and some employers restrict AI tools. Marketing must not encourage students to break either.
6. **Mark examples as examples.** The "Maya" week and the dashboard numbers on the Lanyard page are illustrative and labeled that way. Keep the labels.
7. Pricing ($0 / $49 season pass / $19 per month on the Lanyard page) is a **draft**.

## Running things
```bash
# marketing pages and app draft (static, no build)
cd frontend && python3 -m http.server 8766
# Lanyard marketing page:   http://localhost:8766/showcase/index.html
# App UI draft:             http://localhost:8766/site/index.html
# AutoInterns landing page: http://localhost:8766/autointerns/index.html
```
The Lanyard page loads GSAP from a CDN, so it needs internet. The sign-up form and the chat assistant on it are **mocks**: nothing is sent anywhere, and the assistant answers from a fixed FAQ (`frontend/showcase/js/chat.js`), not a live AI.

## Where marketing copy lives
- Lanyard page copy: `frontend/showcase/index.html`
- Chat assistant answers: `frontend/showcase/js/chat.js` (the `KB` list)
- AutoInterns page copy: `frontend/autointerns/index.html`
- Brand, voice, and a starter marketing plan: `docs/BRAND_AND_VIBE.md`

## Ask the owner first
Renaming the product, changing prices, adding any claim about security or data handling, connecting a real sign-up form or analytics, anything that sends data outside the browser, and any change under `backend/`.
