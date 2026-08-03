# Rechnungsgenerator für Kleinunternehmer — Anleitung

Vielen Dank für den Kauf. Diese Anleitung bringt dich in etwa fünf Minuten zur
ersten fertigen Rechnung.

---

## 1. Starten

Doppelklick auf **`rechnungsgenerator.html`**. Die Datei öffnet sich im
Standardbrowser — mehr ist nicht nötig.

* Keine Installation, kein Konto, kein Abo.
* Kein Internet nötig. Die Datei funktioniert im Flugzeug genauso wie zu Hause.
* Empfohlene Browser: Chrome, Edge, Firefox oder Safari in einer aktuellen Version.

**Tipp:** Lege die Datei in einen Ordner, den deine Datensicherung erfasst, und
setze ein Lesezeichen darauf.

---

## 2. Stammdaten einmalig hinterlegen

Beim ersten Start ist der Abschnitt **Absender & Stammdaten** geöffnet. Trage dort
deine Daten ein: Name, Anschrift, Steuernummer (oder USt-IdNr.) und Bankverbindung.

Diese Angaben werden gespeichert und stehen bei jedem weiteren Beleg automatisch
zur Verfügung. Optional lässt sich ein Logo hochladen (PNG oder JPG, am besten
unter 300 kB).

Sobald die Stammdaten gefüllt sind, startet der Abschnitt eingeklappt. Ein Klick
auf die Überschrift öffnet ihn wieder.

---

## 3. Beleg schreiben

| Abschnitt | Was dort passiert |
|---|---|
| **Beleg** | Belegart (Rechnung, Angebot, Stornorechnung), Nummer, Datum, Leistungszeitraum, Zahlungsziel, Betreff |
| **Empfänger** | Anschrift des Kunden; häufige Kunden lassen sich speichern |
| **Positionen** | Leistungen mit Menge, Einheit, Einzelpreis und Steuersatz |
| **Steuer & Optionen** | § 19 UStG, Reverse-Charge, Rabatt, Schlusstext |

Die Vorschau rechts zeigt live, wie der fertige Beleg aussieht.

**Zahlen eingeben:** Komma und Punkt werden beide akzeptiert — `39,50` und
`39.50` ergeben denselben Betrag.

**Positionen sortieren:** Mit den Pfeilen ↑ ↓ verschiebst du eine Zeile, mit ✕
entfernst du sie.

**Eigene Einheiten:** Die Einheit wählst du aus der Liste. Fehlt deine —
etwa `m²`, `Flasche` oder `Zeile` — wählst du **„Andere …"**, tippst sie ein und
bestätigst mit Enter. Sie steht dir ab dann dauerhaft zur Auswahl. Mit Escape
brichst du ab, ohne die bisherige Einheit zu verlieren.

---

## 4. Als PDF speichern

Auf **PDF / Drucken** klicken. Im Druckdialog des Browsers als Ziel
**„Als PDF speichern"** wählen.

Diese Einstellungen sorgen für ein sauberes Ergebnis:

* Format: **A4**
* Ränder: **Standard** oder **Keine** (die Seitenränder sind im Beleg angelegt)
* **Hintergrundgrafiken aktivieren** — sonst fehlt der Rahmen um die Zahlungshinweise
* Kopf- und Fußzeilen des Browsers: **aus**

Der Editor wird beim Drucken automatisch ausgeblendet; im PDF landet nur der Beleg.

---

## 5. Belegnummern

Über **Neuer Beleg** wird automatisch die nächste freie Nummer vergeben, im
Format `RE-2026-001`. Der Zähler läuft je Belegart und Jahr getrennt und beginnt
jedes Jahr neu bei 001.

Die Nummer lässt sich jederzeit von Hand überschreiben, wenn du einen eigenen
Kreis führst. Wichtig ist nur: Rechnungsnummern müssen **einmalig** und
**lückenlos nachvollziehbar** sein.

---

## 6. Daten sichern

Alle Eingaben liegen ausschließlich im lokalen Speicher deines Browsers
(localStorage). Sie verlassen deinen Rechner nicht — es gibt keinen Server, an
den etwas gesendet werden könnte.

Das bedeutet aber auch: **Wenn du den Browserverlauf inklusive Websitedaten
löschst, sind die Daten weg.**

Deshalb:

* **Sichern (.json)** legt eine Datei mit Stammdaten, aktuellem Beleg und
  Kundenliste an. Diese Datei zusammen mit dem PDF im Kundenordner ablegen.
* **Laden** stellt einen so gesicherten Stand wieder her — praktisch auch, um
  eine Rechnung im Folgemonat als Vorlage wiederzuverwenden.

Ein Beleg gilt steuerlich über das PDF, nicht über die JSON-Datei. Die JSON-Datei
ist deine Arbeitskopie zum Weiterbearbeiten.

---

## 7. Häufige Fragen

**Die Vorschau ist zu klein oder zu groß.**
Über − und + oberhalb der Vorschau anpassen. Die Einstellung wird gespeichert und
beeinflusst das PDF nicht.

**Ich arbeite mit § 19 UStG. Was muss ich tun?**
Im Abschnitt *Steuer & Optionen* das Häkchen bei **Kleinunternehmerregelung**
setzen. Die Umsatzsteuer verschwindet dann aus Positionen und Summen, und der
vorgeschriebene Hinweistext erscheint automatisch auf dem Beleg.

**Kunde sitzt im EU-Ausland und hat eine USt-IdNr.**
Häkchen bei **Reverse-Charge** setzen. Wichtig: Deine eigene USt-IdNr. muss in
den Stammdaten hinterlegt sein, sonst weist der Hinweis unter dem Editor darauf hin.

**Mehrere Steuersätze in einer Rechnung.**
Jede Position hat ihr eigenes Auswahlfeld. Die Umsatzsteuer wird je Satz
gruppiert und einzeln ausgewiesen — genau so, wie es sein soll.

**Kann ich das auf mehreren Geräten nutzen?**
Ja. Die Datei kopieren und die Stammdaten per **Sichern**/**Laden** übertragen.
Die Lizenz gilt für dich als Person bzw. dein Unternehmen.

**Der Beleg wird zwei Seiten lang.**
Das ist normal bei vielen Positionen. Der Seitenumbruch wird so gesetzt, dass
Positionen und Summenblock nicht mitten durchgeschnitten werden.

**Ich sehe einen Hinweis in Orange unter dem Editor.**
Das ist die Prüfung auf Pflichtangaben nach § 14 UStG. Sie listet auf, was für
eine vollständige Rechnung noch fehlt. Bei Angeboten erscheint sie nicht.

---

## 8. Wichtiger Hinweis

Dieses Werkzeug unterstützt beim Erstellen von Belegen und prüft die formalen
Pflichtangaben nach § 14 UStG. Es ist **keine Steuer- oder Rechtsberatung** und
ersetzt keine Buchhaltungssoftware.

Ob in deinem konkreten Fall die Kleinunternehmerregelung, Reverse-Charge oder ein
bestimmter Steuersatz zutrifft, entscheidet dein Steuerberater oder das Finanzamt.
Für die Richtigkeit deiner Belege bist du selbst verantwortlich.

Hinweis zur E-Rechnungspflicht: Seit 2025 müssen Unternehmen in Deutschland
E-Rechnungen im B2B-Bereich **empfangen** können. Für das **Ausstellen** gelten
gestaffelte Übergangsfristen. Dieses Werkzeug erzeugt PDF-Belege, kein
strukturiertes XML-Format (ZUGFeRD/XRechnung). Kläre mit deinem Steuerberater,
welche Frist für dich gilt.

---

## 9. Support

Bei Fragen einfach über die Plattform antworten, über die du gekauft hast.
