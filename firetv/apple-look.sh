#!/usr/bin/env bash
# Apple-TV-artiger Feinschliff: flotte, ruhige Animationen + Wallpaper auf den Stick kopieren.
# Nutzung: ./apple-look.sh <IP>
set -euo pipefail
cd "$(dirname "$0")"
IP="${1:?Nutzung: $0 <IP>}"
adb connect "$IP:5555" >/dev/null; DEV="adb -s $IP:5555"

# Kürzere Animationen wirken auf dem Stick spürbar flüssiger (Apple-TV-Feeling)
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  $DEV shell settings put global "$k" 0.5
done
echo "  ✓  Animationen auf 0.5x"

# Wallpaper für den Launcher ablegen
$DEV shell mkdir -p /sdcard/Pictures/Wallpaper
for f in wallpapers/*.png; do $DEV push "$f" /sdcard/Pictures/Wallpaper/ >/dev/null && echo "  ✓  $(basename "$f") kopiert"; done

echo
echo "Jetzt Projectivy Launcher einrichten – siehe README.md, Abschnitt 4."
