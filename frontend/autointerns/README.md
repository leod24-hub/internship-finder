# AutoInterns landing page

One static file (`index.html`), no build step. Positioned for finance, consulting and business students.

```bash
cd frontend && python3 -m http.server 8770
# open http://localhost:8770/autointerns/index.html
```

Signature element: the lucite deal tombstone in the hero. Visitors type their name and pick a track, and it updates live.

## Before launch
- **Waitlist.** Set `WAITLIST_ENDPOINT` near the bottom of `index.html` (Formspree, Supabase, etc.). Until then the form shows "Sign-ups aren't connected yet" and sends nothing.
- **Prices** ($0 / $179 season / $449 with human review) and the parent progress email are proposals, not settled.
- **Claims to re-check against what's built:** the list of supported portals, "about 20 minutes" for the profile, opening-date alerts, human review, encryption, and export/delete.
- The parser examples in the table are illustrative, not quotes from a specific employer's portal.
