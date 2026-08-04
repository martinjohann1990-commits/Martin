# Etsy-Listing anlegen — Klickstrecke

Jeder Schritt in der Reihenfolge, in der Etsy danach fragt. Die abhakbare
Fassung mit Kopierknöpfen erzeugt `node marketing/etsy-anleitung.mjs`
nach `dist/etsy-anleitung.html`.

Die Feldinhalte im Einzelnen stehen in `etsy-listing.md` und `etsy-shop.md`.

---

## Vorbereitung

Bevor du Etsy überhaupt öffnest. Dauert zehn Minuten und erspart dir, mitten im Anlegen abbrechen zu müssen.

### 1. Paket bauen

Im Repository `./bauen.sh` ausführen. Das erzeugt `dist/rechnungsgenerator-kleinunternehmer-v1.0.0.zip` — **das ist die Datei, die der Käufer bekommt.**

### 2. Paket selbst testen

ZIP entpacken und die HTML-Datei in einem **frischen Browserprofil** öffnen (Inkognito reicht). So erlebt es der Käufer. Einmal eine Rechnung schreiben und als PDF speichern.

### 3. Alle Dateien griffbereit legen

Kopiere dir diese Dateien in einen Ordner auf den Schreibtisch — du brauchst sie gleich alle:

| Datei | Wofür |
|---|---|
| `assets/etsy/01-hero.png` | Listing-Bild 1 |
| `assets/etsy/02-funktionen.png` | Listing-Bild 2 |
| `assets/etsy/03-paragraf19.png` | Listing-Bild 3 |
| `assets/etsy/04-so-gehts.png` | Listing-Bild 4 |
| `assets/etsy/05-editor.png` | Listing-Bild 5 |
| `assets/etsy/06-lieferumfang.png` | Listing-Bild 6 |
| `assets/etsy/listing-video.mp4` | Listing-Video |
| `dist/…v1.0.0.zip` | die Datei zum Verkaufen |
| `assets/etsy/shop-icon.png` | Shop-Bild |
| `assets/etsy/shop-banner.png` | Shop-Banner |

### 4. Shopnamen auf Verfügbarkeit prüfen

Rufe `etsy.com/shop/Papierkramerei` auf. Eine Fehlerseite bedeutet: frei. Erscheint ein Shop, brauchst du einen anderen Namen.

### 5. Rechtliches klären

Gewerbe angemeldet oder als Freiberufler beim Finanzamt geführt? Impressumsangaben (Name, Anschrift, E-Mail) bereitgelegt? Beides brauchst du gleich.

> **Achtung:** Regelmäßiger Verkauf digitaler Produkte ist gewerblich — auch nebenbei. Ein fehlendes Impressum ist der häufigste Abmahngrund bei kleinen Shops.


---

## Konto und Shop anlegen

Etsy führt dich durch einen Assistenten. Er verlangt mitten im Ablauf das erste Listing — deshalb kommen Teil 2 und Teil 3 hier durcheinander vor. Das ist normal.

### 6. Verkäuferkonto eröffnen

Auf `etsy.com/sell` gehen und dem Assistenten folgen. Ein bestehendes Käuferkonto kann man weiterverwenden.

### 7. Shop-Einstellungen setzen

Sprache **Deutsch**, Land **Deutschland**, Währung **Euro (EUR)**.

> **Achtung:** Die Sprache lässt sich später nur mühsam ändern. Jetzt richtig setzen.

### 8. Shopnamen eingeben

Der Name, den du eben geprüft hast:

**Shopname:**

```
Papierkramerei
```


---

## Das Listing anlegen

Die Felder in der Reihenfolge, in der Etsy sie abfragt. Jeder Text hat einen Kopierknopf.

### 9. Fotos hochladen — in dieser Reihenfolge

Die Reihenfolge ist nicht beliebig: Bild 1 entscheidet, ob jemand aus der Suchergebnisliste überhaupt klickt.

| Datei | Wofür |
|---|---|
| `01-hero.png` | Platz 1 — die Behauptung plus fertige Rechnung |
| `02-funktionen.png` | Platz 2 — kann es, was ich brauche? |
| `03-paragraf19.png` | Platz 3 — das Kaufargument der Zielgruppe |
| `04-so-gehts.png` | Platz 4 — nimmt die Angst vor der Einrichtung |
| `05-editor.png` | Platz 5 — die Bedienung |
| `06-lieferumfang.png` | Platz 6 — räumt letzte Zweifel aus |

### 10. Video hochladen

Im selben Bereich wie die Fotos, eigener Platz. `listing-video.mp4` — 10,5 Sekunden, ohne Ton. Etsy bevorzugt Listings mit Video in der Suche.

### 11. Titel eintragen

118 von 140 erlaubten Zeichen. Die vorderen Wörter wiegen bei Etsy am schwersten, deshalb steht die Suchanfrage vorn und das Verkaufsargument hinten.

**Titel:**

```
Rechnungsvorlage Kleinunternehmer § 19 UStG | Rechnung & Angebot als PDF | Ohne Abo, offline nutzbar | Sofort-Download
```

### 12. „Über dieses Produkt" — drei Auswahlfelder

**Wer hat es gemacht?** Ich selbst · **Was ist es?** Ein fertiges Produkt · **Wann?** 2020 – 2026

### 13. Kategorie wählen

Papier & Party → Papier → Kalender & Planer → Vorlagen. Falls Etsy die Pfade umbenannt hat: Hauptsache eine Vorlagen-Kategorie.

### 14. Art des Angebots: Digitaler Download

Unbedingt **„Digitaler Download"** wählen, nicht „Physischer Artikel".

> **Achtung:** Nur mit dieser Einstellung liefert Etsy die Datei automatisch aus, und nur dann greift der Ausschluss vom Widerrufsrecht.

### 15. Beschreibung einfügen

Der komplette Text. Etsy nimmt keine Formatierung — Absätze und Großbuchstaben tragen die Gliederung.

**Beschreibung:**

```
Rechnungen schreiben, ohne jeden Monat dafür zu zahlen.

Das hier ist keine Word-Vorlage, in der du Beträge selbst ausrechnest. Es ist ein fertiges kleines Programm in einer einzigen Datei: Du trägst deine Positionen ein, alles wird automatisch berechnet, und du speicherst das Ergebnis als PDF.

Doppelklick auf die Datei — sie öffnet sich in deinem Browser. Keine Installation, kein Konto, keine Internetverbindung nötig.


WARUM ES DAS GIBT

Buchhaltungs-Abos kosten 9 bis 15 Euro im Monat. Wer fünf Rechnungen im Monat schreibt, zahlt dafür über 100 Euro im Jahr — für Funktionen, die er nie benutzt. Die Alternative war bisher eine Vorlage, in der man alles von Hand rechnet und hofft, dass die Nummer noch stimmt.

Das hier ist der Mittelweg: rechnet automatisch, kennt die deutschen Steuerregeln, kostet einmalig.


DAS KANN ES

✓ Rechnung, Angebot und Stornorechnung — die Beschriftungen wechseln mit
✓ Kleinunternehmerregelung § 19 UStG per Häkchen, Hinweistext erscheint automatisch
✓ Umsatzsteuer 19 % und 7 %, auch gemischt in einer Rechnung, sauber gruppiert
✓ Reverse-Charge für Kunden im EU-Ausland
✓ Rabatt auf die Nettosumme
✓ Prüfung der Pflichtangaben nach § 14 UStG — sagt dir, was noch fehlt
✓ Fortlaufende Rechnungsnummern (RE-2026-001, RE-2026-002 …)
✓ Kundenliste: wiederkehrende Kunden einmal speichern, dann auswählen
✓ Eigenes Logo auf dem Beleg
✓ Eigene Mengeneinheiten, falls Std. und Stück nicht reichen
✓ Live-Vorschau — du siehst sofort, wie die Rechnung aussieht
✓ Speichern als PDF über den Druckdialog des Browsers
✓ Sichern und Laden als Datei, für Backup und als Vorlage im Folgemonat


DAS BEKOMMST DU

• rechnungsgenerator.html — das komplette Werkzeug, eine einzige Datei
• ANLEITUNG — Einrichtung, PDF-Export, häufige Fragen
• Beispielbeleg — ausgefüllt zum Ausprobieren
• LIZENZ — dauerhafte Nutzung für dich und dein Unternehmen
• START HIER — die Kurzfassung für den Einstieg


SO GEHT'S

1. Nach dem Kauf die ZIP-Datei herunterladen und entpacken
2. Doppelklick auf rechnungsgenerator.html
3. Einmal deine Daten eintragen — Anschrift, Steuernummer, Bankverbindung
4. Positionen eintippen, auf "PDF / Drucken" klicken, als PDF speichern


DEINE DATEN BLEIBEN BEI DIR

Alles wird ausschließlich in deinem Browser gespeichert. Es gibt keinen Server, keine Cloud und keine Anmeldung. Die Datei enthält keine einzige Verbindung nach außen — kein Tracking, keine Schriftarten von fremden Servern, nichts.

Deine Umsätze, Kundennamen und Kontodaten verlassen deinen Rechner nicht.


FÜR WEN

Freiberufler, Solo-Selbstständige, nebenberuflich Selbstständige, Kleinunternehmer nach § 19 UStG. Handwerk, Fotografie, Coaching, Nachhilfe, Design, IT, Übersetzung, Pflege, Kosmetik — überall dort, wo im Monat ein paar Rechnungen anfallen und ein Abo sich einfach nicht lohnt.

Auch für Vereine und Ehrenamtliche, die gelegentlich abrechnen müssen.


WAS ES NICHT KANN

Damit es keine Enttäuschung gibt, sage ich das lieber vorher:

• Kein Mahnwesen, keine Zeiterfassung, kein DATEV-Export
• Keine E-Rechnung im XML-Format (XRechnung / ZUGFeRD) — es erzeugt PDF
• Keine Synchronisierung zwischen mehreren Geräten
• Es ist eine Arbeitshilfe, keine Steuerberatung

Wenn du eines davon brauchst, ist echte Buchhaltungssoftware die bessere Wahl.


TECHNISCHE VORAUSSETZUNGEN

Ein Computer oder Tablet mit einem aktuellen Browser (Chrome, Firefox, Edge oder Safari). Windows, Mac und Linux funktionieren gleichermaßen. Auf dem Handy läuft es, ist aber unbequem.


SOFORT-DOWNLOAD

Die Dateien stehen direkt nach dem Kauf zum Herunterladen bereit.

Da es sich um ein digitales Produkt handelt, das sofort heruntergeladen werden kann, ist eine Rückgabe nach dem Download nicht möglich. Wenn etwas nicht funktioniert oder du eine Frage hast: Schreib mir einfach. Ich antworte normalerweise am selben Tag und finde eine Lösung.
```

### 16. Preis und Anzahl

**Preis: 9,90 €** als Einführungspreis für die ersten zwei Wochen oder zehn Verkäufe. Danach auf 14,90 € anheben. **Anzahl: 999.**

**Preis:**

```
9,90
```

**Anzahl:**

```
999
```

### 17. Alle 13 Schlagwörter setzen

Ungenutzte Plätze sind verschenkte Sichtbarkeit. Einzeln eintragen — Etsy nimmt keine Liste auf einmal. Drei stehen bewusst ohne Umlaut, weil Etsys Suche „ä" und „ae" nicht zuverlässig gleich behandelt.

```
Rechnungsvorlage
Kleinunternehmer
Rechnung erstellen
Angebot Vorlage
Selbststaendig
Freelancer Tool
Buchhaltung Hilfe
Umsatzsteuer
Existenzgruendung
Rechnung PDF
Nebengewerbe
Gruendung Set
Paragraph 19 UStG
```

### 18. Materialien angeben

Vier Einträge, ebenfalls einzeln:

```
HTML-Datei
Digitaler Download
PDF-Ausgabe
Vorlage
```

### 19. Die Verkaufsdatei hochladen

**Die ZIP-Datei, nicht die einzelnen Dateien.** So bleibt die Anleitung beim Werkzeug. Etsy erlaubt bis zu fünf Dateien à 20 MB — das Paket liegt bei rund 22 kB.

| Datei | Wofür |
|---|---|
| `rechnungsgenerator-kleinunternehmer-v1.0.0.zip` | aus dem Ordner dist/ |

### 20. Personalisierung ausschalten

Nicht aktivieren. Es gibt nichts zu personalisieren, und aktiviert erzeugt es nur Rückfragen.

### 21. Vorschau ansehen, dann veröffentlichen

Vor dem Klick auf „Veröffentlichen" einmal die Vorschau prüfen: Steht das richtige Bild auf Platz 1? Ist die Beschreibung vollständig? Sind alle 13 Tags gesetzt?


---

## Shop-Profil vervollständigen

Geht erst, wenn der Shop existiert. Unter Shop-Manager → Shop-Einstellungen. Zwanzig Minuten, die sich unmittelbar auszahlen — ein leeres Profil kostet Vertrauen.

### 22. Shop-Bild und Banner hochladen

Unter „Shop-Darstellung" bzw. „Design".

| Datei | Wofür |
|---|---|
| `shop-icon.png` | Shop-Bild — wird als kleiner Kreis gezeigt |
| `shop-banner.png` | Banner — die breite Fläche oben |

### 23. Shop-Titel eintragen

Die Zeile direkt unter dem Namen, 49 von 55 erlaubten Zeichen. Sie sagt, für wen der Shop ist — nicht, was gerade darin liegt.

**Shop-Titel:**

```
Werkzeuge gegen den Papierkram für Selbstständige
```

### 24. Ankündigung setzen

Erscheint oben im Shop. Während des Einführungspreises die zweite Fassung nehmen und das Datum eintragen.

**Ankündigung (regulär):**

```
Digitale Werkzeuge für alle, die nebenbei oder hauptberuflich selbstständig sind: Rechnungen und Angebote schreiben, ohne dafür monatlich zu zahlen. Einmal kaufen, dauerhaft nutzen. Bei Fragen schreib mir einfach — ich antworte normalerweise am selben Tag.
```

**Ankündigung (Einführungspreis):**

```
Einführungspreis bis [Datum]: Der Rechnungsgenerator kostet 9,90 € statt 14,90 €. Danach gilt der reguläre Preis. Bei Fragen schreib mir einfach.
```

### 25. Shop-Story schreiben

Der Text, der aus einem anonymen Download einen Menschen macht.

> **Achtung:** Diesen Text vor dem Einfügen an deine Lage anpassen. Er ist als Gerüst gedacht — Etsy-Käufer merken, ob eine Geschichte stimmt, und eine erfundene schadet mehr als gar keine.

**Über den Shop:**

```
Angefangen hat das mit einer Word-Vorlage.

Ich bin selbst selbstständig und schreibe im Monat eine Handvoll Rechnungen. Für ein Buchhaltungs-Abo mit Mahnwesen, Dashboard und Zeiterfassung war das immer zu wenig — für die Word-Vorlage, in der ich jeden Betrag selbst ausgerechnet habe, war es zu viel. Jedes Mal dieselbe Rechnerei, jedes Mal die Frage, ob die Umsatzsteuer stimmt und ob ich eine Nummer doppelt vergeben habe.

Irgendwann habe ich mir das Werkzeug gebaut, das ich haben wollte: eine einzige Datei, die sich per Doppelklick im Browser öffnet, alles ausrechnet und ein sauberes PDF ausgibt. Ohne Installation, ohne Konto, ohne Abo — und ohne dass meine Umsätze und Kundendaten irgendwo auf einem fremden Server landen.

Weil es mir seitdem jeden Monat Zeit spart, gibt es das hier zu kaufen.

Was du bekommst, ist bewusst klein: kein Alleskönner, sondern ein Werkzeug für genau eine Aufgabe. Was es nicht kann, steht in jeder Produktbeschreibung ausdrücklich dabei — mir ist lieber, du kaufst es nicht, als dass du dich hinterher ärgerst.

Wenn etwas nicht funktioniert oder du eine Frage hast: Schreib mir. Hinter diesem Shop steckt kein Support-Team, sondern eine Person, die selbst Rechnungen schreibt.
```

### 26. Richtlinien und Impressum

Unter „Shop-Richtlinien". Das Impressumsfeld heißt bei Etsy **„Rechtliche Informationen des Verkäufers"** — dort gehören Name, Anschrift und E-Mail hinein.

**Rückgabe und Umtausch:**

```
Digitale Downloads können nach dem Herunterladen nicht zurückgegeben oder umgetauscht werden.

Sollte eine Datei nicht funktionieren oder etwas nicht wie beschrieben sein, melde dich bitte — ich helfe weiter oder erstatte den Kaufpreis.
```

### 27. Nachricht nach dem Kauf hinterlegen

Unter „Info & Darstellung" → „Nachricht an Käufer". Wer sofort loslegt, bewertet eher.

**Nachricht nach dem Kauf:**

```
Vielen Dank für deinen Kauf.

Deine Dateien stehen sofort unter "Käufe und Bewertungen" in deinem Etsy-Konto bereit.

So startest du:
1. ZIP-Datei herunterladen und entpacken
2. Doppelklick auf rechnungsgenerator.html
3. Im Abschnitt "Absender & Stammdaten" einmal deine Daten eintragen

Beim Speichern als PDF: Im Druckdialog "Hintergrundgrafiken" aktivieren, sonst fehlt der Rahmen um die Zahlungshinweise.

Falls etwas nicht läuft oder du eine Frage hast, schreib mir einfach — ich antworte normalerweise am selben Tag.

Viele Grüße
Papierkramerei
```


---

## Zum Schluss

Zwei Einstellungen und der eigentlich wichtigste Schritt.

### 28. Offsite Ads eingeschaltet lassen

Sie kosten **Provision nur bei Verkauf** (15 %). Ohne Verkauf keine Kosten — bezahlt aus dem Erlös eines Verkaufs, den es sonst nicht gegeben hätte.

### 29. Etsy Ads (Onsite) ausgeschaltet lassen

Die kosten **pro Klick**, auch ohne Verkauf. Ein Listing ohne Bewertungen konvertiert unter 1 % — ein Verkauf würde 25 bis 35 € kosten und 12,84 € einbringen.

> **Achtung:** Erst testen, wenn drei Punkte stimmen: fünf Bewertungen, Konversion über 2 %, und das Listing verkauft sich schon organisch.

### 30. Die ersten fünf Nutzer holen

Der wichtigste Schritt im ganzen Plan. Ein Listing ohne Bewertungen wird von Etsy kaum ausgespielt. Fünf Selbstständige aus deinem Umfeld anschreiben, die ZIP schenken, um eine ehrliche Rückmeldung bitten.

> **Achtung:** Keine Bewertungen kaufen, niemanden aus dem eigenen Haushalt bestellen lassen, nie um eine gute Bewertung bitten. Etsy erkennt das und sperrt Shops dafür — dann ist nicht das Listing weg, sondern der Shop.


---

## Dateiübersicht

| Etsy-Feld | Datei aus dem Repository |
|---|---|
| Fotos 1–6 | `assets/etsy/01-hero.png` … `06-lieferumfang.png` |
| Video | `assets/etsy/listing-video.mp4` |
| Digitale Datei (Verkauf) | `dist/rechnungsgenerator-kleinunternehmer-v1.0.0.zip` |
| Shop-Bild | `assets/etsy/shop-icon.png` |
| Shop-Banner | `assets/etsy/shop-banner.png` |

Die ZIP liegt nicht im Repository — sie entsteht mit `./bauen.sh`.
