/* =========================================================================
   data.js – Datei-Import (CSV/XLSX) mit Spalten-Mapping, Regionen,
             Zielreichweiten und Datenbestandsübersicht
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state, fmt = U.fmt;

  var pending = null;        // { rows, headers, filename, workbook, sheetNames, sheetName }
  var ui = { dataset: 'history', mode: 'append', level: 'auto' };

  /* ------------------------------------------------------------ Zielfelder */
  var FIELDS = [
    { key: 'customer', label: 'Kunde', type: 'text', syn: ['kunde', 'customer', 'kundenname', 'client', 'debitor', 'ship to', 'empfänger', 'empfaenger'] },
    { key: 'country', label: 'Land', type: 'text', syn: ['land', 'country', 'ländercode', 'laendercode', 'country code', 'nation'] },
    { key: 'region', label: 'Region', type: 'text', syn: ['region', 'gebiet', 'vertriebsgebiet', 'area', 'zone', 'bundesland', 'state', 'plz-gebiet', 'territory'] },
    { key: 'category', label: 'Produktkategorie', type: 'text', required: true, syn: ['kategorie', 'produktkategorie', 'category', 'warengruppe', 'artikelgruppe', 'produktgruppe', 'sortiment', 'product category', 'product group'] },
    { key: 'period', label: 'Periode / Datum', type: 'text', required: true, syn: ['periode', 'monat', 'datum', 'date', 'period', 'month', 'zeitraum', 'jahr', 'kalenderwoche', 'kw', 'buchungsdatum', 'lieferdatum'] },
    { key: 'qty', label: 'Menge (Stück)', type: 'num', syn: ['menge', 'stück', 'stueck', 'stk', 'quantity', 'qty', 'anzahl', 'units', 'absatz'] },
    { key: 'revenue', label: 'Umsatz (EUR)', type: 'num', syn: ['umsatz', 'revenue', 'eur', 'wert', 'value', 'sales', 'nettoumsatz', 'net sales', 'erlös'] },
    { key: 'volume', label: 'Transportvolumen (m³)', type: 'num', syn: ['volumen', 'volume', 'm3', 'm³', 'kubik', 'cbm'] },
    { key: 'pallets', label: 'Paletten', type: 'num', syn: ['paletten', 'pallets', 'pal', 'ladungsträger', 'lu'] },
    { key: 'palletEq', label: 'Paletten-Äquivalent', type: 'num', syn: ['paletten-äquivalent', 'palettenäquivalent', 'paletten aequivalent', 'pallet equivalent', 'pal-äq', 'palaeq', 'pallet eq'] },
    { key: 'lat', label: 'Breitengrad (optional)', type: 'num', syn: ['lat', 'latitude', 'breitengrad'] },
    { key: 'lng', label: 'Längengrad (optional)', type: 'num', syn: ['lng', 'lon', 'long', 'longitude', 'längengrad', 'laengengrad'] }
  ];

  /* ------------------------------------------------------------ Datei lesen */
  /**
   * Liest CSV/XLSX ein und liefert Zeilen als Objekte (Header = Schlüssel).
   * @param {File} file
   * @param {function(Error, {rows,headers,sheetNames,sheetName,workbook})} cb
   * @param {string} [sheetName]
   */
  function readFile(file, cb, sheetName) {
    var name = (file.name || '').toLowerCase();
    var isExcel = /\.(xlsx|xlsm|xlsb|xls)$/.test(name);

    if (isExcel) {
      if (typeof XLSX === 'undefined') { cb(new Error('Excel-Bibliothek nicht geladen')); return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
          var sheet = sheetName && wb.SheetNames.indexOf(sheetName) >= 0 ? sheetName : wb.SheetNames[0];
          var rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '', raw: true });
          cb(null, {
            rows: rows,
            headers: rows.length ? Object.keys(rows[0]) : [],
            sheetNames: wb.SheetNames,
            sheetName: sheet,
            workbook: wb
          });
        } catch (err) { cb(err); }
      };
      reader.onerror = function () { cb(new Error('Datei konnte nicht gelesen werden')); };
      reader.readAsArrayBuffer(file);
      return;
    }

    if (typeof Papa === 'undefined') { cb(new Error('CSV-Bibliothek nicht geladen')); return; }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      encoding: '',
      complete: function (res) {
        var rows = res.data.filter(function (r) {
          return Object.keys(r).some(function (k) { return String(r[k]).trim() !== ''; });
        });
        cb(null, {
          rows: rows,
          headers: res.meta.fields || (rows.length ? Object.keys(rows[0]) : []),
          sheetNames: null, sheetName: null, workbook: null
        });
      },
      error: function (err) { cb(err); }
    });
  }

  /* ------------------------------------------------------------ Mapping */
  function autoMap(headers) {
    return U.matchColumns(FIELDS, headers);
  }

  function renderMapping() {
    var grid = U.$('#mapping-grid');
    var map = pending.map;
    grid.innerHTML = FIELDS.map(function (f) {
      var opts = ['<option value="">' + U.t('– nicht zugeordnet –') + '</option>'].concat(
        pending.headers.map(function (h) {
          return '<option value="' + U.esc(h) + '"' + (map[f.key] === h ? ' selected' : '') + '>' + U.esc(h) + '</option>';
        })
      ).join('');
      return '<label class="map-field">' +
        '<span>' + U.esc(U.t(f.label)) + (f.required ? ' <i class="req">*</i>' : '') +
        (map[f.key] ? '<i class="auto">' + U.t('erkannt') + '</i>' : '') + '</span>' +
        '<select class="input input-sm" data-field="' + f.key + '">' + opts + '</select>' +
        '</label>';
    }).join('');

    grid.onchange = function (e) {
      var sel = e.target.closest('select[data-field]');
      if (!sel) return;
      pending.map[sel.getAttribute('data-field')] = sel.value || null;
      validateMapping();
    };
    validateMapping();
  }

  function validateMapping() {
    var warn = U.$('#mapping-warn');
    var problems = [];   // { text, blocking }
    var map = pending.map;

    FIELDS.filter(function (f) { return f.required; }).forEach(function (f) {
      if (!map[f.key]) problems.push({ blocking: true, text: U.tf('Pflichtfeld „{0}“ ist nicht zugeordnet.', U.t(f.label)) });
    });
    if (!map.qty && !map.pallets && !map.palletEq && !map.volume && !map.revenue) {
      problems.push({ blocking: true, text: U.t('Mindestens eine Kennzahl (Menge, Paletten, Paletten-Äquivalent, Volumen oder Umsatz) muss zugeordnet sein.') });
    }
    if (!map.region && !map.country && !map.customer) {
      problems.push({ blocking: true, text: U.t('Für die Distanzberechnung wird eine Regions-, Länder- oder Kundenspalte benötigt.') });
    }
    if (!map.pallets && !map.palletEq && !map.volume && map.qty) {
      problems.push({ blocking: false, text: U.tf('Hinweis: Paletten werden aus der Menge über „Stück je Palette“ ({0}) umgerechnet.', fmt.int(S.settings().qtyPerPallet)) });
    }

    var blocking = problems.filter(function (p) { return p.blocking; });
    warn.classList.toggle('hidden', problems.length === 0);
    warn.innerHTML = problems.map(function (p) { return '• ' + U.esc(p.text); }).join('<br>');
    U.$('#btn-confirm-import').disabled = blocking.length > 0;
  }

  function renderPreview() {
    var table = U.$('#table-preview');
    var rows = pending.rows.slice(0, 8);
    var cols = pending.headers.map(function (h) {
      return { label: h, render: function (r) { return U.esc(r[h]); } };
    });
    U.renderTable(table, cols, rows);
  }

  /* ------------------------------------------------------------ Transformation */
  function buildRecords() {
    var map = pending.map;
    var out = [];
    var badPeriods = 0;

    pending.rows.forEach(function (row) {
      var category = String(row[map.category] === undefined ? '' : row[map.category]).trim();
      if (!category) return;

      var periodRaw = row[map.period];
      var p = U.parsePeriod(periodRaw);
      if (!p) { badPeriods++; return; }

      var customer = map.customer ? String(row[map.customer] || '').trim() : '';
      var country = map.country ? String(row[map.country] || '').trim() : '';
      var region = map.region ? String(row[map.region] || '').trim() : '';
      var regionKey = region || country || customer || 'Ohne Region';

      var rec = {
        id: U.id('r'),
        dataset: ui.dataset,
        customer: customer,
        country: country,
        region: region,
        regionKey: regionKey,
        category: category,
        period: p.key,
        periodTs: p.ts,
        periodDays: p.days,
        qty: map.qty ? U.num(row[map.qty], 0) : 0,
        revenue: map.revenue ? U.num(row[map.revenue], 0) : 0,
        volume: map.volume ? U.num(row[map.volume], 0) : 0,
        pallets: map.pallets ? U.num(row[map.pallets], 0) : 0,
        palletEq: map.palletEq ? U.num(row[map.palletEq], 0) : 0,
        lat: map.lat ? U.parseNum(row[map.lat]) : NaN,
        lng: map.lng ? U.parseNum(row[map.lng]) : NaN
      };
      out.push(rec);
    });

    return { records: out, badPeriods: badPeriods };
  }

  /** Verdichtet Datensätze auf die Dimensionskombination (Kunde/Region/Kategorie/Periode). */
  function compact(records) {
    var map = Object.create(null);
    records.forEach(function (r) {
      var key = [r.dataset, r.customer, r.country, r.region, r.category, r.period].join('');
      var e = map[key];
      if (!e) {
        map[key] = Object.assign({}, r);
        return;
      }
      e.qty += r.qty; e.revenue += r.revenue; e.volume += r.volume;
      e.pallets += r.pallets; e.palletEq += r.palletEq;
      if (!U.isNum(e.lat) && U.isNum(r.lat)) { e.lat = r.lat; e.lng = r.lng; }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function confirmImport() {
    var built = buildRecords();
    var records = built.records;

    if (!records.length) {
      U.toast('Es konnten keine gültigen Datensätze erzeugt werden. Bitte Spaltenzuordnung prüfen.', 'error');
      return;
    }

    var before = records.length;
    var doCompact = ui.level === 'aggregated' ? false
      : (ui.level === 'transaction' ? true : before > 2000);
    if (doCompact) records = compact(records);

    S.addRecords(records, ui.dataset, ui.mode);
    S.syncRegions();
    S.emit('regions');

    var msg = U.tf('{0} Zeilen eingelesen', fmt.int(before));
    if (doCompact && records.length < before) msg += U.tf(', auf {0} Datensätze verdichtet', fmt.int(records.length));
    if (built.badPeriods) msg += U.tf(' – {0} Zeilen ohne lesbare Periode übersprungen', built.badPeriods);
    U.toast(msg + '.', built.badPeriods ? 'warn' : 'good');

    cancelImport();
    render();
  }

  function cancelImport() {
    pending = null;
    U.$('#card-mapping').classList.add('hidden');
    U.$('#sheet-picker').classList.add('hidden');
    U.$('#file-input').value = '';
  }

  function handleFile(file, sheetName) {
    readFile(file, function (err, res) {
      if (err) { U.toast(U.tf('Import fehlgeschlagen: {0}', err.message), 'error'); return; }
      if (!res.rows.length) { U.toast('Die Datei enthält keine Datenzeilen.', 'warn'); return; }

      pending = {
        rows: res.rows, headers: res.headers, filename: file.name,
        file: file, sheetNames: res.sheetNames, sheetName: res.sheetName,
        map: autoMap(res.headers)
      };

      var picker = U.$('#sheet-picker');
      if (res.sheetNames && res.sheetNames.length > 1) {
        picker.classList.remove('hidden');
        U.$('#sel-sheet').innerHTML = res.sheetNames.map(function (s) {
          return '<option value="' + U.esc(s) + '"' + (s === res.sheetName ? ' selected' : '') + '>' + U.esc(s) + '</option>';
        }).join('');
      } else {
        picker.classList.add('hidden');
      }

      U.$('#mapping-file').textContent = file.name +
        (res.sheetName ? ' · ' + res.sheetName : '') +
        ' · ' + U.tf('{0} Zeilen eingelesen', fmt.int(res.rows.length));
      U.$('#card-mapping').classList.remove('hidden');
      renderMapping();
      renderPreview();
      U.$('#card-mapping').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, sheetName);
  }

  /* ------------------------------------------------------------ Ansichten */
  function render() {
    renderSummary();
    renderDataTable();
    renderCoverage();
    renderRegions();
    syncConfigInputs();
  }

  function renderSummary() {
    var wrap = U.$('#data-summary');
    var st = S.get();
    var hist = S.recordsOf('history'), fc = S.recordsOf('forecast');
    var cats = S.categories('all'), regs = S.regionKeys('all'), pers = S.periods('all');
    var pal = U.sum(st.records, function (r) { return S.recordPallets(r); });

    var chips = [
      ['Historie', U.tf('{0} Datensätze', fmt.int(hist.length))],
      ['Forecast', U.tf('{0} Datensätze', fmt.int(fc.length))],
      ['Kategorien', fmt.int(cats.length)],
      ['Regionen', fmt.int(regs.length)],
      ['Perioden', fmt.int(pers.length) + (pers.length ? ' (' + pers[0] + ' – ' + pers[pers.length - 1] + ')' : '')],
      ['Volumen gesamt', U.tf('{0} Paletten', fmt.int(pal))]
    ];
    wrap.innerHTML = chips.map(function (c) {
      return '<span class="chip">' + U.esc(U.t(c[0])) + ' <b>' + U.esc(c[1]) + '</b></span>';
    }).join('');
  }

  function renderDataTable() {
    var filter = U.$('#data-filter-dataset').value;
    var recs = S.recordsOf(filter);
    var shown = recs.slice(0, 150);

    U.renderTable(U.$('#table-data'), [
      { label: 'Typ', render: function (r) { return '<span class="badge">' + U.t(r.dataset === 'forecast' ? 'Forecast' : 'Historie') + '</span>'; } },
      { label: 'Periode', render: function (r) { return U.esc(r.period); } },
      { label: 'Kategorie', render: function (r) { return U.esc(r.category); } },
      { label: 'Region', render: function (r) { return U.esc(r.regionKey); } },
      { label: 'Kunde', render: function (r) { return U.esc(r.customer || '–'); } },
      { label: 'Menge', num: true, render: function (r) { return fmt.int(r.qty); } },
      { label: 'Umsatz', num: true, render: function (r) { return fmt.eur(r.revenue); } },
      { label: 'Volumen m³', num: true, render: function (r) { return fmt.dec1(r.volume); } },
      { label: 'Paletten', num: true, render: function (r) { return fmt.dec1(S.recordPallets(r)); } }
    ], shown);

    U.$('#data-foot').textContent = recs.length > shown.length
      ? U.tf('Anzeige der ersten {0} von {1} Datensätzen.', shown.length, fmt.int(recs.length))
      : (recs.length ? U.tf('{0} Datensätze', fmt.int(recs.length)) : '');
  }

  function renderCoverage() {
    var cats = S.categories('all');
    var s = S.settings();
    var rows = cats.map(function (cat) {
      var recs = S.get().records.filter(function (r) { return r.category === cat; });
      var pallets = U.sum(recs, function (r) { return S.recordPallets(r); });
      var days = S.horizonDays(recs);
      var perDay = days > 0 ? pallets / days : 0;
      var td = S.targetDays(cat);
      return {
        __id: cat, category: cat, pallets: pallets, days: days,
        perDay: perDay, targetDays: td, stock: perDay * td * s.stockFactor
      };
    });

    U.renderTable(U.$('#table-coverage'), [
      { label: 'Produktkategorie', render: function (r) { return '<b>' + U.esc(r.category) + '</b>'; } },
      { label: 'Volumen (Paletten)', num: true, render: function (r) { return fmt.int(r.pallets); } },
      { label: 'Zeitraum (Tage)', num: true, render: function (r) { return fmt.dec1(r.days); } },
      { label: 'Bedarf je Tag', num: true, render: function (r) { return fmt.dec1(r.perDay); } },
      {
        label: 'Zielreichweite (Tage)', num: true, render: function (r) {
          return '<input type="number" min="1" step="1" class="input input-sm pct-input" data-cat="' +
            U.esc(r.category) + '" value="' + r.targetDays + '">';
        }
      },
      { label: 'Ziel-Bestand (Stellplätze)', num: true, render: function (r) { return '<b>' + fmt.int(r.stock) + '</b>'; } }
    ], rows);

    U.$('#table-coverage').onchange = function (e) {
      var input = e.target.closest('input[data-cat]');
      if (!input) return;
      var v = U.num(input.value, 0);
      if (v <= 0) { U.toast('Die Zielreichweite muss größer als 0 sein.', 'warn'); return; }
      S.setTargetDays(input.getAttribute('data-cat'), v);
      renderCoverage();
    };
  }

  function renderRegions() {
    var st = S.get();
    S.syncRegions();
    var keys = Object.keys(st.regions).sort();

    var stats = Object.create(null);
    st.records.forEach(function (r) {
      var e = stats[r.regionKey] || (stats[r.regionKey] = { n: 0, pallets: 0 });
      e.n++; e.pallets += S.recordPallets(r);
    });

    var rows = keys.map(function (k) {
      var info = st.regions[k];
      return {
        __id: k, key: k, country: info.country || '',
        lat: info.lat, lng: info.lng, source: info.source || 'offen',
        n: (stats[k] || {}).n || 0, pallets: (stats[k] || {}).pallets || 0
      };
    }).sort(function (a, b) { return b.pallets - a.pallets; });

    U.renderTable(U.$('#table-regions'), [
      { label: 'Region / Land', render: function (r) { return '<b>' + U.esc(r.key) + '</b>'; } },
      { label: 'Land', render: function (r) { return U.esc(r.country || '–'); } },
      { label: 'Datensätze', num: true, render: function (r) { return fmt.int(r.n); } },
      { label: 'Paletten', num: true, render: function (r) { return fmt.int(r.pallets); } },
      {
        label: 'Breitengrad', num: true, render: function (r) {
          return '<input type="number" step="0.0001" class="input input-sm pct-input" data-region="' +
            U.esc(r.key) + '" data-axis="lat" value="' + (U.isNum(r.lat) ? r.lat : '') + '">';
        }
      },
      {
        label: 'Längengrad', num: true, render: function (r) {
          return '<input type="number" step="0.0001" class="input input-sm pct-input" data-region="' +
            U.esc(r.key) + '" data-axis="lng" value="' + (U.isNum(r.lng) ? r.lng : '') + '">';
        }
      },
      {
        label: 'Quelle', render: function (r) {
          if (!U.isNum(r.lat) || !U.isNum(r.lng)) return '<span class="badge badge-warn">' + U.t('Koordinaten fehlen') + '</span>';
          return '<span class="badge">' + U.esc(U.t(r.source)) + '</span>';
        }
      }
    ], rows);

    U.$('#table-regions').onchange = function (e) {
      var input = e.target.closest('input[data-region]');
      if (!input) return;
      var key = input.getAttribute('data-region');
      var axis = input.getAttribute('data-axis');
      var patch = { source: 'manuell' };
      patch[axis] = input.value === '' ? null : U.num(input.value);
      S.setRegion(key, patch);
    };
  }

  function autofillCoords() {
    var st = S.get();
    var filled = 0, open = 0;
    Object.keys(st.regions).forEach(function (k) {
      var info = st.regions[k];
      if (U.isNum(info.lat) && U.isNum(info.lng)) return;
      var g = NS.geo.lookup(k, info.country);
      if (g) { info.lat = g.lat; info.lng = g.lng; info.source = 'automatisch'; filled++; }
      else open++;
    });
    S.emit('regions');
    renderRegions();
    U.toast(U.tf('{0} Regionen automatisch ergänzt', filled) + (open ? U.tf(', {0} weiterhin offen', open) : '') + '.', open ? 'warn' : 'good');
  }

  function syncConfigInputs() {
    var s = S.settings();
    setIfIdle('#cfg-qtyPerPallet', s.qtyPerPallet);
    setIfIdle('#cfg-volPerPallet', s.volPerPallet);
    setIfIdle('#cfg-horizon', s.horizonDaysOverride === null ? '' : s.horizonDaysOverride);
    setIfIdle('#cfg-stockFactor', s.stockFactor);
    setIfIdle('#cfg-targetDays', s.targetDaysGlobal);
  }

  function setIfIdle(sel, value) {
    var node = U.$(sel);
    if (node && document.activeElement !== node) node.value = value;
  }

  /* ------------------------------------------------------------ Events */
  function initSegments() {
    [['#seg-dataset', 'dataset'], ['#seg-mode', 'mode'], ['#seg-level', 'level']].forEach(function (pair) {
      var wrap = U.$(pair[0]);
      wrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.seg-btn');
        if (!btn) return;
        U.$$('.seg-btn', wrap).forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        ui[pair[1]] = btn.getAttribute('data-value');
      });
    });
  }

  function init() {
    initSegments();

    var dz = U.$('#dropzone');
    U.$('#btn-browse').addEventListener('click', function () { U.$('#file-input').click(); });
    dz.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      U.$('#file-input').click();
    });
    U.$('#file-input').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); });
    });
    dz.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });

    U.$('#sel-sheet').addEventListener('change', function () {
      if (pending && pending.file) handleFile(pending.file, this.value);
    });

    U.$('#btn-confirm-import').addEventListener('click', confirmImport);
    U.$('#btn-cancel-import').addEventListener('click', cancelImport);

    U.$('#btn-clear-data').addEventListener('click', function () {
      var filter = U.$('#data-filter-dataset').value;
      var label = U.t(filter === 'history' ? 'der Historie' : (filter === 'forecast' ? 'des Forecasts' : 'aller Datenbestände'));
      if (!window.confirm(U.tf('Datensätze {0} wirklich löschen?', label))) return;
      S.clearRecords(filter);
      render();
      U.toast('Datensätze gelöscht.', 'warn');
    });

    U.$('#data-filter-dataset').addEventListener('change', renderDataTable);
    U.$('#btn-autofill-coords').addEventListener('click', autofillCoords);

    U.$('#btn-apply-target-all').addEventListener('click', function () {
      var v = U.num(U.$('#cfg-targetDays').value, 0);
      if (v <= 0) { U.toast('Bitte eine Zielreichweite größer 0 angeben.', 'warn'); return; }
      var st = S.get();
      st.settings.targetDaysGlobal = v;
      S.categories('all').forEach(function (c) { st.settings.targetDaysByCategory[c] = v; });
      S.emit('settings');
      renderCoverage();
      U.toast(U.tf('Zielreichweite von {0} Tagen auf alle Kategorien angewendet.', v), 'good');
    });

    S.onChange(function (reason) {
      if (reason === 'records' || reason === 'reset' || reason === 'project' || reason === 'settings') render();
    });
  }

  NS.data = {
    init: init, render: render, readFile: readFile, FIELDS: FIELDS,
    autoMap: autoMap, renderRegions: renderRegions, renderCoverage: renderCoverage
  };
})(window.LNP);
