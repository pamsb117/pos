param(
  [string]$InstallPath = "$env:ProgramData\MesaClaraPOS"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackupPath = Join-Path $InstallPath "backups"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ArchivePath = Join-Path $BackupPath "mesa-clara-pos-backup-$Timestamp.zip"

New-Item -ItemType Directory -Force -Path $BackupPath | Out-Null

$items = @()
$wranglerPath = Join-Path $ProjectRoot ".wrangler"
$envPath = Join-Path $ProjectRoot ".env.local"

if (Test-Path $wranglerPath) {
  $items += $wranglerPath
}

if (Test-Path $envPath) {
  $items += $envPath
}

if ($items.Count -eq 0) {
  throw "No se encontraron datos locales para respaldar."
}

Compress-Archive -Path $items -DestinationPath $ArchivePath -Force
Write-Host "Respaldo creado: $ArchivePath"
