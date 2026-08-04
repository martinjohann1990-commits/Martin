# Livegang-Anleitung

Diese Datei ist dein Runbook: jeder Schritt in der Reihenfolge, in der du ihn ausführst,
mit Befehl, Erwartung und einer Prüfung am Ende. Arbeite sie von oben nach unten ab.

**Gesamtaufwand:** rund 3 Stunden aktive Arbeit, verteilt auf 2 bis 3 Tage
(dazwischen liegen Wartezeiten: DNS-Umstellung, Freischaltung bei Amazon).

**Was du brauchst:**

- einen Rechner mit Terminal (macOS, Linux oder Windows mit PowerShell)
- deinen GitHub-Zugang
- eine Kreditkarte oder PayPal für die Domain (10–15 € pro Jahr)
- deine ladungsfähige Anschrift für das Impressum (Postfach reicht nicht)
- ein Bankkonto und deine Steuer-ID für die Anmeldung bei Amazon PartnerNet

---

## Schritt 1 — Projekt auf deinem Rechner starten

**Dauer:** 15 Minuten · **Ziel:** Der Finder läuft lokal in deinem Browser.

### 1.1 Node.js installieren

Prüfe zuerst, ob du es schon hast:

```bash
node --version
```

Erscheint eine Zahl ab `v20`, bist du fertig. Sonst lade dir die **LTS-Version** von
[nodejs.org](https://nodejs.org) und installiere sie mit den Standardeinstellungen.

### 1.2 Projekt herunterladen

```bash
git clone https://github.com/martinjohann1990-commits/Martin.git dealfinder
cd dealfinder
git checkout claude/niche-ai-recommendation-mvp-gdy1gd
npm install
```

`npm install` lädt die Abhängigkeiten und dauert ein bis zwei Minuten.

### 1.3 Starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

> **Prüfung:** Klick den Finder durch — Monitore → Home-Office → Ausgewogen. Es müssen
> drei Produktkarten mit Match-Score erscheinen.

**Wenn etwas klemmt:**

| Meldung | Ursache und Lösung |
|---|---|
| `command not found: node` | Node ist nicht installiert oder das Terminal muss neu geöffnet werden. |
| `Port 3000 is already in use` | Anderes Programm belegt den Port: `npm run dev -- -p 3001`. |
| `EACCES` beim Installieren | Ohne `sudo` arbeiten; das Projekt gehört in dein Benutzerverzeichnis. |

Den Server stoppst du mit `Strg + C`. Lass ihn für die nächsten Schritte ruhig laufen und
öffne ein zweites Terminalfenster.

---

## Schritt 2 — Deine Daten eintragen

**Dauer:** 25 Minuten · **Ziel:** `npm run check:launch` meldet null Fehler.

### 2.1 Impressumsdaten

Öffne `data/owner.json` in einem Texteditor und ersetze **jeden Wert in eckigen
Klammern**:

```jsonc
{
  "name": "Max Mustermann",             // dein vollständiger Name
  "street": "Musterstraße 12",          // Straße und Hausnummer
  "zip": "10115",
  "city": "Berlin",
  "country": "Deutschland",
  "email": "kontakt@deine-domain.de",   // vorerst deine private Adresse, später die eigene
  "phone": "",                          // darf leer bleiben
  "vatId": "",                          // nur ausfüllen, wenn du eine USt-IdNr. hast
  "companyForm": "",                    // nur bei GmbH, UG o. Ä.
  "kleinunternehmer": true              // auf false setzen, wenn du Umsatzsteuer ausweist
}
```

Die eckigen Klammern müssen weg — sie sind das Erkennungszeichen für „noch nicht
ausgefüllt".

### 2.2 Absatz über dich schreiben

Öffne `app/ueber-uns/page.tsx` und suche nach `Ergänze hier zwei bis drei Sätze`.
Ersetze diesen Satz durch deinen eigenen Text. Zwei bis drei Sätze reichen — aber sie
müssen echt sein. Google bewertet diesen Teil unter E-E-A-T, und Awin liest ihn bei der
Freischaltung.

Als Muster, an dem du dich entlanghangeln kannst:

> „Ich arbeite seit acht Jahren täglich acht Stunden am Bildschirm und habe in der Zeit
> mehr Monitore auf- und wieder abgebaut, als mir lieb ist. Diese Seite ist die Abkürzung,
> die ich mir damals gewünscht hätte: keine Bestenliste mit 40 Geräten, sondern drei
> Fragen und eine Empfehlung, die zum eigenen Schreibtisch passt."

Was in den Text gehört: dein Bezug zum Thema, seit wann, und warum ausgerechnet Monitore.
Was nicht hineingehört: erfundene Testlabore, erfundene Jahre, erfundene Zertifikate.

### 2.3 Name der Seite festlegen

Der Name steht aktuell auf „DealFinder AI". Wenn du einen eigenen willst — was ich
empfehle, sobald du deine Domain hast — änderst du ihn an genau einer Stelle in
`lib/site.ts`:

```ts
export const siteConfig = {
  name: "Monitor-Berater",              // erscheint in Kopf, Fuß, Titel und OG-Bild
  shortName: "Monitor-Berater",
  claim: "Finde in 30 Sekunden den richtigen Monitor",
  ...
```

### 2.4 Prüfen

```bash
npm run check:launch
```

> **Prüfung:** Am Ende muss stehen „Keine Fehler". Die verbleibenden Hinweise zu
> `NEXT_PUBLIC_*` und den Amazon-Links sind an dieser Stelle normal — die erledigen
> Schritt 5 und 7.

---

## Schritt 3 — Domain kaufen

**Dauer:** 15 Minuten · **Ziel:** Die Domain gehört dir.

### 3.1 Namen finden

Kriterien in dieser Reihenfolge:

1. **`.de`** — deutsche Zielgruppe, deutsche Endung. Vertrauensfaktor.
2. **Themenbezug, aber nicht zu eng.** Der Name soll erkennen lassen, worum es geht, dich
   aber nicht auf eine Kategorie festnageln, falls du später erweiterst.
3. **Kein Keyword-Spam.** `beste-monitore-guenstig-kaufen.de` liest sich wie eine
   Wegwerfseite und schadet dem Vertrauen mehr, als der Name je an SEO einbringt.
4. **Kurz und sprechbar.** Am Telefon vorlesbar, ohne buchstabieren zu müssen.

Ideen für diese Nische: `monitorberater.de`, `bildschirmwahl.de`, `richtiger-monitor.de`,
`schreibtisch-setup.de` (letzterer ließe später Tastaturen, Stühle und Zubehör zu).

### 3.2 Kaufen

Bei einem beliebigen Registrar — [INWX](https://www.inwx.de),
[Netcup](https://www.netcup.de) oder [Namecheap](https://www.namecheap.com). Kosten für
`.de`: etwa 10 € pro Jahr. Du brauchst noch kein Hosting- oder E-Mail-Paket.

> **Prüfung:** Die Domain erscheint in der Übersicht deines Registrar-Kontos.

### 3.3 Namen im Code nachziehen

Wenn du dich in 2.3 noch nicht entschieden hattest: jetzt `lib/site.ts` anpassen.

---

## Schritt 4 — Änderungen auf GitHub bringen

**Dauer:** 10 Minuten · **Ziel:** Dein Stand liegt im Hauptbranch.

```bash
git add -A
git commit -m "Betreiberdaten und Seitenname eingetragen"
git push -u origin claude/niche-ai-recommendation-mvp-gdy1gd
```

Danach den Branch in `main` überführen — das ist der Stand, den Vercel später als
Produktion ausliefert:

1. Auf GitHub das Repository öffnen.
2. GitHub schlägt oben einen Pull Request für den gepushten Branch vor — auf
   **Compare & pull request** klicken.
3. Titel eintragen, **Create pull request**, dann **Merge pull request**.

> **Prüfung:** Im Branch `main` liegen jetzt unter anderem `data/owner.json` mit deinen
> Daten und der Ordner `app/`.

**Achtung:** Ab jetzt liegen deine Anschrift und deine E-Mail-Adresse in einem
öffentlichen Repository — genau wie später im Impressum, wo sie ohnehin öffentlich sein
müssen. Willst du das nicht, stell das Repository auf GitHub unter
**Settings → General → Change visibility** auf *privat*, bevor du pushst. Vercel kann auch
private Repositories deployen.

---

## Schritt 5 — Auf Vercel veröffentlichen

**Dauer:** 25 Minuten plus Wartezeit für DNS · **Ziel:** Die Seite ist unter deiner Domain
erreichbar.

### 5.1 Projekt importieren

1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Konto anmelden (Hobby-Plan,
   kostenlos).
2. **Add New → Project** → dein Repository auswählen → **Import**.
3. Framework-Preset zeigt „Next.js". Nichts ändern.

### 5.2 Umgebungsvariablen setzen

Noch **vor** dem ersten Deploy, im Abschnitt **Environment Variables**:

| Name | Wert |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://deine-domain.de` — ohne Schrägstrich am Ende |
| `NEXT_PUBLIC_UTM_SOURCE` | `deal-finder` |

`NEXT_PUBLIC_AMAZON_TAG` lässt du vorerst weg, die Tracking-ID hast du noch nicht.

Dann **Deploy** klicken. Der erste Build dauert ein bis zwei Minuten.

> **Prüfung:** Vercel zeigt „Congratulations" und eine Adresse auf `*.vercel.app`. Öffne
> sie — die Seite muss laden und der Finder funktionieren.

### 5.3 Domain verbinden

1. Im Projekt auf **Settings → Domains** → deine Domain eintragen → **Add**.
2. Vercel zeigt dir jetzt die DNS-Einträge an, die du beim Registrar hinterlegen musst —
   in der Regel ein A-Record für die Hauptdomain und ein CNAME für `www`. **Nimm die
   Werte aus dem Vercel-Dialog**, nicht aus irgendeiner Anleitung: sie unterscheiden sich
   je nach Konfiguration.
3. Beim Registrar in die DNS-Verwaltung wechseln und die Einträge genau so anlegen.
4. Warten. Meist ist es nach 10 bis 30 Minuten aktiv, in Einzelfällen dauert es bis zu
   24 Stunden. Vercel zeigt einen grünen Haken, sobald es steht, und stellt das
   SSL-Zertifikat automatisch aus.

### 5.4 Analytics aktivieren

Im Projekt auf den Reiter **Analytics** → aktivieren. Das Paket ist im Code bereits
eingebunden, es fehlt nur die Freischaltung.

> **Prüfung:** `https://deine-domain.de` lädt mit Schloss-Symbol im Browser.

---

## Schritt 6 — Kontrolle der Live-Seite

**Dauer:** 15 Minuten · **Ziel:** Alles ist erreichbar und stimmt.

Ruf diese Adressen nacheinander auf (`deine-domain.de` ersetzen):

```
https://deine-domain.de/
https://deine-domain.de/ratgeber
https://deine-domain.de/best-monitors-for-home-office
https://deine-domain.de/best-monitors-for-gamers
https://deine-domain.de/best-monitors-for-creators
https://deine-domain.de/best-monitors-for-students
https://deine-domain.de/best-monitors-for-beginners
https://deine-domain.de/impressum
https://deine-domain.de/datenschutz
https://deine-domain.de/ueber-uns
https://deine-domain.de/sitemap.xml
https://deine-domain.de/robots.txt
https://deine-domain.de/opengraph-image
```

Checkliste dabei:

- [ ] Auf `/impressum` steht **kein roter Warnkasten** mehr, sondern dein Name und deine
      Anschrift.
- [ ] In `sitemap.xml` steht deine Domain — nicht `deine-domain.de`. Steht dort noch der
      Platzhalter, war `NEXT_PUBLIC_SITE_URL` beim Build nicht gesetzt: Variable in Vercel
      korrigieren und unter **Deployments → … → Redeploy** neu bauen lassen.
- [ ] `/opengraph-image` zeigt ein blaues Vorschaubild mit deinem Seitennamen.
- [ ] Die Seite einmal auf dem Handy öffnen und den Finder durchklicken.

Zum Schluss den [Rich-Results-Test](https://search.google.com/test/rich-results) mit einer
Landingpage-Adresse füttern. Erwartet werden `Product`, `Review`, `AggregateOffer`,
`FAQPage` und `BreadcrumbList` ohne Fehler. Warnungen zu optionalen Feldern sind in
Ordnung.

---

## Schritt 7 — Amazon PartnerNet

**Dauer:** 30 Minuten · **Ziel:** Deine Links verdienen Geld.

> **Zeitpunkt beachten:** Melde dich erst jetzt an — nicht früher. Amazon verlangt **drei
> qualifizierte Verkäufe innerhalb von 180 Tagen** nach der Anmeldung, sonst wird das
> Konto geschlossen. Die Frist läuft ab Anmeldung, nicht ab deinem ersten Besucher.

### 7.1 Anmelden

1. [partnernet.amazon.de](https://partnernet.amazon.de) → **Jetzt kostenlos anmelden**.
2. Im Formular deine Website angeben: `https://deine-domain.de`.
3. Beschreiben, worum es geht — zum Beispiel: „Kaufberatung für Monitore mit
   interaktivem Produktfinder, redaktionell erstellte Empfehlungen nach Einsatzzweck."
4. Themen und Traffic-Quelle angeben (SEO/organische Suche).
5. Steuerdaten und Bankverbindung hinterlegen.

Die Freischaltung erfolgt meist sofort, gelegentlich nach manueller Prüfung binnen
24 Stunden.

### 7.2 Tracking-ID eintragen

Deine ID hat das Format `deinname-21`.

1. In Vercel: **Settings → Environment Variables** → `NEXT_PUBLIC_AMAZON_TAG` mit diesem
   Wert anlegen.
2. **Deployments → oberster Eintrag → ⋯ → Redeploy.** Ohne diesen Schritt greift die ID
   nicht: Variablen mit `NEXT_PUBLIC_` werden beim Build fest in die Seiten eingebaut.

> **Prüfung:** Auf einer Landingpage mit der rechten Maustaste auf einen grünen Button →
> **Linkadresse kopieren** → in einen Editor einfügen. In der Adresse muss
> `tag=deinname-21` stehen.

### 7.3 Von Suchlinks auf Produktlinks umstellen

Die neun Produkte verweisen aktuell auf eine Amazon-Suche nach dem exakten Modellnamen.
Das funktioniert und wird vergütet, konvertiert aber schlechter als ein direkter Link.

Pro Produkt:

1. Bei Amazon nach dem Modell suchen, die richtige Variante öffnen.
2. Auf der Produktseite unter **Produktinformationen** die **ASIN** heraussuchen
   (zehnstellig, beginnt meist mit `B0`).
3. In `data/products.json` die `affiliateUrl` ersetzen:

   ```jsonc
   "affiliateUrl": "https://www.amazon.de/dp/B0XXXXXXXXX"
   ```

4. Bei der Gelegenheit den Preis gegen den aktuellen Straßenpreis abgleichen.

Danach:

```bash
npm run check:launch     # es darf kein Hinweis auf Suchlinks mehr kommen
npm run build
git add -A && git commit -m "Produktlinks auf ASINs umgestellt" && git push
```

Vercel baut nach dem Push automatisch neu.

---

## Schritt 8 — Bei Google anmelden

**Dauer:** 15 Minuten · **Ziel:** Google kennt deine Seiten.

1. [Google Search Console](https://search.google.com/search-console) öffnen →
   **Property hinzufügen** → **Domain** → deine Domain eintragen.
2. Google zeigt einen TXT-Eintrag. Den beim Registrar in der DNS-Verwaltung anlegen, dann
   auf **Bestätigen** klicken. Kann ein paar Minuten dauern.
3. Links auf **Sitemaps** → `sitemap.xml` eintragen → **Senden**.
4. Oben in die URL-Prüfung nacheinander deine fünf Landingpages eingeben und jeweils
   **Indexierung beantragen** klicken.

> **Prüfung:** Unter „Sitemaps" steht „Erfolgreich" mit der Anzahl der gefundenen URLs.

Nach ein bis zwei Wochen zeigt die Search Console erste Impressionen. Klicks kommen
später. Sichtbare Positionen dauern bei einer neuen Domain **drei bis sechs Monate** —
das ist normal und kein Zeichen dafür, dass etwas falsch läuft.

---

## Schritt 9 — Zweitanbieter über Awin

**Dauer:** 30 Minuten · **Zeitpunkt:** ein bis zwei Wochen nach dem Livegang.

Warte damit, bis die Seite ein paar Tage steht und indexiert wird — Awin schaut sich deine
Seite manuell an, und eine Ablehnung kostet dich Wochen.

1. Auf [awin.com](https://www.awin.com) als Publisher anmelden. Einmalig 5 € Gebühr, die
   nach der ersten Auszahlung gutgeschrieben wird.
2. Nach der Freischaltung bei passenden Programmen einzeln bewerben. Für Monitore:
   Cyberport, notebooksbilliger, Alternate, Otto, Conrad.
3. Für jedes freigeschaltete Programm im Awin-Interface den Deeplink zum konkreten Produkt
   holen und in `data/products.json` ergänzen:

   ```jsonc
   "offers": [
     {
       "merchant": "Cyberport",
       "network": "awin",
       "url": "<Deeplink aus dem Awin-Interface>",
       "price": 389,
       "commissionRate": 4          // dein tatsächlicher Satz aus dem Programm
     }
   ]
   ```

4. `NEXT_PUBLIC_AWIN_ID` in Vercel setzen → Redeploy.

Der große Button zeigt danach automatisch auf das Angebot mit der höchsten erwarteten
Provision — solange es preislich nicht mehr als drei Prozent über dem Bestpreis liegt.
Details dazu in der README, Abschnitt 3.3.

---

## Danach: die Routine

| Rhythmus | Aufgabe |
|---|---|
| wöchentlich | Search Console öffnen: Impressionen, Klicks, Fehler. |
| alle 2 Wochen | Preise der neun Produkte gegenprüfen, `lastReviewedAt` in `lib/site.ts` aktualisieren. |
| monatlich | Vercel Analytics: Wie viele starten den Finder, wie viele klicken auf einen Händler? Summe `expected_payout` mit der echten Gutschrift im Partnernetzwerk vergleichen. |
| bei Bedarf | Neue Produkte ergänzen, veraltete austauschen. Nach jeder Änderung `npm run check:launch`. |

---

## Was du nicht tun solltest

- **Nicht über eigene Links kaufen.** Amazon schließt dafür Konten. Die drei
  qualifizierten Verkäufe müssen von echten Besuchern kommen.
- **Keine bezahlte Werbung auf Amazon-Links.** Seit 14. April 2026 untersagt — betrifft
  Google Ads und Meta Ads auf deine Landingpages, solange dort Amazon-Links stehen.
- **Keine Preise oder Bewertungen erfinden.** Wettbewerbsrechtlich angreifbar, und bei
  erfundenen Bewertungszahlen im Markup wertet Google die Seite ab.
- **Nicht sofort neue Kategorien aufmachen.** Erst wenn Monitore ranken, lohnt die zweite
  Kategorie. Zehn halbe Kategorien ranken nirgends.
- **Den Werbehinweis nicht entfernen.** Er steht im Footer und auf jeder Landingpage und
  ist nach § 5a Abs. 4 UWG Pflicht.

---

## Wenn etwas nicht klappt

| Symptom | Ursache | Lösung |
|---|---|---|
| Roter Kasten auf `/impressum` | `data/owner.json` unvollständig | Felder ausfüllen, committen, pushen |
| Sitemap enthält `deine-domain.de` | `NEXT_PUBLIC_SITE_URL` fehlte beim Build | Variable setzen, **Redeploy** |
| Links ohne `tag=` | `NEXT_PUBLIC_AMAZON_TAG` fehlte beim Build | Variable setzen, **Redeploy** |
| Domain lädt nicht | DNS noch nicht übernommen | bis 24 h warten, Einträge gegen den Vercel-Dialog prüfen |
| Build schlägt auf Vercel fehl | meist ein Tippfehler im JSON | lokal `npm run build` ausführen, Meldung lesen |
| Änderung nicht sichtbar | Push fehlt oder Build läuft noch | in Vercel unter **Deployments** den Status prüfen |

Grundregel bei allem, was mit Umgebungsvariablen zu tun hat: **Variablen mit
`NEXT_PUBLIC_` wirken erst nach einem neuen Build.** Ändern allein reicht nie.
