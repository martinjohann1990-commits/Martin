/* NetPlan+ views/dashboard.js — KPI tiles, 3 charts, network map, DC detail table. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, I = LNP.i18n;

  function hasData() { return LNP.state.data.forecast.length > 0; }

  function kpiTile(label, value, sub, cls) {
    return '<div class="kpi"><div class="kpi-label">' + U.escapeHtml(I.t(label)) + '</div>' +
      '<div class="kpi-value' + (cls ? ' ' + cls : '') + '">' + value + '</div>' +
      (sub ? '<div class="kpi-sub">' + sub + '</div>' : '') + '</div>';
  }

  /* Sales History's real per-district ESU (canonical-level rows only, see sim.js) vs. the
     Forecast's derived district footprint (each DC's own forecast total fanned out through its
     historical district shares). Since the footprint's MIX is itself derived from Sales
     History, this is not an independent check of the split shape — but it is a meaningful
     absolute-volume comparison: it shows which districts are projected to grow or shrink,
     because it reflects each serving DC's own forecast trend against its historical baseline. */
  function historyComparisonHtml(demand) {
    var history = LNP.state.data.history;
    var canonical = LNP.sim.canonicalDistrictSet();
    if (!history.length) return '';
    var histByDistrict = {};
    history.forEach(function (r) {
      if (!r.districtLabel || !canonical[r.districtLabel]) return;
      histByDistrict[r.districtLabel] = (histByDistrict[r.districtLabel] || 0) + (r.qtyEsu || 0);
    });
    var districts = Object.keys(histByDistrict);
    if (!districts.length) return '';
    var rows = districts.map(function (d) {
      var histQty = histByDistrict[d];
      var fcQty = (demand.byDistrict[d] && demand.byDistrict[d].qty) || 0;
      var ratio = histQty > 0 ? fcQty / histQty : null;
      return { name: d, histQty: histQty, fcQty: fcQty, ratio: ratio };
    }).sort(function (a, b) { return b.histQty - a.histQty; });
    var tableRows = rows.map(function (r) {
      return '<tr><td>' + U.escapeHtml(r.name) + '</td><td class="num">' + I.fmtInt(r.histQty) + '</td><td class="num">' + I.fmtInt(r.fcQty) + '</td>' +
        '<td class="num">' + (r.ratio !== null ? I.fmtPct(r.ratio, 0) : '–') + '</td></tr>';
    }).join('');
    return '<div class="card"><h2>Ist (Sales History) vs. Forecast je Distrikt</h2>' +
      '<p class="help">Ist = reale historische ESU-Menge je Distrikt aus der Sales History (Zeitraum It. Quelldatei, i.d.R. 12 Monate). Forecast = abgeleiteter Distrikt-Fußabdruck über den gesamten geladenen Forecast-Horizont (Menge je DC, verteilt nach dessen historischem Distrikt-Mix). ' +
      '<b>Achtung:</b> Forecast-Mengen liegen in Stück, Sales History in ESU (Equivalent Sales Unit) vor — beide Skalen sind nicht 1:1 vergleichbar, zusätzlich deckt der Forecast meist einen längeren Zeitraum ab. Die absolute Kennzahl „Forecast/Ist“ ist daher nur ein grober Anhaltspunkt; aussagekräftiger ist die <i>relative</i> Verteilung über die Distrikte in beiden Spalten.</p>' +
      '<div class="chart-box"><canvas id="chartHistoryVsForecast"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Region">' + I.t('Region') + '</th><th class="num">Ist (ESU)</th><th class="num">Forecast (Stück)</th><th class="num">Forecast / Ist</th></tr></thead><tbody>' + tableRows + '</tbody></table></div></div>';
  }

  function render(container) {
    if (!hasData()) {
      container.innerHTML =
        '<div class="empty card">' +
        '<h2 data-t="Keine Daten geladen">' + I.t('Keine Daten geladen') + '</h2>' +
        '<p data-t="Bitte laden Sie Ihre Excel-/CSV-Dateien im Bereich “Daten &amp; Import” hoch oder starten Sie mit den Demodaten.">' +
        I.t('Bitte laden Sie Ihre Excel-/CSV-Dateien im Bereich “Daten & Import” hoch oder starten Sie mit den Demodaten.') + '</p>' +
        '<button class="btn btn-primary" id="dashDemoBtn">' + I.t('Demodaten laden und loslegen') + '</button>' +
        '</div>';
      var btn = container.querySelector('#dashDemoBtn');
      if (btn) btn.addEventListener('click', function () { LNP.demo.load(); });
      return;
    }

    var settings = LNP.state.settings;
    var net = LNP.sim.computeScenarioNetwork(null, { category: 'all', settings: settings });
    var demand = LNP.sim.demandFor({ category: 'all', settings: settings });
    var dcs = LNP.sim.candidateDcs();
    var skus = LNP.state.data.skus;
    var shipTo = LNP.state.data.shipToAddresses.length ? LNP.state.data.shipToAddresses : LNP.state.data.destinations;

    var totalPallets = net.totalPallets;
    var totalQty = net.totalQty;
    var avgPerDc = dcs.length ? totalPallets / dcs.length : 0;
    var monthCount = Object.keys(U.groupBy(LNP.state.data.forecast, function (r) { return r.periodKey; })).length;

    var kpis =
      kpiTile('Prognose Paletten (Gesamt)', I.fmtInt(totalPallets), monthCount ? monthCount + ' ' + (monthCount === 1 ? 'Monat' : 'Monate') : '') +
      kpiTile('Prognose ESU (Gesamt)', I.fmtInt(totalQty)) +
      kpiTile('Aktive Distributionszentren', I.fmtInt(dcs.length)) +
      kpiTile('SKUs im Bestand', I.fmtInt(skus.length)) +
      kpiTile('Ship-to-Kunden', I.fmtInt(shipTo.length)) +
      kpiTile('Ø Paletten je DC', I.fmtInt(avgPerDc)) +
      kpiTile('Ziel-Reichweite (Monate)', I.fmtNum(settings.coverageMonthsGlobal, 1)) +
      (net.unassignedPallets > 0.5 ? kpiTile('Nicht zugeordnete Paletten', I.fmtInt(net.unassignedPallets), '', 'warn') : '');

    var districtRows = Object.keys(demand.byDistrict).map(function (k) { return demand.byDistrict[k]; });
    var topDistricts = U.topNWithRest(districtRows, function (r) { return r.pallets; }, function (r) { return r.districtName; }, 10);

    var byPeriod = {};
    LNP.state.data.forecast.forEach(function (r) {
      byPeriod[r.periodKey] = byPeriod[r.periodKey] || { ts: r.periodTs, pallets: 0 };
      byPeriod[r.periodKey].pallets += r.pallets;
    });
    var periodKeys = Object.keys(byPeriod).sort(function (a, b) { return byPeriod[a].ts - byPeriod[b].ts; });

    var tableRows = net.perDc.map(function (d) {
      var utilBadge = d.utilization === null ? '<span class="muted">–</span>' :
        '<span class="badge ' + (d.utilization <= settings.maxUtilization ? 'badge-good' : d.utilization <= 1 ? 'badge-warn' : 'badge-bad') + '">' + I.fmtPct(d.utilization, 0) + '</span>';
      return '<tr>' +
        '<td>' + U.escapeHtml(d.dcName) + '</td>' +
        '<td class="num">' + I.fmtInt(d.pallets) + '</td>' +
        '<td class="num">' + I.fmtInt(d.storageDemandPallets) + '</td>' +
        '<td class="num">' + I.fmtInt(d.capacity) + '</td>' +
        '<td>' + utilBadge + '</td>' +
        '<td class="num">' + I.fmtInt(d.skuCount) + '</td>' +
        '<td class="num">' + I.fmtInt(d.pickingBins) + '</td>' +
        '</tr>';
    }).join('');

    container.innerHTML =
      '<div class="grid grid-4">' + kpis + '</div>' +
      '<div class="grid grid-2">' +
      '<div class="card"><h2 data-t="Volumen je Distributionszentrum">' + I.t('Volumen je Distributionszentrum') + '</h2>' +
      '<div class="chart-box"><canvas id="chartDcVolume"></canvas></div></div>' +
      '<div class="card"><h2 data-t="Top-10 Vertriebsgebiete">' + I.t('Top-10 Vertriebsgebiete') + '</h2>' +
      '<div class="chart-box"><canvas id="chartTopDistricts"></canvas></div></div>' +
      '</div>' +
      '<div class="card"><h2 data-t="Prognoseverlauf je Periode">' + I.t('Prognoseverlauf je Periode') + '</h2>' +
      '<div class="chart-box"><canvas id="chartTrend"></canvas></div></div>' +
      historyComparisonHtml(demand) +
      '<div class="card"><h2 data-t="Netzwerkkarte">' + I.t('Netzwerkkarte') + '</h2>' +
      '<div class="map-box" id="dashboardMap"></div></div>' +
      '<div class="card"><h2 data-t="Details">' + I.t('Details') + '</h2>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th data-t="Name">' + I.t('Name') + '</th><th class="num">PAL</th>' +
      '<th class="num" data-t="Paletten-/Lagerbedarf je DC">' + I.t('Paletten-/Lagerbedarf je DC') + '</th>' +
      '<th class="num" data-t="Kapazität (Stellplätze)">' + I.t('Kapazität (Stellplätze)') + '</th>' +
      '<th data-t="Status">' + I.t('Status') + '</th>' +
      '<th class="num" data-t="SKU je DC">' + I.t('SKU je DC') + '</th>' +
      '<th class="num">Bins</th>' +
      '</tr></thead><tbody>' + (tableRows || '<tr><td colspan="7" class="muted">–</td></tr>') + '</tbody></table></div></div>';

    LNP.charts.bar('chartDcVolume', net.perDc.map(function (d) { return d.dcName; }), [{ label: 'PAL', data: net.perDc.map(function (d) { return Math.round(d.pallets); }) }]);
    LNP.charts.bar('chartTopDistricts', topDistricts.map(function (d) { return d.label; }), [{ label: 'PAL', data: topDistricts.map(function (d) { return Math.round(d.value); }) }], { horizontal: true });
    LNP.charts.line('chartTrend', periodKeys, [{ label: 'PAL', data: periodKeys.map(function (k) { return Math.round(byPeriod[k].pallets); }) }]);

    if (LNP.state.data.history.length && document.getElementById('chartHistoryVsForecast')) {
      var canonical = LNP.sim.canonicalDistrictSet();
      var histByDistrict = {};
      LNP.state.data.history.forEach(function (r) {
        if (!r.districtLabel || !canonical[r.districtLabel]) return;
        histByDistrict[r.districtLabel] = (histByDistrict[r.districtLabel] || 0) + (r.qtyEsu || 0);
      });
      var hDistricts = Object.keys(histByDistrict).sort(function (a, b) { return histByDistrict[b] - histByDistrict[a]; });
      LNP.charts.bar('chartHistoryVsForecast', hDistricts, [
        { label: 'Ist (ESU)', data: hDistricts.map(function (d) { return Math.round(histByDistrict[d]); }) },
        { label: 'Forecast (Stück)', data: hDistricts.map(function (d) { return Math.round((demand.byDistrict[d] && demand.byDistrict[d].qty) || 0); }) }
      ]);
    }

    var lanes = [];
    net.perDc.forEach(function (d) {
      var dc = LNP.sim.dcById(d.dcId);
      if (!dc || !U.isNum(dc.lat)) return;
      Object.keys(d.districts).forEach(function (district) {
        var c = LNP.sim.districtCentroid(district);
        if (!c) return;
        lanes.push({ fromLat: dc.lat, fromLng: dc.lng, toLat: c.lat, toLng: c.lng, dcId: dc.id, volume: d.districts[district] });
      });
    });
    var regions = districtRows.map(function (r) {
      var c = LNP.sim.districtCentroid(r.district);
      return c ? { district: r.district, name: r.districtName, lat: c.lat, lng: c.lng, volume: r.pallets } : null;
    }).filter(Boolean);
    LNP.mapview.render('dashboardMap', { dcs: dcs.filter(function (d) { return U.isNum(d.lat); }), regions: regions, lanes: lanes });
  }

  LNP.viewDashboard = { render: render };
})();
