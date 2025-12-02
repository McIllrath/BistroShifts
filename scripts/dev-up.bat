@echo off
REM Start compose stack (build and detach)
cd /d %~dp0\..
echo Building and starting containers...
docker-compose up -d --build
if %ERRORLEVEL% neq 0 (
  echo docker-compose up failed
  exit /b %ERRORLEVEL%
)
echo Containers started.
docker-compose ps
