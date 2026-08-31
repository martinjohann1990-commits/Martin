/* NetPlan+ app.js — navigation, header, boot sequence (spec §4/§8). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var I = LNP.i18n;

  var VIEWS = {
    dashboard: { title: 'Dashboard', mod: 'viewDashboard' },
    data: { title: 'Daten & Import', mod: 'viewData' },
    dcs: { title: 'DC-Verwaltung', mod: 'viewDcs' },
    simulation: { title: 'Simulation', mod: 'viewSimulation' },
    scenarios: { title: 'Szenarien', mod: 'viewScenarios' },
    reports: { title: 'Berichte', mod: 'viewReports' },
    export: { title: 'Export & Projekt', mod: 'viewExport' }
  };

  var currentView = 'dashboard';

  function renderBrand() {
    var b = LNP.state.settings.branding || {};
    var mark = document.getElementById('brandMark');
    var name = document.getElementById('brandName');
    var sub = document.getElementById('brandSub');
    if (b.logo) mark.innerHTML = '<img src="' + b.logo + '" alt="">'; else mark.textContent = b.initials || 'NP';
    name.textContent = b.appName || 'NetPlan+';
    sub.textContent = b.appSubtitle || I.t('Logistiknetzwerk-Analyse');
    document.title = (b.appName || 'NetPlan+') + ' – ' + I.t('Logistiknetzwerk-Analyse');
  }

  function renderFooter() {
    document.getElementById('dataStatusLine').textContent = I.fmtInt(LNP.state.totalRecordCount()) + ' ' + I.t('Datensätze');
  }

  function renderView(key) {
    currentView = key;
    var meta = VIEWS[key];
    document.querySelectorAll('.nav-item').forEach(function (btn) { btn.classList.toggle('active', btn.getAttribute('data-view') === key); });
    document.querySelectorAll('.view').forEach(function (el) { el.hidden = el.id !== 'view-' + key; });
    document.getElementById('viewTitle').textContent = I.t(meta.title);
    var container = document.getElementById('view-' + key);
    var view = LNP[meta.mod];
    if (view && view.render) {
      try { view.render(container); } catch (e) {
        if (window.console) console.error('render error for view ' + key, e);
        container.innerHTML = '<div class="card empty"><h2>Fehler beim Darstellen dieser Ansicht</h2><p class="mono">' + LNP.util.escapeHtml(String(e && e.message || e)) + '</p></div>';
      }
    }
    renderFooter();
    try { window.location.hash = key; } catch (e) {}
    document.getElementById('sidebar').classList.remove('open');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { window.localStorage.setItem('lnp.theme', theme); } catch (e) {}
    document.getElementById('themeToggle').innerHTML = theme === 'dark' ? '&#9789;' : '&#9788;';
  }

  function bindHeader() {
    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.addEventListener('click', function () { renderView(btn.getAttribute('data-view')); });
    });
    document.getElementById('menuToggle').addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('open');
    });
    document.getElementById('demoBtn').addEventListener('click', function () {
      var hasData = LNP.state.data.forecast.length > 0;
      if (hasData) {
        LNP.ui.confirmDialog(I.t('Demodaten laden'), I.t('Vorhandene Daten, DCs, Szenarien und Einstellungen werden durch die Demodaten ersetzt.'), function () { LNP.demo.load(); });
      } else {
        LNP.demo.load();
      }
    });
    document.getElementById('langToggle').addEventListener('click', function () {
      var next = I.get() === 'de' ? 'en' : 'de';
      I.setLang(next);
      document.getElementById('langToggle').textContent = next.toUpperCase();
    });
    document.getElementById('themeToggle').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  function boot() {
    LNP.state.init();
    I.init();
    document.getElementById('langToggle').textContent = I.get().toUpperCase();
    var savedTheme = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(savedTheme);
    bindHeader();

    var initial = 'dashboard';
    try {
      var h = window.location.hash.replace('#', '');
      if (VIEWS[h]) initial = h;
    } catch (e) {}

    renderBrand();
    renderView(initial);

    LNP.state.onChange(function () {
      renderBrand();
      renderFooter();
      renderView(currentView);
    });
  }

  LNP.app = { goTo: function (key) { if (VIEWS[key]) renderView(key); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
