# Production Deployment Checkliste

## Vorbereitung (lokal)

- [ ] Client bauen: `cd client && npm run build`
- [ ] Deployment-Skript ausführen: `deploy.bat` (Windows) oder `deploy.sh` (Linux/Mac)
- [ ] `deploy-prod/` Verzeichnis überprüfen

## Server Vorbereitung

### SSH/Terminal Zugriff
- [ ] SSH-Zugriff zum Server testen
- [ ] Root/Sudo-Zugriff vorhanden
- [ ] Dokumentation: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

### System-Pakete installieren
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install php8.2 php8.2-cli php8.2-mysql php8.2-pdo -y
sudo apt install mysql-server -y
sudo apt install apache2 -y  # oder nginx
```

- [ ] PHP 8.2 installiert: `php -v`
- [ ] MySQL 8.0 installiert: `mysql --version`
- [ ] Webserver installiert: `apache2ctl -v` oder `nginx -v`

## Datenbankeinrichtung

```bash
# MySQL öffnen
mysql -u root -p

# Datenbank und Benutzer erstellen:
CREATE DATABASE bistroshifts CHARACTER SET utf8mb4;
CREATE USER 'bistro'@'localhost' IDENTIFIED BY 'STARKES_PASSWORT';
GRANT ALL PRIVILEGES ON bistroshifts.* TO 'bistro'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Schema importieren
mysql -u bistro -p bistroshifts < schema.sql
```

- [ ] Datenbank `bistroshifts` existiert
- [ ] Benutzer `bistro` existiert
- [ ] Tabellen importiert: `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='bistroshifts';`

## Dateien hochladen

### Via WinSCP (Windows-GUI)
- [ ] Verbindung hergestellt
- [ ] Dateien in `/var/www/bistroshifts` hochgeladen

### Via SCP (Terminal)
```bash
scp -r deploy-prod/bistroshifts/* user@example.com:/var/www/bistroshifts/
```
- [ ] SCP-Upload erfolgreich

### Via FTP
- [ ] FTP-Zugriff funktioniert
- [ ] Dateien in `/var/www/bistroshifts` hochgeladen

## Konfiguration

```bash
cd /var/www/bistroshifts

# .env erstellen und sichern
sudo nano api/.env
# Eintragen:
# DB_HOST=localhost
# DB_NAME=bistroshifts
# DB_USER=bistro
# DB_PASSWORD=PASSWORT_VOM_OBEN
# JWT_SECRET=EXTREM_SICHERER_ZUFALLSSTRING

# Berechtigungen
sudo chown -R www-data:www-data .
sudo chmod -R 755 .
sudo chmod 600 api/.env
```

- [ ] `.env` Datei erstellt
- [ ] `.env` Datei korrekt gesichert (chmod 600)
- [ ] JWT_SECRET ist sicher/zufällig

## Webserver-Konfiguration

### Apache
```bash
# Virtual Host erstellen
sudo nano /etc/apache2/sites-available/example.conf
# (Inhalt aus PRODUCTION_DEPLOYMENT.md kopieren)

# Aktivieren
sudo a2ensite example.conf
sudo a2enmod rewrite
sudo a2enmod headers
sudo systemctl restart apache2
```

- [ ] Virtual Host konfiguriert
- [ ] mod_rewrite aktiv: `apache2ctl -M | grep rewrite`
- [ ] Apache neugestartet

### Nginx
```bash
sudo nano /etc/nginx/sites-available/example
# (Inhalt aus PRODUCTION_DEPLOYMENT.md kopieren)

sudo ln -s /etc/nginx/sites-available/example /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

- [ ] Nginx-Config erstellt
- [ ] Config validiert: `nginx -t`
- [ ] Nginx neugestartet

## HTTPS Setup

```bash
# Certbot installieren (Apache)
sudo apt install certbot python3-certbot-apache -y
sudo certbot certonly --apache -d example.com -d www.example.com

# oder Certbot (Nginx)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d example.com -d www.example.com

# Auto-Renewal testen
sudo certbot renew --dry-run
```

- [ ] Let's Encrypt Zertifikat beantragt
- [ ] HTTPS funktioniert: `https://example.com`
- [ ] Auto-Renewal aktiviert

## Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

- [ ] Firewall-Regeln gesetzt
- [ ] Port 22/80/443 offen

## Testing

### Lokales Testing (vor Live)
- [ ] Frontend lädt: `https://example.com`
- [ ] Assets laden (JS/CSS): DevTools Network
- [ ] Registrierung möglich
- [ ] Login möglich
- [ ] Shifts/Events anzeigen
- [ ] Datenbankoperationen funktionieren

### API Testing
```bash
# Health-Check
curl https://example.com/api/health

# Registrierung
curl -X POST https://example.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","display_name":"Test"}'

# Login
curl -X POST https://example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

- [ ] API Health-Check OK
- [ ] Registration funktioniert
- [ ] Login funktioniert
- [ ] JWT Token wird zurückgegeben

## Sicherheit Hardening

```bash
# Dateiberechtigungen nochmal prüfen
sudo find /var/www/bistroshifts -type f -perm 777 -delete
sudo chmod 750 /var/www/bistroshifts

# Logs einrichtung
sudo chown -R syslog:adm /var/log/apache2 /var/log/nginx

# Backup-Verzeichnis
sudo mkdir -p /home/backups/bistroshifts
sudo chmod 700 /home/backups/bistroshifts
```

- [ ] Dateiberechtigungen korrekt
- [ ] Logs funktionieren
- [ ] Backup-Verzeichnis erstellt

## Backups

```bash
# Backup-Script erstellen
sudo nano /usr/local/bin/backup-bistroshifts.sh
# (Inhalt aus PRODUCTION_DEPLOYMENT.md)

sudo chmod +x /usr/local/bin/backup-bistroshifts.sh

# Cron-Job hinzufügen
sudo crontab -e
# Hinzufügen: 0 2 * * * /usr/local/bin/backup-bistroshifts.sh
```

- [ ] Backup-Script erstellt
- [ ] Backup-Verzeichnis gesichert
- [ ] Cron-Job aktiv

## Monitoring

```bash
# Monitoring-Tools
sudo apt install htop iotop nethogs logwatch -y

# Logs überwachen
tail -f /var/log/apache2/bistroshifts_error.log
# oder
tail -f /var/log/nginx/bistroshifts_error.log
```

- [ ] Monitoring-Tools installiert
- [ ] Logs können überwacht werden

## Go-Live

- [ ] Alle Checkboxen oben erledigt
- [ ] Testbenutzer erstellt und getestet
- [ ] DNS auf neue IP zeigen
- [ ] SSL-Zertifikat gültig
- [ ] Backups laufen
- [ ] Monitoring aktiv

### Erste echte Benutzer
1. Benutzer registrieren (wird automatisch Admin)
2. Admin-Panel testen
3. Schichten erstellen
4. User-Verwaltung testen

## Notfall-Kontakte

- **Webserver Support:** [your support contact]
- **Datenbank-Backup-Pfad:** `/home/backups/bistroshifts/`
- **Log-Pfade:** 
  - Apache: `/var/log/apache2/bistroshifts_*.log`
  - Nginx: `/var/log/nginx/bistroshifts_*.log`

## Dokumentation für Admin

Speichere diese Informationen sicher:
- [ ] MySQL Passwort (bistro Benutzer)
- [ ] JWT_SECRET
- [ ] Certbot Auto-Renewal aktiviert
- [ ] Regelmäßige Backups laufen
- [ ] SSH-Keys gesichert

---

**Status:** ⏳ Vorbereitung | 🚀 Go-Live | ✅ Produktiv

**Datum:** ___________
**Durchgeführt von:** ___________
**Notizen:** ___________
