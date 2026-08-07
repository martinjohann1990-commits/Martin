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

## Schnellstart

Voraussetzung ist **Python 3.10 oder neuer** ([Download](https://www.python.org/downloads/) —
unter Windows beim Installieren „Add Python to PATH" ankreuzen).

```bash
git clone <repo>
cd kleinanzeigen-tool
```

Dann:

| System | Befehl |
| --- | --- |
| macOS / Linux | `./start.sh` |
| Windows | Doppelklick auf `start.bat` |

Beim ersten Aufruf richtet das Skript die Umgebung ein und fragt nach dem
API-Schlüssel (den kostenlosen bekommst du unter
[aistudio.google.com/apikey](https://aistudio.google.com/apikey)). Danach
öffnet sich die Oberfläche im Browser. Ab dem zweiten Start geht es direkt los.

Der Schlüssel landet in `.env` im Projektordner und wird nicht mit ins Repo
übertragen. Alternativ geht auch `~/.kleinanzeigen-tool/.env` oder eine
gesetzte Umgebungsvariable — die gewinnt gegen die Datei.

## Auf dem Android-Handy (Termux)

Naheliegend, weil die Fotos schon dort liegen — kein Übertragen nötig.

1. **Termux** installieren, am besten aus [F-Droid](https://f-droid.org/packages/com.termux/)
   oder von [GitHub](https://github.com/termux/termux-packages/releases).
   Die Version aus dem Play Store ist veraltet und macht Probleme.
2. In Termux:

```bash
pkg update && pkg install git
git clone <repo>
cd kleinanzeigen-tool
./start.sh
```

Das Skript erkennt Termux und übernimmt die Besonderheiten selbst: es holt
`python` und `python-pillow` aus der Paketverwaltung (Fertigpakete von PyPI
passen auf Android nicht), fragt die Berechtigung für den Fotospeicher ab und
legt die Umgebung so an, dass sie diese Pakete auch sieht.

Danach steht im Terminal eine Adresse wie `http://127.0.0.1:8765/`. Die in
Chrome eintippen (oder `pkg install termux-api`, dann öffnet sie sich von
selbst). **Termux dabei im Hintergrund laufen lassen** — schließt du die App,
stoppt der Server.

Deine Fotos liegen nach `termux-setup-storage` unter `~/storage/dcim`. In der
Oberfläche wählst du sie ohnehin über den normalen Android-Dateidialog aus.

Auf Android wird bewusst **nur Gemini** installiert. Das Anthropic-SDK zieht
mit `jiter` eine weitere Rust-Komponente nach, die dort übersetzt werden
müsste — für einen Anbieter, den man ohne kostenloses Kontingent selten nutzt.
Nachrüsten geht jederzeit mit `.venv/bin/pip install -e ".[claude]"`.

**Wenn die Installation abbricht oder sehr lange dauert:** Ursache ist
`pydantic-core` — eine Rust-Komponente, für die es kein Android-Fertigpaket
gibt. Sie muss einmalig übersetzt werden. Dann:

```bash
pkg install rust binutils
./start.sh
```

Der erste Übersetzungsvorgang dauert auf dem Handy einige Minuten, danach nie
wieder. Das Skript nennt diesen Hinweis von sich aus, wenn es soweit ist.

Empfehlenswert auf dem Handy: **Bildgröße „klein" oder „winzig"** — das spart
Upload über Mobilfunk und Rechenzeit beim Skalieren.

## Installation von Hand

```bash
python3 -m venv .venv && source .venv/bin/activate

pip install -e ".[gemini]"          # nur Gemini (schlank, ohne Rust-Extras)
pip install -e ".[claude]"          # nur Claude
pip install -e ".[all]"             # beide Anbieter
pip install -e ".[browser]"         # zusätzlich das Vorausfüllen
playwright install chromium         # einmalig, nur für [browser]

kleinanzeigen ui                    # Oberfläche
kleinanzeigen create ./fotos/       # oder direkt im Terminal
```

## API-Schlüssel: woher, und was kostet das?

Das Tool arbeitet mit zwei Anbietern. Ein Schlüssel genügt.

### Gemini — kostenloses Kontingent

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) öffnen
2. Mit einem Google-Konto anmelden, „Create API key" klicken
3. Keine Kreditkarte nötig

Den Schlüssel entweder beim ersten `./start.sh` eintragen, in `.env` schreiben
(`cp .env.example .env`) oder exportieren:

```bash
export GEMINI_API_KEY="..."
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

### Mit Oberfläche (kein Terminal nötig)

```bash
kleinanzeigen ui
```

Startet einen Server auf deinem eigenen Rechner und öffnet den Browser.
Dort ziehst du die Fotos hinein, trägst optional Zusatzinfos ein und bekommst
den Entwurf zum Gegenlesen — mit Zeichenzählern für Titel und Beschreibung
sowie einem Kopieren-Knopf pro Feld.

Der Server bindet ausschließlich an `127.0.0.1`. Er ist also nur von deinem
Rechner erreichbar und nicht aus dem WLAN — sonst könnten andere auf deine
API-Kosten Anfragen stellen. Beenden mit Strg+C, anderer Port mit
`--port 8790`.

### Inserat erzeugen (Terminal)

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
  ui.py          Lokale Web-Oberfläche (Standardbibliothek, kein Framework)
  config.py      Schlüssel aus .env laden
  web/page.html  Die Oberfläche: eine Datei, kein Build-Schritt
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
