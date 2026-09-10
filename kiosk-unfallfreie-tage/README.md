# Unfallfreie Tage – DC Losheim (Kiosk-Anzeige)

Es gibt zwei unabhängige Umsetzungen – je nachdem, ob eine PowerPoint-Datei
gebraucht wird oder nicht:

| Variante | Ordner/Datei | Zählt automatisch? | Braucht Task/Cron? |
|---|---|---|---|
| PowerPoint | `Unfallfreie_Tage_DC_Losheim.pptx` | ja, per Skript-Neuberechnung | ja, täglich |
| Web (Claude-Link) | `webboard/board.html` (bereits veröffentlicht) | ja, live im Browser | nein |
| Web (SharePoint) | `webboard/board-sharepoint.html` + `webboard/config.json` | ja, live im Browser | nein |

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

`webboard/board-sharepoint.html` + `webboard/config.json` sind eine
eigenständige Version ohne jede Abhängigkeit von claude.ai – die beiden
Dateien laufen auf jedem Webserver, auch auf SharePoint.

**Wichtige Voraussetzung bei SharePoint:** Standardmäßig ist „Browser File
Handling" auf **Strict** gestellt – dann bietet SharePoint `.html`-Dateien
nur zum Download an, statt sie im Browser auszuführen. Ein SharePoint-Admin
muss das für die Bibliothek/Site, in der diese Dateien liegen, auf
**Permissive** setzen (SharePoint Admin Center → Richtlinien → Zugriffssteuerung
→ „Browserzugriff" bzw. per PowerShell `Set-SPOSite`/`Set-PnPSite
-BrowserFileHandling Permissive`), damit die Seite direkt läuft.

**Einrichtung:**

1. `board-sharepoint.html` und `config.json` **zusammen im selben Ordner**
   einer SharePoint-Dokumentbibliothek ablegen (Browser File Handling wie
   oben beschrieben auf Permissive stellen).
2. Kiosk-Monitor: Browser im Kiosk-/Vollbildmodus auf die SharePoint-URL der
   `board-sharepoint.html` zeigen lassen.
3. Die Seite liest `config.json` beim Laden und danach alle 5 Minuten neu
   (`POLL_MS` im Script) – ein Reset wird also spätestens nach 5 Minuten auf
   allen Monitoren sichtbar, ganz ohne Neustart.

**Nach einem Unfall (Variante B):**

1. Auf einem beliebigen Gerät die Seite öffnen, unten rechts auf das
   Zahnrad klicken.
2. Unfalldatum eingeben, „Inhalt kopieren" klicken.
3. In SharePoint die Datei `config.json` im selben Ordner mit dem kopierten
   Inhalt überschreiben (hochladen → vorhandene Datei ersetzen).
   Die Seite kann `config.json` aus Sicherheitsgründen nicht selbst
   beschreiben – dieser manuelle Upload-Schritt bleibt nötig.

**Hinweis zu Schriftarten:** Die Seite lädt „Big Shoulders Display"/„Archivo"
von Google Fonts nach. Ist das Firmennetz der Kiosk-Rechner ohne Internetzugang
(z. B. reines OT-/Lagernetz), schlägt das fehl – die Seite fällt dann automatisch
auf eine Systemschrift zurück und funktioniert trotzdem, sieht nur etwas
schlichter aus.
