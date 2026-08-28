/* NetPlan+ views/data.js — "Daten &amp; Import": 7 dedicated upload slots with column-mapping
   review, quantity logic / coverage settings, region coordinates, and data-on-file overview. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, I = LNP.i18n;

  var SLOTS = [
    { key: 'forecast', title: 'Forecast – Pallet Load', file: 'Forecast_-_Pallet_Load_.csv', importerKey: 'forecast', target: 'forecast' },
    { key: 'history', title: 'Sales History (aggregiert)', file: 'Sales_History_Data_aggregated.csv', importerKey: 'history', target: 'history' },
    { key: 'destinations', title: 'Destinations', file: 'Destinations_.csv', importerKey: 'destinations', target: 'destinations', merge: true },
    { key: 'shipTo', title: 'Ship-to-Address', file: 'Ship-to-adress.csv', importerKey: 'shipTo', target: 'destinations', merge: true },
    { key: 'sku', title: 'SKU View', file: 'SKU_View.csv', importerKey: 'sku', target: 'skus' },
    { key: 'dcTranslation', title: 'DC Translation Table', file: 'DC_Translation_Table_.csv', target: 'dcTranslation', positional: true },
    { key: 'salesHierarchy', title: 'Sales Hierarchie', file: 'Sales_Hierarchie_Table_.csv', importerKey: 'salesHierarchy', target: 'salesHierarchy' }
  ];

  function fileCardHtml(slot) {
    var status = LNP.state.fileStatus[slot.key];
    if (!status) {
      return '<div class="filecard" data-slot="' + slot.key + '">' +
        '<div class="filecard-ic">' + slot.title.slice(0, 2).toUpperCase() + '</div>' +
        '<div class="filecard-body">' +
        '<div class="filecard-name">' + U.escapeHtml(slot.title) + '</div>' +
        '<div class="filecard-meta mono">' + U.escapeHtml(slot.file) + ' &middot; <span data-t="Noch keine Datei geladen">' + I.t('Noch keine Datei geladen') + '</span></div>' +
        '</div>' +
        '<button class="btn btn-sm js-pick" data-slot="' + slot.key + '" data-t="Datei wählen">' + I.t('Datei wählen') + '</button>' +
        '<input type="file" class="js-file-input" data-slot="' + slot.key + '" accept=".csv,.xlsx,.xls,.xlsm" hidden>' +
        '</div>';
    }
    var warnCount = status.warnings || 0;
    return '<div class="filecard loaded" data-slot="' + slot.key + '">' +
      '<div class="filecard-ic">&#10003;</div>' +
      '<div class="filecard-body">' +
      '<div class="filecard-name">' + U.escapeHtml(slot.title) + '</div>' +
      '<div class="filecard-meta">' + I.fmtInt(status.accepted) + ' ' + I.t('Zeilen übernommen') +
      (status.rows && status.rows !== status.accepted ? ' (' + I.fmtInt(status.rows) + ' ' + I.t('Zeilen erkannt') + ')' : '') +
      (warnCount ? ' &middot; <span class="badge badge-warn">' + warnCount + ' ' + I.t('Warnungen') + '</span>' : '') +
      (status.aggregated ? ' &middot; <span class="badge badge-info">verdichtet</span>' : '') +
      '</div></div>' +
      '<div class="row-actions">' +
      '<button class="btn btn-sm js-pick" data-slot="' + slot.key + '" data-t="Neu laden">' + I.t('Neu laden') + '</button>' +
      '<button class="btn btn-sm btn-danger js-remove" data-slot="' + slot.key + '" data-t="Datensatz entfernen">' + I.t('Datensatz entfernen') + '</button>' +
      '</div>' +
      '<input type="file" class="js-file-input" data-slot="' + slot.key + '" accept=".csv,.xlsx,.xls,.xlsm" hidden>' +
      '</div>';
  }

  function scoreClass(score) {
    if (score >= 90) return 'badge-good';
    if (score >= 60) return 'badge-info';
    if (score > 0) return 'badge-warn';
    return 'badge-bad';
  }

  function openMappingModal(slot, headers, rows) {
    var ft = LNP.importer.FILE_TYPES[slot.importerKey];
    var auto = LNP.importer.autoMapColumns(headers, ft.fields);
    var rowsHtml = ft.fields.map(function (f) {
      var current = auto.mapping[f.key];
      var options = '<option value="">—</option>' + headers.map(function (h) {
        return '<option value="' + U.escapeHtml(h) + '"' + (current && current.column === h ? ' selected' : '') + '>' + U.escapeHtml(h) + '</option>';
      }).join('');
      return '<div class="map-row">' +
        '<div class="map-field-name' + (f.required ? ' required' : '') + '">' + U.escapeHtml(I.t(f.label)) + '</div>' +
        '<select class="js-map-select" data-field="' + f.key + '">' + options + '</select>' +
        '<div>' + (current ? '<span class="badge ' + scoreClass(current.score) + '">' + Math.round(current.score) + '%</span>' : '<span class="badge badge-bad">–</span>') + '</div>' +
        '</div>';
    }).join('');

    var isForecast = slot.key === 'forecast';
    var periodCol = auto.mapping.period ? auto.mapping.period.column : '';
    var guessedType = /month|monat/i.test(periodCol) ? 'month' : 'week';
    var periodTypeHtml = isForecast ?
      '<div class="field" style="margin-top:10px;"><label>Periodenformat der gewählten Spalte</label>' +
      '<select id="mapPeriodType">' +
      '<option value="week"' + (guessedType === 'week' ? ' selected' : '') + '>Kalenderwoche (z.B. 202601)</option>' +
      '<option value="month"' + (guessedType === 'month' ? ' selected' : '') + '>Monat (z.B. 2026-01 oder 202601)</option>' +
      '</select>' +
      '<div class="help">Wochenangaben werden für die Darstellung automatisch zum enthaltenden Kalendermonat zusammengefasst.</div></div>' : '';

    var body = '<p class="help">' + I.tf('{0} {1}', rows.length, I.t('Zeilen erkannt')) + '</p>' +
      '<div class="map-row" style="border-bottom:2px solid var(--border);font-weight:700;font-size:11px;color:var(--text-faint);text-transform:uppercase;">' +
      '<div data-t="Feld">' + I.t('Feld') + '</div><div data-t="Spalte in Datei">' + I.t('Spalte in Datei') + '</div><div data-t="Konfidenz">' + I.t('Konfidenz') + '</div></div>' +
      rowsHtml + periodTypeHtml + '<div id="mappingWarning" class="note-box warn" style="display:none;margin-top:12px;"></div>';

    var modal = LNP.ui.openModal(U.escapeHtml(I.t(slot.title)), body, {
      maxWidth: '640px',
      footerHtml: '<button class="btn" id="mapCancel" data-t="Abbrechen">' + I.t('Abbrechen') + '</button>' +
        '<button class="btn btn-primary" id="mapConfirm" data-t="Importieren">' + I.t('Importieren') + '</button>',
      onMount: function (r) {
        r.querySelector('#mapCancel').addEventListener('click', LNP.ui.closeModal);
        r.querySelector('#mapConfirm').addEventListener('click', function () {
          var mapping = {};
          var selects = r.querySelectorAll('.js-map-select');
          for (var i = 0; i < selects.length; i++) {
            var col = selects[i].value;
            if (col) mapping[selects[i].getAttribute('data-field')] = { column: col, score: 100 };
          }
          var missing = ft.fields.filter(function (f) { return f.required && !mapping[f.key]; });
          if (missing.length) {
            var w = r.querySelector('#mappingWarning');
            w.style.display = 'block';
            w.textContent = I.t('Pflichtfeld fehlt') + ': ' + missing.map(function (f) { return I.t(f.label); }).join(', ');
            return;
          }
          var periodTypeSel = r.querySelector('#mapPeriodType');
          var result = ft.parse(rows, mapping, periodTypeSel ? periodTypeSel.value : undefined);
          commitImport(slot, result, rows.length);
          LNP.ui.closeModal();
        });
      }
    });
    return modal;
  }

  function commitImport(slot, result, rawCount) {
    var status = {
      rows: rawCount, accepted: result.records.length, warnings: result.warnings.length,
      loadedAt: Date.now(), aggregated: result.aggregated, originalCount: result.originalCount
    };
    if (slot.merge) LNP.state.mergeDestinations(result.records, slot.key, status);
    else LNP.state.setDataset(slot.target, result.records, status);
    LNP.state.emit('dcs');
    LNP.ui.toast(I.tf('{0}: {1} {2}', I.t(slot.title), I.fmtInt(result.records.length), I.t('Zeilen übernommen')), 'good');
    if (result.warnings.length) {
      LNP.ui.toast(result.warnings.slice(0, 3).join(' / ') + (result.warnings.length > 3 ? ' …' : ''), 'bad');
    }
  }

  function openPositionalModal(slot, rows2d) {
    var result = LNP.importer.parseDcTranslationPositional(rows2d);
    var preview = rows2d.slice(0, 6).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + U.escapeHtml(c) + '</td>'; }).join('') + '</tr>'; }).join('');
    var body = '<p class="help">' + I.tf('{0} {1}', result.records.length, I.t('Zeilen übernommen')) + '</p>' +
      '<div class="note-box">Diese Datei enthält zwei Spalten mit dem Namen &bdquo;V&amp;B/ISI Shipping point&ldquo; (Code, dann Beschreibung) — die Zuordnung erfolgt daher positionsbasiert (Spalte 1 = Code, Spalte 2 = Beschreibung, Spalte mit Kopfzeile &bdquo;DC&ldquo; = Distributionszentrum).</div>' +
      '<div class="table-wrap"><table class="tbl">' + preview + '</table></div>';
    LNP.ui.openModal(U.escapeHtml(I.t(slot.title)), body, {
      maxWidth: '600px',
      footerHtml: '<button class="btn" id="posCancel" data-t="Abbrechen">' + I.t('Abbrechen') + '</button>' +
        '<button class="btn btn-primary" id="posConfirm" data-t="Importieren">' + I.t('Importieren') + '</button>',
      onMount: function (r) {
        r.querySelector('#posCancel').addEventListener('click', LNP.ui.closeModal);
        r.querySelector('#posConfirm').addEventListener('click', function () {
          commitImport(slot, result, rows2d.length - 1);
          LNP.ui.closeModal();
        });
      }
    });
  }

  function handleFile(slot, file) {
    if (slot.positional) {
      U.readWorkbookFileRaw(file, function (err, rows2d) {
        if (err) { LNP.ui.toast('Fehler beim Lesen: ' + err.message, 'bad'); return; }
        openPositionalModal(slot, rows2d);
      });
    } else {
      U.readWorkbookFile(file, function (err, res) {
        if (err) { LNP.ui.toast('Fehler beim Lesen: ' + err.message, 'bad'); return; }
        var headers = LNP.importer.headersFromRows(res.rows);
        openMappingModal(slot, headers, res.rows);
      });
    }
  }

  function coverageSection() {
    var settings = LNP.state.settings;
    var cats = LNP.sim.allCategories();
    var catRows = cats.map(function (c) {
      var v = U.isNum(settings.coverageWeeksByCategory[c]) ? settings.coverageWeeksByCategory[c] : '';
      return '<tr><td>' + U.escapeHtml(c) + '</td><td><input type="number" min="0" step="0.5" class="js-cat-coverage" data-cat="' + U.escapeHtml(c) + '" value="' + v + '" placeholder="' + I.fmtNum(settings.coverageWeeksGlobal, 1) + '"></td></tr>';
    }).join('');
    return '<div class="card">' +
      '<h2 data-t="Mengenlogik">' + I.t('Mengenlogik') + '</h2>' +
      '<div class="field-row">' +
      '<div class="field"><label data-t="Globale Ziel-Reichweite (Wochen)">' + I.t('Globale Ziel-Reichweite (Wochen)') + '</label>' +
      '<input type="number" min="0" step="0.5" id="setCoverageGlobal" value="' + settings.coverageWeeksGlobal + '"></div>' +
      '<div class="field"><label data-t="Sicherheitsaufschlag">' + I.t('Sicherheitsaufschlag') + '</label>' +
      '<input type="number" min="0" step="0.05" id="setStockFactor" value="' + settings.stockFactor + '"></div>' +
      '<div class="field"><label>SKUs je Picking Bin</label><input type="number" min="1" step="1" id="setSkusPerBin" value="' + settings.skusPerBin + '"></div>' +
      '</div>' +
      (cats.length ? '<h3 data-t="Ziel-Reichweite je Kategorie">' + I.t('Ziel-Reichweite je Kategorie') + '</h3>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Kategorie">' + I.t('Kategorie') + '</th><th style="width:140px">Wochen</th></tr></thead><tbody>' + catRows + '</tbody></table></div>' : '') +
      '</div>';
  }

  function regionsSection() {
    var districts = LNP.sim.allDistricts();
    if (!districts.length) return '';
    var overrides = LNP.state.settings.districtCoordOverrides || {};
    var rows = districts.map(function (d) {
      var c = LNP.sim.districtCentroid(d.district);
      var ov = overrides[d.district];
      return '<tr>' +
        '<td>' + U.escapeHtml(d.name) + '</td>' +
        '<td><input type="number" step="0.01" class="js-region-lat" data-district="' + U.escapeHtml(d.district) + '" value="' + (ov ? ov.lat : (c ? c.lat.toFixed(2) : '')) + '"></td>' +
        '<td><input type="number" step="0.01" class="js-region-lng" data-district="' + U.escapeHtml(d.district) + '" value="' + (ov ? ov.lng : (c ? c.lng.toFixed(2) : '')) + '"></td>' +
        '<td>' + (c ? '<span class="badge badge-info">' + I.t(c.source) + '</span>' : '<span class="badge badge-bad">' + I.t('offen') + '</span>') + '</td>' +
        '</tr>';
    }).join('');
    return '<div class="card"><h2>' + I.t('Region') + ' &ndash; ' + I.t('Koordinaten') + '</h2>' +
      '<p class="help">Automatisch aus den Ship-to-Adressen (Stadt/Land) ermittelt; bei Bedarf manuell überschreibbar.</p>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Region">' + I.t('Region') + '</th><th>' + I.t('Breitengrad') + '</th><th>' + I.t('Längengrad') + '</th><th data-t="Quelle">' + I.t('Quelle') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function dataStatusSection() {
    var d = LNP.state.data;
    var rows = [
      ['Forecast', d.forecast.length], ['Sales History', d.history.length], ['Destinations / Ship-to', d.destinations.length],
      ['SKU View', d.skus.length], ['DC Translation', d.dcTranslation.length], ['Sales Hierarchie', d.salesHierarchy.length],
      [I.t('Distributionszentren'), d.dcs.length]
    ];
    var body = rows.map(function (r) { return '<tr><td>' + U.escapeHtml(r[0]) + '</td><td class="num">' + I.fmtInt(r[1]) + '</td></tr>'; }).join('');
    return '<div class="card"><div class="card-head"><h2 data-t="Datenbestand">' + I.t('Datenbestand') + '</h2>' +
      '<div class="actions"><button class="btn btn-danger btn-sm" id="resetAllBtn" data-t="Alle Daten zurücksetzen">' + I.t('Alle Daten zurücksetzen') + '</button></div></div>' +
      '<div class="table-wrap"><table class="tbl"><tbody>' + body + '</tbody></table></div></div>';
  }

  function render(container) {
    var cards = SLOTS.map(fileCardHtml).join('');
    container.innerHTML =
      '<div class="card"><h2 data-t="Datenquellen">' + I.t('Datenquellen') + '</h2>' + cards + '</div>' +
      coverageSection() + regionsSection() + dataStatusSection();

    container.querySelectorAll('.js-pick').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = container.querySelector('.js-file-input[data-slot="' + btn.getAttribute('data-slot') + '"]');
        if (input) input.click();
      });
    });
    container.querySelectorAll('.js-file-input').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.files || !input.files[0]) return;
        var slot = SLOTS.filter(function (s) { return s.key === input.getAttribute('data-slot'); })[0];
        handleFile(slot, input.files[0]);
        input.value = '';
      });
    });
    container.querySelectorAll('.js-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slotKey = btn.getAttribute('data-slot');
        var slot = SLOTS.filter(function (s) { return s.key === slotKey; })[0];
        if (!slot.merge) LNP.state.clearDataset(slot.target);
        else { delete LNP.state.fileStatus[slot.key]; LNP.state.emit('fileStatus'); }
      });
    });
    var coverageGlobal = container.querySelector('#setCoverageGlobal');
    if (coverageGlobal) coverageGlobal.addEventListener('change', function () { LNP.state.updateSettings({ coverageWeeksGlobal: parseFloat(coverageGlobal.value) || 0 }); });
    var stockFactor = container.querySelector('#setStockFactor');
    if (stockFactor) stockFactor.addEventListener('change', function () { LNP.state.updateSettings({ stockFactor: parseFloat(stockFactor.value) || 0 }); });
    var skusPerBin = container.querySelector('#setSkusPerBin');
    if (skusPerBin) skusPerBin.addEventListener('change', function () { LNP.state.updateSettings({ skusPerBin: parseFloat(skusPerBin.value) || 1 }); });
    container.querySelectorAll('.js-cat-coverage').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var map = Object.assign({}, LNP.state.settings.coverageWeeksByCategory);
        if (inp.value === '') delete map[inp.getAttribute('data-cat')]; else map[inp.getAttribute('data-cat')] = parseFloat(inp.value);
        LNP.state.updateSettings({ coverageWeeksByCategory: map });
      });
    });
    function bindRegionInput(sel, axis) {
      container.querySelectorAll(sel).forEach(function (inp) {
        inp.addEventListener('change', function () {
          var district = inp.getAttribute('data-district');
          var overrides = Object.assign({}, LNP.state.settings.districtCoordOverrides);
          var lat = container.querySelector('.js-region-lat[data-district="' + district + '"]').value;
          var lng = container.querySelector('.js-region-lng[data-district="' + district + '"]').value;
          if (lat === '' || lng === '') delete overrides[district];
          else overrides[district] = { lat: parseFloat(lat), lng: parseFloat(lng) };
          LNP.state.updateSettings({ districtCoordOverrides: overrides });
          LNP.sim.invalidateCaches();
        });
      });
    }
    bindRegionInput('.js-region-lat', 'lat'); bindRegionInput('.js-region-lng', 'lng');

    var resetBtn = container.querySelector('#resetAllBtn');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      LNP.ui.confirmDialog(I.t('Alle Daten zurücksetzen'), 'Alle importierten Daten, Distributionszentren, Szenarien und Einstellungen werden gelöscht.', function () {
        LNP.state.resetAll();
      });
    });
  }

  LNP.viewData = { render: render, SLOTS: SLOTS };
})();
