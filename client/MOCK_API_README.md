# Mock-API Modus für Vite

## Verwendung

### Mock-Modus aktivieren
Starte Vite mit der Umgebungsvariable `VITE_MOCK_API=true`:

```powershell
# PowerShell
$env:VITE_MOCK_API="true"; cd C:\BistroShifts\client; node node_modules\vite\bin\vite.js --host
```

```cmd
REM CMD
set VITE_MOCK_API=true && cd C:\BistroShifts\client && node node_modules\vite\bin\vite.js --host
```

### Normaler Modus (echtes Backend)
Starte Vite ohne die Variable oder mit `VITE_MOCK_API=false`:

```powershell
cd C:\BistroShifts\client; node node_modules\vite\bin\vite.js --host
```

## Was ist enthalten?

Im Mock-Modus erhältst du:

### Benutzer
- **Admin**: `admin@test.com` (Rolle: admin)
- **User**: `user@test.com` (Rolle: user)
- **Inactive**: `inactive@test.com` (inaktiv)

Login funktioniert mit **beliebigem Passwort** (außer "wrong" → Fehler)

### Schichten
- **Morgenschicht**: 3 Plätze, 2 belegt
- **Mittagsschicht**: 5 Plätze, 5 belegt (VOLL)
- **Abendschicht**: 4 Plätze, 0 belegt

### Teilnehmer
- Morgenschicht hat 2 Anmeldungen (Mock User, Inactive User)

## Vorteile

- ✅ Schnelle UI-Entwicklung ohne Backend
- ✅ Testen von Grenzfällen (volle Schichten, leere Listen, etc.)
- ✅ Offline-Entwicklung möglich
- ✅ Alle API-Calls haben simulierte Verzögerung (300ms)

## Mock-Daten anpassen

Bearbeite `client/src/mockApi.js` um:
- Mehr Testdaten hinzuzufügen
- Fehlerszenarien zu simulieren
- Verzögerungen anzupassen
