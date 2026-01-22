@echo off
REM Cleanup script - Removes old Node.js/SQLite files

echo ========================================
echo BistroShifts Cleanup - Removing Node.js/SQLite files
echo ========================================
echo.
echo This will remove:
echo - Old Node.js server code
echo - SQLite database files
echo - Old Docker configurations
echo - Old migration and seed scripts
echo.
set /p CONFIRM="Continue? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Cleanup cancelled.
    exit /b
)

echo.
echo Removing old server files...

REM Server - Node.js code
rmdir /s /q "server\src" 2>nul
rmdir /s /q "server\migrations" 2>nul
rmdir /s /q "server\test" 2>nul
rmdir /s /q "server\node_modules" 2>nul
del /q "server\index.js" 2>nul
del /q "server\knexfile.js" 2>nul
del /q "server\package.json" 2>nul
del /q "server\package-lock.json" 2>nul
del /q "server\debug_*.js" 2>nul
del /q "server\e2e.js" 2>nul
del /q "server\start_prod.sh" 2>nul
del /q "server\.env" 2>nul
del /q "server\.env.example" 2>nul
del /q "server\.dockerignore" 2>nul
del /q "server\Dockerfile" 2>nul
del /q "server\EMAIL_SETUP.md" 2>nul
del /q "server\README.md" 2>nul

REM Server scripts (old Node.js specific)
rmdir /s /q "server\scripts" 2>nul

REM SQLite database
rmdir /s /q "db" 2>nul

REM Root level - old Docker files
del /q "docker-compose.yml" 2>nul
del /q "docker-compose.override.yml" 2>nul
del /q "docker-compose.prod.yml" 2>nul
rmdir /s /q "docker" 2>nul

REM Root level - old Node.js files
del /q "package.json" 2>nul
del /q "package-lock.json" 2>nul
del /q "Makefile" 2>nul

REM Scripts - old Node.js specific scripts
del /q "scripts\dev-up.bat" 2>nul
del /q "scripts\dev-up.sh" 2>nul
del /q "scripts\down.bat" 2>nul
del /q "scripts\migrate.bat" 2>nul
del /q "scripts\migrate.sh" 2>nul
del /q "scripts\seed.bat" 2>nul
del /q "scripts\seed.sh" 2>nul
del /q "scripts\admin_delete.ps1" 2>nul
del /q "scripts\hard_delete_selected.js" 2>nul
del /q "scripts\README.md" 2>nul

echo.
echo ========================================
echo Cleanup complete!
echo ========================================
echo.
echo Removed:
echo - Node.js server code (server/src, server/index.js, etc.)
echo - SQLite database (db/)
echo - Old Docker configurations
echo - Old scripts (migrate, seed, etc.)
echo.
echo Kept:
echo - React client (client/)
echo - PHP backend (server/php/)
echo - MySQL schema (server/schema.sql)
echo - PHP Docker setup (docker-compose-php.yml)
echo - PHP scripts (scripts/start-php.*, scripts/stop-php.*)
echo - Deployment files (deploy/)
echo.
echo You can now use: scripts\start-php.bat to start the application
echo.
pause
