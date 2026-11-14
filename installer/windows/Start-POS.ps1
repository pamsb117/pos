param(
  [int]$Port = 3000,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Url = "http://localhost:$Port"
$LogDir = Join-Path $ProjectRoot "logs"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $ProjectRoot

$env:WRANGLER_WRITE_LOGS = "false"
$env:WRANGLER_LOG_PATH = ".wrangler/logs"
$env:MINIFLARE_REGISTRY_PATH = ".wrangler/registry"

# The server runs the compiled build. Compile it here if the install step was skipped.
if (-not (Test-Path (Join-Path $ProjectRoot "dist\server\index.js"))) {
  Write-Host "Compilando el punto de venta (solo la primera vez)..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo compilar el punto de venta."
  }
}

if (-not $NoBrowser) {
  # Open the browser only once the server answers, from a separate hidden process.
  $wait = "for (`$i = 0; `$i -lt 90; `$i++) { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '$Url' | Out-Null; break } catch { Start-Sleep -Seconds 1 } }; Start-Process '$Url'"
  Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", $wait
}

Write-Host "Punto de venta iniciado en $Url"
Write-Host "Para tablets u otras computadoras en la misma red usa http://IP-DE-ESTA-PC:$Port"
Write-Host "Deja esta ventana abierta mientras se usa el sistema. Cierrala para apagarlo."
# stderr is merged inside cmd: Windows PowerShell would turn npm's stderr lines into errors and stop.
cmd /c "npm run start -- --host 0.0.0.0 --port $Port --strictPort 2>&1" | Tee-Object -FilePath (Join-Path $LogDir "punto-de-venta.log") -Append
