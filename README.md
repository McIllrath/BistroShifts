# BistroShifts (local dev)

This repository contains a small weekend-shifts app (React + Express + SQLite).

Quick start (development)

1. Server

```bash
cd /d C:\BistroShifts\server
npm install
cp .env.example .env
# Set a strong JWT_SECRET in .env
npm start
```

2. Client

```bash
cd /d C:\BistroShifts\client
npm install
npm run dev
# open http://localhost:5173
```

E2E and tests

- API E2E: `node e2e.js` (in `server/`) — this creates test entities and cleans them up.
- UI E2E: Playwright tests under `client/tests`. Install browsers and run:

```bash
cd /d C:\BistroShifts\client
npx playwright install
npm run e2e:ui
```

Security / Production notes

- Set a strong `JWT_SECRET` in `.env` before deploying.
- The app uses SQLite — consider using a managed DB for production.
- Basic security middlewares added (`helmet`, `express-rate-limit`). Consider further hardening (CSP, HSTS, proper CORS config, HTTPS termination).

CI

- Add server `node e2e.js` and `npm test` into your pipeline.
If you want, I can create a deploy guide next (Docker, PM2, or cloud).

Postgres / Migrations

- To run the server against Postgres (local docker-compose) set the `DATABASE_URL` and `DATABASE_CLIENT` env vars, then run migrations and seeds. Example (cmd.exe):

```cmd
cd /d C:\BistroShifts\server
set DATABASE_CLIENT=pg
set DATABASE_URL=postgres://bistro:bistro@localhost:5432/bistro
npm run migrate
npm run seed-all
npm start
```

Detailed server-specific instructions are in `server/README.md`.