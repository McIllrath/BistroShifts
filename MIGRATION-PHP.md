# BistroShifts - PHP/MySQL Migration

## Übersicht

Die Anwendung wurde von Node.js/SQLite auf **PHP/MySQL** umgestellt. Das neue Backend verwendet:

- **PHP 8.2** mit Apache
- **MySQL 8.0** Datenbank
- **PDO** für sichere Datenbankzugriffe
- **JWT** für Authentication
- **Docker** für einfaches Deployment

## Verzeichnisstruktur

```
BistroShifts/
├── server/
│   ├── php/                    # Neues PHP Backend
│   │   ├── config/
│   │   │   ├── database.php    # Datenbank-Konfiguration
│   │   │   └── jwt.php         # JWT Implementierung
│   │   ├── controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── ShiftsController.php
│   │   │   ├── UsersController.php
│   │   │   └── EventsController.php
│   │   ├── middleware/
│   │   │   └── auth.php        # Authentication Middleware
│   │   ├── utils/
│   │   │   ├── response.php    # HTTP Response Helper
│   │   │   └── email.php       # Email Funktionen
│   │   ├── index.php           # Main Router
│   │   ├── .htaccess           # Apache Rewrite Rules
│   │   ├── .env.example        # Environment Template
│   │   └── Dockerfile          # Docker Build
│   └── schema.sql              # MySQL Datenbankschema
├── docker-compose-php.yml      # Docker Compose für PHP/MySQL
├── .env.php                    # Environment Variablen
└── scripts/
    ├── start-php.bat/sh        # Start Skripte
    └── stop-php.bat/sh         # Stop Skripte
```

## Installation & Start

### Voraussetzungen

- Docker und Docker Compose installiert

### Schnellstart

1. **Environment-Variablen konfigurieren:**
   ```bash
   # .env.php anpassen (JWT_SECRET ändern!)
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

### Manueller Start

```bash
docker-compose -f docker-compose-php.yml --env-file .env.php up -d
```

### Dienste stoppen

```bash
# Windows:
scripts\stop-php.bat

# Linux/Mac:
./scripts/stop-php.sh
```

## API-Endpunkte

Alle Endpunkte sind identisch zur Node.js-Version geblieben:

### Authentication
- `POST /api/auth/register` - Benutzer registrieren
- `POST /api/auth/login` - Benutzer anmelden
- `GET /api/auth/me` - Aktueller Benutzer (auth required)

### Shifts
- `GET /api/shifts` - Alle aktiven Schichten (public)
- `GET /api/shifts/:id` - Schicht Details
- `POST /api/shifts/:id/signups` - Für Schicht anmelden (auth required)
- `POST /api/shifts` - Schicht erstellen (admin)
- `PUT /api/shifts/:id` - Schicht aktualisieren (admin)
- `DELETE /api/shifts/:id` - Schicht löschen (admin)
- `GET /api/shifts/:id/participants` - Teilnehmer anzeigen (admin)
- `DELETE /api/shifts/:id/participants/:signupId` - Teilnehmer entfernen (admin)

### Users
- `GET /api/users` - Alle Benutzer (admin)
- `POST /api/users` - Benutzer erstellen (admin)
- `DELETE /api/users/:id` - Benutzer löschen (admin)
- `PATCH /api/users/:id/role` - Rolle ändern (admin)

### Events
- `GET /api/events` - Events auflisten
- `POST /api/events` - Event-Vorschlag erstellen (auth required)
- `GET /api/events/:id` - Event Details (auth required)
- `PATCH /api/events/:id/status` - Event genehmigen/ablehnen (admin)
- `DELETE /api/events/:id` - Event löschen (admin/creator)

## Datenbank

### Schema

Die MySQL-Datenbank verwendet das Schema in `server/schema.sql`:

- `users` - Benutzer mit Authentifizierung
- `events` - Event-Vorschläge
- `shifts` - Schichten
- `signups` - Schicht-Anmeldungen
- `audit_logs` - Audit Trail

### Zugriff

**Mit phpMyAdmin:**
- URL: http://localhost:8081
- Server: db
- Benutzer: bistro (siehe .env.php)
- Passwort: bistropass (siehe .env.php)

**Mit MySQL Client:**
```bash
mysql -h localhost -P 3306 -u bistro -pbistropass bistroshifts
```

### Migration von SQLite

Falls Sie Daten von der alten SQLite-Datenbank migrieren möchten:

1. Exportieren Sie Daten aus SQLite
2. Passen Sie SQL-Syntax für MySQL an
3. Importieren Sie via phpMyAdmin oder MySQL CLI

## Client-Integration

Der React-Client benötigt **keine Änderungen**, da die API-Schnittstelle identisch geblieben ist. Die Umgebungsvariable `VITE_API_URL` kann auf den PHP-Server zeigen:

```env
# Entwicklung
VITE_API_URL=http://localhost:8080

# Produktion  
VITE_API_URL=https://your-domain.com
```

## Deployment (Produktion)

### Apache Virtual Host

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/bistroshifts/server/php
    
    <Directory /var/www/bistroshifts/server/php>
        AllowOverride All
        Require all granted
    </Directory>
    
    # Client-Dateien
    Alias /client /var/www/bistroshifts/client-build
    <Directory /var/www/bistroshifts/client-build>
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/bistroshifts_error.log
    CustomLog ${APACHE_LOG_DIR}/bistroshifts_access.log combined
</VirtualHost>
```

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/bistroshifts;
    
    # API requests to PHP
    location /api {
        alias /var/www/bistroshifts/server/php;
        index index.php;
        try_files $uri $uri/ /server/php/index.php?$query_string;
        
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_index index.php;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }
    
    # Client
    location / {
        root /var/www/bistroshifts/client-build;
        try_files $uri $uri/ /index.html;
    }
}
```

### Umgebungsvariablen setzen

```bash
# .env Datei im PHP-Verzeichnis erstellen
cp server/php/.env.example server/php/.env

# Anpassen:
# - DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
# - JWT_SECRET (wichtig!)
# - Email-Konfiguration (optional)
```

### Datenbank initialisieren

```bash
mysql -u root -p < server/schema.sql
```

## Sicherheit

### Wichtige Sicherheitshinweise

1. **JWT Secret ändern:** Setzen Sie einen sicheren, zufälligen String in `.env.php`
2. **Datenbankpasswörter:** Verwenden Sie starke Passwörter in Produktion
3. **HTTPS:** Verwenden Sie SSL/TLS in Produktion
4. **File Permissions:** PHP-Dateien sollten nicht schreibbar sein
5. **.env Dateien:** Niemals in Git committen

### Rate Limiting

Für Produktionsumgebungen sollte Rate Limiting auf Apache/Nginx-Ebene implementiert werden (z.B. mit mod_evasive oder nginx limit_req).

## Troubleshooting

### Docker-Container starten nicht

```bash
# Logs anzeigen
docker-compose -f docker-compose-php.yml logs

# Container neu bauen
docker-compose -f docker-compose-php.yml build --no-cache
docker-compose -f docker-compose-php.yml up -d
```

### Datenbankverbindung fehlgeschlagen

1. Prüfen Sie `.env.php` Konfiguration
2. Warten Sie, bis MySQL vollständig gestartet ist
3. Prüfen Sie Container-Logs: `docker logs bistroshifts_db`

### API gibt 404 zurück

1. Prüfen Sie `.htaccess` ist vorhanden
2. Stellen Sie sicher, dass mod_rewrite aktiviert ist
3. Prüfen Sie Apache-Logs im Container

### CORS-Fehler

Die CORS-Header sind in `server/php/index.php` konfiguriert. Passen Sie diese bei Bedarf an.

## Unterschiede zu Node.js-Version

### Was wurde geändert:

- **Runtime:** Node.js → PHP 8.2
- **Datenbank:** SQLite → MySQL 8.0
- **Datenbankzugriff:** Knex.js → PDO
- **JWT:** jsonwebtoken (npm) → Custom PHP Implementation
- **Password Hashing:** bcryptjs → password_hash/password_verify

### Was ist gleich geblieben:

- ✅ Alle API-Endpunkte und Responses
- ✅ JWT Token-Format und Authentifizierung
- ✅ Datenbankschema (angepasst für MySQL)
- ✅ Client-Code (keine Änderungen nötig)
- ✅ Business Logic und Validierung

## Support

Bei Fragen oder Problemen:

1. Prüfen Sie die Logs: `docker-compose -f docker-compose-php.yml logs -f`
2. Prüfen Sie phpMyAdmin für Datenbankprobleme
3. Prüfen Sie Apache Error Logs im Container

## Lizenz

Gleiche Lizenz wie die ursprüngliche Anwendung.
