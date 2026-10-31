# Lanyard front-end draft

Static HTML, CSS and JS. No build step, no backend. Data is fictional and lives in `js/data.js`; your choices are kept in the browser's localStorage.

Run it:
```bash
cd frontend/site && python3 -m http.server 8765
# open http://localhost:8765/index.html
```

| Page | What it shows |
|---|---|
| `index.html` | Landing page: approval-first demo, the interactive field wall, how it works, draft pricing, FAQ |
| `onboarding.html` | 4-step setup: school and major, fields (29 categories plus subcategories), preferences, resume and links with field-specific extras |
| `questionnaire.html` | 8-step intake for the application agent: contact and school, work rules (authorization, start dates, relocation), targets with ranked fields, experience, the student's own wording for open questions, demographic choices, and a ready check. Downloads a profile `.md` (same layout as `templates/student-profile.template.md`) and a `.json` |
| `app.html` | Dashboard: "Needs you" queue, matches filtered to the student's fields, paste-a-link, tracker columns, usage meter |
| `review.html` | Approval screen: every filled answer, editable cover letter, checklist, approve or decline |

## Theme
Every page uses the landing page's look (warm paper in light, midnight in dark, one amber accent, Bricolage Grotesque and Public Sans). Light is always the default. Dark is never chosen from the computer's setting: it only turns on from the switch in the top bar, and the choice is saved under `lanyard.theme`, the same key the landing page uses, so it carries across pages. `js/theme.js` loads in each page's `<head>`. The same switch and palette are on `dashboard.html`, `setup-guide.html` and `autointerns/index.html`.

## Design system (`css/tokens.css`)
Three layers: primitive (raw values), semantic (`--bg`, `--text`, `--primary`, ...), component (`--btn-*`, `--chip-*`, ...). Light and dark are both defined at the semantic layer. Category colors come from 8 hues; chips derive their tints from the hue with `color-mix`, so adding a category needs no new CSS.

- Type: Bricolage Grotesque (headings) and Public Sans (body), loaded from Google Fonts.
- Signature element: the field wall. Chips fill with their hue when selected; a second click marks a top choice.
- Amber is reserved for actions, deadlines, the badge, and warnings the student must check. Green means approved or done.

## Questionnaire notes (`questionnaire.html`)
- Browser only: answers live in localStorage under `autointerns.questionnaire.v1`. It makes no API calls. Saving to the server is a backend task for the owner.
- JSON keys reuse the names `PUT /profile` already takes (`name`, `preferredName`, `phone`, `address`, `school`, `major`, `minor`, `degree`, `classYear`, `grad`, `gpa`, `auth`, `li`, `site`, `types`, `modes`, `where`, `term`, `pay`, `eeoDecline`). Everything else is new and has no column yet: `email`, `college`, `gpaMajor`, `testScores`/`sat`/`act`, `officeYears`, `coursework`, `honors`, `citizenship`, `clearance`, `adult`, `background`, `startDate`, `endDate`, `hours`, `license`, `relocate`, `commute`, `secondOffice`, `relatives`, `heard`, `avoidWhere`, `payFloor`, `fields` (ranked), `tiers`, `exclusions`, `pace`, `accounts`, `experiences`, `skills`, `languages`, `certs`, the story answers, `tone`, `length`, `neverSay`, `attestation`, and the per-question `eeo*` answers.
- Required answers are listed in `REQUIRED` in the page script. The last step shows what is still missing.
- Link to it from the app nav (`renderBar` in `js/common.js`) or from the end of onboarding once the owner decides where it belongs.

## Draft items to settle
- "Lanyard" is a placeholder name.
- Pricing ($0, $49 season pass, $19 per month) is a placeholder.
- FAQ and "never does" copy describe intended behavior. Re-check each claim against what is actually built before launch (data handling, site coverage, employer rules).
- The field-specific extras on step 4 are examples, not a final list.
- Screenshot, resume upload, and the browser extension handoff are mocked.
