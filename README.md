# Papierkramerei — digitale Mikroprodukte für den Papierkram

Zwei verkaufsfertige Werkzeuge für Selbstständige im deutschsprachigen Raum.
Verkauft wird auf **Etsy** — Listings, Bilder und Vermarktungsplan liegen
fertig in `marketing/`.

Beide Produkte bestehen aus **einer einzigen HTML-Datei**. Doppelklick, und sie
laufen im Browser — ohne Installation, ohne Konto, ohne Internetverbindung.

| Produkt | Datei | Preis | Was es tut |
|---|---|---|---|
| **Rechnungsgenerator** | `produkt/rechnungsgenerator.html` | 14,90 € | Rechnung, Angebot, Stornorechnung |
| **Belegpaket** | `produkt/belegpaket.html` | 9,00 € | Mahnwesen, Auftragsbestätigung, Lieferschein, Stundenzettel |
| **Komplettpaket** | beide zusammen | 19,00 € | Das Bundle, mit Datenübernahme zwischen beiden |

![Editor mit Live-Vorschau](assets/screenshot-editor.png)

---

## Warum sich das verkauft

Buchhaltungs-Abos kosten 9–15 € im Monat. Wer fünf Rechnungen im Monat
schreibt, zahlt dafür 108–180 € im Jahr. Die Alternative war bisher eine
Word-Vorlage, in der man Beträge von Hand ausrechnet.

Diese Produkte besetzen die Lücke dazwischen: Sie rechnen automatisch, kennen
die deutschen Regeln, kosten einmalig.

Dazu kommt ein Vorteil, den Cloud-Anbieter nicht haben: Umsätze, Kundennamen
und Kontodaten verlassen den Rechner des Käufers nicht. Die Dateien enthalten
keine einzige Verbindung nach außen — kein CDN, keine Schriftart, kein
Tracking. Der Build-Schritt prüft das automatisch und bricht ab, wenn sich doch
ein externer Verweis einschleicht.

---

## Produkt 1: Rechnungsgenerator für Kleinunternehmer

| Bereich | Funktionen |
|---|---|
| **Belegarten** | Rechnung, Angebot, Stornorechnung — Beschriftungen und Fußtexte passen sich automatisch an |
| **Rechnen** | Menge × Einzelpreis, Rabatt auf die Nettosumme, Umsatzsteuer je Steuersatz gruppiert, kaufmännische Rundung |
| **Steuerlogik** | Kleinunternehmerregelung § 19 UStG, Reverse-Charge § 13b UStG, gemischte Sätze (19 % / 7 % / 0 %) in einem Beleg |
| **Prüfung** | Hinweis auf fehlende Pflichtangaben nach § 14 UStG, bevor die Rechnung rausgeht |
| **Komfort** | Stammdaten und Kundenliste werden gespeichert, fortlaufende Belegnummern je Jahr und Belegart, Logo-Upload, Live-Vorschau mit Zoom |
| **Ausgabe** | A4-Druckansicht mit sauberen Seitenumbrüchen, PDF über den Browser |
| **Daten** | Speicherung im localStorage, Sichern und Laden als JSON |

![Erzeugte Rechnung](assets/screenshot-rechnung.png)

---

## Produkt 2: Belegpaket

Sechs Belegarten in einer Datei — alles, was neben der Rechnung anfällt.

| Bereich | Funktionen |
|---|---|
| **Mahnwesen** | Zahlungserinnerung (bewusst kostenfrei), 1. und 2. Mahnung mit Bezug auf Rechnungsnummer, Fälligkeit und neuer Frist |
| **Verzugsrechner** | Zinsen nach § 288 BGB, taggenau, 5 oder 9 Prozentpunkte über dem Basiszinssatz; Mahngebühr; Verzugspauschale 40 € nach § 288 Abs. 5 BGB |
| **Prüfung** | Warnt bei Mahngebühren über dem gerichtlich Anerkannten, bei der Verzugspauschale gegenüber Verbrauchern und bei einem Verzugsbeginn nach dem Belegdatum |
| **Auftrag & Lieferung** | Auftragsbestätigung mit Positionen, Terminen und Umsatzsteuer; Lieferschein mit denselben Positionen **ohne** Preise, mit Empfangsbestätigung |
| **Stundenzettel** | Von-bis-Zeiten abzüglich Pause, Nachtschichten über Mitternacht, Summe je Kalenderwoche, optional mit Stundensatz und Umsatzsteuer |
| **Übernahme** | Liest die JSON-Sicherung des Rechnungsgenerators: Stammdaten, Kunde, Rechnungsnummer, Fälligkeit und Bruttobetrag — niemand tippt Zahlen zweimal |

Der **Basiszinssatz** ist ein Eingabefeld, kein fester Wert im Code: Er ändert
sich zum 1. Januar und 1. Juli. Voreingestellt ist die Bekanntgabe der
Deutschen Bundesbank zum 1. Juli 2026 (1,52 %); das Werkzeug und die Anleitung
fordern zur Prüfung auf.

Eingaben werden in beiden Produkten deutsch verarbeitet: `39,50` und `39.50`
ergeben denselben Betrag, ausgegeben wird `1.530,00 €`.

---

## Aufbau des Repositorys

```
produkt/          Das, was der Käufer bekommt
  rechnungsgenerator.html    Produkt 1, eine Datei, ~50 kB
  ANLEITUNG.md               Handbuch für Käufer
  LIZENZ.txt                 Nutzungslizenz
  beispiel-beleg.json        Ausgefüllter Beispielbeleg

  belegpaket.html            Produkt 2, eine Datei, ~92 kB
  ANLEITUNG-BELEGPAKET.md    Handbuch für Käufer
  LIZENZ-BELEGPAKET.txt      Nutzungslizenz
  beispiel-mahnung.json      Ausgefüllte 2. Mahnung mit Stundenzettel

marketing/        Verkauf
  vermarktung.md             Marktplatzentscheidung, Preis, 30-Tage-Plan, Support
  verkaufsstrategie.md       Woher Verkäufe kommen, Ads-Rechnung, Kennzahlen
  etsy-shop.md               Shop „Papierkramerei": Name, Profil, Richtlinien
  etsy-listing.md            Listing Produkt 1, Feld für Feld
  etsy-listing-belegpaket.md Listing Produkt 2, Feld für Feld
  etsy-listing-bundle.md     Listing für das Komplettpaket
  gestaltung.mjs             Farben, Schriften und Bausteine der Listing-Bilder
  listing-bilder.mjs         Bilder Produkt 1, Banner und Shop-Bild
  listing-bilder-belegpaket.mjs  Bilder Produkt 2 und Bundle
  listing-video.mjs          Listing-Video Produkt 1 (braucht ffmpeg)
  gumroad-lemonsqueezy.md    Zweiter Kanal, später

assets/           Screenshots fürs README
  etsy/                      Listing-Bilder, Video, Banner und Shop-Bild
tests/            Abnahmetests im echten Browser
  abnahme.mjs                Produkt 1, 85 Punkte
  abnahme-belegpaket.mjs     Produkt 2, 155 Punkte
bauen.sh          Erzeugt die auslieferbaren ZIPs
```

---

## Pakete bauen

```bash
./bauen.sh                 # beide Produkte und das Bundle, Version 1.0.0
./bauen.sh 1.1.0           # dasselbe mit eigener Versionsnummer
./bauen.sh belegpaket      # nur Produkt 2
./bauen.sh bundle 1.2.0    # nur das Bundle in Version 1.2.0
```

Das Skript kopiert die Produktdateien zusammen, legt je eine `START HIER.txt`
bei, prüft **jede** HTML-Datei auf externe Verweise und packt alles als ZIP.
Ergebnis: rund 24 kB, 36 kB und 60 kB — schnell heruntergeladen, sofort nutzbar.

Im Bundle liegen zwei Ordner (`Rechnungsgenerator/`, `Belegpaket/`), damit beim
Entpacken nichts durcheinandergerät und jede Anleitung bei ihrem Werkzeug
bleibt.

---

## Tests

```bash
node tests/abnahme.mjs             # Produkt 1: 85 Punkte
node tests/abnahme-belegpaket.mjs  # Produkt 2: 155 Punkte
```

Produkt 1 prüft Rechenwege einschließlich Rundung bei gemischten Steuersätzen,
§ 19 und Reverse-Charge, Fälligkeitsberechnung über Monats- und
Schaltjahresgrenzen, Belegartwechsel, Persistenz, Import/Export, HTML-Escaping,
A4-Maße im Druck, das Verhalten auf 390 px Breite, eigene Mengeneinheiten und
den Betrieb ohne dauerhaften Speicher.

Produkt 2 prüft zusätzlich die Zinsrechnung gegen von Hand nachgerechnete
Werte, den Wechsel zwischen Verbraucher- und Unternehmenszuschlag, alle
Warnungen, die preisfreie Lieferscheinansicht, die Stundenrechnung samt Pausen,
Mitternacht und Wochensummen, die Ableitung der Anrede sowie die Übernahme aus
dem Rechnungsgenerator (inklusive Bruttobetrag über gemischte Steuersätze).

Voraussetzung ist Playwright (`npm install --save-dev playwright`, danach
`npx playwright install chromium`). Nach jeder Änderung an einer Produktdatei
sollte der zugehörige Test grün durchlaufen.

---

## Bilder neu erzeugen

```bash
node marketing/listing-bilder.mjs             # Produkt 1, Banner, Shop-Bild
node marketing/listing-bilder-belegpaket.mjs  # Produkt 2 und Bundle
node marketing/listing-video.mjs              # Video Produkt 1, braucht ffmpeg
```

Die Belege in den Bildern werden nicht nachgebaut, sondern von den Werkzeugen
selbst gerendert. Ändert sich ein Produkt, erzeugt man die Bilder neu und sie
stimmen wieder. Farben, Schriften und Bausteine stehen einmal in
`marketing/gestaltung.mjs`, damit das zweite Produkt nicht nach einem zweiten
Shop aussieht.

---

## Vor dem ersten Verkauf

1. `./bauen.sh` ausführen und beide ZIPs in einem **frischen Browserprofil**
   testen — so, wie ein Käufer sie öffnet.
2. PDF-Export in Chrome, Firefox und Safari prüfen. Im Druckdialog müssen
   **Hintergrundgrafiken** aktiviert sein, sonst fehlt der Rahmen um die
   Zahlungshinweise. Dieser Hinweis steht auch in beiden Anleitungen.
3. **Basiszinssatz prüfen.** Voreingestellt ist der Wert ab 1. Juli 2026
   (1,52 %). Ändert er sich, gehören `produkt/belegpaket.html`
   (`BASISZINS_VOREINSTELLUNG`), die Anleitung, die `START HIER.txt` in
   `bauen.sh` und das Listing angepasst.
4. `marketing/vermarktung.md` durchgehen. Kurzfassung: verkauft wird auf
   **Etsy**, weil dort der Suchverkehr mit Kaufabsicht liegt.
5. Impressum, Widerrufsbelehrung und die Checkbox zum Erlöschen des
   Widerrufsrechts beim Checkout einrichten.

---

## Grenzen der Produkte

Ehrlich benannt, weil es in den Verkaufstexten genauso steht — das spart
Rückfragen und Erstattungen:

* Keine strukturierte E-Rechnung (ZUGFeRD / XRechnung), nur PDF. Für den
  **Empfang** von E-Rechnungen gilt in Deutschland seit 2025 eine Pflicht, für
  das **Ausstellen** laufen gestaffelte Übergangsfristen.
* Keine Überwachung offener Posten, kein DATEV-Export, kein Inkasso und kein
  gerichtlicher Mahnbescheid.
* Eine Mahnung je Beleg, keine Sammelmahnung über mehrere Rechnungen.
* Keine Synchronisierung zwischen Geräten — bewusst so, Übertragung läuft über
  die JSON-Sicherung.
* Arbeitshilfen, keine Steuer- oder Rechtsberatung.

Der naheliegendste nächste Ausbauschritt ist ein GiroCode (QR-Code für
Überweisungen) auf Rechnung und Mahnung. Weitere Ideen in der Reihenfolge ihres
Nutzens stehen am Ende von `marketing/vermarktung.md`.

---

## Lizenz

Der Inhalt von `produkt/` wird unter den Bedingungen in `produkt/LIZENZ.txt`
bzw. `produkt/LIZENZ-BELEGPAKET.txt` an Endkunden ausgeliefert. Dieses
Repository ist die Entwicklungsfassung und nicht zur Weitergabe bestimmt.
