/* NetPlan+ importer.js — parsers for the real source-file structures (SAP BI export).
   Two shapes exist in practice:
   1. Forecast: wide format, one column per month (real Excel dates), DC/Article-native.
   2. Sales History / Destinations / SKU View: 3-row headers with a "Division" split
      (ISI / V&B / Overall Result) and duplicate column names — parsed positionally, the
      "Overall Result" + "Sales qty ESU" column is located by scanning the header rows rather
      than a fixed index so small layout changes (a shifted date range, an extra division)
      don't break the import.
   Sales Hierarchie and Ship-to-address have plain, unique headers and use the classic
   confidence-scored column mapping. Cross-file joins (category via Forecast's own columns,
   DC via DC_Translation_Table + Sales History/Destinations, distance via Ship-to-address) are
   resolved lazily in sim.js. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util;

  /* ---------------- column mapping scorer (spec §6.2), used where headers are unique ---------------- */
  function scorePair(header, synonym) {
    var h = U.normHeader(header), s = U.normHeader(synonym);
    if (!h || !s) return 0;
    if (h === s) return 100;
    if (h.split(' ').join('') === s.split(' ').join('')) return 95;
    if (h.length >= 3 && h.indexOf(s) !== -1) return 60 + s.length;
    if (s.length >= 3 && s.indexOf(h) !== -1) return 40 + h.length;
    return 0;
  }

  function autoMapColumns(headers, fieldDefs) {
    var pairs = [];
    for (var f = 0; f < fieldDefs.length; f++) {
      var def = fieldDefs[f];
      var syns = [def.label].concat(def.synonyms || []);
      for (var h = 0; h < headers.length; h++) {
        var best = 0;
        for (var s = 0; s < syns.length; s++) {
          var sc = scorePair(headers[h], syns[s]);
          if (sc > best) best = sc;
        }
        if (best > 0) pairs.push({ field: def.key, column: headers[h], score: best });
      }
    }
    pairs.sort(function (a, b) { return b.score - a.score; });
    var usedCols = {}, usedFields = {}, mapping = {};
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (usedCols[p.column] || usedFields[p.field]) continue;
      mapping[p.field] = { column: p.column, score: p.score };
      usedCols[p.column] = true; usedFields[p.field] = true;
    }
    var missing = [];
    for (var m = 0; m < fieldDefs.length; m++) {
      if (fieldDefs[m].required && !mapping[fieldDefs[m].key]) missing.push(fieldDefs[m].key);
    }
    return { mapping: mapping, missingRequired: missing };
  }

  /* Same scoring, but against a positional header ROW (array) — returns {field: colIndex}.
     Used for sheets with duplicate/blank header cells where header:true object-keyed rows
     would collide (e.g. two "V&B/ISI Shipping point" columns), and for the wide Forecast
     sheet where month columns are real Date objects, not text. */
  function autoMapColumnsPositional(headerArray, fieldDefs) {
    var pairs = [];
    for (var f = 0; f < fieldDefs.length; f++) {
      var def = fieldDefs[f];
      var syns = [def.label].concat(def.synonyms || []);
      for (var c = 0; c < headerArray.length; c++) {
        var h = headerArray[c];
        if (h === null || h === undefined || h instanceof Date || h === '') continue;
        var best = 0;
        for (var s = 0; s < syns.length; s++) {
          var sc = scorePair(String(h), syns[s]);
          if (sc > best) best = sc;
        }
        if (best > 0) pairs.push({ field: def.key, col: c, score: best });
      }
    }
    pairs.sort(function (a, b) { return b.score - a.score; });
    var usedCols = {}, usedFields = {}, mapping = {};
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (usedCols[p.col] !== undefined || usedFields[p.field]) continue;
      mapping[p.field] = p.col;
      usedCols[p.col] = true; usedFields[p.field] = true;
    }
    return mapping;
  }

  function val(row, mapping, field) {
    var m = mapping[field];
    if (!m) return null;
    var v = row[m.column];
    if (v === undefined) return null;
    if (typeof v === 'string') { v = v.trim(); if (v === '') return null; }
    return v;
  }
  function str(row, mapping, field) {
    var v = val(row, mapping, field);
    return v === null ? null : String(v).trim();
  }
  function num(row, mapping, field) {
    var v = val(row, mapping, field);
    return v === null ? null : U.parseLocaleNumber(v);
  }

  /* ---------------- generic >2000-row aggregation ---------------- */
  function aggregateIfNeeded(rows, keyFn, sumKeys, threshold) {
    if (rows.length <= (threshold || 2000)) return { rows: rows, aggregated: false };
    var map = {}, order = [];
    for (var i = 0; i < rows.length; i++) {
      var k = keyFn(rows[i]);
      if (!map[k]) { map[k] = Object.assign({}, rows[i]); order.push(k); for (var s = 0; s < sumKeys.length; s++) map[k][sumKeys[s]] = 0; }
      for (var s2 = 0; s2 < sumKeys.length; s2++) {
        var v = rows[i][sumKeys[s2]];
        if (U.isNum(v)) map[k][sumKeys[s2]] += v;
      }
    }
    var out = [];
    for (var o = 0; o < order.length; o++) out.push(map[order[o]]);
    return { rows: out, aggregated: true, originalCount: rows.length };
  }

  /* ==================================================================
     1. Forecast (wide format: DC/Article attributes + one column per month)
     ================================================================== */
  var FORECAST_ID_FIELDS = [
    { key: 'dc', label: 'DC', required: true, synonyms: ['Distributionszentrum', 'Distribution Center', 'Standort'] },
    { key: 'article', label: 'Article', required: true, synonyms: ['Article Number', 'Artikelnummer', 'Material Number', 'SKU', 'Material'] },
    { key: 'articleDesc', label: 'Article desc', required: false, synonyms: ['Article description', 'Artikelbezeichnung', 'Description'] },
    { key: 'bpSp', label: 'BP/SP', required: false, synonyms: ['Big Piece', 'Small Piece'] },
    { key: 'category', label: 'Product Mid Group', required: false, synonyms: ['Product Group', 'Produktgruppe', 'Mid Group', 'Warengruppe'] },
    { key: 'subCategory', label: 'Product Sub Group', required: false, synonyms: ['Sub Group', 'Produktuntergruppe'] },
    { key: 'packaging', label: 'Standard packaging', required: false, synonyms: ['Packaging', 'Verpackung'] },
    { key: 'palletLoad', label: 'Pallett Load', required: true, synonyms: ['Pallet Load', 'Palettenladung', 'Units per pallet', 'Stück je Palette', 'Stueck je Palette'] }
  ];

  function median(arr) {
    if (!arr.length) return null;
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function detectMonthColumns(headerRow) {
    var cols = [];
    for (var c = 0; c < headerRow.length; c++) {
      var h = headerRow[c];
      var period = null;
      if (h instanceof Date) period = U.monthPeriodFromDate(h);
      else if (typeof h === 'string' && /\d{4}/.test(h) && /\d{1,2}/.test(h)) period = U.parsePeriodByType(h, 'month');
      if (period) cols.push({ index: c, period: period });
    }
    return cols;
  }

  /* rows2d: array-of-arrays including the header row at index 0 (via readWorkbookFileRaw). */
  function parseForecastWide(rows2d) {
    var warnings = [];
    if (!rows2d.length) return { records: [], warnings: ['Datei ist leer'], idMapping: {}, monthCols: [] };
    var header = rows2d[0];
    var idMapping = autoMapColumnsPositional(header, FORECAST_ID_FIELDS);
    var monthCols = detectMonthColumns(header);

    var missing = FORECAST_ID_FIELDS.filter(function (f) { return f.required && idMapping[f.key] === undefined; });
    if (missing.length) {
      warnings.push('Pflichtfeld(er) nicht gefunden: ' + missing.map(function (f) { return f.label; }).join(', '));
      return { records: [], warnings: warnings, idMapping: idMapping, monthCols: monthCols };
    }
    if (!monthCols.length) warnings.push('Keine Monatsspalten (Datumsüberschriften) erkannt.');

    /* Pass 1: read each row's own attributes and, where its own "Pallett Load" is present,
       collect it as a sample for its Product Sub Group / Mid Group. In the real source file
       roughly a third of articles (mostly small accessories/spare parts) carry NO Pallett Load
       at all (0 or blank) — dividing by that would silently zero out their pallets, dropping a
       real share of the forecast volume (observed: ~28% of total quantity) from every
       pallet-based figure (Dashboard, Simulation, Szenarien) even though the piece quantity was
       there in the file. */
    var parsedRows = [];
    var subGroupSamples = {}, midGroupSamples = {}, allSamples = [];
    for (var r = 1; r < rows2d.length; r++) {
      var row = rows2d[r];
      if (!row || !row.length) continue;
      var dcRaw = row[idMapping.dc], articleRaw = row[idMapping.article];
      if (!dcRaw || !articleRaw) continue;
      var dc = String(dcRaw).trim();
      var article = String(articleRaw).trim();
      var ownPalletLoad = idMapping.palletLoad !== undefined ? U.parseLocaleNumber(row[idMapping.palletLoad]) : null;
      var category = idMapping.category !== undefined && row[idMapping.category] ? String(row[idMapping.category]).trim() : 'Unbekannt';
      var subCategory = idMapping.subCategory !== undefined && row[idMapping.subCategory] ? String(row[idMapping.subCategory]).trim() : null;
      if (U.isNum(ownPalletLoad) && ownPalletLoad > 0) {
        allSamples.push(ownPalletLoad);
        if (subCategory) (subGroupSamples[subCategory] = subGroupSamples[subCategory] || []).push(ownPalletLoad);
        (midGroupSamples[category] = midGroupSamples[category] || []).push(ownPalletLoad);
      }
      parsedRows.push({ row: row, dc: dc, article: article, ownPalletLoad: ownPalletLoad, category: category, subCategory: subCategory });
    }
    var globalMedian = median(allSamples);
    var subGroupMedian = {}, midGroupMedian = {};
    Object.keys(subGroupSamples).forEach(function (k) { subGroupMedian[k] = median(subGroupSamples[k]); });
    Object.keys(midGroupSamples).forEach(function (k) { midGroupMedian[k] = median(midGroupSamples[k]); });

    /* Pass 2: build records, substituting the Product Sub Group's (else Mid Group's, else the
       whole file's) median Pallett Load whenever a row's own value is missing, so that volume
       still counts in pallets instead of vanishing — flagged via palletLoadEstimated so it stays
       visible (import warning + can be surfaced per-record later) rather than silently guessed. */
    var records = [];
    var estimatedQty = 0, totalQty = 0, estimatedArticles = {};
    for (var p = 0; p < parsedRows.length; p++) {
      var pr = parsedRows[p];
      var palletLoad = pr.ownPalletLoad, estimated = false;
      if (!(U.isNum(palletLoad) && palletLoad > 0)) {
        palletLoad = (pr.subCategory && subGroupMedian[pr.subCategory]) || midGroupMedian[pr.category] || globalMedian || null;
        estimated = U.isNum(palletLoad) && palletLoad > 0;
      }
      for (var m = 0; m < monthCols.length; m++) {
        var cell = pr.row[monthCols[m].index];
        var qty = U.parseLocaleNumber(cell);
        if (!qty) continue;
        totalQty += qty;
        var pallets = (U.isNum(palletLoad) && palletLoad > 0) ? qty / palletLoad : 0;
        if (estimated && pallets > 0) { estimatedQty += qty; estimatedArticles[pr.article] = true; }
        records.push({
          id: U.uid('fc'), dc: pr.dc, article: pr.article,
          articleDesc: idMapping.articleDesc !== undefined ? pr.row[idMapping.articleDesc] : null,
          bpSp: idMapping.bpSp !== undefined ? pr.row[idMapping.bpSp] : null,
          category: pr.category, subCategory: pr.subCategory,
          packaging: idMapping.packaging !== undefined ? pr.row[idMapping.packaging] : null,
          palletLoad: U.isNum(palletLoad) ? palletLoad : null, palletLoadEstimated: estimated,
          periodKey: monthCols[m].period.key, periodTs: monthCols[m].period.ts, periodDays: monthCols[m].period.days,
          qty: qty, pallets: pallets
        });
      }
    }
    if (estimatedQty > 0) {
      warnings.push('Pallett Load fehlte im Ausgangsfile bei ' + Object.keys(estimatedArticles).length + ' Artikel(n) (' +
        (Math.round(estimatedQty / (totalQty || 1) * 1000) / 10) + ' % der Gesamtmenge in Stück) — für diese wurde ersatzweise der Median der jeweiligen Produkt(unter)gruppe angesetzt, damit die Menge nicht mit 0 Paletten in die Simulation eingeht. Für eine exakte Rechnung bitte die Pallett-Load-Spalte im Quellfile vervollständigen.');
    }
    var agg = aggregateIfNeeded(records, function (rec) { return [rec.dc, rec.article, rec.periodKey].join('|'); }, ['qty', 'pallets'], 4000);
    return { records: agg.rows, warnings: warnings, aggregated: agg.aggregated, originalCount: agg.originalCount, idMapping: idMapping, monthCols: monthCols };
  }

  /* ==================================================================
     Shared helper for the "Division-split" sheets (Sales History, Destinations,
     SKU View): 3 header rows (Division / Metric / ID-or-unit), find the
     "Overall Result" + "...ESU..." column by scanning rather than a fixed index.
     ================================================================== */
  function findOverallEsuColumn(rows2d) {
    var divisionRow = rows2d[0] || [], metricRow = rows2d[1] || [];
    var width = Math.max(divisionRow.length, metricRow.length);
    for (var c = 0; c < width; c++) {
      var div = String(divisionRow[c] || '').toLowerCase();
      var met = String(metricRow[c] || '').toLowerCase();
      if (div.indexOf('overall result') !== -1 && met.indexOf('esu') !== -1) return c;
    }
    for (var c2 = 0; c2 < width; c2++) {
      if (String(metricRow[c2] || '').toLowerCase().indexOf('esu') !== -1) return c2;
    }
    return -1;
  }

  /* ==================================================================
     2. Sales History (Plant, Shipping point, District, Overall-Result ESU volume)
     ================================================================== */
  function parseSalesHistoryReal(rows2d) {
    var warnings = [];
    if (rows2d.length < 4) return { records: [], warnings: ['Unerwartetes Format (weniger als 3 Kopfzeilen).'], aggregated: false };
    var esuCol = findOverallEsuColumn(rows2d);
    if (esuCol === -1) warnings.push('Spalte "Overall Result / Sales qty ESU" nicht gefunden — Mengen werden als 0 angenommen.');
    var records = [];
    for (var r = 3; r < rows2d.length; r++) {
      var row = rows2d[r];
      if (!row) continue;
      var districtLabel = row[3];
      if (!districtLabel) continue;
      var esu = esuCol !== -1 ? U.parseLocaleNumber(row[esuCol]) : null;
      records.push({
        id: U.uid('sh'),
        plant: row[0] != null ? String(row[0]).trim() : null,
        shippingPoint: row[1] != null ? String(row[1]).trim() : null,
        shippingPointName: row[2] != null ? String(row[2]).trim() : null,
        districtLabel: String(districtLabel).trim(),
        qtyEsu: U.isNum(esu) ? esu : 0
      });
    }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ==================================================================
     3. Destinations (Shipping point <-> Ship-to Party, Overall-Result ESU volume)
     ================================================================== */
  function parseDestinationsReal(rows2d) {
    var warnings = [];
    if (rows2d.length < 4) return { records: [], warnings: ['Unerwartetes Format (weniger als 3 Kopfzeilen).'], aggregated: false };
    var esuCol = findOverallEsuColumn(rows2d);
    if (esuCol === -1) warnings.push('Spalte "Overall Result / Sales qty ESU" nicht gefunden — Mengen werden als 0 angenommen.');
    var records = [];
    for (var r = 3; r < rows2d.length; r++) {
      var row = rows2d[r];
      if (!row) continue;
      var shippingPoint = row[0];
      if (!shippingPoint) continue;
      var esu = esuCol !== -1 ? U.parseLocaleNumber(row[esuCol]) : null;
      var vbShipTo = row[2] != null ? String(row[2]).trim() : null;
      var isiShipTo = row[4] != null ? String(row[4]).trim() : null;
      records.push({
        id: U.uid('dest'),
        shippingPoint: String(shippingPoint).trim(), shippingPointName: row[1] != null ? String(row[1]).trim() : null,
        vbShipTo: vbShipTo, vbShipToName: row[3] != null ? String(row[3]).trim() : null,
        isiShipTo: isiShipTo, isiShipToName: row[5] != null ? String(row[5]).trim() : null,
        qtyEsu: U.isNum(esu) ? esu : 0
      });
    }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ==================================================================
     4. SKU View (Shipping point <-> ISI/V&B article, Overall-Result ESU volume)
     ================================================================== */
  function parseSkuViewReal(rows2d) {
    var warnings = [];
    if (rows2d.length < 4) return { records: [], warnings: ['Unerwartetes Format (weniger als 3 Kopfzeilen).'], aggregated: false };
    var esuCol = findOverallEsuColumn(rows2d);
    var records = [];
    for (var r = 3; r < rows2d.length; r++) {
      var row = rows2d[r];
      if (!row) continue;
      var shippingPoint = row[0], vbArticle = row[4];
      if (!shippingPoint || !vbArticle) continue;
      var esu = esuCol !== -1 ? U.parseLocaleNumber(row[esuCol]) : null;
      records.push({
        id: U.uid('sku'),
        shippingPoint: String(shippingPoint).trim(), shippingPointName: row[1] != null ? String(row[1]).trim() : null,
        isiArticle: row[2] != null ? String(row[2]).trim() : null, isiArticleName: row[3] != null ? String(row[3]).trim() : null,
        article: String(vbArticle).trim(), articleName: row[5] != null ? String(row[5]).trim() : null,
        qtyEsu: U.isNum(esu) ? esu : 0
      });
    }
    var agg = aggregateIfNeeded(records, function (rec) { return [rec.shippingPoint, rec.article].join('|'); }, ['qtyEsu'], 4000);
    return { records: agg.rows, warnings: warnings, aggregated: agg.aggregated, originalCount: agg.originalCount };
  }

  /* ==================================================================
     5. DC_Translation_Table — two columns share the header "V&B/ISI Shipping
        point" (code, then description); parsed positionally. DCs are NOT
        auto-created here — Forecast's own "DC" column is the source of truth
        for which shipping points are actual pallet-storage distribution
        centers (this table also lists production plants, returns handling,
        sourcing points etc. that are not warehouse nodes we plan against).
     ================================================================== */
  function parseDcTranslationPositional(rows2d) {
    var records = [], warnings = [];
    if (!rows2d.length) return { records: records, warnings: ['Datei ist leer'], aggregated: false };
    var header = rows2d[0];
    var dcColIdx = -1;
    for (var h = 0; h < header.length; h++) {
      if (U.normHeader(header[h]) === 'dc') dcColIdx = h;
    }
    if (dcColIdx === -1) dcColIdx = 2;
    var codeIdx = 0, descIdx = 1;
    for (var i = 1; i < rows2d.length; i++) {
      var row = rows2d[i];
      if (!row || row.length === 0) continue;
      var code = row[codeIdx] !== undefined ? String(row[codeIdx]).trim() : '';
      if (!code) continue;
      var desc = row[descIdx] !== undefined ? String(row[descIdx]).trim() : '';
      var dc = row[dcColIdx] !== undefined ? String(row[dcColIdx]).trim() : '';
      records.push({ id: U.uid('dct'), shippingPoint: code, shippingPointName: desc, dc: dc });
    }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ==================================================================
     6. Sales_Hierarchie_Table — plain unique headers, classic mapping.
     ================================================================== */
  var HIERARCHY_FIELDS = [
    { key: 'districtCode', label: 'District-Code', required: true, synonyms: ['District Code', 'Distrikt Code'] },
    { key: 'district', label: 'District', required: false, synonyms: ['Distrikt', 'Region'] },
    { key: 'code', label: 'Code', required: true, synonyms: ['Ländercode', 'Country code', 'Country Key'] },
    { key: 'unit', label: 'Land / Einheit', required: false, synonyms: ['Land/Einheit', 'Country / Unit', 'Land', 'Country'] }
  ];

  function parseSalesHierarchy(rawRows, mapping) {
    var records = [], warnings = [];
    for (var i = 0; i < rawRows.length; i++) {
      var r = rawRows[i];
      var districtCode = str(r, mapping, 'districtCode');
      var code = str(r, mapping, 'code');
      if (!districtCode || !code) continue;
      records.push({
        id: U.uid('sh2'),
        districtCode: districtCode,
        district: str(r, mapping, 'district') || districtCode,
        code: code,
        unit: str(r, mapping, 'unit') || code
      });
    }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ==================================================================
     7. Ship-to-address — plain unique headers, classic mapping. Pure address
        master (no district/shipping-point link) used for geocoding.
     ================================================================== */
  var SHIPTO_ADDRESS_FIELDS = [
    { key: 'shipTo', label: 'ship_to_kunnr', required: true, synonyms: ['Ship-to-pty', 'Ship to party', 'Kunde', 'Customer', 'Ship-to'] },
    { key: 'name', label: 'NAME1', required: false, synonyms: ['Name', 'Kundenname'] },
    { key: 'name2', label: 'NAME2', required: false, synonyms: ['Name 2', 'Zusatz'] },
    { key: 'street', label: 'street', required: false, synonyms: ['Straße', 'Strasse', 'Address'] },
    { key: 'postCode', label: 'post_code', required: false, synonyms: ['PLZ', 'Postal code', 'Zip', 'Postleitzahl'] },
    { key: 'city', label: 'city', required: false, synonyms: ['Stadt', 'Ort'] },
    { key: 'region', label: 'region', required: false, synonyms: ['Region', 'Bundesland', 'State'] },
    { key: 'country', label: 'country', required: false, synonyms: ['Country Key', 'Land', 'Länderschlüssel'] },
    { key: 'accountGroup', label: 'account_group', required: false, synonyms: ['Kontengruppe'] }
  ];

  function parseShipToAddress(rawRows, mapping) {
    var records = [], warnings = [];
    for (var i = 0; i < rawRows.length; i++) {
      var r = rawRows[i];
      var shipTo = str(r, mapping, 'shipTo');
      if (!shipTo) continue;
      records.push({
        id: U.uid('sta'), shipTo: shipTo,
        name: str(r, mapping, 'name'), name2: str(r, mapping, 'name2'),
        street: str(r, mapping, 'street'), postCode: str(r, mapping, 'postCode'),
        city: str(r, mapping, 'city'), region: str(r, mapping, 'region'),
        country: str(r, mapping, 'country'), accountGroup: str(r, mapping, 'accountGroup')
      });
    }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ---------------- public entry points ---------------- */
  var FILE_TYPES = {
    forecast: { label: 'Forecast – Pallet Load', wide: true, target: 'forecast' },
    history: { label: 'Sales History (aggregiert)', structural: true, target: 'history' },
    destinations: { label: 'Destinations', structural: true, target: 'destinations' },
    sku: { label: 'SKU View', structural: true, target: 'skus' },
    dcTranslation: { label: 'DC Translation Table', positional: true, target: 'dcTranslation' },
    salesHierarchy: { label: 'Sales Hierarchie', fields: HIERARCHY_FIELDS, parse: parseSalesHierarchy, target: 'salesHierarchy' },
    shipToAddress: { label: 'Ship-to-Address', fields: SHIPTO_ADDRESS_FIELDS, parse: parseShipToAddress, target: 'shipToAddresses' }
  };

  function headersFromRows(rows) {
    if (!rows.length) return [];
    var set = {}, out = [];
    for (var i = 0; i < Math.min(rows.length, 50); i++) {
      for (var k in rows[i]) { if (rows[i].hasOwnProperty(k) && !set[k]) { set[k] = true; out.push(k); } }
    }
    return out;
  }

  LNP.importer = {
    FILE_TYPES: FILE_TYPES,
    scorePair: scorePair, autoMapColumns: autoMapColumns, autoMapColumnsPositional: autoMapColumnsPositional,
    headersFromRows: headersFromRows,
    parseForecastWide: parseForecastWide, FORECAST_ID_FIELDS: FORECAST_ID_FIELDS,
    parseSalesHistoryReal: parseSalesHistoryReal, parseDestinationsReal: parseDestinationsReal, parseSkuViewReal: parseSkuViewReal,
    parseDcTranslationPositional: parseDcTranslationPositional, findOverallEsuColumn: findOverallEsuColumn
  };
})();
