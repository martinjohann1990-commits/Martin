/* =========================================================================
   scenarios.js – Szenarien anlegen, vergleichen, laden und löschen
   ---------------------------------------------------------------------------
   Ein Szenario friert DC-Konfiguration, Einstellungen (Gewichtungen,
   Zielreichweiten, Kostensätze) und die übernommenen Zuordnungen ein.
   Die importierten Daten bleiben davon unberührt.
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state, fmt = U.fmt;

  /* ------------------------------------------------------------ Anlegen */
  function snapshot(name) {
    var st = S.get();
    var sum = NS.dashboard.networkSummary();

    return {
      id: U.id('scn'),
      name: name || U.tf('Szenario {0}', st.scenarios.length + 1),
      createdAt: new Date().toISOString(),
      settings: JSON.parse(JSON.stringify(st.settings)),
      dcs: JSON.parse(JSON.stringify(st.dcs)),
      assignments: JSON.parse(JSON.stringify(st.assignments)),
      kpis: {
        dcCount: S.activeDCs().length,
        capacity: sum.capacity,
        usedSlots: sum.usedSlots,
        assignedSlots: sum.assignedSlots,
        utilization: sum.utilization,
        pallets: sum.pallets,
        transportCost: sum.transportCost,
        storageCost: sum.storageCost,
        handlingCost: sum.handlingCost,
        fixedCost: sum.fixedCost,
        totalCost: sum.totalCost,
        costPerPallet: sum.costPerPallet,
        avgDistance: sum.avgDistance,
        avgScore: sum.avgScore,
        categoriesAssigned: sum.categoriesAssigned,
        categoriesTotal: sum.categoriesTotal,
        infeasible: sum.infeasible,
        overloadedDCs: sum.overloadedDCs,
        targetDaysGlobal: st.settings.targetDaysGlobal,
        weights: JSON.parse(JSON.stringify(st.settings.weights))
      }
    };
  }

  function save() {
    var st = S.get();
    if (!Object.keys(st.assignments).length) {
      U.toast('Es sind noch keine Zuordnungen übernommen – das Szenario hätte keine Ergebnisse.', 'warn');
      return;
    }
    var name = U.$('#scn-name').value.trim();
    var scn = snapshot(name);
    st.scenarios.push(scn);
    S.emit('scenarios');
    U.$('#scn-name').value = '';
    render();
    U.toast(U.tf('Szenario „{0}“ gespeichert.', scn.name), 'good');
  }

  /* ------------------------------------------------------------ Laden */
  function load(scnId) {
    var st = S.get();
    var scn = st.scenarios.find(function (s) { return s.id === scnId; });
    if (!scn) return;
    if (!window.confirm(U.tf('Szenario „{0}“ laden? Die aktuelle DC-Konfiguration, die Einstellungen und die Zuordnungen werden dadurch ersetzt (importierte Daten bleiben erhalten).', scn.name))) return;

    st.settings = Object.assign(S.defaultSettings(), JSON.parse(JSON.stringify(scn.settings)));
    st.dcs = JSON.parse(JSON.stringify(scn.dcs)).map(S.normalizeDC);
    st.assignments = JSON.parse(JSON.stringify(scn.assignments));
    S.emit('project');
    U.toast(U.tf('Szenario „{0}“ geladen.', scn.name), 'good');
  }

  function remove(scnId) {
    var st = S.get();
    var scn = st.scenarios.find(function (s) { return s.id === scnId; });
    if (!scn || !window.confirm(U.tf('Szenario „{0}“ löschen?', scn.name))) return;
    st.scenarios = st.scenarios.filter(function (s) { return s.id !== scnId; });
    S.emit('scenarios');
    render();
    U.toast('Szenario gelöscht.', 'warn');
  }

  function rename(scnId) {
    var st = S.get();
    var scn = st.scenarios.find(function (s) { return s.id === scnId; });
    if (!scn) return;
    var name = U.askText('Neue Bezeichnung für das Szenario:', scn.name);
    if (name === null) return;
    scn.name = name.trim() || scn.name;
    S.emit('scenarios');
    render();
  }

  /* ------------------------------------------------------------ Vergleich */
  /** Spalten des Vergleichs: aktueller Stand + alle gespeicherten Szenarien. */
  function comparisonSet() {
    var st = S.get();
    var live = snapshot(U.t('Aktueller Stand'));
    live.id = '__live';
    live.isLive = true;
    return [live].concat(st.scenarios);
  }

  var METRICS = [
    { key: 'dcCount', label: 'Genutzte DCs', fmt: function (v) { return fmt.int(v); } },
    { key: 'capacity', label: 'Gesamtkapazität (Stellplätze)', fmt: function (v) { return fmt.int(v); } },
    { key: 'assignedSlots', label: 'Ziel-Bestand zugeordnet', fmt: function (v) { return fmt.int(v); } },
    { key: 'utilization', label: 'Auslastung', fmt: function (v) { return isFinite(v) ? fmt.pct1(v) : '–'; }, lowerBetter: null },
    { key: 'pallets', label: 'Volumen (Paletten)', fmt: function (v) { return fmt.int(v); } },
    { key: 'transportCost', label: 'Transportkosten', fmt: function (v) { return fmt.eur(v); }, lowerBetter: true },
    { key: 'storageCost', label: 'Lagerkosten', fmt: function (v) { return fmt.eur(v); }, lowerBetter: true },
    { key: 'handlingCost', label: 'Handlingkosten', fmt: function (v) { return fmt.eur(v); }, lowerBetter: true },
    { key: 'fixedCost', label: 'Fixkosten', fmt: function (v) { return fmt.eur(v); }, lowerBetter: true },
    { key: 'totalCost', label: 'Gesamtkosten', fmt: function (v) { return '<b>' + fmt.eur(v) + '</b>'; }, lowerBetter: true },
    { key: 'costPerPallet', label: 'Kosten je Palette', fmt: function (v) { return isFinite(v) ? fmt.dec2(v) + ' €' : '–'; }, lowerBetter: true },
    { key: 'avgDistance', label: 'Ø Distanz', fmt: function (v) { return isFinite(v) ? fmt.km(v) : '–'; }, lowerBetter: true },
    { key: 'avgScore', label: 'Ø Bewertung (0–100)', fmt: function (v) { return isFinite(v) ? fmt.dec1(v) : '–'; }, lowerBetter: false },
    { key: 'targetDaysGlobal', label: 'Zielreichweite global (Tage)', fmt: function (v) { return fmt.int(v); } },
    { key: 'categoriesAssigned', label: 'Zugeordnete Kategorien', fmt: function (v, s) { return fmt.int(v) + ' / ' + fmt.int(s.kpis.categoriesTotal); } },
    { key: 'infeasible', label: 'Kapazitätsverletzungen', fmt: function (v) { return v > 0 ? '<span class="t-crit">' + fmt.int(v) + '</span>' : '<span class="t-good">0</span>'; }, lowerBetter: true }
  ];

  function render() {
    var set = comparisonSet();
    var st = S.get();

    U.$('#scn-empty').classList.toggle('hidden', st.scenarios.length > 0);
    U.$('#scn-count-hint').textContent = st.scenarios.length
      ? U.tf('{0} gespeicherte Szenarien im Vergleich zum aktuellen Stand', st.scenarios.length)
      : U.t('Noch kein Szenario gespeichert – angezeigt wird nur der aktuelle Stand.');

    renderTable(set);
    renderCharts(set);
    renderMatrix(set);
  }

  function renderTable(set) {
    var table = U.$('#table-scenarios');

    var head = '<thead><tr><th>' + U.t('Kennzahl') + '</th>' + set.map(function (s) {
      return '<th class="num">' + (s.isLive ? '<span class="badge">' + U.t('live') + '</span> ' : '') + U.esc(s.name) + '</th>';
    }).join('') + '</tr></thead>';

    var body = METRICS.map(function (m) {
      var values = set.map(function (s) { return s.kpis[m.key]; });
      var best = null;
      if (m.lowerBetter === true || m.lowerBetter === false) {
        var valid = values.filter(function (v) { return isFinite(v); });
        if (valid.length > 1) best = m.lowerBetter ? Math.min.apply(null, valid) : Math.max.apply(null, valid);
      }
      return '<tr><th style="position:static">' + U.esc(U.t(m.label)) + '</th>' +
        set.map(function (s) {
          var v = s.kpis[m.key];
          var isBest = best !== null && isFinite(v) && Math.abs(v - best) < 1e-9;
          return '<td class="num' + (isBest ? ' t-good' : '') + '">' + m.fmt(v, s) +
            (isBest ? ' <span class="badge badge-good">' + U.t('best') + '</span>' : '') + '</td>';
        }).join('') + '</tr>';
    }).join('');

    var actions = '<tr><th style="position:static">' + U.t('Aktionen') + '</th>' + set.map(function (s) {
      if (s.isLive) return '<td class="num"><span class="t-muted">–</span></td>';
      return '<td class="num"><span class="tools" style="justify-content:flex-end">' +
        '<button class="btn btn-xs" data-act="load" data-id="' + s.id + '">' + U.t('Laden') + '</button>' +
        '<button class="btn btn-xs" data-act="rename" data-id="' + s.id + '">' + U.t('Umbenennen') + '</button>' +
        '<button class="btn btn-xs btn-danger" data-act="del" data-id="' + s.id + '">' + U.t('Löschen') + '</button>' +
        '</span></td>';
    }).join('') + '</tr>';

    table.innerHTML = head + '<tbody>' + body + actions + '</tbody>';
  }

  function renderCharts(set) {
    var labels = set.map(function (s) { return s.name; });

    NS.charts.bar('chart-scn-cost', labels, [
      { label: 'Transport', data: set.map(function (s) { return U.round(s.kpis.transportCost, 0); }), color: NS.charts.seriesColor(0) },
      { label: 'Lager', data: set.map(function (s) { return U.round(s.kpis.storageCost, 0); }), color: NS.charts.seriesColor(1) },
      { label: 'Handling', data: set.map(function (s) { return U.round(s.kpis.handlingCost, 0); }), color: NS.charts.seriesColor(2) },
      { label: 'Fixkosten', data: set.map(function (s) { return U.round(s.kpis.fixedCost, 0); }), color: NS.charts.seriesColor(3) }
    ], {
      stacked: true,
      valueFormat: function (v) { return fmt.eur(v); },
      tooltipFormat: function (v) { return fmt.eurExact(v); },
      tooltipFooter: function (items) {
        return U.tf('Gesamt: {0}', fmt.eur(set[items[0].dataIndex].kpis.totalCost));
      }
    });

    NS.charts.legend('#legend-scn-cost', [
      { label: 'Transport', color: NS.charts.seriesColor(0) },
      { label: 'Lager', color: NS.charts.seriesColor(1) },
      { label: 'Handling', color: NS.charts.seriesColor(2) },
      { label: 'Fixkosten', color: NS.charts.seriesColor(3) }
    ]);

    NS.charts.bar('chart-scn-kpi', labels, [
      {
        label: 'Auslastung (%)', color: NS.charts.seriesColor(0),
        data: set.map(function (s) { return isFinite(s.kpis.utilization) ? U.round(s.kpis.utilization * 100, 1) : 0; })
      },
      {
        label: 'Ø Bewertung (0–100)', color: NS.charts.seriesColor(2),
        data: set.map(function (s) { return isFinite(s.kpis.avgScore) ? U.round(s.kpis.avgScore, 1) : 0; })
      }
    ], {
      valueFormat: function (v) { return fmt.int(v); },
      tooltipFormat: function (v) { return fmt.dec1(v); },
      axisTitle: 'Prozent bzw. Punkte (0–100)'
    });

    NS.charts.legend('#legend-scn-kpi', [
      { label: 'Auslastung (%)', color: NS.charts.seriesColor(0) },
      { label: 'Ø Bewertung (0–100)', color: NS.charts.seriesColor(2) }
    ]);
  }

  function renderMatrix(set) {
    var table = U.$('#table-scn-matrix');
    var cats = U.unique([].concat.apply([], set.map(function (s) { return Object.keys(s.assignments || {}); }))).sort();

    if (!cats.length) {
      table.innerHTML = '<tbody><tr><td class="t-muted">' + U.t('Noch keine Zuordnungen vorhanden.') + '</td></tr></tbody>';
      return;
    }

    var head = '<thead><tr><th>' + U.t('Produktkategorie') + '</th>' + set.map(function (s) {
      return '<th>' + U.esc(s.name) + '</th>';
    }).join('') + '</tr></thead>';

    var body = cats.map(function (cat) {
      return '<tr><td><b>' + U.esc(cat) + '</b></td>' + set.map(function (s) {
        var a = (s.assignments || {})[cat];
        if (!a) return '<td class="t-muted">–</td>';
        return '<td class="wrap">' + (a.parts || []).map(function (p) {
          var dcIdx = (s.dcs || []).findIndex(function (d) { return d.id === p.dcId; });
          return '<span class="badge badge-dc" style="background:' + NS.charts.seriesColor(dcIdx) + '">' +
            U.esc(p.dcName) + ' · ' + fmt.pct(p.share) + '</span>';
        }).join(' ') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    table.innerHTML = head + '<tbody>' + body + '</tbody>';
  }

  /* ------------------------------------------------------------ Export-Daten */
  function comparisonRows() {
    var set = comparisonSet();
    var head = [U.t('Kennzahl')].concat(set.map(function (s) { return s.name; }));
    var rows = METRICS.map(function (m) {
      // Anteile werden im Export als Prozentwert geschrieben
      var isRatio = m.key === 'utilization';
      var label = isRatio ? U.t(m.label) + ' %' : U.t(m.label);
      return [label].concat(set.map(function (s) {
        var v = s.kpis[m.key];
        if (!isFinite(v)) return '';
        return U.round(isRatio ? v * 100 : v, isRatio ? 2 : 3);
      }));
    });
    return { set: set, rows: [head].concat(rows) };
  }

  /* ------------------------------------------------------------ Events */
  function init() {
    U.$('#btn-scn-save').addEventListener('click', save);
    U.$('#scn-name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') save();
    });

    U.$('#table-scenarios').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (act === 'load') load(id);
      else if (act === 'del') remove(id);
      else if (act === 'rename') rename(id);
    });

    S.onChange(function (reason) {
      if (['assignments', 'dcs', 'settings', 'scenarios', 'reset', 'project', 'records'].indexOf(reason) >= 0) render();
    });
  }

  NS.scenarios = {
    init: init, render: render, save: save, snapshot: snapshot,
    comparisonRows: comparisonRows, comparisonSet: comparisonSet, METRICS: METRICS
  };
})(window.LNP);
