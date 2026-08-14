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
      [(S.settings().branding && S.settings().branding.appName || 'NetPlan') + ' – ' + U.t('Auswertung Logistik-Netzwerk')],
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

  /* ------------------------------------------------------------ PDF-Bericht */
  /**
   * Baut eine druckfertige Berichtsseite und öffnet den Druckdialog. Über
   * „Als PDF speichern“ entsteht daraus eine PDF-Datei – ohne zusätzliche
   * Bibliothek und ohne Server.
   */
  function reportHtml() {
    var sum = NS.dashboard.networkSummary();
    var st = S.get();
    var b = st.settings.branding || {};
    var appName = (b.appName || '').trim() || 'NetPlan';

    function tbl(head, rows) {
      return '<table><thead><tr>' + head.map(function (h, i) {
        return '<th' + (i > 0 ? ' class="num"' : '') + '>' + U.esc(U.t(h)) + '</th>';
      }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) {
          return '<td' + (i > 0 ? ' class="num"' : '') + '>' + c + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
    }

    /* Kopf */
    var logo = b.logo
      ? '<div class="pr-logo"><img src="' + U.esc(b.logo) + '" alt=""></div>'
      : '<div class="pr-logo">' + U.esc((b.initials || 'NP')) + '</div>';

    var html = '<div class="pr-head">' + logo + '<div><h1>' + U.esc(appName) + ' – ' +
      U.t('Auswertung Logistik-Netzwerk') + '</h1><div class="pr-meta">' +
      U.t('Erstellt am') + ' ' + new Date().toLocaleString(NS.i18n ? NS.i18n.locale() : 'de-DE') +
      '</div></div></div>';

    /* Kennzahlen */
    var kpis = [
      ['Gesamtkapazität', fmt.int(sum.capacity)],
      ['Auslastung', isFinite(sum.utilization) ? fmt.pct1(sum.utilization) : '–'],
      ['Ziel-Bestand (zugeordnet)', fmt.int(sum.assignedSlots)],
      ['Volumen (Paletten)', fmt.int(sum.pallets)],
      ['Transportkosten', fmt.eur(sum.transportCost)],
      ['Lagerkosten', fmt.eur(sum.storageCost)],
      ['Gesamtkosten', fmt.eur(sum.totalCost)],
      ['Ø Bewertung (0–100)', isFinite(sum.avgScore) ? fmt.dec1(sum.avgScore) : '–']
    ];
    html += '<div class="pr-kpis">' + kpis.map(function (k) {
      return '<div class="pr-kpi"><span>' + U.esc(U.t(k[0])) + '</span><b>' + k[1] + '</b></div>';
    }).join('') + '</div>';

    /* Diagramme aus den vorhandenen Zeichenflächen übernehmen */
    var charts = [
      ['Ziel-Bestand vs. Kapazität je DC', 'chart-capacity'],
      ['Kostenverteilung je DC', 'chart-cost'],
      ['Volumenverteilung Kategorie → DC', 'chart-volume']
    ].map(function (c) {
      var canvas = document.getElementById(c[1]);
      if (!canvas || !canvas.width) return '';
      try {
        return '<div class="pr-chart"><h3>' + U.esc(U.t(c[0])) + '</h3><img src="' +
          canvas.toDataURL('image/png') + '"></div>';
      } catch (e) { return ''; }
    }).filter(Boolean).join('');
    if (charts) html += '<h2>' + U.t('Diagramme') + '</h2><div class="pr-charts">' + charts + '</div>';

    /* Standorte */
    html += '<h2>' + U.t('Distributionszentren') + '</h2>' + tbl(
      ['DC', 'Kapazität', 'Belegt gesamt', 'Auslastung %', 'Volumen Paletten', 'Gesamtkosten EUR'],
      sum.perDC.map(function (d) {
        return [U.esc(d.name), fmt.int(d.capacity), fmt.int(d.usedTotal),
          isFinite(d.utilization) ? fmt.dec1(d.utilization * 100) : '–',
          fmt.int(d.pallets), fmt.int(d.totalCost)];
      }));

    /* Zuordnungen */
    if (sum.rows.length) {
      html += '<h2>' + U.t('Zuordnungen') + '</h2>' + tbl(
        ['Produktkategorie', 'DC', 'Anteil %', 'Volumen (Pal.)', 'Ziel-Bestand', 'Gesamtkosten', 'Score'],
        sum.rows.map(function (r) {
          return [U.esc(r.category), U.esc(r.dcName), fmt.dec1(r.share * 100),
            fmt.int(r.pallets), fmt.int(r.slots), fmt.eur(r.totalCost), fmt.dec1(r.score)];
        }));
    }

    /* Parameter */
    var s = st.settings;
    html += '<h2>' + U.t('Parameter') + '</h2>' + tbl(['Kennzahl', 'Wert'], [
      [U.t('Zielreichweite global'), fmt.int(s.targetDaysGlobal) + ' ' + U.t('Tage')],
      [U.t('Sicherheitsaufschlag Bestand'), fmt.dec2(s.stockFactor)],
      [U.t('Gewichtung Kapazität'), s.weights.capacity + ' %'],
      [U.t('Gewichtung Transport'), s.weights.transport + ' %'],
      [U.t('Gewichtung Zielreichweite'), s.weights.service + ' %'],
      [U.t('Ziel-Auslastungsgrenze'), fmt.int(s.maxUtilization * 100) + ' %'],
      [U.t('Transportkosten je Paletten-km'), fmt.dec2(s.costPerPalletKm) + ' EUR'],
      [U.t('Transport-Grundkosten je Palette'), fmt.dec2(s.costBasePerPallet) + ' EUR'],
      [U.t('Lagerkosten je Stellplatz/Monat'), fmt.dec2(s.storageCostPerSlotMonth) + ' EUR'],
      [U.t('Handlingkosten je Palette'), fmt.dec2(s.handlingCostPerPallet) + ' EUR']
    ]);

    html += '<div class="pr-note">' + U.t('Erzeugt im Browser ohne Serverübertragung.') + '</div>';
    return html;
  }

  function exportPDF() {
    if (!S.activeDCs().length) {
      U.toast('Es ist kein aktives Distributionszentrum vorhanden.', 'warn');
      return;
    }
    U.toast('Bericht wird vorbereitet – im Druckdialog bitte „Als PDF speichern“ wählen.', 'good');

    // Chart.js zeichnet nur in eine sichtbare Fläche. Ist das Dashboard
    // ausgeblendet, sind die Zeichenflächen 0 Pixel breit und die Diagramme
    // fehlten im Bericht – deshalb kurz einblenden und danach zurückschalten.
    var active = document.querySelector('.view.is-active');
    var previous = active ? active.id.replace('view-', '') : 'dashboard';
    if (previous !== 'dashboard') NS.app.showView('dashboard');
    else NS.dashboard.render();

    setTimeout(function () {
      var node = document.getElementById('print-report');
      node.innerHTML = reportHtml();

      var cleanup = function () {
        node.innerHTML = '';
        window.removeEventListener('afterprint', cleanup);
        if (previous !== 'dashboard') NS.app.showView(previous);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
      // Rückfallebene, falls afterprint nicht ausgelöst wird
      setTimeout(cleanup, 60000);
    }, 700);
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
    U.$('#btn-export-pdf').addEventListener('click', exportPDF);
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
    init: init, exportXLSX: exportXLSX, exportPDF: exportPDF, reportHtml: reportHtml,
    saveProject: saveProject, loadProject: loadProject,
    sheetAssignments: sheetAssignments, sheetDCs: sheetDCs, sheetRegions: sheetRegions
  };
})(window.LNP);
