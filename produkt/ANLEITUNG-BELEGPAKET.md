# Belegpaket — Anleitung

Vielen Dank für den Kauf. Dieses Werkzeug erstellt sechs Belege, die im
Geschäftsalltag neben der Rechnung anfallen:

| Beleg | Wofür |
|---|---|
| **Zahlungserinnerung** | Der freundliche erste Anstoß — ohne Gebühren |
| **1. Mahnung** | Mit Bezug auf Rechnungsnummer und Fälligkeit, neue Frist |
| **2. Mahnung** | Mit Verzugszinsen, Mahngebühr und Ankündigung weiterer Schritte |
| **Auftragsbestätigung** | Leistungsumfang, Termin und Preis verbindlich festhalten |
| **Lieferschein** | Positionen ohne Preise, mit Feld für die Empfangsbestätigung |
| **Stundenzettel** | Datum, Tätigkeit, Zeiten, Summe je Woche — zum Gegenzeichnen |

---

## 1. Starten

Doppelklick auf **`belegpaket.html`**. Die Datei öffnet sich im Standardbrowser
— mehr ist nicht nötig.

* Keine Installation, kein Konto, kein Abo.
* Kein Internet nötig. Die Datei funktioniert im Flugzeug genauso wie zu Hause.
* Empfohlene Browser: Chrome, Edge, Firefox oder Safari in einer aktuellen Version.

**Tipp:** Lege die Datei in einen Ordner, den deine Datensicherung erfasst, und
setze ein Lesezeichen darauf.

---

## 2. Stammdaten einmalig hinterlegen

Beim ersten Start ist der Abschnitt **Absender & Stammdaten** geöffnet. Trage
dort deine Daten ein: Name, Anschrift, Steuernummer (oder USt-IdNr.) und
Bankverbindung. Optional lässt sich ein Logo hochladen.

Diese Angaben werden gespeichert und stehen bei jedem weiteren Beleg
automatisch zur Verfügung.

**Du besitzt auch den Rechnungsgenerator?** Dann geht es schneller: Klicke auf
**Rechnung übernehmen** und wähle eine dort gesicherte `.json`-Datei aus.
Stammdaten, Kundenliste und Empfänger werden übernommen — und beim Mahnwesen
zusätzlich Rechnungsnummer, Rechnungsdatum, Fälligkeit und der Bruttobetrag.
Siehe Abschnitt 4.

---

## 3. Beleg schreiben

Oben die **Belegart** wählen. Das Formular passt sich an: Für Mahnungen
erscheinen die Felder zur offenen Rechnung, für Auftragsbestätigung und
Lieferschein die Positionen, für den Stundenzettel die Tagesliste.

Die Vorschau rechts zeigt live, wie der fertige Beleg aussieht.

**Anrede:** Steht im Empfängerfeld *Name* etwas wie „Frau Dr. Erika Muster“,
wird daraus automatisch „Sehr geehrte Frau Dr. Muster,“. Das Feld **Anrede**
überschreibt den Vorschlag, wenn du es anders möchtest.

**Texte:** Jede Belegart bringt passende Einleitungs- und Schlusstexte mit.
Sobald du sie änderst, bleiben deine eigenen Texte auch beim Wechsel der
Belegart erhalten. Über **Standardtexte für diese Belegart einsetzen** holst du
die Vorlage zurück.

**Zahlen eingeben:** Komma und Punkt werden beide akzeptiert — `39,50` und
`39.50` ergeben denselben Betrag.

---

## 4. Mahnwesen

### Ablauf

Üblich sind drei Stufen: Zahlungserinnerung → 1. Mahnung → 2. Mahnung. Wie
viele Stufen du gehst, ist deine Entscheidung; gesetzlich vorgeschrieben ist
keine davon.

Trage im Abschnitt **Offene Rechnung** ein, worauf sich der Beleg bezieht:
Rechnungsnummer, Rechnungsdatum, Fälligkeit und Betrag. Wurde bereits ein Teil
gezahlt, kommt der Betrag in das Feld **Bereits gezahlt** — gemahnt wird dann
nur die Differenz.

**Neue Zahlungsfrist (Tage)** ergibt das Datum, bis zu dem gezahlt werden soll.
Es erscheint hervorgehoben auf dem Beleg.

### Wann Verzug eintritt

Verzugszinsen und Mahnkosten kannst du erst verlangen, wenn der Schuldner in
**Verzug** ist. Das ist er in der Regel:

* nach einer Mahnung, oder
* spätestens 30 Tage nach Fälligkeit und Zugang der Rechnung (§ 286 Abs. 3 BGB).
  Gegenüber Verbrauchern gilt das nur, wenn in der Rechnung darauf hingewiesen
  wurde.

Deshalb gilt: **Die Mahnung, die den Verzug erst herbeiführt, sollte noch keine
Gebühr enthalten.** Das Werkzeug weist dich darauf hin, wenn dein Verzugsbeginn
nach dem Belegdatum liegt.

### Verzugszinsen

Häkchen bei **Verzugszinsen berechnen** setzen. Gerechnet wird taggenau vom
Verzugsbeginn bis zum Belegdatum, mit 365 Tagen im Jahr:

```
Zinsen = offener Betrag × Zinssatz × Tage ÷ 365
```

Der Zinssatz setzt sich aus dem **Basiszinssatz** und einem **Zuschlag**
zusammen (§ 288 BGB):

| Schuldner | Zuschlag | Grundlage |
|---|---|---|
| Verbraucher | 5 Prozentpunkte | § 288 Abs. 1 BGB |
| Unternehmen (kein Verbraucher beteiligt) | 9 Prozentpunkte | § 288 Abs. 2 BGB |

Der **Basiszinssatz nach § 247 BGB** wird von der Deutschen Bundesbank zum
1. Januar und zum 1. Juli bekannt gegeben und ändert sich damit zweimal im Jahr.
Voreingestellt sind **1,52 %** — das ist der Wert ab dem 1. Juli 2026.

> **Bitte vor dem Versand prüfen**, ob dieser Wert noch aktuell ist. Die
> Bundesbank veröffentlicht ihn; jede Industrie- und Handelskammer führt ihn
> ebenfalls. Das Feld steht genau deshalb im Werkzeug und nicht fest im
> Programm.

Über **eigener Zinssatz** lässt sich der Zuschlag frei setzen — etwa, wenn im
Vertrag ein anderer Verzugszins vereinbart ist.

### Mahngebühr und Verzugspauschale

**Mahngebühr:** Erstattungsfähig sind nur die *tatsächlichen* Kosten der
Mahnung, also im Wesentlichen Porto und Material. Gerichte erkennen dafür
üblicherweise Beträge zwischen etwa 2,50 € und 7,50 € an. Die eigene
Arbeitszeit und allgemeine Verwaltungskosten zählen **nicht** dazu. Trägst du
mehr als 7,50 € ein, weist das Werkzeug darauf hin.

**Verzugspauschale 40 € (§ 288 Abs. 5 BGB):** Sie steht dir zu, wenn der
Schuldner **kein Verbraucher** ist. Sie wird auf später anfallende Kosten der
Rechtsverfolgung (etwa Anwaltskosten) angerechnet. Wählst du als Schuldner
„Verbraucher“, blendet das Werkzeug die Pauschale aus.

### Übernahme aus dem Rechnungsgenerator

Klick auf **Rechnung übernehmen** und die `.json`-Sicherung des
Rechnungsgenerators auswählen. Das Werkzeug übernimmt:

* Empfänger, Stammdaten und Kundenliste
* Rechnungsnummer und Rechnungsdatum
* die Fälligkeit (Rechnungsdatum + Zahlungsziel)
* den Bruttobetrag — mit demselben Rechenweg wie dort, also inklusive Rabatt,
  gemischter Steuersätze, § 19 und Reverse-Charge
* den Verzugsbeginn als Tag nach der Fälligkeit
* die Positionen, falls du daraus eine Auftragsbestätigung oder einen
  Lieferschein machen willst

Vorhandene Stammdaten werden dabei **nicht** überschrieben.

---

## 5. Auftragsbestätigung

Sie hält fest, was zu welchem Preis und bis wann geliefert wird. Trage die
Positionen ein wie in einer Rechnung: Menge, Einheit, Einzelpreis, Steuersatz.

* **Bestellnummer und Bestelldatum** des Kunden gehören in den Abschnitt
  *Auftrag & Lieferung* — daran ordnet der Kunde die Bestätigung zu.
* **Ausführungszeitraum** ist ein freies Textfeld: „KW 24–26 2026“ oder
  „binnen 10 Werktagen nach Zahlungseingang“.
* **Rabatt, § 19 UStG und Reverse-Charge** funktionieren wie im
  Rechnungsgenerator. Umsatzsteuer wird je Steuersatz gruppiert ausgewiesen.

Eine Auftragsbestätigung ist kein bloßer Höflichkeitsakt: Weicht sie von der
Bestellung ab, kommt es darauf an, ob der Kunde widerspricht. Halte deshalb
genau fest, was du zusagst.

---

## 6. Lieferschein

Derselbe Positionsblock, nur **ohne Preise** — Preisspalten und Summen
verschwinden vollständig, im Editor wie auf dem Beleg.

* **Lieferdatum** und **Versandart** stehen im Kopf des Belegs.
* Eine **abweichende Lieferanschrift** erscheint als eigener Kasten, wenn die
  Ware nicht an die Empfängeranschrift geht.
* Unter dem Gruß steht ein Feld für **Ort, Datum und Unterschrift** des
  Empfängers. Der Lieferschein ist damit der Nachweis, dass die Ware angekommen
  ist.

Auf dem Beleg steht automatisch der Hinweis, dass es sich um keine Rechnung
handelt.

---

## 7. Stundenzettel

Pro Tag eine Zeile: Datum, Tätigkeit, von, bis, Pause in Minuten.

* Sind **von** und **bis** ausgefüllt, werden die Stunden **abzüglich der
  Pause** berechnet und in die Spalte *Stunden* geschrieben. Der Wert lässt sich
  überschreiben, wenn du lieber rundest.
* Eine Schicht über Mitternacht (22:00 bis 02:00) wird korrekt als 4 Stunden
  gerechnet.
* Erstreckt sich der Zettel über mehrere Kalenderwochen, werden die Zeilen nach
  **KW** gruppiert und je Woche eine Zwischensumme ausgewiesen.
* Mit **+ Tag** kommt eine neue Zeile dazu — mit dem Folgedatum und den Zeiten
  der Vorzeile, weil sich die selten ändern.

Mit dem Häkchen **Stunden abrechnen** kommen Stundensatz, Summe und
Umsatzsteuer dazu. Ohne Häkchen bleibt der Zettel ein reiner Nachweis zum
Gegenzeichnen — genau das, was Auftraggeber am Monatsende sehen wollen.

---

## 8. Als PDF speichern

Auf **PDF / Drucken** klicken. Im Druckdialog des Browsers als Ziel
**„Als PDF speichern“** wählen.

Diese Einstellungen sorgen für ein sauberes Ergebnis:

* Format: **A4**
* Ränder: **Standard** oder **Keine** (die Seitenränder sind im Beleg angelegt)
* **Hintergrundgrafiken aktivieren** — sonst fehlt der Rahmen um die
  Zahlungshinweise
* Kopf- und Fußzeilen des Browsers: **aus**

Der Editor wird beim Drucken automatisch ausgeblendet; im PDF landet nur der
Beleg.

---

## 9. Belegnummern

Über **Neuer Beleg** wird automatisch die nächste freie Nummer vergeben. Jede
Belegart hat ihren eigenen Kreis, der je Jahr bei 001 beginnt:

| Belegart | Kürzel |
|---|---|
| Zahlungserinnerung | `ZE-2026-001` |
| 1. und 2. Mahnung | `MA-2026-001` |
| Auftragsbestätigung | `AB-2026-001` |
| Lieferschein | `LS-2026-001` |
| Stundenzettel | `SZ-2026-001` |

Wechselst du die Belegart, wird eine vom Werkzeug vergebene Nummer durch die
passende ersetzt. Eine **selbst eingetippte** Nummer bleibt unangetastet — wenn
du einen eigenen Nummernkreis führst, hat er Vorrang.

---

## 10. Daten sichern

Alle Eingaben liegen ausschließlich im lokalen Speicher deines Browsers
(localStorage). Sie verlassen deinen Rechner nicht — es gibt keinen Server, an
den etwas gesendet werden könnte.

Das bedeutet aber auch: **Wenn du den Browserverlauf inklusive Websitedaten
löschst, sind die Daten weg.**

Deshalb:

* **Sichern (.json)** legt eine Datei mit Stammdaten, aktuellem Beleg und
  Kundenliste an. Diese Datei zusammen mit dem PDF im Kundenordner ablegen.
* **Laden** stellt einen so gesicherten Stand wieder her — praktisch, um aus der
  1. Mahnung später die 2. Mahnung zu machen: laden, Belegart wechseln, Datum
  anpassen, fertig.

Der Knopf **Laden** erkennt auch Sicherungen des Rechnungsgenerators und
behandelt sie wie **Rechnung übernehmen**.

---

## 11. Häufige Fragen

**Die Vorschau ist zu klein oder zu groß.**
Über − und + oberhalb der Vorschau anpassen. Die Einstellung wird gespeichert
und beeinflusst das PDF nicht.

**Muss ich vor einer Klage mahnen?**
Nein. Der Verzug tritt spätestens 30 Tage nach Fälligkeit und Zugang der
Rechnung von selbst ein (§ 286 Abs. 3 BGB, gegenüber Verbrauchern nur mit
entsprechendem Hinweis auf der Rechnung). Mahnungen sind trotzdem üblich —
meistens ist es schlicht vergessen worden.

**Wie viele Mahnungen sind nötig?**
Keine feste Zahl. Nach der letzten Mahnung sind der gerichtliche Mahnbescheid
(über das Mahngericht, online möglich) oder ein Inkassobüro die nächsten
Schritte.

**Der Kunde sitzt im EU-Ausland.**
Die Belege funktionieren genauso. Welches Recht und welche Verzugsregeln gelten,
klärst du bitte im Einzelfall.

**Kann ich mehrere Rechnungen in einer Mahnung zusammenfassen?**
Das Werkzeug mahnt eine Rechnung je Beleg. Das ist Absicht: So bleibt
nachvollziehbar, welcher Betrag seit wann offen ist und wie sich die Zinsen
zusammensetzen.

**Der Beleg wird zwei Seiten lang.**
Das ist normal bei vielen Positionen oder langen Stundenzetteln. Der
Seitenumbruch wird so gesetzt, dass Zeilen, Summenblock und
Unterschriftsfeld nicht mitten durchgeschnitten werden.

**Ich sehe einen Hinweis in Orange unter dem Editor.**
Das ist die Prüfung. Sie listet auf, was noch fehlt, und warnt vor typischen
Fehlern — etwa einer Mahngebühr, die es rechtlich schwer haben dürfte.

**Kann ich das auf mehreren Geräten nutzen?**
Ja. Die Datei kopieren und die Stammdaten per **Sichern**/**Laden** übertragen.
Die Lizenz gilt für dich als Person bzw. dein Unternehmen.

---

## 12. Wichtiger Hinweis

Dieses Werkzeug unterstützt beim Erstellen von Belegen und weist auf die
gesetzlichen Grenzen von Verzugszinsen und Mahnkosten hin. Es ist **keine
Rechts- oder Steuerberatung** und ersetzt keine anwaltliche Prüfung.

Ob in deinem konkreten Fall Verzug eingetreten ist, welcher Zinssatz gilt und
welche Kosten du verlangen darfst, hängt vom Einzelfall ab — vom Vertrag, vom
Zugang der Rechnung und davon, ob dein Kunde Verbraucher oder Unternehmer ist.
Im Zweifel frage deinen Steuerberater oder eine Rechtsanwältin.

Der voreingestellte Basiszinssatz ist der Wert ab dem 1. Juli 2026. Er ändert
sich zum 1. Januar und 1. Juli. **Prüfe ihn, bevor du eine Mahnung
verschickst.**

---

## 13. Support

Bei Fragen einfach über die Plattform antworten, über die du gekauft hast.
