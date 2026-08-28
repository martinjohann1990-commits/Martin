/* NetPlan+ views/reports.js — "Berichte": country/district allocation, SKU/DC, pallet & storage
   demand/DC, average shipment size, shipment composition (taps vs mixed). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, I = LNP.i18n;

  var activeTab = 'alloc';
  var selectedDistrict = null;

  var TABS = [
    { key: 'alloc', label: 'Länder-Distrikt-Zuordnung' },
    { key: 'sku', label: 'SKU je DC' },
    { key: 'storage', label: 'Paletten-/Lagerbedarf je DC' },
    { key: 'shipment', label: 'Ø Sendungsgröße' },
    { key: 'composition', label: 'Sendungszusammensetzung' }
  ];

  function tabsHtml() {
    return '<div class="tabs">' + TABS.map(function (t) {
      return '<button class="tab-btn' + (t.key === activeTab ? ' active' : '') + '" data-tab="' + t.key + '">' + U.escapeHtml(I.t(t.label)) + '</button>';
    }).join('') + '</div>';
  }

  function allocPanel() {
    var districts = LNP.sim.allDistricts();
    if (!districts.length) return '<div class="empty">Keine Distrikte importiert.</div>';
    if (!selectedDistrict) selectedDistrict = districts[0].district;
    var topN = LNP.state.settings.countryAllocationTopN;
    var options = districts.map(function (d) { return '<option value="' + U.escapeHtml(d.district) + '"' + (d.district === selectedDistrict ? ' selected' : '') + '>' + U.escapeHtml(d.name) + '</option>'; }).join('');
    var report = LNP.sim.countryDistrictAllocation(selectedDistrict, topN);
    var rows = report.rows.map(function (r) {
      return '<tr' + (r.isRest ? ' class="muted"' : '') + '><td>' + U.escapeHtml(r.countryName) + '</td><td class="num">' + I.fmtPct(r.share, 1) + '</td><td class="num">' + I.fmtInt(r.count) + '</td></tr>';
    }).join('');
    return '<div class="field-row">' +
      '<div class="field" style="max-width:320px"><label data-t="Region">' + I.t('Region') + '</label><select id="repDistrict">' + options + '</select></div>' +
      '<div class="field" style="max-width:160px"><label>Top-N Länder</label><input type="number" min="1" max="30" id="repTopN" value="' + topN + '"></div>' +
      '</div>' +
      '<div class="note-box">Anteil je Land = Anzahl Ship-to-Kunden(Land) ÷ Anzahl Ship-to-Kunden(Distrikt) — ein Mengen-Proxy, da in den Quelldaten keine kundenscharfen Volumina vorliegen. Länder außerhalb der Top-N werden als &bdquo;Rest&ldquo; gebündelt.</div>' +
      '<div class="chart-box"><canvas id="chartAlloc"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Land">' + I.t('Land') + '</th><th class="num">Anteil %</th><th class="num">Ship-to-Kunden</th></tr></thead><tbody>' + (rows || '<tr><td colspan="3" class="muted">–</td></tr>') + '</tbody></table></div>';
  }

  function skuPanel() {
    var report = LNP.sim.skuCountPerDcReport();
    var rows = report.map(function (r) {
      return '<tr><td>' + U.escapeHtml(r.dcName) + '</td><td class="num">' + I.fmtInt(r.skuCount) + '</td><td class="num">' + I.fmtInt(r.pickingBins) + '</td></tr>';
    }).join('');
    return '<p class="help">Picking Bins = ⌈SKU-Anzahl ÷ ' + I.fmtNum(LNP.state.settings.skusPerBin, 1) + ' SKUs je Bin⌉ (einstellbar unter Daten &amp; Import → Mengenlogik).</p>' +
      '<div class="chart-box"><canvas id="chartSku"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num" data-t="SKU je DC">' + I.t('SKU je DC') + '</th><th class="num">Picking Bins</th></tr></thead><tbody>' + (rows || '<tr><td colspan="3" class="muted">–</td></tr>') + '</tbody></table></div>';
  }

  function storagePanel() {
    var settings = LNP.state.settings;
    var net = LNP.sim.computeScenarioNetwork(null, { category: 'all', settings: settings });
    var rows = net.perDc.map(function (d) {
      var utilBadge = d.utilization === null ? '–' : '<span class="badge ' + (d.utilization <= settings.maxUtilization ? 'badge-good' : d.utilization <= 1 ? 'badge-warn' : 'badge-bad') + '">' + I.fmtPct(d.utilization, 0) + '</span>';
      return '<tr><td>' + U.escapeHtml(d.dcName) + '</td><td class="num">' + I.fmtNum(d.weeklyRate, 1) + '</td>' +
        '<td class="num">' + I.fmtInt(d.storageDemandPallets) + '</td><td class="num">' + I.fmtInt(d.capacity) + '</td><td>' + utilBadge + '</td></tr>';
    }).join('');
    return '<p class="help">Basis-Szenario (Ist-Zustand), globale Ziel-Reichweite: <b>' + I.fmtNum(settings.coverageWeeksGlobal, 1) + ' ' + I.t('Wochen') + '</b> ' +
      '(anpassbar unter Daten &amp; Import → Mengenlogik; wirkt sich sofort auf diesen Bericht aus).</p>' +
      '<div class="chart-box"><canvas id="chartStorage"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num">PAL/Woche</th>' +
      '<th class="num" data-t="Paletten-/Lagerbedarf je DC">' + I.t('Paletten-/Lagerbedarf je DC') + '</th><th class="num" data-t="Kapazität (Stellplätze)">' + I.t('Kapazität (Stellplätze)') + '</th><th data-t="Status">' + I.t('Status') + '</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="muted">–</td></tr>') + '</tbody></table></div>';
  }

  function shipmentPanel() {
    var settings = LNP.state.settings;
    var bounds = settings.shipmentClusterBounds;
    var rep = LNP.sim.avgShipmentSize({ category: 'all', settings: settings });
    var clusterRows = rep.clusters.map(function (c) {
      return '<tr><td>' + U.escapeHtml(c.label) + '</td><td class="num">' + I.fmtInt(c.count) + '</td><td class="num">' + I.fmtPct(rep.totalLines ? c.count / rep.totalLines : 0, 1) + '</td></tr>';
    }).join('');
    var perDcRows = rep.perDc.map(function (d) {
      return '<tr><td>' + U.escapeHtml(d.dcName) + '</td><td class="num">' + (d.avg !== null ? I.fmtNum(d.avg, 2) : '–') + ' ESU</td><td class="num">' + I.fmtInt(d.lines) + '</td></tr>';
    }).join('');
    return '<div class="field-row"><div class="field" style="max-width:160px"><label>Cluster-Grenze 1</label><input type="number" step="0.1" id="repBound1" value="' + bounds[0] + '"></div>' +
      '<div class="field" style="max-width:160px"><label>Cluster-Grenze 2</label><input type="number" step="0.1" id="repBound2" value="' + bounds[1] + '"></div></div>' +
      '<div class="note-box">Proxy: je (Distrikt, Periode, Material)-Zeile aus dem Forecast als Stellvertreter für eine Sendung, da keine Auftrags-/Lieferpositionen vorliegen.</div>' +
      '<div class="kpi" style="max-width:260px;margin-bottom:14px;"><div class="kpi-label" data-t="Ø Sendungsgröße">' + I.t('Ø Sendungsgröße') + ' Europa</div><div class="kpi-value">' + (rep.europeAvg !== null ? I.fmtNum(rep.europeAvg, 2) + ' ESU' : '–') + '</div></div>' +
      '<div class="chart-box"><canvas id="chartShipment"></canvas></div>' +
      '<div class="grid grid-2">' +
      '<div><h3>Cluster</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Cluster</th><th class="num">Zeilen</th><th class="num">Anteil</th></tr></thead><tbody>' + clusterRows + '</tbody></table></div></div>' +
      '<div><h3>Je DC</h3><div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num">' + I.t('Ø Sendungsgröße') + '</th><th class="num">Zeilen</th></tr></thead><tbody>' + (perDcRows || '<tr><td colspan="3" class="muted">–</td></tr>') + '</tbody></table></div></div>' +
      '</div>';
  }

  function compositionPanel() {
    var settings = LNP.state.settings;
    var rep = LNP.sim.shipmentComposition({ category: 'all', settings: settings });
    var perDcRows = rep.perDc.map(function (d) {
      return '<tr><td>' + U.escapeHtml(d.dcName) + '</td><td class="num">' + (d.tapsOnlyShare !== null ? I.fmtPct(d.tapsOnlyShare, 1) : '–') + '</td>' +
        '<td class="num">' + (d.mixedShare !== null ? I.fmtPct(d.mixedShare, 1) : '–') + '</td><td class="num">' + (d.noTapsShare !== null ? I.fmtPct(d.noTapsShare, 1) : '–') + '</td></tr>';
    }).join('');
    return '<div class="field"><label>Taps-Schlüsselwörter (Kategorie enthält)</label><input type="text" id="repTapsKeywords" value="' + U.escapeHtml((settings.tapsKeywords || []).join(', ')) + '"></div>' +
      '<div class="note-box">Näherung: eine Sendung wird als (Distrikt, Periode)-Bündel aus dem Forecast approximiert, da keine Auftrags-/Lieferpositionen vorliegen. &bdquo;Taps&ldquo; wird über die SKU-Kategorie (Marketing-View / Productline) erkannt, die eines der obigen Schlüsselwörter enthält.</div>' +
      '<div class="grid grid-3">' +
      '<div class="kpi"><div class="kpi-label">Nur Taps</div><div class="kpi-value good">' + (rep.tapsOnlyShare !== null ? I.fmtPct(rep.tapsOnlyShare, 1) : '–') + '</div></div>' +
      '<div class="kpi"><div class="kpi-label">Gemischt</div><div class="kpi-value warn">' + (rep.mixedShare !== null ? I.fmtPct(rep.mixedShare, 1) : '–') + '</div></div>' +
      '<div class="kpi"><div class="kpi-label">Ohne Taps</div><div class="kpi-value">' + (rep.noTapsShare !== null ? I.fmtPct(rep.noTapsShare, 1) : '–') + '</div></div>' +
      '</div>' +
      '<div class="chart-box" style="max-width:340px;margin:16px auto;"><canvas id="chartComposition"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num">Nur Taps</th><th class="num">Gemischt</th><th class="num">Ohne Taps</th></tr></thead><tbody>' + (perDcRows || '<tr><td colspan="4" class="muted">–</td></tr>') + '</tbody></table></div>';
  }

  function renderCharts(container) {
    if (activeTab === 'alloc') {
      var report = LNP.sim.countryDistrictAllocation(selectedDistrict, LNP.state.settings.countryAllocationTopN);
      LNP.charts.bar('chartAlloc', report.rows.map(function (r) { return r.countryName; }), [{ label: '%', data: report.rows.map(function (r) { return +(r.share * 100).toFixed(1); }) }]);
    } else if (activeTab === 'sku') {
      var skuRep = LNP.sim.skuCountPerDcReport();
      LNP.charts.bar('chartSku', skuRep.map(function (r) { return r.dcName; }), [
        { label: I.t('SKU je DC'), data: skuRep.map(function (r) { return r.skuCount; }) },
        { label: 'Picking Bins', data: skuRep.map(function (r) { return r.pickingBins; }) }
      ]);
    } else if (activeTab === 'storage') {
      var net = LNP.sim.computeScenarioNetwork(null, { category: 'all', settings: LNP.state.settings });
      LNP.charts.bar('chartStorage', net.perDc.map(function (d) { return d.dcName; }), [{ label: 'Storage PAL', data: net.perDc.map(function (d) { return Math.round(d.storageDemandPallets); }) }]);
    } else if (activeTab === 'shipment') {
      var rep = LNP.sim.avgShipmentSize({ category: 'all', settings: LNP.state.settings });
      LNP.charts.bar('chartShipment', rep.clusters.map(function (c) { return c.label; }), [{ label: 'Zeilen', data: rep.clusters.map(function (c) { return c.count; }) }]);
    } else if (activeTab === 'composition') {
      var comp = LNP.sim.shipmentComposition({ category: 'all', settings: LNP.state.settings });
      LNP.charts.doughnut('chartComposition', ['Nur Taps', 'Gemischt', 'Ohne Taps'], [
        comp.tapsOnlyShare || 0, comp.mixedShare || 0, comp.noTapsShare || 0
      ].map(function (v) { return +(v * 100).toFixed(1); }));
    }
  }

  function bindPanelEvents(container) {
    var districtSel = container.querySelector('#repDistrict');
    if (districtSel) districtSel.addEventListener('change', function () { selectedDistrict = districtSel.value; renderPanel(container); });
    var topN = container.querySelector('#repTopN');
    if (topN) topN.addEventListener('change', function () { LNP.state.updateSettings({ countryAllocationTopN: parseInt(topN.value, 10) || 10 }); renderPanel(container); });
    var b1 = container.querySelector('#repBound1'), b2 = container.querySelector('#repBound2');
    function applyBounds() {
      if (!b1 || !b2) return;
      LNP.state.updateSettings({ shipmentClusterBounds: [parseFloat(b1.value) || 1, parseFloat(b2.value) || 5] });
      renderPanel(container);
    }
    if (b1) b1.addEventListener('change', applyBounds);
    if (b2) b2.addEventListener('change', applyBounds);
    var tapsInput = container.querySelector('#repTapsKeywords');
    if (tapsInput) tapsInput.addEventListener('change', function () {
      LNP.state.updateSettings({ tapsKeywords: tapsInput.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean) });
      renderPanel(container);
    });
  }

  function panelHtml() {
    if (activeTab === 'alloc') return allocPanel();
    if (activeTab === 'sku') return skuPanel();
    if (activeTab === 'storage') return storagePanel();
    if (activeTab === 'shipment') return shipmentPanel();
    return compositionPanel();
  }

  function renderPanel(container) {
    var panelEl = container.querySelector('#reportPanel');
    panelEl.innerHTML = panelHtml();
    LNP.i18n.applyStatic(panelEl);
    bindPanelEvents(container);
    renderCharts(container);
  }

  function render(container) {
    if (!LNP.state.data.forecast.length) {
      container.innerHTML = '<div class="empty card"><h2 data-t="Keine Daten geladen">' + I.t('Keine Daten geladen') + '</h2></div>';
      return;
    }
    container.innerHTML = '<div class="card">' + tabsHtml() + '<div id="reportPanel"></div></div>';
    container.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTab = btn.getAttribute('data-tab');
        container.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
        renderPanel(container);
      });
    });
    renderPanel(container);
  }

  LNP.viewReports = { render: render };
})();
