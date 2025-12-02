@echo off
cd /d %~dp0\..
echo Running migrations inside server container...
docker-compose exec server npm run migrate
if %ERRORLEVEL% neq 0 (
  echo migrations failed
  exit /b %ERRORLEVEL%
)
echo Migrations complete.
