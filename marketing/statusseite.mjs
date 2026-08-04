/*
 * Baut die Statusseite: zeigt den kompletten Stand auf einer Seite.
 *
 * Ausführen:  node marketing/statusseite.mjs
 * Ergebnis:   dist/statusseite.html
 *
 * Alle Bilder und das Video werden als Daten-URI eingebettet, damit die Seite
 * ohne jede externe Datei funktioniert — genau wie das Produkt selbst.
 * Verkleinert wird vorher mit ffmpeg (Pfad über FFMPEG).
 */
import { readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const lauf = promisify(execFile);
const hier   = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, '..');
const tmp    = join(wurzel, '.status-tmp');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });
await mkdir(join(wurzel, 'dist'), { recursive: true });

/* ---------- Bilder verkleinern und einbetten ---------- */
async function verkleinern(quelle, datei, breite, qualitaet = 78) {
  const ziel = join(tmp, datei);
  await lauf(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(wurzel, quelle),
                      '-vf', `scale=${breite}:-1`, '-q:v', String(qualitaet), ziel]);
  return ziel;
}
const alsURI = async (pfad, typ) =>
  `data:${typ};base64,` + (await readFile(pfad)).toString('base64');

const listing = [];
const beschriftung = [
  ['01-hero',        'Platz 1 — der Klick'],
  ['02-funktionen',  'Platz 2 — kann es, was ich brauche?'],
  ['03-paragraf19',  'Platz 3 — das Kaufargument'],
  ['04-so-gehts',    'Platz 4 — nimmt die Angst'],
  ['05-editor',      'Platz 5 — die Bedienung'],
  ['06-lieferumfang','Platz 6 — letzte Zweifel']
];
for (const [name, text] of beschriftung) {
  listing.push({ text, uri: await alsURI(await verkleinern(`assets/etsy/${name}.png`, `${name}.webp`, 760), 'image/webp') });
}
const banner   = await alsURI(await verkleinern('assets/etsy/shop-banner.png', 'banner.webp', 1200, 80), 'image/webp');
const icon     = await alsURI(await verkleinern('assets/etsy/shop-icon.png', 'icon.webp', 240, 85), 'image/webp');
const rechnung = await alsURI(await verkleinern('assets/screenshot-rechnung.png', 'rechnung.webp', 700, 80), 'image/webp');
const editor   = await alsURI(await verkleinern('assets/screenshot-editor.png', 'editor.webp', 1100), 'image/webp');

/* Video kleiner rechnen — im Browser reicht 640 px */
const videoDatei = join(tmp, 'video.mp4');
await lauf(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(wurzel, 'assets/etsy/listing-video.mp4'),
  '-vf', 'scale=640:640', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow',
  '-movflags', '+faststart', '-an', videoDatei]);
const video = await alsURI(videoDatei, 'video/mp4');

const bild = (uri, alt, stil = '') =>
  `<img src="${uri}" alt="${alt}" loading="lazy"${stil ? ` style="${stil}"` : ''}>`;

/* ---------- Seite ---------- */
const seite = `<title>Papierkramerei — Stand der Dinge</title>
<style>
  /* Farben aus dem Produkt selbst. Der helle Grund bildet Papier ab;
     die dunkle Fassung dreht ihn zu Tinte, statt ihn nur zu invertieren. */
  :root{
    color-scheme:light dark;
    --tinte:#121826; --grund:#E8ECF3; --papier:#FFFFFF;
    --akzent:#2F6FEB; --siegel:#0F7B4F; --linie:#C2CBDA; --gedaempft:#5A6478;
    --schatten:0 1px 3px rgba(18,24,38,.07), 0 12px 32px rgba(18,24,38,.07);
  }
  @media (prefers-color-scheme:dark){
    :root{
      --tinte:#E7ECF4; --grund:#0E141F; --papier:#161E2B;
      --akzent:#7BA5FF; --siegel:#46B98A; --linie:#2A3546; --gedaempft:#8E9BB0;
      --schatten:0 1px 3px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.35);
    }
  }
  :root[data-theme="dark"]{
    --tinte:#E7ECF4; --grund:#0E141F; --papier:#161E2B;
    --akzent:#7BA5FF; --siegel:#46B98A; --linie:#2A3546; --gedaempft:#8E9BB0;
    --schatten:0 1px 3px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.35);
  }
  :root[data-theme="light"]{
    --tinte:#121826; --grund:#E8ECF3; --papier:#FFFFFF;
    --akzent:#2F6FEB; --siegel:#0F7B4F; --linie:#C2CBDA; --gedaempft:#5A6478;
    --schatten:0 1px 3px rgba(18,24,38,.07), 0 12px 32px rgba(18,24,38,.07);
  }

  *{box-sizing:border-box}
  body{
    margin:0; background:var(--grund); color:var(--tinte);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    font-size:17px; line-height:1.6; -webkit-font-smoothing:antialiased;
  }
  /* Georgia als Anzeigeschrift: bewusst gewählt, überall vorhanden, und trifft
     den buchigen Ton der Listing-Bilder. Kein Webfont, weil Artifacts keine
     externen Dateien laden dürfen. */
  h1,h2,h3,.zahl{font-family:Georgia,"Times New Roman",serif; font-weight:700;}

  .blatt{max-width:920px; margin:0 auto; padding:0 20px 100px}
  header{padding:76px 0 44px}
  .augenbraue{
    font-size:13px; letter-spacing:.18em; text-transform:uppercase;
    color:var(--gedaempft); font-weight:700; font-family:inherit;
  }
  h1{font-size:clamp(38px,7vw,60px); line-height:1.04; margin:18px 0 0; letter-spacing:-.02em; text-wrap:balance}
  .vorspann{font-size:clamp(18px,2.4vw,21px); color:var(--gedaempft); margin:20px 0 0; max-width:60ch}

  .kennzahlen{
    display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1px;
    background:var(--linie); border:1px solid var(--linie); border-radius:12px;
    overflow:hidden; margin:44px 0 0;
  }
  .kennzahl{background:var(--papier); padding:22px 20px}
  .kennzahl .zahl{font-size:34px; line-height:1; display:block; font-variant-numeric:tabular-nums}
  .kennzahl .was{font-size:13px; color:var(--gedaempft); margin-top:8px; display:block; line-height:1.35}
  .kennzahl.gut .zahl{color:var(--siegel)}

  section{margin-top:64px}
  h2{
    font-size:clamp(24px,3.4vw,31px); margin:0 0 6px; letter-spacing:-.015em;
    padding-top:22px; border-top:3px solid var(--tinte);
  }
  .lead{color:var(--gedaempft); margin:0 0 26px; max-width:62ch}
  h3{font-size:19px; margin:32px 0 10px}
  p{margin:0 0 16px; max-width:66ch}

  .karte{background:var(--papier); border:1px solid var(--linie); border-radius:12px; padding:26px; box-shadow:var(--schatten)}
  img,video{max-width:100%; height:auto; display:block; border-radius:8px}

  .zwei{display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start}
  @media (max-width:700px){ .zwei{grid-template-columns:1fr} }

  .galerie{display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:18px}
  .galerie figure{margin:0}
  .galerie img{border:1px solid var(--linie); box-shadow:var(--schatten)}
  .galerie figcaption{font-size:13px; color:var(--gedaempft); margin-top:9px}

  .liste{list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:13px}
  .liste li{display:flex; gap:13px; align-items:flex-start}
  .haken{
    flex:0 0 auto; width:21px; height:21px; border-radius:50%; background:var(--siegel);
    color:#fff; font-size:12px; display:flex; align-items:center; justify-content:center; margin-top:3px;
  }
  .haken.offen{background:transparent; border:2px solid var(--linie); color:var(--gedaempft)}

  .tabelle{width:100%; overflow-x:auto}
  table{width:100%; border-collapse:collapse; font-size:15px; font-variant-numeric:tabular-nums; min-width:380px}
  th{text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--gedaempft); font-weight:700; padding:0 14px 10px 0; border-bottom:1px solid var(--linie)}
  td{padding:11px 14px 11px 0; border-bottom:1px solid var(--linie)}
  td:last-child,th:last-child{text-align:right; padding-right:0}
  tr:last-child td{border-bottom:none}
  tr.summe td{font-weight:700; border-top:2px solid var(--tinte)}

  .marke{display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; padding:5px 12px; border-radius:999px; border:1px solid var(--linie)}
  .marke.an{color:var(--siegel); border-color:color-mix(in srgb, var(--siegel) 40%, transparent)}
  .marke.aus{color:var(--gedaempft)}

  .fehler{display:flex; flex-direction:column; gap:16px}
  .fehler .karte{padding:22px 24px}
  .fehler h3{margin:0 0 8px; font-size:18px}
  .fehler p{margin:0; font-size:15.5px; color:var(--gedaempft)}
  .fehler .folge{color:var(--tinte); font-weight:600}

  a{color:var(--akzent); text-decoration-thickness:1px; text-underline-offset:3px}
  a:focus-visible,button:focus-visible{outline:2px solid var(--akzent); outline-offset:3px; border-radius:4px}
  .knopf{
    display:inline-block; background:var(--akzent); color:#fff; text-decoration:none;
    padding:13px 22px; border-radius:9px; font-weight:600; font-size:16px;
  }
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.88em; background:color-mix(in srgb, var(--gedaempft) 14%, transparent); padding:2px 6px; border-radius:5px}
  .fluss{display:flex; flex-wrap:wrap; align-items:center; gap:10px; font-size:14.5px; color:var(--gedaempft)}
  .fluss b{color:var(--tinte); font-weight:600; background:var(--papier); border:1px solid var(--linie); border-radius:7px; padding:7px 12px; display:inline-block}
  footer{margin-top:76px; padding-top:26px; border-top:1px solid var(--linie); font-size:14px; color:var(--gedaempft)}
</style>

<div class="blatt">

<header>
  <div class="augenbraue">Papierkramerei · Stand vom 4. August 2026</div>
  <h1>Ein verkaufsfertiges Produkt und alles, was zum Verkaufen nötig ist.</h1>
  <p class="vorspann">Der Rechnungsgenerator ist fertig und geprüft. Listing, Bilder,
     Video und Shop-Profil liegen bereit. Was fehlt, ist der Klick auf
     „Veröffentlichen".</p>

  <div class="kennzahlen">
    <div class="kennzahl gut"><span class="zahl">85</span><span class="was">Prüfpunkte im echten Browser, alle grün</span></div>
    <div class="kennzahl"><span class="zahl">1</span><span class="was">Datei — das komplette Werkzeug, 50 kB</span></div>
    <div class="kennzahl"><span class="zahl">10</span><span class="was">fertige Dateien fürs Etsy-Listing</span></div>
    <div class="kennzahl gut"><span class="zahl">0</span><span class="was">externe Abhängigkeiten</span></div>
  </div>
</header>

<section>
  <h2>Das Produkt</h2>
  <p class="lead">Rechnungsgenerator für Kleinunternehmer. Doppelklick auf die
     HTML-Datei, sie öffnet sich im Browser. Keine Installation, kein Konto,
     keine Internetverbindung.</p>

  <div class="zwei">
    <div>
      <ul class="liste">
        <li><span class="haken">✓</span><div>Rechnung, Angebot und Stornorechnung — Beschriftungen wechseln mit</div></li>
        <li><span class="haken">✓</span><div>Kleinunternehmerregelung § 19 UStG per Häkchen, Hinweistext automatisch</div></li>
        <li><span class="haken">✓</span><div>Umsatzsteuer 19 % und 7 %, auch gemischt, je Satz gruppiert</div></li>
        <li><span class="haken">✓</span><div>Reverse-Charge § 13b UStG für EU-Kunden</div></li>
        <li><span class="haken">✓</span><div>Prüfung der Pflichtangaben nach § 14 UStG</div></li>
        <li><span class="haken">✓</span><div>Stammdaten, Kundenliste, fortlaufende Nummern, eigenes Logo</div></li>
        <li><span class="haken">✓</span><div>A4-Live-Vorschau, PDF über den Druckdialog</div></li>
      </ul>
      <p style="margin-top:26px">
        <a class="knopf" href="https://claude.ai/code/artifact/698aff43-9eaa-4bf0-bc35-415c0d8571d2">Werkzeug ausprobieren →</a>
      </p>
      <p style="font-size:14px; color:var(--gedaempft); margin-top:14px">
        Der Link zeigt die echte Produktdatei. Privat — bitte nicht öffentlich teilen.
      </p>
    </div>
    <figure style="margin:0">
      ${bild(rechnung, 'Erzeugte Rechnung als PDF', 'border:1px solid var(--linie); box-shadow:var(--schatten)')}
      <figcaption style="font-size:13px; color:var(--gedaempft); margin-top:9px">
        Eine erzeugte Rechnung — gemischte Steuersätze, Zahlungshinweise, Fußzeile.
      </figcaption>
    </figure>
  </div>

  <h3>Die Bedienoberfläche</h3>
  ${bild(editor, 'Editor mit Live-Vorschau', 'border:1px solid var(--linie); box-shadow:var(--schatten)')}
</section>

<section>
  <h2>Das Listing-Video</h2>
  <p class="lead">10,5 Sekunden, quadratisch, ohne Ton — Etsy spielt Videos stumm ab,
     deshalb führen Zwischentitel durch den Ablauf. Aufgezeichnet ist das echte
     Werkzeug, nichts ist nachgestellt.</p>
  <video src="${video}" controls playsinline muted loop preload="metadata"
         style="max-width:480px; margin:0 auto; border:1px solid var(--linie); box-shadow:var(--schatten)"></video>
</section>

<section>
  <h2>Die sechs Listing-Bilder</h2>
  <p class="lead">Je 2000 × 2000 px. Die Belege darin rendert das Werkzeug selbst —
     ändert sich das Produkt, werden die Bilder neu erzeugt und stimmen wieder.</p>
  <div class="galerie">
    ${listing.map(b => `<figure>${bild(b.uri, b.text)}<figcaption>${b.text}</figcaption></figure>`).join('\n    ')}
  </div>
  <h3 style="margin-top:38px">Warum die Bilder nie veralten</h3>
  <div class="fluss">
    <b>rechnungsgenerator.html</b> →
    <b>listing-bilder.mjs</b> → <span>6 Bilder, Banner, Shop-Bild</span>
  </div>
  <div class="fluss" style="margin-top:10px">
    <b>rechnungsgenerator.html</b> →
    <b>listing-video.mjs</b> → <span>MP4</span>
  </div>
  <div class="fluss" style="margin-top:10px">
    <b>rechnungsgenerator.html</b> →
    <b>bauen.sh</b> → <span>ZIP für Etsy</span>
  </div>
</section>

<section>
  <h2>Der Shop</h2>
  <p class="lead">Name, Profil und Richtlinien liegen fertig in <code>etsy-shop.md</code>.
     Der Name benennt das Problem in den Worten der Kundschaft und trägt jedes
     weitere Produkt — deshalb kein Name mit „Rechnung" darin.</p>
  <div class="karte">
    <div style="display:flex; gap:20px; align-items:center; margin-bottom:22px">
      ${bild(icon, 'Shop-Bild', 'width:74px; border-radius:50%')}
      <div>
        <div style="font-family:Georgia,serif; font-size:27px; font-weight:700">Papierkramerei</div>
        <div style="color:var(--gedaempft); font-size:15px">Werkzeuge gegen den Papierkram für Selbstständige</div>
      </div>
    </div>
    ${bild(banner, 'Shop-Banner', 'border:1px solid var(--linie)')}
  </div>
</section>

<section>
  <h2>Preis und Marge</h2>
  <p class="lead">Der Vergleich im Kopf des Käufers ist nicht „andere Vorlage für 5 €",
     sondern das Abo für 9 bis 15 € im Monat, das er nicht abschließen will.</p>
  <div class="karte tabelle">
    <table>
      <thead><tr><th>Posten</th><th>Betrag</th></tr></thead>
      <tbody>
        <tr><td>Verkaufspreis (regulär)</td><td>14,90 €</td></tr>
        <tr><td>Einstellgebühr</td><td>−0,20 €</td></tr>
        <tr><td>Transaktionsgebühr 6,5 %</td><td>−0,97 €</td></tr>
        <tr><td>Zahlungsabwicklung</td><td>−0,90 €</td></tr>
        <tr class="summe"><td>bleibt je Verkauf</td><td>12,84 €</td></tr>
      </tbody>
    </table>
  </div>
  <p style="margin-top:18px">Start zu <strong>9,90 €</strong> als Einführungspreis — er kauft
     das, was am Anfang wirklich fehlt: Bewertungen. Zehn Verkäufe zu 9,90 € sind
     mehr wert als drei zu 14,90 €.</p>
</section>

<section>
  <h2>Werbung</h2>
  <p class="lead">Etsy hat zwei Werbeprodukte, die ständig verwechselt werden. Daraus
     folgen gegensätzliche Empfehlungen.</p>
  <div class="zwei">
    <div class="karte">
      <span class="marke an">● Offsite Ads — an</span>
      <p style="margin:16px 0 0">Läuft auf Google, Instagram, Pinterest. Kostet
         <strong>Provision nur bei Verkauf</strong> — 15 %, also 2,23 €. Bezahlt aus dem
         Erlös eines Verkaufs, den es sonst nicht gegeben hätte.</p>
    </div>
    <div class="karte">
      <span class="marke aus">○ Etsy Ads (Onsite) — aus</span>
      <p style="margin:16px 0 0">Kostet <strong>pro Klick</strong>, auch ohne Verkauf.
         Ein Listing ohne Bewertungen konvertiert unter 1 % — dann kostet ein Verkauf
         25 bis 35 € und bringt 12,84 €.</p>
    </div>
  </div>
  <p style="margin-top:20px">Onsite erst testen, wenn alle drei Punkte stimmen:
     fünf Bewertungen, Konversion über 2 %, und das Listing verkauft sich schon
     organisch. Dann gilt: Kosten je Verkauf müssen unter 12,84 € bleiben.</p>
</section>

<section>
  <h2>Vier Fehler, die das Testen gefunden hat</h2>
  <p class="lead">Jeder davon wäre beim Käufer gelandet.</p>
  <div class="fehler">
    <div class="karte">
      <h3>Leere Seite ohne dauerhaften Speicher</h3>
      <p><code>localStorage</code> wirft in privaten Fenstern, bei blockierten
         Website-Daten und in eingebetteten Rahmen eine Ausnahme. Vier ungeschützte
         Zugriffe brachen den Seitenaufbau ab. <span class="folge">Der Generator blieb
         komplett leer</span> — betroffen wäre jeder mit Safari und blockierten Cookies.</p>
    </div>
    <div class="karte">
      <h3>Das Einheiten-Feld ließ sich nicht bedienen</h3>
      <p>Eine <code>datalist</code> zeigt keinen Pfeil, öffnet nicht beim Klicken und
         wird von Safari unzuverlässig behandelt. Technisch korrekt verbunden,
         <span class="folge">für Käufer schlicht kaputt.</span> Jetzt ein echtes
         Auswahlfeld mit „Andere …“ für eigene Einheiten.</p>
    </div>
    <div class="karte">
      <h3>209.950 € im Werbevideo</h3>
      <p>Getippter Text hängte sich an die Vorgabewerte neuer Positionen an: Aus
         „22 Std. × 95 €“ wurden „221 Std. × 950 €“.
         <span class="folge">Ein Werbevideo mit absurden Zahlen</span> hätte mehr
         geschadet als gar keins.</p>
    </div>
    <div class="karte">
      <h3>Waagerechtes Scrollen auf dem Handy</h3>
      <p>Ein fehlendes <code>min-width:0</code> zwang das Raster breiter als das
         Fenster. Dazu eine kaputte Zoom-Speicherung, die die automatische
         Einpassung dauerhaft abschaltete.</p>
    </div>
  </div>
</section>

<section>
  <h2>Was noch offen ist</h2>
  <ul class="liste">
    <li><span class="haken offen">○</span><div><strong>Safari und Firefox testen.</strong>
        Im Container gibt es nur Chromium. Der PDF-Export sollte vor dem ersten
        Verkauf einmal in beiden geprüft werden.</div></li>
    <li><span class="haken offen">○</span><div><strong>Shopnamen prüfen und Listing einstellen.</strong>
        <code>etsy.com/shop/Papierkramerei</code> aufrufen — eine Fehlerseite heißt frei.</div></li>
    <li><span class="haken offen">○</span><div><strong>Die ersten fünf Nutzer.</strong>
        Der wichtigste Schritt: Ohne Bewertungen spielt Etsy das Listing kaum aus.</div></li>
    <li><span class="haken offen">○</span><div><strong>Vorlagenpaket als zweites Produkt.</strong>
        Mahnung, Auftragsbestätigung, Stundenzettel, Lieferschein — rund 9 €,
        Bundle mit Produkt 1 für 19 €. Die Übergabe dafür liegt in
        <code>UEBERGABE.md</code>.</div></li>
  </ul>
</section>

<footer>
  Repository <code>martinjohann1990-commits/Martin</code>, Branch
  <code>claude/digital-microproduct-gumroad-rgrfwd</code> — neun Commits, alles gepusht.
  Diese Seite entsteht mit <code>node marketing/statusseite.mjs</code>; sämtliche
  Bilder und das Video sind eingebettet, damit sie ohne externe Dateien funktioniert.
</footer>

</div>`;

const ziel = join(wurzel, 'dist', 'statusseite.html');
await writeFile(ziel, seite);
await rm(tmp, { recursive: true, force: true });

const groesse = (await stat(ziel)).size;
console.log(`dist/statusseite.html — ${(groesse / 1024 / 1024).toFixed(2)} MB`);
console.log(groesse < 16 * 1024 * 1024 ? '  unter der 16-MB-Grenze, in Ordnung' : '  >>> ZU GROSS <<<');
