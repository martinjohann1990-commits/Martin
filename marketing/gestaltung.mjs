/*
 * Das Gestaltungssystem der Papierkramerei — eine Quelle für beide Produkte.
 *
 * Farben, Schriften und Bausteine der Listing-Bilder stehen hier, damit ein
 * zweites Produkt nicht nach einem zweiten Shop aussieht. Verwendet von
 * listing-bilder.mjs und listing-bilder-belegpaket.mjs.
 *
 * Schriften: Bitstream Charter (Serife, Überschriften) und Liberation Sans
 * (Fließtext). Beide liegen im Container vor. Die Paarung liest sich nach
 * Beleg und Kanzlei, nicht nach SaaS-Landingpage.
 */
import { join } from 'path';

export const CSS = `
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

/* Eine quadratische Bildtafel (2000 × 2000) schreiben. */
export async function tafel(browser, ziel, datei, koerper, extra=''){
  const seite = await browser.newPage({ viewport:{ width:2000, height:2000 } });
  await seite.setContent(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${CSS}${extra}</style></head>` +
    `<body>${koerper}</body></html>`, { waitUntil:'load' });
  await seite.waitForTimeout(350);
  await seite.screenshot({ path: join(ziel, datei) });
  await seite.close();
  console.log('  ' + datei);
}

/* Abweichendes Format (Banner, Shop-Bild) in doppelter Auflösung. */
export async function shopTafel(browser, ziel, datei, breite, hoehe, koerper, extra=''){
  const seite = await browser.newPage({ viewport:{ width:breite, height:hoehe }, deviceScaleFactor:2 });
  await seite.setContent(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${CSS}
     body{width:${breite}px;height:${hoehe}px}${extra}</style></head><body>${koerper}</body></html>`,
    { waitUntil:'load' });
  await seite.waitForTimeout(300);
  await seite.screenshot({ path: join(ziel, datei) });
  await seite.close();
  console.log('  ' + datei);
}

export const alsDatenURI = puffer => 'data:image/png;base64,' + puffer.toString('base64');
