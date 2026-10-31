# Per-student workspace (local / pilot mode)

Before the hosted database exists, each pilot student gets a folder `users/<student-id>/`
copied from this template. Nothing in `users/` except this template is committed.

    users/<student-id>/
      profile.md          # from templates/student-profile.template.md, filled during onboarding (prompt A)
      tenant.json         # from config/tenant.example.json
      resume.pdf
      cover_letters/      # output of backend/cover-letter/cover_letter.py (set COVER_LETTER_DIR here)
      tracker.json        # same shape as sample-data/sample-jobs.json: {applications:[], outreach:[]}

Rules that carry over to the hosted version:
- An agent run is scoped to one student folder. It never reads another student's files.
- The student approves every submit and every outgoing message.
- EEO answers default to "decline" unless the student opts in.
