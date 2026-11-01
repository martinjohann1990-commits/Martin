#!/usr/bin/env bash
# Fire TV Stick entrümpeln – reversibel (pm disable-user), nichts wird gelöscht.
# Nutzung: ./debloat.sh <IP-des-Sticks> [--apps] [--updates] [--dry-run]
set -euo pipefail
cd "$(dirname "$0")"

IP="${1:-}"; shift || true
[[ -z "$IP" ]] && { echo "Nutzung: $0 <IP> [--apps] [--updates] [--dry-run]"; exit 1; }
CATS="tracking"; DRY=0
for a in "$@"; do
  case "$a" in
    --apps) CATS="$CATS apps" ;;
    --updates) CATS="$CATS updates"
      echo "⚠️  Updates deaktivieren = keine Sicherheits-Patches mehr. Abbrechen mit Strg+C (5 s)…"; sleep 5 ;;
    --dry-run) DRY=1 ;;
    *) echo "Unbekannte Option: $a"; exit 1 ;;
  esac
done

command -v adb >/dev/null || { echo "adb fehlt – siehe README.md"; exit 1; }
adb connect "$IP:5555" >/dev/null
adb -s "$IP:5555" wait-for-device
DEV="adb -s $IP:5555"
echo "Verbunden: $($DEV shell getprop ro.product.model | tr -d '\r') / Fire OS $($DEV shell getprop ro.build.version.name | tr -d '\r')"

INSTALLED="$($DEV shell pm list packages | tr -d '\r' | sed 's/^package://')"
LOG="disabled-$(date +%Y%m%d-%H%M%S).log"

while read -r cat pkg _; do
  [[ -z "${cat:-}" || "$cat" == \#* ]] && continue
  [[ " $CATS " == *" $cat "* ]] || continue
  if ! grep -qx "$pkg" <<<"$INSTALLED"; then
    echo "  –  $pkg (nicht vorhanden)"; continue
  fi
  if (( DRY )); then echo "  ?  $pkg (würde deaktiviert)"; continue; fi
  if $DEV shell pm disable-user --user 0 "$pkg" 2>&1 | grep -qi "disabled"; then
    echo "  ✓  $pkg"; echo "$pkg" >> "$LOG"
  else
    echo "  ✗  $pkg (vom System geschützt)"
  fi
done < packages.txt

(( DRY )) || echo -e "\nFertig. Rückgängig machen: ./restore.sh $IP $LOG"
