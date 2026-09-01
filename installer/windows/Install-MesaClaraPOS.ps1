param(
  [string]$InstallPath = "$env:ProgramData\AuraEstudioPOS",
  [int]$Port = 3000,
  [switch]$CreateStartupShortcut
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$DataPath = Join-Path $InstallPath "data"
$BackupPath = Join-Path $InstallPath "backups"
$LogsPath = Join-Path $InstallPath "logs"
$ShortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Aura Estudio POS.lnk"
$StartupShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "Aura Estudio POS.lnk"

function Assert-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontro '$Name'. $InstallHint"
  }
}

function New-Shortcut($Path, $TargetPath, $Arguments, $WorkingDirectory) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $TargetPath
  $shortcut.Arguments = $Arguments
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,220"
  $shortcut.Save()
}

Assert-Command "node" "Instala Node.js LTS antes de instalar el POS."
Assert-Command "npm" "Instala Node.js LTS antes de instalar el POS."

New-Item -ItemType Directory -Force -Path $InstallPath, $DataPath, $BackupPath, $LogsPath | Out-Null
Set-Location $ProjectRoot

Write-Host "Instalando dependencias..."
npm install

Write-Host "Compilando el POS..."
npm run build

$envFile = Join-Path $ProjectRoot ".env.local"
@"
POS_PORT=$Port
POS_INSTALL_PATH=$InstallPath
POS_DATA_PATH=$DataPath
POS_BACKUP_PATH=$BackupPath
"@ | Set-Content -Encoding UTF8 $envFile

$startScript = Join-Path $ProjectRoot "installer\windows\Start-MesaClaraPOS.ps1"
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -Port $Port"
New-Shortcut -Path $ShortcutPath -TargetPath "powershell.exe" -Arguments $arguments -WorkingDirectory $ProjectRoot

if ($CreateStartupShortcut) {
  New-Shortcut -Path $StartupShortcutPath -TargetPath "powershell.exe" -Arguments $arguments -WorkingDirectory $ProjectRoot
}

Write-Host ""
Write-Host "Aura Estudio POS instalado correctamente."
Write-Host "Acceso local: http://localhost:$Port"
Write-Host "Datos locales: $DataPath"
Write-Host "Respaldos: $BackupPath"
