/*
 * Erzeugt sämtliche Etsy-Bilder aus dem echten Produkt.
 *
 * Ausführen:  node marketing/listing-bilder.mjs
 * Ergebnis:   assets/etsy/01-hero.png … 06-lieferumfang.png  (Listing, 2000 × 2000)
 *             assets/etsy/shop-banner.png                    (1600 × 400)
 *             assets/etsy/shop-icon.png                      (500 × 500)
 *
 * Die Belege in den Bildern werden nicht nachgebaut, sondern vom Werkzeug
 * selbst gerendert. Ändert sich das Produkt, ändern sich die Bilder mit.
 */
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tafel as bildTafel, shopTafel as bildShopTafel, alsDatenURI } from './gestaltung.mjs';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const hier    = dirname(fileURLToPath(import.meta.url));
const wurzel  = join(hier, '..');
const produkt = 'file://' + join(wurzel, 'produkt', 'rechnungsgenerator.html');
const ziel    = join(wurzel, 'assets', 'etsy');
await mkdir(ziel, { recursive: true });

const browser = await chromium.launch();

/* ---------------------------------------------------------------
   1. Belege vom echten Werkzeug rendern
   --------------------------------------------------------------- */
async function belegSeite(anpassen){
  const seite = await browser.newPage({ viewport:{ width:900, height:1300 }, deviceScaleFactor:2 });
  await seite.goto(produkt);
  await seite.waitForTimeout(300);

  const f = (sel,val) => seite.fill(sel,val);
  await f('#f-a-firma','Studio Nordlicht');        await f('#f-a-name','Martin Johann');
  await f('#f-a-strasse','Lindenallee 42');        await f('#f-a-plz','20144');
  await f('#f-a-ort','Hamburg');                   await f('#f-a-telefon','+49 40 123456');
  await f('#f-a-email','hallo@studio-nordlicht.de');
  await f('#f-a-steuernummer','42/123/45678');     await f('#f-a-bank','Hamburger Sparkasse');
  await f('#f-a-iban','DE02 2005 0550 1234 5678 90'); await f('#f-a-bic','HASPDEHHXXX');
  await f('#f-e-firma','Nordwind Handels GmbH');   await f('#f-e-name','z. Hd. Frau Erika Muster');
  await f('#f-e-strasse','Hafenstraße 17');        await f('#f-e-plz','28195');
  await f('#f-e-ort','Bremen');                    await f('#f-e-kdnr','K-2026-118');
  await f('#f-betreff','Relaunch Unternehmenswebsite');
  await f('#f-leistung','02.03. – 27.03.2026');    await f('#f-datum','2026-03-30');
  await f('#pos-body input[data-f="beschreibung"] >> nth=0','Konzeption und Beratung');
  await f('#pos-body input[data-f="menge"] >> nth=0','8');
  await f('#pos-body input[data-f="einzelpreis"] >> nth=0','95');
  await f('#pos-body input[data-f="beschreibung"] >> nth=1','Screendesign und Umsetzung');
  await f('#pos-body input[data-f="menge"] >> nth=1','22');
  await f('#pos-body input[data-f="einzelpreis"] >> nth=1','95');
  if(anpassen) await anpassen(seite);
  await seite.waitForTimeout(400);
  await seite.emulateMedia({ media:'print' });
  await seite.setViewportSize({ width:794, height:1123 });
  await seite.waitForTimeout(300);
  return seite;
}

// Regelbesteuert
const s1 = await belegSeite();
const belegNormal = alsDatenURI(await s1.locator('.page').screenshot());
// Summenblock einzeln – im Banner ist die ganze Seite zu klein zum Lesen
const summenBlock = alsDatenURI(await s1.locator('.totals').screenshot());
await s1.close();

// Kleinunternehmer nach § 19 UStG – der entscheidende Unterschied für die Zielgruppe
const s2 = await belegSeite(async seite => {
  await seite.check('#f-kleinunternehmer');
  await seite.fill('#f-betreff','Fotoauftrag Frühjahrskampagne');
});
const belegKlein = alsDatenURI(await s2.locator('.page').screenshot());
await s2.close();

// Editor mit Positionen
const s3 = await browser.newPage({ viewport:{ width:820, height:760 }, deviceScaleFactor:2 });
await s3.goto(produkt);
await s3.waitForTimeout(300);
await s3.fill('#pos-body input[data-f="beschreibung"] >> nth=0','Konzeption und Beratung');
await s3.fill('#pos-body input[data-f="menge"] >> nth=0','8');
await s3.fill('#pos-body input[data-f="einzelpreis"] >> nth=0','95');
await s3.fill('#pos-body input[data-f="beschreibung"] >> nth=1','Screendesign und Umsetzung');
await s3.fill('#pos-body input[data-f="menge"] >> nth=1','22');
await s3.fill('#pos-body input[data-f="einzelpreis"] >> nth=1','95');
await s3.evaluate(() => {
  document.querySelectorAll('[data-card]').forEach((c,i) => { if(i !== 2) c.classList.add('collapsed'); });
  document.querySelector('.toolbar').style.position = 'static';
});
await s3.waitForTimeout(400);
const editor = alsDatenURI(await s3.locator('[data-card]:nth-of-type(3)').screenshot());
await s3.close();

/* ---------------------------------------------------------------
   2. Bildtafeln – Farben, Schriften und Bausteine aus gestaltung.mjs
   --------------------------------------------------------------- */
const tafel = (datei, koerper, extra='') => bildTafel(browser, ziel, datei, koerper, extra);

console.log('Bildtafeln:');

/* 1 – Hero: die Behauptung plus der echte Beleg als Beweis */
await tafel('01-hero.png', `
  <div class="tafel">
    <span class="augenbraue">Für Kleinunternehmer &amp; Selbstständige</span>
    <h1>Rechnung schreiben.<br><em>Ohne Abo.</em></h1>
    <p class="unterzeile">Rechnungen, Angebote und Stornos als PDF —
      in einer einzigen Datei, die offline im Browser läuft.</p>
    <div class="ausschnitt">
      <img class="beleg" src="${belegNormal}" style="width:1180px;margin-top:-62px">
    </div>
  </div>
  <div class="fuss"><span>Sofort-Download · Keine Installation</span><span><b>Einmal zahlen</b></span></div>
`);

/* 2 – Funktionsumfang */
await tafel('02-funktionen.png', `
  <div class="tafel">
    <span class="augenbraue">Was das Werkzeug kann</span>
    <h1 class="klein">Es rechnet.<br>Du schreibst nur.</h1>
    <ul class="streuen">
      <li><span class="haken">✓</span><div>Rechnung, Angebot und Stornorechnung
        <small>Beschriftungen und Hinweistexte passen sich automatisch an</small></div></li>
      <li><span class="haken">✓</span><div>Kleinunternehmerregelung § 19 UStG per Häkchen
        <small>Der vorgeschriebene Hinweis erscheint von selbst auf dem Beleg</small></div></li>
      <li><span class="haken">✓</span><div>Umsatzsteuer 19 %, 7 % — auch gemischt in einer Rechnung
        <small>Je Steuersatz sauber gruppiert ausgewiesen</small></div></li>
      <li><span class="haken">✓</span><div>Prüfung der Pflichtangaben nach § 14 UStG
        <small>Sagt dir, was fehlt, bevor die Rechnung rausgeht</small></div></li>
      <li><span class="haken">✓</span><div>Fortlaufende Nummern, Kundenliste, eigenes Logo
        <small>Stammdaten trägst du genau einmal ein</small></div></li>
    </ul>
  </div>
  <div class="fuss"><span>Live-Vorschau · Speichern als PDF</span><span><b>Läuft offline</b></span></div>
`);

/* 3 – § 19: das entscheidende Merkmal, mit echtem Beleg belegt */
await tafel('03-paragraf19.png', `
  <div class="tafel">
    <span class="augenbraue">Kleinunternehmerregelung</span>
    <h1 class="klein">Ein Häkchen —<br>und § 19 sitzt.</h1>
    <p class="unterzeile">Keine Umsatzsteuer auf dem Beleg, der Pflichthinweis
      automatisch an der richtigen Stelle.</p>
    <div class="ausschnitt">
      <img class="beleg" src="${belegKlein}" style="width:1150px;margin-top:-140px">
    </div>
  </div>
  <div class="fuss"><span>Auch Reverse-Charge für EU-Kunden</span><span><b>§ 19 UStG</b></span></div>
`);

/* 4 – Ablauf */
await tafel('04-so-gehts.png', `
  <div class="tafel">
    <span class="augenbraue">So funktioniert es</span>
    <h1 class="klein">Drei Schritte,<br>dann liegt das PDF da.</h1>
    <div class="schritte streuen">
      <div class="schritt"><span class="zahl">1</span><div>
        <h2>Datei öffnen</h2>
        <p>Doppelklick auf die HTML-Datei. Sie öffnet sich im Browser —
           keine Installation, kein Konto, keine Internetverbindung.</p></div></div>
      <div class="schritt"><span class="zahl">2</span><div>
        <h2>Einmal deine Daten eintragen</h2>
        <p>Anschrift, Steuernummer, Bankverbindung, Logo. Wird gespeichert
           und steht bei jeder weiteren Rechnung bereit.</p></div></div>
      <div class="schritt"><span class="zahl">3</span><div>
        <h2>Positionen eintippen, PDF speichern</h2>
        <p>Alles wird automatisch berechnet. Über den Druckdialog
           als PDF sichern und versenden.</p></div></div>
    </div>
  </div>
  <div class="fuss"><span>Windows · Mac · Linux · Tablet</span><span><b>In 5 Minuten eingerichtet</b></span></div>
`);

/* 5 – Der Editor */
await tafel('05-editor.png', `
  <div class="tafel">
    <span class="augenbraue">Die Bedienung</span>
    <h1 class="klein">Eintragen, fertig.<br>Kein Taschenrechner.</h1>
    <p class="unterzeile">Menge, Einheit, Preis — die Summen stehen sofort da.
      Kommazahlen deutsch: <b style="color:var(--tinte)">39,50</b> funktioniert.</p>
    <div class="ausschnitt">
      <img class="beleg" src="${editor}" style="width:1560px;border-radius:14px">
    </div>
  </div>
  <div class="fuss"><span>Positionen verschieben · Rabatt · Mehrere Steuersätze</span><span><b>Live-Vorschau</b></span></div>
`);

/* 6 – Lieferumfang und Datenschutz */
await tafel('06-lieferumfang.png', `
  <div class="tafel">
    <span class="augenbraue">Das bekommst du</span>
    <h1 class="klein">Vier Dateien.<br>Sonst nichts.</h1>
    <ul class="streuen" style="margin-top:44px">
      <li><span class="haken">✓</span><div>rechnungsgenerator.html
        <small>Das komplette Werkzeug — eine einzige Datei</small></div></li>
      <li><span class="haken">✓</span><div>ANLEITUNG
        <small>Einrichtung, PDF-Export, häufige Fragen</small></div></li>
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
   3. Shop-Banner und Shop-Bild für „Papierkramerei"
   --------------------------------------------------------------- */
const shopTafel = (datei, breite, hoehe, koerper, extra='') =>
  bildShopTafel(browser, ziel, datei, breite, hoehe, koerper, extra);

console.log('\nShop:');

/* Banner 1600 × 400 (wird mit doppelter Auflösung gerendert).
   Unten links bleibt frei — dort legt Etsy das Shop-Bild darüber. */
await shopTafel('shop-banner.png', 1600, 400, `
  <div class="banner">
    <div class="banner-text">
      <div class="wortmarke">Papierkramerei</div>
      <div class="banner-zeile">Werkzeuge gegen den Papierkram — für Selbstständige und Kleinunternehmer</div>
    </div>
    <div class="banner-karte">
      <img src="${summenBlock}" alt="">
    </div>
  </div>
`, `
  .banner{height:100%;display:flex;align-items:center;gap:70px;padding:0 80px;overflow:hidden}
  .banner-text{flex:1;min-width:0}
  .wortmarke{
    font-family:"Bitstream Charter","DejaVu Serif",serif;font-size:76px;font-weight:700;
    letter-spacing:-.015em;line-height:1;
  }
  .banner-zeile{
    font-size:25px;color:var(--gedaempft);margin-top:20px;line-height:1.35;
    padding-top:20px;border-top:3px solid var(--tinte);display:inline-block;
  }
  /* Lesbarer Ausschnitt statt verkleinerter Gesamtseite */
  .banner-karte{
    flex:0 0 auto;background:var(--papier);border:1px solid var(--linie);
    box-shadow:0 20px 50px rgba(18,24,38,.18);padding:34px 40px;
  }
  .banner-karte img{width:400px;display:block}
`);

/* Shop-Bild 500 × 500 — muss auch als 40-px-Kreis noch lesbar sein.
   Das P wird nicht nach Augenmaß ausgerichtet: Ein Skript misst im Browser die
   tatsächliche Tintenbreite der Glyphe und gleicht deren Seitenräume aus. */
await shopTafel('shop-icon.png', 500, 500, `
  <div class="icon">
    <div class="icon-p">P</div>
    <div class="icon-strich"></div>
  </div>
  <script>
    (function ausrichten(){
      const el = document.querySelector('.icon-p');
      const stil = getComputedStyle(el);
      const mass = document.createElement('canvas').getContext('2d');
      mass.font = stil.fontWeight + ' ' + stil.fontSize + ' ' + stil.fontFamily;
      const m = mass.measureText('P');
      // Versatz zwischen Mitte des Textkastens und Mitte der sichtbaren Glyphe
      const tinteMitte = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 - m.actualBoundingBoxLeft;
      el.style.transform = 'translateX(' + (m.width / 2 - tinteMitte).toFixed(2) + 'px)';
    })();
  <\/script>
`, `
  /* Etsy zeigt das Shop-Bild als kleinen Kreis. Heller Buchstabe auf dunklem
     Grund bleibt dort am längsten lesbar und wirkt wie ein Stempel. */
  body{background:var(--tinte)}
  .icon{
    height:100%;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:30px;
  }
  .icon-p{
    font-family:"Bitstream Charter","DejaVu Serif",serif;font-size:270px;font-weight:700;
    line-height:.78;color:var(--papier);
  }
  .icon-strich{width:132px;height:16px;background:var(--akzent)}
`);

await browser.close();
console.log('\nFertig: assets/etsy/');
