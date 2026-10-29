# AdvoSahayak Project Audit

## Executive summary

The current backend is MySQL-based. Its application code and manifests use `mysql2`, parameterized SQL, and an 11-table InnoDB schema; no MongoDB or Mongoose references were found in the backend code, routes, models, or dependency manifests. The migration is verified against a dedicated local MySQL test database, including API restart persistence and owner-scoped access.

The unit tests, isolated MySQL integration suite, frontend lint, production build, and whitespace checks passed. The frontend dependency audit still reports two moderate React Router advisories. A live AI-provider workflow and OCR for scanned PDFs remain unverified/unimplemented. No commit or push was made.

## Feature status

| Area | Status | Evidence / limitation |
|---|---|---|
| MySQL persistence | Implemented and tested | `mysql2/promise`, parameterized queries, transactions, foreign keys, indexes, and owner-scoped records. The schema defines users, cases, parties, important dates, notes, hearings, deadlines, documents, tasks, AI analyses, and activities. |
| Authentication and ownership | Implemented and tested | Synthetic registration/login, invalid-input handling, and cross-owner denial checks passed in integration tests. |
| Cases | Implemented and tested | Create, retrieve, update, archive, child-record hydration, notes, dashboard counts, and persistence after an API process restart passed. The API retains `id`/`_id` compatibility fields. |
| Hearings | Implemented and tested | Creation and editing passed against MySQL. |
| Tasks and reminders | Partly implemented | Task creation, completion/reopening, and in-app reminder retrieval are covered. Tasks do not currently have edit/delete workflows. There is no email, push, or calendar dispatch. |
| Documents | Implemented and tested for selectable-text PDFs | Upload, extraction, storage, download, ownership denial, deletion, and file cleanup passed in the isolated integration run. Scanned-PDF OCR is not implemented. |
| Activities | Implemented and tested | Case activity records and dashboard statistics were checked in integration tests. |
| AI analysis/drafting | Partly implemented | The missing-provider-key response was tested and fails explicitly. No live provider request was made; configured-key analysis remains unverified. |
| Legal research | Safe limitation | Placeholder/fabricated authority output was removed. External legal research and citation verification are not integrated. |
| MongoDB data migration | Not performed | No MongoDB was installed or used. The existing MySQL workflows were tested, but no historical MongoDB records were imported. |

### PDF extraction note

The integration suite passed when run by itself, including extraction of the synthetic selectable-text PDF. One run performed concurrently with other validation processes returned PDF.js `UnknownErrorException`; an isolated rerun passed. Treat this as an intermittent extraction/test-runtime risk and recheck it in the target deployment environment. Scanned documents still require OCR support.

## Verification results

| Check | Result |
|---|---|
| `npm test` | Passed: 8 tests, 0 failures. |
| `npm run test:integration` | Passed in the isolated rerun: 1 suite, 0 failures, against a dedicated synthetic-data MySQL test database. It covered database health, auth, case CRUD/archive and restart persistence, transaction rollback, hearings, tasks/reminders, document workflows, ownership denials, activity/dashboard data, and missing AI-key behavior. |
| Unavailable-MySQL health check | Passed: a separately launched API process pointed at an intentionally unreachable local MySQL port returned HTTP 503 with `database_unavailable` / `disconnected` and `engine: mysql`. No credentials or connection details were returned. |
| Frontend lint | Passed: `npm run lint`. |
| Frontend production build | Passed: `npm run build` using Vite 6.4.5. |
| Backend JavaScript syntax | Passed: 38 files checked with `node --check`. |
| Package manifests and lockfiles | Passed: all six JSON files parsed. |
| Whitespace checks | Passed: staged and unstaged `git diff --check`. |
| Full backend dependency audit | Passed: 0 vulnerabilities. |
| Full root dependency audit | Passed: 0 vulnerabilities. |
| Full frontend dependency audit | Not clean: 2 moderate React Router advisories remain. The reported fix is React Router 7.18.5, a major-version upgrade; it was not forced without a separate compatibility migration. |

The integration suite uses only synthetic records and cleans up its own test users and uploaded files. The ordinary development database was not used for the integration test data. Live AI-provider behavior was not tested.

## Security and secret handling

- Database access uses parameterized SQL; transactional case operations and database constraints are present.
- Integration coverage exercised cross-owner access denials for cases and documents.
- Unexpected server errors and provider errors are returned without raw internal exception messages.
- A sanitized, pattern-based Git-history scan found no actual provider/cloud API tokens, private-key headers, or credential-bearing database URIs. It did match a historical example URI containing placeholder-looking username/password text; that example was manually classified as a placeholder. The scan suppresses values and is not a substitute for a dedicated secret scanner.
- The initial repository commit contains `server/.env` with a loopback MongoDB URI and a port setting; the URI had no embedded credentials. The file's deletion is already staged. The current local file remains present and ignored; its contents were not opened. Historical values were classified in memory with values suppressed.
- Historical database URIs in `QUICKSTART.md` are examples with placeholder-looking credentials or a local URI, not identified as real credentials.
- `server/.env.example` contains placeholders only. `.gitignore` excludes environment files, dependencies, build output, and upload directories.
- The staged removal prevents `.env` from being included in the next commit, but does not rewrite prior Git history. Based on the sanitized scan, no credential rotation or history rewrite is indicated. Recheck before publishing if other collaborators or branches may contain different secrets.

## Files and generated artifacts

The current dirty tree includes earlier MySQL migration/application work as well as audit changes. The following list is a scope summary, not a claim that every file was first changed in this audit.

- **Documentation:** `README.md`, `QUICKSTART.md`, `SETUP_COMPLETE.md`, `FILE_REFERENCE.md`, `TESTING_GUIDE.md`, and this report.
- **Frontend:** `client/index.html`, `client/package.json`, `client/package-lock.json`, `client/.eslintrc.cjs`, application/auth/sidebar/styles, the case/dashboard/document/hearing/login/reminder/research/settings/task/drafting pages, and `client/src/services/api.js`.
- **Backend:** `server/package.json`, `server/package-lock.json`, `server/.env.example`, MySQL initialization/pool/schema, server entry point, authentication/upload/error middleware, SQL-backed models, API controllers/routes, activity/AI/reminder services, and unit/integration tests.
- **Root configuration:** `package.json`, `package-lock.json`, and `.gitignore`.

Generated-artifact and local-data handling:

- The Git index currently records deletion of 22,922 previously tracked `node_modules` files and the previously tracked `server/.env`. Those staged changes predate this audit; they were inspected and preserved, not committed.
- No generated dependency/build/cache paths remain in the current Git index. The frontend `dist` output is ignored.
- The local `server/.env` remains on disk but ignored. The `.env.example` contains placeholders.
- Synthetic integration records and uploaded files were cleaned up by the test run; no production/user records were targeted.

## Git state and actions before GitHub

- **Branch:** `restore-base-project`.
- **Commit/push:** None made.
- **Worktree:** Still dirty. The unstaged tracked diff is 29 files (3,027 insertions, 2,998 deletions); there are also new source, documentation, and configuration files. The index contains the pre-existing 22,923 staged deletions described above.
- **Next steps:** Review the complete staged and unstaged diffs together; confirm the staged dependency and `.env` removals are intended; decide whether to schedule a React Router v7 migration; recheck the intermittent PDF extraction behavior; and run the test/build/audit commands again on the final chosen diff. Stage and commit only after explicit approval. Do not push without explicit approval.

## Remaining limitations

1. OCR for scanned PDFs is absent.
2. Reminders are in-app only; no external notification delivery is configured.
3. Tasks cannot currently be edited or deleted.
4. No live AI-provider call was made.
5. No MongoDB records were imported; if legacy records must be retained, define and validate a separate data-export/import process against synthetic or approved data.
6. Two moderate React Router advisories remain pending a reviewed major-version migration.
7. PDF text extraction had one transient failure in a parallel validation run; isolated integration validation passed.
