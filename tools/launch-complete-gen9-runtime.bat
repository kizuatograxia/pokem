@echo off
setlocal

set "TARGET=C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9"

if not exist "%TARGET%\Game.exe" (
  echo Runtime not found at:
  echo %TARGET%
  echo.
  echo Run tools\rebuild-complete-gen9-runtime.bat first.
  exit /b 1
)

cd /d "%TARGET%"
start "" "Game.exe"
