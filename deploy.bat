@echo off
REM BistroShifts Production Deployment Helper (Windows)
REM Hilfsskript zur Vorbereitung für manuelles Deployment

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo  BistroShifts Production Deployment Vorbereitung (Windows)
echo ============================================================
echo.

set /p DOMAIN="Webserver Domain (z.B. example.com): "
set /p SSH_USER="SSH Benutzer (z.B. user@example.com): "
set /p TARGET_DIR="Ziel-Verzeichnis (Standard: /var/www/bistroshifts): "
if "!TARGET_DIR!"=="" set TARGET_DIR=/var/www/bistroshifts

set /p DB_USER="MySQL Benutzer (Standard: bistro): "
if "!DB_USER!"=="" set DB_USER=bistro

echo.
echo Zusammenfassung:
echo   Domain: !DOMAIN!
echo   SSH: !SSH_USER!
echo   Zielverzeichnis: !TARGET_DIR!
echo   MySQL User: !DB_USER!
echo.

set /p CONFIRM="Dateien vorbereiten? (j/n): "
if /i not "!CONFIRM!"=="j" (
    echo Abgebrochen.
    exit /b
)

echo.
echo ============================================================
echo  Dateien vorbereiten...
echo ============================================================
echo.

REM Prüfe ob client/dist existiert
if not exist "client\dist" (
    echo Fehler: client/dist existiert nicht!
    echo Bitte erst: cd client && npm run build
    exit /b 1
)

echo [OK] Client-Build gefunden

REM Erstelle Deployment-Struktur
if not exist "deploy-prod" mkdir deploy-prod

echo [OK] Deployment-Verzeichnis erstellt

REM Kopiere Dateien
echo Kopiere Client-Dateien...
xcopy "client\dist" "deploy-prod\bistroshifts\" /E /Y /Q
echo [OK] Client kopiert

echo Kopiere API-Dateien...
xcopy "server\php" "deploy-prod\bistroshifts\api\" /E /Y /Q
echo [OK] API kopiert

REM Kopiere Schema
copy "server\schema.sql" "deploy-prod\" /Y
echo [OK] Schema kopiert

REM Erstelle .env template
echo Erstelle .env Template...
(
    echo DB_HOST=localhost
    echo DB_NAME=bistroshifts
    echo DB_USER=!DB_USER!
    echo DB_PASSWORD=PASSWORT_HIER_EINGEBEN
    echo JWT_SECRET=SICHERER_ZUFALLSSTRING_HIER_EINGEBEN
) > "deploy-prod\bistroshifts\api\.env.example"
echo [OK] .env.example erstellt

echo.
echo ============================================================
echo  Deployment-Dateien fertig!
echo ============================================================
echo.
echo Verzeichnis: deploy-prod\
echo.
echo Zum Hochladen verwendest du:
echo.
echo Option 1 - WinSCP:
echo   - Öffne WinSCP
echo   - Verbinde mit !SSH_USER!@!DOMAIN!
echo   - Lade deploy-prod\bistroshifts\*  nach !TARGET_DIR! hoch
echo.
echo Option 2 - SCP/Putty:
echo   - scp -r deploy-prod\bistroshifts\* !SSH_USER!@!DOMAIN!:!TARGET_DIR!/
echo.
echo Option 3 - FTP:
echo   - Lade Dateien via FTP in !TARGET_DIR! hoch
echo.
echo WICHTIG:
echo   1. Erstelle auf dem Server .env Datei mit echtem Passwort
echo   2. Setze chmod 600 api/.env
echo   3. Importiere schema.sql in MySQL
echo   4. Teste https://!DOMAIN!
echo.
pause
