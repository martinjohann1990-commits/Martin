#!/usr/bin/env node
/* =========================================================================
   make-templates.js
   ---------------------------------------------------------------------------
   Erzeugt die Importvorlagen unter vorlagen/. Die Spaltenüberschriften
   entsprechen genau den Synonymen, die der Import automatisch erkennt.

   Aufruf:  node make-templates.js
   ========================================================================= */
'use strict';

const XLSX = require('./vendor/xlsx.core.min.js');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'vorlagen');
fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------ Versanddaten */
const VERSAND_HEAD = ['Periode', 'Kunde', 'Land', 'Region', 'Produktkategorie',
  'Menge', 'Umsatz EUR', 'Volumen m3', 'Paletten', 'Paletten-Äquivalent'];

const VERSAND_ROWS = [
  ['2026-01', 'Handelshaus Nord', 'Deutschland', 'Deutschland Nord', 'Kühlgeräte', 12400, 289600, 132.5, 75.7, ''],
  ['2026-01', 'Fachhandel Süd', 'Deutschland', 'Deutschland Süd', 'Kühlgeräte', 9800, 228900, 104.7, 59.8, ''],
  ['2026-01', 'Online Retail EU', 'Frankreich', 'Frankreich', 'Werkzeuge', 21500, 174300, 88.0, 50.3, ''],
  ['2026-02', 'Handelshaus Nord', 'Deutschland', 'Deutschland Nord', 'Kühlgeräte', 13100, 305900, 140.0, 80.0, ''],
  ['2026-02', 'BauMarkt Gruppe', 'Polen', 'Polen', 'Werkzeuge', 18200, 147600, 74.5, 42.6, '']
];

const FORECAST_ROWS = [
  ['2027-01', 'Handelshaus Nord', 'Deutschland', 'Deutschland Nord', 'Kühlgeräte', 13900, 324600, 148.5, 84.9, ''],
  ['2027-01', 'Fachhandel Süd', 'Deutschland', 'Deutschland Süd', 'Kühlgeräte', 10600, 247600, 113.2, 64.7, ''],
  ['2027-01', 'Online Retail EU', 'Frankreich', 'Frankreich', 'Werkzeuge', 23800, 192900, 97.4, 55.7, '']
];

/* ------------------------------------------------------------ DCs */
const DC_HEAD = ['Name', 'Code', 'Region', 'Land', 'Breitengrad', 'Längengrad',
  'Kapazität', 'Grundbelegung', 'Lagerkosten', 'Handling', 'Transport Grundkosten',
  'Kosten je km', 'Fixkosten'];

const DC_ROWS = [
  ['DC Duisburg', 'DUI', 'Nordrhein-Westfalen', 'Deutschland', 51.4344, 6.7623, 26000, 3200, 13.5, 3.8, 5.5, 0.042, 48000],
  ['DC München', 'MUC', 'Bayern', 'Deutschland', 48.1372, 11.5756, 18000, 2600, 16.2, 4.4, 6.2, 0.047, 39000],
  ['DC Poznań', 'POZ', 'Wielkopolska', 'Polen', 52.4064, 16.9252, 22000, 900, 8.6, 2.6, 5.0, 0.038, 19000]
];

/* ------------------------------------------------------------ Hinweise */
const HINWEISE = [
  ['Importvorlage NetPlan – Logistik-Netzwerkplanung'],
  [],
  ['Grundregeln'],
  ['• Die erste Zeile enthält die Spaltenüberschriften, ab Zeile 2 folgen die Daten.'],
  ['• Die Spaltennamen dürfen abweichen – beim Import werden die Spalten frei zugeordnet.'],
  ['  Die hier verwendeten Bezeichnungen werden automatisch erkannt.'],
  ['• Die Reihenfolge der Spalten ist beliebig. Nicht benötigte Spalten können entfallen.'],
  ['• Historie und Forecast haben dasselbe Schema und werden beim Import getrennt gekennzeichnet.'],
  [],
  ['Pflichtangaben je Zeile'],
  ['Produktkategorie', 'Text', 'Zeilen ohne Kategorie werden übersprungen'],
  ['Periode', 'Text/Datum', 'siehe unten'],
  ['Eine Mengenangabe', 'Zahl', 'Menge, Paletten, Paletten-Äquivalent, Volumen oder Umsatz'],
  ['Ein Ortsbezug', 'Text', 'Region, Land oder Kunde'],
  [],
  ['Optionale Angaben'],
  ['Kunde', 'Text', ''],
  ['Land', 'Text', 'wird als Region verwendet, wenn keine Region angegeben ist'],
  ['Menge', 'Zahl', 'Stückzahl'],
  ['Umsatz EUR', 'Zahl', ''],
  ['Volumen m3', 'Zahl', 'Transportvolumen in Kubikmetern'],
  ['Paletten', 'Zahl', ''],
  ['Paletten-Äquivalent', 'Zahl', 'hat Vorrang vor allen anderen Mengenangaben'],
  ['Breitengrad / Längengrad', 'Zahl', 'nur nötig, wenn die Region nicht automatisch erkannt wird'],
  [],
  ['Ermittlung der Palettenmenge (erste verfügbare Angabe gewinnt)'],
  ['1. Paletten-Äquivalent'],
  ['2. Paletten'],
  ['3. Volumen geteilt durch "Volumen je Palette" (Einstellung im Tool)'],
  ['4. Menge geteilt durch "Stück je Palette" (Einstellung im Tool)'],
  [],
  ['Erkannte Periodenformate'],
  ['2026-03', 'Monat'],
  ['15.03.2026', 'Tagesdatum, wird dem Monat zugeordnet'],
  ['03/2026', 'Monat'],
  ['Mär 2026', 'Monatsname, deutsch oder englisch'],
  ['2026-Q2', 'Quartal'],
  ['2026-KW12', 'Kalenderwoche'],
  ['2026', 'Jahr'],
  ['Echte Excel-Datumswerte werden ebenfalls erkannt.'],
  [],
  ['Zahlenformate'],
  ['1.234,56', 'deutsches Format'],
  ['1,234.56', 'englisches Format'],
  ['Einheiten wie EUR, €, Stk, m³ dürfen im Feld stehen und werden entfernt.'],
  [],
  ['Datenebene'],
  ['Einzellieferungen und bereits verdichtete Zeilen sind beide zulässig.'],
  ['Mehrere Zeilen mit gleicher Kombination aus Periode, Kunde, Region und'],
  ['Kategorie werden beim Import zusammengefasst.']
];

/* ------------------------------------------------------------ Aufbau */
function sheet(aoa, widths) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = widths.map((w) => ({ wch: w }));
  return ws;
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,
  sheet([VERSAND_HEAD, ...VERSAND_ROWS], [12, 20, 14, 20, 20, 10, 12, 12, 10, 20]),
  'Versanddaten');
XLSX.utils.book_append_sheet(wb,
  sheet([VERSAND_HEAD, ...FORECAST_ROWS], [12, 20, 14, 20, 20, 10, 12, 12, 10, 20]),
  'Forecast');
XLSX.utils.book_append_sheet(wb,
  sheet([DC_HEAD, ...DC_ROWS], [18, 8, 22, 14, 13, 13, 12, 14, 13, 10, 20, 12, 11]),
  'DCs');
XLSX.utils.book_append_sheet(wb, sheet(HINWEISE, [46, 16, 52]), 'Hinweise');

// Der Browser-Build schreibt nicht selbst auf die Festplatte – Puffer erzeugen
fs.writeFileSync(path.join(OUT, 'netplan_importvorlage.xlsx'),
  XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

/* ------------------------------------------------------------ CSV-Variante */
const csv = [VERSAND_HEAD, ...VERSAND_ROWS]
  .map((row) => row.map((c) => (typeof c === 'number' ? String(c).replace('.', ',') : c)).join(';'))
  .join('\r\n');
fs.writeFileSync(path.join(OUT, 'netplan_importvorlage_versanddaten.csv'), '﻿' + csv, 'utf8');

const dcCsv = [DC_HEAD, ...DC_ROWS]
  .map((row) => row.map((c) => (typeof c === 'number' ? String(c).replace('.', ',') : c)).join(';'))
  .join('\r\n');
fs.writeFileSync(path.join(OUT, 'netplan_importvorlage_dcs.csv'), '﻿' + dcCsv, 'utf8');

console.log('Vorlagen erzeugt:');
fs.readdirSync(OUT).forEach((f) => {
  console.log('  vorlagen/' + f, `(${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1)} kB)`);
});
