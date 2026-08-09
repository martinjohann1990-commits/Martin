/* =========================================================================
   exporter.js – Export nach Excel/CSV sowie Sichern/Laden des Projekts
   Alle Dateien werden im Browser erzeugt (kein Server-Roundtrip).
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state, fmt = U.fmt;
  var MAX_RAW_ROWS = 50000;

  /* ------------------------------------------------------------ Blätter */
  function sheetKPI(sum) {
    var st = S.get();
    var rows = [
      ['NetPlan – Auswertung Logistik-Netzwerk'],
      ['Erstellt am', new Date().toLocaleString(NS.i18n ? NS.i18n.locale() : 'de-DE')],
      [],
      ['Kennzahl', 'Wert', 'Einheit'],
      ['Aktive Distributionszentren', S.activeDCs().length, 'Anzahl'],
      ['Gesamtkapazität', U.round(sum.capacity, 0), 'Stellplätze'],
      ['Belegte Stellplätze', U.round(sum.usedSlots, 0), 'Stellplätze'],
      ['davon Grundbelegung', U.round(sum.baseUsed, 0), 'Stellplätze'],
      ['davon zugeordneter Ziel-Bestand', U.round(sum.assignedSlots, 0), 'Stellplätze'],
      ['Auslastung', U.round(sum.utilization * 100, 2), '%'],
      ['Volumen gesamt', U.round(sum.pallets, 1), 'Paletten'],
      ['Transportkosten', U.round(sum.transportCost, 2), 'EUR'],
      ['Lagerkosten', U.round(sum.storageCost, 2), 'EUR'],
      ['Handlingkosten', U.round(sum.handlingCost, 2), 'EUR'],
      ['Fixkosten', U.round(sum.fixedCost, 2), 'EUR'],
      ['Gesamtkosten', U.round(sum.totalCost, 2), 'EUR'],
      ['Kosten je Palette', U.round(sum.costPerPallet, 3), 'EUR'],
      ['Ø Distanz (mengengewichtet)', U.round(sum.avgDistance, 1), 'km'],
      ['Ø Bewertung', U.round(sum.avgScore, 1), 'Punkte (0–100)'],
      ['Zugeordnete Kategorien', sum.categoriesAssigned + ' von ' + sum.categoriesTotal, ''],
      ['Kapazitätsverletzungen', sum.infeasible, 'Zuordnungen'],
      [],
      ['Parameter', 'Wert', 'Einheit'],
      ['Zielreichweite global', st.settings.targetDaysGlobal, 'Tage'],
      ['Sicherheitsaufschlag Bestand', st.settings.stockFactor, 'Faktor'],
      ['Gewichtung Kapazität', st.settings.weights.capacity, '%'],
      ['Gewichtung Transport', st.settings.weights.transport, '%'],
      ['Gewichtung Zielreichweite', st.settings.weights.service, '%'],
      ['Ziel-Auslastungsgrenze', U.round(st.settings.maxUtilization * 100, 0), '%'],
      ['Transportkosten je Paletten-km', st.settings.costPerPalletKm, 'EUR'],
      ['Transport-Grundkosten je Palette', st.settings.costBasePerPallet, 'EUR'],
      ['Lagerkosten je Stellplatz/Monat', st.settings.storageCostPerSlotMonth, 'EUR'],
      ['Handlingkosten je Palette', st.settings.handlingCostPerPallet, 'EUR'],
      ['Stück je Palette', st.settings.qtyPerPallet, 'Stück'],
      ['Volumen je Palette', st.settings.volPerPallet, 'm³']
    ];
    // Erste Spalte (Bezeichnung) und Einheit übersetzen, Zahlen unverändert lassen
    return rows.map(function (r) {
      return r.map(function (cell, i) {
        return (i === 0 || i === 2) && typeof cell === 'string' ? U.t(cell) : cell;
      });
    });
  }

  function sheetDCs(sum) {
    var head = ['Name', 'Code', 'Region', 'Land', 'Breitengrad', 'Längengrad', 'Aktiv',
      'Kapazität', 'Grundbelegung', 'Zugeordneter Ziel-Bestand', 'Belegt gesamt', 'Frei', 'Auslastung %',
      'Volumen Paletten', 'Transportkosten EUR', 'Lagerkosten EUR', 'Handlingkosten EUR', 'Fixkosten EUR',
      'Gesamtkosten EUR', 'Ø Distanz km', 'Kategorien'].map(U.t);
    var byId = Object.create(null);
    sum.perDC.forEach(function (d) { byId[d.dcId] = d; });

    var rows = S.get().dcs.map(function (dc) {
      var d = byId[dc.id] || {};
      return [dc.name, dc.code, dc.region, dc.country,
        U.isNum(dc.lat) ? dc.lat : '', U.isNum(dc.lng) ? dc.lng : '', U.t(dc.active ? 'ja' : 'nein'),
        U.round(dc.capacity, 0), U.round(dc.usedSlots, 0), U.round(d.assignedSlots, 1),
        U.round(d.usedTotal, 1), U.round(d.free, 1), U.round(d.utilization * 100, 2),
        U.round(d.pallets, 1), U.round(d.transportCost, 2), U.round(d.storageCost, 2),
        U.round(d.handlingCost, 2), U.round(dc.fixedCostPerPeriod, 2), U.round(d.totalCost, 2),
        U.round(d.avgDistance, 1), (d.categories || []).join(', ')];
    });
    return [head].concat(rows);
  }

  function sheetAssignments() {
    var st = S.get();
    var head = ['Produktkategorie', 'Modus', 'Zielreichweite Tage', 'Datenbasis', 'Periode von', 'Periode bis',
      'DC', 'Anteil %', 'Volumen Paletten', 'Ziel-Bestand Stellplätze', 'Transportkosten EUR',
      'Lagerkosten EUR', 'Handlingkosten EUR', 'Gesamtkosten EUR', 'Ø Distanz km', 'Ø Transitzeit Tage',
      'Score', 'Score Kapazität', 'Score Transport', 'Score Reichweite', 'Kapazität ausreichend'].map(U.t);
    var rows = [];
    Object.keys(st.assignments).sort().forEach(function (cat) {
      var a = st.assignments[cat];
      (a.parts || []).forEach(function (p) {
        var sc = p.scores || {};
        rows.push([cat, a.mode, a.targetDays, a.dataset || '', a.periodFrom || '', a.periodTo || '',
          p.dcName, U.round(p.share * 100, 2), U.round(p.pallets, 1), U.round(p.slots, 1),
          U.round(p.transportCost, 2), U.round(p.storageCost, 2), U.round(p.handlingCost, 2),
          U.round(p.totalCost, 2), U.round(p.avgDistance, 1), U.round(p.avgTransitDays, 2),
          U.round(p.score, 1), U.round(sc.capacity, 1), U.round(sc.transport, 1), U.round(sc.service, 1),
          U.t(p.feasible === false ? 'nein' : 'ja')]);
      });
    });
    return [head].concat(rows);
  }

  function sheetRegionAssignments() {
    var st = S.get();
    var head = ['Produktkategorie', 'Kundenregion', 'Beliefert aus DC', 'Volumen Paletten', 'Distanz km', 'Transportkosten EUR'].map(U.t);
    var rows = [];
    Object.keys(st.assignments).sort().forEach(function (cat) {
      (st.assignments[cat].regions || []).forEach(function (r) {
        var dc = S.getDC(r.dcId);
        rows.push([cat, r.regionKey, dc ? dc.name : r.dcId, U.round(r.pallets, 1),
          U.round(r.distance, 1), U.round(r.cost, 2)]);
      });
    });
    return [head].concat(rows);
  }

  function sheetRegions() {
    var st = S.get();
    var stats = Object.create(null);
    st.records.forEach(function (r) {
      var e = stats[r.regionKey] || (stats[r.regionKey] = { n: 0, pallets: 0, qty: 0, revenue: 0 });
      e.n++; e.pallets += S.recordPallets(r); e.qty += r.qty; e.revenue += r.revenue;
    });
    var head = ['Region', 'Land', 'Breitengrad', 'Längengrad', 'Quelle', 'Datensätze', 'Volumen Paletten', 'Menge Stück', 'Umsatz EUR'].map(U.t);
    var rows = Object.keys(st.regions).sort().map(function (k) {
      var info = st.regions[k], s = stats[k] || {};
      return [k, info.country || '', U.isNum(info.lat) ? info.lat : '', U.isNum(info.lng) ? info.lng : '',
        info.source || '', s.n || 0, U.round(s.pallets, 1), U.round(s.qty, 0), U.round(s.revenue, 2)];
    });
    return [head].concat(rows);
  }

  function sheetScenarios() {
    return NS.scenarios.comparisonRows().rows;
  }

  function sheetCoverage() {
    var head = ['Produktkategorie', 'Volumen Paletten', 'Zeitraum Tage', 'Bedarf je Tag',
      'Zielreichweite Tage', 'Ziel-Bestand Stellplätze'].map(U.t);
    var s = S.settings();
    var rows = S.categories('all').map(function (cat) {
      var recs = S.get().records.filter(function (r) { return r.category === cat; });
      var pallets = U.sum(recs, function (r) { return S.recordPallets(r); });
      var days = S.horizonDays(recs);
      var perDay = days > 0 ? pallets / days : 0;
      var td = S.targetDays(cat);
      return [cat, U.round(pallets, 1), U.round(days, 1), U.round(perDay, 2), td,
        U.round(perDay * td * s.stockFactor, 1)];
    });
    return [head].concat(rows);
  }

  function sheetRaw() {
    var st = S.get();
    var head = ['Datensatztyp', 'Periode', 'Produktkategorie', 'Region', 'Land', 'Kunde',
      'Menge', 'Umsatz EUR', 'Volumen m³', 'Paletten', 'Paletten-Äquivalent', 'Paletten (berechnet)'].map(U.t);
    var rows = st.records.slice(0, MAX_RAW_ROWS).map(function (r) {
      return [U.t(r.dataset === 'forecast' ? 'Forecast' : 'Historie'), r.period, r.category, r.regionKey,
        r.country, r.customer, U.round(r.qty, 2), U.round(r.revenue, 2), U.round(r.volume, 3),
        U.round(r.pallets, 2), U.round(r.palletEq, 2), U.round(S.recordPallets(r), 2)];
    });
    return [head].concat(rows);
  }

  /* ------------------------------------------------------------ Excel */
  function exportXLSX() {
    if (typeof XLSX === 'undefined') { U.toast('Excel-Bibliothek nicht geladen.', 'error'); return; }
    var sum = NS.dashboard.networkSummary();
    var wb = XLSX.utils.book_new();

    function add(name, aoa, widths) {
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      if (widths) ws['!cols'] = widths.map(function (w) { return { wch: w }; });
      else if (aoa.length) {
        ws['!cols'] = (aoa[0] || []).map(function (h) {
          return { wch: Math.min(Math.max(String(h || '').length + 4, 12), 34) };
        });
      }
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    }

    add(U.t('KPI'), sheetKPI(sum), [38, 20, 18]);
    add(U.t('DCs'), sheetDCs(sum));
    add(U.t('Zuordnungen'), sheetAssignments());
    add(U.t('Detailergebnisse'), NS.dashboard.detailCSV());
    add(U.t('Regionszuordnung'), sheetRegionAssignments());
    add(U.t('Zielreichweiten'), sheetCoverage());
    add(U.t('Regionen'), sheetRegions());
    add(U.t('Szenarien'), sheetScenarios());
    if (S.get().records.length) add(U.t('Rohdaten'), sheetRaw());

    XLSX.writeFile(wb, 'netplan_auswertung_' + U.timestamp() + '.xlsx');
    U.toast('Excel-Arbeitsmappe erzeugt.', 'good');
  }

  /* ------------------------------------------------------------ CSV */
  function exportResultsCSV() {
    U.downloadCSV(NS.dashboard.detailCSV(), 'netplan_ergebnisse_' + U.timestamp() + '.csv');
    U.toast('CSV-Datei erzeugt.', 'good');
  }

  function exportAssignmentsCSV() {
    U.downloadCSV(sheetAssignments(), 'netplan_zuordnungen_' + U.timestamp() + '.csv');
    U.toast('CSV-Datei erzeugt.', 'good');
  }

  function exportScenariosCSV() {
    U.downloadCSV(sheetScenarios(), 'netplan_szenarien_' + U.timestamp() + '.csv');
    U.toast('CSV-Datei erzeugt.', 'good');
  }

  /* ------------------------------------------------------------ Projekt */
  function saveProject() {
    var st = S.get();
    var payload = JSON.stringify({
      app: 'NetPlan', version: st.version, exportedAt: new Date().toISOString(),
      dcs: st.dcs, records: st.records, regions: st.regions,
      assignments: st.assignments, scenarios: st.scenarios, settings: st.settings
    });
    U.download(new Blob([payload], { type: 'application/json' }), 'netplan_projekt_' + U.timestamp() + '.json');
    U.toast('Projektdatei gespeichert.', 'good');
  }

  function loadProject(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var obj = JSON.parse(e.target.result);
        if (!obj || typeof obj !== 'object') throw new Error(U.t('Ungültiges Format'));
        S.hydrate(obj);
        S.emit('project');
        U.toast(U.tf('Projekt geladen: {0} DCs, {1} Datensätze, {2} Szenarien.',
          (obj.dcs || []).length, fmt.int((obj.records || []).length), (obj.scenarios || []).length), 'good');
      } catch (err) {
        U.toast(U.tf('Projektdatei konnte nicht gelesen werden: {0}', err.message), 'error');
      }
    };
    reader.onerror = function () { U.toast('Datei konnte nicht gelesen werden.', 'error'); };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------ Events */
  function init() {
    U.$('#btn-export-xlsx').addEventListener('click', exportXLSX);
    U.$('#btn-export-csv-results').addEventListener('click', exportResultsCSV);
    U.$('#btn-export-csv-assign').addEventListener('click', exportAssignmentsCSV);
    U.$('#btn-export-csv-scn').addEventListener('click', exportScenariosCSV);

    U.$('#btn-project-save').addEventListener('click', saveProject);
    U.$('#btn-project-load').addEventListener('click', function () { U.$('#project-file-input').click(); });
    U.$('#project-file-input').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) loadProject(f);
      e.target.value = '';
    });
  }

  NS.exporter = {
    init: init, exportXLSX: exportXLSX, saveProject: saveProject, loadProject: loadProject,
    sheetAssignments: sheetAssignments, sheetDCs: sheetDCs, sheetRegions: sheetRegions
  };
})(window.LNP);
