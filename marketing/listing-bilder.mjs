/*
 * Erzeugt die Etsy-Listing-Bilder (2000 × 2000 px) aus dem echten Produkt.
 *
 * Ausführen:  node marketing/listing-bilder.mjs
 * Ergebnis:   assets/etsy/01-hero.png … 06-lieferumfang.png
 *
 * Die Belege in den Bildern werden nicht nachgebaut, sondern vom Werkzeug
 * selbst gerendert. Ändert sich das Produkt, ändern sich die Bilder mit.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

const alsDatenURI = puffer => 'data:image/png;base64,' + puffer.toString('base64');

// Regelbesteuert
const s1 = await belegSeite();
const belegNormal = alsDatenURI(await s1.locator('.page').screenshot());
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
   2. Gestaltung der Bildtafeln
   --------------------------------------------------------------- */
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --tinte:#121826;      /* Nahezu Schwarz mit Blaustich – die Feder */
    --grund:#E8ECF3;      /* Kühles Papiergrau, kein neutrales Standardgrau */
    --papier:#FFFFFF;
    --akzent:#2F6FEB;     /* Die Farbe aus dem Werkzeug selbst */
    --siegel:#0F7B4F;     /* Bestätigung, bewusst getrennt vom Akzent */
    --linie:#C2CBDA;
    --gedaempft:#5A6478;
  }
  body{
    width:2000px;height:2000px;background:var(--grund);color:var(--tinte);
    font-family:"Liberation Sans","DejaVu Sans",sans-serif;
    display:flex;flex-direction:column;overflow:hidden;position:relative;
  }
  .tafel{padding:120px 120px 0;display:flex;flex-direction:column;flex:1;min-height:0}
  .augenbraue{
    font-size:34px;letter-spacing:.18em;text-transform:uppercase;color:var(--gedaempft);
    font-weight:700;padding-bottom:26px;border-bottom:3px solid var(--tinte);
    display:inline-block;align-self:flex-start;
  }
  h1{
    font-family:"Bitstream Charter","DejaVu Serif",serif;
    font-size:142px;line-height:1.02;letter-spacing:-.02em;text-wrap:balance;
    margin-top:56px;font-weight:700;
  }
  h1 em{font-style:normal;color:var(--akzent)}
  h1.klein{font-size:112px}
  .unterzeile{font-size:46px;line-height:1.4;color:var(--gedaempft);margin-top:38px;max-width:1500px}
  .fuss{
    flex:0 0 auto;padding:40px 120px 64px;
    display:flex;justify-content:space-between;align-items:baseline;
    font-size:30px;color:var(--gedaempft);letter-spacing:.04em;
  }
  /* Belegausschnitt: füllt den Rest der Tafel und schneidet sauber ab */
  .ausschnitt{flex:1;min-height:0;overflow:hidden;display:flex;justify-content:center;margin-top:56px}
  .ausschnitt img{align-self:flex-start}
  .fuss b{color:var(--tinte);letter-spacing:0}
  .beleg{
    box-shadow:0 30px 80px rgba(18,24,38,.20);background:var(--papier);
    border:1px solid var(--linie);display:block;
  }
  ul{list-style:none;display:flex;flex-direction:column;gap:34px;margin-top:64px}
  /* Textlastige Tafeln: Inhalt über die Höhe verteilen statt unten Leerraum lassen */
  ul.streuen{flex:1;min-height:0;justify-content:space-evenly;margin-top:48px}
  .schritte.streuen{flex:1;min-height:0;justify-content:space-evenly;margin-top:56px}
  li{display:flex;gap:30px;align-items:flex-start;font-size:47px;line-height:1.3}
  li .haken{
    flex:0 0 auto;width:54px;height:54px;border-radius:50%;background:var(--siegel);
    color:#fff;font-size:31px;font-weight:700;display:flex;align-items:center;
    justify-content:center;margin-top:6px;
  }
  li small{display:block;font-size:34px;color:var(--gedaempft);margin-top:8px;line-height:1.35}
  .schritte{display:flex;flex-direction:column;gap:56px;margin-top:76px}
  .schritt{display:flex;gap:44px;align-items:flex-start}
  .zahl{
    font-family:"Bitstream Charter","DejaVu Serif",serif;font-size:104px;line-height:.9;
    color:var(--akzent);flex:0 0 110px;font-weight:700;
  }
  .schritt h2{font-size:58px;font-weight:700;margin-bottom:14px}
  .schritt p{font-size:40px;color:var(--gedaempft);line-height:1.35;max-width:1250px}
  .marke{
    display:inline-block;background:var(--tinte);color:#fff;font-size:36px;font-weight:700;
    padding:18px 34px;letter-spacing:.02em;
  }
  .marke.hell{background:var(--siegel)}
`;

async function tafel(datei, koerper, extra=''){
  const seite = await browser.newPage({ viewport:{ width:2000, height:2000 } });
  await seite.setContent(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${CSS}${extra}</style></head>` +
    `<body>${koerper}</body></html>`, { waitUntil:'load' });
  await seite.waitForTimeout(350);
  await seite.screenshot({ path: join(ziel, datei) });
  await seite.close();
  console.log('  ' + datei);
}

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

await browser.close();
console.log('\nFertig: assets/etsy/');
