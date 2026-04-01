@echo off
setlocal

set "OBSIDIAN_APP=%LocalAppData%\Programs\Obsidian\Obsidian.exe"

for %%I in ("%~dp0..\..\obsidian-vault") do set "PROJECT_VAULT=%%~fI"

if not exist "%OBSIDIAN_APP%" (
  echo Obsidian nao foi encontrado em "%OBSIDIAN_APP%".
  exit /b 1
)

start "" "%OBSIDIAN_APP%" "%PROJECT_VAULT%"
