#!/bin/bash
# BistroShifts Production Deployment Helper
# Lädt Dateien auf den Webserver hoch und konfiguriert alles

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  BistroShifts Production Deployment Helper                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
read -p "Webserver Hostname (z.B. example.com): " DOMAIN
read -p "SSH Benutzer (z.B. user@example.com): " SSH_USER
read -p "Ziel-Verzeichnis (Standard: /var/www/bistroshifts): " TARGET_DIR
TARGET_DIR=${TARGET_DIR:-/var/www/bistroshifts}

read -p "MySQL Benutzer (Standard: bistro): " DB_USER
DB_USER=${DB_USER:-bistro}

read -sp "MySQL Passwort: " DB_PASS
echo ""

read -sp "JWT Secret (SICHERER ZUFÄLLIGER STRING): " JWT_SECRET
echo ""

echo ""
echo -e "${YELLOW}Zusammenfassung:${NC}"
echo "  Domain: $DOMAIN"
echo "  SSH: $SSH_USER"
echo "  Zielverzeichnis: $TARGET_DIR"
echo "  MySQL User: $DB_USER"
echo "  JWT Secret: [***geschützt***]"
echo ""

read -p "Fortfahren? (j/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Jj]$ ]]; then
    echo "Abgebrochen."
    exit 0
fi

# Check ob SSH funktioniert
echo ""
echo -e "${YELLOW}Verbinde zum Server...${NC}"
if ! ssh -o ConnectTimeout=5 $SSH_USER "echo 'SSH verbindung OK'" > /dev/null 2>&1; then
    echo -e "${RED}Fehler: SSH-Verbindung fehlgeschlagen!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ SSH-Verbindung erfolgreich${NC}"

# Dateien vorbereiten (falls noch nicht gebaut)
echo ""
echo -e "${YELLOW}Client bauen...${NC}"
cd "$(dirname "$0")/client"
if [ -d "node_modules" ]; then
    npm run build
else
    echo -e "${YELLOW}npm install wird übersprungen - verwende bestehende dist/${NC}"
fi
cd - > /dev/null

# Zielverzeichnis auf Server erstellen
echo ""
echo -e "${YELLOW}Erstelle Verzeichnisse auf dem Server...${NC}"
ssh $SSH_USER "sudo mkdir -p $TARGET_DIR/api $TARGET_DIR/assets && sudo chown -R \$USER:\$USER $TARGET_DIR"

# Dateien hochladen
echo ""
echo -e "${YELLOW}Lade Client-Dateien hoch...${NC}"
rsync -avz --delete client/dist/ $SSH_USER:$TARGET_DIR/

echo -e "${GREEN}✓ Client hochgeladen${NC}"

echo ""
echo -e "${YELLOW}Lade API-Dateien hoch...${NC}"
rsync -avz --delete server/php/ $SSH_USER:$TARGET_DIR/api/

echo -e "${GREEN}✓ API hochgeladen${NC}"

# .env Datei erstellen
echo ""
echo -e "${YELLOW}Erstelle .env Datei...${NC}"
cat > /tmp/bistroshifts_env.tmp << EOF
DB_HOST=localhost
DB_NAME=bistroshifts
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SECRET
EOF

scp /tmp/bistroshifts_env.tmp $SSH_USER:$TARGET_DIR/api/.env
rm /tmp/bistroshifts_env.tmp

echo -e "${GREEN}✓ .env Datei erstellt${NC}"

# Berechtigungen setzen
echo ""
echo -e "${YELLOW}Setze Berechtigungen...${NC}"
ssh $SSH_USER "
    cd $TARGET_DIR
    sudo chown -R www-data:www-data .
    sudo chmod -R 755 .
    sudo chmod 600 api/.env
"

echo -e "${GREEN}✓ Berechtigungen gesetzt${NC}"

# Apache/Nginx Konfiguration
echo ""
echo -e "${YELLOW}Konfiguriere Webserver...${NC}"
read -p "Webserver Typ? (a)pache oder (n)ginx: " WEB_TYPE

if [[ "$WEB_TYPE" =~ ^[Aa]$ ]]; then
    ssh $SSH_USER "sudo a2enmod rewrite headers && sudo systemctl restart apache2"
    echo -e "${GREEN}✓ Apache konfiguriert${NC}"
elif [[ "$WEB_TYPE" =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}Nginx-Konfiguration manuell aus PRODUCTION_DEPLOYMENT.md verwenden!${NC}"
else
    echo -e "${YELLOW}Übersprungen - manuelle Konfiguration erforderlich${NC}"
fi

# Datenbank-Schema importieren
echo ""
read -p "MySQL Schema jetzt importieren? (j/n): " IMPORT_DB
if [[ "$IMPORT_DB" =~ ^[Jj]$ ]]; then
    echo -e "${YELLOW}Importiere Schema...${NC}"
    scp server/schema.sql $SSH_USER:/tmp/schema.sql
    ssh $SSH_USER "mysql -u root -p -e 'CREATE DATABASE IF NOT EXISTS bistroshifts; USE bistroshifts; SOURCE /tmp/schema.sql;'"
    ssh $SSH_USER "rm /tmp/schema.sql"
    echo -e "${GREEN}✓ Schema importiert${NC}"
fi

# Zusammenfassung
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Deployment abgeschlossen!                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Nächste Schritte:${NC}"
echo "1. Öffne https://$DOMAIN"
echo "2. Registriere einen neuen Benutzer (wird automatisch Admin)"
echo "3. Überprüfe .env auf Sicherheit (kein Debug-Modus!)"
echo ""
echo -e "${YELLOW}Wichtig:${NC}"
echo "- Sichere .env Datei (chmod 600)"
echo "- Aktiviere HTTPS mit Let's Encrypt"
echo "- Setze starke Passwörter"
echo "- Richte automatische Backups ein"
echo ""
