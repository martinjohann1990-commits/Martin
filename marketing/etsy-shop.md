# Etsy-Shop „Papierkramerei" — Einrichtung

Alles, was Etsy beim Anlegen des Shops abfragt. Das Listing selbst steht in
`etsy-listing.md`.

---

## Name

```
Papierkramerei
```

14 Zeichen. Etsy erlaubt 4–20, nur Buchstaben und Ziffern, keine Leerzeichen
und keine Umlaute.

**Vor dem Anlegen prüfen:** `etsy.com/shop/Papierkramerei` aufrufen — eine
Fehlerseite bedeutet, der Name ist frei. Nebenbei schauen, ob
`papierkramerei.de` noch zu haben ist; brauchst du jetzt nicht, aber später
nicht teuer zurückkaufen wollen.

Warum dieser Name: Er benennt das Problem in den Worten der Kundschaft
(„Papierkram"), die Endung `-erei` klingt nach Werkstatt statt nach Software,
und er trägt jedes weitere Produkt — Mahnung, Stundenzettel, Checklisten sind
alles Papierkram. Ein Name mit „Rechnung" darin hätte spätestens beim
Vorlagenpaket nicht mehr gepasst, und Etsy erlaubt Umbenennungen nach der
Eröffnung nur noch begrenzt.

---

## Shop-Titel

Die Zeile direkt unter dem Namen, maximal 55 Zeichen:

```
Werkzeuge gegen den Papierkram für Selbstständige
```

49 Zeichen. Sie sagt, für wen der Shop ist — nicht, was gerade darin liegt.

---

## Bilder

| Feld | Datei | Größe |
|---|---|---|
| Shop-Bild (Icon) | `assets/etsy/shop-icon.png` | 1000 × 1000 px |
| Banner | `assets/etsy/shop-banner.png` | 3200 × 800 px |

Beide werden mit `node marketing/listing-bilder.mjs` erzeugt, im selben Stil wie
die Listing-Bilder.

Das Shop-Bild ist ein helles „P" auf dunklem Grund: Etsy zeigt es als kleinen
Kreis, und heller Buchstabe auf dunklem Grund bleibt dort am längsten lesbar.
Im Banner steht neben dem Namen ein **lesbarer Ausschnitt** einer echten
Rechnung — eine ganze verkleinerte Seite wäre bei dieser Höhe nur Rauschen.

---

## Shop-Ankündigung

Erscheint oben im Shop. Kurz halten, sonst liest sie niemand:

```
Digitale Werkzeuge für alle, die nebenbei oder hauptberuflich selbstständig
sind: Rechnungen und Angebote schreiben, ohne dafür monatlich zu zahlen.
Einmal kaufen, dauerhaft nutzen. Bei Fragen schreib mir einfach — ich
antworte normalerweise am selben Tag.
```

Während des Einführungspreises stattdessen:

```
Einführungspreis bis [Datum]: Der Rechnungsgenerator kostet 9,90 € statt
14,90 €. Danach gilt der reguläre Preis. Bei Fragen schreib mir einfach.
```

---

## Über den Shop

Etsy nennt das „Shop-Story". Hier wird nicht verkauft, hier wird erklärt, warum
es das gibt. Das ist der Text, der aus einem anonymen Download einen Menschen
macht — und genau das kaufen Etsy-Käufer mit.

```
Angefangen hat das mit einer Word-Vorlage.

Ich bin selbst selbstständig und schreibe im Monat eine Handvoll Rechnungen.
Für ein Buchhaltungs-Abo mit Mahnwesen, Dashboard und Zeiterfassung war das
immer zu wenig — für die Word-Vorlage, in der ich jeden Betrag selbst
ausgerechnet habe, war es zu viel. Jedes Mal dieselbe Rechnerei, jedes Mal die
Frage, ob die Umsatzsteuer stimmt und ob ich eine Nummer doppelt vergeben habe.

Irgendwann habe ich mir das Werkzeug gebaut, das ich haben wollte: eine einzige
Datei, die sich per Doppelklick im Browser öffnet, alles ausrechnet und ein
sauberes PDF ausgibt. Ohne Installation, ohne Konto, ohne Abo — und ohne dass
meine Umsätze und Kundendaten irgendwo auf einem fremden Server landen.

Weil es mir seitdem jeden Monat Zeit spart, gibt es das hier zu kaufen.

Was du bekommst, ist bewusst klein: kein Alleskönner, sondern ein Werkzeug für
genau eine Aufgabe. Was es nicht kann, steht in jeder Produktbeschreibung
ausdrücklich dabei — mir ist lieber, du kaufst es nicht, als dass du dich
hinterher ärgerst.

Wenn etwas nicht funktioniert oder du eine Frage hast: Schreib mir. Hinter
diesem Shop steckt kein Support-Team, sondern eine Person, die selbst
Rechnungen schreibt.
```

Diesen Text vor dem Einstellen einmal durchgehen und an deine Situation
anpassen — er ist als Gerüst gedacht, nicht als Behauptung über dich. Wenn du
zum Beispiel hauptberuflich angestellt bist und nebenbei selbstständig, schreib
das ruhig so. Etsy-Käufer merken, ob eine Geschichte stimmt.

---

## Shop-Einstellungen

| Feld | Wert |
|---|---|
| Sprache | Deutsch |
| Land | Deutschland |
| Währung | Euro (EUR) |
| Shop-Typ | Verkäufer mit eigenen digitalen Produkten |

---

## Shop-Richtlinien

**Digitale Downloads**

```
Alle Artikel in diesem Shop sind digitale Downloads. Nach dem Kauf stehen die
Dateien sofort in deinem Etsy-Konto unter „Käufe und Bewertungen" bereit. Es
wird nichts versendet.
```

**Rückgabe und Umtausch**

```
Digitale Downloads können nach dem Herunterladen nicht zurückgegeben oder
umgetauscht werden.

Sollte eine Datei nicht funktionieren oder etwas nicht wie beschrieben sein,
melde dich bitte — ich helfe weiter oder erstatte den Kaufpreis.
```

Die freiwillige Erstattungszusage kostet erfahrungsgemäß fast nie etwas und
nimmt beim Kauf die letzte Hemmung.

**Datenschutz**

```
Für den Kauf werden nur die Daten verarbeitet, die Etsy zur Abwicklung
benötigt. Die verkauften Werkzeuge selbst verarbeiten keine Daten: Sie laufen
ausschließlich lokal im Browser des Käufers und übertragen nichts ins Internet.
```

**Rechtliche Informationen des Verkäufers**

Hier gehört dein Impressum hinein: Name, Anschrift, E-Mail-Adresse und,
soweit vorhanden, Umsatzsteuer-Identifikationsnummer. Das Feld findest du
unter *Shop-Manager → Einstellungen → Richtlinien*.

Pflicht, sobald du gewerblich verkaufst — und das tust du hier. Fehlt es, ist
das ein Abmahnrisiko.

---

## Häufige Fragen (Etsy-FAQ im Shop)

Etsy erlaubt eigene Fragen und Antworten in den Richtlinien. Vier, die sich
lohnen:

**Wie bekomme ich meine Datei nach dem Kauf?**
> Sofort. Die Dateien liegen in deinem Etsy-Konto unter „Käufe und
> Bewertungen". Zusätzlich schickt Etsy dir eine E-Mail.

**Brauche ich ein bestimmtes Programm?**
> Nein, nur einen aktuellen Browser. Windows, Mac, Linux und Tablets
> funktionieren gleichermaßen. Es wird nichts installiert.

**Funktioniert das auch ohne Internet?**
> Ja. Nach dem Herunterladen brauchst du keine Verbindung mehr. Deine Daten
> bleiben auf deinem Gerät.

**Ist das eine Steuerberatung?**
> Nein. Die Werkzeuge helfen beim Erstellen von Belegen und weisen auf
> fehlende Pflichtangaben hin. Was steuerlich für dich gilt, klärst du mit
> deinem Steuerberater oder dem Finanzamt.

---

## Was in den Namen nicht hineingehört

Kein „Steuer", kein „Kanzlei", keine Anlehnung an bestehende Anbieter.
Steuerberatung ist in Deutschland nach dem Steuerberatungsgesetz geschützt —
ein Shopname wie „Steuerhelfer" kann als unbefugte Hilfeleistung in
Steuersachen ausgelegt werden. „Papierkramerei" beschreibt Papierkram, nicht
Steuerberatung, und bleibt damit auf der sicheren Seite.
