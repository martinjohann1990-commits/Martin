/* =========================================================================
   dashboard.js – KPI-Kacheln, Diagramme und Detailtabelle des Netzwerks
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state, fmt = U.fmt;

  /* ==================================================================== *
   *  Netzwerk-Auswertung (auch von Szenarien und Export genutzt)
   * ==================================================================== */
  function networkSummary() {
    var st = S.get();
    var dcs = S.activeDCs();

    var perDC = dcs.map(function (dc) {
      return {
        dcId: dc.id, name: dc.name, code: dc.code, capacity: U.num(dc.capacity, 0),
        baseUsed: U.num(dc.usedSlots, 0), assignedSlots: 0, pallets: 0,
        transportCost: 0, storageCost: 0, handlingCost: 0,
        fixedCost: U.num(dc.fixedCostPerPeriod, 0),
        categories: [], distanceWeighted: 0, serviceWeighted: 0
      };
    });
    var byId = Object.create(null);
    perDC.forEach(function (d) { byId[d.dcId] = d; });

    var rows = [];
    var categories = Object.keys(st.assignments).sort();

    categories.forEach(function (cat) {
      var a = st.assignments[cat];
      (a.parts || []).forEach(function (p) {
        var d = byId[p.dcId];
        if (d) {
          d.assignedSlots += U.num(p.slots, 0);
          d.pallets += U.num(p.pallets, 0);
          d.transportCost += U.num(p.transportCost, 0);
          d.storageCost += U.num(p.storageCost, 0);
          d.handlingCost += U.num(p.handlingCost, 0);
          d.categories.push(cat);
          d.distanceWeighted += U.num(p.avgDistance, 0) * U.num(p.pallets, 0);
          d.serviceWeighted += U.num(p.score, 0) * U.num(p.pallets, 0);
        }
        rows.push({
          category: cat, mode: a.mode, targetDays: a.targetDays,
          dcId: p.dcId, dcName: p.dcName || (S.getDC(p.dcId) || {}).name || '–',
          share: U.num(p.share, 0), pallets: U.num(p.pallets, 0), slots: U.num(p.slots, 0),
          transportCost: U.num(p.transportCost, 0), storageCost: U.num(p.storageCost, 0),
          handlingCost: U.num(p.handlingCost, 0), totalCost: U.num(p.totalCost, 0),
          avgDistance: p.avgDistance, avgTransitDays: p.avgTransitDays,
          score: U.num(p.score, 0), feasible: p.feasible !== false,
          scores: p.scores || null
        });
      });
    });

    perDC.forEach(function (d) {
      d.usedTotal = d.baseUsed + d.assignedSlots;
      d.free = Math.max(d.capacity - d.usedTotal, 0);
      d.overload = Math.max(d.usedTotal - d.capacity, 0);
      d.utilization = d.capacity > 0 ? d.usedTotal / d.capacity : NaN;
      d.avgDistance = d.pallets > 0 ? d.distanceWeighted / d.pallets : NaN;
      d.score = d.pallets > 0 ? d.serviceWeighted / d.pallets : NaN;
      d.totalCost = d.transportCost + d.storageCost + d.handlingCost + (d.pallets > 0 ? d.fixedCost : 0);
    });

    var capacity = U.sum(perDC, function (d) { return d.capacity; });
    var used = U.sum(perDC, function (d) { return d.usedTotal; });
    var pallets = U.sum(rows, function (r) { return r.pallets; });
    var transport = U.sum(rows, function (r) { return r.transportCost; });
    var storage = U.sum(rows, function (r) { return r.storageCost; });
    var handling = U.sum(rows, function (r) { return r.handlingCost; });
    var fixed = U.sum(perDC, function (d) { return d.pallets > 0 ? d.fixedCost : 0; });

    var allCats = S.categories('all');

    return {
      perDC: perDC,
      rows: rows,
      categories: categories,
      categoriesTotal: allCats.length,
      categoriesAssigned: categories.length,
      capacity: capacity,
      usedSlots: used,
      assignedSlots: U.sum(perDC, function (d) { return d.assignedSlots; }),
      baseUsed: U.sum(perDC, function (d) { return d.baseUsed; }),
      utilization: capacity > 0 ? used / capacity : NaN,
      pallets: pallets,
      transportCost: transport,
      storageCost: storage,
      handlingCost: handling,
      fixedCost: fixed,
      totalCost: transport + storage + handling + fixed,
      costPerPallet: pallets > 0 ? (transport + storage + handling + fixed) / pallets : NaN,
      avgDistance: pallets > 0 ? U.sum(rows, function (r) { return U.num(r.avgDistance, 0) * r.pallets; }) / pallets : NaN,
      avgScore: pallets > 0 ? U.sum(rows, function (r) { return r.score * r.pallets; }) / pallets : NaN,
      overloadedDCs: perDC.filter(function (d) { return d.overload > 0; }).length,
      infeasible: rows.filter(function (r) { return !r.feasible; }).length
    };
  }

  /* ==================================================================== *
   *  Rendering
   * ==================================================================== */
  function render() {
    var st = S.get();
    var hasBasis = st.dcs.length > 0 && st.records.length > 0;
    var sum = networkSummary();
    var hasResults = sum.rows.length > 0;

    U.$('#dash-empty').classList.toggle('hidden', hasBasis);
    U.$('#dash-body').classList.toggle('hidden', !hasBasis);
    if (!hasBasis) return;

    renderKPIs(sum, hasResults);
    renderCapacityChart(sum);
    renderCostChart(sum);
    renderVolumeChart(sum);
    renderDetailTable(sum);
    NS.mapview.render();
  }

  function renderKPIs(sum, hasResults) {
    var util = sum.utilization;
    var utilAccent = !isFinite(util) ? 'var(--series-1)'
      : (util > 1 ? 'var(--critical)' : (util > S.settings().maxUtilization ? 'var(--warning)' : 'var(--series-3)'));

    var tiles = [
      {
        label: 'Gesamtkapazität', value: fmt.int(sum.capacity), unit: 'Stellplätze',
        sub: U.tf('{0} aktive Standorte', S.activeDCs().length), accent: 'var(--series-1)'
      },
      {
        label: 'Auslastung', value: isFinite(util) ? fmt.pct1(util) : '–',
        sub: U.tf('{0} belegt · {1} frei', fmt.int(sum.usedSlots), fmt.int(Math.max(sum.capacity - sum.usedSlots, 0))),
        bar: isFinite(util) ? util : 0, accent: utilAccent
      },
      {
        label: 'Ziel-Bestand (zugeordnet)', value: fmt.int(sum.assignedSlots), unit: 'Stellplätze',
        sub: U.tf('{0} von {1} Kategorien zugeordnet', sum.categoriesAssigned, sum.categoriesTotal),
        accent: 'var(--series-7)'
      },
      {
        label: 'Transportkosten', value: fmt.eur(sum.transportCost),
        sub: isFinite(sum.avgDistance) ? U.tf('Ø Distanz {0}', fmt.km(sum.avgDistance)) : U.t('im Betrachtungszeitraum'),
        accent: 'var(--series-2)'
      },
      {
        label: 'Lager- & Handlingkosten', value: fmt.eur(sum.storageCost + sum.handlingCost),
        sub: U.tf('davon Lager {0}', fmt.eur(sum.storageCost)),
        accent: 'var(--series-4)'
      },
      {
        label: 'Gesamtkosten', value: fmt.eur(sum.totalCost),
        sub: isFinite(sum.costPerPallet) ? U.tf('{0} € je Palette', fmt.dec2(sum.costPerPallet)) : U.t('inkl. Fixkosten'),
        accent: 'var(--series-6)'
      }
    ];

    if (hasResults) {
      tiles.push({
        label: 'Ø Bewertung', value: fmt.dec1(sum.avgScore), unit: '/ 100',
        sub: sum.infeasible ? U.tf('{0} Zuordnung(en) über Kapazität', sum.infeasible) : U.t('alle Zuordnungen kapazitätsgerecht'),
        bar: sum.avgScore / 100,
        accent: sum.infeasible ? 'var(--critical)' : 'var(--series-3)'
      });
    }

    NS.charts.renderKPIs('#kpi-grid', tiles);
  }

  function renderCapacityChart(sum) {
    var dcs = sum.perDC;
    var labels = dcs.map(function (d) { return d.code || d.name; });
    var c = NS.charts.chrome();

    NS.charts.bar('chart-capacity', labels, [
      { label: 'Grundbelegung', data: dcs.map(function (d) { return Math.round(d.baseUsed); }), color: NS.charts.seriesColor(3) },
      { label: 'Zugeordneter Ziel-Bestand', data: dcs.map(function (d) { return Math.round(d.assignedSlots); }), color: NS.charts.seriesColor(0) },
      { label: 'Freie Kapazität', data: dcs.map(function (d) { return Math.round(d.free); }), color: c.grid },
      { label: 'Überlast', data: dcs.map(function (d) { return Math.round(d.overload); }), color: NS.charts.cssVar('--critical', '#d03b3b') }
    ], {
      stacked: true,
      valueFormat: function (v) { return fmt.int(v); },
      tooltipFormat: function (v) { return U.tf('{0} Stellplätze', fmt.int(v)); },
      tooltipFooter: function (items) {
        var d = dcs[items[0].dataIndex];
        return U.tf('Auslastung: {0} · Kapazität: {1}',
          isFinite(d.utilization) ? fmt.pct1(d.utilization) : '–', fmt.int(d.capacity));
      }
    });

    NS.charts.legend('#legend-capacity', [
      { label: 'Grundbelegung', color: NS.charts.seriesColor(3) },
      { label: 'Zugeordneter Ziel-Bestand', color: NS.charts.seriesColor(0) },
      { label: 'Freie Kapazität', color: c.grid },
      { label: 'Überlast (Kapazität überschritten)', color: NS.charts.cssVar('--critical', '#d03b3b') }
    ]);
  }

  function renderCostChart(sum) {
    var dcs = sum.perDC;
    var labels = dcs.map(function (d) { return d.code || d.name; });

    NS.charts.bar('chart-cost', labels, [
      { label: 'Transport', data: dcs.map(function (d) { return Math.round(d.transportCost); }), color: NS.charts.seriesColor(0) },
      { label: 'Lager', data: dcs.map(function (d) { return Math.round(d.storageCost); }), color: NS.charts.seriesColor(1) },
      { label: 'Handling', data: dcs.map(function (d) { return Math.round(d.handlingCost); }), color: NS.charts.seriesColor(2) },
      { label: 'Fixkosten', data: dcs.map(function (d) { return Math.round(d.pallets > 0 ? d.fixedCost : 0); }), color: NS.charts.seriesColor(3) }
    ], {
      stacked: true,
      valueFormat: function (v) { return fmt.eur(v); },
      tooltipFormat: function (v) { return fmt.eurExact(v); },
      tooltipFooter: function (items) {
        var d = dcs[items[0].dataIndex];
        return U.tf('Gesamt: {0}', fmt.eur(d.totalCost)) + (d.pallets > 0 ? ' · ' + fmt.dec2(d.totalCost / d.pallets) + ' €/' + U.t('Palette') : '');
      }
    });

    NS.charts.legend('#legend-cost', [
      { label: 'Transport', color: NS.charts.seriesColor(0) },
      { label: 'Lager', color: NS.charts.seriesColor(1) },
      { label: 'Handling', color: NS.charts.seriesColor(2) },
      { label: 'Fixkosten', color: NS.charts.seriesColor(3) }
    ]);
  }

  function renderVolumeChart(sum) {
    var cats = sum.categories;
    var dcIds = U.unique(sum.rows.map(function (r) { return r.dcId; }));

    var datasets = dcIds.map(function (dcId) {
      var idx = NS.dcs.dcIndex(dcId);
      var dc = S.getDC(dcId);
      return {
        label: dc ? (dc.code || dc.name) : '–',
        color: NS.charts.seriesColor(idx),
        data: cats.map(function (cat) {
          var hit = sum.rows.filter(function (r) { return r.category === cat && r.dcId === dcId; });
          return Math.round(U.sum(hit, function (h) { return h.pallets; }));
        })
      };
    });

    NS.charts.bar('chart-volume', cats, datasets, {
      stacked: true,
      horizontal: cats.length > 6,
      valueFormat: function (v) { return fmt.int(v); },
      tooltipFormat: function (v) { return U.tf('{0} Paletten', fmt.int(v)); }
    });

    NS.charts.legend('#legend-volume', datasets.map(function (d) {
      return { label: d.label, color: d.color };
    }));
  }

  function renderDetailTable(sum) {
    var rows = sum.rows.slice().sort(function (a, b) {
      return a.category === b.category ? b.pallets - a.pallets : (a.category < b.category ? -1 : 1);
    });

    U.renderTable(U.$('#table-detail'), [
      { label: 'Produktkategorie', render: function (r) { return '<b>' + U.esc(r.category) + '</b>'; } },
      {
        label: 'Distributionszentrum', render: function (r) {
          return '<span style="display:inline-flex;align-items:center;gap:7px">' +
            '<i class="dc-dot" style="background:' + NS.charts.seriesColor(NS.dcs.dcIndex(r.dcId)) + '"></i>' +
            U.esc(r.dcName) + '</span>';
        }
      },
      { label: 'Modus', render: function (r) { return U.t(r.mode === 'single' ? 'Alleinzuordnung' : (r.mode === 'split' ? 'Split' : 'manuell')); } },
      { label: 'Anteil', num: true, render: function (r) { return fmt.pct1(r.share); } },
      { label: 'Volumen (Pal.)', num: true, render: function (r) { return fmt.int(r.pallets); } },
      { label: 'Ziel-Bestand', num: true, render: function (r) { return fmt.int(r.slots); } },
      { label: 'Reichweite (Tage)', num: true, render: function (r) { return fmt.int(r.targetDays); } },
      { label: 'Ø Distanz', num: true, render: function (r) { return isFinite(r.avgDistance) ? fmt.km(r.avgDistance) : '–'; } },
      { label: 'Transport', num: true, render: function (r) { return fmt.eur(r.transportCost); } },
      { label: 'Lager', num: true, render: function (r) { return fmt.eur(r.storageCost); } },
      { label: 'Handling', num: true, render: function (r) { return fmt.eur(r.handlingCost); } },
      { label: 'Gesamt', num: true, render: function (r) { return '<b>' + fmt.eur(r.totalCost) + '</b>'; } },
      { label: 'Score', num: true, render: function (r) { return U.scoreBar(r.score, NS.charts.seriesColor(NS.dcs.dcIndex(r.dcId))); } },
      {
        label: 'Kapazität', render: function (r) {
          return r.feasible ? '<span class="badge badge-good">' + U.t('ausreichend') + '</span>'
            : '<span class="badge badge-crit">' + U.t('überschritten') + '</span>';
        }
      }
    ], rows);
  }

  /* ------------------------------------------------------------ Export-Hook */
  function detailCSV() {
    var sum = networkSummary();
    var head = ['Kategorie', 'DC', 'Modus', 'Anteil %', 'Volumen Paletten', 'Ziel-Bestand Stellplätze',
      'Zielreichweite Tage', 'Ø Distanz km', 'Ø Transitzeit Tage', 'Transportkosten EUR',
      'Lagerkosten EUR', 'Handlingkosten EUR', 'Gesamtkosten EUR', 'Score', 'Kapazität ausreichend'].map(U.t);
    var body = sum.rows.map(function (r) {
      return [r.category, r.dcName, r.mode, U.round(r.share * 100, 2), U.round(r.pallets, 1), U.round(r.slots, 1),
        r.targetDays, U.round(r.avgDistance, 1), U.round(r.avgTransitDays, 2), U.round(r.transportCost, 2),
        U.round(r.storageCost, 2), U.round(r.handlingCost, 2), U.round(r.totalCost, 2),
        U.round(r.score, 1), U.t(r.feasible ? 'ja' : 'nein')];
    });
    return [head].concat(body);
  }

  function init() {
    U.$('#btn-export-detail').addEventListener('click', function () {
      U.downloadCSV(detailCSV(), 'netplan_detailergebnisse_' + U.timestamp() + '.csv');
      U.toast('CSV-Datei erzeugt.', 'good');
    });

    S.onChange(function (reason) {
      if (['dcs', 'records', 'assignments', 'settings', 'regions', 'reset', 'project'].indexOf(reason) >= 0) render();
    });
  }

  NS.dashboard = { init: init, render: render, networkSummary: networkSummary, detailCSV: detailCSV };
})(window.LNP);
