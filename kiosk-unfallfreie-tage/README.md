# Unfallfreie Tage – DC Losheim (Kiosk-Anzeige)

Es gibt zwei unabhängige Umsetzungen – je nachdem, ob eine PowerPoint-Datei
gebraucht wird oder nicht:

| Variante | Ordner/Datei | Zählt automatisch? | Braucht Task/Cron? |
|---|---|---|---|
| PowerPoint | `Unfallfreie_Tage_DC_Losheim.pptx` | ja, per Skript-Neuberechnung | ja, täglich |
| Web (Claude-Link) | `webboard/board.html` (bereits veröffentlicht) | ja, live im Browser | nein |
| Web (SharePoint) | `webboard/board-sharepoint.html` | ja, live im Browser | nein (Reset = Datei manuell ersetzen) |

Empfehlung, wenn kein Zwang zu PowerPoint besteht: eine der Web-Varianten,
weil dort niemand mehr täglich ein Skript ausführen muss – die Seite rechnet
die Tage selbst im Browser nach und aktualisiert sich um Mitternacht von allein.

## Dateien (PowerPoint-Variante)

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

---

## Web-Variante (kein PowerPoint nötig)

Beide Web-Varianten sind reines HTML/JavaScript: Die Anzahl der Tage wird bei
jedem Seitenaufruf aus dem Unfalldatum berechnet (`heute − letzter Unfall`)
und läuft um Mitternacht automatisch weiter, ganz ohne Skript, Task Scheduler
oder Cron – solange der Kiosk-Browser die Seite offen hält.

### Variante A – Claude-Artifact-Link (bereits eingerichtet)

`webboard/board.html` ist veröffentlicht unter:
https://claude.ai/code/artifact/87907790-2cad-4274-9440-5fcc0a24deb8

- Läuft sofort, ohne eigenes Hosting.
- Der Reset-Knopf (Zahnrad unten rechts) synchronisiert sich in Echtzeit auf
  **alle** offenen Kiosk-Monitore – dafür wird eine kleine Datenbank genutzt,
  die nur innerhalb von claude.ai funktioniert.
- Voraussetzung: Der Kiosk-Rechner/Browser muss diese `claude.ai`-URL öffnen
  dürfen (Firmen-Proxy/Firewall ggf. freigeben).

### Variante B – Eigenes Hosting, z. B. Corporate SharePoint

`webboard/board-sharepoint.html` ist eine einzelne, eigenständige Datei ohne
jede Abhängigkeit von claude.ai – läuft auf jedem Webserver, auch auf
SharePoint.

**Wichtig – zwei verschiedene SharePoint-Einschränkungen, nicht nur eine:**

1. **„Browser File Handling"** steht standardmäßig auf **Strict** – dann
   bietet SharePoint `.html`-Dateien nur zum Download an, statt sie
   auszuführen. Ein Admin muss das für die Bibliothek/Site auf **Permissive**
   stellen (SharePoint Admin Center → Richtlinien → Zugriffssteuerung →
   „Browserzugriff" bzw. per PowerShell `Set-SPOSite`/`Set-PnPSite
   -BrowserFileHandling Permissive`).
2. **„Custom Script"** ist auf vielen modernen SharePoint-/OneDrive-Sites
   ebenfalls deaktiviert (separate, strengere Einstellung). In der Praxis
   gezeigt: Selbst mit Permissive rendert SharePoint die Datei dann in einem
   abgeschotteten Vorschau-Rahmen **ohne eigene Web-Adresse**, in dem jede
   Netzwerk-Anfrage (`fetch`, `XMLHttpRequest`) aus der Seite heraus
   blockiert wird – unabhängig davon, ob man die Datei anklickt oder einen
   „direkten" Link verwendet. Ein Admin kann das über PowerShell prüfen/ändern:
   `Set-SPOSite -Identity <Site-URL> -DenyAddAndCustomizePages $false`
   (erfordert SharePoint-Admin-Rechte; viele Organisationen lassen das aus
   Sicherheitsgründen nicht zu).

**Deshalb verzichtet `board-sharepoint.html` bewusst auf jede Netzwerk-Anfrage.**
Das Unfalldatum steckt als Konstante direkt im Code
(`FALLBACK_INCIDENT_DATE`). Die automatische Tageszählung läuft rein lokal im
Browser und funktioniert dadurch garantiert, auch unter Custom-Script-Sperre –
nur der Reset nach einem Unfall braucht einen manuellen Schritt (siehe unten),
weil die Seite nichts zurück nach SharePoint schreiben oder nachladen kann.

**Einrichtung:**

1. `board-sharepoint.html` in eine SharePoint-Dokumentbibliothek hochladen
   (Browser File Handling wie oben beschrieben auf Permissive stellen).
2. Kiosk-Monitor: Browser im Kiosk-/Vollbildmodus auf die **direkte** Datei-URL
   zeigen lassen – nicht auf die Bibliotheksansicht. Die Datei anklicken öffnet
   SharePoints Vorschau (mit Such-/Menüleiste drumherum) statt der Seite
   selbst; stattdessen per Rechtsklick „Link kopieren"/„Copy link" die direkte
   URL holen und diese im Kiosk-Browser öffnen.

**Nach einem Unfall (Variante B):**

1. Auf einem beliebigen Gerät die Seite öffnen, unten rechts auf das
   Zahnrad klicken.
2. Unfalldatum eingeben, die erzeugte Code-Zeile kopieren
   (`const FALLBACK_INCIDENT_DATE = "JJJJ-MM-TT";`).
3. `board-sharepoint.html` herunterladen, in einem Texteditor öffnen, diese
   eine Zeile ersetzen, speichern.
4. Die geänderte Datei in SharePoint hochladen (vorhandene Datei ersetzen).
5. Jeder Kiosk-Monitor übernimmt die Änderung beim nächsten Neuladen der Seite.

**Hinweis zu Schriftarten:** Die Seite lädt „Big Shoulders Display"/„Archivo"
von Google Fonts nach. Ist das Firmennetz der Kiosk-Rechner ohne Internetzugang
(z. B. reines OT-/Lagernetz), schlägt das fehl – die Seite fällt dann automatisch
auf eine Systemschrift zurück und funktioniert trotzdem, sieht nur etwas
schlichter aus.
