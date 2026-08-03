/*
 * Nimmt das Etsy-Listing-Video auf: vom leeren Beleg zum fertigen PDF.
 *
 * Ausführen:  node marketing/listing-video.mjs
 * Ergebnis:   assets/etsy/listing-video.mp4  (quadratisch, 1080 × 1080, ~13 s)
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

const hier     = dirname(fileURLToPath(import.meta.url));
const wurzel   = join(hier, '..');
const produkt  = 'file://' + join(wurzel, 'produkt', 'rechnungsgenerator.html');
const ziel     = join(wurzel, 'assets', 'etsy');
const rohOrdner = join(wurzel, '.video-roh');
const FFMPEG   = process.env.FFMPEG || 'ffmpeg';

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

/* Stammdaten vorbelegen — gezeigt wird der Alltag eines Nutzers, der das
   Werkzeug eingerichtet hat, nicht die einmalige Einrichtung. */
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
    typ:"rechnung", nummer:"RE-2026-014", datum:"2026-03-30", leistung:"",
    zahlungsziel:14, betreff:"", intro:"vielen Dank für Ihren Auftrag. Vereinbarungsgemäß berechne ich Ihnen die folgenden Leistungen:",
    outro:"Mit freundlichen Grüßen", hinweis:"", kleinunternehmer:false,
    reverse:false, rabatt:0, rabattText:"Rabatt",
    empfaenger:{ firma:"", name:"", strasse:"", plz:"", ort:"", land:"", kdnr:"" },
    positionen:[ { beschreibung:"", menge:"", einheit:"Std.", einzelpreis:"", ust:19 } ]
  };
  try{
    localStorage.setItem("rg.stammdaten.v1", JSON.stringify(stamm));
    localStorage.setItem("rg.beleg.v1", JSON.stringify(beleg));
    localStorage.setItem("rg.zoom.manuell.v1", "1");
    localStorage.setItem("rg.zoom.v1", "78");
  }catch(e){ /* ohne Speicher läuft die Aufnahme trotzdem */ }

  /* Zwischentitel und ein sichtbarer Zeiger — beides gehört nur zur Aufnahme
     und ist nicht Teil des ausgelieferten Produkts. */
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
       Bewegt wird nur .app; Zwischentitel und Zeiger liegen daneben und bleiben
       dadurch unverändert stehen. */
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
// Vor dem Tippen leeren: neue Positionen sind mit Menge 1 und Preis 0
// vorbelegt, sonst entstünde aus "22" ein "221".
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
await page.waitForTimeout(450);

/* ---- Beat 1: Positionen eintippen, formatfüllend ---- */
await kamera(['#pos-body', '.pos-table'], 46);
await titel('Leistungen eintippen');
await page.waitForTimeout(650);

await tippen('#pos-body input[data-f="beschreibung"]', 'Konzeption und Beratung', 22);
await tippen('#pos-body input[data-f="menge"]', '8', 50);
await tippen('#pos-body input[data-f="einzelpreis"]', '95', 50);
await page.waitForTimeout(200);

await page.click('#btn-pos-add');
await page.waitForTimeout(180);
await tippen('#pos-body input[data-f="beschreibung"] >> nth=1', 'Screendesign', 22);
await tippen('#pos-body input[data-f="menge"] >> nth=1', '22', 50);
await tippen('#pos-body input[data-f="einzelpreis"] >> nth=1', '95', 50);
await page.waitForTimeout(450);

/* ---- Beat 2: dieselben Zeilen stehen in der Rechnung ---- */
await titel('… und stehen sofort in der Rechnung');
await kamera(['table.items', '.totals'], 30);
await page.waitForTimeout(2000);

/* ---- Beat 3: Umsatzsteuer und Summen ---- */
await titel('Umsatzsteuer und Summen rechnen sich selbst');
await kamera(['.totals'], 44);
await page.waitForTimeout(2000);

/* ---- Beat 4: der fertige Beleg ---- */
await titel('Als PDF speichern — fertig');
await page.evaluate(() => window.__nurBeleg());
await kamera(['.page'], 18, 1.55);
await page.waitForTimeout(2400);
await titel('');
await page.waitForTimeout(350);

await ctx.close();          // schreibt die Videodatei
await browser.close();

/* ---------------------------------------------------------------
   Umwandeln: WebM aus Playwright → MP4, das Etsy annimmt
   --------------------------------------------------------------- */
const dateien = (await readdir(rohOrdner)).filter(d => d.endsWith('.webm'));
if(!dateien.length) throw new Error('Keine Aufnahme gefunden.');
const roh = join(rohOrdner, dateien[0]);
const fertig = join(ziel, 'listing-video.mp4');

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

console.log('\nassets/etsy/listing-video.mp4');
console.log(`  Dauer:  ${sekunden?.toFixed(1)} s   ${sekunden >= 5 && sekunden <= 15 ? '(Etsy: 5–15 s, in Ordnung)' : '>>> AUSSERHALB VON 5–15 s <<<'}`);
console.log(`  Größe:  ${(groesse/1024/1024).toFixed(2)} MB   ${groesse < 100*1024*1024 ? '(Etsy: max. 100 MB, in Ordnung)' : '>>> ZU GROSS <<<'}`);
console.log('  Format: MP4 / H.264, 1080 × 1080, ohne Ton');
