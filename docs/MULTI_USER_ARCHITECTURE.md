# Multi-user product plan

How to turn this single-student setup into a paid service for college students in any field, at any school.

## Who it's for
Students of every major and class year who want internships, co-ops, research programs, fellowships and similar opportunities. Each student picks the categories they care about (see `backend/schema/migrations/002_taxonomy_and_rls.sql` and `seed_categories.sql`) and the product matches postings to them.
- **Earlier years (freshman/sophomore):** early-insight and exploratory programs, research and service programs. Volume is low and deadlines come early. The value is *not missing anything*.
- **Later years (junior/senior):** the main internship cycle. Volume is higher. The value is *throughput without sloppy applications*.

Store `class_year` on the profile and `class_years` on each posting, and filter discovery by class year, categories, location, pay and term. Classify each posting once (shared) and match per student with plain SQL filters.

## Components
| Component | Today (this repo) | Hosted version |
|---|---|---|
| Accounts | One person | Email/Google sign-in. One `users` row per student |
| Profile | `templates/student-profile.template.md` | `profiles` table, filled by the onboarding chat (prompt A) |
| Job discovery | Agent searches by hand | Scheduled worker ingests boards and company sites into shared `postings`, de-duplicated, then matched per student |
| Cover letters | `backend/cover-letter/cover_letter.py` | Same script as a job. Output stored per student in object storage |
| Form filling | Claude in Chrome + `browser-helpers.js` | A browser worker (Playwright or a hosted browser) with one isolated browser profile per student, loading `browser-helpers.js` |
| Approval | Chat "yes" | `approvals` table plus a review screen showing every answer, the cover letter and a screenshot. Nothing submits without it |
| Tracker | `frontend/dashboard.html` | Same page reading from the API instead of `claude.use("db")` (see the "Standalone mode" block) |
| Daily scan | `backend/scheduled-tasks/daily-inbox-scan/SKILL.md` | Per-student cron in their timezone, Gmail/Outlook read-only OAuth, writes to their rows only |
| Data | JSON files | Postgres, `backend/schema/schema.sql`, with row-level security on every student table |

## Tenancy rules
1. Every student-owned row has `user_id`, and row-level security enforces it. The agent's DB connection sets `app.user_id` before each run.
2. Each agent run is scoped to one student: their profile, their tracker, their inbox, their browser profile. Never batch two students into one LLM context.
3. Placeholders in the prompts (`{{STUDENT_NAME}}`, `{{SCHOOL}}`, ...) are filled from that student's profile at run time. `config/tenant.example.json` lists them.
4. Encrypt phone, address, EEO answers and OAuth tokens at rest (`*_enc` columns). EEO is collected only on opt-in and defaults to "decline".
5. Students can export and delete all their data.

## Pricing sketch
| Plan | Price idea | Limits |
|---|---|---|
| Free | $0 | Tracker + daily inbox scan + 3 assisted applications/month |
| Pro | ~$19/month | 40 applications/month, tailored cover letters, deadline alerts |
| Premium (recruiting season) | ~$39/month | Unlimited applications, networking drafts, priority discovery |

Meter with `usage_events`, bill through Stripe, and enforce limits before an agent run starts. Seasonal or semester pricing fits the recruiting calendar better than annual pricing.

## Human-in-the-loop steps (never automate)
- Creating portal accounts, entering passwords and verification codes, solving CAPTCHAs
- The final submit on every application, and every outgoing message
- Anything on LinkedIn beyond reading public job pages (its terms prohibit automation)

## Build order
1. Auth + `profiles` + onboarding chat, writing to the DB
2. Dashboard on the API, with the tracker seeded from `sample-data/`
3. Daily inbox scan per student (the cheapest feature with clear value)
4. Discovery service + eligibility matching by class year, GPA and location
5. Cover-letter generation + approval screen
6. Browser worker for form filling, starting with Workday and Greenhouse
7. Billing and usage limits
