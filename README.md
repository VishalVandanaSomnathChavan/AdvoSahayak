# AdvoSahayak

AdvoSahayak is a legal-workflow workspace for organizing cases, private PDF documents, hearings, deadlines, and tasks. Optional AI features produce case-grounded summaries, answers, briefs, and drafts for human review. It does not provide legal advice, verify legal authorities, submit filings, or send communications.

## Features

- **Accounts:** Registration and sign-in, bcrypt password hashing, signed 12-hour `httpOnly` session cookies, profile updates, and password changes.
- **Case management:** Create, view, edit, search, filter, paginate, and archive owner-scoped cases, with parties, important dates, hearings, deadlines, notes, and linked documents.
- **Documents:** Upload PDF files up to the configured size limit, verify the PDF signature, extract selectable text, and download/delete files through authenticated owner-scoped routes. Scanned PDFs are retained, but OCR is unavailable and their text cannot be searched or used for AI.
- **Document library:** Search document names across cases or filter by case.
- **Tasks and calendar:** Create case-linked tasks, mark tasks complete or reopen them, schedule/edit hearings, and record/complete user-entered deadlines.
- **In-app reminders:** List upcoming hearings, verified deadlines, and open tasks, including overdue items. No email, push, or calendar notifications are sent.
- **Activity history:** Records case, task, document, hearing/deadline, and AI workflow events.
- **AI workflows:** With `OPENAI_API_KEY`, generate case-grounded summaries, answers, briefs, and drafts. Results are saved for human review; no mock response is returned if the provider is unavailable.
- **Security:** User ownership checks, parameterized SQL, relational foreign keys, transactional related writes, security headers, authentication/AI rate limits, private upload storage, and safe API errors.

## Stack and data model

- Frontend: React 18, Vite, React Router, Axios, CSS.
- Backend: Node.js, Express 4, MySQL 8+, `mysql2/promise`.
- AI: server-side OpenAI SDK; API key never belongs in the client.
- PDF: `pdf-parse` extracts selectable text.

MySQL tables use InnoDB and `utf8mb4`. `server/db/schema.sql` defines:

- `users`, `cases`
- `case_parties`, `important_dates`, `case_notes`
- `hearings`, `deadlines`, `documents`, `tasks`
- `ai_analyses`, `activities`

Child records reference cases with composite `(case_id, owner_id)` foreign keys, enforcing owner consistency in the database. Queries are parameterized. Case/child/activity changes and document/AI relationships use transactions and foreign-key cascades. Uploaded PDFs are stored in `server/private-uploads`, outside the public web root.

## Requirements

- Node.js 18+ and npm.
- MySQL 8+ local or managed MySQL service.
- OpenAI API key only for AI endpoints.

## Local setup (Windows PowerShell)

From the repository root:

```powershell
npm run install-all
if (-not (Test-Path server\.env)) { Copy-Item server\.env.example server\.env }
```

Install/start a MySQL service separately if one is not already available. Create an application database and a dedicated user with access limited to it. Configure `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` in `server\.env`. Set a unique random `JWT_SECRET` of at least 32 characters. `OPENAI_API_KEY` is optional; without it AI endpoints return an explicit `503`.

Create the database (substitute your actual MySQL administrator and database names as appropriate):

```powershell
mysql -u root -p -e "CREATE DATABASE advo_sahayak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
```

Initialize the tables, then run the development servers:

```powershell
npm --prefix server run db:init
npm run dev
```

The schema command requires the target database to exist and a configured MySQL account with DDL permissions on it. It is idempotent and is not run automatically during normal server startup. To inspect MySQL services in elevated PowerShell, run `Get-Service *MySQL*`; use your installed service's actual name to start it.

For managed MySQL, configure the connection values from its provider dashboard; set `MYSQL_SSL=true` when TLS is required. Keep credentials only in `server\.env` or a secret manager—never in source files or chat. `/api/health` reports `503` until MySQL is reachable.

Open <http://localhost:5173>. The API listens on <http://localhost:5000>; its health endpoint is `/api/health`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port; default `5000` |
| `MYSQL_HOST` | Yes | MySQL server host |
| `MYSQL_PORT` | No | MySQL port; default `3306` |
| `MYSQL_USER` | Yes | MySQL application user |
| `MYSQL_PASSWORD` | Yes | MySQL application password |
| `MYSQL_DATABASE` | Yes | Existing database; default `advo_sahayak` |
| `MYSQL_SSL` | No | Set `true` when the provider requires TLS |
| `MYSQL_POOL_SIZE` | No | Connection-pool size; default `10` |
| `JWT_SECRET` | Yes | Random secret of 32+ characters |
| `OPENAI_API_KEY` | No | Server-only API key; AI requests require it |
| `OPENAI_MODEL` | No | Model name; default `gpt-4o-mini` |
| `CLIENT_ORIGIN` | No | Allowed frontend origin(s), comma-separated |
| `MAX_UPLOAD_MB` | No | Upload limit in MiB; default `10` |

`server/.env.example` contains placeholders only.

## Available scripts

| Command | Purpose |
|---|---|
| `npm run install-all` | Install server and client packages |
| `npm run dev` | Run Express and Vite |
| `npm run lint` | Lint client source |
| `npm test` | Run backend unit tests |
| `npm run test:integration` | Run API/database tests against a separately configured MySQL test database; see [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) |
| `npm run build` | Create production client build |
| `npm --prefix server run db:init` | Create MySQL tables from `server/db/schema.sql` |
| `npm start` | Build client, then start Express |

## API reference

All `/api` routes except health and `/api/auth/*` require the signed session cookie. JSON errors have an `error` field. Case lists return `{ cases, pagination }`.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | API/database health (`503` if MySQL is unavailable) |
| `POST` | `/api/auth/register` | Register `{ name, email, password }` |
| `POST` | `/api/auth/login` | Sign in `{ email, password }` |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/auth/me` | Get current profile |
| `PATCH` | `/api/auth/me` | Update name/password |
| `GET` | `/api/cases` | List owner cases; optional `search`, `status`, `archived`, `page`, `limit` |
| `POST` | `/api/cases` | Create a case |
| `GET` | `/api/cases/dashboard` | Owner-scoped dashboard counts |
| `GET` | `/api/cases/:id` | Get an owner-scoped case |
| `PUT` | `/api/cases/:id` | Update case details/archive |
| `POST` | `/api/cases/:id/notes` | Add a case note |
| `POST` | `/api/cases/:id/deadlines` | Add a user-entered deadline |
| `PATCH` | `/api/cases/:id/deadlines/:deadlineId` | Complete/reopen a deadline |
| `POST` | `/api/cases/:id/hearings` | Add a hearing |
| `PATCH` | `/api/cases/:id/hearings/:hearingId` | Edit a hearing |
| `POST` | `/api/documents/:caseId` | Upload multipart field `document` (PDF only) |
| `GET` | `/api/documents` | Search document names; optional `search`, `caseId` |
| `GET` | `/api/documents/case/:caseId` | List private document metadata |
| `GET` | `/api/documents/:id/download` | Authenticated PDF download |
| `DELETE` | `/api/documents/:id` | Delete private document and linked AI analyses |
| `GET` | `/api/tasks` | List owner tasks; optional `caseId`, `completed` |
| `POST` | `/api/tasks` | Create a case-linked task |
| `PATCH` | `/api/tasks/:id` | Complete/reopen a task |
| `GET` | `/api/reminders` | In-app reminders; optional window `days` (1–30) |
| `GET` | `/api/ai/case/:caseId` | List saved AI results |
| `POST` | `/api/ai/case/:caseId/summary` | Summarize `{ documentId }` or supplied prompt |
| `POST` | `/api/ai/case/:caseId/question` | Answer `{ prompt, documentId? }` |
| `POST` | `/api/ai/case/:caseId/brief` | Generate a structured brief |
| `POST` | `/api/ai/case/:caseId/draft` | Generate draft content |
| `PATCH` | `/api/ai/:id/review` | Mark `{ reviewed: boolean }` |
| `GET` | `/api/activity/case/:caseId` | List case activity |

## Verification

Run `npm run lint`, `npm test`, `npm run build`, and `npm --prefix server audit --omit=dev`. Run `npm run test:integration` with `MYSQL_TEST_DATABASE` set to a dedicated empty test database; see [`TESTING_GUIDE.md`](./TESTING_GUIDE.md). AI generation additionally requires a working provider key.

## Limitations and migration notes

- This codebase does not connect to MongoDB. Existing MongoDB data is **not automatically migrated**; export/transform/import must be planned separately before switching an installation that contains data.
- Scanned-PDF OCR, automated legal deadline extraction, email/push/calendar reminders, external legal research, citation verification, and outcome predictions are not implemented.
- Upload storage is local disk. Production deployments need private durable storage, backups, access monitoring, and malware scanning.
- `server/.env` was present in repository history and is staged for removal from the Git index; its local file is preserved. The historical connection was a local MongoDB URI without embedded credentials. Never commit real environment values.
- `node_modules` had been tracked in the original repository and is staged for removal from the Git index; local dependency directories remain.

## GitHub workflow

Changes are on the existing `restore-base-project` branch. No commit or push was made. Review with:

```powershell
git status --short --branch
git diff --check
git diff
git diff --cached --stat
```

Stage and commit only after reviewing the full source changes. Push only after explicit approval.

## Legal disclaimer

AdvoSahayak is a workflow tool, not a law firm or a source of legal advice. AI-generated material may be incomplete or wrong. A qualified legal professional must verify all facts, dates, authorities, and drafts before relying on or using them.
