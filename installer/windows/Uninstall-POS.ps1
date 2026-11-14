param(
  [switch]$RemoveLocalData
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ShortcutName = "Punto de Venta.lnk"

Remove-Item -LiteralPath (Join-Path ([Environment]::GetFolderPath("Desktop")) $ShortcutName) -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path ([Environment]::GetFolderPath("Startup")) $ShortcutName) -Force -ErrorAction SilentlyContinue

if ($RemoveLocalData) {
  # Deletes the database: sales, clients, users and settings.
  $wranglerPath = Join-Path $ProjectRoot ".wrangler"
  if (Test-Path $wranglerPath) {
    Remove-Item -LiteralPath $wranglerPath -Recurse -Force
  }
  Write-Host "Datos locales eliminados."
}

Write-Host "Punto de venta desinstalado."
