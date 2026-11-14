param(
  [string]$OutputPath = ".\outputs\PuntoDeVenta-Windows.exe"
)

# Builds a single-file installer with IExpress, which ships with Windows.
# The .exe unpacks the program package and runs exe\Setup-POS.ps1.
#
# The file name deliberately avoids "setup"/"install": Windows elevates
# executables with those words, and an elevated run under a different admin
# account would install into that account's profile.

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
# IExpress needs a plain absolute path (no ".\" segments).
$ResolvedOutputPath = [System.IO.Path]::GetFullPath($(if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $ProjectRoot $OutputPath }))
$Stage = Join-Path $env:TEMP "pos-exe-stage-$PID"
$IExpress = Join-Path $env:SystemRoot "System32\iexpress.exe"

if (-not (Test-Path $IExpress)) { throw "No se encontro IExpress en $IExpress." }

New-Item -ItemType Directory -Force -Path $Stage, (Split-Path $ResolvedOutputPath) | Out-Null
try {
  & (Join-Path $PSScriptRoot "Build-InstallerPackage.ps1") -OutputPath (Join-Path $Stage "payload.zip")
  Copy-Item (Join-Path $PSScriptRoot "exe\setup.cmd"), (Join-Path $PSScriptRoot "exe\Setup-POS.ps1") -Destination $Stage

  $sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=Se instalara Punto de Venta en esta computadora. Continuar?
DisplayLicense=
FinishMessage=
TargetName=$ResolvedOutputPath
FriendlyName=Punto de Venta
AppLaunched=cmd /c .\setup.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=cmd /c .\setup.cmd
UserQuietInstCmd=cmd /c .\setup.cmd
FILE0="payload.zip"
FILE1="setup.cmd"
FILE2="Setup-POS.ps1"
[SourceFiles]
SourceFiles0=$Stage\
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
"@
  $sedPath = Join-Path $Stage "installer.sed"
  Set-Content -Path $sedPath -Value $sed -Encoding ASCII

  if (Test-Path $ResolvedOutputPath) { Remove-Item -LiteralPath $ResolvedOutputPath -Force }
  Start-Process -FilePath $IExpress -ArgumentList "/N", "/Q", $sedPath -Wait
  if (-not (Test-Path $ResolvedOutputPath)) { throw "IExpress no genero el instalador." }
  Write-Host "Instalador creado: $ResolvedOutputPath"
} finally {
  Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue
}
