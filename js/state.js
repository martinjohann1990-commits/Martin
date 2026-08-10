/* =========================================================================
   state.js – Datenmodell, Persistenz (localStorage), abgeleitete Sichten
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util;
  var STORAGE_KEY = 'netplan.project.v1';
  var SCHEMA_VERSION = 1;

  /* ------------------------------------------------------------ Defaults */
  function defaultSettings() {
    return {
      // Mengenlogik
      qtyPerPallet: 500,          // Stück je Palette
      volPerPallet: 1.8,          // m³ je Palette
      stockFactor: 1.0,           // Sicherheitsaufschlag auf den Ziel-Bestand
      horizonDaysOverride: null,  // null = aus den Daten ableiten

      // Zielreichweite
      targetDaysGlobal: 21,
      targetDaysByCategory: {},   // { kategorie: tage }

      // Kosten
      costPerPalletKm: 0.045,     // EUR je Paletten-km
      costBasePerPallet: 6,       // EUR Grundkosten je Palette
      storageCostPerSlotMonth: 12,// EUR je Stellplatz und Monat (Fallback)
      handlingCostPerPallet: 3.5, // EUR je Palette

      // Transitzeit
      kmPerDay: 500,
      handlingDays: 0.5,

      // Bewertung
      weights: { capacity: 30, transport: 45, service: 25 },
      maxUtilization: 0.85,

      // Erscheinungsbild
      branding: {
        appName: 'NetPlan',
        appSubtitle: 'Logistik-Netzwerkplanung',
        initials: 'NP',
        logo: null            // Bild als data:-URI, damit es in der Projektdatei mitreist
      },

      // Sonstiges
      autosave: true,
      mapMode: 'auto'
    };
  }

  function emptyState() {
    return {
      version: SCHEMA_VERSION,
      dcs: [],
      records: [],
      regions: {},        // regionKey -> { name, country, lat, lng, source }
      assignments: {},    // kategorie -> { mode, targetDays, parts:[{dcId,share}], createdAt, metrics }
      scenarios: [],
      settings: defaultSettings(),
      lastSim: null
    };
  }

  var state = emptyState();

  /* ------------------------------------------------------------ Persistenz */
  var listeners = [];
  var saveSoon = U.debounce(save, 400);

  function onChange(fn) { listeners.push(fn); }

  function emit(reason) {
    listeners.forEach(function (fn) {
      try { fn(reason); } catch (e) { console.error('Listener-Fehler:', e); }
    });
    if (state.settings.autosave) saveSoon();
  }

  function save() {
    if (!state.settings.autosave) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Quota überschritten: Rohdaten sind der größte Block → ohne sie speichern
      try {
        var slim = JSON.parse(JSON.stringify(state));
        slim.records = [];
        slim.__recordsDropped = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
        U.toast('Speicherlimit erreicht: Konfiguration gesichert, Rohdaten nicht. Bitte Projekt als JSON exportieren.', 'warn');
      } catch (e2) {
        console.warn('localStorage nicht verfügbar', e2);
      }
    }
  }

  function load() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
    if (!raw) return false;
    try {
      var parsed = JSON.parse(raw);
      hydrate(parsed);
      return true;
    } catch (e) {
      console.warn('Gespeicherter Stand nicht lesbar', e);
      return false;
    }
  }

  /** Übernimmt ein (möglicherweise unvollständiges) Objekt in den State. */
  function hydrate(obj) {
    var fresh = emptyState();
    state.version = SCHEMA_VERSION;
    state.dcs = Array.isArray(obj.dcs) ? obj.dcs.map(normalizeDC) : [];
    state.records = Array.isArray(obj.records) ? obj.records : [];
    state.regions = obj.regions && typeof obj.regions === 'object' ? obj.regions : {};
    state.assignments = obj.assignments && typeof obj.assignments === 'object' ? obj.assignments : {};
    state.scenarios = Array.isArray(obj.scenarios) ? obj.scenarios : [];
    state.settings = Object.assign(fresh.settings, obj.settings || {});
    state.settings.weights = Object.assign(fresh.settings.weights, (obj.settings || {}).weights || {});
    state.settings.branding = Object.assign(fresh.settings.branding, (obj.settings || {}).branding || {});
    state.lastSim = null;
  }

  function clearStorage() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignorieren */ }
  }

  function reset() {
    state = emptyState();
    clearStorage();
    emit('reset');
  }

  /* ------------------------------------------------------------ DCs */
  function normalizeDC(dc) {
    return {
      id: dc.id || U.id('dc'),
      name: dc.name || 'Unbenanntes DC',
      code: dc.code || '',
      region: dc.region || '',
      country: dc.country || '',
      lat: U.isNum(dc.lat) ? +dc.lat : (U.isNum(U.parseNum(dc.lat)) ? U.parseNum(dc.lat) : null),
      lng: U.isNum(dc.lng) ? +dc.lng : (U.isNum(U.parseNum(dc.lng)) ? U.parseNum(dc.lng) : null),
      capacity: U.num(dc.capacity, 0),
      usedSlots: U.num(dc.usedSlots, 0),
      storageCostPerSlotMonth: dc.storageCostPerSlotMonth === null || dc.storageCostPerSlotMonth === undefined || dc.storageCostPerSlotMonth === ''
        ? null : U.num(dc.storageCostPerSlotMonth),
      handlingCostPerPallet: dc.handlingCostPerPallet === null || dc.handlingCostPerPallet === undefined || dc.handlingCostPerPallet === ''
        ? null : U.num(dc.handlingCostPerPallet),
      transportBasePerPallet: dc.transportBasePerPallet === null || dc.transportBasePerPallet === undefined || dc.transportBasePerPallet === ''
        ? null : U.num(dc.transportBasePerPallet),
      transportCostPerKm: dc.transportCostPerKm === null || dc.transportCostPerKm === undefined || dc.transportCostPerKm === ''
        ? null : U.num(dc.transportCostPerKm),
      fixedCostPerPeriod: U.num(dc.fixedCostPerPeriod, 0),
      active: dc.active !== false,
      regionCosts: dc.regionCosts && typeof dc.regionCosts === 'object' ? dc.regionCosts : {}
    };
  }

  function addDC(dc) {
    var normalized = normalizeDC(dc);
    state.dcs.push(normalized);
    emit('dcs');
    return normalized;
  }

  function updateDC(dcId, patch) {
    var dc = getDC(dcId);
    if (!dc) return null;
    Object.assign(dc, normalizeDC(Object.assign({}, dc, patch, { id: dcId })));
    emit('dcs');
    return dc;
  }

  function removeDC(dcId) {
    state.dcs = state.dcs.filter(function (d) { return d.id !== dcId; });
    // Zuordnungen bereinigen
    Object.keys(state.assignments).forEach(function (cat) {
      var a = state.assignments[cat];
      a.parts = (a.parts || []).filter(function (p) { return p.dcId !== dcId; });
      if (!a.parts.length) delete state.assignments[cat];
    });
    emit('dcs');
  }

  function getDC(dcId) {
    for (var i = 0; i < state.dcs.length; i++) if (state.dcs[i].id === dcId) return state.dcs[i];
    return null;
  }

  function activeDCs() {
    return state.dcs.filter(function (d) { return d.active; });
  }

  function dcColor(dcId) {
    var idx = state.dcs.findIndex(function (d) { return d.id === dcId; });
    return NS.charts ? NS.charts.seriesColor(idx) : 'var(--series-1)';
  }

  /* ------------------------------------------------------------ Datensätze */
  /**
   * Ermittelt die Palettenmenge eines Datensatzes.
   * Priorität: Paletten-Äquivalent → Paletten → Volumen → Menge
   */
  function recordPallets(rec, settings) {
    var s = settings || state.settings;
    if (isFinite(rec.palletEq) && rec.palletEq > 0) return rec.palletEq;
    if (isFinite(rec.pallets) && rec.pallets > 0) return rec.pallets;
    if (isFinite(rec.volume) && rec.volume > 0 && s.volPerPallet > 0) return rec.volume / s.volPerPallet;
    if (isFinite(rec.qty) && rec.qty > 0 && s.qtyPerPallet > 0) return rec.qty / s.qtyPerPallet;
    return 0;
  }

  function addRecords(records, dataset, mode) {
    if (mode === 'replace') {
      state.records = state.records.filter(function (r) { return r.dataset !== dataset; });
    }
    state.records = state.records.concat(records);
    emit('records');
  }

  function clearRecords(dataset) {
    state.records = dataset && dataset !== 'all'
      ? state.records.filter(function (r) { return r.dataset !== dataset; })
      : [];
    emit('records');
  }

  /** Alle Datensätze eines Datenbestands ('history' | 'forecast' | 'all'). */
  function recordsOf(dataset) {
    if (!dataset || dataset === 'all') return state.records;
    return state.records.filter(function (r) { return r.dataset === dataset; });
  }

  function categories(dataset) {
    return U.unique(recordsOf(dataset).map(function (r) { return r.category; })).sort();
  }

  function regionKeys(dataset) {
    return U.unique(recordsOf(dataset).map(function (r) { return r.regionKey; })).sort();
  }

  /** Sortierte Periodenliste (nach Zeitstempel, unbekannte Formate alphabetisch am Ende). */
  function periods(dataset) {
    var map = Object.create(null);
    recordsOf(dataset).forEach(function (r) {
      if (!r.period) return;
      if (!(r.period in map)) map[r.period] = isFinite(r.periodTs) ? r.periodTs : Infinity;
    });
    return Object.keys(map).sort(function (a, b) {
      var d = map[a] - map[b];
      if (isFinite(d) && d !== 0) return d;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
  }

  /** Länge des Betrachtungszeitraums in Tagen für eine Menge von Datensätzen. */
  function horizonDays(records) {
    if (state.settings.horizonDaysOverride > 0) return state.settings.horizonDaysOverride;
    var seen = Object.create(null), days = 0, count = 0;
    records.forEach(function (r) {
      if (r.period && !seen[r.period]) {
        seen[r.period] = 1;
        days += isFinite(r.periodDays) && r.periodDays > 0 ? r.periodDays : 30.44;
        count++;
      }
    });
    if (!count) return 30.44;
    return days;
  }

  /* ------------------------------------------------------------ Regionen */
  function regionInfo(key) {
    return state.regions[key] || null;
  }

  function setRegion(key, patch) {
    var cur = state.regions[key] || { name: key, country: '', lat: null, lng: null, source: 'manual' };
    state.regions[key] = Object.assign(cur, patch);
    emit('regions');
  }

  /** Legt für alle in den Daten vorkommenden Regionen einen Eintrag an. */
  function syncRegions() {
    var changed = false;
    state.records.forEach(function (r) {
      if (!r.regionKey) return;
      if (!state.regions[r.regionKey]) {
        var guess = NS.geo ? NS.geo.lookup(r.regionKey, r.country) : null;
        state.regions[r.regionKey] = {
          name: r.regionKey,
          country: r.country || '',
          lat: U.isNum(r.lat) ? r.lat : (guess ? guess.lat : null),
          lng: U.isNum(r.lng) ? r.lng : (guess ? guess.lng : null),
          source: U.isNum(r.lat) ? 'datei' : (guess ? 'automatisch' : 'offen')
        };
        changed = true;
      } else if (U.isNum(r.lat) && !U.isNum(state.regions[r.regionKey].lat)) {
        state.regions[r.regionKey].lat = r.lat;
        state.regions[r.regionKey].lng = r.lng;
        state.regions[r.regionKey].source = 'datei';
        changed = true;
      }
    });
    return changed;
  }

  /* ------------------------------------------------------------ Zielreichweite */
  function targetDays(category) {
    var v = state.settings.targetDaysByCategory[category];
    return isFinite(v) && v > 0 ? v : state.settings.targetDaysGlobal;
  }

  function setTargetDays(category, days) {
    if (category === null || category === undefined) state.settings.targetDaysGlobal = days;
    else state.settings.targetDaysByCategory[category] = days;
    emit('settings');
  }

  /* ------------------------------------------------------------ Zuordnungen */
  function setAssignment(category, assignment) {
    state.assignments[category] = assignment;
    emit('assignments');
  }

  function clearAssignments() {
    state.assignments = {};
    emit('assignments');
  }

  /**
   * Bereits belegte Stellplätze eines DCs: Grundbelegung + alle übernommenen
   * Zuordnungen (optional ohne eine Kategorie, die gerade simuliert wird).
   */
  function usedSlots(dcId, excludeCategory) {
    var dc = getDC(dcId);
    var used = dc ? U.num(dc.usedSlots, 0) : 0;
    Object.keys(state.assignments).forEach(function (cat) {
      if (cat === excludeCategory) return;
      var a = state.assignments[cat];
      (a.parts || []).forEach(function (p) {
        if (p.dcId === dcId) used += U.num(p.slots, 0);
      });
    });
    return used;
  }

  NS.state = {
    STORAGE_KEY: STORAGE_KEY,
    get: function () { return state; },
    settings: function () { return state.settings; },
    emit: emit, onChange: onChange, save: save, load: load, hydrate: hydrate, reset: reset,
    clearStorage: clearStorage, emptyState: emptyState, defaultSettings: defaultSettings,

    addDC: addDC, updateDC: updateDC, removeDC: removeDC, getDC: getDC,
    activeDCs: activeDCs, dcColor: dcColor, normalizeDC: normalizeDC,

    addRecords: addRecords, clearRecords: clearRecords, recordsOf: recordsOf,
    recordPallets: recordPallets, categories: categories, regionKeys: regionKeys,
    periods: periods, horizonDays: horizonDays,

    regionInfo: regionInfo, setRegion: setRegion, syncRegions: syncRegions,
    targetDays: targetDays, setTargetDays: setTargetDays,
    setAssignment: setAssignment, clearAssignments: clearAssignments, usedSlots: usedSlots
  };
})(window.LNP);
