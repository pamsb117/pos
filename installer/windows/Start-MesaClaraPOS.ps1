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

$env:PORT = "$Port"
$env:HOST = "0.0.0.0"
$env:WRANGLER_WRITE_LOGS = "false"
$env:WRANGLER_LOG_PATH = ".wrangler/logs"
$env:MINIFLARE_REGISTRY_PATH = ".wrangler/registry"

if (-not $NoBrowser) {
  Start-Process $Url
}

Write-Host "Aura Estudio POS iniciado en $Url"
Write-Host "Para tablets o recepcion usa http://IP-DE-ESTA-PC:$Port dentro de la misma red."
npm run dev -- --host 0.0.0.0 --port $Port 2>&1 | Tee-Object -FilePath (Join-Path $LogDir "aura-estudio-pos.log") -Append
