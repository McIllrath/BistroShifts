#!/usr/bin/env bash
set -euo pipefail

# Start the server in production mode
cd "$(dirname "$0")"
export NODE_ENV=production
export PORT=${PORT:-4000}

echo "Starting BistroShifts server on port $PORT"
node ../index.js
