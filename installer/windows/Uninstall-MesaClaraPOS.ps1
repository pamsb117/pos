param(
  [switch]$RemoveLocalData
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$DesktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Aura Estudio POS.lnk"
$StartupShortcut = Join-Path ([Environment]::GetFolderPath("Startup")) "Aura Estudio POS.lnk"

Remove-Item -LiteralPath $DesktopShortcut -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $StartupShortcut -Force -ErrorAction SilentlyContinue

if ($RemoveLocalData) {
  $wranglerPath = Join-Path $ProjectRoot ".wrangler"
  $envPath = Join-Path $ProjectRoot ".env.local"
  if (Test-Path $wranglerPath) {
    Remove-Item -LiteralPath $wranglerPath -Recurse -Force
  }
  if (Test-Path $envPath) {
    Remove-Item -LiteralPath $envPath -Force
  }
}

Write-Host "Aura Estudio POS desinstalado."
