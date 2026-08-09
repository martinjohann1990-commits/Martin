#!/usr/bin/env node
/* =========================================================================
   build-standalone.js
   ---------------------------------------------------------------------------
   Baut aus den Einzeldateien eine autarke HTML-Datei, in der Stylesheets,
   Skripte und Bilder eingebettet sind. Ergebnis:

     dist/netplan.html          vollständige HTML-Datei zum Weitergeben
     dist/netplan-embed.html    nur der Seiteninhalt (ohne html/head/body),
                                für Umgebungen, die das Grundgerüst selbst setzen

   Aufruf:  node build-standalone.js
   ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Bindet die von leaflet.css referenzierten Bilder als data:-URI ein. */
function inlineCssAssets(css, baseDir) {
  return css.replace(/url\((["']?)([^)"']+)\1\)/g, (match, quote, ref) => {
    if (/^(data:|https?:|#)/.test(ref)) return match;
    const file = path.join(ROOT, baseDir, ref);
    if (!fs.existsSync(file)) {
      console.warn('  ! Datei nicht gefunden, Referenz bleibt unverändert:', ref);
      return match;
    }
    const ext = path.extname(file).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    return `url(data:${mime};base64,${fs.readFileSync(file).toString('base64')})`;
  });
}

function build() {
  let html = read('index.html');

  // ---- Stylesheets einbetten
  html = html.replace(/[ \t]*<link rel="stylesheet" href="([^"]+)">\r?\n/g, (m, href) => {
    const css = inlineCssAssets(read(href), path.dirname(href));
    console.log('  css:', href, `(${(css.length / 1024).toFixed(0)} kB)`);
    return `<style>\n/* ---- ${href} ---- */\n${css}\n</style>\n`;
  });

  // ---- Skripte einbetten
  html = html.replace(/[ \t]*<script src="([^"]+)"><\/script>\r?\n/g, (m, src) => {
    const js = read(src);
    console.log('  js: ', src, `(${(js.length / 1024).toFixed(0)} kB)`);
    // Schutz für den Fall, dass Quelltext die Zeichenfolge </script enthält
    return `<script>\n/* ---- ${src} ---- */\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>\n`;
  });

  fs.mkdirSync(DIST, { recursive: true });

  const full = html;
  fs.writeFileSync(path.join(DIST, 'netplan.html'), full);
  console.log('\n→ dist/netplan.html', `(${(full.length / 1024 / 1024).toFixed(2)} MB)`);

  // ---- Variante ohne Dokumentgerüst
  const bodyMatch = full.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) throw new Error('body-Bereich nicht gefunden');
  const headStyles = (full.match(/<style>[\s\S]*?<\/style>/gi) || []).join('\n');
  const headScripts = (full.match(/<head>[\s\S]*?<\/head>/i)[0].match(/<script>[\s\S]*?<\/script>/gi) || []).join('\n');
  const title = (full.match(/<title>([^<]*)<\/title>/i) || [, 'NetPlan'])[1];

  const embed = `<title>${title}</title>\n${headStyles}\n${headScripts}\n${bodyMatch[1].trim()}\n`;
  fs.writeFileSync(path.join(DIST, 'netplan-embed.html'), embed);
  console.log('→ dist/netplan-embed.html', `(${(embed.length / 1024 / 1024).toFixed(2)} MB)`);

  // Markup auf verbliebene Ressourcenverweise prüfen (Textstellen im
  // eingebetteten Bibliothekscode zählen nicht als Verweis)
  const markup = embed.replace(/<script>[\s\S]*?<\/script>/gi, '').replace(/<style>[\s\S]*?<\/style>/gi, '');
  const refs = markup.match(/<(?:script|link|img|iframe|source)\b[^>]*\b(?:src|href)\s*=\s*"(?!data:|#)[^"]*"/gi) || [];
  if (refs.length) {
    console.warn('\n! Achtung, externe Verweise im Markup:\n  ' + refs.join('\n  '));
  } else {
    console.log('\nKeine externen Verweise im Markup – die Datei ist autark.');
  }
}

build();
