# kleinanzeigen-tool

Macht aus ein paar Handyfotos ein fertiges Inserat für **kleinanzeigen.de**:
Titel, Beschreibung, Kategorie, Zustand, Suchbegriffe und einen begründeten
Preisvorschlag. Auf Wunsch wird das Anzeigenformular anschließend im Browser
vorausgefüllt.

```
$ kleinanzeigen create ./fotos/

TITEL
  Bosch PSR 18 LI Akkuschrauber mit 2 Akkus und Ladegerät
  (56/65 Zeichen)

PREIS
  55 € VB   (Spanne 45–70 €)
  Vergleichbare Geräte dieser Baureihe liegen gebraucht bei 45 bis 70 Euro …

KATEGORIE
  Heimwerken → Werkzeug → Handwerkzeug
…
```

## Was das Tool nicht tut

**Es veröffentlicht keine Anzeigen.** Der `fill`-Befehl öffnet einen sichtbaren
Browser und trägt die Felder ein — der Klick auf „Anzeige aufgeben" bleibt bei
dir. Das ist Absicht:

- Die Nutzungsbedingungen von kleinanzeigen.de untersagen das automatisierte
  Einstellen von Anzeigen. Ein vollautomatischer Ablauf riskiert die Sperrung
  deines Kontos.
- Preis, Zustand und Mängelangaben sind rechtlich verbindliche Aussagen. Ein
  KI-Entwurf gehört gegengelesen, bevor er online geht.

## Installation

```bash
git clone <repo> && cd kleinanzeigen-tool
python3 -m venv .venv && source .venv/bin/activate

pip install -e .                    # nur Analyse
pip install -e ".[browser]"         # zusätzlich das Vorausfüllen
playwright install chromium         # einmalig, nur für [browser]
```

Zugangsdaten für die Claude API:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Alternativ funktioniert eine per `ant auth login` angelegte Anmeldung ohne
gesetzte Umgebungsvariable.

## Verwendung

### Inserat erzeugen

```bash
# Alle Bilder eines Ordners gehören zu einem Artikel
kleinanzeigen create ./fotos/

# Einzelne Dateien
kleinanzeigen create vorne.jpg hinten.jpg typenschild.jpg
```

Nützliche Optionen:

| Option | Wirkung |
| --- | --- |
| `--notes "…"` | Infos, die man den Bildern nicht ansieht (Alter, Zubehör, Defekte). Diese Angaben gelten als verlässlich und ergänzen die Bildanalyse. |
| `--price 120` | Eigene Preisvorstellung. Wird berücksichtigt; weicht sie stark vom Marktpreis ab, steht das in der Begründung. |
| `--condition Gut` | Zustand vorgeben statt schätzen lassen (`Neu`, `Sehr Gut`, `Gut`, `In Ordnung`, `Defekt`). |
| `--location "10115 Berlin"` | Standort, fließt in den Versandhinweis ein. |
| `--research` | Sucht vorab im Web nach aktuellen Gebrauchtpreisen. Deutlich bessere Preise, kostet einen zusätzlichen API-Aufruf. |
| `--out anzeige` | Schreibt `anzeige.json` (maschinenlesbar) und `anzeige.md` (zum Gegenlesen). |
| `--max-images 12` | Obergrenze der analysierten Bilder. |
| `--fill` | Öffnet direkt im Anschluss den Browser. |

### Formular vorausfüllen

```bash
kleinanzeigen create ./fotos/ --out anzeige
# … anzeige.md lesen, ggf. anzeige.json anpassen …
kleinanzeigen fill anzeige.json --images ./fotos/
```

Ablauf: Ein Chromium-Fenster öffnet sich auf der Seite „Anzeige aufgeben". Du
meldest dich an und wählst die Kategorie (der Vorschlag steht im Terminal).
Sobald das Formular sichtbar ist, drückst du im Terminal Enter — Titel,
Beschreibung, Preis, Preistyp und die Bilder werden eingetragen. Danach prüfst
du und veröffentlichst selbst.

Die Anmeldung wird in einem eigenen Browser-Profil unter
`~/.kleinanzeigen-tool/browser-profile` gespeichert, du musst dich also nur
einmal einloggen. Das Tool selbst sieht deine Zugangsdaten nie.

## Was das Tool für dich tut

- **EXIF wird entfernt.** Bilder werden neu kodiert, dabei fallen die
  Metadaten weg — inklusive der GPS-Koordinaten, die dein Handy ins Foto
  schreibt und die sonst deine Wohnadresse mit veröffentlichen.
- **Bilder werden gedreht und skaliert.** Querliegende Handyfotos werden nach
  EXIF-Orientierung gerade gerückt, große Bilder auf 2576px lange Kante
  gerechnet (spart Upload und Tokens ohne Qualitätsverlust für die Analyse).
- **Plattform-Limits werden erzwungen.** Titel max. 65 Zeichen, Beschreibung
  max. 4000, höchstens 10 Suchbegriffe — an der Wortgrenze gekürzt, statt die
  Antwort zu verwerfen.
- **Es wird gewarnt, wenn etwas unsicher ist**: unklar erkannter Artikel,
  fehlende Marke, sehr breite Preisspanne.

## Kosten

Ein `create`-Lauf mit 5 Bildern liegt grob bei 0,05–0,15 €
(Claude Opus 5, ~5k–20k Input-Tokens je nach Bildanzahl und -größe).
`--research` kommt als zweiter Aufruf obendrauf. Die tatsächlich verbrauchten
Tokens stehen am Ende jeder Ausgabe und in der JSON-Datei.

## Wenn das Vorausfüllen nicht mehr klappt

Kleinanzeigen ändert gelegentlich sein HTML, dann finden die CSS-Selektoren die
Felder nicht mehr (`Nicht gefunden: Titel, Preis`). Statt auf ein Update zu
warten, kannst du eigene Selektoren mitgeben:

```json
{
  "title": "#neuer-titel-selektor",
  "description": ["textarea[name='beschreibung']", "#fallback"]
}
```

```bash
kleinanzeigen fill anzeige.json --selectors meine-selektoren.json
```

Die eigenen Werte werden vor die eingebauten gestellt, die als Rückfallebene
erhalten bleiben. Selektor findest du über Rechtsklick → Untersuchen im
Browser.

## Projektstruktur

```
src/kleinanzeigen_tool/
  cli.py         Kommandozeile (create / fill)
  images.py      Bilder sammeln, drehen, skalieren, kodieren
  analyzer.py    Claude-Aufrufe: Preisrecherche + strukturierte Analyse
  models.py      Datenmodell des Inserats, zugleich JSON-Schema fürs Modell
  export.py      Ausgabe als JSON, Markdown und Terminal
  browser.py     Playwright: Formular vorausfüllen (ohne Veröffentlichen)
```

## Entwicklung

```bash
pip install -e ".[dev]"
pytest
```

Die Tests laufen ohne API-Zugang und ohne Browser — die Netzwerkgrenze ist
bewusst nicht Teil der Testsuite.

## Grenzen

- Der Kategorievorschlag ist ein Textpfad, keine Kategorie-ID. Die Auswahl im
  Formular triffst du selbst; die Seite schlägt anhand des Titels meist
  ohnehin die richtige vor.
- Standort, Versandart und Artikelmerkmale der jeweiligen Kategorie werden
  nicht ausgefüllt — die Felder unterscheiden sich je Kategorie zu stark.
- Die Preisschätzung ohne `--research` beruht auf dem Modellwissen und kann
  bei Nischenartikeln oder frischen Produkten danebenliegen.

## Lizenz

MIT
