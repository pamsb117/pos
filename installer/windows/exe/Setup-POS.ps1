# Runs inside the self-extracting installer (see Build-InstallerExe.ps1).
# Copies the program to the user's profile, then installs and compiles it.
#
# For unattended runs: POS_INSTALL_DIR overrides the destination and
# POS_SETUP_SILENT=1 suppresses the dialogs.

$ErrorActionPreference = "Stop"
$Silent = $env:POS_SETUP_SILENT -eq "1"
$Target = if ($env:POS_INSTALL_DIR) { $env:POS_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "PuntoDeVenta" }
$Payload = Join-Path $PSScriptRoot "payload.zip"

function Show-Message($Text, $Icon = "Information") {
  Write-Host $Text
  if ($Silent) { return }
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show($Text, "Punto de Venta", "OK", $Icon) | Out-Null
}

try {
  $node = Get-Command node -ErrorAction SilentlyContinue
  $major = if ($node) { [int]((& node -p "process.versions.node.split('.')[0]") 2>$null) } else { 0 }
  if ($major -lt 22) {
    Show-Message "Se necesita Node.js 22 o superior. Instalalo desde https://nodejs.org (version LTS) y vuelve a abrir este instalador." "Warning"
    if (-not $Silent) { Start-Process "https://nodejs.org/es/download" }
    exit 2
  }

  Write-Host "Copiando archivos a $Target ..."
  New-Item -ItemType Directory -Force -Path $Target | Out-Null
  # -Force replaces program files; the database in .wrangler is not in the package, so an update keeps it.
  Expand-Archive -LiteralPath $Payload -DestinationPath $Target -Force

  Write-Host "Instalando. Esto tarda unos minutos y necesita internet..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Target "installer\windows\Install-POS.ps1")
  if ($LASTEXITCODE -ne 0) { throw "La instalacion de dependencias o la compilacion fallo." }

  Show-Message "Punto de Venta quedo instalado en:`n$Target`n`nAbre el acceso directo 'Punto de Venta' del escritorio. La primera vez se pedira el nombre del negocio y la cuenta de administrador."
  exit 0
} catch {
  Show-Message "No se pudo instalar Punto de Venta.`n`n$($_.Exception.Message)" "Error"
  exit 1
}
