This folder contains convenience scripts for local development and CI.

Windows (cmd.exe)

- `scripts\dev-up.bat` — build and start the docker-compose stack (detached).
- `scripts\migrate.bat` — run knex migrations inside the `server` container.
- `scripts\seed.bat` — run the idempotent seeder inside the `server` container.
- `scripts\down.bat` — stop and remove containers.

Unix / macOS

- `scripts/dev-up.sh` — build and start the docker-compose stack.
- `scripts/migrate.sh` — run migrations inside the `server` container.
- `scripts/seed.sh` — run the seeder inside the `server` container.

Makefile

- `make up` — build and start the stack.
- `make migrate` — run migrations inside the server container.
- `make seed` — run seeder inside the server container.
- `make down` — stop and remove containers.

Notes

- Scripts assume Docker and docker-compose are installed and available on PATH.
- `docker-compose.override.yml` is used automatically by `docker-compose` when present.
- For CI you can call `make up` and `make migrate` as needed.
