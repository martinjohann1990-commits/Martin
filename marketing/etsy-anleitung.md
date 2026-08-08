# Etsy-Listing anlegen — Klickstrecke

Jeder Schritt in der Reihenfolge, in der Etsy danach fragt. Die abhakbare
Fassung mit Kopierknöpfen erzeugt `node marketing/etsy-anleitung.mjs`
nach `dist/etsy-anleitung.html`.

Die Feldinhalte im Einzelnen stehen in `etsy-listing.md` und `etsy-shop.md`.

---

## Vorbereitung

Bevor du Etsy überhaupt öffnest. Dauert zehn Minuten und erspart dir, mitten im Anlegen abbrechen zu müssen.

### 1. Verkaufsdatei bereitlegen

**Kein Terminal nötig.** Die fertige Datei `rechnungsgenerator-kleinunternehmer-v1.0.0.zip` (22 kB) liegt bereits vor — herunterladen und auf den Schreibtisch legen. **Das ist die Datei, die der Käufer bekommt.**

> Nur wenn du am Produkt etwas geändert hast, muss die ZIP neu gebaut werden: Repository klonen, im Ordner `./bauen.sh` ausführen (Mac und Linux im Terminal, Windows in Git Bash oder WSL). Solange sich nichts ändert, ist das nicht nötig.

### 2. Paket selbst testen

ZIP entpacken und per Doppelklick auf `rechnungsgenerator.html` öffnen — am besten in einem **privaten Fenster**, damit du es so erlebst wie ein Käufer beim ersten Mal. Einmal eine Rechnung schreiben und als PDF speichern.

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
| `rechnungsgenerator-…-v1.0.0.zip` | die Datei zum Verkaufen |
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

### 13. „Wie wird dieser digitale Inhalt erstellt?“

**Mit einem KI-Generator** auswählen. Code, Listing-Texte, Bilder und Video sind von einer KI erzeugt worden — Etsys Formulierung lautet „mit Hilfe eines KI-Generators", und genau das trifft zu.

> **Achtung:** „Von mir geschaffen" wäre eine Falschangabe. Etsy sanktioniert nicht die Offenlegung, sondern das Verschweigen — und im schlimmsten Fall trifft es nicht das Listing, sondern den Shop.

> Praktisch wirkt die Kennzeichnung dort, wo Käufer Handarbeit erwarten — bei Kunstdrucken, Illustrationen, Schmuck. Bei einem Werkzeug zählt, ob es rechnet und ob das PDF sauber aussieht. Optional kannst du es offen in die Beschreibung schreiben („entwickelt mit KI-Unterstützung, geprüft mit 85 automatischen Tests im echten Browser"); bei Software ist das eher ein Vertrauenspunkt.

### 14. Kategorie wählen

Papier & Party → Papier → Kalender & Planer → Vorlagen. Falls Etsy die Pfade umbenannt hat: Hauptsache eine Vorlagen-Kategorie.

### 15. Art des Angebots: Digitaler Download

Unbedingt **„Digitaler Download"** wählen, nicht „Physischer Artikel".

> **Achtung:** Nur mit dieser Einstellung liefert Etsy die Datei automatisch aus, und nur dann greift der Ausschluss vom Widerrufsrecht.

### 16. Beschreibung einfügen

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

Es handelt sich um einen digitalen Inhalt. Ihr Widerrufsrecht erlischt, sobald Sie ausdrücklich zugestimmt haben, dass mit der Bereitstellung vor Ablauf der Widerrufsfrist begonnen wird, Sie Ihre Kenntnis vom Verlust des Widerrufsrechts bestätigt haben und die Bereitstellung begonnen hat. Die vollständige Widerrufsbelehrung finden Sie in den Shop-Richtlinien.

Unabhängig davon: Wenn eine Datei nicht funktioniert oder etwas nicht wie beschrieben ist, melden Sie sich bitte. Ich helfe weiter oder erstatte den Kaufpreis.
```

### 17. Warenkorb-Zusammenfassung

Ein bis zwei Sätze, höchstens 200 Zeichen. Etsy zeigt diese Zeile im **Warenkorb und beim Bezahlen** — oft das Letzte, was jemand vor dem Kauf liest. Deshalb steht darin, was man bekommt und in welcher Form, nicht warum es gut ist.

> Falls du es sachlicher magst: „Digitaler Sofort-Download: Rechnungsgenerator als einzelne HTML-Datei für Windows, Mac und Linux. Rechnung, Angebot und Storno als PDF, § 19 UStG inklusive. Einmal zahlen, kein Abo." (181 Zeichen)

**Warenkorb-Zusammenfassung (188 Zeichen):**

```
Rechnungen, Angebote und Stornos als PDF – erstellt mit einer einzigen HTML-Datei, die offline im Browser läuft. Mit § 19 UStG, 19 % und 7 %. Sofort-Download, kein Abo, keine Installation.
```

### 18. Preis und Anzahl

**Preis: 9,90 €** als Einführungspreis für die ersten zwei Wochen oder zehn Verkäufe. Danach auf 14,90 € anheben. **Anzahl: 999.**

**Preis:**

```
9,90
```

**Anzahl:**

```
999
```

### 19. Alle 13 Schlagwörter setzen

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

### 20. Materialien angeben

Vier Einträge, ebenfalls einzeln:

```
HTML-Datei
Digitaler Download
PDF-Ausgabe
Vorlage
```

### 21. Die Verkaufsdatei hochladen

**Die ZIP-Datei, nicht die einzelnen Dateien.** So bleibt die Anleitung beim Werkzeug. Etsy erlaubt bis zu fünf Dateien à 20 MB — das Paket liegt bei rund 22 kB.

| Datei | Wofür |
|---|---|
| `rechnungsgenerator-kleinunternehmer-v1.0.0.zip` | aus dem Ordner dist/ |

### 22. Shop-Abteilung: „Keine“

Abteilungen sind eine Navigationshilfe — mit einem einzigen Artikel gibt es nichts zu navigieren. Eine Abteilung „Rechnungen (1)“ wirkt dünner als gar keine.

> Sobald das zweite Produkt online ist, lohnt sich die Einteilung: **Rechnung & Angebot** (Rechnungsgenerator), **Mahnung & Nachweise** (Vorlagenpaket), **Sparpakete** (Bundle). Benannt nach der Aufgabe, nicht nach dem Dateiformat — so suchen Leute. Anlegen unter Shop-Manager → Einträge → Abteilungen; bestehende Listings lassen sich jederzeit zuordnen.

### 23. Personalisierung ausschalten

Nicht aktivieren. Es gibt nichts zu personalisieren, und aktiviert erzeugt es nur Rückfragen.

### 24. Ins Schaufenster stellen: an

Das Schaufenster ist die hervorgehobene Reihe oben auf der Shop-Seite, mit größeren Kacheln als im Raster darunter. Ein leeres Schaufenster wirkt unfertig.

> Bei einem einzigen Artikel entsteht eine kleine Doppelung — er steht oben im Schaufenster und nochmal im Raster. Das wiegt weniger als der prominente Platz. Ab dem zweiten Produkt löst es sich auf; Etsy erlaubt bis zu vier Artikel im Schaufenster, das geplante Sortiment passt vollständig hinein.

### 25. Vorschau ansehen, dann veröffentlichen

Vor dem Klick auf „Veröffentlichen" einmal die Vorschau prüfen: Steht das richtige Bild auf Platz 1? Ist die Beschreibung vollständig? Sind alle 13 Tags gesetzt?


---

## Shop-Profil vervollständigen

Geht erst, wenn der Shop existiert. Unter Shop-Manager → Shop-Einstellungen. Zwanzig Minuten, die sich unmittelbar auszahlen — ein leeres Profil kostet Vertrauen.

### 26. Shop-Bild und Banner hochladen

Unter „Shop-Darstellung" bzw. „Design".

| Datei | Wofür |
|---|---|
| `shop-icon.png` | Shop-Bild — wird als kleiner Kreis gezeigt |
| `shop-banner.png` | Banner — die breite Fläche oben |

### 27. Shop-Titel eintragen

Die Zeile direkt unter dem Namen, 49 von 55 erlaubten Zeichen. Sie sagt, für wen der Shop ist — nicht, was gerade darin liegt.

**Shop-Titel:**

```
Werkzeuge gegen den Papierkram für Selbstständige
```

### 28. Ankündigung setzen

Erscheint oben im Shop. Während des Einführungspreises die zweite Fassung nehmen und das Datum eintragen.

**Ankündigung (regulär):**

```
Digitale Werkzeuge für alle, die nebenbei oder hauptberuflich selbstständig sind: Rechnungen und Angebote schreiben, ohne dafür monatlich zu zahlen. Einmal kaufen, dauerhaft nutzen. Bei Fragen schreib mir einfach — ich antworte normalerweise am selben Tag.
```

**Ankündigung (Einführungspreis):**

```
Einführungspreis bis [Datum]: Der Rechnungsgenerator kostet 9,90 € statt 14,90 €. Danach gilt der reguläre Preis. Bei Fragen schreib mir einfach.
```

### 29. Shop-Story schreiben

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

### 30. Verkäuferstatus in der EU: „Händler“

Etsy stellt standardmäßig auf **Privatperson** — das ist hier falsch. Wer planmäßig und mit Gewinnerzielungsabsicht ein Produkt anbietet, ist gewerblicher Verkäufer. Nicht die Umsatzhöhe entscheidet, sondern wofür du handelst.

> **Achtung:** Als vermeintliche Privatperson entfallen Impressumspflicht und Widerrufsbelehrung — genau die Rechte, die dem Käufer zustehen. Das ist der klassische Abmahngrund im deutschen Onlinehandel, und abgemahnt wird von Mitbewerbern und Verbraucherschutzverbänden, nicht von Etsy.

> Danach fragt Etsy die Impressumsangaben ab: vollständiger Name (kein Fantasiename — „Papierkramerei" ist der Shop, nicht der Verkäufer), ladungsfähige Anschrift ohne Postfach, E-Mail, USt-IdNr. falls vorhanden. Die Anschrift ist öffentlich sichtbar; wer von zu Hause arbeitet, veröffentlicht damit die Privatadresse. Fehlt noch die Gewerbeanmeldung, gehört sie hierhin — nicht die Wahl von „Privatperson".

### 31. Impressum eintragen

Unter <em>Einstellungen → Info und Ansicht → Abschnitt „Impressum"</em>. Platzhalter in eckigen Klammern ersetzen.

> **Achtung:** Nicht „TMG“ schreiben — die Impressumspflicht steht seit Mai 2024 in § 5 DDG. Und keinen Link zur EU-Streitbeilegungsplattform aufnehmen: Die wurde zum 20. Juli 2025 eingestellt, viele kursierende Vorlagen enthalten ihn noch.

**Impressum:**

```
Angaben gemäß § 5 DDG

[Vorname Nachname]
[Straße und Hausnummer]
[PLZ] [Ort]
Deutschland

Kontakt
E-Mail: [E-Mail-Adresse]
Telefon: [Telefonnummer]

Umsatzsteuer
Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen.

Verantwortlich für den Inhalt
[Vorname Nachname], Anschrift wie oben

Verbraucherstreitbeilegung
Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor
einer Verbraucherschlichtungsstelle teilzunehmen.
```

### 32. Widerrufsbelehrung eintragen

Im **Impressum-Bereich** unter <em>„Füge mehr Infos für Käufer:innen hinzu"</em> — das ist der einzige Ort im Shop, an dem längere Rechtstexte hineinpassen. Die Belehrungspflicht besteht **unabhängig davon**, ob das Widerrufsrecht später erlischt. Fehlt sie, verlängert sich die Frist auf bis zu zwölf Monate und 14 Tage. Das Muster-Widerrufsformular gehört dazu.

> **Achtung:** Nicht unter „AGB-Einstellungen → Rückgaben & Umtausch“ suchen. Dahinter liegt kein Textfeld, sondern ein Formular mit Schaltern (nächster Schritt).

> Prüfe an einer Testbestellung, ob Etsys Kasse die Zustimmung nach § 356 Abs. 5 BGB überhaupt einholt — also die ausdrückliche Zustimmung zum sofortigen Beginn <em>und</em> die Bestätigung, dass der Käufer dadurch sein Widerrufsrecht verliert. Tut sie es nicht, bleibt das Widerrufsrecht bestehen; eine gegenteilige Klausel wäre dann unwirksam und selbst abmahnfähig.

**Widerrufsbelehrung mit Muster-Formular:**

```
WIDERRUFSBELEHRUNG

Widerrufsrecht

Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.

Um Ihr Widerrufsrecht auszuüben, müssen Sie mir

  [Vorname Nachname]
  [Straße und Hausnummer]
  [PLZ] [Ort]
  E-Mail: [E-Mail-Adresse]

mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.

Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.

Folgen des Widerrufs

Wenn Sie diesen Vertrag widerrufen, habe ich Ihnen alle Zahlungen, die ich von Ihnen erhalten habe, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei mir eingegangen ist. Für diese Rückzahlung verwende ich dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.

Vorzeitiges Erlöschen des Widerrufsrechts

Ihr Widerrufsrecht erlischt vorzeitig, wenn ich mit der Ausführung des Vertrags begonnen habe, nachdem Sie ausdrücklich zugestimmt haben, dass ich mit der Ausführung vor Ablauf der Widerrufsfrist beginne, und Sie Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit Beginn der Ausführung des Vertrags Ihr Widerrufsrecht verlieren.

Ende der Widerrufsbelehrung


MUSTER-WIDERRUFSFORMULAR

(Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.)

An
[Vorname Nachname]
[Straße und Hausnummer]
[PLZ] [Ort]
E-Mail: [E-Mail-Adresse]

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*)

Bestellt am (*) / erhalten am (*)

Name des/der Verbraucher(s)

Anschrift des/der Verbraucher(s)

Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)

Datum

(*) Unzutreffendes streichen.
```

### 33. Lieferung, Gewährleistung und Zahlung ergänzen

Dasselbe Freitextfeld, direkt im Anschluss an die Widerrufsbelehrung. Auch für diese drei Angaben hat Etsy kein eigenes Feld — vorvertragliche Informationspflicht besteht trotzdem.

**Lieferung / Bereitstellung:**

```
Alle Artikel in diesem Shop sind digitale Downloads. Nach Zahlungseingang stehen die Dateien sofort in Ihrem Etsy-Konto unter „Käufe und Bewertungen" bereit. Es erfolgt kein Versand.
```

**Gewährleistung:**

```
Es gelten die gesetzlichen Regelungen zur Vertragsmäßigkeit digitaler Produkte (§§ 327 ff. BGB). Sollte das Produkt nicht wie beschrieben funktionieren, melden Sie sich bitte — ich stelle eine korrigierte Fassung bereit oder erstatte den Kaufpreis.
```

**Zahlung:**

```
Die Zahlung wird über Etsy Payments abgewickelt. Der angegebene Preis ist der Endpreis. Als Kleinunternehmer gemäß § 19 UStG weise ich keine Umsatzsteuer aus.
```

### 34. Reiter „Rückgaben &amp; Umtausch“ — Schalter setzen

Unter <em>Einstellungen → AGB-Einstellungen</em>. Hier gibt es **nichts einzutragen**: Das Formular ist für Pakete gebaut und kennt nur Schalter. **Rückgaben an**, **Umtausch aus**, Zeitrahmen **30 Tage nach der Lieferung**, dann „Speichern und anwenden“.

> **Achtung:** Beide Schalter aus wäre der schlechteste Fall: Etsy zeigt dann „Keine Rückgaben oder Umtausch“ auf der Artikelseite — genau die Aussage, die als pauschaler Ausschluss gelesen wird.

> Rückgaben an, weil das der freiwilligen Erstattungszusage entspricht — großzügiger als das Gesetz ist nie abmahnfähig. Umtausch aus, weil ein Tausch gegen einen anderen Artikel bei einer Datei nicht erfüllbar ist. Der automatisch erscheinende Punkt „Käufer trägt die Rücksendekosten“ läuft bei einem Download ins Leere.

```
Rückgaben: an
Umtausch: aus
30 Tage
```

### 35. Reiter „Stornierungen“

Unter <em>Einstellungen → AGB-Einstellungen</em>. Stornierungen sind bei sofort bereitgestellten Dateien praktisch nur vor dem Herunterladen möglich — das Widerrufsrecht bleibt davon unberührt.

**Stornierungen:**

```
Eine Stornierung ist möglich, solange die Datei noch nicht heruntergeladen wurde. Melden Sie sich in diesem Fall bitte über die Nachrichtenfunktion — ich storniere die Bestellung und erstatte den Kaufpreis.

Davon unberührt bleibt Ihr gesetzliches Widerrufsrecht; die vollständige Widerrufsbelehrung finden Sie in den Verkäuferinformationen dieses Shops.
```

### 36. Reiter „Datenschutz“

Ebenfalls unter <em>AGB-Einstellungen</em>.

> Der Reiter **„Feste AGB“** daneben ist schreibgeschützt und enthält Etsys Liefer- und Zollbedingungen. Für einen Shop mit ausschließlich digitalen Downloads ist er gegenstandslos — dort ist nichts einzutragen.

**Datenschutz:**

```
Für die Abwicklung des Kaufs werden nur die Daten verarbeitet, die Etsy mir zu diesem Zweck bereitstellt — insbesondere Name, Rechnungsanschrift und Bestelldaten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Die Daten werden für die Dauer der gesetzlichen Aufbewahrungsfristen gespeichert und nicht an Dritte weitergegeben.

Das verkaufte Produkt selbst verarbeitet keine Daten: Es läuft ausschließlich lokal im Browser des Käufers und überträgt nichts ins Internet.

Verantwortlich im Sinne der DSGVO: [Vorname Nachname], Anschrift wie im Impressum. Für die Verarbeitung auf der Plattform ist Etsy verantwortlich; es gilt deren Datenschutzerklärung.
```

### 37. Nachricht nach dem Kauf hinterlegen

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

### 38. Offsite Ads eingeschaltet lassen

Sie kosten **Provision nur bei Verkauf** (15 %). Ohne Verkauf keine Kosten — bezahlt aus dem Erlös eines Verkaufs, den es sonst nicht gegeben hätte.

### 39. Etsy Ads (Onsite) ausgeschaltet lassen

Die kosten **pro Klick**, auch ohne Verkauf. Ein Listing ohne Bewertungen konvertiert unter 1 % — ein Verkauf würde 25 bis 35 € kosten und 12,84 € einbringen.

> **Achtung:** Erst testen, wenn drei Punkte stimmen: fünf Bewertungen, Konversion über 2 %, und das Listing verkauft sich schon organisch.

### 40. Die ersten fünf Nutzer holen

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

Die ZIP liegt nicht im Repository, weil sie ein Bauergebnis ist. Sie wurde
bereits erzeugt und ausgeliefert — neu bauen musst du sie nur, wenn sich am
Produkt etwas ändert (`./bauen.sh`).
