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
Three layers: primitive (raw values), semantic (`--bg`, `--text`, `--primary`, ...), component (`--btn-*`, `--chip-*`, ...). Light and dark are both defined at the semantic layer. Category colors come from 8 hues; chips derive their tints from the hue with `color-mix`, so adding a category needs no new CSS.

- Type: Bricolage Grotesque (headings) and Public Sans (body), loaded from Google Fonts.
- Signature element: the field wall. Chips fill with their hue when selected; a second click marks a top choice.
- Yellow is reserved for deadlines, the badge, and warnings the student must check.

## Draft items to settle
- "Lanyard" is a placeholder name.
- Pricing ($0, $49 season pass, $19 per month) is a placeholder.
- FAQ and "never does" copy describe intended behavior. Re-check each claim against what is actually built before launch (data handling, site coverage, employer rules).
- The field-specific extras on step 4 are examples, not a final list.
- Screenshot, resume upload, and the browser extension handoff are mocked.
