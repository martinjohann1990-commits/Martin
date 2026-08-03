# Übergabe — Stand und nächster Schritt

Diese Datei ist als Einstieg für eine neue Sitzung gedacht. Sie fasst zusammen,
was existiert, welche Entscheidungen bereits gefallen sind und warum — damit
nichts davon neu verhandelt wird.

---

## Der Auftrag

**Ein zweites Produkt bauen: das Vorlagenpaket.** Mahnung,
Auftragsbestätigung, Stundenzettel und Lieferschein — nach demselben Muster wie
der bereits fertige Rechnungsgenerator, als eigenes Etsy-Listing für rund 9 €.

Warum ein zweites Produkt: Ein Shop mit einem einzigen Listing ist schwach.
Jedes weitere Produkt ist ein zusätzlicher Eingang aus der Etsy-Suche und
verkauft an dieselbe Zielgruppe. Der zweite Artikel kostet einen Bruchteil der
Zeit des ersten, weil Aufbau, Gestaltung, Testverfahren und Verkaufstexte schon
stehen.

---

## Was bereits fertig ist

**Repository:** `martinjohann1990-commits/Martin`
**Branch:** `claude/digital-microproduct-gumroad-rgrfwd` — acht Commits, alles
gepusht.

### Produkt 1: Rechnungsgenerator für Kleinunternehmer

`produkt/rechnungsgenerator.html` — eine einzige HTML-Datei, rund 50 kB, ohne
jede externe Abhängigkeit. Doppelklick öffnet sie im Browser.

Kann: Rechnung, Angebot und Stornorechnung; Umsatzsteuer je Satz gruppiert,
gemischte Sätze in einem Beleg; Kleinunternehmerregelung § 19 UStG und
Reverse-Charge § 13b UStG per Häkchen mit automatischen Hinweistexten; Prüfung
der Pflichtangaben nach § 14 UStG; Rabatt; Stammdaten, Kundenliste und eigene
Mengeneinheiten dauerhaft gespeichert; fortlaufende Belegnummern je Jahr und
Belegart; Logo; A4-Live-Vorschau mit Zoom; PDF über den Druckdialog; Sichern
und Laden als JSON.

Dazu: `ANLEITUNG.md` (Käuferhandbuch), `LIZENZ.txt` (Endkundenlizenz),
`beispiel-beleg.json`.

`./bauen.sh` packt daraus `dist/…v1.0.0.zip` (rund 22 kB) und **bricht ab, wenn
die HTML-Datei einen externen Verweis enthält** — das Offline-Versprechen ist
im Build abgesichert.

`node tests/abnahme.mjs` prüft **85 Punkte** im echten Chromium (Playwright).
Läuft grün. Nach jeder Änderung an der Produktdatei ausführen.

### Verkauf

| Datei | Inhalt |
|---|---|
| `marketing/vermarktung.md` | Marktplatzentscheidung, Preis, 30-Tage-Plan |
| `marketing/verkaufsstrategie.md` | Woher Verkäufe kommen, Ads-Rechnung, Kennzahlen |
| `marketing/etsy-shop.md` | Shop „Papierkramerei": Name, Profil, Richtlinien |
| `marketing/etsy-listing.md` | Listing für Produkt 1, Feld für Feld |
| `marketing/gumroad-lemonsqueezy.md` | Zweiter Kanal, später |
| `marketing/listing-bilder.mjs` | Erzeugt Listing-Bilder, Banner, Shop-Bild |
| `marketing/listing-video.mjs` | Nimmt das Listing-Video auf |

In `assets/etsy/` liegen sechs Listing-Bilder (2000 × 2000), das Video
(1080 × 1080, 10,5 s, MP4), Shop-Banner (3200 × 800) und Shop-Bild
(1000 × 1000).

---

## Entscheidungen, die stehen

**Verkauft wird auf Etsy.** Nicht Gumroad, nicht Lemon Squeezy. Begründung:
Die beiden sind Kassensysteme ohne eigene Besucher; Etsy hat Suchverkehr mit
Kaufabsicht. Bei einem ersten Produkt ohne Publikum ist Reichweite die knappe
Ressource, nicht die Gebührenhöhe. Lemon Squeezy kommt als zweiter Kanal dazu,
sobald regelmäßig verkauft wird.

**Shop: Papierkramerei.** Benennt das Problem in den Worten der Kundschaft und
trägt jedes weitere Produkt — deshalb kein Name mit „Rechnung" darin.
Kein „Steuer" oder „Kanzlei" im Namen: Steuerberatung ist nach dem
Steuerberatungsgesetz geschützt.

**Preise:** Produkt 1 startet zu 9,90 € (Einführungspreis, erste zwei Wochen
oder zehn Verkäufe), danach 14,90 €. Deckungsbeitrag rund 12,84 €.
Das Vorlagenpaket ist als **9 €** vorgesehen, das Bundle aus beidem als 19 €.

**Werbung:** Offsite Ads an (Provision nur bei Verkauf), Etsy Ads/Onsite aus
(Klickpreis auch ohne Verkauf). Onsite erst ab fünf Bewertungen, Konversion
über 2 % und wenn Kosten je Verkauf unter dem Deckungsbeitrag bleiben.

**Der Engpass sind Bewertungen**, nicht Reichweite. Ein Listing ohne
Bewertungen wird kaum ausgespielt.

---

## Arbeitsweise, die sich bewährt hat

**Sprache:** Alles auf Deutsch — Code, Kommentare, Bezeichner, Commits,
Dokumentation. Bezeichner wie `beleg`, `positionen`, `stamm`, `zahl()`,
`euro()`, `rendern()`.

**Keine Abhängigkeiten im Produkt.** Kein CDN, keine Schriftart von fremden
Servern, kein Tracking. Der Build prüft das.

**Nichts behaupten, was nicht geprüft ist.** Jede Zahl in den Verkaufstexten
und jede Funktionsbehauptung wurde nachgerechnet oder im Browser getestet.
Etsys Zeichengrenzen (Titel 140, Tags 20, Video 5–15 s) wurden per Skript
geprüft, nicht geschätzt.

**Bilder und Video werden erzeugt, nicht gebaut.** Die Belege darin rendert das
Werkzeug selbst — ändert sich das Produkt, erzeugt man sie neu und sie stimmen
wieder.

**Gestaltungssystem** (für Listing-Bilder, in `listing-bilder.mjs`):

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
Sans** (Fließtext). Beide sind im Container vorhanden. Die Paarung liest sich
nach Beleg und Kanzlei, nicht nach SaaS-Landingpage.

---

## Fallen, die schon Zeit gekostet haben

Diese Fehler sind im Rechnungsgenerator behoben. Wer neuen Code nach demselben
Muster schreibt, sollte sie kennen:

**`localStorage` wirft eine Ausnahme**, sobald der Browser kein dauerhaftes
Speichern erlaubt — privates Fenster, blockierte Website-Daten, eingebetteter
Rahmen. Vier ungeschützte Zugriffe ließen die Seite komplett leer bleiben.
Lösung: die Kapselung `Speicher` im Produkt (prüft einmal, weicht sonst auf den
Arbeitsspeicher aus) und ein sichtbarer Hinweis für den Nutzer. **Diese
Kapselung in neuen Werkzeugen übernehmen.**

**`<input list="…">` mit `datalist` ist unbedienbar** — kein Pfeil, öffnet
nicht beim Klicken, Safari behandelt sie unzuverlässig. Ersetzt durch ein
echtes `<select>` mit dem Eintrag „Andere …", der ein Eingabefeld einblendet;
bestätigte Werte wandern dauerhaft in die Liste.

**`color-scheme: light` auf `:root`** setzen. Sonst rendern Browser im dunklen
Systemmodus Kalender-Popup, Auswahllisten und Scrollleisten dunkel auf heller
Oberfläche.

**Beim Skripten: Felder vor dem Tippen leeren.** `type()` hängt an vorhandene
Werte an. Im Video wurden aus „22 Std. × 95 €" sonst „221 Std. × 950 €" und ein
Gesamtbetrag von 209.950 €.

**Bei quadratischen Videos ist der ganze Editor unlesbar.** Es braucht eine
Kamerafahrt, die die jeweils relevante Stelle formatfüllend zeigt.

**Playwrights mitgeliefertes ffmpeg kann nur VP8** und hat keinen MP4-Muxer.
Etsy nimmt kein WebM. Deshalb `npm install ffmpeg-static` und den Pfad über
`FFMPEG` setzen.

**Für den PDF-Export müssen „Hintergrundgrafiken" im Druckdialog aktiv sein**,
sonst fehlt der Rahmen um die Zahlungshinweise. Steht so in der Anleitung.

---

## Vorschlag für das Vorlagenpaket

Zur Diskussion, nicht als Vorgabe.

**Form:** eine einzige HTML-Datei `belegpaket.html`, aufgebaut wie der
Rechnungsgenerator — Formular links, A4-Live-Vorschau rechts, PDF über den
Druckdialog, Speicherung im localStorage über dieselbe `Speicher`-Kapselung.
Kein gemeinsamer Unterbau mit Produkt 1: Käufer sollen das Paket unabhängig
nutzen können, und zwei eigenständige Dateien sind einfacher auszuliefern als
eine gemeinsame Bibliothek.

**Belegarten:**

| Beleg | Besonderheit |
|---|---|
| Zahlungserinnerung | freundlicher Ton, keine Gebühr |
| 1. Mahnung | Bezug auf Rechnungsnummer und Fälligkeit, neue Frist |
| 2. Mahnung | Mahngebühr, Verzugszinsen, Hinweis auf weitere Schritte |
| Auftragsbestätigung | Leistungsumfang, Termin, Preis |
| Lieferschein | Positionen ohne Preise |
| Stundenzettel | Datum, Tätigkeit, Stunden, Summe je Zeitraum |

**Fachliches, das geprüft werden muss** (nicht aus dem Gedächtnis behaupten):
Verzugszinsen liegen bei Geschäften ohne Verbraucherbeteiligung höher als bei
Verbrauchern; die Höhe hängt vom Basiszinssatz ab und ändert sich halbjährlich.
Der Basiszinssatz gehört als Eingabefeld ins Werkzeug, nicht fest in den Code.
Mahngebühren dürfen nur die tatsächlichen Kosten decken. **Im Zweifel als
Eingabefeld lösen und in der Anleitung auf den Steuerberater verweisen** — so
wie es Produkt 1 hält.

**Wiederverwenden:** Stammdaten, Kundenliste und die Empfänger-Logik sind
identisch. Sinnvoll wäre, dass das Belegpaket die JSON-Sicherung des
Rechnungsgenerators **einlesen kann** — dann trägt niemand seine Daten zweimal
ein. Das ist zugleich ein gutes Verkaufsargument für das Bundle.

**Nicht vergessen:** eigener Abnahmetest nach dem Muster von
`tests/abnahme.mjs`, eigene Listing-Bilder über eine Erweiterung von
`listing-bilder.mjs`, eigenes Etsy-Listing nach dem Muster von
`etsy-listing.md`, und `bauen.sh` so erweitern, dass es beide Pakete und das
Bundle bauen kann.

---

## Offene Punkte aus Produkt 1

- **Safari ist ungetestet.** Im Container gibt es nur Chromium. Der PDF-Export
  sollte vor dem ersten Verkauf einmal in Safari und Firefox geprüft werden.
- **Das Datumsfeld zeigt sein Format nach der Browsersprache** (bei englischem
  Browser `08/03/2026`). Natives Verhalten, nicht überschreibbar. Auf dem Beleg
  steht immer das deutsche Format — die Ausgabe ist also korrekt.
- **GiroCode** (QR-Code für Überweisungen) ist der naheliegendste Ausbau von
  Produkt 1 und würde eine Preiserhöhung auf 19 € tragen. Bewusst nicht
  gebaut, weil ein selbstgeschriebener QR-Encoder ohne verlässliche Prüfung ein
  Risiko auf einem Beleg wäre, der Geld bewegt.
- **Die ZIP liegt nicht im Repository** (`.gitignore`), sie wird mit
  `./bauen.sh` erzeugt.
