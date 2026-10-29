# Project file reference

The current architecture and end-to-end setup are documented in [`README.md`](./README.md).

## Application source

- `client/src/context/AuthContext.jsx`: Browser account/session state.
- `client/src/components/Sidebar.jsx`: Workspace navigation and sign-out.
- `client/src/pages/`: Dashboard, case file, document library, tasks, hearings, reminders, AI assistant, drafting, sign-in, and profile/settings screens.
- `client/src/services/api.js`: Same-origin API client.
- `server/server.js`: Express security middleware, routes, MySQL health check, and production static serving.
- `server/db/pool.js`: MySQL connection pool and transaction helper.
- `server/db/schema.sql`: Relational schema, indexes, and ownership-aware foreign keys.
- `server/db/initialize.js`: Explicit idempotent schema initialization.
- `server/middleware/`: Authentication, uploads, and centralized errors.
- `server/models/`: Parameterized MySQL repositories/mappers for user, case, document, task, AI analysis, and activity records.
- `server/controllers/`: Case, document, and AI request handlers.
- `server/routes/`: Auth, cases, documents, tasks, AI, and activity endpoints.
- `server/services/`: AI provider, activity-log, and reminder services.
- `server/test/security.test.js` and `server/test/integration.test.js`: Unit/security and isolated MySQL HTTP integration tests.
- `TESTING_GUIDE.md`: Safe test-database setup and verification commands.
- `server/.env.example`: Safe configuration template; it contains no credentials.

`node_modules` and build output are generated dependencies/artifacts and should not be included in new commits. The original repository has some already-tracked dependency artifacts; see the security/repository note in the README.
