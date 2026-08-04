# Umsetzungsplan: vom MVP zum ersten Cashflow

Stand: August 2026 · Branch `claude/niche-ai-recommendation-mvp-gdy1gd`

Der Code steht, die Rechtsseiten stehen, und die Kategorie **Monitore** ist mit acht
echten Geräten gefüllt. Was jetzt fehlt, ist **kein Code**: deine Impressumsdaten, eine
Domain, die Partner-IDs und Traffic. Diese Datei ist die Reihenfolge,
in der du das abarbeitest — mit den konkreten Befehlen, Dateien und Abbruchkriterien.

**Realistische Erwartung vorweg:** Phase 0 bis 2 sind 2–4 Arbeitstage. Der erste Umsatz
kommt frühestens, wenn Google die Seiten rankt — bei einer neuen Domain sind das
**3 bis 6 Monate**. Wer schneller Geld sehen will, braucht eine bestehende Traffic-Quelle
(Newsletter, YouTube-Kanal, Community). Bezahlter Traffic auf Amazon-Links ist seit
14. April 2026 verboten.

---

## Phase 0 — Live gehen (ca. 90 Minuten)

Ziel: Die Seite ist unter deiner Domain erreichbar und rechtlich sauber. Ohne das kannst
du dich bei keinem Partnerprogramm bewerben.

### 0.1 Projekt lokal starten

```bash
git clone <dein-repo-url> dealfinder
cd dealfinder
git checkout claude/niche-ai-recommendation-mvp-gdy1gd
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

**Fertig, wenn:** Der Finder liefert dir lokal drei Empfehlungen.

### 0.2 Domain wählen und kaufen

Kriterien, in dieser Reihenfolge:

1. **`.de`** — deutsche Zielgruppe, deutsche Domain. Vertrauensfaktor.
2. **Nischenbezug statt Marke**: `tech-empfehlung.de` schlägt `martinsdeals.de`. Der
   Domainname ist ein Rankingsignal-Rest und vor allem ein Vertrauenssignal.
3. **Kein Exact-Match-Keyword-Spam**: `beste-laptops-fuer-studenten.de` wirkt wie eine
   Wegwerf-Affiliate-Seite und begrenzt dich auf eine Kategorie.
4. Kurz, sprechbar, keine Bindestrich-Ketten.

Kaufen bei einem beliebigen Registrar (INWX, Netcup, Namecheap). Kosten: ~10 €/Jahr.

### 0.3 Auf Vercel deployen

1. [vercel.com](https://vercel.com) → **Add New → Project** → Repository importieren.
2. Framework-Preset „Next.js" wird erkannt, nichts ändern.
3. **Environment Variables** (für Production, Preview *und* Development):

   | Variable | Wert |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://deine-domain.de` (ohne Slash am Ende) |
   | `NEXT_PUBLIC_AMAZON_TAG` | erst nach 0.6 — vorher leer lassen |
   | `NEXT_PUBLIC_UTM_SOURCE` | `deal-finder` |

4. **Deploy**.
5. **Settings → Domains** → deine Domain eintragen, DNS beim Registrar nach Vercels
   Anweisung setzen (meist ein A-Record und ein CNAME für `www`).
6. **Settings → Analytics** aktivieren.

> **Merksatz:** `NEXT_PUBLIC_*` wird beim **Build** eingebacken. Jede Änderung an diesen
> Variablen braucht danach ein **Redeploy**, sonst ist der alte Wert noch drin.

**Fertig, wenn:** `https://deine-domain.de/best-monitors-for-home-office` lädt und
`https://deine-domain.de/sitemap.xml` deine Domain enthält (nicht `deine-domain.de`).

### 0.4 Impressum und Datenschutzerklärung — Pflicht, nicht optional

Die Seiten `/impressum`, `/datenschutz` und `/ueber-uns` sind **fertig gebaut** und im
Footer verlinkt. Sie lesen alle persönlichen Angaben aus **einer** Datei:

```bash
# data/owner.json öffnen und jeden Wert in eckigen Klammern ersetzen:
#   name, street, zip, city, email   (Pflicht)
#   phone, vatId, companyForm        (optional)
npm run check:launch    # sagt dir, was noch fehlt
```

Solange Platzhalter drinstehen, zeigen die drei Seiten einen roten Warnhinweis — auch in
Produktion. Das ist Absicht: Eine Seite mit unvollständigem Impressum darf nicht
unbemerkt online stehen.

**Zwei Dinge musst du selbst prüfen:**

1. Die Texte sind ein sorgfältig gebautes Gerüst für den hier vorliegenden Fall
   (Affiliate-Seite, Vercel-Hosting, cookielose Analyse, kein Formular, kein Konto) —
   **aber keine Rechtsberatung**. Gleiche sie mit einem Generator (e-recht24.de,
   datenschutz-generator.de) ab oder lass sie prüfen, bevor du live gehst.
2. Sobald du etwas ergänzt, das Daten verarbeitet — Kontaktformular, Newsletter,
   Google Analytics, Werbepixel, eingebettete Videos — musst du die
   Datenschutzerklärung erweitern und brauchst je nach Dienst eine Einwilligung.

**Cookie-Banner:** Aktuell brauchst du keinen. Vercel Analytics arbeitet cookielos, und
die Cookies der Händler werden erst *auf deren Seite* nach dem Klick gesetzt. Sobald du
Google Analytics oder Werbepixel einbaust, ändert sich das sofort.

**Werbekennzeichnung:** Steht bereits im Footer und auf jeder Landingpage
(`lib/site.ts` → `affiliateDisclosure`). Nicht entfernen.

### 0.5 Über uns / Redaktion (starkes Trust-Signal)

`/ueber-uns` steht bereits inklusive redaktioneller Grundsätze und Finanzierungshinweis.
Was du selbst schreiben musst, ist der Absatz zu deinem Hintergrund in
`app/ueber-uns/page.tsx` (im Code markiert). Zwei bis drei Sätze: wer du bist, warum
ausgerechnet diese Produktkategorie, seit wann. Genau diesen Teil bewertet Google unter
E-E-A-T und genau den liest Awin bei der Freischaltung. `npm run check:launch` erinnert
dich daran, solange der Platzhaltertext drinsteht.

### 0.6 Amazon PartnerNet anmelden

1. [partnernet.amazon.de](https://partnernet.amazon.de) → Anmeldung mit deiner Domain.
2. Tracking-ID (Format `deinname-21`) in Vercel als `NEXT_PUBLIC_AMAZON_TAG` eintragen
   → **Redeploy**.
3. Prüfen: Rechtsklick auf einen CTA → der Link muss `?tag=deinname-21` enthalten.

**Die 180-Tage-Regel:** Amazon verlangt **drei qualifizierte Verkäufe** innerhalb von
180 Tagen nach der Anmeldung, sonst wird das Konto geschlossen. Käufe über eigene Links
zählen nicht und sind verboten. **Deshalb meldest du dich erst an, wenn Phase 1 fertig
ist und die Seite echte Produkte zeigt** — nicht vorher.

---

## Phase 1 — Echte Produktdaten

### 1.1 Erledigt: Kategorie Monitore mit acht echten Geräten

`data/products.json` enthält keine Platzhalter mehr, sondern acht real erhältliche
Monitore. `data/taxonomy.json` ist auf die Kategorie **Monitore** und fünf Zielgruppen
reduziert; daraus entstehen fünf Landingpages.

Warum Monitore: objektiv vergleichbare Kennzahlen (Größe, Auflösung, Bildrate, Panel),
eine Kaufentscheidung, die sich in einem Absatz begründen lässt, ein mittlerer bis hoher
Warenkorb (170–705 €) und eine saubere Zuordnung zu Zielgruppen — Home-Office, Gaming und
Kreativarbeit stellen völlig unterschiedliche Anforderungen an dasselbe Produkt.

**Preise: Stand August 2026**, recherchiert über deutsche Preisvergleiche. Sie sind als
Richtwerte gedacht — die Karten schreiben „Tagespreis prüfen" dazu.

### 1.2 Was du noch selbst eintragen musst

Zwei Dinge kann nur jemand mit Amazon-Zugang erledigen:

1. **ASINs.** Die `affiliateUrl` zeigt aktuell auf eine Amazon-Suche nach dem exakten
   Modellnamen. Das funktioniert und ist über PartnerNet vergütungsfähig, konvertiert aber
   schlechter als ein direkter Produktlink. Ersetze sie nach und nach durch
   `https://www.amazon.de/dp/<ASIN>` — die ASIN steht auf der Produktseite unter
   „Produktinformationen". `npm run check:launch` listet dir alle offenen Links auf.
2. **Kundenbewertungen.** Das Feld `reviewCount` ist bewusst leer. Trag es nur ein, wenn
   du den Wert wirklich nachgeschlagen hast — nur dann gibt die Seite
   AggregateRating-Markup aus. Erfundene Bewertungszahlen sind ein Verstoß gegen Googles
   Richtlinien für strukturierte Daten und können zur Abwertung führen.

Das Feld `rating` ist die **redaktionelle Note der Seite**, keine Kundenbewertung. Sie
wird als `Review` mit dir als Autor ausgezeichnet und auf den Karten als
„Redaktionswertung" beschriftet. Geh die acht Noten durch und passe sie an deine eigene
Einschätzung an — es ist deine Empfehlung, die dort steht.

### 1.3 Auswahl erweitern

Die Landingpage `/best-monitors-for-beginners` hat erst drei Produkte. Sinnvolle
Ergänzungen: ein Büro-Monitor unter 200 €, ein 4K-Modell um 300 € und ein Ultrawide.
Jedes weitere Produkt verteilt sich über `bestForTags` automatisch auf die passenden
Seiten.

Feld-für-Feld-Vorlage:

| Feld | Woher |
|---|---|
| `name`, `brand` | Herstellerseite, exakte Modellbezeichnung inklusive Kürzel |
| `slug` | kleingeschrieben mit Bindestrichen, muss eindeutig sein |
| `affiliateUrl` | Amazon-Produktseite, auf `/dp/<ASIN>` gekürzt |
| `price` | Straßenpreis am Tag der Recherche (Preisvergleich, nicht UVP) |
| `rating` | deine redaktionelle Note von 0 bis 5 |
| `summary` | ein Satz, der den Kaufgrund trifft |
| `pros` / `cons` | 3 und 2 — **die Nachteile sind der Trust-Faktor** |
| `bestForTags` | nur Zielgruppen, für die das Gerät wirklich die richtige Wahl ist |

**Harte Regel:** Nichts erfinden. Ein falscher Preis oder eine erfundene Bewertung ist
wettbewerbsrechtlich angreifbar und zerstört genau das Vertrauen, von dem das
Geschäftsmodell lebt.

Nach jeder Änderung:

```bash
npm run check:launch
npm run build
```

Und `lastReviewedAt` in `lib/site.ts` mitziehen.

## Phase 2 — Zweitanbieter für bessere Provisionen (1 Tag)

Amazon zahlt auf Elektronik rund 1 %. Über Awin sind 3–6 % üblich. Der Code kann seit
dem Mehr-Händler-Update beides gleichzeitig — du musst nur die Programme haben.

### 2.1 Bei Awin bewerben

1. [awin.com](https://www.awin.com) → Publisher-Anmeldung. Einmalig 5 € Gebühr, die dir
   nach der ersten Auszahlung gutgeschrieben wird.
2. Freischaltung dauert wenige Tage — sie schauen sich deine Seite an. **Deshalb erst
   nach Phase 1 bewerben**, mit echten Inhalten, Impressum und Über-uns-Seite.
3. Nach der Freischaltung bei den passenden Programmen einzeln bewerben. Für Tech in
   Deutschland typischerweise: Cyberport, notebooksbilliger, Alternate, Otto, Conrad,
   Teufel. Rechne damit, dass ein Teil ablehnt, solange du keinen Traffic vorweist.

### 2.2 Deeplinks eintragen

Für jedes freigeschaltete Programm holst du dir im Awin-Interface den Deeplink zum
konkreten Produkt und ergänzt ihn in `data/products.json`:

```jsonc
"offers": [
  {
    "merchant": "Cyberport",
    "network": "awin",
    "url": "https://www.awin1.com/cread.php?awinmid=1234&ued=<produkt-url-encodiert>",
    "price": 339,
    "commissionRate": 5      // deinen echten Satz aus dem Awin-Programm eintragen
  }
]
```

Danach in `lib/offers.ts` die Werte in `DEFAULT_COMMISSION_RATE` auf deine tatsächlichen
Sätze korrigieren. Und `NEXT_PUBLIC_AWIN_ID` in Vercel setzen → Redeploy.

**Fertig, wenn:** Auf mindestens der Hälfte der Produktkarten steht unter dem Button ein
Preisvergleich mit einem zweiten Händler.

---

## Phase 3 — Indexierung und Content-Tiefe (1 Tag + laufend)

### 3.1 Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console) →
   Property für deine Domain anlegen, per DNS-TXT-Record verifizieren.
2. `https://deine-domain.de/sitemap.xml` unter **Sitemaps** einreichen.
3. Die drei wichtigsten Landingpages zusätzlich über **URL-Prüfung → Indexierung
   beantragen** einzeln anstoßen.

### 3.2 Rich Results prüfen

[search.google.com/test/rich-results](https://search.google.com/test/rich-results) mit
einer Landingpage-URL füttern. Erwartet: `Product`, `AggregateOffer`, `AggregateRating`,
`FAQPage` und `BreadcrumbList` ohne Fehler. Warnungen zu optionalen Feldern sind okay.

### 3.3 Content-Tiefe — der Punkt, an dem programmatische Seiten scheitern

Googles Helpful-Content-Bewertung trifft genau das Muster „viele Seiten aus einer
Vorlage". Der Schutz dagegen ist Text, den es nur bei dir gibt:

- **Pro Kategorie** die Kaufkriterien in `lib/content.ts` (`criteriaByCategory`) auf
  deine eigenen Formulierungen umschreiben — nicht die Beispieltexte stehen lassen.
- **Drei bis fünf Landingpages manuell vertiefen**: eigener Einleitungstext, konkrete
  Erfahrungswerte, ein Absatz „für wen sich das *nicht* lohnt".
- Erst wenn diese Seiten ranken, weitere Kombinationen freischalten. Lieber 8 starke
  Seiten als 40 dünne.

### 3.4 Interne Verlinkung

Steht schon: Footer, `/ratgeber`, verwandte Seiten am Fuß jeder Landingpage. Wenn du
Kategorien ergänzt, prüfe, dass jede neue Seite von mindestens zwei anderen Seiten
verlinkt ist.

---

## Phase 4 — Traffic (laufend, der langsame Teil)

**Was erlaubt ist:** SEO, eigener Newsletter, eigener YouTube-/Social-Kanal mit Verweis
auf die Seite, Foren-Beiträge, in denen du wirklich hilfst.

**Was seit April 2026 verboten ist:** bezahlte Werbung, die auf Amazon-Partnerlinks
führt. Also keine Google Ads, keine Meta Ads auf die Landingpages, solange dort
Amazon-Links stehen.

Sinnvolle Reihenfolge:

1. **Longtail-Keywords bedienen.** Deine Seiten zielen auf „beste X für Y" — genau da
   ist die Konkurrenz am geringsten und die Kaufabsicht am höchsten.
2. **Ein Kanal, nicht fünf.** Such dir eine Plattform, auf der deine Zielgruppe ohnehin
   fragt (Reddit, ein Fachforum, YouTube), und sei dort ehrlich hilfreich.
3. **Geduld einplanen.** Neue Domains ranken langsam. Vor Monat 3 ist die Search Console
   deine einzige verlässliche Rückmeldung: Impressionen vor Klicks vor Umsatz.

---

## Phase 5 — Messen und optimieren (ab Traffic)

Alles Nötige wird bereits getrackt. In Vercel Analytics → Events schaust du auf:

| Kennzahl | Was sie dir sagt | Wenn sie schlecht ist |
|---|---|---|
| `finder_start` / Besucher | Wird der Finder überhaupt benutzt? | Hero-Text und CTA-Position ändern |
| `finder_complete` / `finder_start` | Bricht jemand mittendrin ab? | `finder_step` zeigt, bei welcher Frage |
| `affiliate_click` / `finder_complete` | Überzeugen die Empfehlungen? | Produktauswahl und Pro/Contra überarbeiten |
| Summe `expected_payout` | Erwarteter Umsatz je Placement | zeigt, welche Seite Geld bringt |
| `is_primary` | Nehmen Nutzer den provisionsstarken CTA oder den Sparlink? | `MAX_PRICE_DELTA` in `lib/offers.ts` justieren |

Vergleiche das monatlich mit den echten Zahlen aus PartnerNet und Awin. Die Differenz
zwischen `expected_payout` und tatsächlicher Gutschrift ist deine Konversionsrate beim
Händler — die kannst du nicht beeinflussen, aber du solltest sie kennen.

**Erste Optimierung, sobald ~500 Klicks Datenbasis da sind:** die Reihenfolge der
Zielgruppen-Frage, der CTA-Text („Preis prüfen" vs. „Zum Angebot") und die Anzahl der
angezeigten Produkte (3 vs. 5).

---

## Phase 6 — Ausbau (wenn Phase 1–5 laufen)

In dieser Reihenfolge, jeweils erst wenn die Stufe davor Umsatz zeigt:

1. **Zweite Kategorie** nach demselben Muster wie Phase 1.
2. **Preise automatisieren.** Amazons Product Advertising API wird nach drei
   qualifizierten Verkäufen freigeschaltet; Awin bietet Produkt-Feeds. Damit ersetzt du
   die manuelle Preispflege durch einen nächtlichen Cron-Job, der `data/products.json`
   aktualisiert und ein Redeploy auslöst.
3. **Preisverlauf** je Produkt speichern und „aktuell 12 % unter dem Ø der letzten
   90 Tage" anzeigen — der stärkste Conversion-Hebel in dieser Nische.
4. **Digitales Zusatzprodukt** (Digistore24): ein Kurs oder E-Book, das zur Zielgruppe
   passt. 40 % von 97 € schlagen 1 % von 1.099 €.
5. **Newsletter** als traffic-unabhängiger Kanal — erst sinnvoll, wenn regelmäßig
   Besucher kommen.

---

## Kurzcheck vor dem Livegang

Das meiste davon prüft das Skript für dich:

```bash
npm run check:launch     # Exit-Code 1, solange etwas fehlt
```

Es deckt ab: Platzhalter-URLs, Betreiberangaben, doppelte IDs/Slugs, ungültige Links,
fehlende Nachteile, unbekannte Kategorien/Zielgruppen, zu dünne Landingpages, fehlende
Umgebungsvariablen und ein veraltetes Prüfdatum.

Von Hand bleibt:

```
[ ] Rechtstexte mit einem Generator abgeglichen oder anwaltlich geprüft
[ ] Absatz zum eigenen Hintergrund in app/ueber-uns/page.tsx geschrieben
[ ] NEXT_PUBLIC_SITE_URL in Vercel gesetzt → Redeploy ausgelöst
[ ] Partner-ID im Link sichtbar (Rechtsklick auf einen CTA → Adresse kopieren)
[ ] sitemap.xml in der Google Search Console eingereicht
[ ] Rich-Results-Test ohne Fehler
[ ] OG-Bild geprüft: /opengraph-image im Browser öffnen
```
