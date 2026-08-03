/*
 * Nimmt das Etsy-Listing-Video für das Belegpaket auf:
 * offene Rechnung eintragen → Verzugszinsen erscheinen → fertige Mahnung.
 *
 * Ausführen:  node marketing/listing-video-belegpaket.mjs
 * Ergebnis:   assets/etsy/listing-video-belegpaket.mp4  (1080 × 1080, ~12 s)
 *
 * Etsy erlaubt 5 bis 15 Sekunden und spielt Videos stumm ab — deshalb führen
 * eingeblendete Zwischentitel durch den Ablauf. Aufgezeichnet wird das echte
 * Werkzeug, nichts ist nachgestellt.
 *
 * Voraussetzung: ffmpeg mit x264 im Pfad oder über FFMPEG gesetzt.
 *   npm install ffmpeg-static   und   FFMPEG=$(node -p "require('ffmpeg-static')")
 */
import { mkdir, rm, readdir, stat } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const lauf = promisify(execFile);

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const hier      = dirname(fileURLToPath(import.meta.url));
const wurzel    = join(hier, '..');
const produkt   = 'file://' + join(wurzel, 'produkt', 'belegpaket.html');
const ziel      = join(wurzel, 'assets', 'etsy');
const rohOrdner = join(wurzel, '.video-roh');
const FFMPEG    = process.env.FFMPEG || 'ffmpeg';

await mkdir(ziel, { recursive: true });
await rm(rohOrdner, { recursive: true, force: true });

/* Quadratisch aufnehmen: Etsy zeigt das Video im selben Karussell wie die
   quadratischen Bilder. 1400 px liegt über dem Umbruchpunkt des Werkzeugs,
   sodass Formular und Vorschau nebeneinander stehen. */
const KANTE = 1400;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: KANTE, height: KANTE },
  recordVideo: { dir: rohOrdner, size: { width: KANTE, height: KANTE } },
  deviceScaleFactor: 1
});
const page = await ctx.newPage();

/* Stammdaten und Empfänger vorbelegen — gezeigt wird der Alltag eines Nutzers,
   der das Werkzeug eingerichtet hat, nicht die einmalige Einrichtung.
   Offen bleibt genau das, worum es geht: die offene Rechnung. */
await page.addInitScript(() => {
  const stamm = {
    firma:"Studio Nordlicht", name:"Martin Johann", strasse:"Lindenallee 42",
    plz:"20144", ort:"Hamburg", telefon:"+49 40 123456",
    email:"hallo@studio-nordlicht.de", web:"studio-nordlicht.de",
    steuernummer:"42/123/45678", ustid:"", bank:"Hamburger Sparkasse",
    iban:"DE02 2005 0550 1234 5678 90", bic:"HASPDEHHXXX",
    fusszeile:"Inhaber: Martin Johann", logo:""
  };
  const beleg = {
    typ:"mahnung2", nummer:"MA-2026-014", datum:"2026-05-18",
    betreff:"", betreffAuto:true, anrede:"",
    intro:"auch nach unserer ersten Mahnung ist der offene Betrag nicht bei uns eingegangen. Wir fordern Sie hiermit letztmalig auf, die Forderung einschließlich der angefallenen Verzugskosten bis zu dem genannten Termin zu begleichen.",
    outro:"Nach Ablauf dieser Frist behalten wir uns weitere Schritte vor, insbesondere die Abgabe der Forderung an ein Inkassounternehmen oder die Einleitung des gerichtlichen Mahnverfahrens. Die dadurch entstehenden Kosten hätten Sie zu tragen.\n\nMit freundlichen Grüßen",
    hinweis:"",
    empfaenger:{ firma:"Nordwind Handels GmbH", name:"Frau Erika Muster",
                 strasse:"Hafenstraße 17", plz:"28195", ort:"Bremen", land:"", kdnr:"K-2026-118" },
    rechnung:{ nummer:"", datum:"2026-03-30", faellig:"2026-04-13", betrag:0, gezahlt:0, frist:10 },
    verzug:{ aktiv:true, schuldner:"unternehmen", basis:1.52, zuschlag:9,
             ab:"2026-04-14", gebuehr:5, pauschale:false }
  };
  try{
    localStorage.setItem("bp.stammdaten.v1", JSON.stringify(stamm));
    localStorage.setItem("bp.beleg.v1", JSON.stringify(beleg));
    localStorage.setItem("bp.zoom.manuell.v1", "1");
    localStorage.setItem("bp.zoom.v1", "78");
  }catch(e){ /* ohne Speicher läuft die Aufnahme trotzdem */ }

  /* Zwischentitel — gehört nur zur Aufnahme und ist nicht Teil des
     ausgelieferten Produkts. */
  window.addEventListener("DOMContentLoaded", () => {
    const titel = document.createElement("div");
    titel.id = "aufnahme-titel";
    titel.style.cssText = `
      position:fixed; left:0; right:0; bottom:0; z-index:9999;
      background:#121826; color:#fff; font-family:"Bitstream Charter",Georgia,serif;
      font-size:38px; letter-spacing:-.01em; padding:30px 44px; text-align:center;
      opacity:0; transition:opacity .28s ease; pointer-events:none;`;
    document.body.appendChild(titel);

    window.__titel = t => { titel.textContent = t; titel.style.opacity = t ? "1" : "0"; };

    /* Für die Schlusseinstellung nur den Beleg zeigen. Deckkraft statt
       display, damit sich das Layout nicht verschiebt und die Kamera sitzt. */
    window.__nurBeleg = () => {
      const ed = document.querySelector(".editor");
      ed.style.transition = "opacity .55s ease";
      ed.style.opacity = "0";
    };
    /* Kamera: fährt die angegebenen Bereiche formatfüllend an.
       Ohne das wäre bei 1080 px nichts zu lesen – Etsy spielt das Video klein ab.
       Bewegt wird nur .app; der Zwischentitel liegt daneben und bleibt dadurch
       unverändert stehen. */
    const app = () => document.querySelector(".app");
    document.documentElement.style.overflow = "hidden";
    window.__kamera = (auswahlen, rand = 40, maxZoom = 2.6) => {
      const ziel = app();
      const vorher = ziel.style.transform;
      ziel.style.transition = "none";
      ziel.style.transform = "none";
      let l = Infinity, o = Infinity, r = -Infinity, u = -Infinity;
      for(const sel of auswahlen){
        const el = document.querySelector(sel);
        if(!el) continue;
        const k = el.getBoundingClientRect();
        l = Math.min(l, k.left); o = Math.min(o, k.top);
        r = Math.max(r, k.right); u = Math.max(u, k.bottom);
      }
      ziel.style.transform = vorher;
      void ziel.offsetWidth;                       // Layout erzwingen, kein Zwischenbild
      ziel.style.transition = "transform .85s cubic-bezier(.4,0,.2,1)";

      const b = r - l + rand*2, h = u - o + rand*2;
      const s = Math.min(innerWidth / b, innerHeight / h, maxZoom);
      const mx = (l + r) / 2, my = (o + u) / 2;
      ziel.style.transform =
        `translate(${innerWidth/2 - s*mx}px, ${innerHeight/2 - s*my}px) scale(${s})`;
      return s;
    };
  });
});

const kamera = (sel, rand=40, max=2.6) =>
  page.evaluate(([s,r,m]) => window.__kamera(s,r,m), [Array.isArray(sel)?sel:[sel], rand, max]);
const titel  = t => page.evaluate(t => window.__titel && window.__titel(t), t);
// Vor dem Tippen leeren: Zahlenfelder sind vorbelegt, sonst entstünde aus
// "1820,70" ein "01820,70".
const tippen = async (sel, text, ms = 42) => {
  const feld = page.locator(sel);
  await feld.fill('');
  await feld.type(text, { delay: ms });
};

await page.goto(produkt);
await page.addStyleTag({ content: `
  .app{ transform-origin:0 0; will-change:transform; }
  body{ overflow:hidden; }
` });

/* Chromium stellt Datumsfelder im Format der Browsersprache dar, nicht im
   Format der Seite. Im Container heißt das 04/13/2026 – für ein deutsches
   Listing unbrauchbar. Die Felder werden für die Aufnahme auf Text umgestellt
   und zeigen damit das, was Käufer mit deutschem Browser ohnehin sehen. Der
   Beleg selbst formatiert ohnehin deutsch, ihn betrifft das nicht. */
await page.evaluate(() => {
  document.querySelectorAll('input[type=date]').forEach(el => {
    const [jahr, monat, tag] = el.value.split('-');
    el.type = 'text';
    if(jahr) el.value = `${tag}.${monat}.${jahr}`;
  });
});
await page.waitForTimeout(450);

/* ---- Beat 1: die offene Rechnung eintragen ---- */
await kamera(['#karte-rechnung'], 44);
await titel('Offene Rechnung eintragen');
await page.waitForTimeout(900);

await tippen('#f-r-nummer', 'RE-2026-001', 40);
await page.waitForTimeout(250);
await tippen('#f-r-betrag', '1820,70', 55);
await page.waitForTimeout(1000);

/* ---- Beat 2: der Verzugsrechner ---- */
await kamera(['#karte-verzug'], 34);
await titel('Verzugszinsen nach § 288 BGB — taggenau');
await page.waitForTimeout(1200);
await page.check('#f-z-pauschale');          // Verzugspauschale 40 € dazunehmen
await page.waitForTimeout(1700);

/* ---- Beat 3: alles steht in der Mahnung ---- */
await kamera(['table.items', '.totals'], 26);
await titel('Zinsen, Gebühr und Pauschale stehen in der Mahnung');
await page.waitForTimeout(2500);

/* ---- Beat 4: der fertige Beleg ---- */
await page.evaluate(() => window.__nurBeleg());
await kamera(['.page'], 18, 1.55);
await titel('Als PDF speichern — fertig');
await page.waitForTimeout(2400);
await titel('');
await page.waitForTimeout(400);

await ctx.close();          // schreibt die Videodatei
await browser.close();

/* ---------------------------------------------------------------
   Umwandeln: WebM aus Playwright → MP4, das Etsy annimmt
   --------------------------------------------------------------- */
const dateien = (await readdir(rohOrdner)).filter(d => d.endsWith('.webm'));
if(!dateien.length) throw new Error('Keine Aufnahme gefunden.');
const roh = join(rohOrdner, dateien[0]);
const fertig = join(ziel, 'listing-video-belegpaket.mp4');

// Der Vorlauf zeigt nur die ladende Seite – wird abgeschnitten.
await lauf(FFMPEG, [
  '-y', '-ss', '1.1', '-i', roh,
  '-vf', `scale=1080:1080:flags=lanczos,fps=30`,
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-crf', '20', '-preset', 'slow', '-movflags', '+faststart',
  '-an',                     // Etsy spielt ohnehin stumm ab
  fertig
]);
await rm(rohOrdner, { recursive: true, force: true });

/* Ergebnis gegen Etsys Grenzen prüfen */
const { stdout } = await lauf(FFMPEG, ['-i', fertig, '-hide_banner'], { encoding:'utf8' })
  .catch(e => ({ stdout: e.stderr || '' }));
const dauer = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(stdout);
const sekunden = dauer ? (+dauer[1]*3600 + +dauer[2]*60 + parseFloat(dauer[3])) : null;
const groesse = (await stat(fertig)).size;

console.log('\nassets/etsy/listing-video-belegpaket.mp4');
console.log(`  Dauer:  ${sekunden?.toFixed(1)} s   ${sekunden >= 5 && sekunden <= 15 ? '(Etsy: 5–15 s, in Ordnung)' : '>>> AUSSERHALB VON 5–15 s <<<'}`);
console.log(`  Größe:  ${(groesse/1024/1024).toFixed(2)} MB   ${groesse < 100*1024*1024 ? '(Etsy: max. 100 MB, in Ordnung)' : '>>> ZU GROSS <<<'}`);
console.log('  Format: MP4 / H.264, 1080 × 1080, ohne Ton');
