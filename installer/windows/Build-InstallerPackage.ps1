param(
  [string]$OutputPath = ".\outputs\MesaClaraPOS-Windows.zip"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ResolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path $ProjectRoot $OutputPath
}
$StagePath = Join-Path $ProjectRoot ".installer-stage"

if (Test-Path $StagePath) {
  Remove-Item -LiteralPath $StagePath -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $StagePath, (Split-Path $ResolvedOutputPath) | Out-Null

$exclude = @(
  ".git",
  ".next",
  ".vinext",
  ".wrangler",
  "dist",
  "node_modules",
  ".installer-stage",
  "outputs",
  "logs"
)

Get-ChildItem -Path $ProjectRoot -Force | Where-Object {
  $exclude -notcontains $_.Name -and $_.Name -notlike "*.tar.gz"
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $StagePath -Recurse -Force
}

Compress-Archive -Path (Join-Path $StagePath "*") -DestinationPath $ResolvedOutputPath -Force
Remove-Item -LiteralPath $StagePath -Recurse -Force

Write-Host "Paquete creado: $ResolvedOutputPath"
