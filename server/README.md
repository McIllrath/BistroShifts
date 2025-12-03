# Server (BistroShifts)

This document contains development and migration instructions for the server component.

Important environment variables

- `PORT` — server listen port (default `4000`).
- `JWT_SECRET` — set to a secure value in production.
- `DATABASE_CLIENT` — `sqlite3` (default) or `pg`.
- `DATABASE_FILE` — path to sqlite file (used when `DATABASE_CLIENT=sqlite3`).
- `DATABASE_URL` — Postgres connection string (used when `DATABASE_CLIENT=pg`).

Quick start (Windows `cmd.exe`)

1) Install dependencies

```cmd
cd /d C:\BistroShifts\server
npm install
```

2) Use SQLite (default)

```cmd
# initialize DB (runs init SQL)
npm run init-db

# start dev server
npm run dev

# in a separate terminal, run tests
npm test
```

3) Use Postgres (docker-compose)

This project includes a `docker-compose.yml` with a Postgres service. To run the server against Postgres:

```cmd
cd /d C:\BistroShifts
# start postgres (and other services)
docker-compose up -d db

# in server folder set env and run migrations
cd /d C:\BistroShifts\server
set DATABASE_CLIENT=pg
set DATABASE_URL=postgres://bistro:bistro@db:5432/bistro
npm run migrate
npm run seed-all
npm run dev
```

Notes:
- When using Postgres from your host (not via the `db` service), set `DATABASE_URL` with the correct host (e.g. `localhost`) and credentials.
- Migrations are in `server/migrations`. Use `npm run migrate` and `npm run migrate:rollback`.

Seeding and helpers

- `npm run seed-all` — idempotent dev seeder (creates an admin and a user and sample shifts).
- `npm run seed-shift` — insert a single shift from CLI args.
- `npm run init-db` — runs the `init.sql` via Knex for sqlite-friendly initialization.
- `npm run open-db` — Windows helper to open the DB file (PowerShell script).

Production environment file

- A sample env file is provided at `server/.env.example`. **Do not** commit secrets — copy it to `server/.env` and fill in secure values.
- Example (Windows `cmd.exe`):

```cmd
cd /d C:\BistroShifts
copy server\.env.example server\.env
rem Edit server\.env and set JWT_SECRET and DATABASE_URL (do not commit)
```

- Example (Linux/macOS):

```bash
cp server/.env.example server/.env
# Edit server/.env and set secure values for DATABASE_URL and JWT_SECRET
```

Using the production docker-compose

- To run the production compose stack (build server + client, run migrations/seeds):

```cmd
cd /d C:\BistroShifts
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file server/.env up -d --build
```

The `server` container reads `server/.env` (via compose `env_file`), waits for Postgres to be reachable, runs migrations and the idempotent seeder, then starts the Node server.

Security note: use a secrets manager or CI/CD secrets for production deployments instead of plain `.env` files when possible.

Testing

- Unit / integration tests: `npm test` (Mocha).
- API E2E helper: `node e2e.js` — uses the running server's API to run an end-to-end scenario (health, create shift, signup, cleanup).

Development notes

- The server now uses Knex for DB access with both `sqlite3` and `pg` supported.
- Key routes have been converted to Knex query builders; inserts that require atomic capacity checks use an `INSERT ... SELECT ... WHERE` pattern for sqlite and Postgres where appropriate.
- The runtime DB wrapper is at `server/src/db.js` and exports `knex` plus sqlite3-style helper methods for backward compatibility.

Troubleshooting

- If you see `SQLITE_BUSY` during concurrent test runs, try increasing `PRAGMA busy_timeout` or run tests serially. The project sets the sqlite busy timeout automatically in `db.js`.
- For Postgres, ensure `DATABASE_URL` points to a reachable DB and run `npm run migrate` before starting the server.
