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
| `app.html` | Dashboard: "Needs you" queue, matches filtered to the student's fields, paste-a-link, tracker columns, usage meter |
| `review.html` | Approval screen: every filled answer, editable cover letter, checklist, approve or decline |

## Design system (`css/tokens.css`)
Three layers: primitive (raw values), semantic (`--bg`, `--text`, `--primary`, ...), component (`--btn-*`, `--chip-*`, ...). Dark is the default, matching the marketing page; light applies only with `data-theme="light"`. Both are defined at the semantic layer. Category colors come from 8 hues; chips derive their tints from the hue with `color-mix`, so adding a category needs no new CSS.

- Type: Bricolage Grotesque (headings) and Public Sans (body), loaded from Google Fonts.
- Signature element: the field wall. Chips fill with their hue when selected; a second click marks a top choice.
- Amber (`#e9b872`, shared with the marketing page) is the accent: buttons, deadlines, and warnings the student must check.

## Draft items to settle
- "Lanyard" is a placeholder name.
- Pricing ($0, $49 season pass, $19 per month) is a placeholder.
- FAQ and "never does" copy describe intended behavior. Re-check each claim against what is actually built before launch (data handling, site coverage, employer rules).
- The field-specific extras on step 4 are examples, not a final list.
- Screenshot, resume upload, and the browser extension handoff are mocked.

## Mock mode (no server or database)
Add `?mock=1` to any page's address to run the whole app in the browser: sign up, the questionnaire, picking internships, review and approval. `js/mock-api.js` answers the app's API calls and keeps everything in localStorage, laid out as the Supabase tables will be (`users`, `profiles`, `user_interests`, `applications`, `approvals`). "Your profile" > "How it's stored" shows those rows. An amber strip marks every page while it's on; `?mock=0` turns it off.

```bash
cd frontend && python3 -m http.server 8790
# open http://localhost:8790/site/index.html?mock=1
```
Mock postings are made up. "Preparing" an application builds its answers from the questionnaire after a short delay, and approving marks it submitted. Passwords are not checked or stored.
