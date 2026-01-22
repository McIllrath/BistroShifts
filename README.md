# BistroShifts

Eine Schichtverwaltungs-Anwendung für Bistro-Teams mit Event-Vorschlägen und Benutzerverwaltung.

**Tech Stack:** React + PHP + MySQL

## 🚀 Schnellstart

### Mit Docker (empfohlen)

1. **Environment-Variablen konfigurieren:**
   ```bash
   # .env.php anpassen - insbesondere JWT_SECRET ändern!
   ```

2. **Dienste starten:**
   ```bash
   # Windows:
   scripts\start-php.bat
   
   # Linux/Mac:
   ./scripts/start-php.sh
   ```

3. **Zugriff:**
   - **Anwendung:** http://localhost:8080
   - **phpMyAdmin:** http://localhost:8081
   - **MySQL:** localhost:3306

### Manuell (ohne Docker)

Siehe [MIGRATION-PHP.md](MIGRATION-PHP.md) für detaillierte Installations- und Deployment-Anleitung.

## 📁 Projekt-Struktur

```
BistroShifts/
├── client/              # React Frontend (Vite)
├── server/
│   ├── php/            # PHP 8.2 Backend
│   │   ├── config/     # Datenbank, JWT Config
│   │   ├── controllers/# Auth, Shifts, Users, Events
│   │   ├── middleware/ # Authentication
│   │   └── utils/      # Helper Functions
│   └── schema.sql      # MySQL Datenbankschema
├── docker-compose-php.yml  # Docker Setup
├── .env.php            # Environment-Variablen
└── scripts/            # Start/Stop Scripts
```

## ⚙️ Dienste stoppen

```bash
# Windows:
scripts\stop-php.bat

# Linux/Mac:
./scripts/stop-php.sh
```

## 🔒 Sicherheit

**Wichtig für Produktion:**
- Ändern Sie `JWT_SECRET` in `.env.php`
- Verwenden Sie starke Datenbankpasswörter
- Aktivieren Sie HTTPS/SSL
- Implementieren Sie Rate Limiting auf Webserver-Ebene

## 📚 Dokumentation

- **[MIGRATION-PHP.md](MIGRATION-PHP.md)** - Vollständige Installations-, Deployment- und API-Dokumentation
- **[deploy/DEPLOY.md](deploy/DEPLOY.md)** - Produktions-Deployment Anleitung

## 🔄 Migration von Node.js

Die Anwendung wurde von Node.js/SQLite auf PHP/MySQL migriert. Alle API-Endpunkte sind identisch geblieben, der Client benötigt keine Änderungen.

Details siehe [MIGRATION-PHP.md](MIGRATION-PHP.md).

## 🧹 Alte Dateien entfernen

Falls Sie von einer älteren Node.js-Version upgraden, können Sie alte Dateien mit dem Cleanup-Script entfernen:

```bash
# Windows:
cleanup.bat

# Linux/Mac:
chmod +x cleanup.sh
./cleanup.sh
```

Details siehe [CLEANUP.md](CLEANUP.md).