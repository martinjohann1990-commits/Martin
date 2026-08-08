# FlowStock

Ein Cashflow- und Bestands-Dashboard für E-Commerce-Händler, das vollständig im
Browser läuft. Kein Backend, keine Datenbank, kein Server, keine Abhängigkeiten.
Der Nutzer lädt eine CSV, JavaScript parst und rechnet, fertig.

*A cash-flow and inventory dashboard for e-commerce sellers, running entirely in
the browser. No backend, no database, no server, no dependencies.*

---

## Was es kann

- **Kontostand-Prognose** bis 180 Tage, inklusive der Nachbestellungen, die in
  diesem Zeitraum fällig werden und Geld kosten
- **Bestellplan** je Artikel: Bestelldatum, Menge, Kosten, Tag des Ausverkaufs
- **Rohertrag** nach Gebühren, Versand und Wareneinsatz — je Artikel und gesamt
- **Umsatz nach Kanal**, gebundenes Kapital im Lager, Artikel mit Risiko
- **Zweisprachig** Deutsch / Englisch, per Klick umschaltbar, inklusive
  Zahlen-, Währungs- und Datumsformaten über `Intl`
- **Hell/Dunkel**, Druckansicht, CSV-Exporte, Tabellen-Ansicht zu jedem Diagramm

## Aufbau

Die ausgelieferte `index.html` ist **eine einzige Datei** ohne externe Ressourcen —
so lässt sie sich per Doppelklick von `file://` öffnen und offline nutzen. Entwickelt
wird trotzdem modular; `build.sh` fügt die Quellen zusammen.

```
src/00-head.html     Design-Tokens und Stylesheet
src/10-body.html     Markup (Landing, Dashboard, Dialoge)
src/20-i18n.js       Wörterbücher DE/EN, t(), Locale-Auswahl
src/30-csv.js        CSV-Parser, Zahl-/Datumserkennung, Spaltenzuordnung
src/40-analytics.js  Kennzahlen, Bestandslogik, Cashflow-Simulation
src/50-charts.js     SVG-Diagramme, Tooltips, Tabellen-Zwillinge
src/60-app.js        State, Persistenz, Rendering, Ereignisse
src/99-foot.html     Abschluss

build.sh             → index.html   (und mit --zip das Etsy-Paket)
samples/             Beispiel-CSVs, DE und EN
etsy/                Listing-Texte, Lizenz, Käuferanleitungen
```

## Bauen

```bash
./build.sh          # erzeugt index.html
./build.sh --zip    # zusätzlich dist/FlowStock-<version>.zip für Etsy
```

Es gibt bewusst keinen Bundler und keine `node_modules`. `build.sh` braucht nur
`bash`, `cat` und für `--zip` noch `zip`.

Version pflegen: `APP_VERSION` in `src/20-i18n.js`.

## Rechenwege

| Größe | Formel |
|---|---|
| Rohertrag | Umsatz − Gebühren − Versandkosten − Wareneinsatz |
| Verkaufstempo | verkaufte Stück im Zeitfenster ÷ Tage im Fenster |
| Reichweite | Bestand ÷ Verkaufstempo |
| Bestellpunkt | Verkaufstempo × (Lieferzeit + Sicherheitsbestand) |
| Bestellmenge | Verkaufstempo × (Lieferzeit + Zielreichweite + Sicherheit) − Bestand, aufgerundet auf die Mindestbestellmenge |
| Kontostand-Prognose | Startsaldo + Auszahlungen − Nachbestellungen − anteilige Fixkosten |

Die Prognose simuliert jeden Tag einzeln: Artikel verkaufen sich mit ihrem Tempo,
laufen leer und tragen dann nichts mehr bei; erreicht die Bestandsposition den
Bestellpunkt, wird nachbestellt (rollierend, also mehrfach über einen langen
Horizont), das Geld fließt am Bestelltag ab, die Ware trifft nach der Lieferzeit ein.

Fehlt der Einkaufspreis, wird mit einer einstellbaren Wareneinsatzquote gerechnet und
die betroffene Zahl mit `~` markiert. Fehlt die Gebührenspalte, greift analog eine
Gebührenannahme. Beides wird im Dashboard offen ausgewiesen.

## Datenschutz

Es gibt keinen Netzwerkaufruf: keine Schriftart, kein Skript, kein Bild, kein
Tracker von außen. Das Icon ist ein Data-URI, die Diagramme sind handgeschriebenes
SVG. Optional legt die App den Datensatz im `localStorage` ab — das ist der einzige
Ort, an dem etwas gespeichert wird, und der Löschknopf sitzt in den Einstellungen.

## Erkannte CSV-Spalten

Zugeordnet wird automatisch, korrigierbar per Dialog. Erkannt werden unter anderem
deutsche und englische Schreibweisen von Datum, SKU, Artikel, Menge, Umsatz,
Stückpreis, Einkaufspreis, Gebühren, Versand, Rabatt, Kanal und Bestellnummer;
für die Bestandsliste zusätzlich Bestand, Lieferzeit, Mindestbestellmenge und
Lieferant. Trennzeichen (`,` `;` Tab `|`), Zahlenformat (`1.234,56` / `1,234.56`)
und Datumsformat werden aus den Daten selbst erschlossen — bei mehrdeutigen
Datumsangaben entscheidet eine Abstimmung über die ganze Spalte, nicht über die
einzelne Zeile.

## Monetarisierung über Etsy

`etsy/` enthält alles, was für den Verkauf als digitaler Sofort-Download nötig ist:

- `listing-de.md` / `listing-en.md` — Titel, Tags, Kategorie, Preisempfehlung,
  vollständiger Beschreibungstext, Shot-Liste für die Produktbilder, Shop-FAQ
- `license.md` — Einzelplatz-/Unternehmenslizenz, zweisprachig
- `quickstart-de.md` / `quickstart-en.md` — die Anleitung, die dem Käufer beiliegt

`./build.sh --zip` packt daraus die Lieferdatei:

```
FlowStock-1.0.0.zip
├── FlowStock.html
├── ANLEITUNG-Deutsch.md
├── README-English.md
├── LICENSE.md
└── samples/*.csv
```

Etsy erlaubt bis zu fünf Dateien à 20 MB pro Listing; das Paket liegt weit darunter.
Für den Verkauf empfiehlt sich, die beiden Anleitungen vor dem Hochladen zusätzlich
als PDF zu exportieren — Käufer öffnen PDF lieber als Markdown.

## Browser

Chrome, Edge, Firefox und Safari in aktueller Version, Desktop wie Tablet.
Benötigt werden `<dialog>`, `Intl.NumberFormat`, `FileReader` und CSS
`color-mix()` — alles seit 2023 flächendeckend verfügbar.

## Grenzen

Die Prognose schreibt die Vergangenheit fort. Saisonalität, Werbeaktionen,
Auszahlungsfristen der Marktplätze, Retouren und Steuern sind nicht abgebildet.
FlowStock ersetzt keine Buchhaltung.
