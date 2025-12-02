# Elevated cleanup script — stops node processes and force-deletes selected folders/files
Try {
  Write-Output "Starting elevated cleanup..."

  # Stop Node processes that may hold locks
  Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object { 
    try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Output "Stopped node pid=$($_.Id)" } catch { }
  }

  # Ensure an empty folder to mirror from
  $empty = Join-Path $env:TEMP "empty_cleanup_dir"
  if (-Not (Test-Path $empty)) { New-Item -ItemType Directory -Path $empty | Out-Null }

  $workspace = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

  $targets = @(
    Join-Path $workspace 'node_modules',
    Join-Path $workspace 'client\node_modules',
    Join-Path $workspace 'server\node_modules',
    Join-Path $workspace 'client\dist'
  )

  foreach ($t in $targets) {
    if (Test-Path $t) {
      Write-Output "Mirroring empty dir to $t (robocopy)"
      robocopy $empty $t /MIR | Out-Null
      Start-Sleep -Milliseconds 200
      try { Remove-Item -LiteralPath $t -Recurse -Force -ErrorAction SilentlyContinue; Write-Output "Removed $t" } catch { Write-Output "Failed to remove $t: $($_.Exception.Message)" }
    } else {
      Write-Output "Not found: $t"
    }
  }

  # Remove remaining specific files if present
  $files = @(
    Join-Path $workspace 'client\client-dev.log',
    Join-Path $workspace 'server\client_dev_out.log',
    Join-Path $workspace 'server\client_dev_err.log',
    Join-Path $workspace 'server\server_out.log',
    Join-Path $workspace 'server\server_err.log',
    Join-Path $workspace 'server\server-dev.log',
    Join-Path $workspace 'server\server-dev-4001.log',
    Join-Path $workspace 'server\e2e-results.json',
    Join-Path $workspace 'run-dev.bat',
    Join-Path $workspace 'client\playwright.config.js'
  )

  foreach ($f in $files) {
    if (Test-Path $f) {
      try { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue; Write-Output "Removed file: $f" } catch { Write-Output "Failed to remove file: $f" }
    } else { Write-Output "File not found: $f" }
  }

  # Remove top-level *.log files
  Get-ChildItem -Path $workspace -Filter '*.log' -File -ErrorAction SilentlyContinue | ForEach-Object { 
    try { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue; Write-Output "Removed log: $($_.FullName)" } catch { }
  }

  # Cleanup empty dir
  try { Remove-Item -LiteralPath $empty -Recurse -Force -ErrorAction SilentlyContinue } catch { }

  Write-Output "Elevated cleanup finished."
} Catch {
  Write-Error "Cleanup failed: $($_.Exception.Message)"
  Exit 1
}
