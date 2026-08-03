/*
 * Abnahmetest für den Rechnungsgenerator.
 *
 * Ausführen:   node tests/abnahme.mjs
 * Voraussetzung: Playwright (lokal oder global installiert)
 *                npm install --save-dev playwright && npx playwright install chromium
 *
 * Der Test öffnet die Produktdatei in einem echten Browser und prüft Rechenwege,
 * Steuerlogik, Druckausgabe, Persistenz und Import/Export. Nach jeder Änderung
 * an rechnungsgenerator.html sollte er grün durchlaufen.
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

const url = new URL('../produkt/rechnungsgenerator.html', import.meta.url).href;
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

await page.goto(url);
await page.waitForTimeout(300);

console.log('\n== 1. Grundlegendes Rendern ==');
ok('keine JS-Fehler beim Start', errors.length === 0, errors.join(' | '));
ok('Titel "Rechnung" gerendert', (await page.textContent('.doc-title')) === 'Rechnung');
ok('2 Beispielpositionen in der Vorschau', (await page.locator('table.items tbody tr').count()) === 2);

console.log('\n== 2. Rechnen: 6*85 + 12*85 = 1530 netto, 19% = 290,70, brutto 1820,70 ==');
let totals = await page.textContent('.totals');
ok('Netto 1.530,00 €', totals.includes('1.530,00 €'), totals);
ok('USt 290,70 €', totals.includes('290,70 €'), totals);
ok('Brutto 1.820,70 €', totals.includes('1.820,70 €'), totals);

console.log('\n== 3. Position bearbeiten ==');
await page.fill('#pos-body input[data-f="menge"] >> nth=0', '2,5');   // deutsches Komma
await page.waitForTimeout(150);
totals = await page.textContent('.totals');
// 2,5*85 = 212,50 + 12*85 = 1020 -> 1232,50 netto; 19% = 234,175 -> 234,18; brutto 1466,68
ok('Komma-Eingabe akzeptiert (Netto 1.232,50 €)', totals.includes('1.232,50 €'), totals);
ok('USt kaufmännisch gerundet 234,18 €', totals.includes('234,18 €'), totals);
ok('Brutto 1.466,68 €', totals.includes('1.466,68 €'), totals);

console.log('\n== 4. Position hinzufügen / entfernen / verschieben ==');
await page.click('#btn-pos-add');
await page.waitForTimeout(100);
ok('3 Positionen nach Hinzufügen', (await page.locator('table.items tbody tr').count()) === 3);
await page.fill('#pos-body input[data-f="beschreibung"] >> nth=2', 'Dritte Position');
await page.waitForTimeout(150);
ok('neue Beschreibung in Vorschau', (await page.textContent('table.items')).includes('Dritte Position'));
await page.click('#pos-body button[data-hoch="2"]');
await page.waitForTimeout(150);
let ersteZeile = await page.textContent('table.items tbody tr:nth-child(2) .desc');
ok('nach oben verschoben', ersteZeile.trim() === 'Dritte Position', ersteZeile);
await page.click('#pos-body button[data-weg="1"]');
await page.waitForTimeout(150);
ok('2 Positionen nach Entfernen', (await page.locator('table.items tbody tr').count()) === 2);

console.log('\n== 5. Gemischte Steuersätze (19 % + 7 %) ==');
await page.selectOption('#pos-body select[data-f="ust"] >> nth=1', '7');
await page.waitForTimeout(150);
totals = await page.textContent('.totals');
ok('zwei USt-Gruppen ausgewiesen', (totals.match(/% USt auf/g) || []).length === 2, totals);
ok('19 %-Gruppe vorhanden', totals.includes('19 % USt'), totals);
ok('7 %-Gruppe vorhanden', totals.includes('7 % USt'), totals);

console.log('\n== 6. Kleinunternehmerregelung § 19 ==');
await page.check('#f-kleinunternehmer');
await page.waitForTimeout(150);
totals = await page.textContent('.totals');
const note = await page.textContent('.note');
ok('kein USt-Ausweis mehr', !totals.includes('USt'), totals);
ok('§-19-Hinweis erscheint', note.includes('§ 19 UStG'), note);
ok('USt-Spalte im Kopf entfernt', !(await page.textContent('table.items thead')).includes('USt'));
const ustSpalteSichtbar = await page.locator('.pos-table th.ust-col').evaluate(el => getComputedStyle(el).visibility);
ok('USt-Spalte im Editor ausgeblendet', ustSpalteSichtbar === 'hidden', ustSpalteSichtbar);
await page.uncheck('#f-kleinunternehmer');
await page.waitForTimeout(100);

console.log('\n== 7. Reverse-Charge ==');
await page.check('#f-reverse');
await page.waitForTimeout(150);
ok('Reverse-Charge-Hinweis', (await page.textContent('.note')).includes('13b'));
ok('kein USt-Ausweis bei Reverse-Charge', !(await page.textContent('.totals')).includes('% USt'));
await page.uncheck('#f-reverse');
await page.waitForTimeout(100);

console.log('\n== 8. Rabatt ==');
await page.fill('#f-rabatt', '10');
await page.waitForTimeout(150);
totals = await page.textContent('.totals');
ok('Zwischensumme wird gezeigt', totals.includes('Zwischensumme'), totals);
ok('Rabattzeile mit Minus', totals.includes('−'), totals);
await page.fill('#f-rabatt', '0');
await page.waitForTimeout(100);

console.log('\n== 9. Fälligkeitsdatum ==');
await page.fill('#f-datum', '2026-03-20');
await page.fill('#f-zahlungsziel', '14');
await page.waitForTimeout(150);
let payBox = await page.textContent('.pay-box');
ok('Belegdatum 20.03.2026 formatiert', (await page.textContent('.doc-meta')).includes('20.03.2026'));
ok('Fälligkeit 03.04.2026 (Monatswechsel korrekt)', payBox.includes('03.04.2026'), payBox);
// Schaltjahr-Test
await page.fill('#f-datum', '2028-02-20');
await page.waitForTimeout(150);
payBox = await page.textContent('.pay-box');
ok('Schaltjahr: 20.02.2028 + 14 = 05.03.2028', payBox.includes('05.03.2028'), payBox);
await page.fill('#f-datum', '2026-03-20');
await page.waitForTimeout(100);

console.log('\n== 10. Belegart wechseln ==');
await page.selectOption('#f-typ', 'angebot');
await page.waitForTimeout(150);
ok('Titel = Angebot', (await page.textContent('.doc-title')) === 'Angebot');
ok('Angebotsnummer-Label', (await page.textContent('.doc-meta')).includes('Angebotsnummer'));
ok('Gültigkeitsbox statt Zahlungshinweisen', (await page.textContent('.pay-box')).includes('gültig bis'));
ok('Editor-Label umbenannt', (await page.textContent('#lbl-frist')).includes('gültig'));
await page.selectOption('#f-typ', 'gutschrift');
await page.waitForTimeout(150);
ok('Titel = Stornorechnung', (await page.textContent('.doc-title')) === 'Stornorechnung');
ok('Storno-Hinweis', (await page.textContent('.note')).includes('storniert'));
await page.selectOption('#f-typ', 'rechnung');
await page.waitForTimeout(100);

console.log('\n== 11. Stammdaten & Pflichtangaben-Prüfung ==');
let warn = await page.textContent('#pflicht-hinweis');
ok('Warnung listet fehlende Angaben', warn.includes('Steuernummer'), warn);
ok('Stammdaten-Karte beim Erststart offen', !(await page.locator('#card-absender').evaluate(el => el.classList.contains('collapsed'))));
await page.fill('#f-a-firma', 'Muster & Söhne <Design>');
await page.fill('#f-a-name', 'Martin Beispiel');
await page.fill('#f-a-strasse', 'Hauptstraße 1');
await page.fill('#f-a-plz', '10115');
await page.fill('#f-a-ort', 'Berlin');
await page.fill('#f-a-steuernummer', '12/345/67890');
await page.fill('#f-a-iban', 'DE02 1203 0000 0000 2020 51');
await page.fill('#f-e-firma', 'Kunden AG');
await page.fill('#f-e-ort', 'Hamburg');
await page.waitForTimeout(250);
warn = await page.textContent('#pflicht-hinweis');
ok('Warnung verschwindet, wenn alles ausgefüllt', warn.trim() === '', warn);

console.log('\n== 12. HTML-Escaping (XSS) ==');
const sender = await page.innerHTML('.sender-block');
ok('Sonderzeichen im Absender escaped', sender.includes('&amp;') && sender.includes('&lt;Design&gt;'), sender);
await page.fill('#pos-body input[data-f="beschreibung"] >> nth=0', '<img src=x onerror=alert(1)>');
await page.waitForTimeout(200);
ok('kein injiziertes <img> in der Vorschau', (await page.locator('table.items img').count()) === 0);
ok('Text wird literal angezeigt', (await page.textContent('table.items')).includes('<img src=x'));
await page.fill('#pos-body input[data-f="beschreibung"] >> nth=0', 'Konzeption und Beratung');
await page.waitForTimeout(150);

console.log('\n== 13. Kundenverwaltung ==');
await page.click('#btn-kunde-save');
await page.waitForTimeout(150);
ok('Kunde in Auswahlliste', (await page.locator('#f-kunde-select option').count()) === 2);
await page.fill('#f-e-firma', 'Andere GmbH');
await page.waitForTimeout(150);
await page.selectOption('#f-kunde-select', '0');
await page.waitForTimeout(200);
ok('Kunde wieder geladen', (await page.inputValue('#f-e-firma')) === 'Kunden AG');
ok('Vorschau aktualisiert', (await page.textContent('.recipient')).includes('Kunden AG'));

console.log('\n== 14. Persistenz über Neuladen ==');
await page.reload();
await page.waitForTimeout(400);
ok('Stammdaten-Karte nach Befüllung eingeklappt', await page.locator('#card-absender').evaluate(el => el.classList.contains('collapsed')));
await page.click('#card-absender > h2');
ok('Stammdaten überlebt Reload', (await page.inputValue('#f-a-ort')) === 'Berlin');
ok('Beleg überlebt Reload', (await page.inputValue('#f-e-firma')) === 'Kunden AG');
ok('Positionen überlebt Reload', (await page.locator('table.items tbody tr').count()) === 2);
ok('keine Fehler nach Reload', errors.length === 0, errors.join(' | '));

console.log('\n== 15. Neuer Beleg / fortlaufende Nummerierung ==');
const nummerVorher = await page.inputValue('#f-nummer');
page.on('dialog', d => d.accept());
await page.click('#btn-new');
await page.waitForTimeout(300);
const nummerNachher = await page.inputValue('#f-nummer');
ok('Belegnummer wurde hochgezählt', nummerVorher !== nummerNachher && /^RE-\d{4}-\d{3}$/.test(nummerNachher), nummerVorher + ' -> ' + nummerNachher);
ok('Stammdaten bleiben erhalten', (await page.inputValue('#f-a-ort')) === 'Berlin');
ok('Empfänger geleert', (await page.inputValue('#f-e-firma')) === '');

console.log('\n== 16. Export / Import ==');
const dl = await Promise.all([ page.waitForEvent('download'), page.click('#btn-export') ]);
const pfad = await dl[0].path();
const inhalt = JSON.parse(await (await import('fs/promises')).readFile(pfad, 'utf8'));
ok('Export enthält stamm/beleg/kunden', !!inhalt.stamm && !!inhalt.beleg && Array.isArray(inhalt.kunden));
ok('Dateiname aus Belegnummer', dl[0].suggestedFilename().startsWith('RE-'), dl[0].suggestedFilename());
await page.fill('#f-e-firma', 'Wird überschrieben');
await page.setInputFiles('#file-import', pfad);
await page.waitForTimeout(300);
ok('Import stellt Beleg wieder her', (await page.inputValue('#f-e-firma')) === '');
ok('Import ohne Fehler', errors.length === 0, errors.join(' | '));

console.log('\n== 17. PDF-Druck (A4, Editor ausgeblendet) ==');
await page.fill('#f-e-firma', 'Kunden AG');
await page.fill('#f-e-strasse', 'Hafenweg 3');
await page.fill('#f-e-plz', '20095');
await page.fill('#f-e-ort', 'Hamburg');
await page.waitForTimeout(200);
const pdf = await page.pdf({ format: 'A4', printBackground: true });
ok('PDF erzeugt (> 10 kB)', pdf.length > 10000, pdf.length + ' bytes');
await (await import('fs/promises')).writeFile(join(ausgabe,'probe.pdf'), pdf);
await page.emulateMedia({ media: 'print' });
ok('Editor im Druck ausgeblendet', !(await page.locator('.editor').isVisible()));
ok('Seite im Druck sichtbar', await page.locator('.page').isVisible());
const seitenBreite = await page.locator('.page').evaluate(el => el.getBoundingClientRect().width);
ok('Seitenbreite = 210 mm (~793 px)', Math.abs(seitenBreite - 793.7) < 3, String(seitenBreite));
await page.emulateMedia({ media: 'screen' });

console.log('\n== 18. Mobile Ansicht ==');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const bodyScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
ok('kein horizontales Scrollen auf 390 px', bodyScroll,
   await page.evaluate(() => document.documentElement.scrollWidth + ' > ' + window.innerWidth));
await page.screenshot({ path: join(ausgabe,'mobil.png') });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(300);
await page.screenshot({ path: join(ausgabe,'desktop.png'), fullPage: false });

console.log('\n== 19. Nullwerte / leere Eingaben ==');
await page.fill('#pos-body input[data-f="einzelpreis"] >> nth=0', '');
await page.waitForTimeout(150);
ok('leerer Preis führt nicht zu NaN', !(await page.textContent('.totals')).includes('NaN'), await page.textContent('.totals'));
await page.fill('#pos-body input[data-f="menge"] >> nth=0', 'abc');
await page.waitForTimeout(150);
ok('ungültige Menge führt nicht zu NaN', !(await page.textContent('.totals')).includes('NaN'));

console.log('\n== 20. Mengeneinheit: echtes Auswahlfeld ==');
{
  const einheit = page.locator('#pos-body select[data-f="einheit"]').first();
  ok('Einheit ist ein Auswahlfeld', await einheit.evaluate(el => el.tagName) === 'SELECT');
  ok('keine datalist mehr im DOM', (await page.locator('datalist').count()) === 0);
  const optionen = await einheit.locator('option').allTextContents();
  ok('Standardeinheiten vorhanden',
     ['Std.','Tag','Stück','Pauschale'].every(e => optionen.includes(e)), optionen.join(', '));
  ok('„Andere …“ als letzter Eintrag', optionen[optionen.length-1] === 'Andere …', optionen.join(', '));

  // Auswahl wirkt sich auf den Beleg aus
  await einheit.selectOption('Pauschale');
  await page.waitForTimeout(200);
  ok('Auswahl landet im Beleg',
     (await page.textContent('table.items tbody tr:nth-child(1)')).includes('Pauschale'));

  // Eigene Einheit erfassen
  await einheit.selectOption('__andere__');
  await page.waitForTimeout(200);
  const frei = page.locator('#pos-body input[aria-label="Eigene Einheit eingeben"]');
  ok('Eingabefeld erscheint', await frei.count() === 1);
  await frei.fill('m²');
  await frei.press('Enter');
  await page.waitForTimeout(250);
  ok('eigene Einheit übernommen',
     (await page.textContent('table.items tbody tr:nth-child(1)')).includes('m²'));
  const nachEigener = await page.locator('#pos-body select[data-f="einheit"]').first().locator('option').allTextContents();
  ok('eigene Einheit steht künftig zur Auswahl', nachEigener.includes('m²'), nachEigener.join(', '));

  // Abbruch mit Escape darf den Wert nicht zerstören
  await page.locator('#pos-body select[data-f="einheit"]').first().selectOption('__andere__');
  await page.waitForTimeout(200);
  await page.locator('#pos-body input[aria-label="Eigene Einheit eingeben"]').press('Escape');
  await page.waitForTimeout(250);
  ok('Abbruch behält bisherige Einheit',
     (await page.textContent('table.items tbody tr:nth-child(1)')).includes('m²'));

  // Leere Eingabe darf die Einheit nicht löschen
  await page.locator('#pos-body select[data-f="einheit"]').first().selectOption('__andere__');
  await page.waitForTimeout(200);
  await page.locator('#pos-body input[aria-label="Eigene Einheit eingeben"]').press('Enter');
  await page.waitForTimeout(250);
  ok('leere Eingabe behält bisherige Einheit',
     (await page.textContent('table.items tbody tr:nth-child(1)')).includes('m²'));

  // Eigene Einheiten überleben das Neuladen
  await page.reload();
  await page.waitForTimeout(400);
  const nachReload = await page.locator('#pos-body select[data-f="einheit"]').first().locator('option').allTextContents();
  ok('eigene Einheit überlebt Neuladen', nachReload.includes('m²'), nachReload.join(', '));

  // Eine importierte, unbekannte Einheit darf nicht verlorengehen
  await page.setInputFiles('#file-import', new URL('../produkt/beispiel-beleg.json', import.meta.url).pathname);
  await page.waitForTimeout(400);
  const vierte = page.locator('#pos-body select[data-f="einheit"]').nth(3);
  ok('importierte Einheit bleibt ausgewählt', await vierte.inputValue() === 'Stück', await vierte.inputValue());
  ok('importierter Beleg zeigt Pauschale',
     (await page.textContent('table.items')).includes('Pauschale'));
}

console.log('\n== 21. Ohne dauerhaften Speicher (privates Fenster, blockierte Daten, iframe) ==');
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
  ok('Vorschau wird trotzdem gerendert', (await pOhne.textContent('.doc-title')) === 'Rechnung');
  ok('Positionen bedienbar', (await pOhne.locator('#pos-body tr.pos-row').count()) === 2);

  // Rechnen muss vollständig funktionieren:
  // Position 1 auf 3 × 100 € setzen, Position 2 bleibt 12 × 85 € = 1.020 €
  // -> netto 1.320,00 €, 19 % = 250,80 €, brutto 1.570,80 €
  await pOhne.fill('#pos-body input[data-f="einzelpreis"] >> nth=0', '100');
  await pOhne.fill('#pos-body input[data-f="menge"] >> nth=0', '3');
  await pOhne.waitForTimeout(200);
  const summenOhne = await pOhne.textContent('.totals');
  ok('Berechnung funktioniert weiter', summenOhne.includes('1.320,00 €'), summenOhne);
  ok('Umsatzsteuer wird weiter ausgewiesen', summenOhne.includes('250,80 €'), summenOhne);
  ok('Gesamtbetrag korrekt', summenOhne.includes('1.570,80 €'), summenOhne);

  // Der Nutzer muss erfahren, dass nichts behalten wird
  const warnungen = await pOhne.locator('.hint.warn').allTextContents();
  ok('sichtbarer Hinweis auf fehlenden Speicher',
     warnungen.some(t => t.includes('kein dauerhaftes Speichern')), warnungen.join(' | '));
  ok('Hinweis auch in der Kopfzeile',
     (await pOhne.textContent('.toolbar .brand small')).includes('nicht möglich'));

  // Sichern als JSON ist der Ausweg und muss verfügbar bleiben
  const [ladung] = await Promise.all([ pOhne.waitForEvent('download'), pOhne.click('#btn-export') ]);
  ok('Sichern als .json weiterhin möglich', !!(await ladung.path()));

  ok('keine JS-Fehler ohne Speicher', fehlerOhne.length === 0, fehlerOhne.join(' | '));
  await ctxOhne.close();
}

console.log('\n== Fehlerprotokoll ==');
ok('insgesamt keine JS-Fehler', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(fails === 0 ? '\nALLE TESTS BESTANDEN' : `\n${fails} TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
