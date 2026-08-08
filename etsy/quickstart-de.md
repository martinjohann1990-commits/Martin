# FlowStock — Anleitung

Danke für deinen Kauf. Diese Anleitung braucht fünf Minuten, danach läuft alles.

## 1. Öffnen

Doppelklick auf **FlowStock.html**. Die Datei öffnet sich in deinem Standardbrowser.
Es wird nichts installiert und nichts hochgeladen.

Tipp: Lege die Datei irgendwohin, wo du sie wiederfindest — Desktop oder ein Ordner
„Buchhaltung". Ein Lesezeichen auf die Datei funktioniert ebenfalls.

Empfohlene Browser: Chrome, Edge, Firefox, Safari in aktueller Version.

## 2. Erst einmal ausprobieren

Klick auf **„Mit Demodaten ansehen"**. FlowStock erzeugt einen realistischen
Beispiel-Shop mit 180 Tagen Verkaufshistorie und zwölf Artikeln. So siehst du,
was dich erwartet, bevor du deine eigenen Zahlen anfasst.

Mit **„Neue Datei"** oben rechts kommst du jederzeit zurück.

## 3. Deinen Verkaufs-Export holen

**Etsy:** Shop-Manager → Einstellungen → Optionen → Daten herunterladen →
„Bestellpositionen" (Order Items), Jahr wählen, CSV herunterladen.

**Shopify:** Analysen → Berichte → Verkäufe nach Produkt → Exportieren.
Alternativ Bestellungen → Exportieren → „Bestellungen nach Artikel".

**eBay:** Verkäuferbereich → Bestellungen → Berichte herunterladen.

**Amazon Seller Central:** Berichte → Zahlungen → Transaktionsübersicht,
oder Bestellberichte.

**Eigener Shop / WooCommerce:** jeder Export mit einer Zeile pro verkaufter Position.

Wichtig ist nur, dass es **eine Zeile pro verkauftem Artikel** gibt und dass ein
Datum und ein Betrag darin vorkommen. Alles Weitere macht die Auswertung genauer,
ist aber nicht Pflicht.

## 4. Hochladen

Zieh die CSV auf das große Feld oder klick auf **„Verkäufe wählen"**.

FlowStock zeigt dir danach, welche Spalte es wofür hält. Prüf das kurz — vor allem
Datum, Umsatz und Menge. Wenn etwas falsch zugeordnet ist, änderst du es im
Auswahlfeld daneben. Dann auf **„Auswertung starten"**.

Deutsche Zahlen (`1.234,56`) und englische (`1,234.56`) werden beide erkannt,
ebenso Datumsformate mit Punkt, Bindestrich oder Schrägstrich sowie Währungszeichen.

## 5. Bestandsliste ergänzen (empfohlen)

Ohne Bestandsdaten kennt FlowStock deinen Umsatz, aber nicht deinen Nachschub.
Der Bestellplan bleibt dann leer.

Leg dir eine kleine Tabelle an — Excel, Numbers oder LibreOffice, dann als CSV
speichern. Sie braucht nur diese Spalten:

| Artikelnummer | Artikel | Bestand | Einkaufspreis | Lieferzeit | Mindestbestellmenge | Lieferant |
|---|---|---|---|---|---|---|
| KER-001 | Keramiktasse Sand | 42 | 7,20 | 21 | 20 | Studio Töpferei |

Pflicht sind nur **Artikelnummer** und **Bestand**. Die Artikelnummer muss zu der
in deinem Verkaufs-Export passen — sonst findet FlowStock die Artikel nicht wieder.

Im Ordner `samples` liegt eine fertige Beispieldatei zum Abgucken.

Fehlt die Lieferzeit für einen Artikel, nimmt FlowStock den Standardwert aus den
Einstellungen.

## 6. Einstellungen ausfüllen

Das ist der Schritt, der aus einer Statistik eine Prognose macht. Oben rechts auf
**„Einstellungen"**:

- **Startsaldo** — was heute wirklich auf dem Geschäftskonto liegt.
- **Fixkosten pro Monat** — Miete, Tools, Abos, Versicherungen. Alles, was auch
  ohne Verkäufe abgeht.
- **Prognosehorizont** — 90 Tage sind ein guter Start.
- **Lieferzeit** — Standard für Artikel ohne eigene Angabe.
- **Zielreichweite** — für wie viele Tage eine Bestellung reichen soll. 45 Tage
  bedeutet: du bestellst seltener, bindest aber mehr Kapital.
- **Sicherheitsbestand** — Puffer für Wochen, in denen mehr läuft als sonst.
- **Wareneinsatz-Annahme** — greift nur, wenn in deinen Daten kein Einkaufspreis
  steht. Setz sie realistisch, sonst ist die Marge Fantasie.

## 7. Ablesen

**Kontostand-Prognose** (die große Zahl): was am Ende des Horizonts übrig ist,
nachdem alle fälligen Nachbestellungen bezahlt sind.

**Tiefster Punkt:** die kritische Zahl. Wenn die negativ ist, wird es eng —
unabhängig davon, wie gut die Endzahl aussieht.

**Reichweite:** Tage bis zur Null. Steht dort „über 90 Tage", ist im Horizont
kein Loch.

**Bestellplan:** von oben nach unten abarbeiten. „Bestellen bis" ist der letzte
Tag, an dem die Bestellung noch rechtzeitig ankommt.

**Artikelübersicht:** klick auf eine Spaltenüberschrift, um zu sortieren.
Sortier einmal nach „Reichweite" aufsteigend — die ersten Zeilen sind deine
nächsten Probleme.

Ein `~` beim Rohertrag heißt: Einkaufspreis geschätzt, nicht aus deinen Daten.

## 8. Weiterverwenden

- **CSV-Export** — Kennzahlen, Verlauf und Prognose als Datei, etwa für die Steuerberatung.
- **Plan exportieren** — der Bestellplan, direkt an den Lieferanten weiterzugeben.
- **Drucken / PDF** — druckt das Dashboard sauber, ohne Bedienelemente.

## 9. Wenn du es öfter nutzt

Aktiviere in den Einstellungen **„Datensatz im Browser speichern"**. Dann ist beim
nächsten Öffnen alles wieder da. Die Daten liegen ausschließlich auf deinem Gerät
und lassen sich im selben Dialog wieder löschen.

Ein sinnvoller Rhythmus: einmal pro Woche neuen Export ziehen, Bestand aktualisieren,
Bestellplan durchgehen.

---

## Wenn etwas nicht klappt

**„Keine gültigen Zeilen gefunden"** — meistens ist die Datumsspalte falsch
zugeordnet. Lade die Datei neu und prüfe im Zuordnungsdialog, ob dort wirklich das
Verkaufsdatum steht.

**Umsätze sehen zu hoch aus** — vermutlich sind Umsatz *und* Stückpreis zugeordnet
und der Umsatz enthält bereits die Menge. Setz „Stückpreis" auf „nicht zugeordnet".

**Bestellplan bleibt leer** — es fehlt die Bestandsliste, oder die Artikelnummern
stimmen zwischen den beiden Dateien nicht überein.

**Marge wirkt unrealistisch** — es fehlt der Einkaufspreis. Entweder in die
Bestandsliste aufnehmen oder die Wareneinsatz-Annahme in den Einstellungen anpassen.

**Diagramme sind leer** — der Zeitraumfilter steht auf einem Fenster, in dem keine
Verkäufe liegen. Stell ihn auf „Gesamter Export".

Kommst du nicht weiter, schreib mir über Etsy — am besten mit der ersten Zeile
deiner CSV (den Spaltennamen). Damit finde ich das Problem meistens sofort.
