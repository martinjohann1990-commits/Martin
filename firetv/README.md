# Fire TV Stick 4K (2. Gen): Bloatware entfernen und cleanes Design

Gerät: Fire TV Stick 4K (2. Gen) mit Fire OS 8.1.8.5. Die IP-Adresse `192.168.178.160` ist in den Skripten schon voreingestellt.

> Alles läuft über ADB vom PC aus, im eigenen WLAN. Am System wird nichts endgültig gelöscht: Pakete werden nur für deinen Benutzer deaktiviert, und `restore` macht alles rückgängig. Ein Werksreset stellt ebenfalls alles wieder her.

---

## 1. Fire TV vorbereiten (einmalig)

1. **Einstellungen → Mein Fire TV → Info** öffnen und **7× auf „Fire TV Stick“** drücken. Danach erscheint „Entwickleroptionen“.
2. **Einstellungen → Mein Fire TV → Entwickleroptionen → ADB-Debugging: EIN**.
3. In der FRITZ!Box die IP festlegen: *Heimnetz → Netzwerk → Fire TV → „Diesem Gerät immer die gleiche IPv4-Adresse zuweisen“*.

## 2. PC vorbereiten

Lade die **Android SDK Platform-Tools** herunter: https://developer.android.com/tools/releases/platform-tools

- **Windows:** Den ZIP-Inhalt (Ordner `platform-tools`) in diesen `firetv`-Ordner entpacken.
- **macOS:** `brew install android-platform-tools`
- **Linux:** `sudo apt install adb`

PC und Fire TV müssen im selben WLAN sein (`FRITZ!Box 7430 BQ`).

## 3. Bloatware entfernen

Mach zuerst einen Probelauf. Er zeigt nur an, was passieren würde:

```powershell
# Windows (PowerShell im firetv-Ordner)
powershell -ExecutionPolicy Bypass -File .\firetv.ps1 debloat -DryRun
powershell -ExecutionPolicy Bypass -File .\firetv.ps1 debloat
```
```bash
# macOS / Linux
./firetv.sh debloat --dry-run
./firetv.sh debloat
```

Beim ersten Verbinden erscheint am **Fernseher** die Frage „USB-Debugging zulassen?“. Bestätige sie mit **„Immer zulassen“**.

| Liste | Inhalt | Aktivieren mit |
|---|---|---|
| `packages-safe.txt` | Shopping, Werbung, Telemetrie, Freevee/IMDb, GameCircle, Amazon Music … | Standard |
| `packages-optional.txt` | Amazon Photos (Bildschirmschoner!), Silk, Live-TV, Prime Video | `-Optional` / `--optional` |
| `packages-updates.txt` | Automatische System-Updates | `-BlockUpdates` / `--block-updates` |

Die Listen sind einfache Textdateien. Du kannst Zeilen löschen oder mit `#` auskommentieren.

**Bewusst NICHT angefasst:** Amazon-Launcher, Einstellungen, Tastatur, Alexa/Sprachfernbedienung, WebView, Appstore. Wenn du diese entfernst, kann das Gerät unbrauchbar werden.

> **Hinweis zu Fire OS 8:** Amazon blockiert bei manchen Systemapps das Deaktivieren. Das Skript versucht dann eine zweite Methode. Klappt auch die nicht, wird das Paket als „blockiert“ übersprungen. Das ist normal und schadet nicht.

**Rückgängig machen:** `.\firetv.ps1 restore` bzw. `./firetv.sh restore`

## 4. Cleanes Design

Die Werbebanner und die überladene Startseite gehören fest zum Amazon-Launcher. Den kann man nicht gefahrlos entfernen. Die Lösung ist ein **alternativer Launcher**, der die Startseite übernimmt.

**Empfehlung: Projectivy Launcher.** Er ist werbefrei, schlicht und funktioniert auf Fire OS 8.

1. Lade die Projectivy-APK von der offiziellen Quelle des Entwicklers herunter (Link im XDA-Thread / auf der Projectivy-Webseite). Alternativ installierst du am Fire TV die App „Downloader“ aus dem Appstore.
2. Installieren:
   ```powershell
   .\firetv.ps1 launcher -Apk C:\Downloads\projectivy.apk
   ```
   ```bash
   ./firetv.sh launcher ~/Downloads/projectivy.apk
   ```
3. Projectivy am TV öffnen: **Einstellungen → Allgemein → Launcher-Override (Startseiten-Übernahme)** aktivieren. Den angefragten Bedienungshilfe-Dienst erlaubst du.

**Vorschlag für einen cleanen Look in Projectivy:**
- Hintergrund: dunkles einfarbiges Bild oder ein dezenter Verlauf
- Nur 1–2 Kanäle bzw. Zeilen: *Favoriten* (Netflix, YouTube, Prime, Disney+ …) und *Alle Apps*
- Uhr oben rechts, Wetter aus, Kartenstil „Abgerundet“, Animationen „Schnell“
- Unbenutzte Kategorien ausblenden

**Animationen beschleunigen** (die Bedienung fühlt sich dadurch flotter an):
```powershell
.\firetv.ps1 tweaks
```

## 5. Manuelle Einstellungen am Fire TV (empfohlen)

- **Einstellungen → Präferenzen → Ausgewählte Inhalte:** *Automatische Video-Wiedergabe* und *Automatische Audio-Wiedergabe* **AUS**
- **Einstellungen → Präferenzen → Datenschutzeinstellungen:** *Gerätenutzungsdaten*, *App-Nutzungsdaten* und *Interessenbasierte Werbung* **AUS**
- **Einstellungen → Präferenzen → Datenüberwachung:** **AN**
- **Einstellungen → Anwendungen → Installierte Anwendungen verwalten:** nicht benötigte Apps deinstallieren

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| `Keine Verbindung` | ADB-Debugging aktiv? IP korrekt? Dialog am TV bestätigt? Notfalls `adb kill-server` und erneut versuchen |
| `unauthorized` | Dialog am TV mit „Immer zulassen“ bestätigen |
| Startseite springt zurück zu Amazon | Override in Projectivy erneut aktivieren (nach Fire-OS-Updates nötig) |
| Etwas funktioniert nicht mehr | `restore` ausführen und neu starten |
