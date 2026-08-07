@echo off
REM Startet die Oberflaeche unter Windows. Richtet beim ersten Aufruf alles ein.
REM Verwendung: Doppelklick auf start.bat
setlocal
cd /d "%~dp0"

where py >nul 2>&1
if %errorlevel%==0 (set PY=py -3) else (set PY=python)

%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
if errorlevel 1 (
  echo Python 3.10 oder neuer wird gebraucht, wurde aber nicht gefunden.
  echo Installieren: https://www.python.org/downloads/
  echo Wichtig: beim Installieren "Add Python to PATH" ankreuzen, danach neu starten.
  pause
  exit /b 1
)

if not exist ".venv" (
  echo Richte einmalig die Umgebung ein ...
  %PY% -m venv .venv
  .venv\Scripts\pip install --quiet --upgrade pip
  .venv\Scripts\pip install --quiet -e ".[gemini]"
  echo Fertig.
)

if not exist ".env" if "%GEMINI_API_KEY%"=="" if "%ANTHROPIC_API_KEY%"=="" (
  echo.
  echo Es fehlt noch ein API-Schluessel.
  echo Kostenlosen Gemini-Schluessel holen: https://aistudio.google.com/apikey
  set /p KEY="GEMINI_API_KEY="
  if not "%KEY%"=="" (
    echo GEMINI_API_KEY=%KEY%> .env
    echo In .env gespeichert - beim naechsten Start nicht mehr noetig.
  )
)

.venv\Scripts\kleinanzeigen ui %*
pause
