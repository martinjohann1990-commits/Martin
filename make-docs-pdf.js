#!/usr/bin/env node
/* =========================================================================
   make-docs-pdf.js
   ---------------------------------------------------------------------------
   Erzeugt aus den Markdown-Dokumenten unter docs/ druckfertige PDF-Dateien.

   Aufruf:  node make-docs-pdf.js
   Voraussetzung: Playwright (nur für die Entwicklung nötig, nicht für das Tool)
                  npm i playwright && npx playwright install chromium
   ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DOCS = path.join(ROOT, 'docs');

const FILES = [
  { md: 'berechnungslogik.md', pdf: 'NetPlan-Berechnungslogik.pdf', lang: 'de' },
  { md: 'calculation-methodology.md', pdf: 'NetPlan-Calculation-Methodology.pdf', lang: 'en' }
];

/* ------------------------------------------------------------ Markdown → HTML
   Bewusst kompakt gehalten und auf die in den Dokumenten verwendeten Elemente
   beschränkt: Überschriften, Absätze, Listen, Tabellen, Codeblöcke, Zitate. */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="ref">$1</span>');   // Links als Text
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9äöüß ]/g, '').trim().replace(/\s+/g, '-');
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;

  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    // Codeblock
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }

    // Tabelle
    if (isTableRow(line) && isTableRow(lines[i + 1] || '') && /^[\s|:-]+$/.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && isTableRow(lines[i])) body.push(cells(lines[i++]));
      out.push('<table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') +
        '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>');
      continue;
    }

    // Überschrift
    let m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      out.push('<h' + level + ' id="' + slug(m[2]) + '">' + inline(m[2]) + '</h' + level + '>');
      i++;
      continue;
    }

    // Trennlinie
    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    // Listen (nummeriert und ungeordnet, einfache Verschachtelung)
    if (/^\s*([*+-]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([*+-]|\d+\.)\s+/.test(lines[i])) {
        let text = lines[i].replace(/^\s*([*+-]|\d+\.)\s+/, '');
        i++;
        // Fortsetzungszeilen einsammeln
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([*+-]|\d+\.)\s+/.test(lines[i])) {
          text += ' ' + lines[i].trim();
          i++;
        }
        items.push('<li>' + inline(text) + '</li>');
      }
      out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
      continue;
    }

    // Leerzeile
    if (!line.trim()) { i++; continue; }

    // Absatz
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|---+\s*$)/.test(lines[i]) &&
      !isTableRow(lines[i]) && !/^\s*([*+-]|\d+\.)\s+/.test(lines[i])) {
      buf.push(lines[i++]);
    }
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out.join('\n');
}

/* ------------------------------------------------------------ Seitenlayout */
function page(title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
         font-size: 10.5pt; line-height: 1.55; color: #0b0b0b; margin: 0; }
  h1 { font-size: 21pt; letter-spacing: -0.02em; margin: 0 0 4pt; }
  h2 { font-size: 14pt; margin: 20pt 0 6pt; padding-top: 8pt;
       border-top: 1px solid #e1e0d9; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 14pt 0 4pt; break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 10pt 0 3pt; break-after: avoid; }
  p { margin: 0 0 7pt; }
  ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
  li { margin-bottom: 3pt; }
  code { font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: 9pt;
         background: #f2f2ef; padding: 1px 3px; border-radius: 3px; }
  pre { background: #f9f9f7; border: 1px solid #e1e0d9; border-radius: 5px;
        padding: 8pt 10pt; margin: 0 0 9pt; break-inside: avoid; overflow: hidden; }
  pre code { background: none; padding: 0; font-size: 8.6pt; line-height: 1.45; white-space: pre-wrap; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 10pt;
          font-size: 9pt; break-inside: avoid; }
  th, td { border-bottom: 1px solid #e1e0d9; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f2f2ef; font-weight: 600; font-size: 8.4pt;
       text-transform: uppercase; letter-spacing: .03em; color: #52514e; }
  hr { border: 0; border-top: 1px solid #e1e0d9; margin: 14pt 0; }
  strong { font-weight: 640; }
  .ref { color: #256abf; }
  .doc-head { border-bottom: 2px solid #2a78d6; padding-bottom: 8pt; margin-bottom: 14pt; }
  .doc-head .meta { font-size: 8.5pt; color: #898781; margin-top: 3pt; }
  h1 + p { color: #52514e; }
</style></head><body>${bodyHtml}</body></html>`;
}

/* ------------------------------------------------------------ Erzeugung */
(async () => {
  let chromium;
  try {
    chromium = require('playwright').chromium;
  } catch (e) {
    console.error('Playwright fehlt. Installation: npm i playwright && npx playwright install chromium');
    process.exit(1);
  }

  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
  );

  for (const f of FILES) {
    const md = fs.readFileSync(path.join(DOCS, f.md), 'utf8');
    const title = (md.match(/^#\s+(.*)$/m) || [, 'NetPlan'])[1];
    const stamp = new Date().toLocaleDateString(f.lang === 'de' ? 'de-DE' : 'en-GB');
    const meta = f.lang === 'de' ? 'Stand: ' + stamp : 'As of ' + stamp;

    // Kopfzeile vor den ersten Inhalt setzen
    const body = mdToHtml(md).replace(/^<h1([^>]*)>(.*?)<\/h1>/,
      '<div class="doc-head"><h1$1>$2</h1><div class="meta">' + meta + '</div></div>');

    const html = page(title, body);
    // Zur Layoutkontrolle: DUMP_HTML=1 legt das Zwischen-HTML neben das PDF
    if (process.env.DUMP_HTML) fs.writeFileSync(path.join(DOCS, f.pdf.replace(/\.pdf$/, '.html')), html);

    const p = await browser.newPage();
    await p.setContent(html, { waitUntil: 'load' });
    await p.pdf({
      path: path.join(DOCS, f.pdf),
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font-size:8pt;color:#898781;padding:0 18mm;' +
        'display:flex;justify-content:space-between;font-family:system-ui,sans-serif">' +
        '<span>' + title.replace(/[<>&]/g, '') + '</span>' +
        '<span class="pageNumber"></span></div>',
      margin: { top: '20mm', bottom: '18mm', left: '18mm', right: '18mm' }
    });
    await p.close();

    const kb = (fs.statSync(path.join(DOCS, f.pdf)).size / 1024).toFixed(0);
    console.log('→ docs/' + f.pdf + ' (' + kb + ' kB)');
  }

  await browser.close();
})();
