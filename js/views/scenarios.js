/* NetPlan+ views/scenarios.js — "Szenarien": Base + 3 consolidation templates + custom editor,
   KPI comparison including "aktueller Stand", two charts, assignment matrix (spec §8/§5.5). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, I = LNP.i18n;

  var selectedIds = ['base'];

  function scenarioObjById(id) {
    if (id === 'base') return null;
    return LNP.state.scenarios.filter(function (s) { return s.id === id; })[0] || null;
  }
  function scenarioLabel(id) {
    if (id === 'base') return I.t('Basis (Ist-Zustand)');
    var s = scenarioObjById(id);
    return s ? s.name : id;
  }
  function compareParams() { return { category: 'all', dataset: 'forecast', settings: LNP.state.settings }; }

  function openScenarioEditor(existing, templateKey) {
    var dcs = LNP.sim.candidateDcs();
    if (!dcs.length) { LNP.ui.toast(I.t('Keine aktiven Distributionszentren vorhanden.'), 'bad'); return; }
    var base = existing ? { id: existing.id, name: existing.name, dcMapping: Object.assign({}, existing.dcMapping), regionOverrides: Object.assign({}, existing.regionOverrides), type: existing.type } : { id: null, name: '', dcMapping: {}, regionOverrides: {}, type: 'custom' };
    var warnings = [];
    if (!existing && templateKey) {
      var built = LNP.sim.buildScenarioTemplate(templateKey);
      base.dcMapping = built.dcMapping; warnings = built.warnings;
      var tmpl = LNP.sim.SCENARIO_TEMPLATES.filter(function (t) { return t.key === templateKey; })[0];
      base.name = tmpl ? tmpl.name : 'Neues Szenario'; base.type = templateKey;
    } else if (!existing) {
      dcs.forEach(function (dc) { base.dcMapping[dc.id] = dc.id; });
      base.name = 'Benutzerdefiniertes Szenario';
    }

    var rows = dcs.map(function (dc) {
      var current = base.dcMapping[dc.id] || dc.id;
      var options = dcs.map(function (t) { return '<option value="' + t.id + '"' + (t.id === current ? ' selected' : '') + '>' + U.escapeHtml(t.name) + '</option>'; }).join('');
      return '<div class="map-row"><div class="map-field-name">' + U.escapeHtml(dc.name) + '</div>' +
        '<select class="js-scenario-target" data-source="' + dc.id + '">' + options + '</select><div></div></div>';
    }).join('');

    var districts = LNP.sim.allDistricts();
    var overrideRows = districts.map(function (d) {
      var current = (base.regionOverrides || {})[d.district] || '';
      var opts = '<option value=""' + (current === '' ? ' selected' : '') + '>Automatisch (Basistopologie)</option>' +
        dcs.map(function (dc) { return '<option value="' + dc.id + '"' + (dc.id === current ? ' selected' : '') + '>' + U.escapeHtml(dc.name) + '</option>'; }).join('');
      return '<div class="map-row"><div class="map-field-name">' + U.escapeHtml(d.name) + '</div>' +
        '<select class="js-scenario-region-override" data-district="' + U.escapeHtml(d.district) + '">' + opts +
        '</select><div></div></div>';
    }).join('');

    var body = '<div class="field"><label data-t="Name">' + I.t('Name') + '</label><input type="text" id="scName" value="' + U.escapeHtml(base.name) + '"></div>' +
      (warnings.length ? warnings.map(function (w) { return '<div class="note-box warn">' + U.escapeHtml(w) + '</div>'; }).join('') : '') +
      '<h3>DC&#8209;Zuordnung</h3><p class="help">Jeder Standort wird auf einen Ziel-Standort abgebildet (identisch = bleibt eigenständig / Standort besteht weiter).</p>' +
      '<div class="map-row" style="border-bottom:2px solid var(--border);font-weight:700;font-size:11px;color:var(--text-faint);text-transform:uppercase;">' +
      '<div>Quelle</div><div>Ziel</div><div></div></div>' + rows +
      (districts.length ? '<hr class="hr"><h3>Regionale Zuordnung überschreiben</h3>' +
        '<p class="help">Optional: eine Region fest einem Standort zuweisen, unabhängig von der aus den Versanddaten abgeleiteten Basistopologie (Beispiel: „Sevlievo deckt Osteuropa“).</p>' +
        '<div class="map-row" style="border-bottom:2px solid var(--border);font-weight:700;font-size:11px;color:var(--text-faint);text-transform:uppercase;">' +
        '<div>Region</div><div>Zuständiges DC</div><div></div></div>' + overrideRows : '');

    LNP.ui.openModal(existing ? I.t('Bearbeiten') : I.t('Szenario speichern'), body, {
      maxWidth: '580px',
      footerHtml: '<button class="btn" id="scCancel" data-t="Abbrechen">' + I.t('Abbrechen') + '</button>' +
        '<button class="btn btn-primary" id="scSave" data-t="Speichern">' + I.t('Speichern') + '</button>',
      onMount: function (r) {
        r.querySelector('#scCancel').addEventListener('click', LNP.ui.closeModal);
        r.querySelector('#scSave').addEventListener('click', function () {
          var name = r.querySelector('#scName').value.trim() || base.name;
          var mapping = {};
          r.querySelectorAll('.js-scenario-target').forEach(function (sel) { mapping[sel.getAttribute('data-source')] = sel.value; });
          var regionOverrides = {};
          r.querySelectorAll('.js-scenario-region-override').forEach(function (sel) {
            if (sel.value) regionOverrides[sel.getAttribute('data-district')] = sel.value;
          });
          var def = { id: base.id, name: name, type: base.type, dcMapping: mapping, regionOverrides: regionOverrides };
          var saved = LNP.state.saveScenario(def);
          if (selectedIds.indexOf(saved.id) === -1) selectedIds.push(saved.id);
          LNP.ui.closeModal();
          LNP.ui.toast(I.t('Speichern') + ': ' + name, 'good');
        });
      }
    });
  }

  function renderCompare(container) {
    var out = container.querySelector('#scenarioCompare');
    if (!out) return;
    if (!selectedIds.length) { out.innerHTML = '<div class="card empty">Bitte mindestens ein Szenario zum Vergleich auswählen.</div>'; return; }

    var results = selectedIds.map(function (id) {
      return { id: id, label: scenarioLabel(id), net: LNP.sim.computeScenarioNetwork(scenarioObjById(id), compareParams()) };
    });

    var overviewRows = results.map(function (r) {
      var storage = U.sum(r.net.perDc, function (d) { return d.storageDemandPallets; });
      var bins = U.sum(r.net.perDc, function (d) { return d.pickingBins; });
      return '<tr><td>' + U.escapeHtml(r.label) + '</td><td class="num">' + I.fmtInt(r.net.perDc.length) + '</td>' +
        '<td class="num">' + I.fmtInt(r.net.totalPallets) + '</td><td class="num">' + I.fmtInt(storage) + '</td>' +
        '<td class="num">' + I.fmtInt(bins) + '</td></tr>';
    }).join('');

    var allDcNames = {};
    results.forEach(function (r) { r.net.perDc.forEach(function (d) { allDcNames[d.dcName] = true; }); });
    var dcNameList = Object.keys(allDcNames).sort();
    var matrixHeader = results.map(function (r) { return '<th>' + U.escapeHtml(r.label) + '</th>'; }).join('');
    var matrixRows = dcNameList.map(function (name) {
      var cells = results.map(function (r) {
        var d = r.net.perDc.filter(function (x) { return x.dcName === name; })[0];
        return '<td class="num">' + (d ? I.fmtInt(d.pallets) + ' PAL' : '–') + '</td>';
      }).join('');
      return '<tr><td>' + U.escapeHtml(name) + '</td>' + cells + '</tr>';
    }).join('');

    var dcs = LNP.sim.candidateDcs();
    var mapRows = dcs.map(function (dc) {
      var cells = results.map(function (r) {
        var scenario = scenarioObjById(r.id);
        var mapping = (scenario && scenario.dcMapping) || {};
        var targetId = LNP.sim.resolveTarget(mapping, dc.id);
        var target = LNP.sim.dcById(targetId);
        var same = targetId === dc.id;
        return '<td>' + (same ? '<span class="muted">= ' + U.escapeHtml(dc.name) + '</span>' : '&rarr; ' + U.escapeHtml(target ? target.name : '?')) + '</td>';
      }).join('');
      return '<tr><td>' + U.escapeHtml(dc.name) + '</td>' + cells + '</tr>';
    }).join('');

    out.innerHTML =
      '<div class="card"><h2 data-t="Kennzahlenvergleich">' + I.t('Kennzahlenvergleich') + '</h2>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th class="num">DCs</th><th class="num">PAL</th><th class="num">Storage PAL</th><th class="num">Picking Bins</th></tr></thead><tbody>' + overviewRows + '</tbody></table></div>' +
      '<div class="grid grid-2" style="margin-top:16px">' +
      '<div class="chart-box"><canvas id="chartScenarioPallets"></canvas></div>' +
      '<div class="chart-box"><canvas id="chartScenarioStorage"></canvas></div>' +
      '</div></div>' +
      '<div class="card"><h3>Paletten je DC im Vergleich</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>DC</th>' + matrixHeader + '</tr></thead><tbody>' + matrixRows + '</tbody></table></div></div>' +
      '<div class="card"><h2 data-t="Zuordnungsmatrix">' + I.t('Zuordnungsmatrix') + '</h2><div class="table-wrap"><table class="tbl"><thead><tr><th>DC</th>' + matrixHeader + '</tr></thead><tbody>' + mapRows + '</tbody></table></div></div>';

    LNP.charts.bar('chartScenarioPallets', results.map(function (r) { return r.label; }), [{ label: 'PAL', data: results.map(function (r) { return Math.round(r.net.totalPallets); }) }]);
    LNP.charts.bar('chartScenarioStorage', results.map(function (r) { return r.label; }), [{ label: 'Storage PAL', data: results.map(function (r) { return Math.round(U.sum(r.net.perDc, function (d) { return d.storageDemandPallets; })); }) }]);
  }

  function render(container) {
    if (!LNP.state.data.forecast.length) {
      container.innerHTML = '<div class="empty card"><h2 data-t="Keine Daten geladen">' + I.t('Keine Daten geladen') + '</h2></div>';
      return;
    }
    var savedScenarios = LNP.state.scenarios;
    var templateButtons = LNP.sim.SCENARIO_TEMPLATES.filter(function (t) { return t.key !== 'base'; }).map(function (t) {
      return '<button class="btn btn-sm js-new-template" data-key="' + t.key + '">' + U.escapeHtml(t.name) + '</button>';
    }).join(' ');
    var listRows = savedScenarios.map(function (s) {
      return '<tr><td>' + U.escapeHtml(s.name) + '</td><td>' + I.fmtDate(new Date(s.createdAt)) + '</td>' +
        '<td><input type="checkbox" class="js-select-scenario" data-id="' + s.id + '"' + (selectedIds.indexOf(s.id) !== -1 ? ' checked' : '') + '></td>' +
        '<td class="row-actions"><button class="btn btn-sm js-edit-scenario" data-id="' + s.id + '" data-t="Bearbeiten">' + I.t('Bearbeiten') + '</button>' +
        '<button class="btn btn-sm btn-danger js-del-scenario" data-id="' + s.id + '" data-t="Löschen">' + I.t('Löschen') + '</button></td></tr>';
    }).join('');

    container.innerHTML =
      '<div class="card"><div class="card-head"><h2 data-t="Szenarien">' + I.t('Szenarien') + '</h2>' +
      '<div class="actions">' + templateButtons + ' <button class="btn btn-sm" id="scNewCustom">Benutzerdefiniert</button></div></div>' +
      (savedScenarios.length ?
        '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Name">' + I.t('Name') + '</th><th data-t="Erstellt">' + I.t('Erstellt') + '</th><th data-t="Vergleichen">' + I.t('Vergleichen') + '</th><th data-t="Aktionen">' + I.t('Aktionen') + '</th></tr></thead><tbody>' + listRows + '</tbody></table></div>' :
        '<p class="help">Noch keine Szenarien gespeichert. Vorlage wählen oder benutzerdefiniert anlegen.</p>') +
      '<div class="checkbox-row" style="margin-top:10px"><input type="checkbox" id="scSelectBase"' + (selectedIds.indexOf('base') !== -1 ? ' checked' : '') + '>' +
      '<label style="margin:0" for="scSelectBase" data-t="Aktueller Stand">' + I.t('Aktueller Stand') + '</label></div>' +
      '</div>' +
      '<div id="scenarioCompare"></div>';

    container.querySelectorAll('.js-new-template').forEach(function (btn) { btn.addEventListener('click', function () { openScenarioEditor(null, btn.getAttribute('data-key')); }); });
    var customBtn = container.querySelector('#scNewCustom'); if (customBtn) customBtn.addEventListener('click', function () { openScenarioEditor(null, null); });
    container.querySelectorAll('.js-edit-scenario').forEach(function (btn) {
      btn.addEventListener('click', function () { var s = scenarioObjById(btn.getAttribute('data-id')); if (s) openScenarioEditor(s, null); });
    });
    container.querySelectorAll('.js-del-scenario').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        LNP.ui.confirmDialog(I.t('Löschen'), scenarioLabel(id), function () {
          LNP.state.removeScenario(id);
          selectedIds = selectedIds.filter(function (x) { return x !== id; });
          render(container);
        });
      });
    });
    container.querySelectorAll('.js-select-scenario').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var id = chk.getAttribute('data-id');
        if (chk.checked) { if (selectedIds.indexOf(id) === -1) selectedIds.push(id); }
        else selectedIds = selectedIds.filter(function (x) { return x !== id; });
        renderCompare(container);
      });
    });
    var baseChk = container.querySelector('#scSelectBase');
    if (baseChk) baseChk.addEventListener('change', function () {
      if (baseChk.checked) { if (selectedIds.indexOf('base') === -1) selectedIds.push('base'); }
      else selectedIds = selectedIds.filter(function (x) { return x !== 'base'; });
      renderCompare(container);
    });

    renderCompare(container);
  }

  LNP.viewScenarios = { render: render };
})();
