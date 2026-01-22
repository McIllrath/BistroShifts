#!/bin/bash
# Cleanup script - Removes old Node.js/SQLite files

echo "========================================"
echo "BistroShifts Cleanup - Removing Node.js/SQLite files"
echo "========================================"
echo ""
echo "This will remove:"
echo "- Old Node.js server code"
echo "- SQLite database files"
echo "- Old Docker configurations"
echo "- Old migration and seed scripts"
echo ""
read -p "Continue? (y/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Removing old server files..."

# Server - Node.js code
rm -rf server/src
rm -rf server/migrations
rm -rf server/test
rm -rf server/node_modules
rm -f server/index.js
rm -f server/knexfile.js
rm -f server/package.json
rm -f server/package-lock.json
rm -f server/debug_*.js
rm -f server/e2e.js
rm -f server/start_prod.sh
rm -f server/.env
rm -f server/.env.example
rm -f server/.dockerignore
rm -f server/Dockerfile
rm -f server/EMAIL_SETUP.md
rm -f server/README.md

# Server scripts (old Node.js specific)
rm -rf server/scripts

# SQLite database
rm -rf db

# Root level - old Docker files
rm -f docker-compose.yml
rm -f docker-compose.override.yml
rm -f docker-compose.prod.yml
rm -rf docker

# Root level - old Node.js files
rm -f package.json
rm -f package-lock.json
rm -f Makefile

# Scripts - old Node.js specific scripts
rm -f scripts/dev-up.bat
rm -f scripts/dev-up.sh
rm -f scripts/down.bat
rm -f scripts/migrate.bat
rm -f scripts/migrate.sh
rm -f scripts/seed.bat
rm -f scripts/seed.sh
rm -f scripts/admin_delete.ps1
rm -f scripts/hard_delete_selected.js
rm -f scripts/README.md

echo ""
echo "========================================"
echo "Cleanup complete!"
echo "========================================"
echo ""
echo "Removed:"
echo "- Node.js server code (server/src, server/index.js, etc.)"
echo "- SQLite database (db/)"
echo "- Old Docker configurations"
echo "- Old scripts (migrate, seed, etc.)"
echo ""
echo "Kept:"
echo "- React client (client/)"
echo "- PHP backend (server/php/)"
echo "- MySQL schema (server/schema.sql)"
echo "- PHP Docker setup (docker-compose-php.yml)"
echo "- PHP scripts (scripts/start-php.*, scripts/stop-php.*)"
echo "- Deployment files (deploy/)"
echo ""
echo "You can now use: ./scripts/start-php.sh to start the application"
echo ""
