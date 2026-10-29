# Setup and implementation status

This file intentionally does not claim that AdvoSahayak is fully production-ready. Use [`README.md`](./README.md) as the current source for architecture, commands, environment variables, API routes, test results, security notes, and known limitations.

The app implements authenticated case management backed by MySQL, private PDF storage and selectable-text extraction, tasks, hearings, deadlines, in-app reminders, case activity, and optional case-grounded AI assistance. Documents can be deleted and hearings edited. MySQL and AI-provider functionality require external configuration; run `npm --prefix server run db:init` after creating the database. Existing MongoDB data is not automatically migrated. Scanned-PDF OCR, external legal research, citation verification, and automated email/push/calendar reminders are not included.

Run `npm run lint`, `npm test`, and `npm run build` to validate the current code. Do not assume a database connection or provider key is available merely because the frontend starts.
