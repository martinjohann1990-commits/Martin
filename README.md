# Cashflow-Frühwarnsystem / Cashflow Early Warning System

Ein zweisprachiges Liquiditäts-Frühwarnsystem für Kleinunternehmer und
Selbstständige als reine Excel-Datei — ohne Makros, ohne VBA, kompatibel mit
Microsoft Excel und Google Sheets.

**Fertige Demo-Datei:** [`Cashflow-Fruehwarnsystem.xlsx`](Cashflow-Fruehwarnsystem.xlsx)
(mit Beispieldaten befüllt)

---

## Was das Tool kann

| Funktion | Umsetzung |
|---|---|
| Offene Rechnungen erfassen | 100 vorformatierte Zeilen, Status-Dropdown, überfällige Posten werden rot markiert |
| Fixe und variable Kosten | 20 Zeilen monatliche Fixkosten (mit Fälligkeitstag), 30 Zeilen Einmalausgaben (mit Datum) |
| 12-Wochen-Liquiditätsprognose | Wochenweise Ein-/Auszahlungen und Saldo, abgeleitet aus Zahlungszielen |
| Frühwarn-Ampel | Rot unter Mindestreserve, Gelb bei kritischer Annäherung, Grün darüber |
| Szenario-Simulation | Zahlungsverzug aller Kunden, Zusatzverzug eines Kunden, Forderungsausfall |
| Dashboard | 4 Kennzahlen-Kacheln, Warnbanner, Liniendiagramm, Wochentabelle, Kurzanleitung |
| Sprachumschaltung | Eine Zelle schaltet die gesamte Oberfläche zwischen Deutsch und Englisch um |
| Umsatzsteuer | Standard ist der §19-Modus (keine USt); über eine Schalterzelle zuschaltbar |

## Tab-Struktur

| Tab | Zweck |
|---|---|
| `Dashboard` | Sprachumschalter, Kennzahlen, Diagramm, Wochentabelle, Einstellungen, Anleitung |
| `Rechnungen \| Invoices` | Eingabemaske offene Rechnungen |
| `Kosten \| Costs` | Fixkosten pro Monat und variable Einmalkosten |
| `Szenario \| Scenario` | Simulations-Regler, Wirkungskennzahlen, Vergleichstabelle und -diagramm |
| `Config` *(ausgeblendet)* | Übersetzungstabelle, Dropdown-Listen und der komplette Rechenkern |

Die Blattnamen sind bewusst zweisprachig: Excel kann Blattnamen nicht per Formel
umbenennen, deshalb tragen sie beide Sprachen fest im Namen.

## Sprachlogik

Die Zelle `Dashboard!N3` bietet ein Dropdown mit `Deutsch` / `English`. Daraus
leitet `Config!E2` (benannter Bereich `LANG`) den Wert 1 oder 2 ab. Jedes Label
im gesamten Tool ist eine Formel dieser Bauart:

```excel
=INDEX(Config!$B$6:$C$104, MATCH("kpi.balance", Config!$A$6:$A$104, 0), LANG)
```

Die Übersetzungstabelle im `Config`-Blatt enthält 99 Schlüssel — Überschriften,
Spaltenköpfe, Erklärtexte, Ampelmeldungen, Diagramm-Legenden und Dropdown-Werte.
Bewusst wird `INDEX`/`MATCH` statt `XLOOKUP` oder `SWITCH` verwendet, damit die
Datei in Excel 2016, Excel 365 und Google Sheets identisch funktioniert.

**Sprachwechsel entwertet keine Daten.** Der Status einer Rechnung wird über
`COUNTIF(Config!$F$5:$G$5; …)` ausgewertet, also gegen *beide* Sprachfassungen
gleichzeitig. Eine als `offen` erfasste Rechnung bleibt auch nach dem Umschalten
auf Englisch offen.

## Farbschema und Typografie

```
Deep Petrol   #103C4B   Kopfband, Titel, Tabellenköpfe
Teal Primary  #1B7F8C   Akzentkanten, Chartlinie Basis
Sage Green    #2FA88F   Chartlinie Szenario, Einzahlungen
Canvas        #F4F7F9   Blattfläche (Gitternetz überall ausgeblendet)
Card White    #FFFFFF   Kacheln und Tabellenflächen
Hairline      #DDE6EC   dezente 1-px-Rahmen statt schwarzer Gitterlinien
Text          #1E2A32   Werte      Muted #6B7C8A   Labels
Eingabefeld   #FFFDF5 auf #E4D9B8 — warme Markierung aller Eingabezellen
Berechnet     #F2F6F8 kursiv — klar unterscheidbar von Eingaben

Ampel, gedeckt statt grell:
  Grün  Fläche #E6F4EE  Schrift #1E8A5F
  Gelb  Fläche #FDF4DE  Schrift #A9761A
  Rot   Fläche #FAE8E6  Schrift #B8402F
```

Durchgängig Segoe UI (Google Sheets fällt sauber auf Arial zurück), mit klarer
Hierarchie: Titel 18 pt, Abschnitt 11 pt Bold Petrol, Kennzahl 17 pt Bold,
Label 8,5 pt Muted, Fließtext 9,5–10 pt.

## Rechenlogik

* **Erwarteter Zahlungseingang** = Rechnungsdatum + Zahlungsziel, jedoch nie vor
  dem Prognosestart. Überfällige Rechnungen werden dadurch in der ersten
  Prognosewoche erwartet statt zu verschwinden.
* **Wochenbuckets** entstehen über `SUMIFS` auf Datumsgrenzen — keine
  Matrixformeln, damit Google Sheets identisch rechnet.
* **Fixkosten** werden in der Woche gebucht, die ihren Fälligkeitstag enthält;
  eine Hilfsmatrix im `Config`-Blatt behandelt dabei den Monatswechsel korrekt.
* **Ampel:** Rot unter `MINCASH`, Gelb unter `MINCASH × YELLOWF`, sonst Grün.
* **Umsatzsteuer** (nur bei aktivem Schalter): Zahllast am eingestellten Tag des
  Monats für die im Vormonat *gestellten* Rechnungen — das entspricht der
  Soll-Versteuerung.

## Erzeugung und Prüfung

```bash
pip install openpyxl
python3 build_cashflow_tool.py Cashflow-Fruehwarnsystem.xlsx   # Datei bauen
python3 verify_tool.py                                          # prüfen
python3 preview_tool.py                                         # HTML-Vorschau
```

* `build_cashflow_tool.py` — der Generator. Alle Beispieldaten stehen als
  Konstanten am Kopf der Datei und lassen sich dort anpassen.
* `verify_tool.py` — rechnet das Prognosemodell unabhängig in Python nach und
  prüft die erzeugte Datei statisch: Blattbezüge, benannte Bereiche,
  überlappende Zellverbünde, Vollständigkeit der Übersetzungstabelle und dass
  jeder in einer Formel verwendete Textschlüssel auch existiert.
* `preview_tool.py` — bildet die Blätter als HTML nach (Füllungen, Rahmen,
  Schriften, Zellverbünde, bedingte Formatierung) und löst die Formeln mit den
  nachgerechneten Werten auf. Reines Kontrollwerkzeug für das Design.

## Bekannte Grenzen — bitte vor dem Einsatz lesen

1. **Dezimal- und Tausendertrennzeichen folgen der Systemeinstellung des
   Anwenders, nicht der Datei.** Das ist eine Eigenschaft von Excel und Google
   Sheets und lässt sich per Formel nicht erzwingen. Umgeschaltet wird deshalb
   die *Position des Währungssymbols*: `1.234,56 €` im deutschen, `€ 1,234.56`
   im englischen Modus.

2. **Diese Symbolumschaltung nutzt bedingte Formatierung mit Zahlenformat.
   Google Sheets unterstützt Zahlenformate in bedingter Formatierung nicht.**
   In Google Sheets bleibt daher in beiden Sprachen die deutsche Darstellung
   `1.234,56 €` stehen. Alle Texte, Überschriften und Warnmeldungen schalten
   auch dort vollständig um.

3. **Die Datei wurde nicht in Microsoft Excel selbst geöffnet.** In der
   Build-Umgebung stand kein Excel zur Verfügung, und die installierte
   LibreOffice-Version ist defekt (sie kann keine Tabellendatei laden, auch
   keine CSV). Geprüft wurde stattdessen dreifach: strukturelle Analyse der
   erzeugten Datei, unabhängige Nachrechnung des Prognosemodells in Python und
   eine HTML-Nachbildung des Layouts. Ein Praxistest in Excel bleibt sinnvoll.

4. **Die Beispieldaten sind `TODAY()`-relativ** (`=TODAY()-38` statt eines festen
   Datums), damit die Demo zu jedem Zeitpunkt eine sinnvolle Prognose zeigt.
   Beim Erfassen echter Rechnungen werden diese Formeln einfach durch Datumswerte
   überschrieben.

5. **Der Fälligkeitstag der Fixkosten ist auf 1–28 begrenzt**, damit die Buchung
   in jedem Monat existiert (kein 30. Februar).

## Beispieldaten

Die mitgelieferte Demo zeigt einen Betrieb mit 6.800 € Startkontostand, 5.000 €
Mindestreserve, 12 offenen Rechnungen über 30.960 € und 2.804 € Fixkosten pro
Monat. Die Basisprognose bleibt bis auf eine Woche im grünen Bereich. Das
voreingestellte Szenario — alle Kunden zahlen 14 Tage später, ein Großkunde
zusätzlich 21 Tage — drückt den Kontostand in drei Wochen unter die
Mindestreserve, mit einem Tiefpunkt von 1.716 €. Genau dafür ist das Tool da.
