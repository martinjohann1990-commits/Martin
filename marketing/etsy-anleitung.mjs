/*
 * Erzeugt die Klickstrecke zum Anlegen des Etsy-Listings — zweimal aus
 * derselben Quelle, damit beide Fassungen nicht auseinanderlaufen:
 *
 *   marketing/etsy-anleitung.md   zum Lesen und Suchen im Repository
 *   dist/etsy-anleitung.html      zum Abhaken neben dem Etsy-Fenster,
 *                                 mit Kopierknopf für jedes Feld
 *
 * Ausführen:  node marketing/etsy-anleitung.mjs
 */
import { writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(join(wurzel, 'dist'), { recursive: true });

/* =========================================================
   Inhalt — eine Quelle für beide Ausgaben
   ========================================================= */

const BESCHREIBUNG = `Rechnungen schreiben, ohne jeden Monat dafür zu zahlen.

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

Da es sich um ein digitales Produkt handelt, das sofort heruntergeladen werden kann, ist eine Rückgabe nach dem Download nicht möglich. Wenn etwas nicht funktioniert oder du eine Frage hast: Schreib mir einfach. Ich antworte normalerweise am selben Tag und finde eine Lösung.`;

const STORY = `Angefangen hat das mit einer Word-Vorlage.

Ich bin selbst selbstständig und schreibe im Monat eine Handvoll Rechnungen. Für ein Buchhaltungs-Abo mit Mahnwesen, Dashboard und Zeiterfassung war das immer zu wenig — für die Word-Vorlage, in der ich jeden Betrag selbst ausgerechnet habe, war es zu viel. Jedes Mal dieselbe Rechnerei, jedes Mal die Frage, ob die Umsatzsteuer stimmt und ob ich eine Nummer doppelt vergeben habe.

Irgendwann habe ich mir das Werkzeug gebaut, das ich haben wollte: eine einzige Datei, die sich per Doppelklick im Browser öffnet, alles ausrechnet und ein sauberes PDF ausgibt. Ohne Installation, ohne Konto, ohne Abo — und ohne dass meine Umsätze und Kundendaten irgendwo auf einem fremden Server landen.

Weil es mir seitdem jeden Monat Zeit spart, gibt es das hier zu kaufen.

Was du bekommst, ist bewusst klein: kein Alleskönner, sondern ein Werkzeug für genau eine Aufgabe. Was es nicht kann, steht in jeder Produktbeschreibung ausdrücklich dabei — mir ist lieber, du kaufst es nicht, als dass du dich hinterher ärgerst.

Wenn etwas nicht funktioniert oder du eine Frage hast: Schreib mir. Hinter diesem Shop steckt kein Support-Team, sondern eine Person, die selbst Rechnungen schreibt.`;

const abschnitte = [
  {
    titel: 'Vorbereitung',
    hinweis: 'Bevor du Etsy überhaupt öffnest. Dauert zehn Minuten und erspart dir, mitten im Anlegen abbrechen zu müssen.',
    schritte: [
      { t: 'Verkaufsdatei bereitlegen',
        b: '<strong>Kein Terminal nötig.</strong> Die fertige Datei <code>rechnungsgenerator-kleinunternehmer-v1.0.0.zip</code> (22 kB) liegt bereits vor — herunterladen und auf den Schreibtisch legen. <strong>Das ist die Datei, die der Käufer bekommt.</strong>',
        hinweisBox: 'Nur wenn du am Produkt etwas geändert hast, muss die ZIP neu gebaut werden: Repository klonen, im Ordner <code>./bauen.sh</code> ausführen (Mac und Linux im Terminal, Windows in Git Bash oder WSL). Solange sich nichts ändert, ist das nicht nötig.' },
      { t: 'Paket selbst testen',
        b: 'ZIP entpacken und per Doppelklick auf <code>rechnungsgenerator.html</code> öffnen — am besten in einem <strong>privaten Fenster</strong>, damit du es so erlebst wie ein Käufer beim ersten Mal. Einmal eine Rechnung schreiben und als PDF speichern.' },
      { t: 'Alle Dateien griffbereit legen',
        b: 'Kopiere dir diese Dateien in einen Ordner auf den Schreibtisch — du brauchst sie gleich alle:',
        dateien: [
          ['assets/etsy/01-hero.png', 'Listing-Bild 1'],
          ['assets/etsy/02-funktionen.png', 'Listing-Bild 2'],
          ['assets/etsy/03-paragraf19.png', 'Listing-Bild 3'],
          ['assets/etsy/04-so-gehts.png', 'Listing-Bild 4'],
          ['assets/etsy/05-editor.png', 'Listing-Bild 5'],
          ['assets/etsy/06-lieferumfang.png', 'Listing-Bild 6'],
          ['assets/etsy/listing-video.mp4', 'Listing-Video'],
          ['rechnungsgenerator-…-v1.0.0.zip', 'die Datei zum Verkaufen'],
          ['assets/etsy/shop-icon.png', 'Shop-Bild'],
          ['assets/etsy/shop-banner.png', 'Shop-Banner']
        ] },
      { t: 'Shopnamen auf Verfügbarkeit prüfen',
        b: 'Rufe <code>etsy.com/shop/Papierkramerei</code> auf. Eine Fehlerseite bedeutet: frei. Erscheint ein Shop, brauchst du einen anderen Namen.' },
      { t: 'Rechtliches klären',
        b: 'Gewerbe angemeldet oder als Freiberufler beim Finanzamt geführt? Impressumsangaben (Name, Anschrift, E-Mail) bereitgelegt? Beides brauchst du gleich.',
        warnung: 'Regelmäßiger Verkauf digitaler Produkte ist gewerblich — auch nebenbei. Ein fehlendes Impressum ist der häufigste Abmahngrund bei kleinen Shops.' }
    ]
  },
  {
    titel: 'Konto und Shop anlegen',
    hinweis: 'Etsy führt dich durch einen Assistenten. Er verlangt mitten im Ablauf das erste Listing — deshalb kommen Teil 2 und Teil 3 hier durcheinander vor. Das ist normal.',
    schritte: [
      { t: 'Verkäuferkonto eröffnen',
        b: 'Auf <code>etsy.com/sell</code> gehen und dem Assistenten folgen. Ein bestehendes Käuferkonto kann man weiterverwenden.' },
      { t: 'Shop-Einstellungen setzen',
        b: 'Sprache <strong>Deutsch</strong>, Land <strong>Deutschland</strong>, Währung <strong>Euro (EUR)</strong>.',
        warnung: 'Die Sprache lässt sich später nur mühsam ändern. Jetzt richtig setzen.' },
      { t: 'Shopnamen eingeben',
        b: 'Der Name, den du eben geprüft hast:',
        kopieren: [['Shopname', 'Papierkramerei']] }
    ]
  },
  {
    titel: 'Das Listing anlegen',
    hinweis: 'Die Felder in der Reihenfolge, in der Etsy sie abfragt. Jeder Text hat einen Kopierknopf.',
    schritte: [
      { t: 'Fotos hochladen — in dieser Reihenfolge',
        b: 'Die Reihenfolge ist nicht beliebig: Bild 1 entscheidet, ob jemand aus der Suchergebnisliste überhaupt klickt.',
        dateien: [
          ['01-hero.png', 'Platz 1 — die Behauptung plus fertige Rechnung'],
          ['02-funktionen.png', 'Platz 2 — kann es, was ich brauche?'],
          ['03-paragraf19.png', 'Platz 3 — das Kaufargument der Zielgruppe'],
          ['04-so-gehts.png', 'Platz 4 — nimmt die Angst vor der Einrichtung'],
          ['05-editor.png', 'Platz 5 — die Bedienung'],
          ['06-lieferumfang.png', 'Platz 6 — räumt letzte Zweifel aus']
        ] },
      { t: 'Video hochladen',
        b: 'Im selben Bereich wie die Fotos, eigener Platz. <code>listing-video.mp4</code> — 10,5 Sekunden, ohne Ton. Etsy bevorzugt Listings mit Video in der Suche.' },
      { t: 'Titel eintragen',
        b: '118 von 140 erlaubten Zeichen. Die vorderen Wörter wiegen bei Etsy am schwersten, deshalb steht die Suchanfrage vorn und das Verkaufsargument hinten.',
        kopieren: [['Titel', 'Rechnungsvorlage Kleinunternehmer § 19 UStG | Rechnung & Angebot als PDF | Ohne Abo, offline nutzbar | Sofort-Download']] },
      { t: '„Über dieses Produkt" — drei Auswahlfelder',
        b: '<strong>Wer hat es gemacht?</strong> Ich selbst · <strong>Was ist es?</strong> Ein fertiges Produkt · <strong>Wann?</strong> 2020 – 2026' },
      { t: '„Wie wird dieser digitale Inhalt erstellt?“',
        b: '<strong>Mit einem KI-Generator</strong> auswählen. Code, Listing-Texte, Bilder und Video sind von einer KI erzeugt worden — Etsys Formulierung lautet „mit Hilfe eines KI-Generators", und genau das trifft zu.',
        warnung: '„Von mir geschaffen" wäre eine Falschangabe. Etsy sanktioniert nicht die Offenlegung, sondern das Verschweigen — und im schlimmsten Fall trifft es nicht das Listing, sondern den Shop.',
        hinweisBox: 'Praktisch wirkt die Kennzeichnung dort, wo Käufer Handarbeit erwarten — bei Kunstdrucken, Illustrationen, Schmuck. Bei einem Werkzeug zählt, ob es rechnet und ob das PDF sauber aussieht. Optional kannst du es offen in die Beschreibung schreiben („entwickelt mit KI-Unterstützung, geprüft mit 85 automatischen Tests im echten Browser"); bei Software ist das eher ein Vertrauenspunkt.' },
      { t: 'Kategorie wählen',
        b: 'Papier &amp; Party → Papier → Kalender &amp; Planer → Vorlagen. Falls Etsy die Pfade umbenannt hat: Hauptsache eine Vorlagen-Kategorie.' },
      { t: 'Art des Angebots: Digitaler Download',
        b: 'Unbedingt <strong>„Digitaler Download"</strong> wählen, nicht „Physischer Artikel".',
        warnung: 'Nur mit dieser Einstellung liefert Etsy die Datei automatisch aus, und nur dann greift der Ausschluss vom Widerrufsrecht.' },
      { t: 'Beschreibung einfügen',
        b: 'Der komplette Text. Etsy nimmt keine Formatierung — Absätze und Großbuchstaben tragen die Gliederung.',
        kopieren: [['Beschreibung', BESCHREIBUNG]] },
      { t: 'Warenkorb-Zusammenfassung',
        b: 'Ein bis zwei Sätze, höchstens 200 Zeichen. Etsy zeigt diese Zeile im <strong>Warenkorb und beim Bezahlen</strong> — oft das Letzte, was jemand vor dem Kauf liest. Deshalb steht darin, was man bekommt und in welcher Form, nicht warum es gut ist.',
        kopieren: [['Warenkorb-Zusammenfassung (188 Zeichen)', 'Rechnungen, Angebote und Stornos als PDF – erstellt mit einer einzigen HTML-Datei, die offline im Browser läuft. Mit § 19 UStG, 19 % und 7 %. Sofort-Download, kein Abo, keine Installation.']],
        hinweisBox: 'Falls du es sachlicher magst: „Digitaler Sofort-Download: Rechnungsgenerator als einzelne HTML-Datei für Windows, Mac und Linux. Rechnung, Angebot und Storno als PDF, § 19 UStG inklusive. Einmal zahlen, kein Abo." (181 Zeichen)' },
      { t: 'Preis und Anzahl',
        b: '<strong>Preis: 9,90 €</strong> als Einführungspreis für die ersten zwei Wochen oder zehn Verkäufe. Danach auf 14,90 € anheben. <strong>Anzahl: 999.</strong>',
        kopieren: [['Preis', '9,90'], ['Anzahl', '999']] },
      { t: 'Alle 13 Schlagwörter setzen',
        b: 'Ungenutzte Plätze sind verschenkte Sichtbarkeit. Einzeln eintragen — Etsy nimmt keine Liste auf einmal. Drei stehen bewusst ohne Umlaut, weil Etsys Suche „ä" und „ae" nicht zuverlässig gleich behandelt.',
        etiketten: ['Rechnungsvorlage','Kleinunternehmer','Rechnung erstellen','Angebot Vorlage','Selbststaendig','Freelancer Tool','Buchhaltung Hilfe','Umsatzsteuer','Existenzgruendung','Rechnung PDF','Nebengewerbe','Gruendung Set','Paragraph 19 UStG'] },
      { t: 'Materialien angeben',
        b: 'Vier Einträge, ebenfalls einzeln:',
        etiketten: ['HTML-Datei','Digitaler Download','PDF-Ausgabe','Vorlage'] },
      { t: 'Die Verkaufsdatei hochladen',
        b: '<strong>Die ZIP-Datei, nicht die einzelnen Dateien.</strong> So bleibt die Anleitung beim Werkzeug. Etsy erlaubt bis zu fünf Dateien à 20 MB — das Paket liegt bei rund 22 kB.',
        dateien: [['rechnungsgenerator-kleinunternehmer-v1.0.0.zip', 'aus dem Ordner dist/']] },
      { t: 'Shop-Abteilung: „Keine“',
        b: 'Abteilungen sind eine Navigationshilfe — mit einem einzigen Artikel gibt es nichts zu navigieren. Eine Abteilung „Rechnungen (1)“ wirkt dünner als gar keine.',
        hinweisBox: 'Sobald das zweite Produkt online ist, lohnt sich die Einteilung: <strong>Rechnung &amp; Angebot</strong> (Rechnungsgenerator), <strong>Mahnung &amp; Nachweise</strong> (Vorlagenpaket), <strong>Sparpakete</strong> (Bundle). Benannt nach der Aufgabe, nicht nach dem Dateiformat — so suchen Leute. Anlegen unter Shop-Manager → Einträge → Abteilungen; bestehende Listings lassen sich jederzeit zuordnen.' },
      { t: 'Personalisierung ausschalten',
        b: 'Nicht aktivieren. Es gibt nichts zu personalisieren, und aktiviert erzeugt es nur Rückfragen.' },
      { t: 'Vorschau ansehen, dann veröffentlichen',
        b: 'Vor dem Klick auf „Veröffentlichen" einmal die Vorschau prüfen: Steht das richtige Bild auf Platz 1? Ist die Beschreibung vollständig? Sind alle 13 Tags gesetzt?' }
    ]
  },
  {
    titel: 'Shop-Profil vervollständigen',
    hinweis: 'Geht erst, wenn der Shop existiert. Unter Shop-Manager → Shop-Einstellungen. Zwanzig Minuten, die sich unmittelbar auszahlen — ein leeres Profil kostet Vertrauen.',
    schritte: [
      { t: 'Shop-Bild und Banner hochladen',
        b: 'Unter „Shop-Darstellung" bzw. „Design".',
        dateien: [
          ['shop-icon.png', 'Shop-Bild — wird als kleiner Kreis gezeigt'],
          ['shop-banner.png', 'Banner — die breite Fläche oben']
        ] },
      { t: 'Shop-Titel eintragen',
        b: 'Die Zeile direkt unter dem Namen, 49 von 55 erlaubten Zeichen. Sie sagt, für wen der Shop ist — nicht, was gerade darin liegt.',
        kopieren: [['Shop-Titel', 'Werkzeuge gegen den Papierkram für Selbstständige']] },
      { t: 'Ankündigung setzen',
        b: 'Erscheint oben im Shop. Während des Einführungspreises die zweite Fassung nehmen und das Datum eintragen.',
        kopieren: [
          ['Ankündigung (regulär)', 'Digitale Werkzeuge für alle, die nebenbei oder hauptberuflich selbstständig sind: Rechnungen und Angebote schreiben, ohne dafür monatlich zu zahlen. Einmal kaufen, dauerhaft nutzen. Bei Fragen schreib mir einfach — ich antworte normalerweise am selben Tag.'],
          ['Ankündigung (Einführungspreis)', 'Einführungspreis bis [Datum]: Der Rechnungsgenerator kostet 9,90 € statt 14,90 €. Danach gilt der reguläre Preis. Bei Fragen schreib mir einfach.']
        ] },
      { t: 'Shop-Story schreiben',
        b: 'Der Text, der aus einem anonymen Download einen Menschen macht.',
        warnung: 'Diesen Text vor dem Einfügen an deine Lage anpassen. Er ist als Gerüst gedacht — Etsy-Käufer merken, ob eine Geschichte stimmt, und eine erfundene schadet mehr als gar keine.',
        kopieren: [['Über den Shop', STORY]] },
      { t: 'Richtlinien und Impressum',
        b: 'Unter „Shop-Richtlinien". Das Impressumsfeld heißt bei Etsy <strong>„Rechtliche Informationen des Verkäufers"</strong> — dort gehören Name, Anschrift und E-Mail hinein.',
        kopieren: [['Rückgabe und Umtausch', 'Digitale Downloads können nach dem Herunterladen nicht zurückgegeben oder umgetauscht werden.\n\nSollte eine Datei nicht funktionieren oder etwas nicht wie beschrieben sein, melde dich bitte — ich helfe weiter oder erstatte den Kaufpreis.']] },
      { t: 'Nachricht nach dem Kauf hinterlegen',
        b: 'Unter „Info &amp; Darstellung" → „Nachricht an Käufer". Wer sofort loslegt, bewertet eher.',
        kopieren: [['Nachricht nach dem Kauf', 'Vielen Dank für deinen Kauf.\n\nDeine Dateien stehen sofort unter "Käufe und Bewertungen" in deinem Etsy-Konto bereit.\n\nSo startest du:\n1. ZIP-Datei herunterladen und entpacken\n2. Doppelklick auf rechnungsgenerator.html\n3. Im Abschnitt "Absender & Stammdaten" einmal deine Daten eintragen\n\nBeim Speichern als PDF: Im Druckdialog "Hintergrundgrafiken" aktivieren, sonst fehlt der Rahmen um die Zahlungshinweise.\n\nFalls etwas nicht läuft oder du eine Frage hast, schreib mir einfach — ich antworte normalerweise am selben Tag.\n\nViele Grüße\nPapierkramerei']] }
    ]
  },
  {
    titel: 'Zum Schluss',
    hinweis: 'Zwei Einstellungen und der eigentlich wichtigste Schritt.',
    schritte: [
      { t: 'Offsite Ads eingeschaltet lassen',
        b: 'Sie kosten <strong>Provision nur bei Verkauf</strong> (15 %). Ohne Verkauf keine Kosten — bezahlt aus dem Erlös eines Verkaufs, den es sonst nicht gegeben hätte.' },
      { t: 'Etsy Ads (Onsite) ausgeschaltet lassen',
        b: 'Die kosten <strong>pro Klick</strong>, auch ohne Verkauf. Ein Listing ohne Bewertungen konvertiert unter 1 % — ein Verkauf würde 25 bis 35 € kosten und 12,84 € einbringen.',
        warnung: 'Erst testen, wenn drei Punkte stimmen: fünf Bewertungen, Konversion über 2 %, und das Listing verkauft sich schon organisch.' },
      { t: 'Die ersten fünf Nutzer holen',
        b: 'Der wichtigste Schritt im ganzen Plan. Ein Listing ohne Bewertungen wird von Etsy kaum ausgespielt. Fünf Selbstständige aus deinem Umfeld anschreiben, die ZIP schenken, um eine ehrliche Rückmeldung bitten.',
        warnung: 'Keine Bewertungen kaufen, niemanden aus dem eigenen Haushalt bestellen lassen, nie um eine gute Bewertung bitten. Etsy erkennt das und sperrt Shops dafür — dann ist nicht das Listing weg, sondern der Shop.' }
    ]
  }
];

/* =========================================================
   Ausgabe 1: Markdown
   ========================================================= */
const strichHtml = s => String(s)
  .replace(/<code>/g,'`').replace(/<\/code>/g,'`')
  .replace(/<strong>/g,'**').replace(/<\/strong>/g,'**')
  .replace(/&amp;/g,'&');

let md = `# Etsy-Listing anlegen — Klickstrecke\n\n`;
md += `Jeder Schritt in der Reihenfolge, in der Etsy danach fragt. Die abhakbare\n`;
md += `Fassung mit Kopierknöpfen erzeugt \`node marketing/etsy-anleitung.mjs\`\n`;
md += `nach \`dist/etsy-anleitung.html\`.\n\n`;
md += `Die Feldinhalte im Einzelnen stehen in \`etsy-listing.md\` und \`etsy-shop.md\`.\n`;

let nr = 0;
for (const a of abschnitte) {
  md += `\n---\n\n## ${a.titel}\n\n${a.hinweis}\n\n`;
  for (const s of a.schritte) {
    nr++;
    md += `### ${nr}. ${s.t}\n\n${strichHtml(s.b)}\n\n`;
    if (s.warnung) md += `> **Achtung:** ${strichHtml(s.warnung)}\n\n`;
    if (s.hinweisBox) md += `> ${strichHtml(s.hinweisBox)}\n\n`;
    if (s.dateien) {
      md += `| Datei | Wofür |\n|---|---|\n`;
      for (const [d, w] of s.dateien) md += `| \`${d}\` | ${w} |\n`;
      md += `\n`;
    }
    if (s.etiketten) md += '```\n' + s.etiketten.join('\n') + '\n```\n\n';
    if (s.kopieren) for (const [name, wert] of s.kopieren) {
      md += `**${name}:**\n\n` + '```\n' + wert + '\n```\n\n';
    }
  }
}
md += `\n---\n\n## Dateiübersicht\n\n`;
md += `| Etsy-Feld | Datei aus dem Repository |\n|---|---|\n`;
md += `| Fotos 1–6 | \`assets/etsy/01-hero.png\` … \`06-lieferumfang.png\` |\n`;
md += `| Video | \`assets/etsy/listing-video.mp4\` |\n`;
md += `| Digitale Datei (Verkauf) | \`dist/rechnungsgenerator-kleinunternehmer-v1.0.0.zip\` |\n`;
md += `| Shop-Bild | \`assets/etsy/shop-icon.png\` |\n`;
md += `| Shop-Banner | \`assets/etsy/shop-banner.png\` |\n\n`;
md += `Die ZIP liegt nicht im Repository, weil sie ein Bauergebnis ist. Sie wurde\n`;
md += `bereits erzeugt und ausgeliefert — neu bauen musst du sie nur, wenn sich am\n`;
md += `Produkt etwas ändert (\`./bauen.sh\`).\n`;

await writeFile(join(wurzel, 'marketing', 'etsy-anleitung.md'), md);

/* =========================================================
   Ausgabe 2: abhakbare Seite
   ========================================================= */
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gesamt = abschnitte.reduce((n, a) => n + a.schritte.length, 0);

let i = 0;
const html = abschnitte.map(a => `
  <section>
    <h2>${esc(a.titel)}</h2>
    <p class="lead">${a.hinweis}</p>
    ${a.schritte.map(s => {
      i++;
      return `
      <div class="schritt" data-nr="${i}">
        <label class="kopf">
          <input type="checkbox" data-hak="${i}">
          <span class="nr">${i}</span>
          <span class="titel">${esc(s.t)}</span>
        </label>
        <div class="koerper">
          <p>${s.b}</p>
          ${s.warnung ? `<p class="warnung">${s.warnung}</p>` : ''}
          ${s.hinweisBox ? `<p class="nebenbei">${s.hinweisBox}</p>` : ''}
          ${s.dateien ? `<ul class="dateien">${s.dateien.map(([d,w]) =>
            `<li><code>${esc(d)}</code><span>${esc(w)}</span></li>`).join('')}</ul>` : ''}
          ${s.etiketten ? `<div class="etiketten">${s.etiketten.map(e =>
            `<button class="etikett" data-wert="${esc(e)}">${esc(e)}</button>`).join('')}</div>` : ''}
          ${(s.kopieren||[]).map(([name, wert]) => `
            <div class="feld">
              <div class="feld-kopf">
                <span>${esc(name)}</span>
                <button class="kopieren" data-wert="${esc(wert)}">Kopieren</button>
              </div>
              <pre class="text">${esc(wert)}</pre>
            </div>`).join('')}
        </div>
      </div>`;
    }).join('')}
  </section>`).join('');

const seite = `<title>Etsy-Listing anlegen — Klickstrecke</title>
<style>
  :root{
    color-scheme:light dark;
    --tinte:#121826; --grund:#E8ECF3; --papier:#FFFFFF;
    --akzent:#2F6FEB; --siegel:#0F7B4F; --warn:#A35B00;
    --linie:#C2CBDA; --gedaempft:#5A6478;
    --schatten:0 1px 3px rgba(18,24,38,.07), 0 10px 26px rgba(18,24,38,.06);
  }
  @media (prefers-color-scheme:dark){
    :root{ --tinte:#E7ECF4; --grund:#0E141F; --papier:#161E2B; --akzent:#7BA5FF;
           --siegel:#46B98A; --warn:#D79A4A; --linie:#2A3546; --gedaempft:#8E9BB0;
           --schatten:0 1px 3px rgba(0,0,0,.4), 0 10px 26px rgba(0,0,0,.3); }
  }
  :root[data-theme="dark"]{ --tinte:#E7ECF4; --grund:#0E141F; --papier:#161E2B; --akzent:#7BA5FF;
    --siegel:#46B98A; --warn:#D79A4A; --linie:#2A3546; --gedaempft:#8E9BB0;
    --schatten:0 1px 3px rgba(0,0,0,.4), 0 10px 26px rgba(0,0,0,.3); }
  :root[data-theme="light"]{ --tinte:#121826; --grund:#E8ECF3; --papier:#FFFFFF; --akzent:#2F6FEB;
    --siegel:#0F7B4F; --warn:#A35B00; --linie:#C2CBDA; --gedaempft:#5A6478;
    --schatten:0 1px 3px rgba(18,24,38,.07), 0 10px 26px rgba(18,24,38,.06); }

  *{box-sizing:border-box}
  body{margin:0; background:var(--grund); color:var(--tinte);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    font-size:16px; line-height:1.55;}
  h1,h2{font-family:Georgia,"Times New Roman",serif; font-weight:700}
  .blatt{max-width:780px; margin:0 auto; padding:0 18px 90px}

  header{padding:58px 0 26px}
  .augenbraue{font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:var(--gedaempft); font-weight:700}
  h1{font-size:clamp(30px,5.4vw,44px); line-height:1.06; margin:14px 0 0; letter-spacing:-.02em; text-wrap:balance}
  .vorspann{color:var(--gedaempft); margin:14px 0 0; max-width:58ch}

  .fortschritt{position:sticky; top:0; z-index:10; background:var(--grund);
    padding:14px 0 12px; margin-top:22px; border-bottom:1px solid var(--linie);
    display:flex; align-items:center; gap:14px; flex-wrap:wrap}
  .balken{flex:1 1 180px; height:7px; background:var(--linie); border-radius:99px; overflow:hidden; min-width:120px}
  .balken i{display:block; height:100%; width:0; background:var(--siegel); transition:width .3s}
  .stand{font-size:14px; color:var(--gedaempft); font-variant-numeric:tabular-nums; white-space:nowrap}
  .zuruecksetzen{font:inherit; font-size:13px; background:none; border:1px solid var(--linie);
    color:var(--gedaempft); padding:5px 11px; border-radius:7px; cursor:pointer}
  .zuruecksetzen:hover{color:var(--tinte)}

  section{margin-top:44px}
  h2{font-size:clamp(21px,3.2vw,27px); margin:0 0 4px; padding-top:20px; border-top:3px solid var(--tinte)}
  .lead{color:var(--gedaempft); margin:0 0 20px; font-size:15px; max-width:62ch}

  .schritt{background:var(--papier); border:1px solid var(--linie); border-radius:11px;
    margin-bottom:12px; box-shadow:var(--schatten); overflow:hidden}
  .schritt.fertig{opacity:.58}
  .kopf{display:flex; gap:13px; align-items:flex-start; padding:16px 18px; cursor:pointer; user-select:none}
  .kopf input{width:21px; height:21px; margin:1px 0 0; flex:0 0 auto; accent-color:var(--siegel); cursor:pointer}
  .nr{font-variant-numeric:tabular-nums; color:var(--gedaempft); font-size:14px; font-weight:700; min-width:20px; margin-top:1px}
  .kopf .titel{font-weight:600; line-height:1.4}
  .schritt.fertig .titel{text-decoration:line-through; text-decoration-color:var(--gedaempft)}
  .koerper{padding:0 18px 18px 70px}
  @media (max-width:560px){ .koerper{padding-left:18px} }
  .koerper p{margin:0 0 12px; font-size:15px; color:var(--gedaempft)}
  .koerper p strong{color:var(--tinte)}
  .warnung{border-left:3px solid var(--warn); padding-left:13px; color:var(--warn) !important}
  .nebenbei{border-left:3px solid var(--linie); padding-left:13px; font-size:14px !important}
  .warnung strong{color:var(--warn) !important}

  .dateien{list-style:none; padding:0; margin:0 0 12px; display:flex; flex-direction:column; gap:7px}
  .dateien li{display:flex; gap:12px; align-items:baseline; flex-wrap:wrap; font-size:14px}
  .dateien span{color:var(--gedaempft)}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.87em;
    background:color-mix(in srgb, var(--gedaempft) 15%, transparent); padding:2px 6px; border-radius:5px}

  .etiketten{display:flex; flex-wrap:wrap; gap:7px; margin-bottom:12px}
  .etikett{font:inherit; font-size:13.5px; background:var(--grund); border:1px solid var(--linie);
    color:var(--tinte); padding:6px 11px; border-radius:7px; cursor:pointer}
  .etikett:hover{border-color:var(--akzent); color:var(--akzent)}
  .etikett.kopiert{background:var(--siegel); border-color:var(--siegel); color:#fff}

  .feld{border:1px solid var(--linie); border-radius:9px; overflow:hidden; margin-bottom:12px}
  .feld-kopf{display:flex; justify-content:space-between; align-items:center; gap:10px;
    padding:9px 12px; background:var(--grund); font-size:13px; font-weight:600; color:var(--gedaempft)}
  .kopieren{font:inherit; font-size:13px; font-weight:600; background:var(--akzent); color:#fff;
    border:none; padding:6px 13px; border-radius:7px; cursor:pointer; white-space:nowrap}
  .kopieren.fertig{background:var(--siegel)}
  pre.text{margin:0; padding:13px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    font-size:12.5px; line-height:1.5; white-space:pre-wrap; word-break:break-word;
    max-height:200px; overflow:auto; background:var(--papier)}

  button:focus-visible, input:focus-visible{outline:2px solid var(--akzent); outline-offset:2px}
  footer{margin-top:56px; padding-top:22px; border-top:1px solid var(--linie); font-size:13.5px; color:var(--gedaempft)}
  @media (prefers-reduced-motion:reduce){ *{transition:none !important} }
</style>

<div class="blatt">
<header>
  <div class="augenbraue">Papierkramerei · Etsy</div>
  <h1>Listing anlegen — Schritt für Schritt</h1>
  <p class="vorspann">${gesamt} Schritte in der Reihenfolge, in der Etsy danach fragt.
     Jeder Text hat einen Kopierknopf. Am besten neben dem Etsy-Fenster offen halten.</p>
  <div class="fortschritt">
    <div class="balken"><i id="balken"></i></div>
    <span class="stand" id="stand">0 von ${gesamt} erledigt</span>
    <button class="zuruecksetzen" id="zuruecksetzen">Zurücksetzen</button>
  </div>
</header>
${html}
<footer id="fuss">
  Die Feldinhalte im Einzelnen stehen in <code>marketing/etsy-listing.md</code> und
  <code>marketing/etsy-shop.md</code>. Diese Seite entsteht mit
  <code>node marketing/etsy-anleitung.mjs</code>.
</footer>
</div>

<script>
"use strict";
(function(){
  var GESAMT = ${gesamt};

  /* Speicher kapseln: In privaten Fenstern und eingebetteten Rahmen wirft
     bereits der Zugriff auf localStorage. Dann wird ohne Merken gearbeitet,
     statt die Seite abstürzen zu lassen. */
  var Speicher = (function(){
    try{
      window.localStorage.setItem("ea.probe","1");
      window.localStorage.removeItem("ea.probe");
      return {
        dauerhaft:true,
        lesen:function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
        schreiben:function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
      };
    }catch(e){
      var m = {};
      return { dauerhaft:false,
        lesen:function(k){ return k in m ? m[k] : null; },
        schreiben:function(k,v){ m[k] = String(v); } };
    }
  })();

  var SCHLUESSEL = "ea.erledigt.v1";
  var erledigt = {};
  try{ erledigt = JSON.parse(Speicher.lesen(SCHLUESSEL) || "{}") || {}; }catch(e){ erledigt = {}; }

  var kaesten = [].slice.call(document.querySelectorAll("[data-hak]"));

  function stand(){
    var n = kaesten.filter(function(k){ return k.checked; }).length;
    document.getElementById("balken").style.width = (n / GESAMT * 100) + "%";
    document.getElementById("stand").textContent = n + " von " + GESAMT + " erledigt";
  }

  kaesten.forEach(function(k){
    var nr = k.getAttribute("data-hak");
    k.checked = !!erledigt[nr];
    k.closest(".schritt").classList.toggle("fertig", k.checked);
    k.addEventListener("change", function(){
      erledigt[nr] = k.checked;
      k.closest(".schritt").classList.toggle("fertig", k.checked);
      Speicher.schreiben(SCHLUESSEL, JSON.stringify(erledigt));
      stand();
    });
  });
  stand();

  document.getElementById("zuruecksetzen").addEventListener("click", function(){
    kaesten.forEach(function(k){
      k.checked = false;
      k.closest(".schritt").classList.remove("fertig");
    });
    erledigt = {};
    Speicher.schreiben(SCHLUESSEL, "{}");
    stand();
  });

  /* Kopieren mit Rückfallebene: Ist die Zwischenablage gesperrt — in
     eingebetteten Seiten häufig —, wird der Text markiert, sodass Strg+C reicht. */
  function melden(knopf, text, gut){
    var alt = knopf.dataset.alt || knopf.textContent;
    knopf.dataset.alt = alt;
    knopf.textContent = text;
    knopf.classList.toggle(gut ? "fertig" : "kopiert", true);
    setTimeout(function(){
      knopf.textContent = alt;
      knopf.classList.remove("fertig","kopiert");
    }, 1800);
  }

  function markieren(knopf){
    var feld = knopf.closest(".feld");
    var bereich = feld && feld.querySelector(".text");
    if(!bereich) return false;
    var auswahl = window.getSelection();
    var r = document.createRange();
    r.selectNodeContents(bereich);
    auswahl.removeAllRanges();
    auswahl.addRange(r);
    return true;
  }

  document.addEventListener("click", function(e){
    var knopf = e.target.closest(".kopieren, .etikett");
    if(!knopf) return;
    var wert = knopf.getAttribute("data-wert");
    var istEtikett = knopf.classList.contains("etikett");

    function fehlschlag(){
      if(!istEtikett && markieren(knopf)) melden(knopf, "markiert — Strg+C", false);
      else melden(knopf, "Text bitte markieren", false);
    }

    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(wert).then(function(){
        melden(knopf, istEtikett ? knopf.textContent + " ✓" : "kopiert ✓", true);
      })["catch"](fehlschlag);
    } else {
      fehlschlag();
    }
  });

  if(!Speicher.dauerhaft){
    var f = document.getElementById("fuss");
    var p = document.createElement("p");
    p.style.cssText = "margin:0 0 12px; color:var(--warn)";
    p.textContent = "Hinweis: Dieser Browser erlaubt kein dauerhaftes Speichern — " +
      "die Haken gehen beim Neuladen verloren.";
    f.insertBefore(p, f.firstChild);
  }
})();
</script>`;

await writeFile(join(wurzel, 'dist', 'etsy-anleitung.html'), seite);

console.log('marketing/etsy-anleitung.md   geschrieben');
console.log('dist/etsy-anleitung.html      geschrieben');
console.log(`${gesamt} Schritte in ${abschnitte.length} Abschnitten`);
