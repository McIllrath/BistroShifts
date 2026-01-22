# BistroShifts - Production Deployment (ohne Docker)

## Voraussetzungen

- **Webserver:** Apache 2.4+ oder Nginx
- **PHP:** 8.2+
- **MySQL:** 8.0+
- **SSH/Terminal-Zugriff** auf den Server
- **Composer** (Optional, für PHP-Dependencies - hier nicht nötig)

## Installation Schritt-für-Schritt

### 1. Server vorbereiten

```bash
# Update System
sudo apt update && sudo apt upgrade -y

# PHP installieren
sudo apt install php8.2 php8.2-cli php8.2-mysql php8.2-pdo php8.2-json php8.2-curl php8.2-mbstring -y

# MySQL Server installieren
sudo apt install mysql-server -y

# Apache installieren (falls nicht vorhanden)
sudo apt install apache2 -y

# Apache Module aktivieren
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod php8.2
```

### 2. MySQL Datenbank erstellen

```bash
# Mit MySQL verbinden
mysql -u root -p

# In MySQL:
```sql
CREATE DATABASE bistroshifts CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bistro'@'localhost' IDENTIFIED BY 'SICHERES_PASSWORT_HIER';
GRANT ALL PRIVILEGES ON bistroshifts.* TO 'bistro'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Datenbank-Schema importieren

```bash
# Schema in die Datenbank importieren
mysql -u bistro -p bistroshifts < /path/to/schema.sql

# Passwort eingeben, das oben gesetzt wurde
```

### 3. Dateien auf den Server hochladen

```bash
# Via SCP/SSH:
scp -r server/php/* user@your-domain.com:/var/www/bistroshifts/api/
scp -r client-build/* user@your-domain.com:/var/www/bistroshifts/

# Oder via FTP:
# - Lade client-build/* in /var/www/bistroshifts/ hoch
# - Lade server/php/* in /var/www/bistroshifts/api/ hoch
```

### 4. Environment-Datei konfigurieren

```bash
# Auf dem Server:
sudo nano /var/www/bistroshifts/api/.env
```

Inhalt (anpassen):
```
DB_HOST=localhost
DB_NAME=bistroshifts
DB_USER=bistro
DB_PASSWORD=SICHERES_PASSWORT_HIER
JWT_SECRET=EXTREM_SICHERER_ZUFAELLIGER_STRING_HIER
```

### 5. Dateiberechtigungen setzen

```bash
cd /var/www/bistroshifts

# Webserver-Benutzer als Eigentümer
sudo chown -R www-data:www-data .
sudo chmod -R 755 .

# .env Datei schützen
sudo chmod 600 api/.env
```

### 6. Apache Virtual Host konfigurieren

Erstelle `/etc/apache2/sites-available/bistroshifts.conf`:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    DocumentRoot /var/www/bistroshifts

    # API Routing
    <Directory /var/www/bistroshifts/api>
        AllowOverride All
        Require all granted
        
        # Rewrite engine für API routing
        RewriteEngine On
        RewriteBase /api/
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^(.*)$ index.php [QSA,L]
    </Directory>

    # Client SPA
    <Directory /var/www/bistroshifts>
        AllowOverride All
        Require all granted
        
        # Serve index.html for non-API routes (SPA fallback)
        RewriteEngine On
        RewriteBase /
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/api/
        RewriteRule ^(.*)$ /index.html [QSA,L]
    </Directory>

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/bistroshifts_error.log
    CustomLog ${APACHE_LOG_DIR}/bistroshifts_access.log combined

    # Security Headers
    <IfModule mod_headers.c>
        Header set X-Content-Type-Options "nosniff"
        Header set X-Frame-Options "SAMEORIGIN"
        Header set X-XSS-Protection "1; mode=block"
        Header set Referrer-Policy "strict-origin-when-cross-origin"
    </IfModule>

    # CORS Headers (für lokale Entwicklung - einschränken in Produktion!)
    <IfModule mod_headers.c>
        Header set Access-Control-Allow-Origin "*"
        Header set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        Header set Access-Control-Allow-Headers "Content-Type, Authorization"
    </IfModule>
</VirtualHost>

# HTTPS Redirect (nach SSL-Setup)
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>
```

Aktiviere den Virtual Host:

```bash
sudo a2ensite bistroshifts.conf
sudo systemctl restart apache2
```

### 7. Nginx Alternative

Falls du Nginx verwendest, verwende stattdessen diese Konfiguration in `/etc/nginx/sites-available/bistroshifts`:

```nginx
upstream php_backend {
    server unix:/var/run/php/php8.2-fpm.sock;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/bistroshifts;

    # API requests
    location /api {
        alias /var/www/bistroshifts/api;
        try_files $uri $uri/ /api/index.php?$query_string;

        location ~ \.php$ {
            fastcgi_pass php_backend;
            fastcgi_index index.php;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

    # Client static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # PHP Handler
    location ~ \.php$ {
        fastcgi_pass php_backend;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # Security
    location ~ /\. {
        deny all;
    }

    error_log /var/log/nginx/bistroshifts_error.log;
    access_log /var/log/nginx/bistroshifts_access.log;
}
```

Aktiviere:
```bash
sudo ln -s /etc/nginx/sites-available/bistroshifts /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### 8. HTTPS mit Let's Encrypt (empfohlen)

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-apache -y  # für Apache
# oder
sudo apt install certbot python3-certbot-nginx -y   # für Nginx

# Zertifikat beantragen
sudo certbot certonly --apache -d your-domain.com -d www.your-domain.com
# oder
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Auto-Renewal testen
sudo certbot renew --dry-run
```

### 9. Firewall konfigurieren

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 10. Log-Rotation

Erstelle `/etc/logrotate.d/bistroshifts`:

```
/var/log/apache2/bistroshifts_*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        /usr/lib/apache2/apache2ctl graceful > /dev/null 2>&1 || true
    endscript
}
```

## Verzeichnisstruktur

```
/var/www/bistroshifts/
├── index.html              # React SPA
├── assets/                 # JS/CSS/Fonts
│   ├── index-*.js
│   ├── index-*.css
│   └── bootstrap-icons-*.woff2
└── api/                    # PHP Backend
    ├── index.php           # Main Router
    ├── .env                # Environment Secrets
    ├── .htaccess           # Apache Rewrite Rules
    ├── config/
    │   ├── database.php
    │   └── jwt.php
    ├── controllers/
    ├── middleware/
    ├── utils/
    └── public/             # (optional) public files
```

## Troubleshooting

### 404 bei /api/... Requests

**Problem:** API-Aufrufe geben 404 zurück

**Lösung (Apache):**
- `.htaccess` existiert und ist lesbar
- `mod_rewrite` ist aktiviert: `sudo a2enmod rewrite`
- AllowOverride ist auf `All` gesetzt

**Lösung (Nginx):**
- Prüfe try_files in der Location /api
- Stelle sicher, dass PHP-FPM läuft

### 500 Fehler bei Event-Erstellung

**Problem:** POST `/api/events` gibt 500 zurück

**Lösung:**
```bash
# Logs prüfen
tail -50 /var/log/apache2/bistroshifts_error.log
# oder
tail -50 /var/log/nginx/bistroshifts_error.log

# MySQL verbindung prüfen
mysql -u bistro -p -h localhost bistroshifts

# PHP Fehler-Reporting aktivieren (nur für Debugging!)
# In .env:
DEBUG=1
```

### Datenbankverbindung fehlgeschlagen

```bash
# MySQL läuft?
sudo systemctl status mysql

# Credentials prüfen
mysql -u bistro -p -h localhost bistroshifts

# Berechtigungen prüfen
mysql -u root -p
SHOW GRANTS FOR 'bistro'@'localhost';
```

### Dateiberechtigungen-Fehler

```bash
# Korrigieren:
sudo chown -R www-data:www-data /var/www/bistroshifts
sudo chmod -R 755 /var/www/bistroshifts
sudo chmod 600 /var/www/bistroshifts/api/.env
```

## Performance-Tipps

### PHP-FPM für Nginx

```bash
sudo apt install php8.2-fpm -y
sudo systemctl enable php8.2-fpm
```

### OpCache aktivieren

In PHP-Konfiguration aktivieren:
```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=4000
opcache.revalidate_freq=60
```

### Gzip Compression

**Apache (.htaccess):**
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

**Nginx:**
```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
```

### Caching

**Apache (.htaccess):**
```apache
<FilesMatch "\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$">
    Header set Cache-Control "max-age=2592000, public"
</FilesMatch>
```

**Nginx:**
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

## Backups

### Automatische MySQL-Backups

Erstelle `/home/user/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/user/backups"
DB_NAME="bistroshifts"
DB_USER="bistro"
DB_PASS="PASSWORT"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/bistroshifts_$DATE.sql.gz

# Alte Backups löschen (älter als 30 Tage)
find $BACKUP_DIR -name "bistroshifts_*.sql.gz" -mtime +30 -delete

echo "Backup erstellt: $BACKUP_DIR/bistroshifts_$DATE.sql.gz"
```

Cron-Job hinzufügen:
```bash
crontab -e

# Täglich um 02:00 Uhr:
0 2 * * * /home/user/backup-db.sh
```

## Monitoring

Installiere Monitoring-Tools:

```bash
# System-Monitoring
sudo apt install htop iotop nethogs -y

# Log-Monitoring
sudo apt install logwatch -y
```

## Zusammenfassung

- ✅ PHP 8.2 + MySQL 8.0 auf separatem Server
- ✅ API unter `/api/` mit Apache/Nginx Rewriting
- ✅ React SPA unter `/` mit Fallback zu index.html
- ✅ HTTPS mit Let's Encrypt
- ✅ Automatische Backups
- ✅ Performance-Optimierungen

Bei Fragen oder Problemen siehe Troubleshooting-Sektion!
