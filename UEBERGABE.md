# Übergabe — Stand und nächster Schritt

Diese Datei ist als Einstieg für eine neue Sitzung gedacht. Sie fasst zusammen,
was existiert, welche Entscheidungen bereits gefallen sind und warum — damit
nichts davon neu verhandelt wird.

---

## Stand

**Zwei Produkte sind fertig und getestet.** Der Auftrag der letzten Sitzung —
ein zweites Produkt bauen — ist erledigt. Was jetzt fehlt, ist der Verkauf:
Shop eröffnen, drei Listings einstellen, erste Bewertungen holen.

**Repository:** `martinjohann1990-commits/Martin`
**Branch:** `claude/zweites-produkt-950ce5`

---

## Produkt 1: Rechnungsgenerator für Kleinunternehmer

`produkt/rechnungsgenerator.html` — eine einzige HTML-Datei, rund 50 kB, ohne
jede externe Abhängigkeit. Doppelklick öffnet sie im Browser.

Kann: Rechnung, Angebot und Stornorechnung; Umsatzsteuer je Satz gruppiert,
gemischte Sätze in einem Beleg; Kleinunternehmerregelung § 19 UStG und
Reverse-Charge § 13b UStG per Häkchen mit automatischen Hinweistexten; Prüfung
der Pflichtangaben nach § 14 UStG; Rabatt; Stammdaten, Kundenliste und eigene
Mengeneinheiten dauerhaft gespeichert; fortlaufende Belegnummern je Jahr und
Belegart; Logo; A4-Live-Vorschau mit Zoom; PDF über den Druckdialog; Sichern
und Laden als JSON.

Dazu: `ANLEITUNG.md`, `LIZENZ.txt`, `beispiel-beleg.json`.
Test: `node tests/abnahme.mjs` — **85 Punkte**, läuft grün.

## Produkt 2: Belegpaket

`produkt/belegpaket.html` — eine einzige HTML-Datei, rund 92 kB, ebenfalls ohne
externe Abhängigkeiten, nach demselben Muster gebaut.

Sechs Belegarten: Zahlungserinnerung, 1. Mahnung, 2. Mahnung,
Auftragsbestätigung, Lieferschein, Stundenzettel. Das Formular blendet je
Belegart die passenden Karten ein.

Besonderheiten gegenüber Produkt 1:

* **Verzugsrechner.** Zinsen nach § 288 BGB, taggenau vom Verzugsbeginn bis zum
  Belegdatum, 365 Tage im Jahr. Zuschlag 5 Prozentpunkte gegenüber Verbrauchern,
  9 bei Entgeltforderungen ohne Verbraucherbeteiligung, oder frei wählbar.
  Mahngebühr und Verzugspauschale von 40 € (§ 288 Abs. 5 BGB).
* **Der Basiszinssatz ist ein Eingabefeld**, kein fester Wert. Voreingestellt
  1,52 % — Bekanntgabe der Bundesbank zum 1. Juli 2026. Er ändert sich zum
  1. Januar und 1. Juli; Werkzeug, Anleitung und `START HIER.txt` fordern zur
  Prüfung auf. Konstante: `BASISZINS_VOREINSTELLUNG`.
* **Warnungen statt stiller Fehler.** Mahngebühr über ~7,50 €; Verzugspauschale
  gegenüber einem Verbraucher; Verzugsbeginn nach dem Belegdatum; Fälligkeit
  vor dem Rechnungsdatum; Überzahlung.
* **Übernahme aus dem Rechnungsgenerator.** Knopf „Rechnung übernehmen" liest
  dessen JSON-Sicherung: Stammdaten, Kundenliste, Empfänger, Rechnungsnummer,
  Rechnungsdatum, Fälligkeit (Datum + Zahlungsziel), Bruttobetrag (mit
  demselben Rechenweg, also Rabatt, gemischte Sätze, § 19, Reverse-Charge),
  Verzugsbeginn als Folgetag und die Positionen. Das ist das Verkaufsargument
  für das Bundle.
* **Stundenzettel** mit Von-bis-Zeiten abzüglich Pause, Nachtschicht über
  Mitternacht, Summen je ISO-Kalenderwoche, optional Stundensatz und USt.
* **Anrede** wird aus dem Empfängernamen gebildet („Frau Dr. Erika Muster" →
  „Sehr geehrte Frau Dr. Muster,"), ein eigenes Feld überschreibt sie.

Dazu: `ANLEITUNG-BELEGPAKET.md`, `LIZENZ-BELEGPAKET.txt`,
`beispiel-mahnung.json`.
Test: `node tests/abnahme-belegpaket.mjs` — **155 Punkte**, läuft grün.

## Build

`./bauen.sh` baut beide Produkte **und** das Bundle. Einzeln:
`./bauen.sh belegpaket`, `./bauen.sh bundle 1.2.0`. Eine reine Zahl wird als
Version gelesen, alles andere als Auswahl.

Jede HTML-Datei wird auf externe Verweise geprüft; der Build bricht ab, wenn
sich einer eingeschlichen hat. Das Offline-Versprechen ist damit abgesichert.

---

## Verkauf

| Datei | Inhalt |
|---|---|
| `marketing/vermarktung.md` | Marktplatzentscheidung, Preis, 30-Tage-Plan |
| `marketing/verkaufsstrategie.md` | Woher Verkäufe kommen, Ads-Rechnung, Kennzahlen |
| `marketing/etsy-shop.md` | Shop „Papierkramerei": Name, Profil, Richtlinien |
| `marketing/etsy-listing.md` | Listing Produkt 1 |
| `marketing/etsy-listing-belegpaket.md` | Listing Produkt 2 |
| `marketing/etsy-listing-bundle.md` | Listing Komplettpaket |
| `marketing/gestaltung.mjs` | Farben, Schriften, Bausteine der Bildtafeln |
| `marketing/listing-bilder.mjs` | Bilder Produkt 1, Banner, Shop-Bild |
| `marketing/listing-bilder-belegpaket.mjs` | Bilder Produkt 2 und Bundle |
| `marketing/listing-video.mjs` | Listing-Video Produkt 1 |

In `assets/etsy/` liegen alle Bilder (2000 × 2000): `01`–`06` für Produkt 1,
`b1`–`b6` für Produkt 2, `bundle-1`/`bundle-2` fürs Set, dazu das Video
(1080 × 1080, 10,5 s, MP4), Shop-Banner (3200 × 800) und Shop-Bild
(1000 × 1000).

---

## Entscheidungen, die stehen

**Verkauft wird auf Etsy.** Nicht Gumroad, nicht Lemon Squeezy. Begründung:
Die beiden sind Kassensysteme ohne eigene Besucher; Etsy hat Suchverkehr mit
Kaufabsicht. Bei einem Shop ohne Publikum ist Reichweite die knappe Ressource,
nicht die Gebührenhöhe. Lemon Squeezy kommt als zweiter Kanal dazu, sobald
regelmäßig verkauft wird.

**Shop: Papierkramerei.** Benennt das Problem in den Worten der Kundschaft und
trägt jedes weitere Produkt. Kein „Steuer" oder „Kanzlei" im Namen:
Steuerberatung ist nach dem Steuerberatungsgesetz geschützt.

**Preise:** Produkt 1 startet zu 9,90 € (Einführungspreis, erste zwei Wochen
oder zehn Verkäufe), danach 14,90 €. Belegpaket **9 €** ohne Einführungspreis —
es zieht Besucher aus dem bestehenden Shop mit. Bundle **19 €** gegenüber
23,90 € einzeln. Deckungsbeiträge: 12,84 € / 7,57 € / 16,51 €.

**Werbung:** Offsite Ads an (Provision nur bei Verkauf), Etsy Ads/Onsite aus
(Klickpreis auch ohne Verkauf). Onsite erst ab fünf Bewertungen, Konversion
über 2 % und wenn Kosten je Verkauf unter dem Deckungsbeitrag bleiben.

**Der Engpass sind Bewertungen**, nicht Reichweite. Ein Listing ohne
Bewertungen wird kaum ausgespielt. Drei Listings teilen sich die Bewertungen
nicht — aber alle drei profitieren von der Shop-Reputation.

**Zwei eigenständige Dateien, kein gemeinsamer Unterbau.** Käufer sollen jedes
Produkt unabhängig nutzen können, und zwei Einzeldateien sind einfacher
auszuliefern als eine gemeinsame Bibliothek. Der Preis dafür ist bewusst
doppelter Code (Speicher-Kapselung, Formularbindung, Zoom, Druck-CSS). Geteilt
wird nur, was den Käufer nicht erreicht: `marketing/gestaltung.mjs`.

---

## Arbeitsweise, die sich bewährt hat

**Sprache:** Alles auf Deutsch — Code, Kommentare, Bezeichner, Commits,
Dokumentation. Bezeichner wie `beleg`, `positionen`, `stamm`, `zahl()`,
`euro()`, `rendern()`.

**Keine Abhängigkeiten im Produkt.** Kein CDN, keine Schriftart von fremden
Servern, kein Tracking. Der Build prüft das.

**Nichts behaupten, was nicht geprüft ist.** Jede Zahl in den Verkaufstexten
und jede Funktionsbehauptung wurde nachgerechnet oder im Browser getestet.
Etsys Zeichengrenzen und die Zinssätze wurden per Skript bzw. Recherche
geprüft, nicht geschätzt.

**Rechtliche Grenzen gehören ins Werkzeug, nicht nur in die Anleitung.** Der
Nutzer sieht die Warnung in dem Moment, in dem er den Fehler macht.

**Bilder und Video werden erzeugt, nicht gebaut.** Die Belege darin rendert das
Werkzeug selbst — ändert sich das Produkt, erzeugt man sie neu und sie stimmen
wieder.

**Gestaltungssystem** (in `marketing/gestaltung.mjs`):

```
--tinte:#121826   Nahezu Schwarz mit Blaustich
--grund:#E8ECF3   Kühles Papiergrau
--papier:#FFFFFF
--akzent:#2F6FEB  Die Farbe aus dem Werkzeug
--siegel:#0F7B4F  Bestätigung, getrennt vom Akzent
--linie:#C2CBDA
--gedaempft:#5A6478
```

Schriften: **Bitstream Charter** (Serife, Überschriften) und **Liberation
Sans** (Fließtext). Beide sind im Container vorhanden.

---

## Fallen, die schon Zeit gekostet haben

Wer neuen Code nach demselben Muster schreibt, sollte sie kennen:

**`localStorage` wirft eine Ausnahme**, sobald der Browser kein dauerhaftes
Speichern erlaubt — privates Fenster, blockierte Website-Daten, eingebetteter
Rahmen. Lösung: die Kapselung `Speicher` (prüft einmal, weicht sonst auf den
Arbeitsspeicher aus) und ein sichtbarer Hinweis. **In beiden Produkten drin,
in neuen Werkzeugen übernehmen.**

**`<input list="…">` mit `datalist` ist unbedienbar.** Ersetzt durch ein echtes
`<select>` mit dem Eintrag „Andere …", der ein Eingabefeld einblendet.

**`color-scheme: light` auf `:root`** setzen. Sonst rendern Browser im dunklen
Systemmodus Kalender-Popup, Auswahllisten und Scrollleisten dunkel auf heller
Oberfläche.

**Datumsfelder zeigen ihr Format nach der Browsersprache**, nicht nach der
Seitensprache. Weder `locale` noch `--lang=de-DE` ändern das zuverlässig. Für
Listing-Bilder wird das Feld deshalb vor dem Screenshot auf `type="text"` mit
deutschem Datum umgestellt — Käufer mit deutschem Browser sehen genau das.

**Beim Skripten: Felder vor dem Tippen leeren.** `type()` hängt an vorhandene
Werte an; `fill()` ersetzt.

**Playwright stolpert über ausgeblendete Felder.** Der Lieferschein hat keine
Preisspalte — ein `fill()` darauf läuft in den Timeout. Vor dem Ausfüllen
`isVisible()` prüfen.

**Bei quadratischen Videos ist der ganze Editor unlesbar.** Es braucht eine
Kamerafahrt, die die jeweils relevante Stelle formatfüllend zeigt.

**Playwrights mitgeliefertes ffmpeg kann nur VP8** und hat keinen MP4-Muxer.
Etsy nimmt kein WebM. Deshalb `npm install ffmpeg-static` und den Pfad über
`FFMPEG` setzen.

**Für den PDF-Export müssen „Hintergrundgrafiken" im Druckdialog aktiv sein**,
sonst fehlt der Rahmen um die Zahlungshinweise. Steht so in beiden Anleitungen.

---

## Der nächste Schritt

**Verkaufen, nicht bauen.** Es gibt jetzt drei Listings und kein einziges
Publikum. Reihenfolge:

1. Etsy-Shop „Papierkramerei" nach `marketing/etsy-shop.md` eröffnen.
2. `./bauen.sh` ausführen, alle drei ZIPs in einem frischen Browserprofil
   testen.
3. Listings einstellen — Produkt 1 zuerst, dann Bundle, dann Belegpaket.
4. Impressum, Widerrufsbelehrung und die Checkbox zum Erlöschen des
   Widerrufsrechts einrichten.
5. Nach zwei Wochen Zahlen ansehen: viele Impressionen ohne Besuche heißt
   Bild 1 tauschen, viele Besuche ohne Käufe heißt Beschreibung oder Preis.

---

## Offene Punkte

* **Safari und Firefox sind ungetestet.** Im Container gibt es nur Chromium.
  Der PDF-Export beider Produkte sollte vor dem ersten Verkauf einmal in beiden
  Browsern geprüft werden.
* **Kein Video für Produkt 2.** `listing-video.mjs` nimmt bisher nur den
  Rechnungsgenerator auf. Etsy bevorzugt Listings mit Video — der lohnendste
  kleine Ausbau. Ablauf für die Aufnahme: Rechnung übernehmen → Zinsen
  erscheinen → fertige Mahnung.
* **Basiszinssatz altert.** Zum 1. Januar und 1. Juli prüfen. Betroffen sind
  `produkt/belegpaket.html`, `produkt/ANLEITUNG-BELEGPAKET.md`,
  `produkt/LIZENZ-BELEGPAKET.txt`, die `START HIER.txt` in `bauen.sh`, das
  Listing und die erwarteten Werte im Abnahmetest.
* **GiroCode** (QR-Code für Überweisungen) ist der naheliegendste Ausbau und
  würde auf Rechnung *und* Mahnung passen. Bewusst nicht gebaut, weil ein
  selbstgeschriebener QR-Encoder ohne verlässliche Prüfung ein Risiko auf einem
  Beleg wäre, der Geld bewegt.
* **Das Datumsfeld zeigt sein Format nach der Browsersprache** (bei englischem
  Browser `08/03/2026`). Natives Verhalten, nicht überschreibbar. Auf dem Beleg
  steht immer das deutsche Format — die Ausgabe ist also korrekt.
* **Die ZIPs liegen nicht im Repository** (`.gitignore`), sie werden mit
  `./bauen.sh` erzeugt.
