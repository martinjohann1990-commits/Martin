/* NetPlan+ importer.js — column-mapping scorer + dedicated parsers for the 7 source files.
   Cross-file joins (category via SKU, DC via shipping point, distance via destinations) are
   resolved lazily in sim.js so files can be uploaded in any order and re-uploaded later. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util;

  /* ---------------- column mapping scorer (spec §6.2) ---------------- */
  function scorePair(header, synonym) {
    var h = U.normHeader(header), s = U.normHeader(synonym);
    if (!h || !s) return 0;
    if (h === s) return 100;
    if (h.split(' ').join('') === s.split(' ').join('')) return 95;
    if (h.length >= 3 && h.indexOf(s) !== -1) return 60 + s.length;
    if (s.length >= 3 && s.indexOf(h) !== -1) return 40 + h.length;
    return 0;
  }

  /* fieldDefs: [{key, label, required, synonyms:[...]}]; headers: [string]
     -> { mapping: {fieldKey: {column, score}}, missingRequired: [fieldKey,...] } */
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
     1. Forecast_-_Pallet_Load_.csv
     ================================================================== */
  var FORECAST_FIELDS = [
    { key: 'district', label: 'V&B/ISI District', required: true, synonyms: ['District', 'Distrikt', 'District Code', 'Vertriebsgebiet'] },
    { key: 'districtName', label: 'V&B/ISI District name', required: false, synonyms: ['District name', 'Distrikt Name', 'Vertriebsgebiet Name'] },
    { key: 'plant', label: 'Production Plant / Supplier', required: false, synonyms: ['Production Plant', 'Supplier', 'Werk', 'Lieferant', 'Plant'] },
    { key: 'period', label: 'Calendar week/year', required: true, synonyms: ['Calendar week', 'Period', 'Periode', 'Kalenderwoche', 'KW/Jahr'] },
    { key: 'material', label: 'Material Number', required: true, synonyms: ['Material', 'Artikelnummer', 'SKU', 'Material Nummer'] },
    { key: 'qty', label: 'Forecast qty ESU', required: true, synonyms: ['Forecast quantity', 'Forecast qty', 'Menge', 'Prognosemenge'] },
    { key: 'pallets', label: 'Sum of Pallet load', required: false, synonyms: ['Pallet load', 'Paletten', 'Pallets', 'PAL'] },
    { key: 'volume', label: 'Sum of Volume in M3', required: false, synonyms: ['Volume in M3', 'Volumen', 'Volume m3', 'M3'] }
  ];

  function parseForecast(rawRows, mapping) {
    var records = [], warnings = [];
    for (var i = 0; i < rawRows.length; i++) {
      var r = rawRows[i];
      var district = str(r, mapping, 'district');
      var periodRaw = val(r, mapping, 'period');
      var material = str(r, mapping, 'material');
      var qty = num(r, mapping, 'qty');
      if (!district || periodRaw === null || !material) continue;
      var period = U.parsePeriod(periodRaw);
      if (!period) { warnings.push('Zeile ' + (i + 2) + ': Periode nicht erkannt (' + periodRaw + ')'); continue; }
      records.push({
        id: U.uid('fc'),
        district: district,
        districtName: str(r, mapping, 'districtName') || district,
        plant: str(r, mapping, 'plant'),
        material: material,
        periodKey: period.key, periodTs: period.ts, periodDays: period.days,
        qty: qty || 0,
        pallets: num(r, mapping, 'pallets') || 0,
        volume: num(r, mapping, 'volume') || 0
      });
    }
    var agg = aggregateIfNeeded(records,
      function (rec) { return [rec.district, rec.material, rec.periodKey, rec.plant].join('|'); },
      ['qty', 'pallets', 'volume'], 2000);
    return { records: agg.rows, warnings: warnings, aggregated: agg.aggregated, originalCount: agg.originalCount };
  }

  /* ==================================================================
     2. Sales_History_Data_aggregated.csv
     ================================================================== */
  var HISTORY_FIELDS = [
    { key: 'district', label: 'V&B/ISI District', required: true, synonyms: ['District', 'Distrikt'] },
    { key: 'districtName', label: 'V&B/ISI District name', required: false, synonyms: ['District name', 'Distrikt Name'] },
    { key: 'plant', label: 'Production Plant / Supplier', required: false, synonyms: ['Production Plant', 'Supplier', 'Werk', 'Lieferant'] },
    { key: 'qty', label: 'Sum of Sales qty ESU', required: true, synonyms: ['Sales qty ESU', 'Sales quantity', 'Verkaufsmenge', 'Absatzmenge'] }
  ];

  function parseHistory(rawRows, mapping) {
    var records = [], warnings = [];
    for (var i = 0; i < rawRows.length; i++) {
      var r = rawRows[i];
      var district = str(r, mapping, 'district');
      if (!district) continue;
      records.push({
        id: U.uid('hi'),
        district: district,
        districtName: str(r, mapping, 'districtName') || district,
        plant: str(r, mapping, 'plant'),
        qty: num(r, mapping, 'qty') || 0
      });
    }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ==================================================================
     3. Destinations_.csv  /  7. Ship-to-adress.csv (identical shape)
     ================================================================== */
  var DESTINATION_FIELDS = [
    { key: 'shipTo', label: 'Ship-to-pty', required: true, synonyms: ['Ship to party', 'Warenempfänger', 'Kunde', 'Customer', 'Sold-to'] },
    { key: 'name', label: 'Name', required: false, synonyms: ['Kundenname', 'Customer name'] },
    { key: 'city', label: 'City', required: false, synonyms: ['Stadt', 'Ort'] },
    { key: 'country', label: 'Country Key', required: false, synonyms: ['Country', 'Land', 'Länderschlüssel', 'Country code'] },
    { key: 'district', label: 'V&B/ISI District', required: true, synonyms: ['District', 'Distrikt'] },
    { key: 'districtName', label: 'V&B/ISI District name', required: false, synonyms: ['District name', 'Distrikt Name'] },
    { key: 'shippingPoint', label: 'V&B/ISI Shipping point', required: false, synonyms: ['Shipping point', 'Versandort', 'Versandpunkt', 'Ship point'] }
  ];

  function parseDestinations(rawRows, mapping) {
    var records = [], warnings = [];
    for (var i = 0; i < rawRows.length; i++) {
      var r = rawRows[i];
      var shipTo = str(r, mapping, 'shipTo');
      if (!shipTo) continue;
      records.push({
        id: U.uid('dest'),
        shipTo: shipTo,
        name: str(r, mapping, 'name'),
        city: str(r, mapping, 'city'),
        country: str(r, mapping, 'country'),
        district: str(r, mapping, 'district'),
        districtName: str(r, mapping, 'districtName'),
        shippingPoint: str(r, mapping, 'shippingPoint')
      });
    }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ==================================================================
     4. SKU_View.csv
     ================================================================== */
  var SKU_FIELDS = [
    { key: 'material', label: 'Material Number', required: true, synonyms: ['Material', 'Artikelnummer', 'SKU'] },
    { key: 'marketingView', label: 'Marketing-View', required: false, synonyms: ['Marketing View', 'Produktgruppe'] },
    { key: 'productLine', label: 'Productline', required: false, synonyms: ['Product line', 'Produktlinie', 'Serie'] },
    { key: 'gtin', label: 'Gtin', required: false, synonyms: ['GTIN', 'EAN'] },
    { key: 'dc', label: 'DC', required: true, synonyms: ['Distributionszentrum', 'Distribution Center', 'Standort'] }
  ];

  function parseSkuView(rawRows, mapping) {
    var records = [], warnings = [], dcNames = {};
    for (var i = 0; i < rawRows.length; i++) {
      var r = rawRows[i];
      var material = str(r, mapping, 'material');
      if (!material) continue;
      var dc = str(r, mapping, 'dc');
      records.push({
        id: U.uid('sku'),
        material: material,
        marketingView: str(r, mapping, 'marketingView'),
        productLine: str(r, mapping, 'productLine'),
        gtin: num(r, mapping, 'gtin'),
        dc: dc
      });
      if (dc) dcNames[dc] = true;
    }
    for (var name in dcNames) { if (dcNames.hasOwnProperty(name)) LNP.state.getOrCreateDc(name); }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ==================================================================
     5. DC_Translation_Table_.csv — two columns share the header
        "V&B/ISI Shipping point" (code, then description); parsed
        positionally instead of by header name.
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
    var dcNames = {};
    for (var i = 1; i < rows2d.length; i++) {
      var row = rows2d[i];
      if (!row || row.length === 0) continue;
      var code = row[codeIdx] !== undefined ? String(row[codeIdx]).trim() : '';
      if (!code) continue;
      var desc = row[descIdx] !== undefined ? String(row[descIdx]).trim() : '';
      var dc = row[dcColIdx] !== undefined ? String(row[dcColIdx]).trim() : '';
      records.push({ id: U.uid('dct'), shippingPoint: code, shippingPointName: desc, dc: dc });
      if (dc) dcNames[dc] = true;
    }
    for (var name in dcNames) { if (dcNames.hasOwnProperty(name)) LNP.state.getOrCreateDc(name); }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ==================================================================
     6. Sales_Hierarchie_Table_.csv
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
        id: U.uid('sh'),
        districtCode: districtCode,
        district: str(r, mapping, 'district') || districtCode,
        code: code,
        unit: str(r, mapping, 'unit') || code
      });
    }
    return { records: records, warnings: warnings, aggregated: false };
  }

  /* ---------------- public entry points ---------------- */
  var FILE_TYPES = {
    forecast: { label: 'Forecast – Pallet Load', fields: FORECAST_FIELDS, parse: parseForecast, target: 'forecast' },
    history: { label: 'Sales History (aggregiert)', fields: HISTORY_FIELDS, parse: parseHistory, target: 'history' },
    destinations: { label: 'Destinations', fields: DESTINATION_FIELDS, parse: parseDestinations, target: 'destinations' },
    shipTo: { label: 'Ship-to-Address', fields: DESTINATION_FIELDS, parse: parseDestinations, target: 'destinations' },
    sku: { label: 'SKU View', fields: SKU_FIELDS, parse: parseSkuView, target: 'skus' },
    dcTranslation: { label: 'DC Translation Table', fields: null, positional: true, target: 'dcTranslation' },
    salesHierarchy: { label: 'Sales Hierarchie', fields: HIERARCHY_FIELDS, parse: parseSalesHierarchy, target: 'salesHierarchy' }
  };

  function headersFromRows(rows) {
    if (!rows.length) return [];
    var set = {}, out = [];
    for (var i = 0; i < Math.min(rows.length, 50); i++) {
      for (var k in rows[i]) { if (rows[i].hasOwnProperty(k) && !set[k]) { set[k] = true; out.push(k); } }
    }
    return out;
  }

  /* merges new destination rows into existing list, deduped by shipTo (filling gaps, latest wins) */
  function mergeDestinations(existing, incoming) {
    var byId = {};
    for (var i = 0; i < existing.length; i++) byId[existing[i].shipTo] = existing[i];
    for (var j = 0; j < incoming.length; j++) {
      var rec = incoming[j];
      var prev = byId[rec.shipTo];
      if (prev) {
        for (var k in rec) { if (rec[k] !== null && rec[k] !== undefined && rec[k] !== '') prev[k] = rec[k]; }
      } else {
        byId[rec.shipTo] = rec;
        existing.push(rec);
      }
    }
    return existing;
  }

  LNP.importer = {
    FILE_TYPES: FILE_TYPES,
    scorePair: scorePair, autoMapColumns: autoMapColumns, headersFromRows: headersFromRows,
    parseDcTranslationPositional: parseDcTranslationPositional,
    mergeDestinations: mergeDestinations
  };
})();
