# Logistik-Netzwerkplanung – Simulations- und Entscheidungshilfe

Excel-Arbeitsmappe (`.xlsm`) für die Frage: **In welchem Distributionszentrum (DC)
sollte welche Produktkategorie gelagert werden?**

Einzelplatz-Werkzeug, rein lokal, kein Server, keine zusätzlich zu
installierenden Add-ins. Benötigt Excel 2016 oder neuer mit aktivierten Makros
und Power Query (Abrufen und Transformieren).

Fertige Datei: **`Logistik_Netzwerkplanung.xlsm`** (im Repository enthalten,
mit Beispieldaten sofort testbar).

---

## 1. Erste Schritte

1. Datei herunterladen und **entsperren**: Rechtsklick → *Eigenschaften* →
   unten *Zulassen* bzw. *Entsperren* anhaken. Ohne diesen Schritt blockiert
   Windows Makros in Dateien aus dem Internet, und die Schaltflächen fehlen.
2. Datei öffnen und **Makros aktivieren**.
3. Beim Öffnen läuft `Auto_Open` → `Setup_Arbeitsmappe`. Das Makro legt an:
   * die Navigations- und Aktions-Schaltflächen (Formular-Steuerelemente),
   * die Sparklines der KPI-Kacheln,
   * ausgeblendete Gitternetzlinien auf allen Blättern.
   Das Makro kann jederzeit erneut ausgeführt werden (Alt+F8 →
   `Setup_Arbeitsmappe`), etwa nachdem Blätter umgestaltet wurden.
4. Die Mappe rechnet sofort mit den mitgelieferten Beispieldaten. Reihenfolge
   für eigene Daten: **Import → Zielreichweite → Simulation**.

---

## 2. Aufbau der Arbeitsmappe

| Blatt | Zweck |
|---|---|
| **Dashboard** | Startseite: KPI-Kacheln mit Sparklines, Ergebnisband, vier Diagramme, Navigations-Schaltflächen |
| **DC_Stammdaten** | Distributionszentren (Tabelle `tblDC`) und Absatzregionen (`tblRegionen`); Schaltflächen *DC hinzufügen* / *DC entfernen* |
| **Import_Historie** | Zielstruktur des Power-Query-Imports historischer Bewegungsdaten (`tblHistorie`) |
| **Import_Forecast** | Gleicher Aufbau für extern erstellte Forecast-Daten (`tblForecast`), eigene Quelldatei und eigener Import-Button |
| **Import_Mapping** | Import-Parameter (Pfade, Trennzeichen, m³ pro Palette) und Spalten-Mapping (`tblMapping`) |
| **Zielreichweite** | Ziel-Reichweite je Produktkategorie, Ø Bedarf/Tag, Ziel-Bestand; umschaltbare Bedarfsbasis |
| **Simulation** | Kernblatt: Gewichtungen, Zuordnungsmodus, Scoring je DC, Ergebniszeile |
| **Szenarien** | Werte-Snapshots der Simulation, tabellarisch und als gruppiertes Balkendiagramm |
| **Karte** | Blasendiagramm (Longitude/Latitude) als Karten-Näherung, plus Hinweise auf Kartendiagramm und 3D-Karte |
| **Beispieldaten** | Rohdaten im Fremdformat; Schaltflächen erzeugen daraus echte CSV-Quelldateien |

Das Blatt heißt `Dashboard` statt „Start/Dashboard“, weil Excel Schrägstriche in
Blattnamen nicht zulässt.

### Farbkonvention

* **Blaue Schrift auf hellgelbem Grund** – manuelle Eingabe
* **Grüne Schrift** – Verweis auf ein anderes Blatt
* **Schwarze Schrift** – berechnet
* Alle Formate stammen aus benannten Zellstilen (`LNP_*`, definiert in
  `tools/design.py`); es gibt keine Ad-hoc-Formatierung.

---

## 3. Berechnungslogik

Alle Teilschritte stehen in **eigenen Hilfsspalten** – bewusst keine
verschachtelten Monsterformeln. Verwendet werden ausschließlich Funktionen ab
Excel 2007 (`SUMMEWENNS`, `INDEX`/`VERGLEICH`, `SUMMENPRODUKT`, `WENNFEHLER`),
damit die Mappe ohne Power Pivot und ohne dynamische Arrays auskommt.

### 3.1 Zielreichweite (Blatt `Zielreichweite`)

```
Tage im Zeitraum   = MAX(Datum) − MIN(Datum) + 1
Ø Bedarf/Tag       = SUMMEWENNS(Paletten-Äquivalent; Kategorie) / Tage im Zeitraum
Ø Bedarf/Tag Basis = Historie | Forecast | Gewicht × Historie + (1−Gewicht) × Forecast
Ziel-Bestand       = RUNDEN(Ø Bedarf/Tag Basis × Ziel-Reichweite; 0)
```

Die Bedarfsbasis wird in `B5` umgeschaltet (*Historie / Forecast / Mix*), das
Mischungsgewicht in `B6` (0–100 %, per Datenprüfung begrenzt).

### 3.2 Bedarfsschwerpunkt (Blatt `Simulation`, Spalten F–K)

Je Absatzregion wird der Tagesbedarf der gewählten Kategorie aggregiert; daraus
entsteht der mengengewichtete Schwerpunkt:

```
Schwerpunkt-Lat = SUMMENPRODUKT(Bedarf/Tag; Latitude)  / Summe Bedarf/Tag
Schwerpunkt-Lon = SUMMENPRODUKT(Bedarf/Tag; Longitude) / Summe Bedarf/Tag
```

Dieses Raster aggregiert unabhängig vom Blatt `Zielreichweite`; die Summe muss
mit dem dortigen Ø Bedarf/Tag übereinstimmen – das prüft der Testlauf.

### 3.3 Scoring je DC (Blatt `Simulation`, Spalten A–U)

| Schritt | Formel |
|---|---|
| Auslastung nach Zuordnung | `(Vorbelegung + Ziel-Bestand) / Kapazität` |
| Kapazitäts-Score (roh) | `1 − Auslastung` |
| Distanz (km) | Orthodrome über `ACOS`/`RADIANT` zwischen DC und Bedarfsschwerpunkt (Erdradius 6371 km) |
| Transportkosten (€/Pal.) | `Transportkosten-Basis + €/km-Satz × Distanz` |
| Transport-Score (roh) | `−Transportkosten` (inverse Kosten) |
| erreichbarer Bestand | `MIN(Ziel-Bestand; MAX(0; Kapazität − Vorbelegung))` |
| Reichweiten-Score (roh) | `1 − ABS(Ziel-Bestand − erreichbarer Bestand) / Ziel-Bestand` |
| Teil-Scores (0–1) | Min-Max-Normierung der Rohwerte über alle aktiven DCs |
| **Gesamt-Score** | `Gewicht₁ × Kapazität + Gewicht₂ × Transport + Gewicht₃ × Reichweite` |
| Rang | `SUMMENPRODUKT((Sortierschlüssel > eigener)×1) + 1` |
| Anteil | Alleinzuordnung: 100 % für Rang 1 · Splitting: Score-Anteil der besten *n* DCs |

Inaktive DCs (`aktiv = Nein`) und leere Zeilen bleiben leer und gehen nicht in
die Normierung ein. Der Sortierschlüssel enthält einen winzigen zeilenabhängigen
Abzug, damit bei Score-Gleichstand eine eindeutige Rangfolge entsteht.

Die Ergebniszeile (verbunden, grün hervorgehoben) zeigt je nach Modus
„Empfehlung: DC X (Gesamt-Score Y)“ oder die prozentuale Aufteilung.

---

## 4. Power-Query-Import

Die Abfragen werden vom Makro zur Laufzeit über `ThisWorkbook.Queries.Add`
angelegt (Excel 2016+). Der M-Code steht in `vba/modImport.bas` und ist
vollständig parametrisiert – er liest über `Excel.CurrentWorkbook()`:

* `Pfad_Historie` / `Pfad_Forecast` – Quelldatei
* `Param_Trennzeichen` – CSV-Trennzeichen
* `Param_M3_pro_Palette` – Umrechnung Volumen → Paletten-Äquivalent
* `Param_Quelltabelle` – Blatt/Tabelle in einer Excel-Quelldatei (optional)
* `tblMapping` – Spalten-Mapping

**Abweichende Spaltennamen in der Quelle erfordern daher nur eine Änderung in
der Mapping-Tabelle, nicht in der Abfrage.** Die Abfrage benennt gemappte
Spalten um, ergänzt fehlende Zielfelder als `null`, typisiert, verwirft Zeilen
ohne Datum und berechnet das Paletten-Äquivalent:

```
Paletten-Äquivalent = Paletten,           wenn > 0
                    = Transportvolumen / m³ pro Palette,  sonst
```

Ablauf: *Datei importieren* öffnet den Dateidialog, schreibt den Pfad ins Blatt
`Import_Mapping`, legt die Abfrage an und lädt sie in die Zieltabelle.
*Nur aktualisieren* wiederholt den Lauf mit dem hinterlegten Pfad.

Zum Ausprobieren ohne Fremddatei: auf `Beispieldaten` die Schaltfläche
*Beispiel-CSV Historie* bzw. *Forecast* – sie schreibt eine CSV neben die
Arbeitsmappe und trägt den Pfad ein.

---

## 5. Szenarien und Export

*Szenario speichern* (auf `Simulation` und `Szenarien`) fragt einen Namen ab und
schreibt **Werte, keine Formeln** in die nächste freie Zeile: Zeitstempel,
Kategorie, Bedarfsbasis, alle drei Gewichtungen, Modus, Ziel-Reichweite,
Ø Bedarf/Tag, Ziel-Bestand, Empfehlung, bester Score sowie Gesamt-Score und
Anteil je DC. Die Spaltenköpfe werden mit den aktuellen DC-Namen beschriftet,
die Datenquelle des Balkendiagramms wächst automatisch mit.

*Export Simulation* / *Export Vergleich* schreiben das jeweilige Blatt über den
Speichern-Dialog als `.xlsx` oder `.csv` – als reine Werte, ohne Formeln,
Verbindungen und ohne VBA.

---

## 6. Annahmen und bekannte Grenzen

Diese Punkte sind bewusste Festlegungen, keine Fehler:

1. **Formel-Fenster:** Die Auswertungen lesen die Zeilen 5–5004 der
   Import-Blätter (bis zu 5000 Datenzeilen). Größere Quellen erfordern ein
   Erweitern der Bereiche.
2. **Ø Bedarf/Tag** verteilt die Menge gleichmäßig über den gesamten Zeitraum
   (`MAX(Datum) − MIN(Datum) + 1`), nicht über Kalender- oder Arbeitstage.
3. **Vorbelegung (Paletten)** ist eine zusätzliche Eingabespalte in
   `DC_Stammdaten`. Ohne bestehende Belegung wäre der Kapazitäts-Score für alle
   DCs identisch und damit wirkungslos.
4. **Transportkosten** werden als `Basis + €/km × Distanz` modelliert – die
   Aufgabenstellung ließ „€/Palette oder €/km“ offen, beide Spalten sind
   vorhanden.
5. **Distanzen** sind Luftlinien zum mengengewichteten Bedarfsschwerpunkt, keine
   Straßenkilometer und keine Tourenplanung.
6. **Reichweiten-Score:** Reicht die freie Kapazität aller DCs für den
   Ziel-Bestand, ist dieses Kriterium bei allen DCs 1 und differenziert nicht –
   dann entscheiden Kapazität und Transport. Im Beispiel ist `DC Frankfurt`
   deshalb absichtlich nahezu voll.
7. **DC hinzufügen** fügt die neue Zeile *vor* der letzten Tabellenzeile ein.
   Nur so erweitert Excel Bereichsbezüge wie `$Q$20:$Q$25` selbsttätig; die
   letzte Zeile lässt sich daher nicht löschen (stattdessen `aktiv = Nein`).
   Simulation und Karte werden synchron mitgeführt.
8. **Regions- und Kategorienamen** müssen zwischen Importdaten, `tblRegionen`
   und `tblZielreichweite` exakt übereinstimmen; sonst bleiben Aggregate 0.
9. **CSV-Kodierung:** Der Import liest CSV als Windows-1252. Für UTF-8-Quellen
   im M-Code `Encoding=1252` auf `65001` ändern.
10. **Szenariospalten** hängen an der DC-Anzahl. Ändert sich die DC-Liste,
    beziehen sich älter gespeicherte Zeilen auf eine andere Zusammensetzung –
    das Makro weist darauf hin.
11. **Karte:** Excel bietet kein frei belegbares interaktives Kartenobjekt. Das
    Blasendiagramm ist die Näherung; Kartendiagramm und 3D-Karte sind als
    Zusatzoption dokumentiert (`Karte_Hinweis_Kartendiagramm`), aber nicht
    automatisiert, damit die Mappe offline und ohne Zusatzkomponenten läuft.
12. Alle Beispieldaten sind **frei erfunden** und dienen nur dem Test.

---

## 7. Repository und Neubau

```
build_workbook.py        Baut die Arbeitsmappe (Blätter, Formeln, Tabellen,
                         Diagramme, bedingte Formatierung, Datenprüfung)
validate_workbook.py     Prüft die gebaute Datei (siehe unten)
tools/design.py          Farbschema und benannte Zellstile
tools/beispieldaten.py   Reproduzierbare Beispieldaten (fester Zufalls-Startwert)
tools/ovba.py            Erzeugt vbaProject.bin: CFB-Container, MS-OVBA-
                         Komprimierung, Verschlüsselung der PROJECT-Felder
tools/xlsm.py            Verpackt die .xlsx als makrofähige .xlsm
vba/*.bas                VBA-Quelltext (8 Module, auch einzeln importierbar)
```

Neubau:

```bash
pip install openpyxl
python3 build_workbook.py            # -> Logistik_Netzwerkplanung.xlsm

pip install formulas oletools        # nur für den Testlauf
python3 validate_workbook.py
```

### Warum ein eigener VBA-Projekt-Writer?

openpyxl kann kein VBA-Projekt schreiben. `tools/ovba.py` erzeugt die
`vbaProject.bin` daher selbst: OLE-Container nach [MS-CFB] mit FAT, MiniFAT und
Directory-Baum, RLE-Komprimierung der Streams nach [MS-OVBA] sowie die
verschlüsselten Felder `CMG`/`DPB`/`GC` (kein Projektschutz, kein Passwort,
Projekt sichtbar). Der VBA-Quelltext liegt zusätzlich unverändert in `vba/` –
er lässt sich in der VBA-Entwicklungsumgebung lesen, ändern und neu importieren.

### Testabdeckung

`validate_workbook.py` führt 158 Prüfungen aus:

* **Paket:** Content-Types, Beziehung und Inhalt von `xl/vbaProject.bin`,
  `fullCalcOnLoad`; alle acht Module werden mit `oletools` als unabhängiger
  Implementierung gegengelesen, die PROJECT-Felder werden entschlüsselt.
* **Struktur:** Blattreihenfolge, ausgeblendete Gitternetzlinien, sechs
  Tabellenobjekte, Datenprüfungen, bedingte Formatierung, sechs Diagramme,
  benannte Bereiche, Zellstile.
* **Formeln:** Alle 12 985 Zellen werden mit der Bibliothek `formulas`
  nachgerechnet und auf Excel-Fehlerwerte geprüft.
* **Fachlogik:** Ø Bedarf/Tag, Ziel-Bestände, Bedarfsschwerpunkt, Distanzen,
  Auslastungen, Transportkosten, Teil- und Gesamt-Scores, Rangfolge und
  Anteilsverteilung werden gegen unabhängig in Python berechnete Sollwerte
  verglichen.

Hinweis: Die Datei wurde nicht durch LibreOffice geschrieben – im Build-Container
kann LibreOffice keine Dokumente laden, weshalb `recalc.py` nicht einsetzbar war.
Stattdessen prüft `formulas` die Formeln, und die Mappe erhält
`fullCalcOnLoad="1"`, sodass Excel beim Öffnen alle Werte selbst berechnet.
