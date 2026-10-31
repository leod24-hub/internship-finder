# AutoInterns backend

Node.js API server, Postgres database, and an application worker that fills out employer forms in a real browser. It also serves the front-end pages, so everything runs from one address.

## Run it locally
Needs Node 20+ and Postgres running locally (`pg_isready`).

```bash
cd backend/server
npm install
npx playwright install chromium   # the browser the worker uses
npm run migrate                   # creates autointerns_dev, applies migrations, seeds fields, majors and demo postings
npm start                         # API + pages at http://localhost:8787
npm run worker                    # in a second terminal: fills and submits applications
```

Then open http://localhost:8787/site/login.html?mode=signup.

To have Claude write cover letters and answers, create `backend/server/.env` with `ANTHROPIC_API_KEY=...` (get a key at platform.claude.com). Without it, students get a template letter and write the open questions themselves.

Settings (all optional locally, read from the environment or `.env`):

| Variable | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Claude drafting |
| `PORT`, `PUBLIC_URL` | `8787`, `http://localhost:8787` | Where the server runs |
| `DATABASE_URL` | `postgres:///autointerns_dev?host=/tmp` | Owner connection (migrations, server writes) |
| `APP_DB_USER`, `APP_DB_PASSWORD` | `autointerns_app`, `autointerns_dev` | Student-scoped role used with row-level security |
| `APP_ENCRYPTION_KEY` | dev-only value | Encrypts phone and address. Required when `NODE_ENV=production` |
| `FREE_MONTHLY_APPLICATIONS` | `3` | Free plan limit |
| `WORKER_HEADLESS` | `1` | Set `0` to watch the browser while it fills forms |
| `NODE_ENV` | none | `production` turns off the test job site and localhost links |

`npm run test:e2e` (with the server and worker running) signs up a test student, fills a test application, approves it and checks that the test job site received it.

## How an application moves
1. **Match.** `GET /api/postings/matches` returns open postings in the student's fields. Students can also paste any posting link.
2. **Prepare.** `POST /api/applications/:id/prepare` queues a `fill` job. The worker opens the employer's form, fills standard fields from the profile, sends open questions to Claude (`src/draft.js`), attaches the resume and a cover-letter PDF, takes a screenshot, and stops. Nothing is submitted.
3. **Review.** The student checks every answer on `review.html`, edits anything, and approves. Edits save to the `approvals` row.
4. **Submit.** Approval queues a `submit` job. The worker opens the form again, fills the approved answers, presses submit, and saves a screenshot of the employer's confirmation page.

The worker hands an application back to the student (`fill_state = needs_you`) when the site needs a sign-in or account, shows a CAPTCHA, changed since review, or didn't confirm the submission. Workday, iCIMS, SuccessFactors, Oracle, Handshake, LinkedIn and other sign-in portals are always handed back with the prepared cover letter (`HANDS_OFF` in `src/links.js`).

## Layout
| Path | What it is |
|---|---|
| `src/server.js` | Express app: `/api`, the front-end pages, and `/mock-ats` (test job site, off in production) |
| `src/routes/` | `account` (sign-up, login, export, delete), `profile` (profile, fields, resume, taxonomy), `postings`, `applications` |
| `src/db.js` | Two pools: the server role, and a student role that runs every query with `app.user_id` set so row-level security applies |
| `src/auth.js` | scrypt passwords, session cookies (only a hash is stored), same-origin check, login rate limit |
| `src/profile.js` | Profile read/write; phone and address encrypted with pgcrypto |
| `src/draft.js` | Claude drafting (`claude-opus-5-5`, structured output), with a template fallback |
| `worker/` | Job queue loop, form reading/filling (`forms.js`), cover-letter PDF |
| `mock-ats/` | A Greenhouse-style test employer form; demo postings link here |
| `db/` | Local auth shim, migration 003, `migrate.js`. Runs after `backend/schema/schema.sql` and `migrations/002` |
| `storage/` | Resumes, cover letters, screenshots (git-ignored) |

## Not built yet
- **Real postings.** Matches come from 16 demo postings plus links students paste. A discovery service that pulls postings from job boards is the next big piece.
- **Inbox scan.** The daily email check (`backend/scheduled-tasks/`) isn't connected to accounts yet.
- **Billing.** Plans are tracked (`users.plan`, `usage_events`, the free limit) but there's no Stripe checkout.
- **More application systems.** Filling works on single-page forms like Greenhouse, Lever, Ashby and most company sites. Multi-page portals that need sign-in are handed to the student.
- **Hosting.** Runs locally. To host it, point `DATABASE_URL` at a hosted Postgres (Supabase, Neon), skip `db/000_local_auth_shim.sql` on Supabase, set `NODE_ENV=production` and `APP_ENCRYPTION_KEY`, and run the worker on a machine that can run Chromium.

Only run the worker against real employers for students who have approved each application. Check each site's terms; some don't allow automated submissions.
