# Unfallfreie Tage – DC Losheim (Kiosk-Folie)

## Dateien

- `Unfallfreie_Tage_DC_Losheim.pptx` – die fertige Folie (1 Slide, 16:9), für die Kiosk-Monitore.
- `config.json` – enthält nur das Startdatum (`startDate` = Tag nach dem letzten Unfall).
- `update_counter.py` – aktualisiert die Zahl auf der Folie jeden Tag automatisch.
- `generate_slide.js` – erzeugt die Folie komplett neu (nur nötig, falls das Design geändert werden soll).

## Wichtig: PowerPoint zählt nicht von selbst hoch

Eine `.pptx`-Datei hat kein "lebendiges" Feld, das jeden Tag automatisch +1 rechnet.
Die Lösung hier: `update_counter.py` berechnet täglich neu, wie viele Tage seit
`startDate` vergangen sind, und schreibt die Zahl in die bestehende Folie.
Dafür muss das Skript einmal pro Tag automatisch ausgeführt werden.

**Vorteil gegenüber einem stumpfen "+1 pro Tag"-Zähler:** Wenn der Rechner mal aus
war oder der Task an einem Tag nicht lief, korrigiert sich die Anzeige beim nächsten
Lauf von selbst, weil sie immer aus dem Datum neu berechnet wird.

## Einmalige Einrichtung

Auf dem Rechner, der die Kiosk-Monitore versorgt:

```bash
pip install python-pptx
```

## Tägliche automatische Aktualisierung einrichten

### Windows (Aufgabenplanung)

1. Aufgabenplanung öffnen → „Aufgabe erstellen“.
2. Trigger: täglich, z. B. 00:05 Uhr.
3. Aktion: Programm starten
   - Programm/Skript: `python.exe`
   - Argumente: `update_counter.py`
   - Starten in: Pfad zu diesem Ordner (z. B. `C:\Kiosk\Unfallfreie-Tage`)
4. Falls die Folie in einer laufenden Diashow (Kiosk-Modus) angezeigt wird, PowerPoint
   danach kurz schließen und neu im Kiosk-Modus öffnen, damit die Änderung sichtbar
   wird (siehe Beispiel-Skript `restart_kiosk.ps1` weiter unten – bei Bedarf ergänzen
   mit dem tatsächlichen Pfad zu PowerPoint/der Datei).

### Linux/Mac (cron)

```bash
crontab -e
# Folgende Zeile hinzufügen (läuft täglich um 00:05 Uhr):
5 0 * * * /usr/bin/python3 /pfad/zu/update_counter.py >> /pfad/zu/update.log 2>&1
```

## Nach einem Unfall

`startDate` in `config.json` auf den Tag nach dem Unfall setzen (Format `YYYY-MM-DD`)
und `update_counter.py` einmal manuell ausführen – der Zähler startet dann wieder bei 0.

## Kiosk-Anzeige

Für Dauerbetrieb auf Kiosk-Monitoren: PowerPoint-Bildschirmpräsentation mit
„Bildschirmpräsentation durchführen (Kioskmodus)“ und Endlosschleife
(„Bis „Esc“ gedrückt wird“) einrichten, siehe Menü *Bildschirmpräsentation →
Bildschirmpräsentation einrichten*. Damit die tägliche Zahlenänderung sichtbar
wird, muss die Präsentation einmal täglich neu geladen werden (siehe oben).

Alternativ: Falls die Monitore über eine Digital-Signage-Software (z. B. die Datei
von einem Netzlaufwerk zieht) laufen, reicht es, wenn diese Software die Datei
regelmäßig neu einliest – das aktuelle Setup schreibt einfach dieselbe Datei
`Unfallfreie_Tage_DC_Losheim.pptx` täglich neu.
