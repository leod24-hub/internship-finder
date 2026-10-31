# ATS playbook: filling internship applications

Lessons from about 30 real applications (Sept–Oct 2026) across the major applicant tracking systems.
Code for most of these is in `backend/browser-automation/browser-helpers.js`.

## Approval and safety rules (the product's core contract)
- Stop before every final submit. Show the student the company, role, key answers and cover letter, then submit only after an explicit yes, one application at a time.
- Never type passwords, verification codes or CAPTCHAs, and never create accounts for the student. Hand those steps to them.
- Some sites treat the questions-page "Submit" as the final submit (iCIMS). Treat any button that might send the application as final.
- EEO and demographic answers come only from what the student has explicitly saved in their profile. Default to "decline to answer" wherever that option exists.
- Ask per company whether the student has relatives working there. Don't carry the answer across firms.
- "Highest completed education" for a current undergrad is the high-school diploma, not the in-progress bachelor's.
- Check GPA cutoffs before filling. Many large firms require 3.2–3.5.
- Pay fields that only take numbers want the annualized posted pay (e.g. 50000), not "$24-27".
- Before asking for approval, verify every dropdown with a screenshot. Auto-picks have mis-set "authorized to work" and "gender".

## Per-system quirks
**Workday**
- Element refs go stale after each re-render. Re-find them and scroll into view before clicking or typing.
- Dropdowns: click `button[aria-haspopup=listbox]`, then click the `[role=option]`.
- "Use My Last Application" needs the same browser profile signed in to that tenant. It carries over the previous cover letter, so replace it.
- "How did you hear": campus options usually sit under Campus → University.
- Consent dropdowns (AI use, texts) can revert when you go Back or Next. Re-check them on the Review page.
- A stray "Discard application?" modal can appear. Click Continue.

**iCIMS**
- The form lives in a same-origin iframe (`#icims_content_iframe`). Reach it with `contentDocument`.
- Resume upload: create a file input on the parent page, upload into it, then copy the File into the iframe input with DataTransfer and fire change.
- The resume parser overwrites email, street address (e.g. county instead of street), city, ZIP, GPA, school, degree and "Did you graduate". Snapshot the values before upload and restore them after.
- "Submit Profile" creates the account, so the student clicks it. Each company's iCIMS site is a separate account.

**SmartRecruiters**
- File inputs sit inside shadow DOM. Move them into a light-DOM host div so automation can reach them.
- The parser has set country UK and phone +44. Fix country, email and phone by hand.

**SuccessFactors**
- "Upload a CV" opens a dialog that holds the file input.
- The parser has mis-set State (e.g. a UK county name instead of the US state). Verify the address.

**UKG / UltiPro**
- Never triple-click the date widget. Single-click each segment and type MMDDYYYY.
- The demographic section can be pre-filled from the account profile. Check it before submitting.
- The "Save document changes?" pop-up submits immediately whether you answer Yes or No.

**Oracle Cloud**
- A long multi-block form. Scroll with `document.scrollingElement`.
- Submitting or signing in sends an emailed verification code, which the student enters.

**Eightfold**
- Resume upload opens a privacy acknowledgement that the student must accept.
- Dropdowns are LI items in `[role=listbox]`. Dispatch mousedown, mouseup and click on them.

**LinkedIn Easy Apply**
- The file input only appears after clicking "Upload resume".
- Profile data fills Experience (max 3 entries) and often leaves Degree/Field as N/A. Fix both.
- Small towns may not be in LinkedIn's city list. Use the nearest listed city.
- Uncheck "Follow company".

**ADP**
- E-signature means typing the student's full legal name, and only after they approve.

## Finding roles (no login)
```
curl -sL -A "Mozilla/5.0" https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/<id>
curl -sL -A "Mozilla/5.0" "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=<role>&location=<place>"
```
Many companies never email status changes, so save each application's `portal` URL for the daily scan.
