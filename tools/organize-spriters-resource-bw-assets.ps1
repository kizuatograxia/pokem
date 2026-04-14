param(
  [string]$SourceDir = "C:\users\hedge\onedrive\desktop\pokem\sources\spriters-resource\pokemonblackwhite-redownload",
  [string]$ProjectRoot = "C:\users\hedge\onedrive\desktop\pokem"
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "organize-spriters-resource-bw-assets.py"
& python $scriptPath --source-dir $SourceDir --project-root $ProjectRoot
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
