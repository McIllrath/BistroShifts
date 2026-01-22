# Projekt-Aufräumung - Entfernen alter Node.js/SQLite Dateien

## Übersicht

Dieses Dokument beschreibt, welche Dateien nach der Migration auf PHP/MySQL entfernt werden können.

## Automatisches Cleanup

Am einfachsten verwenden Sie die mitgelieferten Cleanup-Scripts:

### Windows
```bash
cleanup.bat
```

### Linux/Mac
```bash
chmod +x cleanup.sh
./cleanup.sh
```

## Was wird entfernt?

### Server-Dateien (Node.js)
- `server/src/` - Kompletter Node.js Source Code
- `server/migrations/` - Alte Knex.js Migrationen
- `server/test/` - Node.js Tests
- `server/node_modules/` - Node.js Dependencies
- `server/index.js` - Node.js Entry Point
- `server/knexfile.js` - Knex Konfiguration
- `server/package.json` - Node.js Dependencies
- `server/package-lock.json`
- `server/debug_*.js` - Debug Scripts
- `server/e2e.js` - E2E Tests
- `server/start_prod.sh` - Node.js Start Script
- `server/.env` & `server/.env.example` - Alte Environment Files
- `server/Dockerfile` - Alter Node.js Dockerfile
- `server/EMAIL_SETUP.md`
- `server/README.md`
- `server/scripts/` - Alte Node.js-spezifische Scripts

### Datenbank
- `db/` - SQLite Datenbankdateien

### Docker-Konfigurationen
- `docker-compose.yml` - Alte Node.js/SQLite Konfiguration
- `docker-compose.override.yml`
- `docker-compose.prod.yml`
- `docker/` - Alte Docker-Konfigurationen

### Root-Verzeichnis
- `package.json` - Root-Level Node.js Config
- `package-lock.json`
- `Makefile` - Alte Build-Scripts

### Scripts-Verzeichnis
- `scripts/dev-up.bat` & `scripts/dev-up.sh`
- `scripts/down.bat`
- `scripts/migrate.bat` & `scripts/migrate.sh`
- `scripts/seed.bat` & `scripts/seed.sh`
- `scripts/admin_delete.ps1`
- `scripts/hard_delete_selected.js`
- `scripts/README.md`

## Was wird BEHALTEN?

### Client
- `client/` - React Frontend (unverändert)

### Neues PHP Backend
- `server/php/` - Komplettes PHP Backend
- `server/schema.sql` - MySQL Datenbankschema

### Docker (PHP)
- `docker-compose-php.yml` - Neue PHP/MySQL Konfiguration
- `.env.php` - Environment-Variablen

### Scripts (PHP)
- `scripts/start-php.bat` & `scripts/start-php.sh`
- `scripts/stop-php.bat` & `scripts/stop-php.sh`

### Dokumentation
- `README.md` - Aktualisiert
- `MIGRATION-PHP.md` - Neue Dokumentation
- `deploy/` - Deployment-Konfigurationen

### Sonstiges
- `.git/` - Git Repository
- `.gitignore`
- `.vscode/` - VS Code Einstellungen

## Manuelles Cleanup

Falls Sie das Cleanup manuell durchführen möchten:

### Windows (PowerShell)
```powershell
# Server-Dateien
Remove-Item -Recurse -Force server\src, server\migrations, server\test, server\node_modules, server\scripts
Remove-Item server\index.js, server\knexfile.js, server\package*.json, server\debug_*.js, server\e2e.js
Remove-Item server\start_prod.sh, server\.env*, server\Dockerfile, server\*_SETUP.md, server\README.md

# Datenbank
Remove-Item -Recurse -Force db

# Docker
Remove-Item -Recurse -Force docker
Remove-Item docker-compose.yml, docker-compose.override.yml, docker-compose.prod.yml

# Root
Remove-Item package*.json, Makefile

# Scripts
Remove-Item scripts\dev-up.*, scripts\down.bat, scripts\migrate.*, scripts\seed.*
Remove-Item scripts\admin_delete.ps1, scripts\hard_delete_selected.js, scripts\README.md
```

### Linux/Mac (Bash)
```bash
# Server-Dateien
rm -rf server/src server/migrations server/test server/node_modules server/scripts
rm -f server/index.js server/knexfile.js server/package*.json server/debug_*.js server/e2e.js
rm -f server/start_prod.sh server/.env* server/Dockerfile server/*_SETUP.md server/README.md

# Datenbank
rm -rf db

# Docker
rm -rf docker
rm -f docker-compose.yml docker-compose.override.yml docker-compose.prod.yml

# Root
rm -f package*.json Makefile

# Scripts
rm -f scripts/dev-up.* scripts/down.bat scripts/migrate.* scripts/seed.*
rm -f scripts/admin_delete.ps1 scripts/hard_delete_selected.js scripts/README.md
```

## Nach dem Cleanup

Nach dem Cleanup sollte Ihre Projektstruktur so aussehen:

```
BistroShifts/
├── .git/
├── .gitignore
├── .vscode/
├── client/                  # React Frontend
├── server/
│   ├── php/                # PHP Backend
│   └── schema.sql          # MySQL Schema
├── deploy/                 # Deployment-Konfigurationen
├── scripts/
│   ├── start-php.bat/sh   # Start-Scripts
│   └── stop-php.bat/sh    # Stop-Scripts
├── docker-compose-php.yml
├── .env.php
├── README.md
├── MIGRATION-PHP.md
└── CLEANUP.md (diese Datei)
```

## Überprüfung

Nach dem Cleanup können Sie überprüfen, ob alles funktioniert:

```bash
# Dienste starten
scripts\start-php.bat    # Windows
./scripts/start-php.sh   # Linux/Mac

# Testen
# - Öffnen Sie http://localhost:8080
# - Registrieren Sie einen Benutzer
# - Erstellen Sie eine Schicht
# - Melden Sie sich für eine Schicht an
```

## Rückgängig machen

Falls Sie das Cleanup rückgängig machen möchten, können Sie die alten Dateien aus Git wiederherstellen:

```bash
git checkout HEAD -- <dateiname>
```

Oder das gesamte Repository zurücksetzen:

```bash
git reset --hard HEAD
```

**Hinweis:** Stellen Sie sicher, dass Sie vor dem Cleanup ein Backup erstellen, falls Sie unsicher sind!
