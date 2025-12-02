# Open the SQLite DB file with the system default application (DB Browser for SQLite if installed)
param()

$envPath = $env:DATABASE_FILE
if ([string]::IsNullOrEmpty($envPath)) {
  $dbPath = Join-Path -Path (Split-Path -Parent $PSScriptRoot) -ChildPath "..\..\db\database.sqlite"
  $dbPath = (Resolve-Path -Path $dbPath).ProviderPath
} else {
  $dbPath = $envPath
}

if (Test-Path $dbPath) {
  Write-Host "Opening DB: $dbPath"
  Start-Process -FilePath $dbPath
} else {
  Write-Host "Database file not found at: $dbPath" -ForegroundColor Yellow
  Write-Host "Run `npm run init-db` in the server folder to create the DB." -ForegroundColor Cyan
}
