# Niche AI Recommendation & Deal Finder

Ein extrem schlanker Affiliate-MVP: interaktiver Produkt-Finder (3 Fragen → Top-3-Empfehlung)
plus automatisch generierte SEO-Landingpages nach dem Muster `/best-[category]-for-[target]`.

**Tech-Stack:** Next.js 15 (App Router, Server Components) · TypeScript · Tailwind CSS ·
shadcn-UI-Konventionen · Vercel Analytics · JSON-Datenquelle (kein Backend, keine Datenbank).

**Kennzahlen des Builds:** 19 statische Landingpages, ~102 kB First-Load-JS, alle Seiten
werden zur Build-Zeit vorgerendert (SSG) und vom CDN ausgeliefert.

---

## 1. Schnellstart

```bash
npm install
cp .env.example .env.local   # Partner-IDs eintragen
npm run dev                  # http://localhost:3000
```

Weitere Skripte:

```bash
npm run build      # Produktions-Build inkl. Generierung aller SEO-Seiten
npm run start      # Produktions-Server lokal starten
npm run typecheck  # TypeScript prüfen
```

---

## 2. Projektstruktur

```
app/
  layout.tsx              Grundgerüst, globale Metadaten, Analytics
  page.tsx                Startseite: Hero + Finder + Trust + FAQ + interne Links
  [slug]/page.tsx         Programmatische Landingpages (/best-laptops-for-students)
  ratgeber/page.tsx       Übersicht aller generierten Landingpages
  sitemap.ts robots.ts    Automatische sitemap.xml und robots.txt
components/
  finder.tsx              3-Schritt-Finder (Client, rechnet ohne API im Browser)
  product-card.tsx        Produktkarte mit Sternen, Pro/Contra, Match-Score, CTA
  affiliate-link.tsx      ZENTRALER Wrapper für alle Affiliate-Links
  ui/                     Button, Card, Badge (shadcn-Konventionen)
data/
  products.json           Produkt-Datenbank  ← hier pflegst du Produkte
  taxonomy.json           Kategorien + Zielgruppen ← steuert die SEO-Seiten
lib/
  affiliate.ts            URL-Anreicherung: Partner-ID, Sub-ID, UTM
  offers.ts               Mehrere Händler je Produkt + Auswahl des CTA-Angebots
  analytics.ts            Tracking-Events (Vercel Analytics + dataLayer)
  recommend.ts            Scoring-Engine (Bewertung × Eignung × Budget)
  landing-pages.ts        Erzeugt/parst die Slugs der SEO-Seiten
  content.ts              Redaktionelle Textbausteine je Kategorie
  schema.ts               JSON-LD (Product, AggregateRating, FAQ, Breadcrumbs)
  site.ts                 Name, Domain, Claim, Werbehinweis
```

---

## 3. Affiliate-Links austauschen (das Wichtigste)

### 3.1 Partner-IDs setzen

Alle Partner-IDs kommen aus Umgebungsvariablen – **im Code steht keine einzige ID**.
Lokal in `.env.local`, in Produktion in den Vercel-Projekteinstellungen:

| Variable                  | Netzwerk               | Beispiel        |
| ------------------------- | ---------------------- | --------------- |
| `NEXT_PUBLIC_AMAZON_TAG`  | Amazon PartnerNet      | `deintag-21`    |
| `NEXT_PUBLIC_AWIN_ID`     | Awin                   | `123456`        |
| `NEXT_PUBLIC_PARTNER_ID`  | Impact / Digistore24   | `abc123`        |
| `NEXT_PUBLIC_SITE_URL`    | eigene Domain          | `https://…`     |
| `NEXT_PUBLIC_UTM_SOURCE`  | Wert für `utm_source`  | `deal-finder`   |

> **Wichtig:** `NEXT_PUBLIC_*`-Variablen werden beim **Build** in die Seiten eingebacken.
> Nach einer Änderung in Vercel also einmal *Redeploy* auslösen, sonst greift der alte Wert.

### 3.2 Ziel-URLs der Produkte eintragen

In `data/products.json` pro Produkt nur zwei Felder anfassen:

```jsonc
{
  "affiliateUrl": "https://www.amazon.de/dp/B0XXXXXXX", // Roh-URL OHNE Tracking-Parameter
  "network": "amazon"                                   // amazon | awin | impact | digistore24
}
```

Alles Weitere passiert automatisch in `lib/affiliate.ts`:

- Partner-ID wird ergänzt (`tag`, `awinaffid`, `irpid`, `aff` – je nach Netzwerk)
- Sub-ID wird gesetzt (`ascsubtag`, `clickref`, `subId1`, `cid`), Format:
  `placement-produktid-posN` → du siehst im Netzwerk-Report exakt, **welche Seite und
  welcher Slot** die Provision gebracht hat
- UTM-Parameter (`utm_source`, `utm_medium=affiliate`, `utm_campaign`, `utm_content`)
- Attribute `rel="sponsored nofollow noopener noreferrer"` und `target="_blank"`

Ergebnis-Link in der Praxis:

```
https://www.amazon.de/dp/B0XXXXXXX
  ?tag=deintag-21
  &ascsubtag=landing-best-laptops-for-students-lap-001-pos1
  &utm_source=deal-finder&utm_medium=affiliate
  &utm_campaign=landing-best-laptops-for-students&utm_content=aerobook-14-air
```

### 3.3 Mehrere Händler pro Produkt (Umsatz-Hebel)

Dasselbe Gerät liegt meist bei mehreren Händlern – mit sehr unterschiedlicher
Provision. Amazon zahlt auf Elektronik ca. 1 %, ein Awin-Programm oft 3–6 %.
Deshalb kann jedes Produkt beliebig viele Zusatz-Angebote haben:

```jsonc
{
  "price": 1099,                                        // Haupt-Angebot
  "affiliateUrl": "https://www.amazon.de/dp/B0XXXXXXX",
  "network": "amazon",
  "offers": [                                           // weitere Händler
    {
      "merchant": "Cyberport",
      "network": "awin",
      "url": "https://www.awin1.com/cread.php?awinmid=1001&ued=…",
      "price": 1079,
      "commissionRate": 3.5,      // Prozent; sonst Standard aus lib/offers.ts
      "commissionCap": 10,        // optional: Deckelung pro Verkauf in EUR
      "note": "Versandkostenfrei" // optional
    }
  ]
}
```

**So wählt die Seite den CTA (`lib/offers.ts`):**

1. Alle Angebote werden nach Preis sortiert – das ist der Preisvergleich, den
   der Nutzer auf der Karte sieht.
2. Für den großen Button wird daraus das Angebot mit der **höchsten erwarteten
   Provision** gewählt (`Preis × Rate`, ggf. gedeckelt) …
3. … aber **nur** unter den Angeboten, die maximal `MAX_PRICE_DELTA` (Standard
   3 %) über dem Bestpreis liegen.

Punkt 3 ist Absicht: ohne diese Schranke würde die Seite Nutzer systematisch
zum teureren Händler schicken. Das kostet Vertrauen — und langfristig mehr,
als die höhere Provision einbringt. Wer aggressiver monetarisieren will, dreht
`MAX_PRICE_DELTA` hoch; wer immer den Bestpreis verlinken will, setzt ihn auf `0`.

Beispiel aus den Beispieldaten (CampusLite 14): Amazon 549 € (1 % → 5,49 €),
Cyberport 559 € (4 % → 22,36 €). Preisabstand 1,8 %, also innerhalb der Schranke
→ CTA geht zu Cyberport, der günstigere Amazon-Preis steht sichtbar darunter.
**Vervierfachte erwartete Provision bei identischem Klick.**

Angezeigter Preis und Ziel des Links sind dabei immer identisch — auch in der
Schnellübersicht und der Vergleichstabelle.

Die Provisions-Standardwerte je Netzwerk stehen in `DEFAULT_COMMISSION_RATE`
(`lib/offers.ts`) und sind bewusst konservativ. Trag dort deine echten Sätze ein,
sobald du die Programme freigeschaltet hast.

### 3.4 Neues Netzwerk ergänzen

In `lib/affiliate.ts` drei Zeilen erweitern (`partnerIds`, `partnerParam`, `subIdParam`)
und den Typ `AffiliateNetwork` in `lib/types.ts` ergänzen – TypeScript zeigt dir alle
Stellen, die noch fehlen.

> **Amazon-Regel:** Preise dürfen nicht dauerhaft statisch angezeigt werden. Deshalb steht
> unter jedem Preis der Hinweis „Richtpreis – Tagespreis prüfen“. Bitte beibehalten.

---

## 4. Produkte und SEO-Seiten pflegen

### 4.1 Produkt hinzufügen

Neuen Eintrag in `data/products.json` anlegen:

```jsonc
{
  "id": "lap-005",                       // eindeutig, wird im Tracking verwendet
  "name": "Beispiel Notebook 15",
  "slug": "beispiel-notebook-15",
  "category": "laptops",                 // muss zu taxonomy.json passen
  "brand": "Beispiel",
  "price": 899,
  "rating": 4.6,                         // 0–5
  "reviewCount": 1200,
  "affiliateUrl": "https://www.amazon.de/dp/B0XXXXXXX",
  "network": "amazon",
  "summary": "Ein Satz, der den USP auf den Punkt bringt.",
  "pros": ["Vorteil 1", "Vorteil 2", "Vorteil 3"],
  "cons": ["Nachteil 1", "Nachteil 2"],
  "bestForTags": ["students", "home-office"],  // muss zu taxonomy.json passen
  "highlight": "Preis-Leistungs-Sieger",       // optional
  "accent": "from-sky-500 to-indigo-600"       // Tailwind-Gradient der Karte
}
```

`npm run build` – die neue Empfehlung erscheint sofort im Finder, auf allen passenden
Landingpages und in der Sitemap.

### 4.2 Neue Kategorie oder Zielgruppe = neue SEO-Seiten

`data/taxonomy.json` erweitern. Aus **Kategorie × Zielgruppe** entsteht automatisch
`/best-[category]-for-[target]`, sobald **mindestens 2 Produkte** die Kombination abdecken
(Schwelle: `MIN_PRODUCTS_PER_PAGE` in `lib/landing-pages.ts`).

Beispiel: Kategorie `webcams` + Zielgruppe `home-office` + 2 passende Produkte
→ `/best-webcams-for-home-office` inklusive Metadaten, JSON-LD, Sitemap-Eintrag und
interner Verlinkung.

Für neue Kategorien zusätzlich Kaufkriterien in `lib/content.ts` ergänzen
(`criteriaByCategory`) – das hält die Seiten aus SEO-Sicht einzigartig.

---

## 5. Tracking

`lib/analytics.ts` bündelt alle Events und schickt sie an Vercel Analytics **und**
– falls vorhanden – an `window.dataLayer` (Google Tag Manager).

| Event             | Wann                          | Nutzen                                    |
| ----------------- | ----------------------------- | ----------------------------------------- |
| `finder_start`    | erste Interaktion im Finder   | Startrate der wichtigsten Komponente      |
| `finder_step`     | jede beantwortete Frage       | zeigt, an welcher Frage Nutzer abspringen |
| `finder_complete` | Ergebnis wurde ausgeliefert   | Completion Rate                           |
| `affiliate_click` | Klick auf einen Werbe-Link    | **die Umsatzkennzahl** (inkl. Placement)  |

Das Event `affiliate_click` enthält neben Produkt und Placement auch `merchant`,
`commission_rate`, `expected_payout` und `is_primary`. Damit siehst du im
Dashboard nicht nur Klicks, sondern den **erwarteten Umsatz je Placement** –
und ob die Nutzer den provisionsstarken CTA oder den günstigeren Alternativlink
nehmen.

Weiteres Ziel (GA4, Plausible, eigenes Backend) anbinden: nur die Funktion `sendEvent`
in `lib/analytics.ts` erweitern – alle Events laufen dort durch.

---

## 6. Deployment auf Vercel

1. Repository zu GitHub pushen.
2. Auf [vercel.com](https://vercel.com) → **Add New → Project** → Repository importieren.
   Framework-Preset „Next.js“ wird automatisch erkannt, Build-Command `npm run build`.
3. **Environment Variables** setzen (Werte aus `.env.example`) – für *Production*,
   *Preview* und *Development*:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_AMAZON_TAG`, ggf. weitere Partner-IDs.
4. **Deploy** klicken.
5. Eigene Domain unter **Settings → Domains** verbinden und dann
   `NEXT_PUBLIC_SITE_URL` auf genau diese Domain setzen (ohne Slash am Ende) →
   danach **Redeploy**, damit Canonicals, OpenGraph und Sitemap stimmen.
6. **Analytics** im Vercel-Dashboard aktivieren (Tab „Analytics“). Das Paket
   `@vercel/analytics` ist bereits eingebunden.

### Nach dem Go-Live

- `https://deine-domain.de/sitemap.xml` in der **Google Search Console** einreichen.
- Rechtstexte ergänzen: Impressum, Datenschutz. Der Werbehinweis nach § 5a Abs. 4 UWG
  steht bereits im Footer und auf jeder Landingpage (`lib/site.ts` → `affiliateDisclosure`).
- Amazon PartnerNet: Der Pflichthinweis zur Teilnahme am Partnerprogramm gehört in den
  Footer-Text in `lib/site.ts`.

---

## 7. Warum das Setup konvertiert

- **Zero Friction:** kein Login, kein Newsletter, kein Cookie-Banner-Zwang. Das Ergebnis
  steht nach drei Klicks.
- **Genau 3 Empfehlungen:** mehr Auswahl senkt nachweislich die Entscheidungsrate.
- **Trust-Elemente:** Sterne-Bewertungen, „Verifizierte Empfehlung“, Nachteile werden
  offen genannt, Prüfdatum und Werbehinweis sind sichtbar.
- **Speed:** statisches HTML vom CDN, keine externen Bilder oder Web-Fonts,
  keine API-Calls zwischen den Finder-Schritten.
- **Programmatic SEO:** jede Kategorie-Zielgruppen-Kombination ist eine eigene Landingpage
  mit Kaufabsicht-Keyword, Schema.org-Markup und interner Verlinkung.
