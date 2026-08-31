/* NetPlan+ views/exportProject.js — "Export &amp; Projekt": Excel/CSV/PDF export, project file
   save/load, branding, cost parameters, formula reference (spec §9/§10/§12). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, I = LNP.i18n;

  function addSheet(wb, name, rows) {
    var ws = window.XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = (rows[0] || []).map(function () { return { wch: 18 }; });
    window.XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }

  function buildWorkbook() {
    var wb = window.XLSX.utils.book_new();
    var settings = LNP.state.settings;
    var net = LNP.sim.computeScenarioNetwork(null, { category: 'all', settings: settings });

    addSheet(wb, 'KPI', [
      ['Kennzahl', 'Wert'],
      ['Prognose Paletten (Gesamt)', Math.round(net.totalPallets)],
      ['Prognose ESU (Gesamt)', Math.round(net.totalQty)],
      ['Aktive DCs', net.perDc.length],
      ['SKUs', LNP.state.data.skus.length],
      ['Ship-to-Kunden', LNP.state.data.destinations.length],
      ['Ziel-Reichweite (Monate)', settings.coverageMonthsGlobal]
    ]);

    var dcRows = [['Name', 'Code', 'Land', 'Kapazität', 'Belegt (Basis)', 'Aktiv', 'Lat', 'Lng']];
    LNP.state.data.dcs.forEach(function (dc) { dcRows.push([dc.name, dc.code, dc.country || '', dc.capacity, dc.usedSlots, dc.active !== false ? 'Ja' : 'Nein', dc.lat, dc.lng]); });
    addSheet(wb, 'DCs', dcRows);

    var assignRows = [['Kategorie', 'Modus', 'Ziel-Reichweite (Tage)', 'DC', 'Anteil %', 'Paletten', 'Slots', 'Score']];
    Object.keys(LNP.state.assignments).forEach(function (cat) {
      var a = LNP.state.assignments[cat];
      (a.parts || []).forEach(function (p) { assignRows.push([cat, a.mode, a.targetDays, p.dcName, Math.round(p.share * 100), Math.round(p.pallets), Math.round(p.slots), Math.round(p.score)]); });
    });
    addSheet(wb, 'Zuordnungen', assignRows.length > 1 ? assignRows : [['Keine Simulation übernommen']]);

    var detailRows = [['DC', 'Paletten', 'ESU', 'Storage PAL', 'Kapazität', 'Auslastung %', 'SKU', 'Picking Bins']];
    net.perDc.forEach(function (d) { detailRows.push([d.dcName, Math.round(d.pallets), Math.round(d.qty), Math.round(d.storageDemandPallets), d.capacity, d.utilization !== null ? Math.round(d.utilization * 100) : '', d.skuCount, d.pickingBins]); });
    addSheet(wb, 'Detailergebnisse', detailRows);

    var regionRows = [['DC', 'Distrikt', 'Anteil % (aus Sales History)']];
    var shares = LNP.sim.dcDistrictShares();
    Object.keys(shares).forEach(function (dcIdKey) {
      var dc = LNP.sim.dcById(dcIdKey);
      Object.keys(shares[dcIdKey].shares).forEach(function (district) {
        regionRows.push([dc ? dc.name : dcIdKey, district, Math.round(shares[dcIdKey].shares[district] * 10000) / 100]);
      });
    });
    addSheet(wb, 'Regionszuordnung', regionRows);

    var targetRows = [['Kategorie/Global', 'Monate'], ['Global', settings.coverageMonthsGlobal]];
    Object.keys(settings.coverageMonthsByCategory).forEach(function (cat) { targetRows.push([cat, settings.coverageMonthsByCategory[cat]]); });
    addSheet(wb, 'Zielreichweiten', targetRows);

    var regionCoordRows = [['Distrikt', 'Lat', 'Lng', 'Quelle']];
    LNP.sim.allDistricts().forEach(function (d) {
      var c = LNP.sim.districtCentroid(d.district);
      regionCoordRows.push([d.name, c ? c.lat : '', c ? c.lng : '', c ? c.source : 'offen']);
    });
    addSheet(wb, 'Regionen', regionCoordRows);

    var scenarioRows = [['Name', 'Erstellt', 'Standorte', 'Gesamt-Paletten', 'Storage PAL']];
    LNP.state.scenarios.forEach(function (s) {
      var n = LNP.sim.computeScenarioNetwork(s, { category: 'all', settings: settings });
      scenarioRows.push([s.name, new Date(s.createdAt).toISOString().slice(0, 10), n.perDc.length, Math.round(n.totalPallets), Math.round(U.sum(n.perDc, function (d) { return d.storageDemandPallets; }))]);
    });
    addSheet(wb, 'Szenarien', scenarioRows.length > 1 ? scenarioRows : [['Keine Szenarien gespeichert']]);

    var rawRows = [['DC', 'Artikel', 'Kategorie', 'Periode', 'Menge ESU', 'Paletten']];
    LNP.state.data.forecast.slice(0, 50000).forEach(function (r) { rawRows.push([r.dc, r.article, r.category, r.periodKey, r.qty, r.pallets]); });
    addSheet(wb, 'Rohdaten', rawRows);

    return wb;
  }

  function exportExcel() {
    if (!window.XLSX) { LNP.ui.toast(I.t('Excel-Bibliothek nicht verfügbar.'), 'bad'); return; }
    window.XLSX.writeFile(buildWorkbook(), 'netplan-export-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }

  function fmtDe(n) { return U.isNum(n) ? (Math.round(n * 100) / 100).toString().replace('.', ',') : ''; }

  function exportCsv() {
    var settings = LNP.state.settings;
    var net = LNP.sim.computeScenarioNetwork(null, { category: 'all', settings: settings });
    var header = ['DC', 'Paletten', 'ESU', 'Storage PAL', 'Kapazität', 'Auslastung %', 'SKU', 'Picking Bins'];
    var lines = [header.join(';')];
    net.perDc.forEach(function (d) {
      lines.push([d.dcName, fmtDe(d.pallets), fmtDe(d.qty), fmtDe(d.storageDemandPallets), fmtDe(d.capacity),
        d.utilization !== null ? fmtDe(d.utilization * 100) : '', fmtDe(d.skuCount), fmtDe(d.pickingBins)].join(';'));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    U.downloadBlob(blob, 'netplan-dc-export-' + new Date().toISOString().slice(0, 10) + '.csv');
  }

  function buildPrintHtml() {
    var settings = LNP.state.settings;
    var net = LNP.sim.computeScenarioNetwork(null, { category: 'all', settings: settings });
    var branding = settings.branding || {};
    var rows = net.perDc.map(function (d) {
      return '<tr><td>' + U.escapeHtml(d.dcName) + '</td><td>' + I.fmtInt(d.pallets) + '</td><td>' + I.fmtInt(d.storageDemandPallets) + '</td>' +
        '<td>' + I.fmtInt(d.capacity) + '</td><td>' + (d.utilization !== null ? I.fmtPct(d.utilization, 0) : '–') + '</td><td>' + I.fmtInt(d.skuCount) + '</td></tr>';
    }).join('');
    return '<h1>' + U.escapeHtml(branding.appName || 'NetPlan+') + ' &ndash; Netzwerk-Bericht</h1>' +
      '<p>Erstellt: ' + I.fmtDate(new Date()) + ' &middot; Ziel-Reichweite: ' + I.fmtNum(settings.coverageMonthsGlobal, 1) + ' Monate &middot; Gesamt: ' + I.fmtInt(net.totalPallets) + ' PAL</p>' +
      '<h2>Kennzahlen je Distributionszentrum (Basis)</h2>' +
      '<table border="1" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:12px;">' +
      '<thead><tr><th>DC</th><th>Paletten</th><th>Storage PAL</th><th>Kapazität</th><th>Auslastung</th><th>SKU</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function printReport() {
    var el = document.getElementById('printArea');
    if (el) el.innerHTML = buildPrintHtml();
    window.print();
  }

  function brandingSection() {
    var b = LNP.state.settings.branding;
    return '<div class="card"><h2 data-t="Erscheinungsbild">' + I.t('Erscheinungsbild') + '</h2>' +
      '<div class="field-row">' +
      '<div class="field"><label data-t="App-Name">' + I.t('App-Name') + '</label><input type="text" id="brAppName" value="' + U.escapeHtml(b.appName || '') + '"></div>' +
      '<div class="field"><label data-t="Kürzel">' + I.t('Kürzel') + '</label><input type="text" id="brInitials" maxlength="3" value="' + U.escapeHtml(b.initials || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label data-t="Untertitel">' + I.t('Untertitel') + '</label><input type="text" id="brSubtitle" value="' + U.escapeHtml(b.appSubtitle || '') + '" placeholder="' + I.t('Logistiknetzwerk-Analyse') + '"></div>' +
      '<div class="field"><label data-t="Logo (max. 300 kB)">' + I.t('Logo (max. 300 kB)') + '</label><input type="file" id="brLogo" accept="image/*"></div>' +
      (b.logo ? '<div class="field"><img src="' + b.logo + '" style="max-height:48px;border-radius:6px;"> <button class="btn btn-sm btn-danger" id="brLogoRemove">' + I.t('Löschen') + '</button></div>' : '') +
      '</div>';
  }

  function costParamsSection() {
    var s = LNP.state.settings;
    function row(id, label, value, step) {
      return '<div class="field"><label>' + U.escapeHtml(label) + '</label><input type="number" step="' + (step || '0.01') + '" id="' + id + '" value="' + value + '"></div>';
    }
    return '<div class="card"><h2>' + I.t('Kostenparameter') + LNP.ui.infoBtn('€ / Palette|Transit') + '</h2>' +
      '<p class="help">' + I.t('Netzwerk-Standardwerte; einzelne DCs können diese in der DC-Verwaltung überschreiben.') + '</p>' +
      '<div class="field-row">' + row('cpCostPerKm', I.t('Transportkosten je km'), s.costPerPalletKm) + row('cpCostBase', I.t('Transport-Grundkosten je Palette'), s.costBasePerPallet, '0.1') + '</div>' +
      '<div class="field-row">' + row('cpStorage', I.t('Lagerkosten je Platz/Monat'), s.storageCostPerSlotMonth, '0.1') + row('cpHandling', I.t('Handlingkosten je Palette'), s.handlingCostPerPallet, '0.1') + '</div>' +
      '<div class="field-row">' + row('cpKmPerDay', I.t('km pro Tag'), s.kmPerDay, '10') + row('cpHandlingDays', I.t('Handlingtage'), s.handlingDays, '0.1') + '</div>' +
      '<div class="field-row">' + row('cpMaxUtil', I.t('Auslastungsgrenze'), s.maxUtilization, '0.01') + '</div>' +
      '</div>';
  }

  function formulaSection() {
    var rows = LNP.sim.FORMULA_REFERENCE.map(function (f) {
      return '<div style="margin-bottom:12px;"><b>' + U.escapeHtml(I.t(f.title)) + '</b><div class="mono" style="margin:2px 0;">' + U.escapeHtml(I.t(f.formula)) + '</div>' +
        (f.note ? '<div class="help">' + U.escapeHtml(I.t(f.note)) + '</div>' : '') + '</div>';
    }).join('');
    return '<div class="card"><h2 data-t="Formelübersicht">' + I.t('Formelübersicht') + '</h2>' + rows + '</div>';
  }

  function projectSection() {
    return '<div class="card"><h2 data-t="Projekt speichern">' + I.t('Projekt speichern') + ' / ' + I.t('Projekt laden') + '</h2>' +
      '<p class="help">' + I.t('Enthält alle DCs, Datensätze, Regionen, Zuordnungen, Szenarien und Einstellungen als JSON — geeignet zur Weitergabe per Mail/Netzlaufwerk.') + '</p>' +
      '<div class="pill-group">' +
      '<button class="btn btn-primary" id="projSaveBtn" data-t="Projekt speichern">' + I.t('Projekt speichern') + '</button>' +
      '<button class="btn" id="projLoadBtn" data-t="Projekt laden">' + I.t('Projekt laden') + '</button>' +
      '<input type="file" id="projLoadInput" accept="application/json" hidden>' +
      '</div>' +
      (LNP.state.getPersistWarning() === 'quota' ? '<div class="note-box warn">' + I.t('Lokaler Speicher voll — Rohdaten werden nicht automatisch gesichert. Bitte Projektdatei manuell speichern.') + '</div>' : '') +
      '</div>';
  }

  function exportSection() {
    return '<div class="card"><h2>Excel / CSV / PDF</h2>' +
      '<div class="pill-group">' +
      '<button class="btn btn-primary" id="expExcelBtn" data-t="Excel-Export">' + I.t('Excel-Export') + '</button>' +
      '<button class="btn" id="expCsvBtn" data-t="CSV-Export">' + I.t('CSV-Export') + '</button>' +
      '<button class="btn" id="expPdfBtn" data-t="PDF-Bericht">' + I.t('PDF-Bericht') + '</button>' +
      '</div></div>';
  }

  function render(container) {
    container.innerHTML = exportSection() + projectSection() + brandingSection() + costParamsSection() + formulaSection();

    var excelBtn = container.querySelector('#expExcelBtn'); if (excelBtn) excelBtn.addEventListener('click', exportExcel);
    var csvBtn = container.querySelector('#expCsvBtn'); if (csvBtn) csvBtn.addEventListener('click', exportCsv);
    var pdfBtn = container.querySelector('#expPdfBtn'); if (pdfBtn) pdfBtn.addEventListener('click', printReport);

    var saveBtn = container.querySelector('#projSaveBtn'); if (saveBtn) saveBtn.addEventListener('click', function () { LNP.state.exportProjectFile(); });
    var loadBtn = container.querySelector('#projLoadBtn'); var loadInput = container.querySelector('#projLoadInput');
    if (loadBtn) loadBtn.addEventListener('click', function () { loadInput.click(); });
    if (loadInput) loadInput.addEventListener('change', function () {
      if (!loadInput.files || !loadInput.files[0]) return;
      LNP.state.importProjectFile(loadInput.files[0], function (err) {
        if (err) LNP.ui.toast(I.t('Fehler beim Laden') + ': ' + err.message, 'bad');
        else { LNP.sim.invalidateCaches(); LNP.ui.toast(I.t('Projekt laden') + ' OK', 'good'); }
      });
      loadInput.value = '';
    });

    var appName = container.querySelector('#brAppName'), initials = container.querySelector('#brInitials'), subtitle = container.querySelector('#brSubtitle'), logoInput = container.querySelector('#brLogo');
    function saveBranding(patch) { LNP.state.updateSettings({ branding: Object.assign({}, LNP.state.settings.branding, patch) }); }
    if (appName) appName.addEventListener('change', function () { saveBranding({ appName: appName.value.trim() || 'NetPlan+' }); });
    if (initials) initials.addEventListener('change', function () { saveBranding({ initials: initials.value.trim().toUpperCase() || 'NP' }); });
    if (subtitle) subtitle.addEventListener('change', function () { saveBranding({ appSubtitle: subtitle.value.trim() || null }); });
    if (logoInput) logoInput.addEventListener('change', function () {
      var file = logoInput.files && logoInput.files[0];
      if (!file) return;
      if (file.size > 300 * 1024) { LNP.ui.toast(I.t('Logo zu groß (max. 300 kB).'), 'bad'); return; }
      var reader = new FileReader();
      reader.onload = function (e) { saveBranding({ logo: e.target.result }); render(container); };
      reader.readAsDataURL(file);
    });
    var logoRemove = container.querySelector('#brLogoRemove');
    if (logoRemove) logoRemove.addEventListener('click', function () { saveBranding({ logo: null }); render(container); });

    function bindCost(id, field, isInt) {
      var el = container.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        var v = parseFloat(el.value);
        if (!isFinite(v)) return;
        var patch = {}; patch[field] = v;
        LNP.state.updateSettings(patch);
      });
    }
    bindCost('cpCostPerKm', 'costPerPalletKm'); bindCost('cpCostBase', 'costBasePerPallet');
    bindCost('cpStorage', 'storageCostPerSlotMonth'); bindCost('cpHandling', 'handlingCostPerPallet');
    bindCost('cpKmPerDay', 'kmPerDay'); bindCost('cpHandlingDays', 'handlingDays'); bindCost('cpMaxUtil', 'maxUtilization');
  }

  LNP.viewExport = { render: render };
})();
