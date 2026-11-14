param(
  [string]$InstallPath = "$env:ProgramData\PuntoDeVentaPOS"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackupPath = Join-Path $InstallPath "backups"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ArchivePath = Join-Path $BackupPath "punto-de-venta-respaldo-$Timestamp.zip"

# The database (ventas, clientes, usuarios, configuracion) lives in .wrangler\state.
$statePath = Join-Path $ProjectRoot ".wrangler\state"
if (-not (Test-Path $statePath)) {
  throw "No se encontraron datos para respaldar en $statePath."
}

New-Item -ItemType Directory -Force -Path $BackupPath | Out-Null

try {
  Compress-Archive -Path $statePath -DestinationPath $ArchivePath -Force
} catch {
  throw "No se pudo crear el respaldo. Cierra la ventana del punto de venta y vuelve a intentar. Detalle: $($_.Exception.Message)"
}

Write-Host "Respaldo creado: $ArchivePath"
Write-Host "Para restaurar: cierra el punto de venta y descomprime el archivo dentro de '$ProjectRoot\.wrangler'."
