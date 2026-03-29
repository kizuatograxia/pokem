@echo off
setlocal

pushd "%~dp0.."
set "ROOT=%CD%"
set "RUNTIME_ROOT=C:\Users\hedge\OneDrive\Desktop\pokem-runtime"
set "BASE_EXTRACT=%RUNTIME_ROOT%\complete-base"
set "HOTFIX_EXTRACT=%RUNTIME_ROOT%\hotfix-extract"
set "TARGET=%RUNTIME_ROOT%\pokemon-essentials-v21.1-complete-gen9"
set "BASE_DIR=%BASE_EXTRACT%\Pokemon Essentials v21.1 2023-07-30"
set "SEVENZIP=C:\Program Files\7-Zip\7z.exe"
set "ROBO=C:\Windows\System32\Robocopy.exe"

if not exist "%SEVENZIP%" (
  echo Missing 7-Zip at "%SEVENZIP%".
  exit /b 1
)

if not exist "%ROOT%\Pokemon Essentials v21.1 2023-07-30.zip" (
  echo Missing complete Essentials base zip.
  exit /b 1
)

if not exist "%ROOT%\Generation 9 Pack v3.3.4.rar" (
  echo Missing Gen 9 pack archive.
  exit /b 1
)

if not exist "%ROOT%\v21.1 Hotfixes.zip" (
  echo Missing v21.1 Hotfixes zip.
  exit /b 1
)

if not exist "%BASE_DIR%\Game.exe" (
  echo Extracting complete Essentials base...
  if not exist "%BASE_EXTRACT%" mkdir "%BASE_EXTRACT%"
  "%SEVENZIP%" x "%ROOT%\Pokemon Essentials v21.1 2023-07-30.zip" -o"%BASE_EXTRACT%" -y >nul
)

if not exist "%TARGET%" mkdir "%TARGET%"

echo Rebuilding official runtime...
"%ROBO%" "%BASE_DIR%" "%TARGET%" /MIR >nul
if errorlevel 8 goto :robocopy_failed

echo Overlaying editable Essentials scripts...
"%ROBO%" "%ROOT%\sources\pokemon-essentials-21.1\Data\Scripts" "%TARGET%\Data\Scripts" /E >nul
if errorlevel 8 goto :robocopy_failed
copy /Y "%ROOT%\sources\pokemon-essentials-21.1\Data\Scripts.rxdata" "%TARGET%\Data\Scripts.rxdata" >nul
copy /Y "%ROOT%\sources\pokemon-essentials-21.1\Data\messages_core.dat" "%TARGET%\Data\messages_core.dat" >nul

echo Overlaying Gen 9 pack...
"%ROBO%" "%ROOT%\sources\generation-9-pack-v3.3.4\Audio" "%TARGET%\Audio" /E >nul
if errorlevel 8 goto :robocopy_failed
"%ROBO%" "%ROOT%\sources\generation-9-pack-v3.3.4\Graphics" "%TARGET%\Graphics" /E >nul
if errorlevel 8 goto :robocopy_failed
"%ROBO%" "%ROOT%\sources\generation-9-pack-v3.3.4\PBS" "%TARGET%\PBS" /E >nul
if errorlevel 8 goto :robocopy_failed
"%ROBO%" "%ROOT%\sources\generation-9-pack-v3.3.4\Plugins\Generation 9 Pack Scripts" "%TARGET%\Plugins\Gen9Pack" /E >nul
if errorlevel 8 goto :robocopy_failed

copy /Y "%ROOT%\sources\generation-9-pack-v3.3.4\PBS\Gen 9 backup\Vanilla PBS Files (with updates)\abilities.txt" "%TARGET%\PBS\abilities.txt" >nul
copy /Y "%ROOT%\sources\generation-9-pack-v3.3.4\PBS\Gen 9 backup\Vanilla PBS Files (with updates)\items.txt" "%TARGET%\PBS\items.txt" >nul
copy /Y "%ROOT%\sources\generation-9-pack-v3.3.4\PBS\Gen 9 backup\Vanilla PBS Files (with updates)\moves.txt" "%TARGET%\PBS\moves.txt" >nul
copy /Y "%ROOT%\sources\generation-9-pack-v3.3.4\PBS\Gen 9 backup\Vanilla PBS Files (with updates)\pokemon.txt" "%TARGET%\PBS\pokemon.txt" >nul
copy /Y "%ROOT%\sources\generation-9-pack-v3.3.4\PBS\Gen 9 backup\Vanilla PBS Files (with updates)\pokemon_forms.txt" "%TARGET%\PBS\pokemon_forms.txt" >nul

echo Installing required hotfix plugin...
if exist "%HOTFIX_EXTRACT%" rmdir /S /Q "%HOTFIX_EXTRACT%"
mkdir "%HOTFIX_EXTRACT%"
"%SEVENZIP%" x "%ROOT%\v21.1 Hotfixes.zip" -o"%HOTFIX_EXTRACT%" -y >nul
"%ROBO%" "%HOTFIX_EXTRACT%\v21.1 Hotfixes" "%TARGET%\Plugins\v211Hotfixes" /E >nul
if errorlevel 8 goto :robocopy_failed

if exist "%TARGET%\Data\PluginScripts.rxdata" del /F /Q "%TARGET%\Data\PluginScripts.rxdata"

echo.
echo Runtime rebuilt successfully:
echo %TARGET%
popd
exit /b 0

:robocopy_failed
echo Robocopy failed with exit code %ERRORLEVEL%.
popd
exit /b 1
