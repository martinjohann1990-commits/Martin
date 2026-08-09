# Berechnungslogik von NetPlan

Diese Beschreibung dokumentiert vollständig, wie das Tool von den importierten
Daten zur Empfehlung kommt. Alle Formeln entsprechen dem Code in `js/sim.js`
(Rechenkern) und `js/dashboard.js` (Aggregation über das Netzwerk).

**Inhalt**

1. [Der Rechenweg im Überblick](#1-der-rechenweg-im-überblick)
2. [Schritt 1: Von der Datenzeile zur Palette](#2-schritt-1-von-der-datenzeile-zur-palette)
3. [Schritt 2: Zeitraum und Bedarf pro Tag](#3-schritt-2-zeitraum-und-bedarf-pro-tag)
4. [Schritt 3: Ziel-Bestand](#4-schritt-3-ziel-bestand)
5. [Schritt 4: Distanz, Transitzeit, Kosten](#5-schritt-4-distanz-transitzeit-kosten)
6. [Schritt 5: Die drei Teil-Scores](#6-schritt-5-die-drei-teil-scores)
7. [Schritt 6: Gewichtung und Gesamt-Score](#7-schritt-6-gewichtung-und-gesamt-score)
8. [Wirkung der Gewichtung – gemessen](#8-wirkung-der-gewichtung--gemessen)
9. [Alleinzuordnung und Splitting](#9-alleinzuordnung-und-splitting)
10. [Historie, Forecast und beides zusammen](#10-historie-forecast-und-beides-zusammen)
11. [Grenzen: Zeithorizont und Datenmenge](#11-grenzen-zeithorizont-und-datenmenge)
12. [Was das Modell nicht leistet](#12-was-das-modell-nicht-leistet)

---

## 1. Der Rechenweg im Überblick

```
Importierte Zeilen
   │  Mengenlogik (Paletten je Zeile)
   ▼
Bedarf je Kategorie und Kundenregion  ──►  Bedarf pro Tag  ──►  Ziel-Bestand
   │                                                                │
   │  je Kombination aus DC und Region:                             │ belegt Stellplätze
   │  Distanz → Transportkosten, Transitzeit                        │
   ▼                                                                ▼
Teil-Score Transport        Teil-Score Zielreichweite       Teil-Score Kapazität
   └──────────────────────────────┬─────────────────────────────────┘
                    gewichtete Summe → Gesamt-Score je DC
                                  │
                    Rangfolge → Empfehlung (allein oder aufgeteilt)
```

Die Berechnung läuft immer für **eine Produktkategorie** und die in der
Simulation gewählte **Datenbasis** und **Periodenspanne**. Bereits übernommene
Zuordnungen anderer Kategorien belegen dabei Kapazität und beeinflussen so das
Ergebnis der nächsten Kategorie.

---

## 2. Schritt 1: Von der Datenzeile zur Palette

Kapazität wird in Stellplätzen gemessen, deshalb rechnet das Tool jede
Datenzeile in Paletten um. Es gilt die **erste verfügbare** Angabe:

```
Paletten = Paletten-Äquivalent                     falls > 0
         → sonst Paletten                          falls > 0
         → sonst Volumen ÷ Volumen je Palette      falls > 0
         → sonst Menge ÷ Stück je Palette
```

*Warum diese Reihenfolge:* Das Paletten-Äquivalent ist die fachlich genaueste
Größe, weil es Packdichte und Stapelbarkeit bereits enthält. Die Umrechnung aus
Menge ist die gröbste, weil sie eine einheitliche Stückgröße über die ganze
Kategorie unterstellt.

Beide Umrechnungsfaktoren stehen unter *Daten & Import → Mengenlogik* und gelten
global. Wenn Kategorien sehr unterschiedliche Packdichten haben, sollten die
Paletten in den Daten mitgeliefert werden statt über die Menge gerechnet zu
werden.

---

## 3. Schritt 2: Zeitraum und Bedarf pro Tag

Der Betrachtungszeitraum ergibt sich aus den **tatsächlich enthaltenen
Perioden**, nicht aus der Anzahl der Zeilen:

```
Zeitraum in Tagen = Summe der Tage aller verschiedenen Perioden im Filter
```

Dabei zählt jede Periode mit ihrer echten Länge: ein Monat mit 28 bis 31 Tagen,
ein Quartal mit 91,3, eine Kalenderwoche mit 7, ein Jahr mit 365. Fehlt bei
einer Periode die Zuordnung, werden 30,44 Tage angesetzt (ein Durchschnittsmonat).

```
Bedarf pro Tag = Paletten im Zeitraum ÷ Zeitraum in Tagen
```

*Wichtig:* Der Bedarf pro Tag ist ein **Mittelwert über den gewählten Zeitraum**.
Saisonspitzen werden dadurch geglättet. Wer für die Spitze auslegen möchte,
schränkt die Periodenspanne auf die Spitzenmonate ein — dann steigt der Bedarf
pro Tag und damit der Ziel-Bestand.

Der Wert lässt sich unter *Betrachtungszeitraum (Tage)* auch fest vorgeben, etwa
wenn die Daten Lücken enthalten.

---

## 4. Schritt 3: Ziel-Bestand

Der Ziel-Bestand ist die **kapazitätswirksame Größe** — er belegt Stellplätze:

```
Ziel-Bestand = Bedarf pro Tag × Zielreichweite × Umschlagfaktor
```

* **Zielreichweite** in Tagen, je Kategorie oder global gesetzt
* **Umschlagfaktor** als Sicherheitsaufschlag (1,0 = ohne, 1,1 = 10 % Puffer)

Die Zielreichweite wirkt **linear**: Verdoppelt man sie von 21 auf 42 Tage,
verdoppelt sich der Stellplatzbedarf. Sie ist damit der stärkste einzelne Hebel
im gesamten Modell — stärker als jede Gewichtung.

**Beispiel** (Demodaten, Kategorie Kühlgeräte, Forecast über 12 Monate):

| Größe | Wert |
|---|---|
| Paletten im Zeitraum | 140.016 |
| Zeitraum | 365 Tage |
| Bedarf pro Tag | 383,6 Paletten |
| Zielreichweite | 28 Tage |
| Ziel-Bestand | 10.741 Stellplätze |

---

## 5. Schritt 4: Distanz, Transitzeit, Kosten

### Distanz

```
Distanz = Luftlinie (Haversine) × 1,28
```

Der Faktor 1,28 ist ein pauschaler Umwegfaktor, der Straßenführung gegenüber der
Luftlinie annähert. Fehlen für eine Region Koordinaten, wird die **mittlere
bekannte Distanz im Netz** eingesetzt und die Zeile in der Oberfläche als
„geschätzt" markiert.

### Transportkosten

```
Kosten je Palette = Grundkosten + Kosten je km × Distanz
```

Eine im DC hinterlegte **regionsspezifische Pauschale überschreibt diese
Rechnung vollständig** für die betreffende Region. Das ist der empfohlene Weg,
wenn echte Frachtraten vorliegen: Die distanzbasierte Formel ist nur ein Ersatz,
solange keine Tarife hinterlegt sind.

```
Transportkosten gesamt = Σ (Paletten der Region × Kosten je Palette)
```

### Transitzeit

```
Transitzeit = fixe Handlingzeit + Distanz ÷ Transportleistung je Tag
```

Voreinstellung: 0,5 Tage Handling und 500 km/Tag.

### Lager-, Handling- und Fixkosten

```
Lagerkosten   = Ziel-Bestand × Kosten je Stellplatz und Monat × Monate im Zeitraum
Handlingkosten = Paletten im Zeitraum × Kosten je Palette
Fixkosten      = Fixkosten je Periode × Anzahl Perioden
```

Lagerkosten sind eine **Bestandsgröße** (sie hängen am Ziel-Bestand),
Handlingkosten eine **Durchsatzgröße** (sie hängen am Volumen). Deshalb wirkt
eine höhere Zielreichweite nur auf die Lagerkosten, nicht auf das Handling.

Fixkosten fließen in die Netzwerk-Kennzahlen des Dashboards ein, **nicht** in den
Standort-Score einer einzelnen Kategorie — sonst würde die erste zugeordnete
Kategorie die gesamten Fixkosten eines Standorts tragen.

---

## 6. Schritt 5: Die drei Teil-Scores

Jeder Teil-Score liegt zwischen 0 und 100. Alle drei sind in der Rangliste und
im Diagramm „Score-Zusammensetzung" einzeln ausgewiesen.

### 6.1 Kapazität und Balance

Maßgeblich ist die Auslastung **nach** der Zuordnung:

```
Auslastung danach = (bereits belegt + Ziel-Bestand) ÷ Kapazität
```

„Bereits belegt" umfasst die Grundbelegung des DCs plus alle bereits
übernommenen Zuordnungen anderer Kategorien.

```
Auslastung ≤ Grenze:      Score = 100 − 50 × (Auslastung ÷ Grenze)
Grenze < Auslastung ≤ 1:  Score = 50 × (1 − (Auslastung − Grenze) ÷ (1 − Grenze))
Auslastung > 1:           Score = 0
```

Mit der voreingestellten Grenze von 85 %:

| Auslastung danach | Score |
|---|---|
| 0 % (leer) | 100 |
| 42,5 % | 75 |
| 85 % (Grenze) | 50 |
| 92,5 % | 25 |
| 100 % | 0 |
| darüber | 0 |

Der Verlauf ist stetig und fällt monoton. Er belohnt **Reserve** und wirkt damit
ausgleichend: Volle Standorte werden unattraktiv, bevor sie überlaufen. Die
Auslastungsgrenze ist der Punkt, ab dem die Abwertung doppelt so schnell
erfolgt.

### 6.2 Transport und Distanz

```
Score = 100 × günstigste Kosten je Palette im Feld ÷ eigene Kosten je Palette
```

Eine **Verhältnisskala**: Der günstigste Standort erhält immer 100, doppelte
Kosten ergeben 50, dreifache Kosten 33. Das hat zwei Konsequenzen:

* Der Score ist **relativ zum Bewerberfeld**. Nimmt man ein sehr günstiges DC aus
  dem Netz, steigen die Scores aller übrigen.
* Er ist **skaleninvariant**: Verdoppelt man alle Kostensätze gleichmäßig, ändert
  sich an der Rangfolge nichts.

### 6.3 Zielreichweite und Bestand

```
Bestandsfähigkeit  = freie Stellplätze ÷ Ziel-Bestand   (gedeckelt bei 1)
Reaktionsfähigkeit = 1 − Transitzeit ÷ Zielreichweite   (auf 0 bis 1 begrenzt)

Score = 100 × (0,7 × Bestandsfähigkeit + 0,3 × Reaktionsfähigkeit)
```

Die Gewichtung 70/30 ist im Rechenkern festgelegt und nicht über die Oberfläche
verstellbar. Dahinter steht: Ob der Ziel-Bestand überhaupt ins Lager passt, ist
wichtiger als ein Tag mehr oder weniger Transitzeit.

Die Reaktionsfähigkeit setzt die Transitzeit ins Verhältnis zur Zielreichweite.
Bei 35 Tagen Reichweite fallen 2 Tage Transit kaum ins Gewicht (0,94), bei 5
Tagen Reichweite dagegen erheblich (0,60).

---

## 7. Schritt 6: Gewichtung und Gesamt-Score

Die drei Reglerwerte werden zunächst auf die Summe 1 normiert:

```
w_i = Regler_i ÷ (Regler_Kapazität + Regler_Transport + Regler_Reichweite)
```

Deshalb zählt nur das **Verhältnis** der Regler: 30/45/25 ergibt exakt dasselbe
wie 60/90/50. Stehen alle drei auf 0, rechnet das Tool mit je einem Drittel.

```
Gesamt-Score = w_Kapazität × Score_Kapazität
             + w_Transport × Score_Transport
             + w_Reichweite × Score_Reichweite
```

In der Rangliste steht je Standort der Gesamt-Score, im Balkendiagramm die drei
**Beiträge** (w_i × Score_i), die sich zum Gesamt-Score addieren. Damit ist
jederzeit ablesbar, welches Kriterium die Entscheidung getragen hat.

---

## 8. Wirkung der Gewichtung – gemessen

Die folgende Tabelle stammt aus einem Durchlauf über den mitgelieferten
Demodatensatz (Kategorie Kühlgeräte, Datenbasis Forecast, Alleinzuordnung, leeres
Netz). „Abstand" ist der Punktevorsprung des Ersten vor dem Zweiten.

| Gewichte (Kap./Transp./Reichw.) | Empfehlung | Score | Abstand | Ø Distanz |
|---|---|---|---|---|
| 100 / 0 / 0 | **DC Poznań** | 68,9 | 0,4 | 868 km |
| 0 / 100 / 0 | DC Duisburg | 100,0 | 13,5 | 628 km |
| 0 / 0 / 100 | DC Duisburg | 98,1 | 0,1 | 628 km |
| 30 / 45 / 25 (Standard) | DC Duisburg | 90,1 | 6,1 | 628 km |
| 60 / 20 / 20 | DC Duisburg | 80,7 | 2,5 | 628 km |
| 20 / 60 / 20 | DC Duisburg | 93,3 | 8,1 | 628 km |
| 20 / 20 / 60 | DC Duisburg | 92,6 | 2,9 | 628 km |
| 50 / 0 / 50 | DC Duisburg | 83,3 | 0,0 | 628 km |

Daraus lassen sich vier Muster ablesen, die allgemein gelten:

**Erstens: Die Gewichtung entscheidet seltener, als man erwartet.** In acht von
zehn geprüften Kombinationen gewinnt derselbe Standort. Bei einem
transportkostendominierten Netz — und das sind die meisten — schlägt die
Kundennähe die übrigen Kriterien fast immer durch. Ein Wechsel der Empfehlung
tritt erst bei 100 % Kapazitätsgewicht ein, und dann mit 0,4 Punkten Abstand,
also praktisch einem Gleichstand.

**Zweitens: Der Abstand ist aussagekräftiger als der Score.** Ein Ergebnis mit
8,1 Punkten Vorsprung ist robust; eines mit 0,0 bis 0,4 Punkten ist eine
Zufallsentscheidung, bei der andere Kriterien den Ausschlag geben sollten.
Prüfen Sie deshalb immer die Spalte hinter dem Ersten in der Rangliste.

**Drittens: Kapazitätsgewicht drückt das Niveau, nicht die Reihenfolge.** Weil
der Kapazitäts-Score bereits bei mäßiger Auslastung deutlich unter 100 liegt,
sinkt der Gesamt-Score, sobald man dieses Kriterium hochzieht (90,1 → 80,7 bei
60 % Gewicht). Das ist kein schlechteres Ergebnis, sondern eine andere Skala.

**Viertens: Der Reichweiten-Score trennt schwach, solange Kapazität reicht.**
Bei 0/0/100 liegen die ersten drei Standorte innerhalb von 0,1 Punkten, weil die
Bestandsfähigkeit bei allen 1,0 beträgt und nur die Transitzeit differenziert.
Dieses Kriterium entfaltet seine Wirkung erst, wenn Kapazität knapp wird — dann
sinkt die Bestandsfähigkeit unter 1 und der Score bricht schnell ein.

### Wann welche Gewichtung sinnvoll ist

| Situation | Empfohlener Schwerpunkt |
|---|---|
| Frachtkosten dominieren, Lager sind gut ausgelastet | Transport hoch (50–70 %) |
| Ein Standort läuft über, das Netz soll ausgeglichen werden | Kapazität hoch (50–70 %) |
| Kurze Lieferzeit zugesagt, Bestand ist knapp | Reichweite hoch (40–60 %) |
| Erste Orientierung ohne Vorfestlegung | Standard 30 / 45 / 25 |

Ein belastbares Vorgehen ist, dieselbe Konfiguration mit **zwei bis drei
Gewichtungen** zu rechnen und jede als Szenario zu speichern. Bleibt die
Zuordnung stabil, ist sie robust. Kippt sie, zeigt der Szenario-Vergleich, was
die Alternative kostet — und die Entscheidung wird bewusst getroffen statt vom
Regler bestimmt.

---

## 9. Alleinzuordnung und Splitting

### Alleinzuordnung

Jedes aktive DC wird mit dem **vollständigen** Bedarf der Kategorie bewertet.
Die Rangfolge ergibt sich aus dem Gesamt-Score; der Erste ist die Empfehlung.

### Splitting

Das Splitting arbeitet **regionsweise und greedy**:

1. Zunächst werden alle DCs wie bei der Alleinzuordnung bewertet. Die besten *n*
   bilden den Kandidatenpool (*n* = „Max. Anzahl DCs im Split").
2. Die Kundenregionen werden nach Volumen absteigend sortiert.
3. Für jede Region wird der Pool erneut bewertet — mit den **regionsspezifischen**
   Transportkosten und der jeweils noch **freien** Kapazität.
4. Die Region geht an das bestbewertete DC mit freier Kapazität. Reicht diese
   nicht für die ganze Region, wird der passende Teil zugeordnet und der Rest im
   nächsten Durchgang auf das nächstbeste DC verteilt.
5. Bleibt am Ende Menge übrig, weil im gesamten Pool keine Kapazität mehr frei
   ist, geht sie an das bestbewertete DC und wird als Überlauf ausgewiesen.

Das Verfahren ist **heuristisch, nicht optimal**. Es liefert nachvollziehbare,
geografisch sinnvolle Aufteilungen und respektiert Kapazitätsgrenzen, garantiert
aber kein Kostenminimum im Sinne einer mathematischen Optimierung. Für eine
bewusste Abweichung lassen sich die Anteile in der Tabelle überschreiben und neu
durchrechnen; dann bedient jedes DC den vorgegebenen Prozentsatz **jeder**
Region.

### Reihenfolge bei „Alle Kategorien simulieren"

Die Kategorien werden nach Volumen absteigend abgearbeitet. Die volumenstärkste
Kategorie wählt also zuerst und findet ein leeres Netz vor; spätere Kategorien
konkurrieren um die verbleibende Kapazität. Diese Reihenfolge ist bewusst
gewählt, weil eine Fehlplatzierung der größten Kategorie am teuersten wäre. Sie
bedeutet aber auch: **Das Ergebnis hängt von der Reihenfolge ab.** Wer die
Prioritäten anders setzen will, ordnet die Kategorien einzeln und in der
gewünschten Reihenfolge zu.

---

## 10. Historie, Forecast und beides zusammen

Beide Datenbestände nutzen dasselbe Schema und werden identisch verrechnet. Der
Unterschied liegt **allein darin, welche Perioden in den Bedarf pro Tag
eingehen**. Das Tool erstellt selbst keine Prognose und extrapoliert nicht.

Gemessen am Demodatensatz (Kategorie Kühlgeräte, Standardgewichtung):

| Datenbasis | Perioden | Zeitraum | Paletten | Bedarf/Tag | Ziel-Bestand | Empfehlung |
|---|---|---|---|---|---|---|
| Historie | 24 | 730 Tage | 276.190 | 378,3 | 10.594 | DC Duisburg |
| Forecast | 12 | 365 Tage | 140.016 | 383,6 | 10.741 | DC Duisburg |
| Historie + Forecast | 35 | 1.064 Tage | 416.205 | 391,2 | 10.953 | DC Duisburg |

### Was die Wahl bewirkt

**Nur Historie** bildet ab, was tatsächlich gelaufen ist: echte Kundenstruktur,
echte regionale Verteilung, echte Saison. Sie ist die belastbarste Grundlage für
die **regionale Zuordnung**, weil sie auf gemessenen Sendungen beruht. Ihr
Nachteil: Sie kennt weder Wachstum noch Sortimentsverschiebungen noch
Kundenzugänge oder -abgänge. Wer ein Netz für die kommenden Jahre auslegt, legt
mit reiner Historie tendenziell zu klein aus.

**Nur Forecast** bildet die geplante Zukunft ab und ist damit die richtige Wahl
für eine Investitions- oder Standortentscheidung. Die Qualität des Ergebnisses
ist allerdings genau die Qualität der Prognose. Kritisch ist besonders die
**regionale Granularität**: Viele Forecasts existieren nur auf Landes- oder
Gesamtebene. Fehlt die regionale Aufteilung, verliert die Distanzrechnung ihre
Grundlage und alle Standorte rücken im Transport-Score zusammen.

**Beide zusammen** mittelt über den gesamten Zeitraum. Der Bedarf pro Tag liegt
dann zwischen beiden Werten, gewichtet nach der Anzahl der Tage — im Beispiel
zieht die doppelt so lange Historie den Wert nach unten. Das ist sinnvoll, wenn
man Ausreißer in der Prognose dämpfen möchte, und irreführend, wenn Historie und
Forecast strukturell verschieden sind: Ein Mittelwert aus zwei unterschiedlichen
Welten beschreibt keine von beiden.

### Empfohlenes Vorgehen

1. **Historie** rechnen, um die regionale Struktur und die Größenordnung zu
   verstehen und die Kostensätze zu kalibrieren.
2. **Forecast** rechnen, weil die Entscheidung die Zukunft betrifft — als
   Szenario speichern.
3. Beide Szenarien vergleichen. Weichen die Zuordnungen ab, liegt darin die
   eigentliche Erkenntnis: Das Netz ist gegenüber der Bedarfsentwicklung nicht
   robust. Dann lohnt eine Splitting-Variante oder eine Kapazitätsanpassung.

Die Kombination „beides" ist vor allem dann nützlich, wenn der Forecast nur
wenige Perioden umfasst und allein zu stark von einer einzelnen Saison geprägt
wäre.

---

## 11. Grenzen: Zeithorizont und Datenmenge

Die folgenden Werte wurden auf dem Standard-Chromium dieser Umgebung gemessen.

### Zeithorizont

**Es gibt keine Begrenzung der Anzahl an Forecast-Perioden.** Geprüft wurde ein
Bestand aus 10 Jahren Historie (2016-01 bis 2025-12) und 10 Jahren Forecast
(2026-01 bis 2035-12) — 240 Monatsperioden, fehlerfrei verarbeitet, Simulation
über die vollen 3.652 Forecast-Tage.

Grenzen liegen ausschließlich in der **Periodenerkennung**:

| Schreibweise | Zulässiger Bereich |
|---|---|
| `2035-06`, `2035-06-15` | praktisch unbegrenzt (bis mindestens Jahr 2500 geprüft) |
| `15.06.2035`, `06/2035` | wie oben |
| `2035-Q3`, `2035-KW26` | wie oben |
| `Jun 2035` | wie oben |
| nur Jahreszahl: `2035` | **1900 bis 2200** |
| Excel-Datumswert | ca. 1954 bis 2064 (Seriennummern 20.000–60.000) |

Praktisch relevant ist eher die fachliche Grenze: Ein Forecast über mehr als
drei bis fünf Jahre trägt eine Standortentscheidung selten, und je länger der
gewählte Zeitraum, desto stärker glättet der Mittelwert die Saison.

### Historische Datenmenge

Auch hier gibt es **keine feste Zeilenbegrenzung**. Gemessene Werte:

| Datensätze | Simulation einer Kategorie | Alle Kategorien | Projektgröße | Browser-Zwischenspeicher |
|---|---|---|---|---|
| 5.000 | 2 ms | 1,2 s | 1,4 MB | funktioniert |
| 25.000 | 6 ms | 0,8 s | 6,7 MB | **Limit überschritten** |
| 100.000 | 44 ms | 1,3 s | 26,7 MB | Limit überschritten |
| 250.000 | 109 ms | 2,6 s | 66,7 MB | Limit überschritten |

Die **Rechenzeit ist unkritisch**: Auch 250.000 Datensätze sind in
Sekundenbruchteilen ausgewertet. Die eigentliche Grenze ist der
**localStorage des Browsers mit rund 5 MB**, also etwa **15.000 bis 18.000
Datensätze**. Darüber greift die eingebaute Rückfallebene: Konfiguration,
Zuordnungen und Szenarien werden weiter gesichert, die Rohdaten nicht, und es
erscheint ein entsprechender Hinweis. Der Arbeitsstand geht dadurch nicht
verloren — er muss nur über *Export & Projekt → Projekt als JSON speichern*
gesichert werden.

Zwei Entlastungen kommen hinzu:

* Beim Import werden Dateien mit mehr als 2.000 Zeilen automatisch auf die
  Dimensionskombination (Periode × Kunde × Region × Kategorie) verdichtet. Aus
  einer Million Einzellieferungen werden so oft nur einige zehntausend
  Datensätze.
* Für die Simulation zählt ohnehin nur die aggregierte Ebene. Eine Verdichtung
  vor dem Import kostet keine Genauigkeit, solange die Dimensionen erhalten
  bleiben.

**Empfehlung:** Wenn die Datei mehr als etwa 20.000 verdichtete Datensätze
ergibt, die automatische Zwischenspeicherung abschalten und stattdessen mit der
Projektdatei arbeiten.

### Format für den Forecast-Upload

Der Forecast nutzt **exakt dasselbe Format wie die Historie** — es gibt kein
eigenes Forecast-Schema. Unterschieden wird allein über den Schalter
*Datensatz-Typ: Forecast* im Importbereich.

Pflicht je Zeile:

| Feld | Beispiel |
|---|---|
| Produktkategorie | Kühlgeräte |
| Periode | 2027-03 |
| eine Mengenangabe | Menge, Paletten, Paletten-Äquivalent, Volumen oder Umsatz |
| ein Ortsbezug | Region, Land oder Kunde |

Optional: Kunde, Land, Menge, Umsatz, Volumen, Paletten, Paletten-Äquivalent,
Breiten- und Längengrad.

Dateitypen: `.xlsx`, `.xlsm`, `.xls`, `.csv`, `.txt`. Die Spaltennamen sind frei —
sie werden beim Import zugeordnet und gängige Bezeichnungen automatisch erkannt.
Ausfüllfertige Vorlagen liegen unter `vorlagen/`; die Excel-Mappe enthält dafür
ein eigenes Blatt „Forecast".

Zwei Hinweise aus der Praxis:

* **Regionale Aufteilung mitliefern.** Ein Forecast nur auf Landesebene
  funktioniert zwar, macht die Distanzbewertung aber grob. Je feiner die
  Regionen, desto belastbarer die Standortempfehlung.
* **Möglichst in Paletten oder Paletten-Äquivalenten prognostizieren.** Wird nur
  in Stück oder Umsatz geplant, hängt der gesamte Kapazitätsbedarf an einem
  einzigen globalen Umrechnungsfaktor.

---

## 12. Was das Modell nicht leistet

Damit die Ergebnisse richtig eingeordnet werden:

* **Keine mathematische Optimierung.** Das Splitting ist eine nachvollziehbare
  Heuristik, kein Solver. Es findet gute, keine beweisbar optimalen Lösungen.
* **Keine Routenplanung.** Entfernungen sind Luftlinie mal Umwegfaktor. Für
  belastbare Frachtkosten sind die regionsspezifischen Pauschalen je DC
  vorgesehen.
* **Keine Prognose.** Der Forecast wird extern erstellt und nur eingelesen.
* **Keine Bestandsoptimierung.** Der Ziel-Bestand folgt der vorgegebenen
  Reichweite; Sicherheitsbestände aus Servicegrad und Prognosefehler werden nicht
  berechnet. Der Umschlagfaktor ist dafür ein pauschaler Ersatz.
* **Keine Zeitdynamik.** Gerechnet wird ein Durchschnitt über den gewählten
  Zeitraum, kein Verlauf über die Perioden. Saisonale Kapazitätsspitzen werden
  nur sichtbar, wenn man den Zeitraum entsprechend einschränkt.
* **Keine Mehrstufigkeit.** Betrachtet wird die Belieferung Kundenregion ← DC.
  Vorlaufkosten aus Werken oder Zentrallägern in die DCs sind nicht Teil des
  Modells; sie lassen sich näherungsweise über die Handlingkosten je Palette
  abbilden.
