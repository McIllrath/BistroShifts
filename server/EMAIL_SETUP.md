# E-Mail-Konfiguration für BistroShifts

## Übersicht

Die Anwendung unterstützt jetzt E-Mail-Benachrichtigungen für:

1. **Willkommens-E-Mail** bei Benutzer-Registrierung
2. **Bestätigungs-E-Mail** nach Schicht-Anmeldung
3. **Benachrichtigung an Event-Ersteller** bei Genehmigung/Ablehnung
4. **Benachrichtigung an Admins** bei neuen Event-Anträgen

## Konfiguration

E-Mails werden über SMTP versendet. Konfiguriere die folgenden Umgebungsvariablen in der `.env`-Datei:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=deine-email@gmail.com
SMTP_PASS=dein-app-passwort
SMTP_FROM=BistroShifts <deine-email@gmail.com>
```

### Gmail-Konfiguration

Für Gmail benötigst du ein **App-Passwort** (nicht dein normales Gmail-Passwort):

1. Gehe zu https://myaccount.google.com/security
2. Aktiviere 2-Faktor-Authentifizierung (falls noch nicht aktiv)
3. Gehe zu "App-Passwörter" und erstelle ein neues Passwort für "Mail"
4. Verwende dieses 16-stellige Passwort als `SMTP_PASS`

### Andere E-Mail-Provider

**Outlook/Office365:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<dein-sendgrid-api-key>
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=<dein-mailgun-username>
SMTP_PASS=<dein-mailgun-passwort>
```

## Entwicklungsmodus

Wenn keine E-Mail-Konfiguration vorhanden ist, werden E-Mails **nur in der Konsole geloggt**, aber nicht tatsächlich versendet. Das ist praktisch für die lokale Entwicklung.

## E-Mail-Templates

Alle E-Mail-Templates befinden sich in `server/src/email.js` und können dort angepasst werden:

- `sendWelcomeEmail(user)` - Willkommens-E-Mail
- `sendShiftSignupConfirmation(user, shift)` - Schicht-Bestätigung
- `sendEventStatusNotification(user, event, status, adminNotes)` - Event-Status
- `sendNewEventNotificationToAdmins(adminEmails, event, creator)` - Admin-Benachrichtigung

## Fehlerbehandlung

E-Mail-Fehler werden in der Konsole geloggt, blockieren aber nicht die API-Antworten. Die Anwendung funktioniert auch ohne E-Mail-Service.
