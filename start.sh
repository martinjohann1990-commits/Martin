#!/usr/bin/env bash
# Startet die Oberfläche. Richtet beim ersten Aufruf alles ein.
# Verwendung:  ./start.sh
set -euo pipefail
cd "$(dirname "$0")"

# Termux (Android) braucht eine andere Behandlung: kompilierte Pakete kommen
# dort aus der Paketverwaltung, weil pip sie mangels passender Wheels sonst
# aus dem Quelltext bauen müsste — was ohne Compiler-Toolchain scheitert.
IS_TERMUX=0
case "${PREFIX:-}" in *com.termux*) IS_TERMUX=1 ;; esac

if [ "$IS_TERMUX" = 1 ]; then
  echo "Termux erkannt."
  for paket in python python-pillow; do
    if ! pkg list-installed 2>/dev/null | grep -q "^$paket/"; then
      echo "Installiere $paket ..."
      pkg install -y "$paket"
    fi
  done
  # Zugriff auf DCIM/Downloads, sonst sind die Fotos nicht erreichbar.
  if [ ! -d "$HOME/storage" ]; then
    echo
    echo "Zugriff auf den Fotospeicher einrichten — gleich Berechtigung erlauben:"
    termux-setup-storage || true
    sleep 2
  fi
fi

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
  if [ "$IS_TERMUX" = 1 ]; then
    echo "Python fehlt. Installieren mit:  pkg install python"
  else
    echo "Python 3.10 oder neuer wird gebraucht, wurde aber nicht gefunden."
    echo "Installieren: https://www.python.org/downloads/  (danach Terminal neu öffnen)"
  fi
  exit 1
fi

if [ ! -d .venv ]; then
  echo "Richte einmalig die Umgebung ein ..."
  if [ "$IS_TERMUX" = 1 ]; then
    # --system-site-packages: sonst sieht die Umgebung das per pkg
    # installierte Pillow nicht und pip versucht, es selbst zu bauen.
    "$PY" -m venv --system-site-packages .venv
  else
    "$PY" -m venv .venv
  fi
  .venv/bin/pip install --quiet --upgrade pip

  if ! .venv/bin/pip install --quiet -e ".[gemini]"; then
    echo
    echo "Die Installation ist fehlgeschlagen."
    if [ "$IS_TERMUX" = 1 ]; then
      # Häufigste Ursache auf Android: pydantic-core ist eine Rust-Erweiterung,
      # und die fertigen Wheels von PyPI sind für glibc gebaut, nicht für
      # Androids Bionic. pip muss also selbst kompilieren.
      cat <<'HINWEIS'
Auf Android ist meist pydantic-core die Ursache: dafür gibt es kein
passendes Fertigpaket, es muss übersetzt werden. Das braucht Rust:

    pkg install rust binutils

Danach dieses Skript erneut starten. Der erste Übersetzungsvorgang
dauert auf dem Handy einige Minuten — das ist normal und passiert nur
einmal.
HINWEIS
    else
      echo "Die Meldungen oberhalb nennen den Grund."
    fi
    rm -rf .venv
    exit 1
  fi
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
