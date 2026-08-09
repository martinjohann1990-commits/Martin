/* =========================================================================
   app.js – Navigation, Einstellungen, Initialisierung
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state, fmt = U.fmt;

  var VIEWS = {
    dashboard: { title: 'Dashboard', sub: 'Überblick über Netzwerk, Auslastung und Kosten' },
    data: { title: 'Daten & Import', sub: 'Versandhistorie und Forecast einlesen, Zielreichweiten festlegen' },
    dcs: { title: 'DC-Verwaltung', sub: 'Distributionszentren anlegen, bearbeiten und bewerten' },
    sim: { title: 'Simulation', sub: 'Zuordnung der Produktkategorien zu Distributionszentren ermitteln' },
    scenarios: { title: 'Szenarien', sub: 'Varianten parallel anlegen und gegenüberstellen' },
    export: { title: 'Export & Projekt', sub: 'Ergebnisse exportieren, Projekt sichern, Kostenparameter pflegen' }
  };

  /* ------------------------------------------------------------ Navigation */
  function showView(name) {
    if (!VIEWS[name]) name = 'dashboard';

    U.$$('.view').forEach(function (v) { v.classList.remove('is-active'); });
    var view = U.$('#view-' + name);
    if (view) view.classList.add('is-active');

    U.$$('.nav-item').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === name);
    });

    currentView = name;
    U.$('#view-title').textContent = U.t(VIEWS[name].title);
    U.$('#view-sub').textContent = U.t(VIEWS[name].sub);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    if (name === 'dashboard') { NS.dashboard.render(); NS.mapview.invalidate(); }
    if (name === 'sim') NS.simui.refreshControls();
    if (name === 'scenarios') NS.scenarios.render();
    if (name === 'dcs') NS.dcs.render();
    if (name === 'data') NS.data.render();

    try { location.hash = name; } catch (e) { /* file:// ohne Hash-Unterstützung */ }
  }

  var currentView = 'dashboard';

  /* ------------------------------------------------------------ Sprache */
  function applyLang(next) {
    NS.i18n.setLang(next);
    U.$('#btn-lang').textContent = next === 'de' ? 'EN' : 'DE';
    // Sämtliche dynamisch erzeugten Inhalte neu aufbauen
    NS.dcs.render();
    NS.data.render();
    NS.dashboard.render();
    NS.scenarios.render();
    NS.simui.refreshControls();
    var last = NS.simui.getLastResult();
    if (last) NS.simui.simulate();
    renderFormulas();
    updateStoragePill();
    updateSidebar();
    showView(currentView);
  }

  function initLang() {
    U.$('#btn-lang').textContent = NS.i18n.get() === 'de' ? 'EN' : 'DE';
    U.$('#btn-lang').addEventListener('click', function () {
      applyLang(NS.i18n.get() === 'de' ? 'en' : 'de');
    });
  }

  /* ------------------------------------------------------------ Theme */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('netplan.theme', theme); } catch (e) { /* ignorieren */ }
    NS.charts.refreshTheme();
    // Diagramme und Karte mit den neuen Farbwerten neu zeichnen
    NS.dashboard.render();
    NS.scenarios.render();
    var last = NS.simui.getLastResult();
    if (last) NS.simui.simulate();
  }

  function initTheme() {
    // Das Theme wurde bereits vor dem ersten Zeichnen gesetzt; hier wird nur
    // sichergestellt, dass ein Wert vorhanden ist.
    if (!document.documentElement.getAttribute('data-theme')) {
      var stored = null;
      try { stored = localStorage.getItem('netplan.theme'); } catch (e) { /* ignorieren */ }
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));
    }

    U.$('#btn-theme').addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  /* ------------------------------------------------------------ Einstellungen */
  /**
   * Bindet ein Zahlenfeld an einen Einstellungswert.
   * @param {string} sel      Selektor
   * @param {string} key      Schlüssel in settings
   * @param {object} [opt]    { min, allowEmpty, factor }
   */
  function bindNumber(sel, key, opt) {
    var node = U.$(sel);
    if (!node) return;
    var o = opt || {};
    var s = S.settings();
    var current = s[key];
    node.value = o.allowEmpty && (current === null || current === undefined) ? ''
      : (o.factor ? current * o.factor : current);

    node.addEventListener('change', function () {
      var raw = node.value.trim();
      if (raw === '' && o.allowEmpty) {
        S.settings()[key] = null;
      } else {
        var v = U.num(raw, NaN);
        if (!isFinite(v) || (o.min !== undefined && v < o.min)) {
          U.toast(U.tf('Ungültiger Wert – bitte eine Zahl{0} eingeben.',
            o.min !== undefined ? U.tf(' ≥ {0}', o.min) : ''), 'warn');
          node.value = o.factor ? S.settings()[key] * o.factor : S.settings()[key];
          return;
        }
        S.settings()[key] = o.factor ? v / o.factor : v;
      }
      S.emit('settings');
    });
  }

  function initSettings() {
    bindNumber('#cfg-qtyPerPallet', 'qtyPerPallet', { min: 1 });
    bindNumber('#cfg-volPerPallet', 'volPerPallet', { min: 0.01 });
    bindNumber('#cfg-horizon', 'horizonDaysOverride', { min: 1, allowEmpty: true });
    bindNumber('#cfg-stockFactor', 'stockFactor', { min: 0.1 });
    bindNumber('#cfg-targetDays', 'targetDaysGlobal', { min: 1 });

    bindNumber('#cfg-costPerKm', 'costPerPalletKm', { min: 0 });
    bindNumber('#cfg-costBase', 'costBasePerPallet', { min: 0 });
    bindNumber('#cfg-storageCost', 'storageCostPerSlotMonth', { min: 0 });
    bindNumber('#cfg-handlingCost', 'handlingCostPerPallet', { min: 0 });
    bindNumber('#cfg-kmPerDay', 'kmPerDay', { min: 1 });
    bindNumber('#cfg-handlingDays', 'handlingDays', { min: 0 });

    var auto = U.$('#cfg-autosave');
    auto.checked = S.settings().autosave !== false;
    auto.addEventListener('change', function () {
      S.settings().autosave = auto.checked;
      updateStoragePill();
      if (auto.checked) S.save();
      else S.clearStorage();
      U.toast(auto.checked ? 'Automatische Zwischenspeicherung aktiviert.' : 'Zwischenspeicherung deaktiviert und gelöschter Browser-Speicher.', 'good');
    });

    U.$('#btn-reset-all').addEventListener('click', function () {
      if (!U.ask('Wirklich alles zurücksetzen? DCs, Daten, Zuordnungen und Szenarien werden gelöscht.')) return;
      S.reset();
      U.toast('Arbeitsstand zurückgesetzt.', 'warn');
      showView('dashboard');
    });
  }

  function updateStoragePill() {
    var on = S.settings().autosave !== false;
    U.$('#storage-pill').classList.toggle('is-off', !on);
    U.$('#storage-label').textContent = U.t(on ? 'Auto-Speichern: an' : 'Auto-Speichern: aus');
  }

  /* ------------------------------------------------------------ Rechenlogik-Übersicht */
  function renderFormulas() {
    var s = S.settings();
    var items = [
      {
        title: 'Paletten je Datensatz',
        code: U.tf('Paletten = Paletten-Äquivalent\n      → sonst Paletten\n      → sonst Volumen ÷ {0} m³\n      → sonst Menge ÷ {1} Stück', fmt.dec1(s.volPerPallet), fmt.int(s.qtyPerPallet)),
        text: 'Die erste verfügbare Größe wird verwendet. So lassen sich Dateien mit unterschiedlichem Detailgrad gemeinsam auswerten.'
      },
      {
        title: 'Ziel-Bestand',
        code: U.tf('Bedarf/Tag = Paletten im Zeitraum ÷ Zeitraum in Tagen\nZiel-Bestand = Bedarf/Tag × Zielreichweite × {0}', fmt.dec2(s.stockFactor)),
        text: 'Der Ziel-Bestand belegt Stellplätze im DC und ist damit die kapazitätswirksame Größe.'
      },
      {
        title: 'Transportkosten',
        code: U.tf('Kosten/Palette = Grundkosten + Kosten/km × Distanz\nDistanz = Luftlinie × {0} (Umwegfaktor)', fmt.dec2(U.DETOUR)),
        text: 'Regionsspezifische Pauschalen im DC überschreiben die distanzbasierte Rechnung.'
      },
      {
        title: 'Lager- und Handlingkosten',
        code: 'Lager = Ziel-Bestand × €/Stellplatz/Monat × Monate\nHandling = Paletten × €/Palette',
        text: 'Werte je DC haben Vorrang vor den Netzwerk-Standardwerten.'
      },
      {
        title: 'Score Kapazität & Balance',
        code: U.tf('100 → leeres DC\n 50 → an der Ziel-Auslastungsgrenze ({0})\n  0 → ab Vollauslastung', fmt.pct(s.maxUtilization)),
        text: 'Belohnt Reserve und eine ausgeglichene Auslastung im Netzwerk.'
      },
      {
        title: 'Score Transport',
        code: 'Score = 100 × günstigste €/Palette ÷ eigene €/Palette',
        text: 'Verhältnisskala: doppelte Kosten ergeben den halben Teil-Score.'
      },
      {
        title: 'Score Zielreichweite',
        code: 'Score = 100 × (0,7 × Bestandsfähigkeit + 0,3 × Reaktionsfähigkeit)\nBestandsfähigkeit = freie Plätze ÷ Ziel-Bestand (max. 1)\nReaktionsfähigkeit = 1 − Transitzeit ÷ Zielreichweite',
        text: U.tf('Transitzeit = {0} Tage Handling + Distanz ÷ {1} km/Tag.', fmt.dec1(s.handlingDays), fmt.int(s.kmPerDay))
      },
      {
        title: 'Gesamt-Score',
        code: 'Score = w₁ × Kapazität + w₂ × Transport + w₃ × Reichweite',
        text: 'Die Gewichte werden auf 100 % normiert. Die Teil-Beiträge sind im Diagramm „Score-Zusammensetzung“ einzeln ausgewiesen.'
      }
    ];

    U.$('#formula-grid').innerHTML = items.map(function (i) {
      return '<div class="formula"><h4>' + U.esc(U.t(i.title)) + '</h4><code>' + U.esc(U.t(i.code)) + '</code><p>' + U.esc(U.t(i.text)) + '</p></div>';
    }).join('');
  }

  /* ------------------------------------------------------------ Sidebar */
  function updateSidebar() {
    var st = S.get();
    U.$('#side-dc-count').textContent = fmt.int(st.dcs.length);
    U.$('#side-rec-count').textContent = fmt.int(st.records.length);
    U.$('#side-scn-count').textContent = fmt.int(st.scenarios.length);
  }

  /* ------------------------------------------------------------ Start */
  function init() {
    NS.i18n.init();
    initTheme();
    NS.charts.init();

    var restored = S.load();

    NS.dcs.init();
    NS.data.init();
    NS.simui.init();
    NS.dashboard.init();
    NS.scenarios.init();
    NS.exporter.init();
    initSettings();

    initLang();

    U.$('#nav').addEventListener('click', function (e) {
      var btn = e.target.closest('.nav-item');
      if (btn) showView(btn.getAttribute('data-view'));
    });

    U.$$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.getAttribute('data-goto')); });
    });

    ['#btn-demo', '#btn-demo-2'].forEach(function (sel) {
      var node = U.$(sel);
      if (node) node.addEventListener('click', function () {
        NS.demo.load();
        showView('dashboard');
      });
    });

    S.onChange(function () {
      updateSidebar();
      renderFormulas();
    });

    NS.mapview.init();

    // Erstes Rendern aller Ansichten
    NS.dcs.render();
    NS.data.render();
    NS.dashboard.render();
    NS.scenarios.render();
    NS.simui.refreshControls();
    updateSidebar();
    updateStoragePill();
    renderFormulas();

    var initial = (location.hash || '').replace('#', '');
    showView(VIEWS[initial] ? initial : 'dashboard');

    if (restored) {
      U.toast('Zwischengespeicherter Arbeitsstand wiederhergestellt.', 'good');
    }

    window.addEventListener('resize', U.debounce(function () {
      if (U.$('#view-dashboard').classList.contains('is-active')) NS.mapview.invalidate();
    }, 300));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  NS.app = { showView: showView, init: init };
})(window.LNP);
