/*
 * Erzeugt die Etsy-Bilder für das Belegpaket und für das Bundle.
 *
 * Ausführen:  node marketing/listing-bilder-belegpaket.mjs
 * Ergebnis:   assets/etsy/b1-hero.png … b6-lieferumfang.png   (Listing, 2000 × 2000)
 *             assets/etsy/bundle-1-hero.png … bundle-2-*.png  (Bundle-Listing)
 *
 * Farben, Schriften und Bausteine kommen aus gestaltung.mjs — dieselbe Quelle
 * wie beim Rechnungsgenerator, damit beide Listings zum selben Shop gehören.
 *
 * Die Belege in den Bildern werden nicht nachgebaut, sondern von den Werkzeugen
 * selbst gerendert. Ändert sich ein Produkt, ändern sich die Bilder mit.
 */
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tafel as bildTafel, alsDatenURI } from './gestaltung.mjs';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const hier   = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, '..');
const belegpaket = 'file://' + join(wurzel, 'produkt', 'belegpaket.html');
const rechnung   = 'file://' + join(wurzel, 'produkt', 'rechnungsgenerator.html');
const ziel   = join(wurzel, 'assets', 'etsy');
await mkdir(ziel, { recursive: true });

// Deutsche Oberflächensprache: sonst zeigen Datumsfelder das US-Format
const browser = await chromium.launch({ args:['--lang=de-DE'] });
const tafel = (datei, koerper, extra='') => bildTafel(browser, ziel, datei, koerper, extra);

/* ---------------------------------------------------------------
   1. Belege von den echten Werkzeugen rendern

   Alle Datumsangaben sind fest gesetzt: Die Bilder sollen sich nicht
   verändern, nur weil sie an einem anderen Tag erzeugt werden.
   --------------------------------------------------------------- */
async function belegpaketSeite(einrichten){
  const seite = await browser.newPage({ viewport:{ width:1000, height:1400 },
    deviceScaleFactor:2, locale:'de-DE' });
  await seite.goto(belegpaket);
  await seite.waitForTimeout(300);

  const f = (sel,val) => seite.fill(sel,val);
  await f('#f-a-firma','Studio Nordlicht');            await f('#f-a-name','Martin Johann');
  await f('#f-a-strasse','Lindenallee 42');            await f('#f-a-plz','20144');
  await f('#f-a-ort','Hamburg');                       await f('#f-a-telefon','+49 40 123456');
  await f('#f-a-email','hallo@studio-nordlicht.de');
  await f('#f-a-steuernummer','42/123/45678');         await f('#f-a-bank','Hamburger Sparkasse');
  await f('#f-a-iban','DE02 2005 0550 1234 5678 90');  await f('#f-a-bic','HASPDEHHXXX');
  await f('#f-e-firma','Nordwind Handels GmbH');       await f('#f-e-name','Frau Erika Muster');
  await f('#f-e-strasse','Hafenstraße 17');            await f('#f-e-plz','28195');
  await f('#f-e-ort','Bremen');                        await f('#f-e-kdnr','K-2026-118');

  await einrichten(seite, f);
  await seite.waitForTimeout(400);
  return seite;
}

async function alsSeitenbild(seite){
  await seite.emulateMedia({ media:'print' });
  await seite.setViewportSize({ width:794, height:1123 });
  await seite.waitForTimeout(300);
  return alsDatenURI(await seite.locator('.page').screenshot());
}

/* --- 2. Mahnung mit Zinsen, Gebühr und Verzugspauschale --- */
const sMahnung = await belegpaketSeite(async (seite, f) => {
  await seite.selectOption('#f-typ','mahnung2');
  await f('#f-datum','2026-05-18');
  await f('#f-r-nummer','RE-2026-001');   await f('#f-r-datum','2026-03-30');
  await f('#f-r-faellig','2026-04-13');   await f('#f-r-betrag','6501,09');
  await f('#f-z-ab','2026-04-14');        await f('#f-z-gebuehr','5');
  await seite.check('#f-z-pauschale');
});
const forderungsBlock = alsDatenURI(await sMahnung.locator('.totals').screenshot());
const belegMahnung = await alsSeitenbild(sMahnung);
await sMahnung.close();

/* --- Stundenzettel über zwei Kalenderwochen --- */
const sStunden = await belegpaketSeite(async (seite, f) => {
  await seite.selectOption('#f-typ','stundenzettel');
  await f('#f-datum','2026-04-01');
  await f('#f-s-zeitraum','März 2026');
  await f('#f-s-projekt','Relaunch Unternehmenswebsite');
  const tage = [
    ['2026-03-02','Konzeptworkshop beim Kunden','09:00','17:00','60'],
    ['2026-03-03','Informationsarchitektur, Wireframes','08:30','15:00','30'],
    ['2026-03-09','Screendesign Startseite','09:00','18:00','45'],
    ['2026-03-10','Abstimmung mit dem Auftraggeber','10:00','13:00','0']
  ];
  for(let i = 0; i < tage.length; i++){
    if(i > 0) await seite.click('#btn-std-add');
    await f(`#std-body input[data-f="datum"] >> nth=${i}`, tage[i][0]);
    await f(`#std-body input[data-f="taetigkeit"] >> nth=${i}`, tage[i][1]);
    await f(`#std-body input[data-f="von"] >> nth=${i}`, tage[i][2]);
    await f(`#std-body input[data-f="bis"] >> nth=${i}`, tage[i][3]);
    await f(`#std-body input[data-f="pause"] >> nth=${i}`, tage[i][4]);
  }
  await seite.check('#f-s-abrechnen');
  await f('#f-s-satz','95');
});
const belegStunden = await alsSeitenbild(sStunden);
await sStunden.close();

/* --- Lieferschein ohne Preise --- */
const positionen = [
  ['Eichenholzregal „Nordkap“, geölt', '4', 'Stück', '480'],
  ['Wandhalterung Edelstahl, Set',     '8', 'Set',    '39,50'],
  ['Montagematerial',                  '1', 'Karton', '24'],
  ['Lieferung und Aufbau vor Ort',     '5', 'Std.',   '65']
];
async function positionenEintragen(seite, f){
  for(let i = 0; i < positionen.length; i++){
    if(i > 0) await seite.click('#btn-pos-add');
    await f(`#pos-body input[data-f="beschreibung"] >> nth=${i}`, positionen[i][0]);
    await f(`#pos-body input[data-f="menge"] >> nth=${i}`, positionen[i][1]);
    const einheit = seite.locator('#pos-body select[data-f="einheit"]').nth(i);
    if((await einheit.locator(`option[value="${positionen[i][2]}"]`).count()) > 0)
      await einheit.selectOption(positionen[i][2]);
    // Beim Lieferschein gibt es die Preisspalte nicht – dann bleibt sie leer
    const preis = seite.locator('#pos-body input[data-f="einzelpreis"]').nth(i);
    if(await preis.isVisible()) await preis.fill(positionen[i][3]);
  }
}

const sLiefer = await belegpaketSeite(async (seite, f) => {
  await seite.selectOption('#f-typ','lieferschein');
  await f('#f-datum','2026-04-22');
  await f('#f-v-bestellnr','B-2026-0417');  await f('#f-v-bestelldatum','2026-04-08');
  await f('#f-v-termin','22.04.2026');      await f('#f-v-versand','Spedition Nordfracht');
  await positionenEintragen(seite, f);
});
const belegLiefer = await alsSeitenbild(sLiefer);
await sLiefer.close();

/* --- Auftragsbestätigung mit Preisen --- */
const sAuftrag = await belegpaketSeite(async (seite, f) => {
  await seite.selectOption('#f-typ','auftrag');
  await f('#f-datum','2026-04-09');
  await f('#f-v-bestellnr','B-2026-0417');  await f('#f-v-bestelldatum','2026-04-08');
  await f('#f-v-termin','KW 17 2026');
  await positionenEintragen(seite, f);
});
const belegAuftrag = await alsSeitenbild(sAuftrag);
await sAuftrag.close();

/* --- Der Verzugsrechner im Editor --- */
const sEditor = await belegpaketSeite(async (seite, f) => {
  await seite.selectOption('#f-typ','mahnung2');
  await f('#f-datum','2026-05-18');
  await f('#f-r-nummer','RE-2026-001');   await f('#f-r-datum','2026-03-30');
  await f('#f-r-faellig','2026-04-13');   await f('#f-r-betrag','6501,09');
  await f('#f-z-ab','2026-04-14');        await f('#f-z-gebuehr','5');
  await seite.check('#f-z-pauschale');
  await seite.evaluate(() => {
    document.querySelectorAll('[data-card]').forEach(c => {
      if(c.id !== 'karte-verzug') c.classList.add('collapsed');
    });
    document.querySelector('.toolbar').style.position = 'static';
    /* Chromium stellt Datumsfelder im Format der Browsersprache dar. Käufer mit
       deutschem Browser sehen 14.04.2026 – für das Bild wird genau das gezeigt. */
    document.querySelectorAll('input[type=date]').forEach(el => {
      const [jahr, monat, tag] = el.value.split('-');
      el.type = 'text';
      el.value = `${tag}.${monat}.${jahr}`;
    });
  });
});
const verzugKarte = alsDatenURI(await sEditor.locator('#karte-verzug').screenshot());
await sEditor.close();

/* --- Eine Rechnung aus Produkt 1 für das Bundle-Bild --- */
const sRechnung = await browser.newPage({ viewport:{ width:1000, height:1400 },
  deviceScaleFactor:2, locale:'de-DE' });
await sRechnung.goto(rechnung);
await sRechnung.waitForTimeout(300);
{
  const f = (sel,val) => sRechnung.fill(sel,val);
  await f('#f-a-firma','Studio Nordlicht');            await f('#f-a-name','Martin Johann');
  await f('#f-a-strasse','Lindenallee 42');            await f('#f-a-plz','20144');
  await f('#f-a-ort','Hamburg');                       await f('#f-a-telefon','+49 40 123456');
  await f('#f-a-email','hallo@studio-nordlicht.de');
  await f('#f-a-steuernummer','42/123/45678');         await f('#f-a-bank','Hamburger Sparkasse');
  await f('#f-a-iban','DE02 2005 0550 1234 5678 90');  await f('#f-a-bic','HASPDEHHXXX');
  await f('#f-e-firma','Nordwind Handels GmbH');       await f('#f-e-name','Frau Erika Muster');
  await f('#f-e-strasse','Hafenstraße 17');            await f('#f-e-plz','28195');
  await f('#f-e-ort','Bremen');                        await f('#f-e-kdnr','K-2026-118');
  await f('#f-betreff','Relaunch Unternehmenswebsite');
  await f('#f-datum','2026-03-30');                    await f('#f-leistung','02.03. – 27.03.2026');
  await f('#pos-body input[data-f="beschreibung"] >> nth=0','Konzeption und Beratung');
  await f('#pos-body input[data-f="menge"] >> nth=0','8');
  await f('#pos-body input[data-f="einzelpreis"] >> nth=0','95');
  await f('#pos-body input[data-f="beschreibung"] >> nth=1','Screendesign und Umsetzung');
  await f('#pos-body input[data-f="menge"] >> nth=1','22');
  await f('#pos-body input[data-f="einzelpreis"] >> nth=1','95');
}
const belegRechnung = await alsSeitenbild(sRechnung);
await sRechnung.close();

/* ---------------------------------------------------------------
   2. Bildtafeln für das Listing „Belegpaket“
   --------------------------------------------------------------- */
console.log('Belegpaket:');

/* 1 – Hero: die Behauptung plus der echte Beleg als Beweis */
await tafel('b1-hero.png', `
  <div class="tafel">
    <span class="augenbraue">Für Selbstständige &amp; Kleinunternehmer</span>
    <h1 class="klein">Kunde zahlt nicht?<br><em>Mahnung in 2 Minuten.</em></h1>
    <p class="unterzeile">Zahlungserinnerung, Mahnung, Auftragsbestätigung,
      Lieferschein und Stundenzettel — eine Datei, offline im Browser.</p>
    <div class="ausschnitt">
      <img class="beleg" src="${belegMahnung}" style="width:1180px;margin-top:-62px">
    </div>
  </div>
  <div class="fuss"><span>Sofort-Download · Keine Installation</span><span><b>Einmal zahlen</b></span></div>
`);

/* 2 – Was drin ist */
await tafel('b2-belegarten.png', `
  <div class="tafel">
    <span class="augenbraue">Sechs Belege in einer Datei</span>
    <h1 class="klein">Alles, was neben<br>der Rechnung anfällt.</h1>
    <ul class="streuen">
      <li><span class="haken">✓</span><div>Zahlungserinnerung
        <small>Der freundliche erste Anstoß — bewusst ohne Gebühren</small></div></li>
      <li><span class="haken">✓</span><div>1. und 2. Mahnung
        <small>Mit Bezug auf Rechnung und Fälligkeit, neuer Frist und Verzugskosten</small></div></li>
      <li><span class="haken">✓</span><div>Auftragsbestätigung
        <small>Leistung, Termin und Preis verbindlich festhalten</small></div></li>
      <li><span class="haken">✓</span><div>Lieferschein
        <small>Positionen ohne Preise, mit Feld für die Empfangsbestätigung</small></div></li>
      <li><span class="haken">✓</span><div>Stundenzettel
        <small>Zeiten, Pausen, Summe je Kalenderwoche — zum Gegenzeichnen</small></div></li>
    </ul>
  </div>
  <div class="fuss"><span>Live-Vorschau · Speichern als PDF</span><span><b>Läuft offline</b></span></div>
`);

/* 3 – Das Merkmal, das den Unterschied macht: der Verzugsrechner */
await tafel('b3-zinsen.png', `
  <div class="tafel">
    <span class="augenbraue">Verzugszinsen nach § 288 BGB</span>
    <h1 class="klein">Die Zinsen rechnet<br>es selbst aus.</h1>
    <p class="unterzeile">Taggenau vom Verzugsbeginn — 5 Prozentpunkte über
      Basiszinssatz bei Verbrauchern, 9 bei Unternehmen.</p>
    <div class="stapel">
      <img class="beleg" src="${verzugKarte}" style="width:1620px">
      <img class="beleg forderung" src="${forderungsBlock}" style="width:820px">
    </div>
  </div>
  <div class="fuss"><span>Mahngebühr · Verzugspauschale 40 €</span><span><b>Kein Taschenrechner</b></span></div>
`, `
  .stapel{flex:1;min-height:0;display:flex;flex-direction:column;align-items:flex-start;
          gap:36px;margin-top:40px;overflow:hidden}
  .stapel img{border-radius:14px}
  .stapel img.forderung{align-self:flex-end;padding:30px 40px;background:var(--papier)}
`);

/* 4 – Stundenzettel */
await tafel('b4-stundenzettel.png', `
  <div class="tafel">
    <span class="augenbraue">Stundenzettel</span>
    <h1 class="klein">Von 08:30 bis 15:00,<br>abzüglich Pause.</h1>
    <p class="unterzeile">Zeiten eintragen, Stunden stehen da. Über mehrere
      Wochen mit Summe je Kalenderwoche.</p>
    <div class="ausschnitt">
      <img class="beleg" src="${belegStunden}" style="width:1150px;margin-top:-100px">
    </div>
  </div>
  <div class="fuss"><span>Mit oder ohne Stundensatz</span><span><b>Zum Gegenzeichnen</b></span></div>
`);

/* 5 – Lieferschein */
await tafel('b5-lieferschein.png', `
  <div class="tafel">
    <span class="augenbraue">Lieferschein &amp; Auftragsbestätigung</span>
    <h1 class="klein">Derselbe Vorgang,<br>zweimal ausgegeben.</h1>
    <p class="unterzeile">Positionen einmal eintragen: Die Auftragsbestätigung
      zeigt die Preise, der Lieferschein lässt sie weg.</p>
    <div class="zwei">
      <img class="beleg" src="${belegAuftrag}">
      <img class="beleg" src="${belegLiefer}">
    </div>
  </div>
  <div class="fuss"><span>Umsatzsteuer je Satz · § 19 · Reverse-Charge</span><span><b>Mit Empfangsfeld</b></span></div>
`, `
  .zwei{flex:1;min-height:0;display:flex;gap:56px;justify-content:center;margin-top:56px;overflow:hidden}
  .zwei img{width:760px;align-self:flex-start}
`);

/* 6 – Lieferumfang und Datenschutz */
await tafel('b6-lieferumfang.png', `
  <div class="tafel">
    <span class="augenbraue">Das bekommst du</span>
    <h1 class="klein">Vier Dateien.<br>Sonst nichts.</h1>
    <ul class="streuen" style="margin-top:44px">
      <li><span class="haken">✓</span><div>belegpaket.html
        <small>Alle sechs Belegarten — eine einzige Datei</small></div></li>
      <li><span class="haken">✓</span><div>ANLEITUNG
        <small>Einrichtung, Verzugszinsen, PDF-Export, häufige Fragen</small></div></li>
      <li><span class="haken">✓</span><div>Beispielbeleg
        <small>Ausgefüllt zum Ausprobieren</small></div></li>
      <li><span class="haken">✓</span><div>Lizenz
        <small>Dauerhafte Nutzung für dich und dein Unternehmen</small></div></li>
    </ul>
    <div style="margin-top:74px;padding:44px 50px;background:var(--papier);border:1px solid var(--linie)">
      <div style="font-size:44px;font-weight:700;margin-bottom:16px">Deine Daten bleiben bei dir.</div>
      <div style="font-size:38px;color:var(--gedaempft);line-height:1.35">
        Kein Server, keine Cloud, kein Tracking. Die Datei enthält keine
        einzige Verbindung nach außen.</div>
    </div>
  </div>
  <div class="fuss"><span>Sofort-Download nach dem Kauf</span><span><b>Kein Abo, keine Folgekosten</b></span></div>
`);

/* ---------------------------------------------------------------
   3. Bildtafeln für das Bundle-Listing
   --------------------------------------------------------------- */
console.log('\nBundle:');

await tafel('bundle-1-hero.png', `
  <div class="tafel">
    <span class="augenbraue">Beide Werkzeuge zusammen</span>
    <h1 class="klein">Rechnung schreiben.<br><em>Und notfalls mahnen.</em></h1>
    <p class="unterzeile">Der Rechnungsgenerator und das Belegpaket im Set —
      zusammen günstiger als einzeln.</p>
    <div class="zwei">
      <img class="beleg" src="${belegRechnung}">
      <img class="beleg" src="${belegMahnung}">
    </div>
  </div>
  <div class="fuss"><span>Zwei Dateien · Sofort-Download</span><span><b>Einmal zahlen</b></span></div>
`, `
  .zwei{flex:1;min-height:0;display:flex;gap:56px;justify-content:center;margin-top:56px;overflow:hidden}
  .zwei img{width:760px;align-self:flex-start}
`);

await tafel('bundle-2-uebernahme.png', `
  <div class="tafel">
    <span class="augenbraue">Warum das Set zusammengehört</span>
    <h1 class="klein">Aus der Rechnung<br>wird die Mahnung.</h1>
    <div class="schritte streuen">
      <div class="schritt"><span class="zahl">1</span><div>
        <h2>Rechnung sichern</h2>
        <p>Im Rechnungsgenerator auf „Sichern (.json)“ klicken — das machst du
           ohnehin, es ist deine Arbeitskopie.</p></div></div>
      <div class="schritt"><span class="zahl">2</span><div>
        <h2>Im Belegpaket übernehmen</h2>
        <p>Knopf „Rechnung übernehmen“, Datei auswählen. Stammdaten, Kunde,
           Rechnungsnummer, Fälligkeit und Betrag stehen sofort da.</p></div></div>
      <div class="schritt"><span class="zahl">3</span><div>
        <h2>Mahnung drucken</h2>
        <p>Verzugszinsen rechnet das Werkzeug selbst. Frist wählen,
           als PDF speichern, fertig.</p></div></div>
    </div>
  </div>
  <div class="fuss"><span>Keine Daten zweimal eintippen</span><span><b>Zwei Klicks</b></span></div>
`);

await browser.close();
console.log('\nFertig: assets/etsy/');
