/* =========================================================================
   simui.js – Oberfläche der Simulation: Parameter, Empfehlung, Rangliste,
              Score-Herleitung, Splitting und Übernahme der Zuordnung
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state, fmt = U.fmt;

  var lastResult = null;
  var simMode = 'single';

  /* ------------------------------------------------------------ Parameter */
  function params(overrides) {
    var p = {
      category: U.$('#sim-category').value,
      dataset: U.$('#sim-dataset').value,
      periodFrom: U.$('#sim-period-from').value || null,
      periodTo: U.$('#sim-period-to').value || null,
      mode: simMode,
      maxDC: U.num(U.$('#sim-maxdc').value, 2),
      targetDays: U.num(U.$('#sim-targetdays').value, 0),
      weights: readWeights()
    };
    return Object.assign(p, overrides || {});
  }

  function readWeights() {
    return {
      capacity: U.num(U.$('#w-capacity').value, 0),
      transport: U.num(U.$('#w-transport').value, 0),
      service: U.num(U.$('#w-service').value, 0)
    };
  }

  function syncWeightOutputs() {
    var w = readWeights();
    var n = NS.sim.normalizedWeights(w);
    U.$('#w-capacity-out').textContent = w.capacity + ' %';
    U.$('#w-transport-out').textContent = w.transport + ' %';
    U.$('#w-service-out').textContent = w.service + ' %';
    U.$('#weights-note').textContent = 'Normiert: Kapazität ' + fmt.pct(n.capacity) +
      ' · Transport ' + fmt.pct(n.transport) + ' · Reichweite ' + fmt.pct(n.service);
    S.settings().weights = w;
  }

  /* ------------------------------------------------------------ Steuerelemente */
  function refreshControls() {
    var dataset = U.$('#sim-dataset').value;
    var cats = S.categories(dataset);
    if (!cats.length && dataset !== 'all') cats = S.categories('all');

    var catSel = U.$('#sim-category');
    var prevCat = catSel.value;
    catSel.innerHTML = cats.length
      ? cats.map(function (c) { return '<option value="' + U.esc(c) + '">' + U.esc(c) + '</option>'; }).join('')
      : '<option value="">– keine Kategorien vorhanden –</option>';
    if (cats.indexOf(prevCat) >= 0) catSel.value = prevCat;

    var pers = S.periods(dataset);
    var from = U.$('#sim-period-from'), to = U.$('#sim-period-to');
    var prevFrom = from.value, prevTo = to.value;
    var opts = pers.map(function (p) { return '<option value="' + U.esc(p) + '">' + U.esc(p) + '</option>'; }).join('');
    from.innerHTML = opts || '<option value="">–</option>';
    to.innerHTML = opts || '<option value="">–</option>';
    from.value = pers.indexOf(prevFrom) >= 0 ? prevFrom : (pers[0] || '');
    to.value = pers.indexOf(prevTo) >= 0 ? prevTo : (pers[pers.length - 1] || '');

    syncTargetDays();

    var s = S.settings();
    U.$('#w-capacity').value = s.weights.capacity;
    U.$('#w-transport').value = s.weights.transport;
    U.$('#w-service').value = s.weights.service;
    U.$('#cfg-maxutil').value = Math.round(s.maxUtilization * 100);
    U.$('#cfg-maxutil-out').textContent = Math.round(s.maxUtilization * 100) + ' %';
    syncWeightOutputs();

    renderAssignments();
  }

  function syncTargetDays() {
    var cat = U.$('#sim-category').value;
    if (cat) U.$('#sim-targetdays').value = S.targetDays(cat);
  }

  /* ------------------------------------------------------------ Ausführung */
  function simulate() {
    var p = params();
    if (!p.category) { U.toast('Bitte zuerst Daten importieren und eine Kategorie wählen.', 'warn'); return; }
    if (!S.activeDCs().length) { U.toast('Es ist kein aktives Distributionszentrum vorhanden.', 'warn'); return; }

    if (p.targetDays > 0 && p.targetDays !== S.targetDays(p.category)) {
      S.setTargetDays(p.category, p.targetDays);
    }

    var res = NS.sim.run(p);
    if (res.error) { U.toast(res.error, 'error'); return; }
    lastResult = res;
    renderResult(res);
    U.toast('Simulation für „' + p.category + '“ abgeschlossen.', 'good');
  }

  function simulateAll() {
    var p = params();
    if (!S.activeDCs().length) { U.toast('Es ist kein aktives Distributionszentrum vorhanden.', 'warn'); return; }
    if (!S.categories(p.dataset).length) { U.toast('Keine Kategorien in der gewählten Datenbasis.', 'warn'); return; }
    if (!confirm('Alle Kategorien werden nacheinander simuliert und zugeordnet (volumenstärkste zuerst). Bestehende Zuordnungen werden dabei ersetzt. Fortfahren?')) return;

    var out = NS.sim.runAll(p);
    U.toast(out.count + ' Kategorien simuliert und zugeordnet.', 'good');
    if (out.results && out.results.length) {
      var current = out.results.find(function (r) { return r.category === p.category; }) || out.results[0];
      lastResult = current;
      U.$('#sim-category').value = current.category;
      renderResult(current);
    }
    renderAssignments();
  }

  /* ------------------------------------------------------------ Darstellung */
  function renderResult(res) {
    U.$('#sim-empty').classList.add('hidden');
    U.$('#sim-output').classList.remove('hidden');

    renderReco(res);
    renderRanking(res);
    renderScoreChart(res);
    renderSplit(res);
    renderRegionAssign(res);
  }

  function renderReco(res) {
    var card = U.$('#reco-card');
    var d = res.demand;
    var best = res.best;
    var isSplit = res.parts.length > 1;

    var head, sub;
    if (isSplit) {
      head = 'Aufteilung auf ' + res.parts.length + ' Standorte';
      sub = 'Kategorie „' + res.category + '“ – kombinierte Belieferung nach regionaler Nähe und verfügbarer Kapazität.';
    } else {
      head = best.dcName;
      sub = 'Kategorie „' + res.category + '“ vollständig aus diesem Distributionszentrum.';
    }

    var badges = res.parts.map(function (p) {
      return '<span class="badge badge-dc" style="background:' + NS.charts.seriesColor(NS.dcs.dcIndex(p.dcId)) + '">' +
        U.esc(p.dcName) + ' · ' + fmt.pct1(p.share) + '</span>';
    }).join('');

    var warnings = [];
    if (!res.metrics.feasible) warnings.push('Die Kapazität reicht für den Ziel-Bestand nicht aus.');
    if (res.overflowPallets > 0) warnings.push(fmt.int(res.overflowPallets) + ' Paletten konnten nicht kapazitätsgerecht untergebracht werden.');
    if (d.regionsWithoutCoords > 0) warnings.push(d.regionsWithoutCoords + ' Region(en) ohne Koordinaten – für diese wird eine mittlere Netzdistanz angenommen.');

    var runnerUp = res.candidates.length > 1 ? res.candidates[1] : null;
    var reason = buildReason(res, runnerUp);

    card.innerHTML =
      '<span class="reco-tag">Empfehlung</span>' +
      '<h2>' + U.esc(head) + '</h2>' +
      '<p class="reco-sub">' + U.esc(sub) + '</p>' +
      (isSplit ? '<div class="reco-split">' + badges + '</div>' : '') +
      '<p class="hint" style="margin-top:10px">' + reason + '</p>' +
      (warnings.length ? '<div class="alert alert-warn" style="margin-top:12px">' +
        warnings.map(function (w) { return '• ' + U.esc(w); }).join('<br>') + '</div>' : '') +
      '<div class="reco-metrics">' +
      metric('Gesamt-Score', fmt.dec1(res.metrics.score) + ' <span class="kpi-unit">/100</span>') +
      metric('Volumen', fmt.int(d.totalPallets) + ' <span class="kpi-unit">Pal.</span>') +
      metric('Ziel-Bestand', fmt.int(res.metrics.requiredSlots) + ' <span class="kpi-unit">Plätze</span>') +
      metric('Zielreichweite', fmt.int(res.targetDays) + ' <span class="kpi-unit">Tage</span>') +
      metric('Ø Distanz', isFinite(res.metrics.avgDistance) ? fmt.km(res.metrics.avgDistance) : '–') +
      metric('Transportkosten', fmt.eur(res.metrics.transportCost)) +
      metric('Gesamtkosten', fmt.eur(res.metrics.totalCost)) +
      metric('Auslastung danach', isFinite(res.metrics.utilization) ? fmt.pct1(res.metrics.utilization) : '–') +
      '</div>';
  }

  function metric(label, value) {
    return '<div class="reco-metric"><span>' + U.esc(label) + '</span><b>' + value + '</b></div>';
  }

  /** Formuliert, welches Kriterium den Ausschlag gegeben hat. */
  function buildReason(res, runnerUp) {
    var best = res.candidates[0];
    if (!best) return '';
    var c = best.scores.contributions;
    var names = { capacity: 'Kapazität und Auslastungsbalance', transport: 'Transportkosten bzw. Kundennähe', service: 'Einhaltung der Zielreichweite' };
    var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0];

    var txt = 'Ausschlaggebend ist <b>' + names[top] + '</b> mit ' + fmt.dec1(c[top]) +
      ' von ' + fmt.dec1(best.scores.total) + ' Punkten (Teil-Score ' + fmt.dec1(best.scores[top]) + ').';

    if (runnerUp && runnerUp.dcId !== best.dcId) {
      var delta = best.scores.total - runnerUp.scores.total;
      txt += ' Der Abstand zum zweitplatzierten Standort ' + U.esc(runnerUp.dcName) + ' beträgt ' +
        fmt.dec1(delta) + ' Punkte' +
        (isFinite(best.costPerPallet) && isFinite(runnerUp.costPerPallet)
          ? ' bei ' + fmt.dec2(runnerUp.costPerPallet - best.costPerPallet) + ' € Unterschied je Palette.' : '.');
    }
    return txt;
  }

  function renderRanking(res) {
    var rows = res.candidates;
    var bestId = res.candidates[0] ? res.candidates[0].dcId : null;
    var usedIds = res.parts.map(function (p) { return p.dcId; });

    U.renderTable(U.$('#table-rank'), [
      { label: '#', num: true, render: function (r, i) { return i + 1; } },
      {
        label: 'Distributionszentrum', render: function (r) {
          return '<span style="display:inline-flex;align-items:center;gap:7px">' +
            '<i class="dc-dot" style="background:' + NS.charts.seriesColor(NS.dcs.dcIndex(r.dcId)) + '"></i><b>' +
            U.esc(r.dcName) + '</b>' +
            (usedIds.indexOf(r.dcId) >= 0 ? ' <span class="badge badge-good">gewählt</span>' : '') + '</span>';
        }
      },
      { label: 'Gesamt-Score', num: true, render: function (r) { return U.scoreBar(r.scores.total, NS.charts.seriesColor(NS.dcs.dcIndex(r.dcId))); } },
      { label: 'Kapazität', num: true, render: function (r) { return fmt.dec1(r.scores.capacity); } },
      { label: 'Transport', num: true, render: function (r) { return fmt.dec1(r.scores.transport); } },
      { label: 'Reichweite', num: true, render: function (r) { return fmt.dec1(r.scores.service); } },
      { label: 'Ø Distanz', num: true, render: function (r) { return isFinite(r.avgDistance) ? fmt.km(r.avgDistance) : '–'; } },
      { label: 'Transit', num: true, render: function (r) { return isFinite(r.avgTransitDays) ? fmt.dec1(r.avgTransitDays) + ' T' : '–'; } },
      { label: '€/Palette', num: true, render: function (r) { return fmt.dec2(r.costPerPallet); } },
      { label: 'Transportkosten', num: true, render: function (r) { return fmt.eur(r.transportCost); } },
      { label: 'Ziel-Bestand', num: true, render: function (r) { return fmt.int(r.requiredSlots); } },
      { label: 'Frei', num: true, render: function (r) { return fmt.int(r.freeSlots); } },
      {
        label: 'Auslastung danach', num: true, render: function (r) {
          var cls = r.utilAfter > 1 ? 't-crit' : (r.utilAfter > S.settings().maxUtilization ? 't-warn' : 't-good');
          return '<span class="' + cls + '">' + (isFinite(r.utilAfter) ? fmt.pct1(r.utilAfter) : '–') + '</span>';
        }
      },
      {
        label: 'Reichweite erreichbar', num: true, render: function (r) {
          return fmt.dec1(r.achievableDays) + ' / ' + fmt.int(res.targetDays) + ' T';
        }
      },
      {
        label: 'Kapazität', render: function (r) {
          return r.feasible ? '<span class="badge badge-good">ausreichend</span>' : '<span class="badge badge-crit">zu klein</span>';
        }
      }
    ], rows, {
      rowClass: function (r) { return r.dcId === bestId ? 'is-best' : ''; }
    });
  }

  function renderScoreChart(res) {
    var top = res.candidates.slice(0, 8);
    var labels = top.map(function (r) { return r.dcName; });

    NS.charts.bar('chart-score', labels, [
      { label: 'Kapazität & Balance', data: top.map(function (r) { return U.round(r.scores.contributions.capacity, 1); }), color: NS.charts.seriesColor(0) },
      { label: 'Transport / Distanz', data: top.map(function (r) { return U.round(r.scores.contributions.transport, 1); }), color: NS.charts.seriesColor(1) },
      { label: 'Zielreichweite', data: top.map(function (r) { return U.round(r.scores.contributions.service, 1); }), color: NS.charts.seriesColor(2) }
    ], {
      stacked: true,
      horizontal: true,
      valueFormat: function (v) { return fmt.int(v); },
      tooltipFormat: function (v) { return fmt.dec1(v) + ' Punkte'; },
      tooltipFooter: function (items) {
        var r = top[items[0].dataIndex];
        return 'Gesamt: ' + fmt.dec1(r.scores.total) + ' / 100';
      }
    });

    NS.charts.legend('#legend-score', [
      { label: 'Kapazität & Balance (' + fmt.pct(res.weights.capacity) + ')', color: NS.charts.seriesColor(0) },
      { label: 'Transport / Distanz (' + fmt.pct(res.weights.transport) + ')', color: NS.charts.seriesColor(1) },
      { label: 'Zielreichweite (' + fmt.pct(res.weights.service) + ')', color: NS.charts.seriesColor(2) }
    ]);
  }

  function renderSplit(res) {
    var card = U.$('#card-split');
    card.classList.remove('hidden');

    U.renderTable(U.$('#table-split'), [
      {
        label: 'Distributionszentrum', render: function (r) {
          return '<span style="display:inline-flex;align-items:center;gap:7px">' +
            '<i class="dc-dot" style="background:' + NS.charts.seriesColor(NS.dcs.dcIndex(r.dcId)) + '"></i><b>' +
            U.esc(r.dcName) + '</b></span>';
        }
      },
      {
        label: 'Anteil (%)', num: true, render: function (r) {
          return '<input type="number" min="0" max="100" step="1" class="input input-sm pct-input" data-dc="' +
            r.dcId + '" value="' + U.round(r.share * 100, 1) + '">';
        }
      },
      { label: 'Volumen (Pal.)', num: true, render: function (r) { return fmt.int(r.pallets); } },
      { label: 'Ziel-Bestand', num: true, render: function (r) { return fmt.int(r.requiredSlots); } },
      { label: 'Freie Kapazität', num: true, render: function (r) { return fmt.int(r.freeSlots); } },
      {
        label: 'Auslastung danach', num: true, render: function (r) {
          var cls = r.utilAfter > 1 ? 't-crit' : (r.utilAfter > S.settings().maxUtilization ? 't-warn' : 't-good');
          return '<span class="' + cls + '">' + (isFinite(r.utilAfter) ? fmt.pct1(r.utilAfter) : '–') + '</span>';
        }
      },
      { label: 'Ø Distanz', num: true, render: function (r) { return isFinite(r.avgDistance) ? fmt.km(r.avgDistance) : '–'; } },
      { label: 'Transportkosten', num: true, render: function (r) { return fmt.eur(r.transportCost); } },
      { label: 'Lagerkosten', num: true, render: function (r) { return fmt.eur(r.storageCost); } },
      { label: 'Gesamtkosten', num: true, render: function (r) { return '<b>' + fmt.eur(r.totalCost) + '</b>'; } },
      { label: 'Score', num: true, render: function (r) { return fmt.dec1(r.scores.total); } },
      { label: 'Regionen', num: true, render: function (r) { return fmt.int(r.regions.length); } }
    ], res.parts);

    updateSplitSum();
  }

  function updateSplitSum() {
    var inputs = U.$$('#table-split input[data-dc]');
    var total = U.sum(inputs, function (i) { return U.num(i.value, 0); });
    var node = U.$('#split-sum');
    node.textContent = 'Summe der Anteile: ' + fmt.dec1(total) + ' %';
    node.className = Math.abs(total - 100) > 0.5 ? 'hint t-warn' : 'hint';
  }

  function recalcManual() {
    if (!lastResult) return;
    var shares = U.$$('#table-split input[data-dc]').map(function (i) {
      return { dcId: i.getAttribute('data-dc'), share: U.num(i.value, 0) / 100 };
    }).filter(function (x) { return x.share > 0; });

    if (!shares.length) { U.toast('Bitte mindestens einen Anteil größer 0 angeben.', 'warn'); return; }

    var res = NS.sim.runManual(params(), shares);
    if (res.error) { U.toast(res.error, 'error'); return; }
    lastResult = res;
    renderResult(res);
    U.toast('Neu berechnet mit manuellen Anteilen.', 'good');
  }

  function renderRegionAssign(res) {
    var rows = res.regionAssign.slice().sort(function (a, b) { return b.pallets - a.pallets; });

    U.renderTable(U.$('#table-regionassign'), [
      { label: 'Kundenregion', render: function (r) { return '<b>' + U.esc(r.regionKey) + '</b>'; } },
      {
        label: 'Beliefert aus', render: function (r) {
          return '<span style="display:inline-flex;align-items:center;gap:7px">' +
            '<i class="dc-dot" style="background:' + NS.charts.seriesColor(NS.dcs.dcIndex(r.dcId)) + '"></i>' +
            U.esc(r.dcName) + '</span>';
        }
      },
      { label: 'Volumen (Pal.)', num: true, render: function (r) { return fmt.int(r.pallets); } },
      {
        label: 'Anteil der Region', num: true, render: function (r) {
          return r.shareOfRegion === undefined ? '100 %' : fmt.pct1(r.shareOfRegion);
        }
      },
      {
        label: 'Distanz', num: true, render: function (r) {
          return (isFinite(r.distance) ? fmt.km(r.distance) : '–') +
            (r.distanceKnown === false ? ' <span class="badge badge-warn">geschätzt</span>' : '');
        }
      },
      { label: 'Transit', num: true, render: function (r) { return isFinite(r.transitDays) ? fmt.dec1(r.transitDays) + ' T' : '–'; } },
      { label: '€/Palette', num: true, render: function (r) { return fmt.dec2(r.costPerPallet); } },
      { label: 'Transportkosten', num: true, render: function (r) { return fmt.eur(r.cost); } }
    ], rows);
  }

  /* ------------------------------------------------------------ Zuordnungen */
  function renderAssignments() {
    var st = S.get();
    var cats = Object.keys(st.assignments).sort();
    var rows = cats.map(function (cat) {
      var a = st.assignments[cat];
      return {
        __id: cat, category: cat, mode: a.mode, targetDays: a.targetDays,
        parts: a.parts || [], metrics: a.metrics || {},
        dataset: a.dataset, periodFrom: a.periodFrom, periodTo: a.periodTo
      };
    });

    U.renderTable(U.$('#table-assignments'), [
      { label: 'Produktkategorie', render: function (r) { return '<b>' + U.esc(r.category) + '</b>'; } },
      { label: 'Modus', render: function (r) { return r.mode === 'single' ? 'Alleinzuordnung' : (r.mode === 'split' ? 'Split' : 'manuell'); } },
      {
        label: 'Zuordnung', wrap: true, render: function (r) {
          return r.parts.map(function (p) {
            return '<span class="badge badge-dc" style="background:' + NS.charts.seriesColor(NS.dcs.dcIndex(p.dcId)) + '">' +
              U.esc(p.dcName) + ' · ' + fmt.pct1(p.share) + '</span>';
          }).join(' ');
        }
      },
      { label: 'Reichweite', num: true, render: function (r) { return fmt.int(r.targetDays) + ' T'; } },
      { label: 'Volumen (Pal.)', num: true, render: function (r) { return fmt.int(r.metrics.pallets); } },
      { label: 'Ziel-Bestand', num: true, render: function (r) { return fmt.int(r.metrics.requiredSlots); } },
      { label: 'Gesamtkosten', num: true, render: function (r) { return fmt.eur(r.metrics.totalCost); } },
      { label: 'Score', num: true, render: function (r) { return fmt.dec1(r.metrics.score); } },
      {
        label: '', render: function (r) {
          return '<span class="tools">' +
            '<button class="btn btn-xs" data-act="load" data-cat="' + U.esc(r.category) + '">Erneut simulieren</button>' +
            '<button class="btn btn-xs btn-danger" data-act="del" data-cat="' + U.esc(r.category) + '">Entfernen</button>' +
            '</span>';
        }
      }
    ], rows);
  }

  /* ------------------------------------------------------------ Events */
  function init() {
    U.$('#seg-simmode').addEventListener('click', function (e) {
      var btn = e.target.closest('.seg-btn');
      if (!btn) return;
      U.$$('.seg-btn', this).forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      simMode = btn.getAttribute('data-value');
      U.$('#field-maxdc').classList.toggle('hidden', simMode !== 'split');
    });

    ['#w-capacity', '#w-transport', '#w-service'].forEach(function (sel) {
      U.$(sel).addEventListener('input', syncWeightOutputs);
    });

    U.$('#btn-weights-reset').addEventListener('click', function () {
      var d = S.defaultSettings().weights;
      U.$('#w-capacity').value = d.capacity;
      U.$('#w-transport').value = d.transport;
      U.$('#w-service').value = d.service;
      syncWeightOutputs();
    });

    U.$('#cfg-maxutil').addEventListener('input', function () {
      var v = U.num(this.value, 85);
      U.$('#cfg-maxutil-out').textContent = v + ' %';
      S.settings().maxUtilization = v / 100;
    });
    U.$('#cfg-maxutil').addEventListener('change', function () { S.emit('settings'); });

    U.$('#sim-dataset').addEventListener('change', refreshControls);
    U.$('#sim-category').addEventListener('change', syncTargetDays);

    U.$('#btn-simulate').addEventListener('click', simulate);
    U.$('#btn-simulate-all').addEventListener('click', simulateAll);
    U.$('#btn-recalc-split').addEventListener('click', recalcManual);

    U.$('#table-split').addEventListener('input', function (e) {
      if (e.target.matches('input[data-dc]')) updateSplitSum();
    });

    U.$('#btn-apply-assign').addEventListener('click', function () {
      if (!lastResult) { U.toast('Bitte zuerst eine Simulation ausführen.', 'warn'); return; }
      if (NS.sim.applyResult(lastResult)) {
        U.toast('Zuordnung für „' + lastResult.category + '“ übernommen.', 'good');
        renderAssignments();
      }
    });

    U.$('#btn-clear-assign').addEventListener('click', function () {
      if (!Object.keys(S.get().assignments).length) return;
      if (!confirm('Alle übernommenen Zuordnungen zurücksetzen?')) return;
      S.clearAssignments();
      renderAssignments();
      U.toast('Zuordnungen zurückgesetzt.', 'warn');
    });

    U.$('#table-assignments').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var cat = btn.getAttribute('data-cat');
      if (btn.getAttribute('data-act') === 'del') {
        delete S.get().assignments[cat];
        S.emit('assignments');
        renderAssignments();
        U.toast('Zuordnung für „' + cat + '“ entfernt.', 'warn');
      } else {
        var a = S.get().assignments[cat];
        U.$('#sim-category').value = cat;
        if (a && a.dataset) U.$('#sim-dataset').value = a.dataset;
        syncTargetDays();
        simulate();
      }
    });

    S.onChange(function (reason) {
      if (['records', 'reset', 'project'].indexOf(reason) >= 0) refreshControls();
      if (reason === 'assignments' || reason === 'dcs') renderAssignments();
    });

    refreshControls();
  }

  NS.simui = {
    init: init, refreshControls: refreshControls, simulate: simulate,
    renderAssignments: renderAssignments,
    getLastResult: function () { return lastResult; }
  };
})(window.LNP);
