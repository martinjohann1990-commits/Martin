/* NetPlan+ state.js — single state object, event bus, localStorage persistence, project file I/O. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util;

  var STORAGE_KEY = 'lnp.project.v1';
  var listeners = [];

  function defaultSettings() {
    return {
      coverageWeeksGlobal: 3,
      coverageWeeksByCategory: {},
      stockFactor: 1.0,
      skusPerBin: 1,
      binsPerSlotFactor: 1,
      costPerPalletKm: 0.045,
      costBasePerPallet: 6,
      storageCostPerSlotMonth: 12,
      handlingCostPerPallet: 3.5,
      kmPerDay: 500,
      handlingDays: 0.5,
      weights: { capacity: 30, transport: 45, service: 25 },
      maxUtilization: 0.85,
      autosave: true,
      mapMode: 'auto',
      countryAllocationTopN: 10,
      districtCoordOverrides: {},
      tapsKeywords: ['tap', 'armatur', 'faucet'],
      shipmentClusterBounds: [1.0, 5.0],
      branding: { appName: 'NetPlan+', appSubtitle: null, initials: 'NP', logo: null }
    };
  }

  function emptyData() {
    return {
      dcs: [],
      forecast: [],
      history: [],
      destinations: [],
      skus: [],
      dcTranslation: [],
      salesHierarchy: [],
      shipToAddresses: []
    };
  }

  var state = {
    data: emptyData(),
    fileStatus: {},
    settings: defaultSettings(),
    scenarios: [],
    assignments: {},
    ui: { view: 'dashboard', activeScenarioId: null }
  };

  /* ---------------- event bus ---------------- */
  function onChange(fn) { listeners.push(fn); }
  function offChange(fn) { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }
  function emit(name) {
    scheduleSave();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](name); } catch (e) { if (window.console) console.error('listener error for ' + name, e); }
    }
  }

  /* ---------------- DC CRUD ---------------- */
  function newDcSkeleton(name) {
    return {
      id: U.uid('dc'), name: name || 'Neues DC', code: (name || 'DC').slice(0, 4).toUpperCase(),
      region: null, country: null, city: null, lat: null, lng: null, latSource: 'offen',
      capacity: 2000, usedSlots: 0,
      storageCostPerSlotMonth: null, handlingCostPerPallet: null, transportBasePerPallet: null, transportCostPerKm: null,
      fixedCostPerPeriod: 0, active: true, regionCosts: {}
    };
  }

  function findDcByName(name) {
    if (!name) return null;
    var norm = String(name).trim().toLowerCase();
    for (var i = 0; i < state.data.dcs.length; i++) {
      if (String(state.data.dcs[i].name).trim().toLowerCase() === norm) return state.data.dcs[i];
    }
    return null;
  }

  /* extra is applied only when the DC is newly created — an existing DC (possibly already
     hand-edited by the user) is returned untouched, so re-importing a file never silently
     overwrites capacity, coordinates, cost overrides etc. that were customized in the UI. */
  function getOrCreateDc(name, extra) {
    if (!name) return null;
    var dc = findDcByName(name);
    if (dc) return dc;
    dc = newDcSkeleton(name);
    if (extra) Object.assign(dc, filterUndefined(extra));
    state.data.dcs.push(dc);
    return dc;
  }

  function filterUndefined(obj) {
    var out = {};
    for (var k in obj) { if (obj.hasOwnProperty(k) && obj[k] !== undefined && obj[k] !== null) out[k] = obj[k]; }
    return out;
  }

  function addDc(fields) {
    var dc = newDcSkeleton(fields && fields.name);
    if (fields) Object.assign(dc, fields);
    state.data.dcs.push(dc);
    emit('dcs');
    return dc;
  }

  function updateDc(id, fields) {
    var dc = null;
    for (var i = 0; i < state.data.dcs.length; i++) if (state.data.dcs[i].id === id) dc = state.data.dcs[i];
    if (!dc) return null;
    Object.assign(dc, fields);
    emit('dcs');
    return dc;
  }

  function duplicateDc(id) {
    var src = null;
    for (var i = 0; i < state.data.dcs.length; i++) if (state.data.dcs[i].id === id) src = state.data.dcs[i];
    if (!src) return null;
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = U.uid('dc');
    copy.name = src.name + ' (Kopie)';
    copy.code = src.code;
    state.data.dcs.push(copy);
    emit('dcs');
    return copy;
  }

  function removeDc(id) {
    state.data.dcs = state.data.dcs.filter(function (d) { return d.id !== id; });
    emit('dcs');
  }

  /* ---------------- scenarios ---------------- */
  function saveScenario(def) {
    def.id = def.id || U.uid('sc');
    def.createdAt = def.createdAt || Date.now();
    var existingIdx = -1;
    for (var i = 0; i < state.scenarios.length; i++) if (state.scenarios[i].id === def.id) existingIdx = i;
    if (existingIdx >= 0) state.scenarios[existingIdx] = def; else state.scenarios.push(def);
    emit('scenarios');
    return def;
  }
  function removeScenario(id) {
    state.scenarios = state.scenarios.filter(function (s) { return s.id !== id; });
    emit('scenarios');
  }

  /* state.data must stay the SAME object reference forever (LNP.state.data is captured once
     below); resetting content means clearing+reassigning its keys in place, never replacing
     the object itself. */
  function replaceData(newData) {
    for (var k in state.data) { if (state.data.hasOwnProperty(k)) delete state.data[k]; }
    Object.assign(state.data, newData);
  }
  function replaceSettings(newSettings) {
    for (var k in state.settings) { if (state.settings.hasOwnProperty(k)) delete state.settings[k]; }
    Object.assign(state.settings, newSettings);
  }

  /* ---------------- import bulk setters ----------------
     `key` addresses the state.data[] slot (its name is fixed by emptyData()); `statusKey`
     addresses state.fileStatus[] and defaults to `key` — pass it explicitly whenever the
     data.js upload-slot id differs from the data property name (e.g. slot "sku" -> data
     property "skus", slot "shipToAddress" -> data property "shipToAddresses"), otherwise
     the Data & Import file card never picks up the "loaded" status though the import itself
     succeeded. */
  function setDataset(key, rows, status, statusKey) {
    state.data[key] = rows;
    state.fileStatus[statusKey || key] = status || { rows: rows.length, loadedAt: Date.now() };
    emit(key === 'forecast' || key === 'history' ? 'records' : key);
    emit('fileStatus');
  }

  function clearDataset(key, statusKey) {
    state.data[key] = [];
    delete state.fileStatus[statusKey || key];
    emit('records'); emit('fileStatus');
  }

  function resetAll() {
    replaceData(emptyData());
    state.fileStatus = {};
    state.scenarios = [];
    state.assignments = {};
    replaceSettings(defaultSettings());
    emit('reset');
  }

  /* ---------------- assignments (per-category simulation result, spec §5.4) ---------------- */
  function setAssignment(category, assignment) {
    state.assignments[category] = assignment;
    emit('assignments');
  }
  function getAssignment(category) { return state.assignments[category] || null; }
  function removeAssignment(category) { delete state.assignments[category]; emit('assignments'); }

  /* ---------------- settings ---------------- */
  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    emit('settings');
  }

  /* ---------------- persistence ---------------- */
  var saveTimer = null;
  var lastPersistWarning = null;

  function scheduleSave() {
    if (!state.settings.autosave) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 400);
  }

  function serialize(includeRaw) {
    var out = {
      version: 1,
      settings: state.settings,
      scenarios: state.scenarios,
      assignments: state.assignments,
      dcs: state.data.dcs,
      fileStatus: state.fileStatus
    };
    if (includeRaw) {
      out.forecast = state.data.forecast;
      out.history = state.data.history;
      out.destinations = state.data.destinations;
      out.skus = state.data.skus;
      out.dcTranslation = state.data.dcTranslation;
      out.salesHierarchy = state.data.salesHierarchy;
      out.shipToAddresses = state.data.shipToAddresses;
    }
    return out;
  }

  function persistNow() {
    try {
      var json = JSON.stringify(serialize(true));
      window.localStorage.setItem(STORAGE_KEY, json);
      lastPersistWarning = null;
    } catch (e) {
      try {
        var slim = JSON.stringify(serialize(false));
        window.localStorage.setItem(STORAGE_KEY, slim);
        lastPersistWarning = 'quota';
      } catch (e2) {
        lastPersistWarning = 'unavailable';
      }
    }
  }

  function loadPersisted() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
    if (!raw) return false;
    try {
      var obj = JSON.parse(raw);
      applyLoaded(obj);
      return true;
    } catch (e) { return false; }
  }

  function applyLoaded(obj) {
    if (!obj) return;
    replaceSettings(Object.assign(defaultSettings(), obj.settings || {}));
    state.scenarios = obj.scenarios || [];
    state.assignments = obj.assignments || {};
    var nd = emptyData();
    nd.dcs = obj.dcs || [];
    nd.forecast = obj.forecast || [];
    nd.history = obj.history || [];
    nd.destinations = obj.destinations || [];
    nd.skus = obj.skus || [];
    nd.dcTranslation = obj.dcTranslation || [];
    nd.salesHierarchy = obj.salesHierarchy || [];
    nd.shipToAddresses = obj.shipToAddresses || [];
    replaceData(nd);
    state.fileStatus = obj.fileStatus || {};
  }

  function exportProjectFile() {
    var json = JSON.stringify(serialize(true), null, 0);
    var blob = new Blob([json], { type: 'application/json' });
    U.downloadBlob(blob, 'netplan-projekt-' + new Date().toISOString().slice(0, 10) + '.json');
  }

  function importProjectFile(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var obj = JSON.parse(e.target.result);
        applyLoaded(obj);
        emit('project');
        cb(null);
      } catch (err) { cb(err); }
    };
    reader.onerror = function () { cb(new Error('read error')); };
    reader.readAsText(file);
  }

  LNP.state = {
    data: state.data,
    settings: state.settings,
    get scenarios() { return state.scenarios; },
    get fileStatus() { return state.fileStatus; },
    get assignments() { return state.assignments; },
    ui: state.ui,
    onChange: onChange, offChange: offChange, emit: emit,
    addDc: addDc, updateDc: updateDc, duplicateDc: duplicateDc, removeDc: removeDc,
    findDcByName: findDcByName, getOrCreateDc: getOrCreateDc,
    saveScenario: saveScenario, removeScenario: removeScenario,
    setAssignment: setAssignment, getAssignment: getAssignment, removeAssignment: removeAssignment,
    setDataset: setDataset, clearDataset: clearDataset, resetAll: resetAll,
    updateSettings: updateSettings,
    init: function () { loadPersisted(); },
    persistNow: persistNow,
    getPersistWarning: function () { return lastPersistWarning; },
    exportProjectFile: exportProjectFile, importProjectFile: importProjectFile,
    totalRecordCount: function () {
      return state.data.forecast.length + state.data.history.length + state.data.destinations.length +
        state.data.skus.length + state.data.dcTranslation.length + state.data.salesHierarchy.length + state.data.shipToAddresses.length;
    }
  };
})();
