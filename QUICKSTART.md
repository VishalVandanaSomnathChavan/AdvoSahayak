# Quick start

See [`README.md`](./README.md) for full setup, environment variables, API reference, verification, limitations, and security notes.

From a Windows PowerShell prompt in the repository root:

```powershell
npm run install-all
if (-not (Test-Path server\.env)) { Copy-Item server\.env.example server\.env }
```

Set `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, and a unique `JWT_SECRET` (32+ characters) in `server\.env`. Create the database and initialize its tables:

```powershell
mysql -u root -p -e "CREATE DATABASE advo_sahayak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
npm --prefix server run db:init
npm run dev
```

Open <http://localhost:5173>, register an account, and create a case. Set `OPENAI_API_KEY` in the server environment to enable AI workflows; without it, AI endpoints return an explicit error. The API health check is <http://localhost:5000/api/health>. MongoDB is not used by this application.
