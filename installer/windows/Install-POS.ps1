param(
  [string]$InstallPath = "$env:ProgramData\PuntoDeVentaPOS",
  [int]$Port = 3000,
  [switch]$CreateStartupShortcut
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackupPath = Join-Path $InstallPath "backups"
$ShortcutName = "Punto de Venta.lnk"
$ShortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) $ShortcutName
$StartupShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) $ShortcutName

function Assert-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontro '$Name'. $InstallHint"
  }
}

function Invoke-Step($Label, [scriptblock]$Command) {
  Write-Host $Label
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo el paso: $Label"
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

Assert-Command "node" "Instala Node.js LTS (22 o superior) antes de instalar el punto de venta."
Assert-Command "npm" "Instala Node.js LTS (22 o superior) antes de instalar el punto de venta."

New-Item -ItemType Directory -Force -Path $InstallPath, $BackupPath | Out-Null
Set-Location $ProjectRoot

Invoke-Step "Instalando dependencias..." { npm install }
Invoke-Step "Compilando el punto de venta..." { npm run build }

$startScript = Join-Path $ProjectRoot "installer\windows\Start-POS.ps1"
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -Port $Port"
New-Shortcut -Path $ShortcutPath -TargetPath "powershell.exe" -Arguments $arguments -WorkingDirectory $ProjectRoot

if ($CreateStartupShortcut) {
  New-Shortcut -Path $StartupShortcutPath -TargetPath "powershell.exe" -Arguments $arguments -WorkingDirectory $ProjectRoot
}

Write-Host ""
Write-Host "Punto de venta instalado correctamente."
Write-Host "Abre el acceso directo 'Punto de Venta' del escritorio."
Write-Host "La primera vez se pedira el nombre del negocio y la cuenta de administrador."
Write-Host "Acceso local: http://localhost:$Port"
Write-Host "Respaldos: $BackupPath"
