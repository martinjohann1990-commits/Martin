/* NetPlan+ i18n — dictionary key = German original text. Missing key -> German shown (safe fallback). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};

  var DICT = {
    /* nav */
    'Dashboard': 'Dashboard',
    'Daten & Import': 'Data & Import',
    'DC-Verwaltung': 'DC Management',
    'Simulation': 'Simulation',
    'Szenarien': 'Scenarios',
    'Berichte': 'Reports',
    'Export & Projekt': 'Export & Project',
    'Logistiknetzwerk-Analyse': 'Logistics Network Analysis',
    'Demodaten laden': 'Load demo data',
    'Datensätze': 'records',

    /* generic */
    'Speichern': 'Save', 'Abbrechen': 'Cancel', 'Löschen': 'Delete', 'Bearbeiten': 'Edit',
    'Duplizieren': 'Duplicate', 'Anlegen': 'Create', 'Neu': 'New', 'Schließen': 'Close',
    'Suchen': 'Search', 'Filter': 'Filter', 'Alle': 'All', 'Aktiv': 'Active', 'Inaktiv': 'Inactive',
    'Ja': 'Yes', 'Nein': 'No', 'Zurücksetzen': 'Reset', 'Übernehmen': 'Apply', 'Exportieren': 'Export',
    'Importieren': 'Import', 'Hochladen': 'Upload', 'Datei wählen': 'Choose file',
    'Name': 'Name', 'Code': 'Code', 'Land': 'Country', 'Region': 'Region', 'Kategorie': 'Category',
    'Aktionen': 'Actions', 'Status': 'Status', 'Details': 'Details', 'Gesamt': 'Total',
    'Quelle': 'Source', 'unbekannt': 'unknown', 'automatisch': 'automatic', 'manuell': 'manual',
    'aus Datei': 'from file', 'nicht gesetzt': 'not set',

    /* dashboard */
    'Prognose Paletten (Gesamt)': 'Forecast pallets (total)', 'Prognose ESU (Gesamt)': 'Forecast ESU (total)',
    'Aktive Distributionszentren': 'Active distribution centers', 'SKUs im Bestand': 'SKUs on file',
    'Ship-to-Kunden': 'Ship-to customers', 'Ø Paletten je DC': 'Avg. pallets per DC',
    'Ziel-Reichweite (Wochen)': 'Target coverage (weeks)', 'Volumen je Distributionszentrum': 'Volume per distribution center',
    'Top-10 Vertriebsgebiete': 'Top 10 sales districts', 'Prognoseverlauf je Periode': 'Forecast trend per period',
    'Netzwerkkarte': 'Network map', 'Keine Daten geladen': 'No data loaded',
    'Bitte laden Sie Ihre Excel-/CSV-Dateien im Bereich “Daten & Import” hoch oder starten Sie mit den Demodaten.':
      'Please upload your Excel/CSV files under “Data & Import”, or start with the demo data.',
    'Demodaten laden und loslegen': 'Load demo data and get started',

    /* data / import */
    'Datenquellen': 'Data sources', 'Zeilen erkannt': 'rows detected', 'Zeilen übernommen': 'rows accepted',
    'Warnungen': 'warnings', 'Fehler': 'errors', 'Noch keine Datei geladen': 'No file loaded yet',
    'Datei hierher ziehen oder klicken': 'Drag file here or click', 'CSV, XLSX, XLS, XLSM': 'CSV, XLSX, XLS, XLSM',
    'Spaltenzuordnung': 'Column mapping', 'Feld': 'Field', 'Spalte in Datei': 'Column in file', 'Konfidenz': 'Confidence',
    'Pflichtfeld fehlt': 'Required field missing', 'Bereit zum Import': 'Ready to import',
    'Mengenlogik': 'Quantity logic', 'Stück je Palette': 'Units per pallet', 'm³ je Palette': 'm³ per pallet',
    'Ziel-Reichweite je Kategorie': 'Target coverage per category', 'Globale Ziel-Reichweite (Wochen)': 'Global target coverage (weeks)',
    'Sicherheitsaufschlag': 'Safety factor', 'Datenbestand': 'Data on file', 'Datensatz entfernen': 'Remove dataset',
    'Alle Daten zurücksetzen': 'Reset all data',

    /* DCs */
    'Distributionszentren': 'Distribution centers', 'Neues DC': 'New DC', 'Kapazität (Stellplätze)': 'Capacity (slots)',
    'Belegte Plätze (Basis)': 'Occupied slots (base)', 'Lagerkosten je Platz/Monat': 'Storage cost per slot/month',
    'Handlingkosten je Palette': 'Handling cost per pallet', 'Transport-Grundkosten je Palette': 'Transport base cost per pallet',
    'Transportkosten je km': 'Transport cost per km', 'Fixkosten je Periode': 'Fixed cost per period',
    'Koordinaten': 'Coordinates', 'Breitengrad': 'Latitude', 'Längengrad': 'Longitude',
    'DC wirklich löschen?': 'Really delete this DC?', 'Regionale Kostenpauschalen': 'Regional flat costs',

    /* simulation */
    'Parameter': 'Parameters', 'Datenbasis': 'Data basis', 'Prognose': 'Forecast', 'Historie': 'History',
    'Periode von': 'Period from', 'Periode bis': 'Period to', 'Modus': 'Mode', 'Alleinzuordnung': 'Single site',
    'Aufteilung': 'Split', 'Manuell': 'Manual', 'Gewichtung': 'Weighting', 'Kapazität': 'Capacity',
    'Transport': 'Transport', 'Reichweite': 'Service', 'Auslastungsgrenze': 'Utilization limit',
    'Simulation starten': 'Run simulation', 'Empfehlung': 'Recommendation', 'Rangliste': 'Ranking',
    'Score-Zusammensetzung': 'Score composition', 'Aufteilungstabelle': 'Split table', 'Regionale Zuordnung': 'Regional assignment',
    'Ausschlaggebend ist': 'Decisive factor is', 'von': 'of', 'Punkten': 'points',

    /* scenarios */
    'Szenario speichern': 'Save scenario', 'Aktueller Stand': 'Current state', 'Kennzahlenvergleich': 'KPI comparison',
    'Zuordnungsmatrix': 'Assignment matrix', 'Basis (Ist-Zustand)': 'Base (as-is)',
    'Erstellt': 'Created', 'Vergleichen': 'Compare', 'Auslastung': 'Utilization', 'Distanz': 'Distance', 'Wochen': 'weeks',

    /* reports */
    'Länder-Distrikt-Zuordnung': 'Country–district allocation', 'SKU je DC': 'SKUs per DC',
    'Paletten-/Lagerbedarf je DC': 'Pallet / storage demand per DC', 'Ø Sendungsgröße': 'Avg. shipment size',
    'Sendungszusammensetzung': 'Shipment composition', 'Rest': 'Rest',

    /* export */
    'Excel-Export': 'Excel export', 'CSV-Export': 'CSV export', 'PDF-Bericht': 'PDF report',
    'Projekt speichern': 'Save project', 'Projekt laden': 'Load project', 'Erscheinungsbild': 'Branding',
    'Kostenparameter': 'Cost parameters', 'Formelübersicht': 'Formula reference'
  };

  var lang = 'de';

  function t(s) {
    if (s === null || s === undefined) return s;
    if (lang === 'de') return s;
    return DICT[s] || s;
  }

  function tf(s) {
    var out = t(s);
    for (var i = 1; i < arguments.length; i++) {
      out = out.split('{' + (i - 1) + '}').join(String(arguments[i]));
    }
    return out;
  }

  function applyStatic(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-t]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-t');
      nodes[i].textContent = t(key);
    }
    var ph = root.querySelectorAll('[data-t-ph]');
    for (var j = 0; j < ph.length; j++) {
      ph[j].setAttribute('placeholder', t(ph[j].getAttribute('data-t-ph')));
    }
  }

  function locale() { return lang === 'de' ? 'de-DE' : 'en-GB'; }

  function fmtNum(v, decimals) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    try {
      return new Intl.NumberFormat(locale(), { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 }).format(v);
    } catch (e) { return v.toFixed(decimals || 0); }
  }
  function fmtInt(v) { return fmtNum(Math.round(v), 0); }
  function fmtPct(v, decimals) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    return fmtNum(v * 100, decimals === undefined ? 1 : decimals) + ' %';
  }
  function fmtCur(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    try {
      return new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
    } catch (e) { return fmtInt(v) + ' EUR'; }
  }
  function fmtDate(d) {
    try { return new Intl.DateTimeFormat(locale()).format(d); } catch (e) { return String(d); }
  }

  LNP.i18n = {
    get: function () { return lang; },
    setLang: function (l) {
      lang = (l === 'en') ? 'en' : 'de';
      try { window.localStorage.setItem('lnp.lang', lang); } catch (e) {}
      applyStatic(document);
      if (LNP.state) LNP.state.emit('lang');
    },
    init: function () {
      try {
        var saved = window.localStorage.getItem('lnp.lang');
        if (saved) lang = saved;
      } catch (e) {}
      applyStatic(document);
    },
    t: t, tf: tf, applyStatic: applyStatic, locale: locale,
    fmtNum: fmtNum, fmtInt: fmtInt, fmtPct: fmtPct, fmtCur: fmtCur, fmtDate: fmtDate
  };
})();
