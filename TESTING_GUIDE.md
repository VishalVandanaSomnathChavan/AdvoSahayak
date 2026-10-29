# Testing Guide

## Unit and static checks

From the repository root:

```powershell
npm test
npm run lint
npm run build
npm audit --omit=dev
npm --prefix server audit --omit=dev
```

The unit suite does not require MySQL or an AI provider. AI provider calls are never made by these tests.

## MySQL integration tests

Integration tests use a dedicated database and never use the configured development database name (`advosahayak`). They apply the idempotent project schema to the selected test database, create fictional accounts and records, and remove only the synthetic users they create. Uploaded test files are deleted as part of cleanup. The empty test database and its schema remain for later runs; tests do not drop tables or truncate data.

1. Configure normal MySQL connection settings locally in `server/.env`.
2. Create a separate empty database whose name begins with `advosahayak_` and includes `test`, for example `advosahayak_audit_test`. Do not point tests at a database containing non-test data.
3. Set the test database name in PowerShell and run the test:

```powershell
$env:MYSQL_TEST_DATABASE = 'advosahayak_audit_test'
npm run test:integration
```

The test runner overrides `MYSQL_DATABASE` only for its child API process and initializes tables only in `MYSQL_TEST_DATABASE`. It refuses names that do not match the test-database naming guard.

The suite covers health, registration and login, validation and duplicate accounts, case creation/update/archive, case notes and child-record hydration, ownership isolation, hearing edits, deadline completion, task completion, reminders, PDF upload/extraction/download/deletion, activity records, missing AI-key behavior without calling a provider, and persistence after an actual API process restart.

If MySQL access is denied, verify the local account has privileges on the dedicated test database. Never paste passwords or JWT secrets into commands, logs, or chat.

## Current limitations

- Browser component and browser-driven end-to-end tests are not configured in the project; the MySQL suite exercises real HTTP endpoints but does not automate the React UI.
- OCR is not available. PDFs without selectable text are retained and labeled as text unavailable.
- Legal research against external legal authorities is not integrated. No provider is configured, so the legacy research agent returns an explicit unavailable error rather than fabricated research.
- AI provider behavior is tested only for missing configuration. Live provider testing is not part of routine tests and may incur charges.
