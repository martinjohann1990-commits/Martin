#!/usr/bin/env bash
# Startet die Oberfläche. Richtet beim ersten Aufruf alles ein.
#
#   ./start.sh           starten
#   ./start.sh --check    nur prüfen, was da ist (nichts installieren)
#
# Absichtlich OHNE `set -e`: ein fehlgeschlagener Zwischenschritt soll eine
# verständliche Meldung erzeugen, nicht das Skript wortlos beenden. Genau das
# ist beim ersten Termux-Versuch passiert — abgebrochen mitten in der
# Paketinstallation, ohne dass am Ende eine Adresse stand.
set -uo pipefail
cd "$(dirname "$0")"

IS_TERMUX=0
case "${PREFIX:-}" in *com.termux*) IS_TERMUX=1 ;; esac

BIN=".venv/bin/kleinanzeigen"

schritt() { printf '\n== %s\n' "$1"; }
hinweis() { printf '   %s\n' "$1"; }

finde_python() {
  for kandidat in python3 python; do
    if command -v "$kandidat" >/dev/null 2>&1 &&
       "$kandidat" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' 2>/dev/null; then
      echo "$kandidat"; return 0
    fi
  done
  return 1
}

# ---------------------------------------------------------------- --check
if [ "${1:-}" = "--check" ]; then
  schritt "Umgebung"
  hinweis "Termux:      $([ "$IS_TERMUX" = 1 ] && echo ja || echo nein)"
  hinweis "Verzeichnis: $(pwd)"
  if PY=$(finde_python); then
    hinweis "Python:      $("$PY" -V 2>&1) ($(command -v "$PY"))"
  else
    hinweis "Python:      FEHLT oder älter als 3.10"
  fi
  hinweis "bash:        $(bash --version 2>/dev/null | head -1)"

  schritt "Installation"
  if [ -d .venv ]; then
    if [ -x "$BIN" ]; then
      hinweis "vollständig ($BIN vorhanden)"
      hinweis "Pakete: $(.venv/bin/python -c 'import PIL,pydantic;print("Pillow+pydantic ok")' 2>&1 | head -1)"
      hinweis "google-genai: $(.venv/bin/python -c 'import google.genai;print("ok")' 2>&1 | tail -1)"
    else
      hinweis "UNVOLLSTÄNDIG — .venv existiert, aber $BIN fehlt."
      hinweis "Beheben mit:  rm -rf .venv && ./start.sh"
    fi
  else
    hinweis "noch nicht eingerichtet (.venv fehlt)"
  fi

  schritt "Schlüssel"
  if [ -n "${GEMINI_API_KEY:-}" ] || [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    hinweis "in der Umgebung gesetzt"
  elif [ -f .env ]; then
    hinweis ".env vorhanden ($(wc -l < .env) Zeile(n))"
  elif [ -f "$HOME/.kleinanzeigen-tool/.env" ]; then
    hinweis "~/.kleinanzeigen-tool/.env vorhanden"
  else
    hinweis "KEINER gefunden — https://aistudio.google.com/apikey"
  fi
  echo
  exit 0
fi

# ------------------------------------------------------------- Termux-Setup
if [ "$IS_TERMUX" = 1 ]; then
  schritt "Termux erkannt — Systempakete"
  for paket in python python-pillow; do
    if pkg list-installed 2>/dev/null | grep -q "^$paket/"; then
      hinweis "$paket ist da"
    else
      hinweis "installiere $paket ..."
      # Ein Fehlschlag ist kein Abbruchgrund: vielleicht heißt das Paket
      # inzwischen anders, und pip kann es womöglich trotzdem beschaffen.
      if ! pkg install -y "$paket"; then
        hinweis "$paket ließ sich nicht installieren — versuche es später über pip."
      fi
    fi
  done

  if [ ! -d "$HOME/storage" ]; then
    schritt "Zugriff auf die Fotos"
    hinweis "Gleich erscheint eine Android-Abfrage — bitte erlauben."
    termux-setup-storage || hinweis "(übersprungen)"
    sleep 2
  fi
fi

# ------------------------------------------------------------------ Python
if ! PY=$(finde_python); then
  schritt "Python fehlt"
  if [ "$IS_TERMUX" = 1 ]; then
    hinweis "Installieren mit:  pkg install python"
  else
    hinweis "Python 3.10 oder neuer nötig: https://www.python.org/downloads/"
    hinweis "Danach das Terminal neu öffnen."
  fi
  exit 1
fi

# ------------------------------------------------------------- Installation
# Auch prüfen, ob die vorhandene .venv wirklich benutzbar ist. Eine
# abgebrochene Installation hinterlässt sonst ein Verzeichnis ohne Programm,
# und der Start endet in "No such file or directory".
if [ ! -x "$BIN" ]; then
  if [ -d .venv ]; then
    schritt "Unvollständige Installation gefunden — wird neu angelegt"
    rm -rf .venv
  else
    schritt "Einmalige Einrichtung"
  fi

  if [ "$IS_TERMUX" = 1 ]; then
    # --system-site-packages: sonst sieht die Umgebung das per pkg
    # installierte Pillow nicht und pip versucht, es selbst zu bauen.
    "$PY" -m venv --system-site-packages .venv || { hinweis "venv fehlgeschlagen."; exit 1; }
  else
    "$PY" -m venv .venv || { hinweis "venv fehlgeschlagen."; exit 1; }
  fi

  .venv/bin/pip install --quiet --upgrade pip || true

  hinweis "Installiere Pakete (kann beim ersten Mal dauern) ..."
  if ! .venv/bin/pip install -e ".[gemini]"; then
    schritt "Die Installation ist fehlgeschlagen"
    if [ "$IS_TERMUX" = 1 ]; then
      cat <<'HINWEIS'
   Auf Android ist meist pydantic-core die Ursache: dafür gibt es kein
   passendes Fertigpaket, es muss übersetzt werden. Das braucht Rust:

       pkg install rust binutils
       ./start.sh

   Der erste Übersetzungsvorgang dauert einige Minuten — nur einmal.
HINWEIS
    else
      hinweis "Die Meldungen oberhalb nennen den Grund."
    fi
    rm -rf .venv
    exit 1
  fi

  if [ ! -x "$BIN" ]; then
    schritt "Installation lief durch, aber $BIN fehlt"
    hinweis "Bitte die Ausgabe oberhalb melden."
    exit 1
  fi
  hinweis "Fertig."
fi

# ------------------------------------------------------------------ Schlüssel
if [ ! -f .env ] && [ ! -f "$HOME/.kleinanzeigen-tool/.env" ] &&
   [ -z "${GEMINI_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  schritt "Es fehlt noch ein API-Schlüssel"
  hinweis "Kostenlos holen: https://aistudio.google.com/apikey"
  hinweis "Hier einfügen (oder Enter zum Überspringen):"
  read -r -p "   GEMINI_API_KEY=" key || key=""
  if [ -n "$key" ]; then
    printf 'GEMINI_API_KEY=%s\n' "$key" > .env
    chmod 600 .env
    hinweis "In .env gespeichert — beim nächsten Start nicht mehr nötig."
  fi
fi

exec "$BIN" ui "$@"
