@echo off
setlocal

set "OBSIDIAN_CLI=%LocalAppData%\Programs\Obsidian\Obsidian.com"

if not exist "%OBSIDIAN_CLI%" (
  echo Obsidian CLI nao foi encontrado em "%OBSIDIAN_CLI%".
  echo Instale o app desktop do Obsidian neste usuario para usar este wrapper.
  exit /b 1
)

"%OBSIDIAN_CLI%" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Se o comando falhou por nao encontrar o Obsidian em execucao,
  echo abra o app e habilite Settings ^> General ^> Advanced ^> Command line interface.
)

exit /b %EXIT_CODE%
