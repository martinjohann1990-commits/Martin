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

pip install -e .                    # Analyse mit Claude
pip install -e ".[gemini]"          # zusätzlich Gemini als Anbieter
pip install -e ".[browser]"         # zusätzlich das Vorausfüllen
playwright install chromium         # einmalig, nur für [browser]
```

## API-Schlüssel: woher, und was kostet das?

Das Tool arbeitet mit zwei Anbietern. Ein Schlüssel genügt.

### Gemini — kostenloses Kontingent

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) öffnen
2. Mit einem Google-Konto anmelden, „Create API key" klicken
3. Keine Kreditkarte nötig

```bash
export GEMINI_API_KEY="..."
kleinanzeigen create ./fotos/ --provider gemini
```

Die kostenlose Stufe hat Limits pro Minute und pro Tag. Für ein paar Inserate
reicht sie, aber mehrere Läufe kurz hintereinander laufen ins Minutenlimit —
dann meldet das Tool „Kontingent erschöpft" und du wartest kurz.

**Wichtig:** Auf der kostenlosen Stufe darf Google die übermittelten Daten zur
Produktverbesserung verwenden — bei Fotos aus der eigenen Wohnung ist das eine
bewusste Entscheidung. Wer das nicht will, aktiviert die kostenpflichtige Stufe
oder nutzt Claude.

**Zum Standardmodell:** Gemini nimmt ältere Modelle für neue Nutzer vom Netz
(`gemini-2.5-flash` etwa ist nicht mehr erreichbar, taucht in der Modellliste
aber weiterhin auf). Deshalb steht der Standard auf dem mitlaufenden Alias
`gemini-flash-latest`. Wer eine feste Version braucht, pinnt sie mit `--model`.

**`--research` funktioniert auf der kostenlosen Stufe nicht.** Die Google-Suche
zählt gegen ein eigenes, sehr knappes Kontingent und liefert dort sofort einen
429-Fehler — die Bildanalyse selbst läuft dagegen problemlos. Getestet und
bestätigt. Wenn du Preisrecherche willst: `--research --provider claude`, oder
Gemini auf die kostenpflichtige Stufe heben.

### Claude — kostenpflichtig, bessere Erkennung

1. [console.anthropic.com](https://console.anthropic.com) → Konto anlegen
2. Unter *Billing* Guthaben aufladen (Vorkasse, kleinster Betrag üblicherweise 5 $)
3. Unter *API Keys* → *Create Key*

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Es gibt **kein kostenloses Kontingent** — jeder Aufruf zieht vom Guthaben ab.
Alternativ funktioniert eine per `ant auth login` angelegte Anmeldung ohne
gesetzte Umgebungsvariable.

### Ohne `--provider`

wählt das Tool automatisch: Claude, wenn ein Anthropic-Schlüssel da ist, sonst
Gemini. Fehlt beides, erklärt die Fehlermeldung beide Wege.

## Was ein Inserat kostet

Die Kosten werden fast vollständig von den **Bildern** bestimmt, nicht vom
Text — und die Tokenzahl wächst quadratisch mit der Kantenlänge. Deshalb ist
`--image-size` der wirksamste Hebel, noch vor der Wahl des Modells:

| `--image-size` | Lange Kante | Tokens/Bild | 5 Bilder mit Claude Opus | 5 Bilder mit Claude Haiku |
| --- | --- | --- | --- | --- |
| `hoch` | 2576 px | ~4800 | ~0,17 € | ~0,03 € |
| `mittel` (Standard) | 1568 px | ~2500 | ~0,10 € | ~0,02 € |
| `klein` | 1024 px | ~1050 | ~0,05 € | ~0,01 € |
| `winzig` | 768 px | ~590 | ~0,04 € | ~0,01 € |

Mit **Gemini auf der kostenlosen Stufe: 0 €**, unabhängig von der Bildgröße.

Ein paar Faustregeln:

- `mittel` reicht, um „was ist das für ein Gegenstand" zuverlässig zu
  beantworten. `hoch` lohnt sich nur bei kleiner Schrift auf Typenschildern
  oder feinen Kratzern.
- Für Alltagsartikel liefert `--model claude-haiku-4-5` brauchbare Ergebnisse
  zu einem Bruchteil des Preises.
- `--research` ist ein zusätzlicher Aufruf und schlägt nochmal ähnlich zu Buche.

Die tatsächlich verbrauchten Tokens stehen am Ende jeder Ausgabe und in der
JSON-Datei — verlass dich darauf, nicht auf die Schätzungen oben.

```bash
kleinanzeigen models                    # welche Modelle schaltet mein Schlüssel frei?
kleinanzeigen models --provider gemini
```

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
| `--provider gemini` | Anbieter erzwingen (`auto`, `claude`, `gemini`). |
| `--model …` | Konkretes Modell, z.B. `claude-haiku-4-5` oder `gemini-3.6-flash`. |
| `--image-size klein` | Bildauflösung und damit die Kosten senken (siehe Tabelle oben). |
| `--notes "…"` | Infos, die man den Bildern nicht ansieht (Alter, Zubehör, Defekte). Diese Angaben gelten als verlässlich und ergänzen die Bildanalyse. |
| `--price 120` | Eigene Preisvorstellung. Wird berücksichtigt; weicht sie stark vom Marktpreis ab, steht das in der Begründung. |
| `--condition Gut` | Zustand vorgeben statt schätzen lassen (`Neu`, `Sehr Gut`, `Gut`, `In Ordnung`, `Defekt`). |
| `--location "10115 Berlin"` | Standort, fließt in den Versandhinweis ein. |
| `--research` | Sucht vorab im Web nach aktuellen Gebrauchtpreisen. Kostet einen zusätzlichen API-Aufruf. **Auf Gemini nur mit kostenpflichtiger Stufe** — siehe unten. |
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
  EXIF-Orientierung gerade gerückt und auf die gewählte `--image-size`-Stufe
  gerechnet (Standard 1568px lange Kante) — das spart Upload und Tokens, ohne
  dass die Erkennung darunter leidet.
- **Plattform-Limits werden erzwungen.** Titel max. 65 Zeichen, Beschreibung
  max. 4000, höchstens 10 Suchbegriffe — an der Wortgrenze gekürzt, statt die
  Antwort zu verwerfen.
- **Es wird gewarnt, wenn etwas unsicher ist**: unklar erkannter Artikel,
  fehlende Marke, sehr breite Preisspanne.

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
  analyzer.py    Anbieterunabhängige Prompts und Orchestrierung
  providers/     Austauschbare Backends (claude.py, gemini.py)
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
- Die Kostenangaben oben sind gerundete Schätzungen auf Basis der
  Listenpreise. Maßgeblich ist die Abrechnung deines Anbieters — die real
  verbrauchten Tokens stehen nach jedem Lauf in der Ausgabe.
- Gemini und Claude erkennen unterschiedlich gut. Bei unklaren Ergebnissen
  lohnt der Quervergleich: derselbe Ordner einmal mit `--provider gemini`,
  einmal mit `--provider claude`.

## Lizenz

MIT
