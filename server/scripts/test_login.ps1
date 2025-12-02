$body = @{ email='admin@local.com'; password='adminpw' } | ConvertTo-Json
try {
  $resp = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
  Write-Output 'API response:'
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Output "Request failed: $($_.Exception.Message)"
}

Write-Output '--- server_out.log (last 200 lines) ---'
if (Test-Path 'c:\BistroShifts\server\server_out.log') { Get-Content 'c:\BistroShifts\server\server_out.log' -Tail 200 } else { Write-Output 'No server_out.log found' }
Write-Output '--- server_err.log (last 200 lines) ---'
if (Test-Path 'c:\BistroShifts\server\server_err.log') { Get-Content 'c:\BistroShifts\server\server_err.log' -Tail 200 } else { Write-Output 'No server_err.log found' }
