/*
 * Abnahmetest für das Belegpaket.
 *
 * Ausführen:   node tests/abnahme-belegpaket.mjs
 * Voraussetzung: Playwright (lokal oder global installiert)
 *                npm install --save-dev playwright && npx playwright install chromium
 *
 * Der Test öffnet die Produktdatei in einem echten Browser und prüft alle sechs
 * Belegarten: Zinsrechnung und Verzugsregeln im Mahnwesen, Steuerlogik der
 * Auftragsbestätigung, den preisfreien Lieferschein, die Stundenrechnung samt
 * Wochensummen, die Übernahme aus dem Rechnungsgenerator sowie Persistenz,
 * Import/Export und Druckausgabe. Nach jeder Änderung an belegpaket.html
 * sollte er grün durchlaufen.
 */
import { tmpdir } from 'os';
import { join } from 'path';

// Playwright bevorzugt lokal auflösen, sonst auf eine globale Installation ausweichen
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs'));
}

const url = new URL('../produkt/belegpaket.html', import.meta.url).href;
const rechnungsDatei = new URL('../produkt/beispiel-beleg.json', import.meta.url).pathname;
const ausgabe = tmpdir();
let fails = 0;
const ok = (name, cond, extra='') => {
  if (cond) console.log('  PASS  ' + name);
  else { fails++; console.log('  FAIL  ' + name + (extra ? ' :: ' + extra : '')); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('dialog', d => d.accept());

await page.goto(url);
await page.waitForTimeout(300);

const text = sel => page.textContent(sel);

console.log('\n== 1. Grundlegendes Rendern ==');
ok('keine JS-Fehler beim Start', errors.length === 0, errors.join(' | '));
ok('Beispielbeleg ist eine 1. Mahnung', (await text('.doc-title')) === '1. Mahnung');
ok('Vorschau zeigt die offene Rechnung', (await text('table.items')).includes('RE-'));
ok('Mahnkarte sichtbar', await page.locator('#karte-rechnung').isVisible());
ok('Positionskarte ausgeblendet', !(await page.locator('#karte-positionen').isVisible()));
ok('Stundenkarte ausgeblendet', !(await page.locator('#karte-stunden').isVisible()));

console.log('\n== 2. Verzugszinsen: 1.000 € × 10,52 % × 60/365 = 17,29 € ==');
await page.fill('#f-datum', '2026-06-30');
await page.fill('#f-r-nummer', 'RE-2026-042');
await page.fill('#f-r-datum', '2026-04-01');
await page.fill('#f-r-faellig', '2026-04-15');
await page.fill('#f-r-betrag', '1000');
await page.fill('#f-z-ab', '2026-05-01');
await page.selectOption('#f-typ', 'mahnung2');
await page.waitForTimeout(250);
let totals = await text('.totals');
ok('Zinssatz 10,52 % bei Unternehmen', totals.includes('10,52 %'), totals);
ok('60 Tage gezählt', totals.includes('für 60 Tage'), totals);
ok('Zinsen 17,29 €', totals.includes('17,29 €'), totals);
ok('Gesamtzinssatz im Editor angezeigt', (await page.inputValue('#f-z-gesamt')).startsWith('10,52'));
ok('2. Mahnung setzt Mahngebühr 5,00 €', (await page.inputValue('#f-z-gebuehr')) === '5');
ok('Gesamtforderung 1.022,29 €', totals.includes('1.022,29 €'), totals);

console.log('\n== 3. Verbraucher: 5 statt 9 Prozentpunkte ==');
await page.selectOption('#f-z-schuldner', 'verbraucher');
await page.waitForTimeout(200);
totals = await text('.totals');
ok('Zuschlag auf 5 gewechselt', (await page.inputValue('#f-z-zuschlag')) === '5');
ok('Zinssatz 6,52 %', totals.includes('6,52 %'), totals);
ok('Zinsen 10,72 €', totals.includes('10,72 €'), totals);
ok('Verzugspauschale für Verbraucher nicht anwählbar', !(await page.locator('#lbl-pauschale').isVisible()));

console.log('\n== 4. Eigener Zinssatz ==');
await page.selectOption('#f-z-schuldner', 'eigen');
await page.waitForTimeout(150);
ok('Zuschlagsfeld freigegeben', !(await page.locator('#f-z-zuschlag').isDisabled()));
await page.fill('#f-z-zuschlag', '4');
await page.waitForTimeout(200);
ok('Zinssatz folgt der Eingabe (5,52 %)', (await text('.totals')).includes('5,52 %'), await text('.totals'));
await page.selectOption('#f-z-schuldner', 'unternehmen');
await page.waitForTimeout(150);
ok('Rücksprung auf 9 Prozentpunkte', (await page.inputValue('#f-z-zuschlag')) === '9');

console.log('\n== 5. Verzugspauschale § 288 Abs. 5 BGB ==');
await page.check('#f-z-pauschale');
await page.waitForTimeout(200);
totals = await text('.totals');
ok('40 € ausgewiesen', totals.includes('40,00 €'), totals);
ok('Paragraf genannt', totals.includes('§ 288 Abs. 5 BGB'), totals);
ok('Gesamt 1.062,29 €', totals.includes('1.062,29 €'), totals);
ok('Hinweis auf Anrechnung', (await text('.note')).includes('angerechnet'));

console.log('\n== 6. Prüfungen und Warnungen ==');
await page.selectOption('#f-z-schuldner', 'verbraucher');
await page.waitForTimeout(200);
ok('Pauschale wird bei Verbraucher abgewählt', !(await page.isChecked('#f-z-pauschale')));
ok('40 € verschwinden aus der Forderung', !(await text('.totals')).includes('40,00 €'));
await page.selectOption('#f-z-schuldner', 'unternehmen');
await page.fill('#f-z-gebuehr', '25');
await page.waitForTimeout(250);
let warn = await text('#pflicht-hinweis');
ok('Warnung bei überhöhter Mahngebühr', warn.includes('tatsächlichen Kosten'), warn);
await page.fill('#f-z-gebuehr', '5');
await page.fill('#f-z-ab', '2026-08-01');   // Verzug erst nach dem Belegdatum
await page.waitForTimeout(250);
warn = await text('#pflicht-hinweis');
ok('Warnung, wenn der Verzug später beginnt als der Beleg', warn.includes('nach dem Belegdatum'), warn);
ok('keine negativen Zinsen', !(await text('.totals')).includes('−'), await text('.totals'));
await page.fill('#f-z-ab', '2026-05-01');
await page.fill('#f-r-faellig', '2026-03-01');   // vor dem Rechnungsdatum
await page.waitForTimeout(250);
ok('Warnung bei Fälligkeit vor Rechnungsdatum', (await text('#pflicht-hinweis')).includes('vor dem Rechnungsdatum'));
await page.fill('#f-r-faellig', '2026-04-15');
await page.waitForTimeout(150);

console.log('\n== 7. Teilzahlung ==');
await page.fill('#f-r-gezahlt', '400');
await page.waitForTimeout(250);
totals = await text('.totals');
ok('offener Betrag 600,00 €', totals.includes('600,00 €'), totals);
// 600 × 10,52 % × 60/365 = 10,3758… -> 10,38
ok('Zinsen aus dem offenen Betrag (10,38 €)', totals.includes('10,38 €'), totals);
ok('gezahlte Spalte erscheint', (await text('table.items')).includes('400,00 €'));
await page.fill('#f-r-gezahlt', '1200');
await page.waitForTimeout(200);
ok('Überzahlung ergibt 0,00 €, keine Negativforderung',
   !(await text('.totals')).includes('−'), await text('.totals'));
ok('Hinweis auf fehlenden offenen Betrag', (await text('#pflicht-hinweis')).includes('offener Betrag'));
await page.fill('#f-r-gezahlt', '0');
await page.waitForTimeout(150);

console.log('\n== 8. Zahlungserinnerung bleibt kostenfrei ==');
await page.selectOption('#f-typ', 'erinnerung');
await page.waitForTimeout(250);
totals = await text('.totals');
ok('Titel Zahlungserinnerung', (await text('.doc-title')) === 'Zahlungserinnerung');
ok('keine Zinsen', !totals.includes('Verzugszinsen'), totals);
ok('keine Mahngebühr', !totals.includes('Mahngebühr'), totals);
ok('Karte für Verzugskosten ausgeblendet', !(await page.locator('#karte-verzug').isVisible()));
ok('freundlicher Einleitungstext', (await text('.intro')).includes('Aufmerksamkeit entgangen'));
ok('eigene Nummernreihe ZE', /^ZE-\d{4}-\d{3}$/.test(await page.inputValue('#f-nummer')), await page.inputValue('#f-nummer'));

console.log('\n== 9. Standardtexte je Belegart ==');
await page.selectOption('#f-typ', 'mahnung1');
await page.waitForTimeout(200);
ok('Text wechselt mit der Belegart', (await page.inputValue('#f-intro')).includes('Zahlungserinnerung'));
await page.fill('#f-intro', 'Eigener Text, bitte behalten.');
await page.selectOption('#f-typ', 'mahnung2');
await page.waitForTimeout(200);
ok('selbst geschriebener Text bleibt erhalten',
   (await page.inputValue('#f-intro')) === 'Eigener Text, bitte behalten.');
await page.click('#btn-texte-zuruecksetzen');
await page.waitForTimeout(200);
ok('Standardtexte lassen sich zurückholen', (await page.inputValue('#f-intro')).includes('ersten Mahnung'));

console.log('\n== 10. Anrede ==');
await page.fill('#f-e-name', 'Frau Dr. Erika Muster');
await page.waitForTimeout(250);
ok('Anrede aus dem Namen, ohne Vornamen', (await text('.intro')).startsWith('Sehr geehrte Frau Dr. Muster,'),
   (await text('.intro')).slice(0, 60));
await page.fill('#f-e-name', 'Herr Klaus Berg');
await page.waitForTimeout(250);
ok('männliche Anrede', (await text('.intro')).startsWith('Sehr geehrter Herr Berg,'), (await text('.intro')).slice(0, 40));
await page.fill('#f-e-name', 'Einkauf');
await page.waitForTimeout(250);
ok('Rückfall auf Damen und Herren', (await text('.intro')).startsWith('Sehr geehrte Damen und Herren,'));
await page.fill('#f-anrede', 'Hallo Klaus,');
await page.waitForTimeout(250);
ok('eigene Anrede schlägt den Vorschlag', (await text('.intro')).startsWith('Hallo Klaus,'));
await page.fill('#f-anrede', '');
await page.waitForTimeout(150);

console.log('\n== 11. Auftragsbestätigung: 8 × 95 + 22 × 95 = 2.850 netto ==');
await page.selectOption('#f-typ', 'auftrag');
await page.waitForTimeout(250);
ok('Nummernkreis wechselt auf AB', /^AB-\d{4}-\d{3}$/.test(await page.inputValue('#f-nummer')), await page.inputValue('#f-nummer'));
ok('Positionskarte sichtbar', await page.locator('#karte-positionen').isVisible());
ok('Mahnkarte ausgeblendet', !(await page.locator('#karte-rechnung').isVisible()));
await page.fill('#pos-body input[data-f="beschreibung"] >> nth=0', 'Konzeption und Beratung');
await page.fill('#pos-body input[data-f="menge"] >> nth=0', '8');
await page.fill('#pos-body input[data-f="einzelpreis"] >> nth=0', '95');
await page.click('#btn-pos-add');
await page.fill('#pos-body input[data-f="beschreibung"] >> nth=1', 'Screendesign');
await page.fill('#pos-body input[data-f="menge"] >> nth=1', '22');
await page.fill('#pos-body input[data-f="einzelpreis"] >> nth=1', '95');
await page.waitForTimeout(250);
totals = await text('.totals');
ok('Netto 2.850,00 €', totals.includes('2.850,00 €'), totals);
ok('USt 541,50 €', totals.includes('541,50 €'), totals);
ok('Auftragssumme 3.391,50 €', totals.includes('3.391,50 €'), totals);
await page.fill('#pos-body input[data-f="menge"] >> nth=0', '2,5');
await page.waitForTimeout(250);
ok('Komma-Eingabe akzeptiert (2.327,50 €)', (await text('.totals')).includes('2.327,50 €'), await text('.totals'));
await page.fill('#pos-body input[data-f="menge"] >> nth=0', '8');
await page.waitForTimeout(200);

console.log('\n== 12. Gemischte Steuersätze und § 19 ==');
await page.selectOption('#pos-body select[data-f="ust"] >> nth=1', '7');
await page.waitForTimeout(250);
totals = await text('.totals');
ok('zwei USt-Gruppen ausgewiesen', (totals.match(/% USt auf/g) || []).length === 2, totals);
ok('19-%-Gruppe auf 760,00 €', totals.includes('19 % USt auf 760,00 €'), totals);
ok('7-%-Gruppe auf 2.090,00 €', totals.includes('7 % USt auf 2.090,00 €'), totals);
await page.selectOption('#pos-body select[data-f="ust"] >> nth=1', '19');
await page.check('#f-kleinunternehmer');
await page.waitForTimeout(250);
ok('kein USt-Ausweis mehr', !(await text('.totals')).includes('USt'), await text('.totals'));
ok('§-19-Hinweis erscheint', (await text('.note')).includes('§ 19 UStG'));
ok('USt-Spalte im Beleg entfernt', !(await text('table.items thead')).includes('UST'));
await page.uncheck('#f-kleinunternehmer');
await page.check('#f-reverse');
await page.waitForTimeout(250);
ok('Reverse-Charge-Hinweis', (await text('.note')).includes('13b'));
ok('Warnung auf fehlende USt-IdNr.', (await text('#pflicht-hinweis')).includes('USt-IdNr'));
await page.uncheck('#f-reverse');
await page.waitForTimeout(150);

console.log('\n== 13. Rabatt ==');
await page.fill('#f-rabatt', '10');
await page.waitForTimeout(250);
totals = await text('.totals');
ok('Zwischensumme erscheint', totals.includes('Zwischensumme'), totals);
ok('Rabatt 285,00 €', totals.includes('285,00 €'), totals);
ok('Auftragssumme 3.052,35 €', totals.includes('3.052,35 €'), totals);
await page.fill('#f-rabatt', '0');
await page.waitForTimeout(150);

console.log('\n== 14. Lieferschein ohne Preise ==');
await page.selectOption('#f-typ', 'lieferschein');
await page.waitForTimeout(250);
const kopfzeile = await text('table.items thead');
ok('Nummernkreis wechselt auf LS', /^LS-\d{4}-\d{3}$/.test(await page.inputValue('#f-nummer')), await page.inputValue('#f-nummer'));
ok('keine Preisspalte im Beleg', !kopfzeile.includes('EINZELPREIS') && !kopfzeile.toLowerCase().includes('einzelpreis'), kopfzeile);
ok('keine Betragsspalte im Beleg', !kopfzeile.toLowerCase().includes('betrag'), kopfzeile);
ok('Mengen bleiben erhalten', (await text('table.items')).includes('Konzeption und Beratung'));
ok('kein Summenblock', (await page.locator('.totals').count()) === 0);
ok('Preisspalten im Editor ausgeblendet',
   !(await page.locator('#pos-body input[data-f="einzelpreis"]').first().isVisible()));
ok('Empfangsbestätigung vorhanden', (await text('.unterschrift')).includes('unbeschädigt erhalten'));
ok('Hinweis „keine Rechnung“', (await text('.note')).includes('keine Rechnung'));
ok('Versandart-Feld erscheint', await page.locator('#lbl-versand').isVisible());
await page.fill('#f-v-versand', 'Spedition Nord');
await page.fill('#f-v-lieferadresse', 'Baustelle Hafencity\nAm Kaiserkai 1\n20457 Hamburg');
await page.waitForTimeout(250);
ok('Versandart im Beleg', (await text('.doc-meta')).includes('Spedition Nord'));
ok('abweichende Lieferanschrift im Beleg', (await text('.pay-box')).includes('Am Kaiserkai 1'));

console.log('\n== 15. Stundenzettel: Zeiten, Pausen, Wochen ==');
await page.selectOption('#f-typ', 'stundenzettel');
await page.waitForTimeout(250);
ok('Nummernkreis wechselt auf SZ', /^SZ-\d{4}-\d{3}$/.test(await page.inputValue('#f-nummer')));
ok('Stundenkarte sichtbar', await page.locator('#karte-stunden').isVisible());
const tage = [
  ['2026-03-02', 'Konzeptworkshop',  '09:00', '17:00', '60'],
  ['2026-03-03', 'Wireframes',       '08:30', '15:00', '30'],
  ['2026-03-09', 'Screendesign',     '09:00', '18:00', '45'],
  ['2026-03-10', 'Abstimmung',       '10:00', '13:00', '0']
];
for (let i = 0; i < tage.length; i++) {
  if (i > 0) await page.click('#btn-std-add');
  await page.fill(`#std-body input[data-f="datum"] >> nth=${i}`, tage[i][0]);
  await page.fill(`#std-body input[data-f="taetigkeit"] >> nth=${i}`, tage[i][1]);
  await page.fill(`#std-body input[data-f="von"] >> nth=${i}`, tage[i][2]);
  await page.fill(`#std-body input[data-f="bis"] >> nth=${i}`, tage[i][3]);
  await page.fill(`#std-body input[data-f="pause"] >> nth=${i}`, tage[i][4]);
}
await page.waitForTimeout(300);
ok('09:00–17:00 abzüglich 60 min = 7,00 Std.',
   (await page.inputValue('#std-body input[data-f="stunden"] >> nth=0')) === '7');
ok('08:30–15:00 abzüglich 30 min = 6,00 Std.',
   (await page.inputValue('#std-body input[data-f="stunden"] >> nth=1')) === '6');
ok('09:00–18:00 abzüglich 45 min = 8,25 Std.',
   (await page.inputValue('#std-body input[data-f="stunden"] >> nth=2')) === '8.25');
let tabelle = await text('table.items');
ok('Wochenblöcke gebildet (KW 10 und KW 11)',
   tabelle.includes('KW 10 / 2026') && tabelle.includes('KW 11 / 2026'), tabelle);
ok('Wochensumme KW 10 = 13,00 Std.', tabelle.includes('13,00 Std.'), tabelle);
ok('Wochensumme KW 11 = 11,25 Std.', tabelle.includes('11,25 Std.'), tabelle);
ok('Gesamtsumme 24,25 Std.', (await text('.totals')).includes('24,25 Std.'), await text('.totals'));
ok('Gegenzeichnung vorhanden', (await text('.unterschrift')).includes('sachlich richtig'));

console.log('\n== 16. Stundenzettel abrechnen ==');
await page.check('#f-s-abrechnen');
await page.fill('#f-s-satz', '85');
await page.waitForTimeout(300);
totals = await text('.totals');
ok('Netto 2.061,25 €', totals.includes('2.061,25 €'), totals);
ok('USt 391,64 €', totals.includes('391,64 €'), totals);
ok('Gesamt 2.452,89 €', totals.includes('2.452,89 €'), totals);
await page.check('#f-s-klein');
await page.waitForTimeout(250);
ok('§ 19: keine Umsatzsteuer auf dem Stundenzettel', !(await text('.totals')).includes('USt'), await text('.totals'));
ok('§-19-Hinweis auf dem Stundenzettel', (await text('.note')).includes('§ 19 UStG'));
await page.uncheck('#f-s-klein');
await page.uncheck('#f-s-abrechnen');
await page.waitForTimeout(250);
ok('ohne Abrechnung nur die Stundensumme', !(await text('.totals')).includes('€'), await text('.totals'));

console.log('\n== 17. Stunden von Hand überschreiben, Mitternacht, Zeilen sortieren ==');
await page.fill('#std-body input[data-f="stunden"] >> nth=3', '4');
await page.waitForTimeout(250);
ok('von Hand gesetzte Stunden werden übernommen', (await text('.totals')).includes('25,25 Std.'), await text('.totals'));
await page.fill('#std-body input[data-f="von"] >> nth=3', '22:00');
await page.fill('#std-body input[data-f="bis"] >> nth=3', '02:00');
await page.fill('#std-body input[data-f="pause"] >> nth=3', '0');
await page.waitForTimeout(250);
ok('Nachtschicht über Mitternacht = 4,00 Std.',
   (await page.inputValue('#std-body input[data-f="stunden"] >> nth=3')) === '4');
await page.click('#std-body button[data-weg="3"]');
await page.waitForTimeout(250);
ok('Zeile entfernt (21,25 Std.)', (await text('.totals')).includes('21,25 Std.'), await text('.totals'));
await page.click('#std-body button[data-hoch="2"]');
await page.waitForTimeout(250);
ok('Zeile nach oben verschoben',
   (await page.inputValue('#std-body input[data-f="taetigkeit"] >> nth=1')) === 'Screendesign');

console.log('\n== 18. HTML-Escaping (XSS) ==');
await page.fill('#f-a-firma', 'Muster & Söhne <Design>');
await page.fill('#std-body input[data-f="taetigkeit"] >> nth=0', '<img src=x onerror=alert(1)>');
await page.waitForTimeout(300);
const sender = await page.innerHTML('.sender-block');
ok('Sonderzeichen im Absender escaped', sender.includes('&amp;') && sender.includes('&lt;Design&gt;'), sender);
ok('kein injiziertes <img> in der Vorschau', (await page.locator('table.items img').count()) === 0);
ok('Text wird literal angezeigt', (await text('table.items')).includes('<img src=x'));
await page.fill('#std-body input[data-f="taetigkeit"] >> nth=0', 'Konzeptworkshop');
await page.waitForTimeout(200);

console.log('\n== 19. Stammdaten, Kundenverwaltung, Pflichtangaben ==');
warn = await text('#pflicht-hinweis');
ok('Warnung listet fehlende Angaben', warn.includes('Absenderanschrift'), warn);
await page.fill('#f-a-name', 'Martin Beispiel');
await page.fill('#f-a-strasse', 'Hauptstraße 1');
await page.fill('#f-a-plz', '10115');
await page.fill('#f-a-ort', 'Berlin');
await page.fill('#f-a-iban', 'DE02 1203 0000 0000 2020 51');
await page.fill('#f-e-firma', 'Kunden AG');
await page.fill('#f-e-ort', 'Hamburg');
await page.waitForTimeout(300);
ok('Warnung verschwindet, wenn alles ausgefüllt', (await text('#pflicht-hinweis')).trim() === '',
   await text('#pflicht-hinweis'));
await page.click('#btn-kunde-save');
await page.waitForTimeout(200);
ok('Kunde in der Auswahlliste', (await page.locator('#f-kunde-select option').count()) === 2);
await page.fill('#f-e-firma', 'Andere GmbH');
await page.waitForTimeout(150);
await page.selectOption('#f-kunde-select', '0');
await page.waitForTimeout(250);
ok('Kunde wieder geladen', (await page.inputValue('#f-e-firma')) === 'Kunden AG');
ok('Vorschau aktualisiert', (await text('.recipient')).includes('Kunden AG'));

console.log('\n== 20. Persistenz über Neuladen ==');
await page.reload();
await page.waitForTimeout(400);
ok('Stammdaten-Karte nach Befüllung eingeklappt',
   await page.locator('#card-absender').evaluate(el => el.classList.contains('collapsed')));
await page.click('#card-absender > h2');
ok('Stammdaten überleben Reload', (await page.inputValue('#f-a-ort')) === 'Berlin');
ok('Belegart überlebt Reload', (await page.inputValue('#f-typ')) === 'stundenzettel');
ok('Stundenzeilen überleben Reload', (await page.locator('#std-body tr.zeile').count()) === 3);
ok('keine Fehler nach Reload', errors.length === 0, errors.join(' | '));

console.log('\n== 21. Neuer Beleg / fortlaufende Nummerierung ==');
const nummerVorher = await page.inputValue('#f-nummer');
await page.click('#btn-new');
await page.waitForTimeout(300);
const nummerNachher = await page.inputValue('#f-nummer');
ok('Nummer wurde hochgezählt', nummerVorher !== nummerNachher && /^SZ-\d{4}-\d{3}$/.test(nummerNachher),
   nummerVorher + ' -> ' + nummerNachher);
ok('Stammdaten bleiben erhalten', (await page.inputValue('#f-a-ort')) === 'Berlin');
ok('Empfänger geleert', (await page.inputValue('#f-e-firma')) === '');
ok('Stundenzeilen zurückgesetzt', (await page.locator('#std-body tr.zeile').count()) === 1);

console.log('\n== 22. Export / Import ==');
await page.selectOption('#f-typ', 'mahnung1');
await page.fill('#f-r-nummer', 'RE-2026-777');
await page.fill('#f-r-betrag', '250,50');
await page.waitForTimeout(250);
const dl = await Promise.all([ page.waitForEvent('download'), page.click('#btn-export') ]);
const pfad = await dl[0].path();
const inhalt = JSON.parse(await (await import('fs/promises')).readFile(pfad, 'utf8'));
ok('Export enthält stamm/beleg/kunden', !!inhalt.stamm && !!inhalt.beleg && Array.isArray(inhalt.kunden));
ok('Export kennzeichnet das Produkt', inhalt.produkt === 'belegpaket', String(inhalt.produkt));
ok('Dateiname aus der Belegnummer', dl[0].suggestedFilename().startsWith('MA-'), dl[0].suggestedFilename());
await page.fill('#f-r-betrag', '9');
await page.waitForTimeout(200);
await page.setInputFiles('#file-import', pfad);
await page.waitForTimeout(400);
ok('Import stellt den Beleg wieder her', (await page.inputValue('#f-r-betrag')) === '250.5',
   await page.inputValue('#f-r-betrag'));
ok('Import ohne Fehler', errors.length === 0, errors.join(' | '));

console.log('\n== 23. Druck (A4, Editor ausgeblendet) ==');
const pdf = await page.pdf({ format: 'A4', printBackground: true });
ok('PDF erzeugt (> 10 kB)', pdf.length > 10000, pdf.length + ' bytes');
await (await import('fs/promises')).writeFile(join(ausgabe, 'belegpaket-probe.pdf'), pdf);
await page.emulateMedia({ media: 'print' });
ok('Editor im Druck ausgeblendet', !(await page.locator('.editor').isVisible()));
ok('Seite im Druck sichtbar', await page.locator('.page').isVisible());
const seitenBreite = await page.locator('.page').evaluate(el => el.getBoundingClientRect().width);
ok('Seitenbreite = 210 mm (~793 px)', Math.abs(seitenBreite - 793.7) < 3, String(seitenBreite));
await page.emulateMedia({ media: 'screen' });

console.log('\n== 24. Mobile Ansicht ==');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
ok('kein horizontales Scrollen auf 390 px',
   await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
   await page.evaluate(() => document.documentElement.scrollWidth + ' > ' + window.innerWidth));
await page.screenshot({ path: join(ausgabe, 'belegpaket-mobil.png') });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(300);

console.log('\n== 25. Nullwerte / leere Eingaben ==');
await page.check('#f-z-aktiv');
await page.selectOption('#f-typ', 'mahnung2');
await page.fill('#f-datum', '2026-06-30');
await page.fill('#f-z-ab', '2026-05-01');
await page.waitForTimeout(250);
await page.fill('#f-r-betrag', '');
await page.fill('#f-z-basis', '');
await page.waitForTimeout(250);
ok('leere Beträge führen nicht zu NaN', !(await text('.totals')).includes('NaN'), await text('.totals'));
await page.fill('#f-r-betrag', 'abc');
await page.waitForTimeout(250);
ok('ungültiger Betrag führt nicht zu NaN', !(await text('.totals')).includes('NaN'));
await page.fill('#f-r-betrag', '1000');
await page.fill('#f-z-basis', '1,52');
await page.waitForTimeout(250);
ok('Basiszinssatz nimmt Komma an', (await text('.totals')).includes('10,52 %'), await text('.totals'));

console.log('\n== 26. Übernahme aus dem Rechnungsgenerator ==');
{
  // Frisches Profil: Ohne eigene Stammdaten werden die der Rechnung übernommen.
  const ctxNeu = await browser.newContext();
  const pNeu = await ctxNeu.newPage();
  const fehlerNeu = [];
  pNeu.on('pageerror', e => fehlerNeu.push(String(e)));
  await pNeu.goto(url);
  await pNeu.waitForTimeout(300);
  await pNeu.setInputFiles('#file-rechnung', rechnungsDatei);
  await pNeu.waitForTimeout(500);

  ok('Rechnungsnummer übernommen', (await pNeu.inputValue('#f-r-nummer')) === 'RE-2026-001',
     await pNeu.inputValue('#f-r-nummer'));
  ok('Rechnungsdatum übernommen', (await pNeu.inputValue('#f-r-datum')) === '2026-03-30');
  ok('Fälligkeit aus Datum + Zahlungsziel (13.04.2026)',
     (await pNeu.inputValue('#f-r-faellig')) === '2026-04-13', await pNeu.inputValue('#f-r-faellig'));
  ok('Verzug beginnt am Folgetag (14.04.2026)',
     (await pNeu.inputValue('#f-z-ab')) === '2026-04-14', await pNeu.inputValue('#f-z-ab'));
  // 8×95 + 22×95 + 2400 = 5.250 zu 19 %, 6×39,50 = 237 zu 7 %
  // -> netto 5.487,00 + 997,50 + 16,59 = 6.501,09
  ok('Bruttobetrag über gemischte Steuersätze berechnet (6.501,09 €)',
     (await pNeu.inputValue('#f-r-betrag')) === '6501.09', await pNeu.inputValue('#f-r-betrag'));
  ok('Empfänger übernommen', (await pNeu.inputValue('#f-e-firma')) === 'Nordwind Handels GmbH');
  ok('Stammdaten übernommen', (await pNeu.inputValue('#f-a-ort')) === 'Hamburg');
  ok('Kundenliste übernommen', (await pNeu.locator('#f-kunde-select option').count()) === 2);
  ok('Betreff bezieht sich auf die Rechnung',
     (await pNeu.inputValue('#f-betreff')).includes('RE-2026-001'), await pNeu.inputValue('#f-betreff'));

  // Positionen stehen für Auftragsbestätigung und Lieferschein bereit
  await pNeu.selectOption('#f-typ', 'auftrag');
  await pNeu.waitForTimeout(300);
  ok('Positionen der Rechnung übernommen', (await pNeu.locator('#pos-body tr.zeile').count()) === 4);
  ok('Auftragssumme entspricht der Rechnung',
     (await pNeu.textContent('.totals')).includes('6.501,09 €'), await pNeu.textContent('.totals'));

  // Auch der normale Ladeknopf erkennt eine Rechnungsdatei
  await pNeu.selectOption('#f-typ', 'mahnung1');
  await pNeu.fill('#f-r-nummer', 'wird ersetzt');
  await pNeu.setInputFiles('#file-import', rechnungsDatei);
  await pNeu.waitForTimeout(400);
  ok('„Laden“ erkennt eine Rechnungssicherung ebenfalls',
     (await pNeu.inputValue('#f-r-nummer')) === 'RE-2026-001');
  ok('keine Fehler bei der Übernahme', fehlerNeu.length === 0, fehlerNeu.join(' | '));
  await ctxNeu.close();
}

console.log('\n== 27. Ohne dauerhaften Speicher (privates Fenster, blockierte Daten, iframe) ==');
{
  // Jeder Zugriff auf localStorage wirft – so verhalten sich sandboxed iframes
  // und Browser mit blockierten Website-Daten.
  const ctxOhne = await browser.newContext();
  const pOhne = await ctxOhne.newPage();
  const fehlerOhne = [];
  pOhne.on('pageerror', e => fehlerOhne.push(String(e)));
  await pOhne.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get(){ throw new DOMException('The operation is insecure.', 'SecurityError'); },
      configurable: true
    });
  });
  await pOhne.goto(url);
  await pOhne.waitForTimeout(400);

  ok('kein Absturz beim Seitenaufbau', fehlerOhne.length === 0, fehlerOhne.join(' | '));
  ok('Vorschau wird trotzdem gerendert', (await pOhne.textContent('.doc-title')) === '1. Mahnung');

  await pOhne.fill('#f-datum', '2026-06-30');
  await pOhne.fill('#f-r-betrag', '1000');
  await pOhne.fill('#f-z-ab', '2026-05-01');
  await pOhne.waitForTimeout(300);
  const summenOhne = await pOhne.textContent('.totals');
  ok('Berechnung funktioniert weiter', summenOhne.includes('1.000,00 €'), summenOhne);
  ok('Zinsen werden weiter berechnet', summenOhne.includes('17,29 €'), summenOhne);

  const warnungen = await pOhne.locator('.hint.warn').allTextContents();
  ok('sichtbarer Hinweis auf fehlenden Speicher',
     warnungen.some(t => t.includes('kein dauerhaftes Speichern')), warnungen.join(' | '));
  ok('Hinweis auch in der Kopfzeile',
     (await pOhne.textContent('.toolbar .brand small')).includes('nicht möglich'));

  const [ladung] = await Promise.all([ pOhne.waitForEvent('download'), pOhne.click('#btn-export') ]);
  ok('Sichern als .json weiterhin möglich', !!(await ladung.path()));
  ok('keine JS-Fehler ohne Speicher', fehlerOhne.length === 0, fehlerOhne.join(' | '));
  await ctxOhne.close();
}

console.log('\n== 28. Mitgelieferte Beispieldatei ==');
{
  const ctxBsp = await browser.newContext();
  const pBsp = await ctxBsp.newPage();
  const fehlerBsp = [];
  pBsp.on('pageerror', e => fehlerBsp.push(String(e)));
  await pBsp.goto(url);
  await pBsp.waitForTimeout(300);
  await pBsp.setInputFiles('#file-import', new URL('../produkt/beispiel-mahnung.json', import.meta.url).pathname);
  await pBsp.waitForTimeout(500);

  ok('Beispieldatei lädt ohne Fehler', fehlerBsp.length === 0, fehlerBsp.join(' | '));
  ok('Beispiel ist eine 2. Mahnung', (await pBsp.textContent('.doc-title')) === '2. Mahnung');
  const summenBsp = await pBsp.textContent('.totals');
  // 6.501,09 € × 10,52 % × 34 Tage / 365 = 63,71 € + 5,00 € Gebühr + 40,00 € Pauschale
  ok('offener Betrag 6.501,09 €', summenBsp.includes('6.501,09 €'), summenBsp);
  ok('Verzugszinsen 63,71 € für 34 Tage', summenBsp.includes('63,71 €') && summenBsp.includes('34 Tage'), summenBsp);
  ok('Gesamtforderung 6.609,80 €', summenBsp.includes('6.609,80 €'), summenBsp);
  ok('keine offenen Pflichtangaben im Beispiel',
     (await pBsp.textContent('#pflicht-hinweis')).trim() === '', await pBsp.textContent('#pflicht-hinweis'));

  await pBsp.selectOption('#f-typ', 'stundenzettel');
  await pBsp.waitForTimeout(300);
  ok('Beispiel enthält auch einen Stundenzettel',
     (await pBsp.textContent('.totals')).includes('24,25 Std.'), await pBsp.textContent('.totals'));
  await ctxBsp.close();
}

console.log('\n== Fehlerprotokoll ==');
ok('insgesamt keine JS-Fehler', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(fails === 0 ? '\nALLE TESTS BESTANDEN' : `\n${fails} TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
