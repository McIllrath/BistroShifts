# Passwort-Vergessen Feature

Vollständige Implementierung eines sicheren Passwort-Reset-Systems mit Token-Validierung und Email-Versand.

## Features

✅ **Sichere Token-Generierung**
- 32-byte (256-bit) zufällige Tokens
- Eindeutige Tokens in der Datenbank
- Token-Ablauf nach 1 Stunde
- Token wird nach Verwendung invalidiert

✅ **Benutzerfreundliche UI**
- "Passwort vergessen?" Link auf Login-Seite
- Email-Eingabe Formular
- Bestätigungs-Nachricht nach Email-Versand
- Reset-Link mit Token in der URL
- Neues Passwort setzen Seite

✅ **Sicherheitsfeatures**
- Keine Email-Existenzbestätigung (verhindert User Enumeration)
- Passwort mit bcrypt gehashed
- Frühere Reset-Tokens werden invalidiert
- Token läuft nach 1 Stunde ab
- Audit Logs für alle Password-Reset Aktivitäten

✅ **Datenbank Integration**
- `password_reset_tokens` Tabelle
- Indexes auf user_id, token, expires_at
- Foreign Key mit ON DELETE CASCADE

## API Endpoints

### 1. Passwort-Reset anfordern
```bash
POST /api/password/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

# Response: 200 OK
{
  "message": "Wenn diese E-Mail existiert, erhalten Sie einen Reset-Link"
}
```

### 2. Token validieren
```bash
GET /api/password/validate-token?token=<token>

# Response: 200 OK (valid token)
{
  "valid": true,
  "message": "Token ist gültig"
}

# Response: 400 Bad Request (invalid/expired token)
{
  "error": "Ungültiger oder abgelaufener Token"
}
```

### 3. Passwort zurücksetzen
```bash
POST /api/password/reset
Content-Type: application/json

{
  "token": "<reset_token>",
  "password": "neuespasswort123"
}

# Response: 200 OK
{
  "message": "Passwort erfolgreich zurückgesetzt"
}

# Response: 400 Bad Request (invalid token or weak password)
{
  "error": "Ungültiger oder abgelaufener Reset-Link"
}
```

## Frontend Flows

### 1. Login mit "Passwort vergessen" Link
```
Login Seite
    ↓
[Passwort vergessen?] Button
    ↓
Forgot Password Seite (Email Input)
    ↓
Email eingeben
    ↓
"Reset-Link wurde versendet" Bestätigung
    ↓
User klickt auf Email-Link: https://example.com/password-reset?token=abc123...
    ↓
PasswordReset Komponente lädt mit Token aus URL
    ↓
Neues Passwort eingeben
    ↓
Passwort wird geändert
    ↓
Redirect zu Login Seite
```

### 2. Komponenten

**Login.jsx**
- Neue "forgot-password" Mode
- Zeigt Email-Input mit Reset-Button
- Bestätigung wenn Email versendet wurde

**PasswordReset.jsx** (neue Komponente)
- Wird auf Route `/password-reset` angezeigt
- Extrahiert Token aus URL-Parametern
- Neues Passwort Eingabe-Formular
- Erfolgs-Nachricht mit Redirect zu Login

**App.jsx**
- Zeigt PasswordReset Komponente bei `/password-reset` Route
- Fallback zu normalem App für andere Routes

## Datenbank Schema

```sql
CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);
```

## Email Funktion

Wird aufgerufen von `PasswordController::sendResetEmail()`:

```php
private function sendResetEmail($email, $displayName, $token) {
    $resetUrl = "https://example.com/password-reset?token=" . $token;
    
    $subject = 'Passwort zurücksetzen - BistroShifts';
    $message = "
        <h2>Passwort zurücksetzen</h2>
        <p>Hallo $displayName,</p>
        <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
        <p><a href=\"$resetUrl\">Passwort zurücksetzen</a></p>
        <p>Dieser Link verfällt in 1 Stunde.</p>
        <p>Wenn Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
    ";
    
    EmailService::send($email, $subject, $message);
}
```

**Hinweis:** Email-Funktion ist noch als Placeholder implementiert. Siehe [EMAIL_SETUP.md](server/EMAIL_SETUP.md) für SMTP-Konfiguration.

## Testing

### Test 1: Passwort vergessen anfordern
```bash
curl -X POST http://localhost:8080/api/password/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Test 2: Token validieren
```bash
curl "http://localhost:8080/api/password/validate-token?token=TOKEN_HERE"
```

### Test 3: Passwort zurücksetzen
```bash
curl -X POST http://localhost:8080/api/password/reset \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_HERE","password":"newpass123"}'
```

### Test 4: Mit neuem Passwort anmelden
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"newpass123"}'
```

## Sicherheitsüberlegungen

### ✅ Implementiert
- **Sichere Token-Generierung:** `random_bytes(32)` + hex encoding
- **Kurze Ablaufzeit:** 1 Stunde
- **Single-Use Tokens:** Token wird nach Verwendung invalidiert
- **Keine User Enumeration:** Gleiches Response für gültige/ungültige Emails
- **Bcrypt Hashing:** Passwörter werden mit PASSWORD_BCRYPT gehasht
- **Audit Logging:** Alle Reset-Aktivitäten werden geloggt

### ⚠️ Zusätzliche Maßnahmen (optional)
- Rate Limiting auf `/api/password/forgot-password` (verhindert Email Spam)
- HTTPS erzwingen (Links sollten über HTTPS versendet werden)
- IP-basierte Limits (z.B. max 3 Requests pro Minute pro IP)
- Email-Bestätigung (Verify Email wurde tatsächlich angeklickt)

## Deployment Checklist

- [ ] `password_reset_tokens` Tabelle in Datenbank erstellt
- [ ] `PasswordController.php` auf Server hochgeladen
- [ ] `index.php` Router mit neuen Routes aktualisiert
- [ ] `Login.jsx` mit Forgot Password Feature aktualisiert
- [ ] `PasswordReset.jsx` im Client hinzugefügt
- [ ] `App.jsx` mit PasswordReset Route aktualisiert
- [ ] Email-Service konfiguriert (SMTP/SendGrid/etc.)
- [ ] Client neu gebaut: `npm run build`
- [ ] Docker Container neugestartet oder Server Code deployed
- [ ] Testbenutzer erstellen und Passwort-Reset testen
- [ ] Email-Versand überprüfen

## Troubleshooting

### Problem: "Token ist ungültig oder abgelaufen"
**Lösungen:**
- Token ist älter als 1 Stunde
- Token wurde bereits verwendet
- Token existiert nicht in der Datenbank
- Check: `SELECT * FROM password_reset_tokens WHERE token = 'xxx';`

### Problem: Email wird nicht versendet
**Lösungen:**
- EmailService nicht konfiguriert
- SMTP-Credentials falsch
- Firewall blockiert Port 25/587/465
- Siehe [EMAIL_SETUP.md](server/EMAIL_SETUP.md)

### Problem: Passwort wird nicht geändert
**Lösungen:**
- Passwort zu kurz (min. 6 Zeichen)
- Token abgelaufen
- User existiert nicht mehr
- Check Datenbank: `SELECT * FROM users WHERE id = xxx;`

## Zukünftige Verbesserungen

- [ ] Two-Factor Authentication (2FA)
- [ ] Email-Bestätigung vor Reset
- [ ] Rate Limiting auf API
- [ ] Password Strength Meter (Frontend)
- [ ] Passwort-Änderungsverlauf
- [ ] Notification bei erfolgreicher Reset
