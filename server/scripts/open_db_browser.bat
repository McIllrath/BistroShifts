@echo off
REM Helper to open the workspace SQLite DB in DB Browser for SQLite
SETLOCAL
set "SCRIPT_DIR=%~dp0"
set "DB_PATH=%SCRIPT_DIR%..\..\db\database.sqlite"

REM Normalize path
for %%I in ("%DB_PATH%") do set "DB_PATH=%%~fI"

echo Opening database: %DB_PATH%

REM Try Program Files (x86) and Program Files
if exist "%ProgramFiles%\DB Browser for SQLite\DB Browser for SQLite.exe" (
  "%ProgramFiles%\DB Browser for SQLite\DB Browser for SQLite.exe" "%DB_PATH%"
  exit /b %ERRORLEVEL%
)

if exist "%ProgramFiles(x86)%\DB Browser for SQLite\DB Browser for SQLite.exe" (
  "%ProgramFiles(x86)%\DB Browser for SQLite\DB Browser for SQLite.exe" "%DB_PATH%"
  exit /b %ERRORLEVEL%
)

REM If user provided DB_BROWSER_PATH env var, use it
if defined DB_BROWSER_PATH (
  "%DB_BROWSER_PATH%" "%DB_PATH%"
  exit /b %ERRORLEVEL%
)

echo DB Browser for SQLite not found in Program Files.
echo Please install it from https://sqlitebrowser.org/ or set the DB_BROWSER_PATH environment variable to the executable path.
exit /b 2
