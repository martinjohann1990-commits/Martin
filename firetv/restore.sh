#!/usr/bin/env bash
# Reaktiviert Pakete. Nutzung: ./restore.sh <IP> [logdatei]   (ohne Log: alle aus packages.txt)
set -euo pipefail
cd "$(dirname "$0")"
IP="${1:?Nutzung: $0 <IP> [logdatei]}"; LOG="${2:-}"
adb connect "$IP:5555" >/dev/null; DEV="adb -s $IP:5555"
if [[ -n "$LOG" ]]; then PKGS=$(cat "$LOG")
else PKGS=$(grep -v '^\s*#' packages.txt | awk 'NF{print $2}'); fi
for p in $PKGS; do $DEV shell pm enable "$p" >/dev/null 2>&1 && echo "  ✓  $p" || echo "  –  $p"; done
# Animationen zurücksetzen
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  $DEV shell settings put global "$k" 1.0; done
echo "Wiederhergestellt. Ggf. Stick neu starten: adb -s $IP:5555 reboot"
