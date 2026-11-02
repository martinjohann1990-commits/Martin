#!/usr/bin/env bash
# Fire TV Stick 4K (2. Gen) – Debloat & Clean-Design per ADB (Linux/macOS)
#
#   ./firetv.sh debloat  [IP] [--optional] [--block-updates] [--dry-run]
#   ./firetv.sh restore  [IP]
#   ./firetv.sh launcher [IP] <pfad/zur/launcher.apk>
#   ./firetv.sh tweaks   [IP]
set -u
cd "$(dirname "$0")"

DEFAULT_IP="192.168.178.160"
MODE="${1:-}"; shift || true
IP="$DEFAULT_IP"
if [[ "${1:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then IP="$1"; shift; fi
OPTIONAL=0; UPDATES=0; DRY=0; APK=""
for a in "$@"; do
  case "$a" in
    --optional) OPTIONAL=1 ;;
    --block-updates) UPDATES=1 ;;
    --dry-run) DRY=1 ;;
    *) APK="$a" ;;
  esac
done
DEV="$IP:5555"
LOG="firetv-log.txt"

die() { echo "FEHLER: $*" >&2; exit 1; }
command -v adb >/dev/null || die "adb nicht gefunden. Installiere die Android Platform-Tools (siehe README)."

connect() {
  echo ">> Verbinde mit $DEV ... (auf dem Fernseher ggf. 'USB-Debugging zulassen' bestaetigen)"
  adb connect "$DEV" >/dev/null
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ "$(adb -s "$DEV" get-state 2>/dev/null)" = "device" ] && break
    sleep 2
  done
  [ "$(adb -s "$DEV" get-state 2>/dev/null)" = "device" ] || die "Keine Verbindung. ADB-Debugging aktiv? Dialog am TV bestaetigt?"
  echo ">> Verbunden: $(adb -s "$DEV" shell getprop ro.product.model | tr -d '\r'), Fire OS $(adb -s "$DEV" shell getprop ro.build.version.name | tr -d '\r')"
}

sh_() { adb -s "$DEV" shell "$@" 2>&1 | tr -d '\r'; }

read_list() { grep -vE '^\s*(#|$)' "$1" | tr -d '\r' | awk '{print $1}'; }

lists() {
  read_list packages-safe.txt
  [ $OPTIONAL = 1 ] && read_list packages-optional.txt
  [ $UPDATES = 1 ] && read_list packages-updates.txt
  true
}

debloat() {
  connect
  local installed; installed="$(sh_ pm list packages | sed 's/^package://')"
  echo "=== debloat $(date) ===" >> "$LOG"
  local ok=0 skip=0 fail=0
  while read -r p; do
    if ! grep -qx "$p" <<<"$installed"; then echo "  -  $p (nicht vorhanden)"; skip=$((skip+1)); continue; fi
    if [ $DRY = 1 ]; then echo "  ?  $p (würde deaktiviert)"; continue; fi
    out="$(sh_ pm disable-user --user 0 "$p")"
    if grep -qi "disabled" <<<"$out"; then
      echo "  ✓  $p deaktiviert"; echo "disabled $p" >> "$LOG"; ok=$((ok+1)); continue
    fi
    out2="$(sh_ pm uninstall -k --user 0 "$p")"
    if grep -qi "success" <<<"$out2"; then
      echo "  ✓  $p für Benutzer entfernt"; echo "uninstalled $p" >> "$LOG"; ok=$((ok+1))
    else
      echo "  ✗  $p – von Fire OS blockiert ($out | $out2)"; echo "failed $p" >> "$LOG"; fail=$((fail+1))
    fi
  done < <(lists)
  echo ">> Fertig: $ok entfernt, $skip nicht vorhanden, $fail blockiert. Log: $LOG"
  echo ">> Empfehlung: Fire TV einmal neu starten (adb -s $DEV reboot)."
}

restore() {
  connect
  OPTIONAL=1; UPDATES=1
  while read -r p; do
    sh_ cmd package install-existing "$p" >/dev/null
    sh_ pm enable "$p" >/dev/null
    echo "  ↺  $p"
  done < <(lists)
  echo ">> Wiederhergestellt. Bitte Fire TV neu starten."
}

tweaks() {
  connect
  echo ">> Animationen beschleunigen (0.5x) ..."
  sh_ settings put global window_animation_scale 0.5
  sh_ settings put global transition_animation_scale 0.5
  sh_ settings put global animator_duration_scale 0.5
  echo ">> Fertig. Rückgängig: Werte wieder auf 1 setzen."
}

launcher() {
  [ -n "$APK" ] && [ -f "$APK" ] || die "Pfad zur Launcher-APK angeben, z.B. ./firetv.sh launcher ~/Downloads/projectivy.apk"
  connect
  adb -s "$DEV" install -r "$APK" || die "Installation fehlgeschlagen."
  echo ">> Installiert. Jetzt am TV den Launcher öffnen und die Startseiten-Übernahme einrichten (siehe README)."
}

case "$MODE" in
  debloat) debloat ;;
  restore) restore ;;
  tweaks) tweaks ;;
  launcher) launcher ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
