/* NetPlan+ views/reports.js — "Berichte": country/district allocation, SKU/DC, pallet & storage
   demand/DC, average shipment size, shipment composition (taps vs mixed). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, I = LNP.i18n;

  var activeTab = 'alloc';
  var selectedDistrict = null;
  var articleFilter = { minShare: 0.6, query: '', recommendation: 'all' };
  var selectedScenarioId = 'base';

  function scenarioObjById(id) {
    if (!id || id === 'base') return null;
    return LNP.state.scenarios.filter(function (s) { return s.id === id; })[0] || null;
  }
  /* Scenario selector shared by the three Berichte that can reflect a Szenario's DC topology
     (Artikel-Standortanalyse, SKU je DC, Paletten-/Lagerbedarf je DC) — "verlinkt" with both the
     Simulation (simParams-based Szenarien) and the Szenario-Editor (dcMapping-based ones). */
  function scenarioSelectorHtml() {
    var scenarios = LNP.state.scenarios;
    var options = '<option value="base"' + (selectedScenarioId === 'base' ? ' selected' : '') + '>' + I.t('Aktueller Stand (keine Konsolidierung)') + '</option>' +
      scenarios.map(function (s) { return '<option value="' + s.id + '"' + (s.id === selectedScenarioId ? ' selected' : '') + '>' + U.escapeHtml(s.name) + '</option>'; }).join('');
    return '<div class="field" style="max-width:320px"><label data-t="Szenario">' + I.t('Szenario') + '</label><select id="repScenario">' + options + '</select></div>';
  }

  var TABS = [
    { key: 'alloc', label: 'Länder-Distrikt-Zuordnung' },
    { key: 'articles', label: 'Artikel-Standortanalyse' },
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
    if (!districts.length) return '<div class="empty">' + I.t('Keine Distrikte importiert.') + '</div>';
    if (!selectedDistrict) selectedDistrict = districts[0].district;
    var topN = LNP.state.settings.countryAllocationTopN;
    var options = districts.map(function (d) { return '<option value="' + U.escapeHtml(d.district) + '"' + (d.district === selectedDistrict ? ' selected' : '') + '>' + U.escapeHtml(d.name) + '</option>'; }).join('');
    var report = LNP.sim.countryAllocationForDistrict(selectedDistrict, topN);
    var rows = report.rows.map(function (r) {
      return '<tr' + (r.isRest ? ' class="muted"' : '') + '><td>' + U.escapeHtml(r.unit) + '</td><td class="num">' + I.fmtPct(r.share, 1) + '</td><td class="num">' + I.fmtInt(r.esu) + '</td></tr>';
    }).join('');
    return '<div class="field-row">' +
      '<div class="field" style="max-width:320px"><label data-t="Region">' + I.t('Region') + LNP.ui.infoBtn('Geografischer Fußabdruck je DC') + '</label><select id="repDistrict">' + options + '</select></div>' +
      '<div class="field" style="max-width:160px"><label data-t="Top-N Länder">' + I.t('Top-N Länder') + '</label><input type="number" min="1" max="30" id="repTopN" value="' + topN + '"></div>' +
      '</div>' +
      '<div class="note-box">' + I.t('Anteil je Land/Einheit = reale ESU-Menge aus der Sales History (Distrikt-Hierarchie), kein Zähl-Proxy. Länder außerhalb der Top-N werden als &bdquo;Rest&ldquo; gebündelt.') + '</div>' +
      '<div class="chart-box"><canvas id="chartAlloc"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Land">' + I.t('Land') + '</th><th class="num" data-t="Anteil %">' + I.t('Anteil %') + '</th><th class="num">ESU</th></tr></thead><tbody>' + (rows || '<tr><td colspan="3" class="muted">–</td></tr>') + '</tbody></table></div>';
  }

  var REC_LABEL = { zentral: 'Zentral', regional: 'Regional', mehrere: 'Mehrere Standorte' };
  var REC_BADGE = { zentral: 'badge-warn', regional: 'badge-good', mehrere: 'badge-info' };
  var REC_ORDER = ['regional', 'zentral', 'mehrere'];

  function articlePanel() {
    var scenario = scenarioObjById(selectedScenarioId);
    var candidateDcIds = LNP.sim.scenarioCandidateDcIds(scenario);
    var analysis = LNP.sim.articleLocationAnalysis({ minShareForRegional: articleFilter.minShare, candidateDcIds: candidateDcIds });
    var rows = analysis.rows;
    var counts = { zentral: 0, regional: 0, mehrere: 0 };
    var volByRec = { zentral: 0, regional: 0, mehrere: 0 };
    rows.forEach(function (r) { counts[r.recommendation]++; volByRec[r.recommendation] += r.totalEsu; });

    var filtered = rows.filter(function (r) {
      if (articleFilter.recommendation !== 'all' && r.recommendation !== articleFilter.recommendation) return false;
      if (articleFilter.query) {
        var q = articleFilter.query.toLowerCase();
        if ((r.article || '').toLowerCase().indexOf(q) === -1 && (r.articleName || '').toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });
    var LIMIT = 150;
    var shown = filtered.slice(0, LIMIT);

    var tableRows = shown.map(function (r) {
      var dcName = r.recommendedDc ? r.recommendedDc.name : '–';
      return '<tr><td>' + U.escapeHtml(r.article) + (r.articleName ? '<div class="muted" style="font-size:11px">' + U.escapeHtml(r.articleName) + '</div>' : '') + '</td>' +
        '<td><span class="badge ' + REC_BADGE[r.recommendation] + '">' + I.t(REC_LABEL[r.recommendation]) + '</span></td>' +
        '<td>' + U.escapeHtml(dcName) + '</td>' +
        '<td>' + U.escapeHtml(r.topDistrict || '–') + '</td>' +
        '<td class="num">' + (r.topDistrict ? I.fmtPct(r.topShare, 0) : '–') + '</td>' +
        '<td>' + r.abcClass + '</td>' +
        '<td class="num">' + I.fmtInt(r.totalEsu) + '</td>' +
        '<td class="muted" style="font-size:11px;max-width:280px">' + U.escapeHtml(r.reason) + '</td></tr>';
    }).join('');

    var kpis = REC_ORDER.map(function (key) {
      return '<div class="kpi"><div class="kpi-label">' + I.t(REC_LABEL[key]) + '</div>' +
        '<div class="kpi-value">' + I.fmtInt(counts[key]) + '</div>' +
        '<div class="muted" style="font-size:11px">' + I.tf('{0} der Menge', I.fmtPct(analysis.grandTotal ? volByRec[key] / analysis.grandTotal : 0, 0)) + '</div></div>';
    }).join('');

    return '<h2 style="margin-top:0">' + I.t('Artikel-Standortanalyse') + LNP.ui.infoBtn('Artikel-Standortanalyse') + '</h2>' +
      scenarioSelectorHtml() +
      (scenario ? '<div class="note-box">' + I.tf('Empfehlungen gelten für die {0} im Szenario „{1}“ verbleibenden Standorte — bereits konsolidierte DCs stehen nicht mehr als Empfehlung zur Verfügung.', I.fmtInt(candidateDcIds ? candidateDcIds.length : 0), U.escapeHtml(scenario.name)) + '</div>' : '') +
      '<div class="note-box">' + I.tf('Je Artikel wird das SKU-View-Volumen (Shipping Point → DC → Distrikt, mit demselben Verteilschlüssel aus der Sales History wie überall sonst) in seine Distrikt-Anteile zerlegt. <b>{0}</b> = geringe Drehung (C-Artikel, unterste 5&nbsp;% der kumulierten Menge) — Streuung auf mehrere Standorte würde den Sicherheitsbestand vervielfachen, ohne den Servicegrad spürbar zu verbessern. <b>{1}</b> = ein einzelner Distrikt vereint mindestens den unten eingestellten Anteil des Artikelvolumens auf sich. <b>{2}</b> = echtes Volumen, aber netzweit verteilt ohne dominanten Distrikt. Empfohlenes DC je Distrikt = der Standort, der diesen Distrikt laut Sales History bereits am stärksten beliefert.', I.t(REC_LABEL.zentral), I.t(REC_LABEL.regional), I.t(REC_LABEL.mehrere)) + '</div>' +
      '<div class="grid grid-3" style="margin-bottom:14px;">' + kpis + '</div>' +
      '<div class="chart-box" style="max-width:340px;margin:0 auto 16px;"><canvas id="chartArticleRec"></canvas></div>' +
      '<div class="field-row">' +
      '<div class="field" style="max-width:220px"><label data-t="Schwelle „Regional“ (Anteil)">' + I.t('Schwelle „Regional“ (Anteil)') + '</label><input type="number" min="0.1" max="1" step="0.05" id="repMinShare" value="' + articleFilter.minShare + '"></div>' +
      '<div class="field" style="max-width:220px"><label data-t="Empfehlung">' + I.t('Empfehlung') + '</label><select id="repRecFilter">' +
      '<option value="all"' + (articleFilter.recommendation === 'all' ? ' selected' : '') + '>' + I.t('Alle') + '</option>' +
      REC_ORDER.map(function (key) { return '<option value="' + key + '"' + (articleFilter.recommendation === key ? ' selected' : '') + '>' + I.t(REC_LABEL[key]) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field" style="max-width:260px"><label data-t="Artikel / Bezeichnung suchen">' + I.t('Artikel / Bezeichnung suchen') + '</label><input type="text" id="repArticleSearch" value="' + U.escapeHtml(articleFilter.query) + '" placeholder="' + I.t('z. B. Artikelnummer') + '"></div>' +
      '</div>' +
      '<p class="help">' + I.tf('{0} von {1} Artikeln entsprechen dem Filter{2}.', I.fmtInt(filtered.length), I.fmtInt(rows.length), (filtered.length > LIMIT ? I.tf(' — die ersten {0} nach Volumen angezeigt', LIMIT) : '')) + '</p>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Artikel">' + I.t('Artikel') + '</th><th data-t="Empfehlung">' + I.t('Empfehlung') + '</th><th data-t="Empfohlenes DC">' + I.t('Empfohlenes DC') + '</th><th data-t="Region">' + I.t('Region') + '</th><th class="num" data-t="Anteil">' + I.t('Anteil') + '</th><th>ABC</th><th class="num">ESU</th><th data-t="Begründung">' + I.t('Begründung') + '</th></tr></thead>' +
      '<tbody>' + (tableRows || '<tr><td colspan="8" class="muted">–</td></tr>') + '</tbody></table></div>';
  }

  function skuPanel() {
    var scenario = scenarioObjById(selectedScenarioId);
    var report = LNP.sim.skuCountPerDcReport(scenario);
    var rows = report.map(function (r) {
      return '<tr><td>' + U.escapeHtml(r.dcName) + '</td><td class="num">' + I.fmtInt(r.skuCount) + '</td><td class="num">' + I.fmtInt(r.pickingBins) + '</td></tr>';
    }).join('');
    return scenarioSelectorHtml() +
      (scenario ? '<div class="note-box">' + I.tf('Basis: Szenario „{0}“. Für Artikel ohne dominanten Distrikt („Mehrere Standorte“ in der Artikel-Standortanalyse) wird jedes verbleibende DC des Szenarios mitgezählt — echte Volumen ohne einen einzelnen Lagerort, daher eine bewusste Näherung nach oben.', U.escapeHtml(scenario.name)) + '</div>' : '') +
      '<p class="help">' + I.tf('Picking Bins = ⌈SKU-Anzahl ÷ {0} SKUs je Bin⌉ (einstellbar unter Daten &amp; Import → Mengenlogik).', I.fmtNum(LNP.state.settings.skusPerBin, 1)) + LNP.ui.infoBtn('SKU / Picking Bins je DC') + '</p>' +
      '<div class="chart-box"><canvas id="chartSku"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num" data-t="SKU je DC">' + I.t('SKU je DC') + '</th><th class="num" data-t="Picking Bins">' + I.t('Picking Bins') + '</th></tr></thead><tbody>' + (rows || '<tr><td colspan="3" class="muted">–</td></tr>') + '</tbody></table></div>';
  }

  function storagePanel() {
    var settings = LNP.state.settings;
    var scenario = scenarioObjById(selectedScenarioId);
    var net = LNP.sim.computeScenarioNetwork(scenario, { category: 'all', settings: settings });
    var rows = net.perDc.map(function (d) {
      var utilBadge = d.utilization === null ? '–' : '<span class="badge ' + (d.utilization <= settings.maxUtilization ? 'badge-good' : d.utilization <= 1 ? 'badge-warn' : 'badge-bad') + '">' + I.fmtPct(d.utilization, 0) + '</span>';
      return '<tr><td>' + U.escapeHtml(d.dcName) + '</td><td class="num">' + I.fmtNum(d.weeklyRate, 1) + '</td>' +
        '<td class="num">' + I.fmtInt(d.storageDemandPallets) + '</td><td class="num">' + I.fmtInt(d.capacity) + '</td><td>' + utilBadge + '</td></tr>';
    }).join('');
    return scenarioSelectorHtml() +
      '<p class="help">' + (scenario ? I.tf('Szenario „{0}“', U.escapeHtml(scenario.name)) : I.t('Basis (Ist-Zustand)')) + ', ' + I.t('globale Ziel-Reichweite:') + ' <b>' + I.fmtNum(settings.coverageMonthsGlobal, 1) + ' ' + I.t('Monate') + '</b> ' +
      I.t('(anpassbar unter Daten &amp; Import → Mengenlogik; wirkt sich sofort auf diesen Bericht aus).') + LNP.ui.infoBtn('Ziel-Palettenbestand|Zyklusbestand|Sicherheitsbestand') + '</p>' +
      '<div class="chart-box"><canvas id="chartStorage"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num" data-t="PAL/Woche">' + I.t('PAL/Woche') + '</th>' +
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
    return '<div class="field-row"><div class="field" style="max-width:160px"><label data-t="Cluster-Grenze 1">' + I.t('Cluster-Grenze 1') + '</label><input type="number" step="0.1" id="repBound1" value="' + bounds[0] + '"></div>' +
      '<div class="field" style="max-width:160px"><label data-t="Cluster-Grenze 2">' + I.t('Cluster-Grenze 2') + '</label><input type="number" step="0.1" id="repBound2" value="' + bounds[1] + '"></div></div>' +
      '<div class="note-box">' + I.t('Proxy: je (Distrikt, Periode, Material)-Zeile aus dem Forecast als Stellvertreter für eine Sendung, da keine Auftrags-/Lieferpositionen vorliegen.') + LNP.ui.infoBtn('Ø Sendungsgröße') + '</div>' +
      '<div class="kpi" style="max-width:260px;margin-bottom:14px;"><div class="kpi-label">' + I.t('Ø Sendungsgröße') + ' ' + I.t('Europa') + '</div><div class="kpi-value">' + (rep.europeAvg !== null ? I.fmtNum(rep.europeAvg, 2) + ' ESU' : '–') + '</div></div>' +
      '<div class="chart-box"><canvas id="chartShipment"></canvas></div>' +
      '<div class="grid grid-2">' +
      '<div><h3 data-t="Cluster">' + I.t('Cluster') + '</h3><div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Cluster">' + I.t('Cluster') + '</th><th class="num" data-t="Zeilen">' + I.t('Zeilen') + '</th><th class="num" data-t="Anteil">' + I.t('Anteil') + '</th></tr></thead><tbody>' + clusterRows + '</tbody></table></div></div>' +
      '<div><h3 data-t="Je DC">' + I.t('Je DC') + '</h3><div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num">' + I.t('Ø Sendungsgröße') + '</th><th class="num" data-t="Zeilen">' + I.t('Zeilen') + '</th></tr></thead><tbody>' + (perDcRows || '<tr><td colspan="3" class="muted">–</td></tr>') + '</tbody></table></div></div>' +
      '</div>';
  }

  var COMPOSITION_LABEL = { tapsOnly: 'Nur Taps', mixed: 'Gemischt', noTaps: 'Ohne Taps' };

  function compositionPanel() {
    var settings = LNP.state.settings;
    var rep = LNP.sim.shipmentComposition({ category: 'all', settings: settings });
    var perDcRows = rep.perDc.map(function (d) {
      return '<tr><td>' + U.escapeHtml(d.dcName) + '</td><td class="num">' + (d.tapsOnlyShare !== null ? I.fmtPct(d.tapsOnlyShare, 1) : '–') + '</td>' +
        '<td class="num">' + (d.mixedShare !== null ? I.fmtPct(d.mixedShare, 1) : '–') + '</td><td class="num">' + (d.noTapsShare !== null ? I.fmtPct(d.noTapsShare, 1) : '–') + '</td></tr>';
    }).join('');
    return '<div class="field"><label data-t="Taps-Schlüsselwörter (Kategorie enthält)">' + I.t('Taps-Schlüsselwörter (Kategorie enthält)') + '</label><input type="text" id="repTapsKeywords" value="' + U.escapeHtml((settings.tapsKeywords || []).join(', ')) + '"></div>' +
      '<div class="note-box">' + I.t('Näherung: eine Sendung wird als (Distrikt, Periode)-Bündel aus dem Forecast approximiert, da keine Auftrags-/Lieferpositionen vorliegen. &bdquo;Taps&ldquo; wird über die SKU-Kategorie (Marketing-View / Productline) erkannt, die eines der obigen Schlüsselwörter enthält.') + LNP.ui.infoBtn('Sendungszusammensetzung') + '</div>' +
      '<div class="grid grid-3">' +
      '<div class="kpi"><div class="kpi-label">' + I.t(COMPOSITION_LABEL.tapsOnly) + '</div><div class="kpi-value good">' + (rep.tapsOnlyShare !== null ? I.fmtPct(rep.tapsOnlyShare, 1) : '–') + '</div></div>' +
      '<div class="kpi"><div class="kpi-label">' + I.t(COMPOSITION_LABEL.mixed) + '</div><div class="kpi-value warn">' + (rep.mixedShare !== null ? I.fmtPct(rep.mixedShare, 1) : '–') + '</div></div>' +
      '<div class="kpi"><div class="kpi-label">' + I.t(COMPOSITION_LABEL.noTaps) + '</div><div class="kpi-value">' + (rep.noTapsShare !== null ? I.fmtPct(rep.noTapsShare, 1) : '–') + '</div></div>' +
      '</div>' +
      '<div class="chart-box" style="max-width:340px;margin:16px auto;"><canvas id="chartComposition"></canvas></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num">' + I.t(COMPOSITION_LABEL.tapsOnly) + '</th><th class="num">' + I.t(COMPOSITION_LABEL.mixed) + '</th><th class="num">' + I.t(COMPOSITION_LABEL.noTaps) + '</th></tr></thead><tbody>' + (perDcRows || '<tr><td colspan="4" class="muted">–</td></tr>') + '</tbody></table></div>';
  }

  function renderCharts(container) {
    if (activeTab === 'alloc') {
      var report = LNP.sim.countryAllocationForDistrict(selectedDistrict, LNP.state.settings.countryAllocationTopN);
      LNP.charts.bar('chartAlloc', report.rows.map(function (r) { return r.unit; }), [{ label: '%', data: report.rows.map(function (r) { return +(r.share * 100).toFixed(1); }) }]);
    } else if (activeTab === 'articles') {
      var scenarioA = scenarioObjById(selectedScenarioId);
      var analysis = LNP.sim.articleLocationAnalysis({ minShareForRegional: articleFilter.minShare, candidateDcIds: LNP.sim.scenarioCandidateDcIds(scenarioA) });
      var volByRec = { zentral: 0, regional: 0, mehrere: 0 };
      analysis.rows.forEach(function (r) { volByRec[r.recommendation] += r.totalEsu; });
      LNP.charts.doughnut('chartArticleRec', REC_ORDER.map(function (k) { return I.t(REC_LABEL[k]); }),
        REC_ORDER.map(function (k) { return analysis.grandTotal ? +(volByRec[k] / analysis.grandTotal * 100).toFixed(1) : 0; }));
    } else if (activeTab === 'sku') {
      var scenarioS = scenarioObjById(selectedScenarioId);
      var skuRep = LNP.sim.skuCountPerDcReport(scenarioS);
      LNP.charts.bar('chartSku', skuRep.map(function (r) { return r.dcName; }), [
        { label: I.t('SKU je DC'), data: skuRep.map(function (r) { return r.skuCount; }) },
        { label: 'Picking Bins', data: skuRep.map(function (r) { return r.pickingBins; }) }
      ]);
    } else if (activeTab === 'storage') {
      var scenarioT = scenarioObjById(selectedScenarioId);
      var net = LNP.sim.computeScenarioNetwork(scenarioT, { category: 'all', settings: LNP.state.settings });
      LNP.charts.bar('chartStorage', net.perDc.map(function (d) { return d.dcName; }), [{ label: I.t('Storage PAL'), data: net.perDc.map(function (d) { return Math.round(d.storageDemandPallets); }) }]);
    } else if (activeTab === 'shipment') {
      var rep = LNP.sim.avgShipmentSize({ category: 'all', settings: LNP.state.settings });
      LNP.charts.bar('chartShipment', rep.clusters.map(function (c) { return c.label; }), [{ label: I.t('Zeilen'), data: rep.clusters.map(function (c) { return c.count; }) }]);
    } else if (activeTab === 'composition') {
      var comp = LNP.sim.shipmentComposition({ category: 'all', settings: LNP.state.settings });
      LNP.charts.doughnut('chartComposition', [I.t(COMPOSITION_LABEL.tapsOnly), I.t(COMPOSITION_LABEL.mixed), I.t(COMPOSITION_LABEL.noTaps)], [
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
    var minShare = container.querySelector('#repMinShare');
    if (minShare) minShare.addEventListener('change', function () {
      articleFilter.minShare = U.clamp(parseFloat(minShare.value) || 0.6, 0.1, 1);
      renderPanel(container);
    });
    var recFilter = container.querySelector('#repRecFilter');
    if (recFilter) recFilter.addEventListener('change', function () { articleFilter.recommendation = recFilter.value; renderPanel(container); });
    var articleSearch = container.querySelector('#repArticleSearch');
    if (articleSearch) articleSearch.addEventListener('change', function () { articleFilter.query = articleSearch.value.trim(); renderPanel(container); });
    var scenarioSel = container.querySelector('#repScenario');
    if (scenarioSel) scenarioSel.addEventListener('change', function () { selectedScenarioId = scenarioSel.value; renderPanel(container); });
  }

  function panelHtml() {
    if (activeTab === 'alloc') return allocPanel();
    if (activeTab === 'articles') return articlePanel();
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

  /* Sets the active tab WITHOUT rendering (no container reference here) — call right before
     LNP.app.goTo('reports') so the subsequent render already opens on this tab. */
  function selectTab(key) { if (TABS.some(function (t) { return t.key === key; })) activeTab = key; }

  LNP.viewReports = { render: render, selectTab: selectTab };
})();
