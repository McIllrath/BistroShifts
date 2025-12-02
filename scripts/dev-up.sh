#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Building and starting containers..."
docker-compose up -d --build
echo "Containers started."
docker-compose ps
