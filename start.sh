#!/usr/bin/env bash
# Startet die Oberfläche. Richtet beim ersten Aufruf alles ein.
# Verwendung:  ./start.sh
set -euo pipefail
cd "$(dirname "$0")"

PY=""
for kandidat in python3 python; do
  if command -v "$kandidat" >/dev/null 2>&1; then
    # Python 3.10+ wird gebraucht (Typ-Syntax wie `str | None`).
    if "$kandidat" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' 2>/dev/null; then
      PY="$kandidat"; break
    fi
  fi
done

if [ -z "$PY" ]; then
  echo "Python 3.10 oder neuer wird gebraucht, wurde aber nicht gefunden."
  echo "Installieren: https://www.python.org/downloads/  (danach Terminal neu öffnen)"
  exit 1
fi

if [ ! -d .venv ]; then
  echo "Richte einmalig die Umgebung ein ..."
  "$PY" -m venv .venv
  .venv/bin/pip install --quiet --upgrade pip
  .venv/bin/pip install --quiet -e ".[gemini]"
  echo "Fertig."
fi

if [ ! -f .env ] && [ ! -f "$HOME/.kleinanzeigen-tool/.env" ] \
   && [ -z "${GEMINI_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo
  echo "Es fehlt noch ein API-Schlüssel."
  echo "Kostenlosen Gemini-Schlüssel holen: https://aistudio.google.com/apikey"
  echo "Dann hier einfügen (oder Enter zum Überspringen):"
  read -r -p "GEMINI_API_KEY=" key
  if [ -n "$key" ]; then
    printf 'GEMINI_API_KEY=%s\n' "$key" > .env
    chmod 600 .env
    echo "In .env gespeichert — beim nächsten Start nicht mehr nötig."
  fi
fi

exec .venv/bin/kleinanzeigen ui "$@"
