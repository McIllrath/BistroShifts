#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Running migrations inside server container..."
docker-compose exec server npm run migrate
echo "Migrations complete."
