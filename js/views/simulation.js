/* NetPlan+ views/simulation.js — per-category site simulation (spec §8 "Simulation" view).
   Result order: recommendation card, ranking, score composition, split table, regional assignment. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, I = LNP.i18n;

  var ui = { category: 'all', mode: 'split', periodFromKey: '', periodToKey: '',
    weights: { capacity: 30, transport: 45, service: 25 }, maxUtilization: 0.85, manualShares: {}, excludedDcIds: {} };
  var lastSingle = null, lastActive = null;

  function periodOptions(selected) {
    var keys = {};
    LNP.state.data.forecast.forEach(function (r) { keys[r.periodKey] = r.periodTs; });
    var sorted = Object.keys(keys).sort(function (a, b) { return keys[a] - keys[b]; });
    return sorted.map(function (k) { return '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + k + '</option>'; }).join('');
  }
  function periodKeyToTs(key) {
    var found = null;
    LNP.state.data.forecast.some(function (r) { if (r.periodKey === key) { found = r.periodTs; return true; } return false; });
    return found;
  }

  function paramPanel() {
    var cats = LNP.sim.allCategories();
    var catOptions = '<option value="all">' + I.t('Alle') + '</option>' + cats.map(function (c) {
      return '<option value="' + U.escapeHtml(c) + '"' + (c === ui.category ? ' selected' : '') + '>' + U.escapeHtml(c) + '</option>';
    }).join('');
    return '<div class="card">' +
      '<h2 data-t="Parameter">' + I.t('Parameter') + '</h2>' +
      '<div class="field"><label data-t="Kategorie">' + I.t('Kategorie') + '</label><select id="simCategory">' + catOptions + '</select></div>' +
      '<div class="field-row">' +
      '<div class="field"><label data-t="Periode von">' + I.t('Periode von') + '</label><select id="simPeriodFrom"><option value="">' + I.t('Alle') + '</option>' + periodOptions(ui.periodFromKey) + '</select></div>' +
      '<div class="field"><label data-t="Periode bis">' + I.t('Periode bis') + '</label><select id="simPeriodTo"><option value="">' + I.t('Alle') + '</option>' + periodOptions(ui.periodToKey) + '</select></div>' +
      '</div>' +
      '<div class="field"><label data-t="Modus">' + I.t('Modus') + '</label><select id="simMode">' +
      '<option value="single"' + (ui.mode === 'single' ? ' selected' : '') + '>' + I.t('Alleinzuordnung') + '</option>' +
      '<option value="split"' + (ui.mode === 'split' ? ' selected' : '') + '>' + I.t('Aufteilung') + '</option>' +
      '<option value="manual"' + (ui.mode === 'manual' ? ' selected' : '') + '>' + I.t('Manuell') + '</option>' +
      '</select></div>' +
      '<h3>Standorte</h3>' +
      '<p class="help">Nur ausgewählte Standorte werden als Kandidaten bewertet.</p>' +
      dcChecklist() +
      '<h3 data-t="Gewichtung">' + I.t('Gewichtung') + '</h3>' +
      weightRow('capacity', 'Kapazität') + weightRow('transport', 'Transport') + weightRow('service', 'Reichweite') +
      '<div class="field"><label data-t="Auslastungsgrenze">' + I.t('Auslastungsgrenze') + '</label>' +
      '<input type="range" id="simMaxUtil" min="0.5" max="1" step="0.01" value="' + ui.maxUtilization + '">' +
      '<div class="help"><output id="simMaxUtilOut">' + I.fmtPct(ui.maxUtilization, 0) + '</output></div></div>' +
      '<p class="help">Mengenbasis: Forecast (Perioden/Kategorien nur dort vorhanden). Der geografische Fußabdruck je Standort — und damit Distanz/Transportkosten/Score je Kandidat — stammt aus der echten Sales History (siehe Formelübersicht in Berichte). Eine artikelscharfe Standortempfehlung liefert der Bericht „Artikel-Standortanalyse“.</p>' +
      '<button class="btn btn-primary" id="simRunBtn" data-t="Simulation starten">' + I.t('Simulation starten') + '</button>' +
      '</div>';
  }
  function dcChecklist() {
    var dcs = LNP.sim.candidateDcs();
    if (!dcs.length) return '<p class="help muted">Keine aktiven Distributionszentren.</p>';
    return '<div class="pill-group" style="margin-bottom:10px;">' +
      '<button type="button" class="pill" id="simDcAll">Alle</button>' +
      '<button type="button" class="pill" id="simDcNone">Keine</button>' +
      '</div>' +
      '<div style="max-height:150px;overflow:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;">' +
      dcs.map(function (dc) {
        var checked = !ui.excludedDcIds[dc.id];
        return '<label class="checkbox-row" style="margin:4px 0;"><input type="checkbox" class="js-dc-candidate" data-id="' + dc.id + '"' + (checked ? ' checked' : '') + '> ' + U.escapeHtml(dc.name) + '</label>';
      }).join('') + '</div>';
  }

  function selectedCandidateIds() {
    return LNP.sim.candidateDcs().filter(function (dc) { return !ui.excludedDcIds[dc.id]; }).map(function (dc) { return dc.id; });
  }

  function weightRow(key, label) {
    return '<div class="weight-row"><label data-t="' + label + '">' + I.t(label) + '</label>' +
      '<input type="range" min="0" max="100" step="5" class="js-weight" data-key="' + key + '" value="' + ui.weights[key] + '">' +
      '<output>' + ui.weights[key] + '</output></div>';
  }

  function reasonSentence(best) {
    var comps = [
      { key: I.t('Kapazität'), v: best.capacityScore }, { key: I.t('Transport'), v: best.transportScore }, { key: I.t('Reichweite'), v: best.serviceScore }
    ];
    comps.sort(function (a, b) { return b.v - a.v; });
    return I.t('Ausschlaggebend ist') + ' ' + comps[0].key + ' ' + I.t('mit') + ' ' + Math.round(comps[0].v) + ' ' + I.t('von') + ' 100 ' + I.t('Punkten') + '.';
  }

  function recommendationHtml(single, active) {
    if (!single.recommended) return '<div class="card empty">' + (single.warnings[0] || I.t('Keine aktiven Distributionszentren vorhanden.')) + '</div>';
    var best = single.recommended;
    var isSplit = active.mode !== 'single';
    var title = isSplit ?
      (active.parts.length + ' ' + I.t('Distributionszentren') + ' (' + I.t(active.mode === 'split' ? 'Aufteilung' : 'Manuell') + ')') :
      best.dcName;
    var warnings = active.warnings.concat(single.warnings.filter(function (w) { return active.warnings.indexOf(w) === -1; }));
    return '<div class="reco">' +
      '<div class="reco-title" data-t="Empfehlung">' + I.t('Empfehlung') + '</div>' +
      '<div class="reco-main">' + U.escapeHtml(title) + '</div>' +
      '<div class="reco-reason">' + reasonSentence(best) + '</div>' +
      (warnings.length ? warnings.map(function (w) { return '<div class="reco-warn">' + U.escapeHtml(w) + '</div>'; }).join(' ') : '') +
      '<div class="reco-kpis">' +
      recoKpi(I.t('Ziel-Palettenbestand'), I.fmtInt(U.sum(active.parts, function (p) { return p.slots; }))) +
      recoKpi(I.t('Forecast-Menge im Zeitraum'), I.fmtInt(active.demand.totalPallets)) +
      recoKpi(I.t('Ziel-Reichweite (Monate)'), I.fmtNum(active.targetDays / 30.44, 1)) +
      recoKpi('Ø €/Palette', best.transportCostPerPallet !== null ? I.fmtNum(best.transportCostPerPallet, 2) : '–') +
      recoKpi('Ø Transit (Tage)', best.transitDays !== null ? I.fmtNum(best.transitDays, 1) : '–') +
      recoKpi(I.t('Kapazität'), best.utilization !== null ? I.fmtPct(best.utilization, 0) : '–') +
      recoKpi('Score ' + I.t('Kapazität'), I.fmtInt(best.capacityScore)) +
      recoKpi('Score ' + I.t('Transport'), I.fmtInt(best.transportScore)) +
      recoKpi('Score ' + I.t('Reichweite'), I.fmtInt(best.serviceScore)) +
      '</div></div>';
  }
  function recoKpi(label, value) { return '<div class="reco-kpi"><b>' + value + '</b><span>' + U.escapeHtml(label) + '</span></div>'; }

  function rankingHtml(single) {
    if (!single.ranking.length) return '';
    var rows = single.ranking.map(function (r, i) {
      return '<tr' + (i === 0 ? ' style="font-weight:700"' : '') + '>' +
        '<td>' + (i + 1) + '</td><td>' + U.escapeHtml(r.dcName) + '</td>' +
        '<td class="num">' + I.fmtInt(r.totalScore) + '</td>' +
        '<td class="num">' + I.fmtInt(r.capacityScore) + '</td>' +
        '<td class="num">' + I.fmtInt(r.transportScore) + '</td>' +
        '<td class="num">' + I.fmtInt(r.serviceScore) + '</td>' +
        '<td>' + (r.feasible ? '<span class="badge badge-good">OK</span>' : '<span class="badge badge-bad">' + I.t('Auslastungsgrenze') + '</span>') + '</td>' +
        '</tr>';
    }).join('');
    return '<div class="card"><h2 data-t="Rangliste">' + I.t('Rangliste') + '</h2>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th data-t="Name">' + I.t('Name') + '</th>' +
      '<th class="num" data-t="Gesamt">' + I.t('Gesamt') + '</th><th class="num" data-t="Kapazität">' + I.t('Kapazität') + '</th>' +
      '<th class="num" data-t="Transport">' + I.t('Transport') + '</th><th class="num" data-t="Reichweite">' + I.t('Reichweite') + '</th><th data-t="Status">' + I.t('Status') + '</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>';
  }

  function scoreCompositionHtml(single) {
    if (!single.ranking.length) return '';
    var top = single.ranking.slice(0, 8);
    var w = ui.weights, wsum = (w.capacity + w.transport + w.service) || 1;
    return '<div class="card"><h2 data-t="Score-Zusammensetzung">' + I.t('Score-Zusammensetzung') + '</h2>' +
      '<div class="chart-box" style="height:' + (40 + top.length * 30) + 'px"><canvas id="chartScoreComposition"></canvas></div>' +
      '<div class="score-legend">' +
      '<span><span class="dot" style="background:var(--info)"></span>' + I.t('Kapazität') + '</span>' +
      '<span><span class="dot" style="background:var(--good)"></span>' + I.t('Transport') + '</span>' +
      '<span><span class="dot" style="background:var(--warn)"></span>' + I.t('Reichweite') + '</span></div>' +
      '</div>';
  }

  function splitTableHtml(active) {
    var isManual = ui.mode === 'manual';
    var dcsForManual = isManual ? LNP.sim.resolveCandidates({ candidateDcIds: selectedCandidateIds() }) : null;
    var rows = (isManual ? dcsForManual.map(function (dc) {
      var p = active.parts.filter(function (x) { return x.dcId === dc.id; })[0];
      return { dc: dc, p: p };
    }) : active.parts.map(function (p) { return { dc: LNP.sim.dcById(p.dcId), p: p }; })).map(function (row) {
      var p = row.p, dc = row.dc;
      var shareInput = '<input type="number" min="0" step="1" class="js-manual-share" data-id="' + dc.id + '" value="' + (ui.manualShares[dc.id] || (p ? Math.round(p.share * 100) : 0)) + '">';
      var shareCell = isManual ? shareInput : I.fmtInt((p ? p.share : 0) * 100) + ' %';
      return '<tr><td>' + U.escapeHtml(dc.name) + '</td>' +
        '<td class="num">' + shareCell + '</td>' +
        '<td class="num">' + (p ? I.fmtInt(p.pallets) : '–') + '</td>' +
        '<td class="num">' + (p ? I.fmtInt(p.slots) : '–') + '</td>' +
        '<td class="num">' + (p && p.transportCost !== null ? I.fmtNum(p.transportCost, 2) : '–') + '</td>' +
        '<td class="num">' + (p ? I.fmtCur(p.totalCost) : '–') + '</td>' +
        '<td class="num">' + (p ? I.fmtInt(p.score) : '–') + '</td>' +
        '<td>' + (p ? (p.feasible ? '<span class="badge badge-good">OK</span>' : '<span class="badge badge-bad">!</span>') : '–') + '</td></tr>';
    }).join('');
    var redundancyNote = (active.redundancy && active.redundancy.pallets > 0) ?
      '<div class="note-box">Redundanzvermeidung aktiv: ' + I.fmtInt(active.redundancy.articleCount) + ' Artikel (' + I.fmtInt(active.redundancy.pallets) + ' PAL) wurden gemäß Artikel-Standortanalyse direkt ihrem einen empfohlenen Standort zugewiesen (zentral bei geringer Drehung, regional bei starkem Distrikt-Bezug), statt über mehrere Standorte gestreut zu werden — vermeidet doppelten Sicherheitsbestand für dasselbe Volumen. Details je Artikel: Berichte → Artikel-Standortanalyse.</div>' : '';
    return '<div class="card"><div class="card-head"><h2 data-t="Aufteilungstabelle">' + I.t('Aufteilungstabelle') + '</h2>' +
      '<div class="actions">' + (isManual ? '<button class="btn btn-sm" id="simRecalcManual">Neu berechnen</button>' : '') +
      '<button class="btn btn-sm btn-primary" id="simApplyBtn" data-t="Übernehmen">' + I.t('Übernehmen') + '</button></div></div>' +
      (isManual ? '<p class="help">Anteile eintragen (relative Gewichte, müssen nicht auf 100 summieren) und neu berechnen.</p>' : '') +
      '<p class="help">PAL = Forecast-Durchsatz im gewählten Zeitraum (Basis für Transportkosten/Anteil). Slots = Ziel-Palettenbestand je Standort = Zyklusbestand (Ø Menge × Reichweite) + Sicherheitsbestand (aus der monatlichen Schwankung am jeweiligen Standort) — sinkt bei stärkerer Konsolidierung auf weniger Standorte, siehe Formelübersicht in Berichte.</p>' +
      redundancyNote +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num">%</th><th class="num">PAL</th>' +
      '<th class="num">Slots</th><th class="num">€/PAL</th><th class="num">' + I.t('Gesamt') + '</th><th class="num">Score</th><th data-t="Status">' + I.t('Status') + '</th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="8" class="muted">–</td></tr>') + '</tbody></table></div></div>';
  }

  function regionsHtml(active) {
    var rows = active.regions.map(function (r) {
      var dc = LNP.sim.dcById(r.dcId);
      return '<tr><td>' + U.escapeHtml(r.regionKey) + '</td><td>' + U.escapeHtml(dc ? dc.name : '–') + '</td>' +
        '<td class="num">' + I.fmtInt(r.pallets) + '</td><td class="num">' + (r.distance !== null && r.distance !== undefined ? I.fmtInt(r.distance) + ' km' : '–') + '</td></tr>';
    }).join('');
    return '<div class="card"><h2 data-t="Regionale Zuordnung">' + I.t('Regionale Zuordnung') + '</h2>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Region">' + I.t('Region') + '</th><th>DC</th><th class="num">PAL</th><th class="num">' + I.t('Distanz') + '</th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="4" class="muted">–</td></tr>') + '</tbody></table></div></div>';
  }

  function runAndRender(container) {
    var settings = Object.assign({}, LNP.state.settings, { weights: ui.weights, maxUtilization: ui.maxUtilization });
    var periodFrom = ui.periodFromKey ? periodKeyToTs(ui.periodFromKey) : null;
    var periodTo = ui.periodToKey ? periodKeyToTs(ui.periodToKey) : null;
    var params = { category: ui.category, dataset: 'forecast', periodFrom: periodFrom, periodTo: periodTo, settings: settings, candidateDcIds: selectedCandidateIds() };
    lastSingle = LNP.sim.runSingle(params);
    if (ui.mode === 'single') lastActive = lastSingle;
    else if (ui.mode === 'split') lastActive = LNP.sim.runSplit(params);
    else {
      var sum = 0; Object.keys(ui.manualShares).forEach(function (k) { sum += ui.manualShares[k] || 0; });
      var shareMap = {};
      if (sum > 0) Object.keys(ui.manualShares).forEach(function (k) { shareMap[k] = (ui.manualShares[k] || 0) / sum; });
      lastActive = LNP.sim.runManual(params, shareMap);
    }
    renderResults(container);
  }

  function renderResults(container) {
    var out = container.querySelector('#simResults');
    if (!out) return;
    if (!lastSingle) { out.innerHTML = ''; return; }
    out.innerHTML = recommendationHtml(lastSingle, lastActive) + rankingHtml(lastSingle) + scoreCompositionHtml(lastSingle) + splitTableHtml(lastActive) + regionsHtml(lastActive);

    if (lastSingle.ranking.length) {
      var top = lastSingle.ranking.slice(0, 8);
      var w = ui.weights, wsum = (w.capacity + w.transport + w.service) || 1;
      LNP.charts.stackedScoreBar('chartScoreComposition', top.map(function (r) { return r.dcName; }), top.map(function (r) {
        return { capacity: w.capacity * r.capacityScore / wsum, transport: w.transport * r.transportScore / wsum, service: w.service * r.serviceScore / wsum };
      }));
    }
    bindResultEvents(container);
  }

  function bindResultEvents(container) {
    var applyBtn = container.querySelector('#simApplyBtn');
    if (applyBtn) applyBtn.addEventListener('click', function () {
      LNP.sim.applyResult(lastActive);
      LNP.ui.toast(I.t('Speichern') + ': ' + I.t('Zuordnung'), 'good');
    });
    var recalcManual = container.querySelector('#simRecalcManual');
    if (recalcManual) recalcManual.addEventListener('click', function () {
      container.querySelectorAll('.js-manual-share').forEach(function (inp) { ui.manualShares[inp.getAttribute('data-id')] = parseFloat(inp.value) || 0; });
      runAndRender(container);
    });
  }

  function render(container) {
    if (!LNP.state.data.forecast.length) {
      container.innerHTML = '<div class="empty card"><h2 data-t="Keine Daten geladen">' + I.t('Keine Daten geladen') + '</h2>' +
        '<p data-t="Bitte laden Sie Ihre Excel-/CSV-Dateien im Bereich “Daten &amp; Import” hoch oder starten Sie mit den Demodaten.">' + I.t('Bitte laden Sie Ihre Excel-/CSV-Dateien im Bereich “Daten & Import” hoch oder starten Sie mit den Demodaten.') + '</p></div>';
      return;
    }
    container.innerHTML = '<div class="grid" style="grid-template-columns:320px 1fr;align-items:start;">' + paramPanel() + '<div id="simResults"></div></div>';

    var catSel = container.querySelector('#simCategory');
    catSel.addEventListener('change', function () { ui.category = catSel.value; });
    var pf = container.querySelector('#simPeriodFrom');
    var pt = container.querySelector('#simPeriodTo');
    pf.addEventListener('change', function () { ui.periodFromKey = pf.value; });
    pt.addEventListener('change', function () { ui.periodToKey = pt.value; });
    var modeSel = container.querySelector('#simMode');
    modeSel.addEventListener('change', function () { ui.mode = modeSel.value; render(container); });
    container.querySelectorAll('.js-dc-candidate').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var id = chk.getAttribute('data-id');
        if (chk.checked) delete ui.excludedDcIds[id]; else ui.excludedDcIds[id] = true;
      });
    });
    var dcAllBtn = container.querySelector('#simDcAll');
    if (dcAllBtn) dcAllBtn.addEventListener('click', function () { ui.excludedDcIds = {}; render(container); });
    var dcNoneBtn = container.querySelector('#simDcNone');
    if (dcNoneBtn) dcNoneBtn.addEventListener('click', function () {
      ui.excludedDcIds = {};
      LNP.sim.candidateDcs().forEach(function (dc) { ui.excludedDcIds[dc.id] = true; });
      render(container);
    });
    container.querySelectorAll('.js-weight').forEach(function (inp) {
      inp.addEventListener('input', function () {
        ui.weights[inp.getAttribute('data-key')] = parseFloat(inp.value);
        inp.nextElementSibling.textContent = inp.value;
      });
    });
    var maxUtil = container.querySelector('#simMaxUtil');
    maxUtil.addEventListener('input', function () {
      ui.maxUtilization = parseFloat(maxUtil.value);
      container.querySelector('#simMaxUtilOut').textContent = I.fmtPct(ui.maxUtilization, 0);
    });
    container.querySelector('#simRunBtn').addEventListener('click', function () { runAndRender(container); });

    if (lastSingle) runAndRender(container);
  }

  LNP.viewSimulation = { render: render };
})();
