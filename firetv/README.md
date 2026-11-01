# Fire TV Stick: aufräumen und Apple-TV-Look

Dieses Paket entfernt Werbung, Telemetrie und unnötige Amazon-Apps von deinem Fire TV Stick und gibt ihm eine ruhige, dunkle Oberfläche im Stil von tvOS.

**Alles ist umkehrbar.** Die Skripte deaktivieren Apps nur (`pm disable-user`), sie löschen nichts. `restore.sh` stellt den alten Zustand wieder her, und ein Zurücksetzen auf Werkseinstellungen geht auch immer.

> ⚠️ Gilt für Fire TV Sticks mit **Fire OS** (Android-basiert, also fast alle Modelle bis 2025).
> Neuere Geräte mit **Vega OS** (z. B. Fire TV Stick 4K Select) erlauben kein ADB-Sideloading. Dort funktioniert dieses Paket nicht.
> Prüfen: *Einstellungen → Mein Fire TV → Info → Software-Version*.

---

## 1. Fire TV vorbereiten (einmalig)

1. *Einstellungen → Mein Fire TV → Info*: **7× auf den Gerätenamen klicken**. Danach erscheinen die Entwickleroptionen.
2. *Einstellungen → Mein Fire TV → Entwickleroptionen*:
   - **ADB-Debugging: AN**
   - **Apps unbekannter Herkunft: AN** (oder für die App „Downloader“ erlauben)
3. IP-Adresse notieren: *Einstellungen → Mein Fire TV → Info → Netzwerk* (z. B. `192.168.178.42`).

## 2. ADB auf dem Rechner installieren

| System  | Befehl |
|---------|--------|
| macOS   | `brew install android-platform-tools` |
| Windows | [Platform Tools](https://developer.android.com/tools/releases/platform-tools) entpacken; die Skripte über **Git Bash** oder **WSL** ausführen |
| Linux   | `sudo apt install adb` |

Beim ersten Verbinden erscheint auf dem Fernseher die Frage **„USB-Debugging zulassen?“**. Wähle „Immer zulassen“ und bestätige.

## 3. Bloatware entfernen

```bash
cd firetv
./debloat.sh 192.168.178.42 --dry-run   # erst ansehen, was passieren würde
./debloat.sh 192.168.178.42             # Werbung + Telemetrie deaktivieren (sicher)
./debloat.sh 192.168.178.42 --apps      # zusätzlich Amazon Music, Freevee, Prime Video, Silk …
```

- Welche Pakete betroffen sind, steht in `packages.txt`. Wenn du eine App behalten willst (z. B. **Prime Video**), lösche die Zeile oder setze ein `#` davor.
- `--updates` schaltet die System-Updates ab. **Davon rate ich ab**, weil der Stick dann keine Sicherheits-Patches mehr bekommt.
- Pakete, die Fire OS schützt, überspringt das Skript einfach. Das ist normal.

**Rückgängig machen:** `./restore.sh 192.168.178.42 disabled-<datum>.log`

### Zusätzlich in den Einstellungen abschalten (geht nicht per Skript)

*Einstellungen → Präferenzen*:
- **Datenschutzeinstellungen**: Gerätenutzungsdaten AUS · Daten zur App-Nutzung erfassen AUS · Interessenbasierte Werbung AUS
- **Datenüberwachung**: AUS
- **Ausgewählte Inhalte**: Automatische Video-Wiedergabe AUS · Automatische Audio-Wiedergabe AUS
- **Benachrichtigungseinstellungen**: Werbebenachrichtigungen AUS

## 4. Apple-TV-Look

### a) Animationen und Wallpaper

```bash
./apple-look.sh 192.168.178.42
```

Das Skript halbiert die Animationsdauer, wodurch sich der Stick spürbar flinker anfühlt, und kopiert drei Wallpaper im tvOS-Stil nach `/sdcard/Pictures/Wallpaper`:

| `midnight.png` | `graphite.png` | `aurora.png` |
|---|---|---|
| ![](wallpapers/midnight.png) | ![](wallpapers/graphite.png) | ![](wallpapers/aurora.png) |

### b) Projectivy Launcher installieren

Der Amazon-Startbildschirm ist voller Werbung. **Projectivy Launcher** (kostenlos) ersetzt ihn durch eine schlichte Oberfläche, die dem Apple-TV-Homescreen sehr nahe kommt.

1. Den **Amazon Appstore** nach „Projectivy Launcher“ durchsuchen. Falls er dort nicht zu finden ist: die App **Downloader** installieren und darüber die offizielle Projectivy-Seite bzw. das APK aus dem Play Store/XDA-Thread laden.
2. Projectivy öffnen. In den Einstellungen unter **„Launcher-Einstellungen → Aktuellen Launcher überschreiben“** die Option aktivieren und den angeforderten Bedienungshilfen-Dienst erlauben. Danach landet die Home-Taste in Projectivy.
   *(Amazon blockiert alternative Launcher bei manchen Fire-OS-Versionen immer wieder. Wenn die Home-Taste trotzdem den Amazon-Launcher öffnet, starte Projectivy als App oder lege es auf die Favoritenleiste.)*

### c) Projectivy wie tvOS einrichten

| Einstellung | Wert |
|---|---|
| Hintergrund | *Eigenes Bild* → `/sdcard/Pictures/Wallpaper/midnight.png` |
| Hintergrund-Unschärfe / Abdunkeln | mittel |
| Design / Akzentfarbe | Dunkel · Weiß |
| Kanäle (Kategorien) | nur **eine** Zeile „Favoriten“, alles andere ausblenden |
| Kartenform | abgerundet, große Kacheln, keine App-Namen |
| Vorschau-Videos / Werbe-Kanäle | AUS |
| Uhr | oben rechts, schlicht |
| Schriftart | Standard (sans-serif) |

**Tipp für den Apple-Look:** höchstens 6–8 Apps in die Favoritenreihe legen (z. B. Netflix, YouTube, Disney+, ARD, ZDF, Plex) und den Rest im App-Drawer lassen. Weniger ist mehr.

### d) Bildschirmschoner

*Einstellungen → Display & Töne → Bildschirmschoner*: Album **„Amazon-Kollektion“** mit Stil **„Ken Burns“** und Diashow-Geschwindigkeit **langsam** kommt den Apple-Aerials am nächsten. Wer die echten Apple-Aerials will, kann Projectivy einen eigenen Bildschirmschoner nutzen lassen (Aerial-Screensaver-Apps für Android TV).

---

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| `failed to connect` | Stick und Rechner im selben WLAN? ADB-Debugging an? Stick neu starten. |
| `unauthorized` | Den Dialog am Fernseher bestätigen und das Skript erneut starten. |
| Etwas funktioniert nicht mehr | `./restore.sh <IP>` reaktiviert alles aus `packages.txt` |
| Totalausfall | Zurück auf Werkseinstellungen: **Zurück + Navigation rechts 10 s halten** |
