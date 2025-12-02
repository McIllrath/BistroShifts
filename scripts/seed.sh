#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Running seeder inside server container..."
docker-compose exec server node scripts/seed_users_and_shifts.js
echo "Seeding complete."
