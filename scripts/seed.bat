@echo off
cd /d %~dp0\..
echo Running seeder inside server container...
docker-compose exec server node scripts/seed_users_and_shifts.js
if %ERRORLEVEL% neq 0 (
  echo seeding failed
  exit /b %ERRORLEVEL%
)
echo Seeding complete.
