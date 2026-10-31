# Internship Auto-Apply Kit

> **Collaborators and Claude Code: start with [CLAUDE.md](CLAUDE.md)** for the project briefing, roles, and honesty rules, then [docs/BRAND_AND_VIBE.md](docs/BRAND_AND_VIBE.md). The animated marketing page that sets the vibe is in `frontend/showcase/`.

A working, human-in-the-loop internship application assistant for college students (aimed at sophomores and juniors), packaged so it can be built into a multi-user, paid product.
Everything here was built and tested on a real Summer 2027 search: about 30 submitted applications across Workday, iCIMS, SmartRecruiters, SuccessFactors, UKG, Oracle, ADP, Eightfold, Greenhouse and LinkedIn Easy Apply. All personal data has been removed.

## What it does today
1. **Onboard.** Reads the student's resume, interviews them, and writes a structured profile (`templates/student-profile.template.md`).
2. **Find.** Searches LinkedIn, Handshake and company career sites, filters by eligibility (GPA cutoffs, grad year, location), and logs each role as `found`.
3. **Draft.** Writes a tailored one-page cover letter PDF per role (`backend/cover-letter/`).
4. **Fill.** Completes the application in a real browser, fixes resume-parser damage, and answers screening questions from the profile (`backend/browser-automation/`, `backend/playbooks/`).
5. **Approve.** Stops at the final submit and asks the student to approve each application. Status becomes `awaiting`, then `submitted`.
6. **Track.** A live dashboard shows the pipeline, a "Needs you" queue with one-line next actions, applied cards, and a full table (`frontend/dashboard.html`).
7. **Monitor.** Every morning, scans the inbox and candidate portals for confirmations, assessments, interviews, rejections and offers, then updates the tracker (`backend/scheduled-tasks/`).

## Layout
| Path | Layer | What it is |
|---|---|---|
| `frontend/dashboard.html` | Front end | Pipeline dashboard (single file, no build). Runs inside Claude Artifacts with a live DB, or standalone with sample data and localStorage. |
| `frontend/setup-guide.html` | Front end | Step-by-step onboarding page (connect Gmail and Chrome, paste prompts A–E). A starting point for a landing or onboarding flow. |
| `backend/agent-prompts/` | Agent | A = onboarding + working rules · C = workflow lessons · D = daily scan · E = tool allowlist. `ALL_PROMPTS.txt` = the original combined kit, including tracker template B. |
| `backend/scheduled-tasks/daily-inbox-scan/SKILL.md` | Agent / cron | Daily inbox + portal monitor, with `{{PLACEHOLDERS}}` per student. Cron `0 8 * * *`. |
| `backend/browser-automation/browser-helpers.js` | Automation | Workday, iCIMS (iframe, resume upload, parser-damage restore) and SmartRecruiters (shadow DOM) helpers. |
| `backend/playbooks/ats-playbook.md` | Knowledge | Per-ATS quirks plus the approval and safety contract. |
| `backend/cover-letter/` | Service | `cover_letter.py` (PyMuPDF) plus an example input. `pip install -r requirements.txt`. |
| `backend/schema/` | Data | JSON Schemas for `applications` and `outreach`. |
| `templates/student-profile.template.md` | Data | Blank student profile: every field an application asks for. |
| `sample-data/sample-jobs.json` | Data | 16 fictional demo postings across many fields, for the dashboard demo. `legacy-finance-jobs.json` holds the original 66 real finance and real-estate postings (reference only). |
| `.claude/settings.local.example.json` | Config | Claude Code permission allowlist for the browser tools. |
| `backend/schema/schema.sql` | Data | Multi-tenant Postgres schema (users, profiles, postings, applications, outreach, approvals, usage, OAuth connections) with row-level security. |
| `backend/server/` | Service | **Working backend**: API server, Postgres migrations, accounts, and the worker that fills and (after approval) submits applications. See its README to run it. |
| `config/tenant.example.json` | Config | Per-student values for the `{{PLACEHOLDERS}}` in the prompts and daily scan. |
| `users/_template/` | Data | Per-student folder layout for running a small pilot before the hosted DB exists. |
| `docs/MULTI_USER_ARCHITECTURE.md` | Docs | Product plan: sophomore vs junior use cases, components, tenancy rules, pricing, build order. |
| `.env.example`, `.gitignore` | Config | Environment variables for the hosted version; keeps student data and secrets out of git. |

## Run it locally
```bash
cd internship-finder
python3 -m http.server 8000
# open http://localhost:8000/frontend/dashboard.html   (demo mode, sample data)
```
```bash
cd backend/cover-letter && pip install -r requirements.txt && python cover_letter.py examples/example_letter.json
```
To run the full agent today: use Claude Code with the Claude in Chrome extension and a Gmail connector. Follow `frontend/setup-guide.html`.

## Turning it into a product: what's still missing
See `docs/MULTI_USER_ARCHITECTURE.md` for the full plan and `backend/schema/schema.sql` for the data model.

The current system is one person's setup. A multi-student service needs:
- **Auth and multi-tenancy.** Student accounts, with one profile, tracker and inbox per student.
- **Database and API.** Replace the dashboard's `claude.use("db")` / localStorage block (look for "Standalone mode") with your API. The schemas in `backend/schema/` map directly to tables.
- **Job discovery service.** Scheduled scraping or job-feed ingestion, deduplication, and eligibility filtering against each profile.
- **Agent runtime.** An LLM agent (e.g. the Claude API with tool use) plus a browser-automation worker (Playwright or a hosted browser) that loads `browser-helpers.js`. Each student needs their own browser session.
- **Approval UX.** The "awaiting" queue becomes a review screen with answers, cover letter and an approve button. Approval stays mandatory.
- **Inbox integration.** Gmail/Outlook OAuth (read-only scopes) for the daily scan.
- **Billing.** Plans by application volume, Stripe, and usage limits.

## Risks to plan for (from what came up in real use)
- **Platform terms.** LinkedIn's User Agreement prohibits bots and automated activity on its site, and many ATS sites use hCaptcha or bot detection. Don't automate account creation, CAPTCHAs, verification codes or LinkedIn actions. The student does those steps.
- **Employer rules.** Some employers require applicants to attest that no AI tools are used in interviews (e.g. one bank's iCIMS terms). The product should help prepare applications, not misrepresent who completed them. Keep the student as the one who reviews and submits.
- **Sensitive data.** Profiles hold PII and optional EEO and disability data. Encrypt it, collect EEO only if the student opts in, default to "decline", and never share it across students.
- **Quality over volume.** Resume parsers routinely corrupt address, GPA and education fields. Verification steps (snapshot, restore, screenshot check) are what keep applications accurate. Don't skip them to go faster.
- **Accuracy.** Cover letters and answers must come only from the student's profile and resume. Inventing anything is the fastest way to lose trust.
