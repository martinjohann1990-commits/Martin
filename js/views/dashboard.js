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
    var dcs = LNP.sim.candidateDcs();
    var skus = LNP.state.data.skus;
    var destinations = LNP.state.data.destinations;

    var totalPallets = net.totalPallets;
    var totalQty = net.totalQty;
    var avgPerDc = dcs.length ? totalPallets / dcs.length : 0;

    var kpis =
      kpiTile('Prognose Paletten (Gesamt)', I.fmtInt(totalPallets), net.weeks ? I.fmtNum(net.weeks, 1) + ' ' + I.t('Wochen') : '') +
      kpiTile('Prognose ESU (Gesamt)', I.fmtInt(totalQty)) +
      kpiTile('Aktive Distributionszentren', I.fmtInt(dcs.length)) +
      kpiTile('SKUs im Bestand', I.fmtInt(skus.length)) +
      kpiTile('Ship-to-Kunden', I.fmtInt(destinations.length)) +
      kpiTile('Ø Paletten je DC', I.fmtInt(avgPerDc)) +
      kpiTile('Ziel-Reichweite (Wochen)', I.fmtNum(settings.coverageWeeksGlobal, 1)) +
      (net.unassignedPallets > 0.5 ? kpiTile('Nicht zugeordnete Paletten', I.fmtInt(net.unassignedPallets), I.t('ohne Distrikt→DC-Zuordnung'), 'warn') : '');

    var byDistrict = {};
    LNP.state.data.forecast.forEach(function (r) {
      byDistrict[r.district] = byDistrict[r.district] || { name: r.districtName || r.district, pallets: 0 };
      byDistrict[r.district].pallets += r.pallets;
    });
    var districtRows = Object.keys(byDistrict).map(function (k) { return byDistrict[k]; });
    var topDistricts = U.topNWithRest(districtRows, function (r) { return r.pallets; }, function (r) { return r.name; }, 10);

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
    var regions = districtRows.map(function (r, i) {
      var keys = Object.keys(byDistrict);
      var district = keys[i];
      var c = LNP.sim.districtCentroid(district);
      return c ? { district: district, name: r.name, lat: c.lat, lng: c.lng, volume: r.pallets } : null;
    }).filter(Boolean);
    LNP.mapview.render('dashboardMap', { dcs: dcs.filter(function (d) { return U.isNum(d.lat); }), regions: regions, lanes: lanes });
  }

  LNP.viewDashboard = { render: render };
})();
