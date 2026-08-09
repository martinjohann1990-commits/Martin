# NetPlan – Logistik-Netzwerkplanung

Browserbasiertes Simulations- und Entscheidungswerkzeug für die Frage:
**Welche Produktkategorie sollte in welchem Distributionszentrum (DC) gelagert werden?**

Die Anwendung läuft vollständig clientseitig. Es gibt keinen Server, keine
Installation und keine Adminrechte-Anforderung – `index.html` wird direkt im
Browser geöffnet. Alle Daten bleiben im Arbeitsspeicher des Browsers bzw.
optional im `localStorage`; es werden keinerlei Daten nach außen gesendet.

## Starten

1. Ordner vollständig auf den Rechner kopieren (z.B. Netzlaufwerk oder USB).
2. `index.html` per Doppelklick öffnen (Chrome, Edge oder Firefox).
3. Optional: Über **Demodaten laden** einen vollständigen Beispielstand
   erzeugen (5 DCs, 5 Kategorien, 36 Monate Historie und Forecast).

Es ist kein Webserver nötig. Alle Bibliotheken liegen lokal unter `vendor/`,
sodass die Anwendung auch in abgeschotteten Unternehmensnetzen ohne
Internetzugang vollständig funktioniert.

## Aufbau

```
index.html          Einstiegspunkt, gesamte Oberfläche
css/app.css         Designsystem (helles und dunkles Farbschema)
js/util.js          Formatierung, Zahlen-/Datumsparsing, Geo-Hilfsfunktionen
js/state.js         Datenmodell und Persistenz (localStorage)
js/geo.js           Koordinaten-Nachschlagetabelle für Länder und Regionen
js/dcs.js           DC-Verwaltung (Anlegen, Bearbeiten, Löschen, Import)
js/data.js          Datei-Import mit Spalten-Mapping, Regionen, Zielreichweiten
js/sim.js           Simulations- und Bewertungslogik
js/simui.js         Oberfläche der Simulation
js/charts.js        Diagrammkonfiguration und Farbpalette
js/dashboard.js     KPI-Kacheln, Diagramme, Detailtabelle
js/mapview.js       Netzwerkkarte (Kacheln, Offline-Schema, SVG-Notfallmodus)
js/scenarios.js     Szenarien anlegen und vergleichen
js/exporter.js      Excel-/CSV-Export, Projektdatei
js/demo.js          Beispieldatensatz
js/app.js           Navigation und Initialisierung
vendor/             PapaParse, SheetJS, Chart.js, Leaflet (lokal eingebunden)
```

## Arbeitsablauf

### 1. DCs anlegen (`DC-Verwaltung`)

Distributionszentren werden vollständig dynamisch gepflegt – nichts ist fest
verdrahtet. Je DC: Name, Region/Land, Koordinaten, Kapazität in Stellplätzen,
Grundbelegung, Lagerkosten je Stellplatz und Monat, Handlingkosten,
Transportkosten (Grundbetrag plus Satz je Palettenkilometer), Fixkosten sowie
optionale **regionsspezifische Transportpauschalen**, die die distanzbasierte
Rechnung für einzelne Zielregionen überschreiben.

Fehlen Koordinaten, werden sie aus Region bzw. Land automatisch ergänzt.
DCs lassen sich auch aus einer CSV-/Excel-Datei importieren.

### 2. Daten importieren (`Daten & Import`)

Unterstützt werden CSV (Trennzeichen wird erkannt) sowie XLSX/XLS inklusive
Blattauswahl. Der Import arbeitet mit **freiem Spalten-Mapping**: die Spalten
der Datei werden den Feldern des Datenmodells zugeordnet, gängige deutsche und
englische Bezeichnungen werden automatisch erkannt.

* **Dimensionen:** Kunde, Land, Region, Produktkategorie, Periode
* **Kennzahlen:** Menge, Umsatz (EUR), Transportvolumen (m³), Paletten,
  Paletten-Äquivalent
* **Datensatz-Typ:** Historie oder Forecast (gleiches Schema; der Forecast wird
  extern erstellt und hier nur eingelesen)
* **Datenebene:** Einzeltransaktionen und bereits aggregierte Zeilen werden
  beide unterstützt; große Transaktionsdateien werden beim Import auf die
  Dimensionskombination verdichtet.

Periodenangaben werden in vielen Schreibweisen erkannt (`2026-03`, `15.03.2026`,
`03/2026`, `Mär 26`, `2026-Q2`, `2026-KW12`, Excel-Datumswerte). Zahlen werden
sowohl im deutschen (`1.234,56`) als auch im englischen Format (`1,234.56`)
gelesen.

Die Palettenmenge wird in dieser Reihenfolge ermittelt:
**Paletten-Äquivalent → Paletten → Volumen ÷ Volumen je Palette →
Menge ÷ Stück je Palette.**

### 3. Zielreichweite festlegen

Je Kategorie (oder global für alle) wird eine Zielreichweite in Tagen
hinterlegt. Daraus ergibt sich der kapazitätswirksame Ziel-Bestand:

```
Bedarf je Tag = Paletten im Zeitraum ÷ Zeitraum in Tagen
Ziel-Bestand  = Bedarf je Tag × Zielreichweite × Sicherheitsaufschlag
```

### 4. Simulieren (`Simulation`)

Für die gewählte Kategorie, Datenbasis und Periodenspanne bewertet das Tool
jeden aktiven Standort mit drei Teil-Scores (je 0–100), die frei gewichtet
werden können:

| Kriterium | Berechnung |
|---|---|
| **Kapazität & Balance** | 100 bei leerem Lager, 50 an der Ziel-Auslastungsgrenze, 0 ab Vollauslastung |
| **Transport / Distanz** | `100 × günstigste €/Palette ÷ eigene €/Palette` |
| **Zielreichweite** | `100 × (0,7 × Bestandsfähigkeit + 0,3 × Reaktionsfähigkeit)` |

Bestandsfähigkeit = freie Stellplätze ÷ Ziel-Bestand (max. 1);
Reaktionsfähigkeit = 1 − Transitzeit ÷ Zielreichweite.
Der Gesamt-Score ist die gewichtete Summe; die Einzelbeiträge sind im Diagramm
„Score-Zusammensetzung“ und in der Rangliste offen ausgewiesen.

Zwei Modi:

* **Alleinzuordnung** – eine Kategorie vollständig in ein DC.
* **Splitting** – die Kategorie wird auf bis zu *n* Standorte verteilt. Die
  Regionen werden dabei absteigend nach Volumen dem jeweils bestbewerteten DC
  mit freier Kapazität zugewiesen; reicht die Kapazität nicht, wird die Region
  anteilig auf das nächstbeste DC verteilt. Die entstandenen Anteile lassen sich
  manuell überschreiben und neu durchrechnen.

Mit **Zuordnung übernehmen** wird das Ergebnis verbindlich; der Ziel-Bestand
belegt dann Kapazität und wirkt sich auf die Bewertung der folgenden Kategorien
aus. **Alle Kategorien simulieren** arbeitet alle Kategorien nacheinander ab,
beginnend mit der volumenstärksten.

### 5. Ergebnisse ansehen (`Dashboard`)

KPI-Kacheln (Kapazität, Auslastung, Ziel-Bestand, Transport-, Lager- und
Gesamtkosten, Ø Bewertung), Diagramme zu Kapazitäts-, Kosten- und
Volumenverteilung, die Netzwerkkarte sowie eine Detailtabelle je Kategorie
und DC.

**Karte:** Standardmäßig werden OpenStreetMap-Kacheln geladen. Sind diese im
Unternehmensnetz gesperrt, schaltet die Karte automatisch auf eine
**Offline-Schema-Ansicht** um (Koordinatenraster mit maßstäblich platzierten
Standorten, Regionen und Zuordnungslinien). Beide Modi lassen sich auch manuell
wählen. Fehlt Leaflet vollständig, greift eine reine SVG-Streudarstellung.

### 6. Szenarien vergleichen (`Szenarien`)

Ein Szenario friert DC-Konfiguration, Gewichtungen, Zielreichweiten, Kostensätze
und Zuordnungen ein. Beliebig viele Szenarien werden neben dem aktuellen Stand
in einer Kennzahlentabelle, zwei Diagrammen und einer Zuordnungsmatrix
gegenübergestellt. Szenarien lassen sich wieder laden, umbenennen und löschen.

### 7. Exportieren (`Export & Projekt`)

* **Excel-Arbeitsmappe** mit den Blättern KPI, DCs, Zuordnungen,
  Detailergebnisse, Regionszuordnung, Zielreichweiten, Regionen, Szenarien und
  Rohdaten
* **CSV-Exporte** für Ergebnisse, Zuordnungen und Szenario-Vergleich
* **Projektdatei (JSON)** zum Sichern und Weitergeben des kompletten
  Arbeitsstandes

Alle Dateien werden im Browser erzeugt und direkt heruntergeladen.

## Datenschutz und Speicherung

Die Anwendung sendet keine Daten an einen Server. Der Arbeitsstand wird –
sofern aktiviert – im `localStorage` des Browsers zwischengespeichert und beim
nächsten Öffnen wiederhergestellt. Übersteigt der Datenbestand das
Speicherlimit des Browsers, werden nur Konfiguration und Ergebnisse gesichert;
für den vollständigen Stand ist die Projektdatei vorgesehen. Die
Zwischenspeicherung lässt sich abschalten.

## Annahmen und Grenzen

* Entfernungen werden als Luftlinie mit einem Umwegfaktor von 1,28 gerechnet –
  keine Routenplanung. Für exakte Frachtkosten stehen regionsspezifische
  Pauschalen je DC zur Verfügung.
* Kosten beziehen sich auf den ausgewerteten Zeitraum; Lagerkosten werden über
  die enthaltenen Monate hochgerechnet.
* Fixkosten je DC fließen in die Netzwerk-KPIs ein, nicht in den Standort-Score
  einer einzelnen Kategorie.
* Das Tool erstellt selbst keinen Forecast; Prognosen werden extern erzeugt und
  importiert.

## Bibliotheken

PapaParse 5.4.1 · SheetJS (xlsx) 0.18.5 · Chart.js 4.4.4 · Leaflet 1.9.4 –
jeweils lokal unter `vendor/` eingebunden.
