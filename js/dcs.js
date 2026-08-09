/* =========================================================================
   dcs.js – Verwaltung der Distributionszentren (anlegen, bearbeiten, löschen)
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state, fmt = U.fmt;
  var editingId = null;

  /* ------------------------------------------------------------ Tabelle */
  function render() {
    var st = S.get();
    var table = U.$('#table-dcs');
    var empty = U.$('#dc-empty');
    if (!table) return;

    empty.classList.toggle('hidden', st.dcs.length > 0);

    var columns = [
      {
        label: 'DC', render: function (d) {
          return '<span style="display:inline-flex;align-items:center;gap:8px">' +
            '<i class="dc-dot" style="background:' + NS.charts.seriesColor(dcIndex(d.id)) + '"></i>' +
            '<b>' + U.esc(d.name) + '</b>' + (d.code ? ' <span class="t-muted">(' + U.esc(d.code) + ')</span>' : '') +
            '</span>';
        }
      },
      { label: 'Standort', render: function (d) { return U.esc([d.region, d.country].filter(Boolean).join(', ') || '–'); } },
      {
        label: 'Koordinaten', render: function (d) {
          return U.isNum(d.lat) && U.isNum(d.lng)
            ? '<span class="t-muted">' + fmt.dec2(d.lat) + ' / ' + fmt.dec2(d.lng) + '</span>'
            : '<span class="badge badge-warn">fehlt</span>';
        }
      },
      { label: 'Kapazität', num: true, render: function (d) { return fmt.int(d.capacity); } },
      {
        label: 'Grundbelegung', num: true, render: function (d) {
          return fmt.int(d.usedSlots) + ' <span class="t-muted">(' +
            (d.capacity > 0 ? fmt.pct(d.usedSlots / d.capacity) : '–') + ')</span>';
        }
      },
      {
        label: 'Lager €/Platz/Mon.', num: true, render: function (d) {
          return d.storageCostPerSlotMonth === null
            ? '<span class="t-muted">' + fmt.dec2(S.settings().storageCostPerSlotMonth) + '*</span>'
            : fmt.dec2(d.storageCostPerSlotMonth);
        }
      },
      {
        label: 'Transport €/Pal.', num: true, render: function (d) {
          var base = d.transportBasePerPallet === null ? S.settings().costBasePerPallet : d.transportBasePerPallet;
          var km = d.transportCostPerKm === null ? S.settings().costPerPalletKm : d.transportCostPerKm;
          return fmt.dec2(base) + ' <span class="t-muted">+ ' + fmt.dec2(km) + '/km</span>';
        }
      },
      {
        label: 'Sonderpreise', num: true, render: function (d) {
          var n = Object.keys(d.regionCosts || {}).length;
          return n ? '<span class="badge">' + n + ' Region(en)</span>' : '<span class="t-muted">–</span>';
        }
      },
      {
        label: 'Status', render: function (d) {
          return d.active
            ? '<span class="badge badge-good">aktiv</span>'
            : '<span class="badge">inaktiv</span>';
        }
      },
      {
        label: '', render: function (d) {
          return '<span class="tools">' +
            '<button class="btn btn-xs" data-act="edit" data-id="' + d.id + '">Bearbeiten</button>' +
            '<button class="btn btn-xs" data-act="dup" data-id="' + d.id + '">Duplizieren</button>' +
            '<button class="btn btn-xs btn-danger" data-act="del" data-id="' + d.id + '">Löschen</button>' +
            '</span>';
        }
      }
    ];

    U.renderTable(table, columns, st.dcs, {
      rowClass: function (d) { return d.active ? '' : 'is-muted'; }
    });

    renderKPIs();
  }

  function dcIndex(dcId) {
    return S.get().dcs.findIndex(function (d) { return d.id === dcId; });
  }

  function renderKPIs() {
    var st = S.get();
    var act = S.activeDCs();
    var cap = U.sum(act, function (d) { return d.capacity; });
    var used = U.sum(act, function (d) { return S.usedSlots(d.id); });
    var withCoords = act.filter(function (d) { return U.isNum(d.lat) && U.isNum(d.lng); }).length;

    var tiles = [
      { label: 'Aktive DCs', value: fmt.int(act.length), sub: st.dcs.length - act.length + ' inaktiv', accent: 'var(--series-1)' },
      { label: 'Gesamtkapazität', value: fmt.int(cap), unit: 'Stellplätze', accent: 'var(--series-3)' },
      {
        label: 'Belegung (inkl. Zuordnungen)', value: fmt.pct(cap > 0 ? used / cap : 0),
        sub: fmt.int(used) + ' von ' + fmt.int(cap), bar: cap > 0 ? used / cap : 0, accent: 'var(--series-4)'
      },
      { label: 'Standorte mit Koordinaten', value: withCoords + ' / ' + act.length, sub: 'Grundlage für Distanzberechnung', accent: 'var(--series-7)' }
    ];
    NS.charts.renderKPIs(U.$('#dc-kpis'), tiles);
  }

  /* ------------------------------------------------------------ Modal */
  function openModal(dcId) {
    editingId = dcId || null;
    var dc = dcId ? S.getDC(dcId) : null;
    var s = S.settings();

    U.$('#dc-modal-title').textContent = dc ? 'DC bearbeiten' : 'Neues Distributionszentrum';
    setVal('#dc-name', dc ? dc.name : '');
    setVal('#dc-code', dc ? dc.code : '');
    setVal('#dc-region', dc ? dc.region : '');
    setVal('#dc-country', dc ? dc.country : '');
    setVal('#dc-lat', dc && U.isNum(dc.lat) ? dc.lat : '');
    setVal('#dc-lng', dc && U.isNum(dc.lng) ? dc.lng : '');
    setVal('#dc-capacity', dc ? dc.capacity : '');
    setVal('#dc-used', dc ? dc.usedSlots : 0);
    setVal('#dc-storage', dc && dc.storageCostPerSlotMonth !== null ? dc.storageCostPerSlotMonth : '');
    setVal('#dc-handling', dc && dc.handlingCostPerPallet !== null ? dc.handlingCostPerPallet : '');
    setVal('#dc-transportBase', dc && dc.transportBasePerPallet !== null ? dc.transportBasePerPallet : '');
    setVal('#dc-transportKm', dc && dc.transportCostPerKm !== null ? dc.transportCostPerKm : '');
    setVal('#dc-fixed', dc ? dc.fixedCostPerPeriod : 0);
    U.$('#dc-active').value = dc ? String(dc.active) : 'true';

    U.$('#dc-storage').placeholder = 'Standard: ' + fmt.dec2(s.storageCostPerSlotMonth);
    U.$('#dc-handling').placeholder = 'Standard: ' + fmt.dec2(s.handlingCostPerPallet);
    U.$('#dc-transportBase').placeholder = 'Standard: ' + fmt.dec2(s.costBasePerPallet);
    U.$('#dc-transportKm').placeholder = 'Standard: ' + fmt.dec2(s.costPerPalletKm);

    renderOverrides(dc ? dc.regionCosts : {});
    U.$('#dc-modal').classList.remove('hidden');
    setTimeout(function () { U.$('#dc-name').focus(); }, 30);
  }

  function closeModal() {
    U.$('#dc-modal').classList.add('hidden');
    editingId = null;
  }

  function setVal(sel, v) { U.$(sel).value = v === null || v === undefined ? '' : v; }
  function getVal(sel) { return U.$(sel).value.trim(); }
  function getNumOrNull(sel) {
    var raw = getVal(sel);
    return raw === '' ? null : U.num(raw);
  }

  function renderOverrides(costs) {
    var wrap = U.$('#dc-overrides');
    wrap.innerHTML = '';
    var entries = Object.keys(costs || {}).map(function (k) { return [k, costs[k]]; });
    if (!entries.length) entries = [];
    entries.forEach(function (e) { wrap.appendChild(overrideRow(e[0], e[1])); });
  }

  function overrideRow(region, cost) {
    var options = S.regionKeys('all');
    var row = U.el('div', { class: 'override-row' });
    var list = U.el('input', { class: 'input input-sm', list: 'region-options', value: region || '', placeholder: 'Region / Land' });
    var val = U.el('input', { class: 'input input-sm', type: 'number', step: '0.5', min: '0', value: cost === undefined ? '' : cost, placeholder: 'EUR je Palette' });
    var del = U.el('button', { class: 'icon-btn', type: 'button', text: '✕', onclick: function () { row.remove(); } });
    row.appendChild(list); row.appendChild(val); row.appendChild(del);

    if (!document.getElementById('region-options')) {
      var dl = U.el('datalist', { id: 'region-options' });
      document.body.appendChild(dl);
    }
    var dlist = document.getElementById('region-options');
    dlist.innerHTML = options.map(function (o) { return '<option value="' + U.esc(o) + '">'; }).join('');
    return row;
  }

  function collectOverrides() {
    var out = {};
    U.$$('#dc-overrides .override-row').forEach(function (row) {
      var inputs = row.querySelectorAll('input');
      var key = inputs[0].value.trim();
      var v = U.parseNum(inputs[1].value);
      if (key && isFinite(v)) out[key] = v;
    });
    return out;
  }

  function saveFromModal() {
    var name = getVal('#dc-name');
    if (!name) { U.toast('Bitte einen Namen für das DC angeben.', 'warn'); U.$('#dc-name').focus(); return; }

    var payload = {
      name: name,
      code: getVal('#dc-code'),
      region: getVal('#dc-region'),
      country: getVal('#dc-country'),
      lat: getVal('#dc-lat') === '' ? null : U.num(getVal('#dc-lat')),
      lng: getVal('#dc-lng') === '' ? null : U.num(getVal('#dc-lng')),
      capacity: U.num(getVal('#dc-capacity'), 0),
      usedSlots: U.num(getVal('#dc-used'), 0),
      storageCostPerSlotMonth: getNumOrNull('#dc-storage'),
      handlingCostPerPallet: getNumOrNull('#dc-handling'),
      transportBasePerPallet: getNumOrNull('#dc-transportBase'),
      transportCostPerKm: getNumOrNull('#dc-transportKm'),
      fixedCostPerPeriod: U.num(getVal('#dc-fixed'), 0),
      active: U.$('#dc-active').value === 'true',
      regionCosts: collectOverrides()
    };

    // Koordinaten automatisch ergänzen, falls nicht angegeben
    if (!U.isNum(payload.lat) || !U.isNum(payload.lng)) {
      var guess = NS.geo.lookup(payload.region || payload.name, payload.country);
      if (guess) {
        payload.lat = guess.lat; payload.lng = guess.lng;
        U.toast('Koordinaten für „' + (payload.region || payload.name) + '“ automatisch ergänzt.', 'good');
      }
    }

    if (editingId) { S.updateDC(editingId, payload); U.toast('DC „' + payload.name + '“ aktualisiert.'); }
    else { S.addDC(payload); U.toast('DC „' + payload.name + '“ angelegt.'); }

    closeModal();
  }

  /* ------------------------------------------------------------ Import */
  var DC_FIELDS = [
    { key: 'name', syn: ['name', 'dc', 'standort', 'lager', 'warehouse', 'site', 'bezeichnung', 'dc name'] },
    { key: 'code', syn: ['code', 'kurzcode', 'kürzel', 'abbr', 'id'] },
    { key: 'region', syn: ['region', 'gebiet', 'bundesland', 'state', 'area'] },
    { key: 'country', syn: ['land', 'country', 'staat'] },
    { key: 'lat', syn: ['lat', 'latitude', 'breite', 'breitengrad'] },
    { key: 'lng', syn: ['lng', 'lon', 'long', 'longitude', 'länge', 'laenge', 'längengrad'] },
    { key: 'capacity', syn: ['kapazität', 'kapazitaet', 'capacity', 'stellplätze', 'stellplaetze', 'slots', 'plätze'] },
    { key: 'usedSlots', syn: ['belegt', 'used', 'grundbelegung', 'bestand'] },
    { key: 'storageCostPerSlotMonth', syn: ['lagerkosten', 'storage', 'lagerkosten/monat', 'storage cost'] },
    { key: 'handlingCostPerPallet', syn: ['handling', 'handlingkosten', 'handling cost'] },
    { key: 'transportBasePerPallet', syn: ['transport', 'transportkosten', 'transport base', 'grundkosten'] },
    { key: 'transportCostPerKm', syn: ['km', 'kosten je km', 'cost per km', 'transport km'] },
    { key: 'fixedCostPerPeriod', syn: ['fixkosten', 'fixed', 'fixkosten je periode'] }
  ];

  function importFromRows(rows) {
    if (!rows.length) { U.toast('Die Datei enthält keine Zeilen.', 'warn'); return; }
    var headers = Object.keys(rows[0]);
    var map = {};
    DC_FIELDS.forEach(function (f) {
      var hit = headers.find(function (h) {
        var hn = String(h).toLowerCase().trim();
        return f.syn.some(function (s) { return hn === s || hn.indexOf(s) >= 0; });
      });
      if (hit) map[f.key] = hit;
    });

    if (!map.name) { U.toast('Es konnte keine Spalte mit dem DC-Namen erkannt werden.', 'error'); return; }

    var added = 0;
    rows.forEach(function (r) {
      var name = String(r[map.name] || '').trim();
      if (!name) return;
      var dc = { name: name, regionCosts: {} };
      DC_FIELDS.forEach(function (f) {
        if (f.key === 'name' || !map[f.key]) return;
        var raw = r[map[f.key]];
        if (raw === undefined || raw === null || raw === '') return;
        dc[f.key] = ['code', 'region', 'country'].indexOf(f.key) >= 0 ? String(raw).trim() : U.num(raw);
      });
      if (!U.isNum(dc.lat) || !U.isNum(dc.lng)) {
        var g = NS.geo.lookup(dc.region || dc.name, dc.country);
        if (g) { dc.lat = g.lat; dc.lng = g.lng; }
      }
      S.addDC(dc);
      added++;
    });
    U.toast(added + ' Distributionszentren importiert.', 'good');
  }

  /* ------------------------------------------------------------ Events */
  function init() {
    U.$('#btn-dc-new').addEventListener('click', function () { openModal(null); });
    U.$('#dc-save').addEventListener('click', saveFromModal);
    U.$('#dc-cancel').addEventListener('click', closeModal);
    U.$('#dc-modal-close').addEventListener('click', closeModal);
    U.$('#dc-modal').addEventListener('click', function (e) {
      if (e.target === U.$('#dc-modal')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !U.$('#dc-modal').classList.contains('hidden')) closeModal();
    });

    U.$('#btn-add-override').addEventListener('click', function () {
      U.$('#dc-overrides').appendChild(overrideRow('', ''));
    });

    U.$('#table-dcs').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var dcId = btn.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (act === 'edit') openModal(dcId);
      else if (act === 'dup') {
        var src = S.getDC(dcId);
        if (src) {
          var copy = JSON.parse(JSON.stringify(src));
          delete copy.id;
          copy.name = src.name + ' (Kopie)';
          S.addDC(copy);
          U.toast('DC dupliziert.');
        }
      } else if (act === 'del') {
        var dc = S.getDC(dcId);
        if (dc && confirm('DC „' + dc.name + '“ wirklich löschen? Bestehende Zuordnungen zu diesem Standort werden entfernt.')) {
          S.removeDC(dcId);
          U.toast('DC gelöscht.', 'warn');
        }
      }
    });

    U.$('#btn-dc-import').addEventListener('click', function () { U.$('#dc-file-input').click(); });
    U.$('#dc-file-input').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      NS.data.readFile(file, function (err, result) {
        if (err) { U.toast('Datei konnte nicht gelesen werden: ' + err.message, 'error'); return; }
        importFromRows(result.rows);
        e.target.value = '';
      });
    });

    S.onChange(function (reason) {
      if (reason === 'dcs' || reason === 'assignments' || reason === 'settings' ||
        reason === 'reset' || reason === 'project' || reason === 'records') render();
    });
  }

  NS.dcs = { init: init, render: render, openModal: openModal, dcIndex: dcIndex, importFromRows: importFromRows };
})(window.LNP);
