# Phase 0 notes

Done:
- `git init` (nothing committed yet; `.env` and student data are git-ignored).
- Finance-specific wording removed from the dashboard, setup guide, prompts, profile template, example letter and tenant example.
- `sample-data/sample-jobs.json` is now 16 fictional postings across many fields. The original finance and real-estate set is kept as `legacy-finance-jobs.json` (reference only).
- `backend/schema/migrations/002_taxonomy_and_rls.sql`: category taxonomy tables, posting and profile fields for matching, Supabase RLS rewrite (`auth.uid()` plus `with check`), server-only writes for `plan`, and billing tables. Not yet run against a database.
- `backend/schema/seed_categories.sql`: 29 top-level categories and 117 subcategories.

Still open (verify before building on them):
- `backend/cover-letter/cover_letter.py` uses PyMuPDF, which is AGPL-licensed (a paid commercial license exists). Check this before shipping a closed commercial product, or switch PDF libraries.
- The ATS playbook's LinkedIn guest-API curl examples are for manual research only. Don't build product discovery on them.
- Reading Gmail needs a Google "restricted scope" review for public apps. Skip inbox scanning at launch.
- `backend/agent-prompts/` still assume Claude Code, Artifacts and the Claude in Chrome extension. They need a server-side rewrite.
