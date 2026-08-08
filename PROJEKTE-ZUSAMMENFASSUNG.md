# Projektübersicht — Grundlage für ein Consulting-Konzept

Stand: 8. August 2026 · Repository `martinjohann1990-commits/Martin`

Dieses Dokument fasst alle bisher entstandenen Code-Projekte so zusammen, dass es
**als Eingabe für Claude oder Gemini** taugt: Es benennt, was gebaut wurde, mit
welchen Mitteln, in welchem Umfang — und was sich davon als Referenz zeigen lässt.
Ein fertiger Prompt-Block steht am Ende (Abschnitt 7).

Alle Angaben stammen aus dem Repository selbst (Commits, Dateien, Dokumentation).
Was sich daraus **nicht** belegen lässt, steht in Abschnitt 6 offen ausgewiesen —
das ist wichtig, weil ein Consulting-Angebot nur so viel behaupten darf, wie es
zeigen kann.

---

## 1. Überblick

Sechs Branches, fünf eigenständige Projekte (zwei Branches gehören zum selben
Vorhaben). Entstanden zwischen dem 3. und 8. August 2026 — also in sechs Tagen.

| # | Projekt | Art | Technik | Code (Zeilen) | Doku (Zeilen) | Commits | Vertriebsreif |
|---|---|---|---|---|---|---|---|
| 1 | **Papierkramerei** — Rechnungsgenerator + Belegpaket | Digitale Mikroprodukte für Etsy | HTML/CSS/JS, eine Datei, offline | ~5.700 | ~2.900 | 22 bzw. 17 | ja — Listings, Bilder, Video, Rechtstexte fertig |
| 2 | **FlowStock** — Cashflow- & Bestands-Dashboard | Digitales Produkt für Etsy | HTML/JS-SPA, modular gebaut, offline | ~6.400 | ~860 | 1 | ja — Listings DE/EN, Lizenz, Anleitungen fertig |
| 3 | **kleinanzeigen-tool** | KI-Werkzeug, lokal | Python 3.10+, Gemini/Claude-API, Playwright | ~4.200 | ~360 | 13 | nein — internes/eigenes Werkzeug |
| 4 | **Niche AI Recommendation & Deal Finder** | Affiliate-Website (MVP) | Next.js 15, TypeScript, Tailwind, Vercel | ~4.000 | ~1.100 | 7 | ja — Livegang-Runbook fertig |
| 5 | **Intervall-Timer** | Kleine Web-App | HTML/CSS/JS, GitHub Pages | ~570 | 0 | 3 | nein — Fingerübung |

**Gesamt: rund 21.000 Zeilen Code und 5.200 Zeilen Dokumentation in sechs Tagen.**

> **Zwei Branches, ein Projekt:** `claude/digital-microproduct-gumroad-rgrfwd` und
> `claude/zweites-produkt-950ce5` gehören beide zur Papierkramerei. Sie sind am
> 3. August auseinandergelaufen und **nie zusammengeführt worden**. Der eine Zweig
> hat das zweite Produkt (Belegpaket) und das Bundle, der andere die Rechtstexte
> und die 30-Schritte-Klickstrecke für Etsy. Vor der nächsten Arbeit daran
> zusammenführen — sonst geht eine Hälfte verloren.

---

## 2. Die Etsy-Projekte — das Referenzmaterial

Das sind die Projekte, die als Werbung und Referenz taugen, weil sie **öffentlich
vorzeigbare Endprodukte** sind und nicht nur Code in einem privaten Repo.

### 2.1 Papierkramerei — Rechnungsgenerator & Belegpaket

Ein Shop mit zwei Produkten und einem Bundle, komplett für den deutschsprachigen
Markt für Selbstständige und Kleinunternehmer.

| Produkt | Preis | Inhalt |
|---|---|---|
| Rechnungsgenerator | 14,90 € (Einführung 9,90 €) | Rechnung, Angebot, Stornorechnung |
| Belegpaket | 9,00 € | Zahlungserinnerung, 1./2. Mahnung, Auftragsbestätigung, Lieferschein, Stundenzettel |
| Komplettpaket | 19,00 € | beide, mit Datenübernahme zwischen den Werkzeugen |

**Was das Produkt technisch ist:** eine einzige HTML-Datei von rund 50 kB.
Doppelklick, läuft im Browser. Keine Installation, kein Konto, keine
Internetverbindung, **kein einziger Aufruf nach außen** — kein CDN, keine
Schriftart von fremden Servern, kein Tracking. Der Build-Schritt prüft das
automatisch und bricht ab, wenn sich doch ein externer Verweis einschleicht.

**Fachliche Tiefe** (das ist der eigentliche Wert und das beste Verkaufsargument
für Consulting):

- Kleinunternehmerregelung § 19 UStG und Reverse-Charge § 13b UStG mit
  automatischen Hinweistexten
- Umsatzsteuer je Satz gruppiert, gemischte Sätze (19 / 7 / 0 %) in einem Beleg,
  kaufmännische Rundung
- Prüfung der Pflichtangaben nach § 14 UStG, bevor die Rechnung rausgeht
- Verzugszinsen nach § 288 BGB, taggenau, 5 oder 9 Prozentpunkte über
  Basiszinssatz; Verzugspauschale 40 € nach § 288 Abs. 5 BGB
- Der Basiszinssatz ist ein Eingabefeld, kein fester Wert im Code — weil er sich
  halbjährlich ändert

**Qualitätssicherung:** Automatisierte Abnahmetests im echten Chromium
(Playwright) — **85 Prüfpunkte** für den Rechnungsgenerator, **155** für das
Belegpaket. Geprüft werden unter anderem Rechenwege inklusive Rundung bei
gemischten Steuersätzen, Fälligkeitsberechnung über Monats- und
Schaltjahresgrenzen, Persistenz über einen Neuladevorgang, Import/Export,
HTML-Escaping bei Sonderzeichen, A4-Maße im Druck, Darstellung auf 390 px Breite
und der Betrieb ohne dauerhaften Speicher (privates Fenster, blockierte
Website-Daten, eingebetteter Rahmen).

**Was neben dem Code entstanden ist** — und genau das ist der Teil, den die
meisten unterschätzen:

| Bereich | Umfang |
|---|---|
| Listing-Bilder | 6 + 6 + 2 Stück, je 2000 × 2000 px, per Skript erzeugt |
| Listing-Videos | 2 Stück, 1080 × 1080, 10,5 s und 11,5 s, MP4 |
| Shop-Auftritt | Banner 3200 × 800, Shop-Bild 1000 × 1000, Profiltext, Shop-Richtlinien |
| Verkaufstexte | vollständige Listings Feld für Feld, für drei Artikel |
| Rechtstexte | Impressum, Widerrufsbelehrung, Prüfung mit 8 dokumentierten Befunden, Zuordnung zu den Etsy-Feldern |
| Ablaufanleitung | Klickstrecke mit **30 Schritten** vom Konto bis „Veröffentlichen", zusätzlich als abhakbare HTML-Seite |
| Strategie | Marktplatzwahl mit Begründung, Preisbildung, Deckungsbeitragsrechnung, Ads-Strategie, 30-Tage-Plan |
| Käuferunterlagen | Handbuch und Lizenztext je Produkt, Beispieldateien |

**Bemerkenswert an der Arbeitsweise:** Die Listing-Bilder und Videos werden nicht
gebaut, sondern **erzeugt** — die Belege darin rendert das Werkzeug selbst.
Ändert sich das Produkt, erzeugt man die Bilder neu und sie stimmen wieder. Es
gibt ein festgelegtes Gestaltungssystem (Farbtokens, Schriftpaarung Bitstream
Charter / Liberation Sans), das in einem gemeinsamen Modul liegt.

**Geschäftliche Analyse, die mitgeliefert wurde** (nicht geschätzt, sondern
durchgerechnet):

- Deckungsbeitrag je Preisstufe, inklusive Einstellgebühr, 6,5 % Transaktions-
  und ~4 % + 0,30 € Zahlungsabwicklungsgebühr
- Offsite Ads **an** (Provision nur bei Verkauf), Etsy Ads / Onsite **aus**
  (Klickpreis auch ohne Verkauf) — mit Break-Even-Tabelle: Kosten je Verkauf =
  Klickpreis ÷ Konversionsrate, muss unter dem Deckungsbeitrag von 12,84 € liegen
- Klare Benennung des eigentlichen Engpasses: **Bewertungen, nicht Reichweite**
- Warum Etsy und nicht Gumroad/Lemon Squeezy: Kassensysteme bringen keine
  Besucher, Etsy hat Suchverkehr mit Kaufabsicht. Ausdrücklich als Korrektur
  einer früheren eigenen Einschätzung dokumentiert.

### 2.2 FlowStock — Cashflow- & Bestands-Dashboard

Zielgruppe: Onlinehändler (Etsy, Shopify, eBay, Amazon). Preis laut Listing
19,00 € (Einführung 12,00 €), danach 24,00 €. Zweisprachig Deutsch/Englisch.

**Was es rechnet:**

| Größe | Formel |
|---|---|
| Rohertrag | Umsatz − Gebühren − Versand − Wareneinsatz |
| Verkaufstempo | verkaufte Stück ÷ Tage im Fenster |
| Reichweite | Bestand ÷ Verkaufstempo |
| Bestellpunkt | Verkaufstempo × (Lieferzeit + Sicherheitsbestand) |
| Bestellmenge | Verkaufstempo × (Lieferzeit + Zielreichweite + Sicherheit) − Bestand, aufgerundet auf die Mindestbestellmenge |
| Kontostand-Prognose | Startsaldo + Auszahlungen − Nachbestellungen − anteilige Fixkosten |

Die Prognose läuft bis 180 Tage und **simuliert jeden Tag einzeln**: Artikel
verkaufen sich mit ihrem Tempo, laufen leer und tragen dann nichts mehr bei;
erreicht die Bestandsposition den Bestellpunkt, wird nachbestellt — rollierend,
also mehrfach über einen langen Horizont. Das Geld fließt am Bestelltag ab, die
Ware trifft nach der Lieferzeit ein.

**Technisch bemerkenswert:**

- CSV-Import mit automatischer Spaltenerkennung (deutsch und englisch),
  Trennzeichen, Zahlenformat (`1.234,56` / `1,234.56`) und Datumsformat werden
  **aus den Daten selbst erschlossen**. Bei mehrdeutigen Datumsangaben entscheidet
  eine Abstimmung über die ganze Spalte, nicht über die einzelne Zeile.
- Diagramme sind **handgeschriebenes SVG**, das Icon ein Data-URI — deshalb kein
  einziger Netzwerkaufruf. Zu jedem Diagramm gibt es eine Tabellen-Ansicht.
- Zweisprachigkeit über `Intl`, inklusive Zahlen-, Währungs- und Datumsformaten
- Modular entwickelt (8 Quelldateien), `build.sh` fügt sie zu einer einzigen
  auslieferbaren `index.html` zusammen — **ohne Bundler, ohne `node_modules`**.
  Das Skript braucht nur `bash`, `cat` und für das ZIP noch `zip`.
- Fehlt eine Spalte (z. B. Einkaufspreis), wird mit einer einstellbaren Quote
  gerechnet und die betroffene Zahl mit `~` markiert — die Annahme wird im
  Dashboard offen ausgewiesen statt versteckt.

---

## 3. Die übrigen Projekte

### 3.1 kleinanzeigen-tool — KI-Werkzeug für Inserate

Macht aus Handyfotos ein fertiges Inserat für kleinanzeigen.de: Titel,
Beschreibung, Kategorie, Zustand, Suchbegriffe und einen **begründeten**
Preisvorschlag mit Spanne. Auf Wunsch wird das Anzeigenformular im Browser
vorausgefüllt.

- Python-Paket mit sauberer Struktur (Provider-Abstraktion, CLI, lokale
  Web-Oberfläche), **9 Testmodule**
- Zwei KI-Anbieter austauschbar hinter einer gemeinsamen Schnittstelle: Gemini
  (kostenloses Kontingent) und Claude
- Einrichtung in einem Schritt: `start.sh` / `start.bat`, richtet Umgebung ein
  und fragt nach dem API-Schlüssel
- **Läuft auf Android via Termux** — inklusive der Eigenheiten dort:
  Systempakete statt PyPI-Rädern, Berechtigung für den Fotospeicher, Anthropic-SDK
  bewusst optional, weil es eine Rust-Komponente nachzieht, die auf Android
  übersetzt werden müsste

**Bewusste Grenze, sauber begründet:** Das Tool **veröffentlicht keine Anzeigen**.
Der letzte Klick bleibt beim Nutzer — weil die AGB von kleinanzeigen.de
automatisiertes Einstellen untersagen und weil Preis-, Zustands- und
Mängelangaben rechtlich verbindlich sind. Das ist genau die Art von Urteil, die
ein Kunde von einem Berater erwartet.

### 3.2 Niche AI Recommendation & Deal Finder

Affiliate-MVP: interaktiver Produkt-Finder (3 Fragen → Top-3-Empfehlung) plus
automatisch erzeugte SEO-Landingpages nach dem Muster
`/best-[kategorie]-for-[zielgruppe]`.

- Next.js 15 (App Router, Server Components), TypeScript, Tailwind,
  shadcn-Konventionen, Vercel Analytics
- JSON als Datenquelle, **kein Backend, keine Datenbank**; alle Seiten werden zur
  Build-Zeit vorgerendert und vom CDN ausgeliefert; ~102 kB First-Load-JS
- Scoring-Engine (Bewertung × Eignung × Budget), mehrere Händler je Produkt mit
  provisionsoptimiertem CTA
- JSON-LD (Product, Review, AggregateOffer, FAQ, Breadcrumbs), automatische
  `sitemap.xml` und `robots.txt`, OG-Bilder zur Build-Zeit als PNG erzeugt
- Impressum, Datenschutz und „Über uns" aus **einer** Datenquelle (`owner.json`)
- **Keine Partner-ID steht im Code** — alles über Umgebungsvariablen
- `npm run check:launch`: eigenes Prüfskript, das vor dem Livegang mechanisch
  Platzhalter-URLs, unvollständige Impressumsdaten, doppelte IDs, ungültige
  Affiliate-Links, fehlende Nachteile und veraltete redaktionelle Prüfungen
  findet — mit Exit-Code 1, also CI-tauglich
- `docs/LIVEGANG.md` (17 kB): Runbook mit Prüfung nach jedem Schritt, von der
  Node-Installation bis zur Anmeldung bei Amazon PartnerNet

### 3.3 Intervall-Timer

Kleine Web-App für Intervalltraining (Belastung, Pause, Runden, Vorbereitung) mit
Screen Wake Lock, damit das Display anbleibt. Automatisches Deployment nach
GitHub Pages per Actions-Workflow. Umfang: ~570 Zeilen. Als Referenz zu klein —
aber ein sauberer Beleg dafür, dass auch eine Kleinigkeit mit Deployment-Pipeline
ausgeliefert wird und nicht auf der Festplatte liegen bleibt.

---

## 4. Das Kompetenzprofil, das sich daraus ableiten lässt

Für ein Consulting-Konzept ist nicht die Technikliste entscheidend, sondern das
wiederkehrende Muster. Es zeigt sich in allen Projekten:

**1. Ein Produkt heißt: verkaufsfertig, nicht lauffähig.**
In jedem Projekt gehören Verkaufstexte, Bilder, Rechtstexte, Lizenz,
Käuferanleitung und ein Runbook für den Livegang zum Ergebnis. Beim
Papierkramerei-Projekt ist die Doku (~2.900 Zeilen) fast so umfangreich wie der
Code (~5.700). Das ist der übliche Bruch bei Solo-Selbstständigen und kleinen
Firmen: Es gibt ein fertiges Ding, aber niemand hat es je in den Verkauf gebracht.

**2. Radikale Einfachheit als Architekturentscheidung.**
Eine HTML-Datei. Kein Backend. Kein Bundler. Keine `node_modules`. Kein CDN. Das
ist kein Verzicht, sondern das Verkaufsargument: läuft offline, für immer, ohne
Abo, ohne dass Kundendaten das Gerät verlassen. Und es ist im Build **erzwungen** —
er bricht ab, wenn ein externer Verweis auftaucht.

**3. Fachliche Richtigkeit vor Feature-Menge.**
§ 19 UStG, § 13b UStG, § 14 UStG, § 288 BGB — nachgeschlagen, nicht geraten.
Werte, die sich ändern (Basiszinssatz), sind Eingabefelder statt Konstanten. Wo
es rechtlich heikel wird, verweist die Anleitung auf den Steuerberater.

**4. Prüfen statt behaupten.**
85 und 155 Prüfpunkte im echten Browser. Etsys Zeichengrenzen per Skript geprüft,
nicht geschätzt. Ein eigenes Livegang-Prüfskript mit Exit-Code für CI. Der Satz
aus dem Übergabedokument bringt es auf den Punkt: *„Nichts behaupten, was nicht
geprüft ist."*

**5. Grenzen werden ausgeschrieben, nicht versteckt.**
Jedes Projekt hat einen Abschnitt „Grenzen": kein DATEV-Export, keine
strukturierte E-Rechnung (ZUGFeRD/XRechnung), keine Geräte-Synchronisierung,
FlowStock bildet keine Saisonalität und keine Retouren ab, das
Kleinanzeigen-Tool veröffentlicht nichts. Begründung im Text: Das spart
Rückfragen und Erstattungen.

**6. Entscheidungen werden begründet und auch revidiert.**
Der Wechsel von Lemon Squeezy zu Etsy ist samt Begründung dokumentiert — als
ausdrückliche Korrektur der eigenen früheren Einschätzung. Ebenso, warum kein
GiroCode gebaut wurde: ein selbstgeschriebener QR-Encoder ohne verlässliche
Prüfung wäre auf einem Beleg, der Geld bewegt, ein Risiko.

**7. Betriebswirtschaft gehört zur Lieferung.**
Deckungsbeitrag je Preisstufe, Break-Even für Klickpreise, Konversionsannahmen,
Preisbildung gegen das Vergleichsprodukt im Kopf des Käufers („nicht die Vorlage
für 5 €, sondern das Abo, das er nicht abschließen will").

**8. Übergabefähigkeit.**
`UEBERGABE.md` hält fest, was existiert, welche Entscheidungen stehen und **warum**
— damit nichts neu verhandelt wird. Dazu ein Abschnitt „Fallen, die schon Zeit
gekostet haben": `localStorage` wirft im privaten Fenster, `datalist` ist
unbedienbar, `color-scheme: light` gehört auf `:root`, Playwrights ffmpeg kann
kein MP4. Das ist übertragbares Wissen, kein Projekttagebuch.

---

## 5. Was sich davon als Referenz zeigen lässt

| Material | Vorzeigbar als | Bemerkung |
|---|---|---|
| Etsy-Shop „Papierkramerei" mit 3 Artikeln | Live-Referenz, stärkste Form | Öffentliche URL, echtes Produkt, echte Bewertungen (sobald vorhanden) |
| FlowStock-Listing | Zweite Live-Referenz, andere Zielgruppe (E-Commerce statt Dienstleister) | |
| Listing-Bilder, Videos, Shop-Banner | Portfolio-Bilder für die eigene Seite | Direkt verwendbar, liegen als PNG/MP4 im Repo |
| Die Produkte selbst | Interaktive Demo | Eine HTML-Datei — lässt sich als Demo-Version auf der eigenen Seite einbetten |
| Screenshots (Editor, erzeugte Rechnung) | Belegbilder | Liegen im Repo |
| Strategie- und Rechtsdokumente | Arbeitsprobe für Beratungsleistung | Zeigen die Denkweise, nicht nur das Ergebnis. Vor Weitergabe auf persönliche Daten prüfen. |
| Deal-Finder-Website | Referenz für „Web + SEO + Affiliate" | Braucht eine Live-Domain, um zu wirken |
| kleinanzeigen-tool | Referenz für „KI im Alltag", Show-and-tell | Als Fallstudie stärker denn als Produkt |
| Intervall-Timer | — | Zu klein, nicht als Referenz verwenden |

**Der stärkste Referenzsatz**, wenn die Verkäufe da sind, lautet ungefähr:
*„Ich habe ein digitales Produkt gebaut, auf Etsy gestellt und verkauft —
einschließlich Rechtstexten, Listing, Bildern und Preisstrategie. Genau das mache
ich für Sie."* Der Beweis ist die Shop-URL, nicht ein Lebenslauf.

**Die Fallstudie ist wertvoller als der Code.** Für Kunden zählt „6 Tage von der
Idee zum verkaufsfertigen Produkt inklusive Rechtstexten", nicht „21.000 Zeilen
Code".

---

## 6. Was das Repository *nicht* belegt

Ehrlich ausgewiesen, damit im Consulting-Konzept nichts steht, was bei
Nachfrage bröckelt:

1. **Ob die Listings tatsächlich online sind, geht aus dem Repository nicht
   hervor.** Es enthält alles für die Veröffentlichung — Texte, Bilder, Video,
   Rechtstexte, 30-Schritte-Klickstrecke —, aber keine Bestätigung, dass der
   Shop live ist. **Bitte selbst ergänzen:** Shop-URL, Datum der
   Veröffentlichung, Status je Artikel.
2. **Keine Verkaufszahlen, keine Bewertungen, keine Besucherzahlen.** Die
   genannten Preise sind Empfehlungen aus der eigenen Kalkulation, keine
   erzielten Umsätze. Ohne diese Zahlen ist die Referenz „ich habe es gebaut und
   eingestellt", nicht „ich habe es erfolgreich verkauft" — beides ist brauchbar,
   aber nur das Erste ist derzeit belegt.
3. **Der Deal-Finder ist nicht live.** Es gibt ein Runbook, aber keine Domain
   und keine Anmeldung bei einem Partnerprogramm im Repo.
4. **Safari und Firefox sind ungetestet.** Im Container gab es nur Chromium.
   Vor dem ersten Verkauf sollte der PDF-Export dort einmal geprüft werden —
   steht so auch in den offenen Punkten des Projekts.
5. **Die beiden Papierkramerei-Branches sind nicht zusammengeführt** (siehe
   Abschnitt 1). Fachlich unkritisch, praktisch der erste zu erledigende Punkt.
6. **Alle Projekte sind in Zusammenarbeit mit einem KI-Assistenten entstanden.**
   Für ein Consulting-Angebot ist das eher Argument als Problem — Tempo und
   Umfang sind gerade der Beweis — aber es sollte im Konzept bewusst positioniert
   und nicht verschwiegen werden.

---

## 7. Prompt für Claude oder Gemini

Alles ab hier kann direkt kopiert und mit diesem Dokument zusammen eingefügt
werden.

---

> Ich möchte ein Consulting-Angebot als Side Hustle aufbauen und nutze die
> folgende Projektübersicht als Faktengrundlage. Bitte erfinde nichts hinzu und
> arbeite mit dem, was in Abschnitt 6 als unbelegt markiert ist, entsprechend
> vorsichtig.
>
> **Ausgangslage:** In sechs Tagen sind fünf Projekte entstanden, davon zwei
> verkaufsfertige digitale Produkte für Etsy (deutscher Markt, Zielgruppe
> Selbstständige und Kleinunternehmer bzw. Onlinehändler), ein Affiliate-Website-MVP
> und ein KI-Werkzeug. Der rote Faden ist nicht „ich kann programmieren", sondern
> „ich bringe ein digitales Produkt vollständig in den Verkauf — inklusive
> Rechtstexten, Listing, Bildern, Preisstrategie und Livegang-Ablauf".
>
> **Bitte erarbeite:**
>
> 1. **Positionierung.** Zwei bis drei mögliche Positionierungen, jeweils mit
>    Zielkunde, konkretem Schmerzpunkt und dem Satz, mit dem ich mich in einem
>    Gespräch vorstelle. Nenne für jede die stärkste vorhandene Referenz aus der
>    Übersicht.
> 2. **Angebot.** Zwei bis drei paketierte Leistungen mit klar abgegrenztem
>    Lieferumfang, realistischer Dauer und Preisspanne für den deutschsprachigen
>    Markt. Kein „Stundensatz nach Aufwand" — die Projekte zeigen, dass ich in
>    Ergebnissen denke, das Angebot sollte das auch tun.
> 3. **Referenzstrategie.** Wie die Etsy-Artikel als Werbung wirken: Wo tauchen
>    sie auf (eigene Seite, LinkedIn, Erstgespräch), in welcher Form (Live-Link,
>    Demo, Fallstudie, Screenshots), und welche Formulierung ist zulässig, solange
>    keine Verkaufszahlen vorliegen? Formuliere je eine Version für „noch keine
>    Verkäufe" und für „erste Verkäufe vorhanden".
> 4. **Erste 30 Tage.** Was zuerst — in einer Reihenfolge, die die knappste
>    Ressource zuerst löst. Berücksichtige, dass das nebenberuflich läuft.
> 5. **Akquise.** Drei bis fünf Kanäle, an denen die vorhandenen Artefakte
>    tatsächlich etwas ausrichten, mit Begründung warum gerade dort.
> 6. **Risiken.** Was an dieser Positionierung schwach ist und was ich dagegen
>    tun kann. Sei hier hart, nicht höflich.
> 7. **Rechtliches und Steuerliches.** Was in Deutschland für einen
>    nebenberuflichen Beratungs-Side-Hustle zu klären ist — als Checkliste mit
>    dem Hinweis, wo ich fachlichen Rat brauche. Keine Rechtsberatung, nur die
>    Punkte, die ich nicht übersehen darf.
>
> **Zwei Dinge ausdrücklich mitdenken:** Erstens sind die Projekte mit einem
> KI-Assistenten entstanden — bitte schlage vor, wie ich das offensiv und
> glaubwürdig positioniere, statt es zu umgehen. Zweitens ist die
> Doku-zu-Code-Quote in diesen Projekten außergewöhnlich hoch; prüfe, ob daraus
> eine eigene Leistung wird (Übergabe, Runbooks, Dokumentation für Firmen, die
> Software geerbt haben).

---

## 8. Zahlen zum Zitieren

Kompakt, für Website, Profil oder Erstgespräch:

- **5 Projekte in 6 Tagen** (3.–8. August 2026)
- **~21.000 Zeilen Code, ~5.200 Zeilen Dokumentation**
- **3 verkaufsfertige Etsy-Artikel** in einem Shop, plus 1 weiteres Produkt
  zweisprachig DE/EN
- **240 automatisierte Prüfpunkte** im echten Browser (85 + 155)
- **30-Schritte-Runbook** für die Etsy-Veröffentlichung, 8 dokumentierte Befunde
  aus der Rechtstexte-Prüfung
- **0 externe Abhängigkeiten** in den ausgelieferten Produkten — im Build
  erzwungen
- **54 Commits** über alle Branches, jeder mit begründender Nachricht auf Deutsch

---

*Erstellt aus dem Stand des Repositorys vom 8. August 2026. Bei neuen Commits
oder wenn die Shop-Daten (URL, Verkäufe, Bewertungen) vorliegen, sollte
Abschnitt 6 aktualisiert werden — er ist der Teil, der das Konzept ehrlich hält.*
