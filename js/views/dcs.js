/* NetPlan+ views/dcs.js — "DC-Verwaltung": table + create/edit/duplicate/delete modal. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, I = LNP.i18n;

  function numOrEmpty(v) { return U.isNum(v) ? v : ''; }
  function parseNullableNumber(str) {
    if (str === null || str === undefined) return null;
    var t = String(str).trim();
    if (t === '') return null;
    var n = parseFloat(t);
    return isFinite(n) ? n : null;
  }

  function costRow(label, field, dc) {
    return '<div class="field"><label>' + U.escapeHtml(label) + '</label>' +
      '<input type="number" step="0.01" class="js-dc-field" data-field="' + field + '" data-null="1" value="' + numOrEmpty(dc[field]) + '" placeholder="' + I.t('nicht gesetzt') + '"></div>';
  }

  function regionCostsHtml(dc) {
    var districts = LNP.sim.allDistricts();
    if (!districts.length) return '<p class="help">' + I.t('Keine Regionen/Distrikte importiert.') + '</p>';
    var rc = dc.regionCosts || {};
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th data-t="Region">' + I.t('Region') + '</th><th style="width:160px">' + I.t('€ / Palette') + '</th></tr></thead><tbody>' +
      districts.map(function (d) {
        return '<tr><td>' + U.escapeHtml(d.name) + '</td><td><input type="number" step="0.01" class="js-region-cost" data-district="' + U.escapeHtml(d.district) + '" value="' + numOrEmpty(rc[d.district]) + '" placeholder="' + I.t('nicht gesetzt') + '"></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function openDcModal(existing) {
    var dc = existing ? Object.assign({}, existing, { regionCosts: Object.assign({}, existing.regionCosts) }) : {
      name: '', code: '', region: '', country: '', city: '', lat: null, lng: null, latSource: 'offen',
      capacity: 2000, usedSlots: 0, storageCostPerSlotMonth: null, handlingCostPerPallet: null,
      transportBasePerPallet: null, transportCostPerKm: null, fixedCostPerPeriod: 0, active: true, regionCosts: {}
    };

    var body =
      '<div class="field-row">' +
      '<div class="field"><label data-t="Name">' + I.t('Name') + ' *</label><input type="text" id="dcName" value="' + U.escapeHtml(dc.name) + '"></div>' +
      '<div class="field"><label data-t="Code">' + I.t('Code') + '</label><input type="text" id="dcCode" value="' + U.escapeHtml(dc.code || '') + '" maxlength="6"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label data-t="Land">' + I.t('Land') + '</label><input type="text" id="dcCountry" value="' + U.escapeHtml(dc.country || '') + '" placeholder="z.B. DE, FR, IT …" list="countryList"></div>' +
      '<div class="field"><label data-t="Stadt">' + I.t('Stadt') + '</label><input type="text" id="dcCity" value="' + U.escapeHtml(dc.city || '') + '"></div>' +
      '</div>' +
      '<datalist id="countryList">' + Object.keys(LNP.geo.COUNTRY).map(function (c) { return '<option value="' + c + '">' + LNP.geo.COUNTRY[c].name + '</option>'; }).join('') + '</datalist>' +
      '<div class="field-row">' +
      '<div class="field"><label data-t="Breitengrad">' + I.t('Breitengrad') + '</label><input type="number" step="0.0001" id="dcLat" value="' + numOrEmpty(dc.lat) + '"></div>' +
      '<div class="field"><label data-t="Längengrad">' + I.t('Längengrad') + '</label><input type="number" step="0.0001" id="dcLng" value="' + numOrEmpty(dc.lng) + '"></div>' +
      '<div class="field" style="flex:0 0 auto;align-self:flex-end;"><button type="button" class="btn btn-sm" id="dcGeocode">' + I.t('Koordinate ermitteln') + '</button></div>' +
      '</div>' +
      '<p class="help" id="dcCoordSource">' + I.t('Quelle') + ': ' + I.t(dc.latSource || 'offen') + '</p>' +
      '<hr class="hr">' +
      '<div class="field-row">' +
      '<div class="field"><label data-t="Kapazität (Stellplätze)">' + I.t('Kapazität (Stellplätze)') + '</label><input type="number" id="dcCapacity" value="' + numOrEmpty(dc.capacity) + '"></div>' +
      '<div class="field"><label data-t="Belegte Plätze (Basis)">' + I.t('Belegte Plätze (Basis)') + '</label><input type="number" id="dcUsedSlots" value="' + numOrEmpty(dc.usedSlots) + '"></div>' +
      '<div class="field"><label data-t="Fixkosten je Periode">' + I.t('Fixkosten je Periode') + '</label><input type="number" step="1" id="dcFixed" value="' + numOrEmpty(dc.fixedCostPerPeriod) + '"></div>' +
      '</div>' +
      '<div class="checkbox-row field"><input type="checkbox" id="dcActive"' + (dc.active !== false ? ' checked' : '') + '><label for="dcActive" style="margin:0" data-t="Aktiv">' + I.t('Aktiv') + '</label></div>' +
      '<hr class="hr">' +
      '<h3>' + I.t('Kostenparameter') + LNP.ui.infoBtn('€ / Palette') + ' <span class="muted" style="font-weight:400;text-transform:none;">(' + I.t('nicht gesetzt') + ' = ' + I.t('Netzwerk-Standardwert') + ')</span></h3>' +
      '<div class="field-row">' +
      costRow(I.t('Lagerkosten je Platz/Monat'), 'storageCostPerSlotMonth', dc) +
      costRow(I.t('Handlingkosten je Palette'), 'handlingCostPerPallet', dc) +
      '</div><div class="field-row">' +
      costRow(I.t('Transport-Grundkosten je Palette'), 'transportBasePerPallet', dc) +
      costRow(I.t('Transportkosten je km'), 'transportCostPerKm', dc) +
      '</div>' +
      '<hr class="hr">' +
      '<h3 data-t="Regionale Kostenpauschalen">' + I.t('Regionale Kostenpauschalen') + '</h3>' +
      '<div id="regionCostsWrap">' + regionCostsHtml(dc) + '</div>';

    LNP.ui.openModal(existing ? U.escapeHtml(dc.name) : I.t('Neues DC'), body, {
      maxWidth: '680px',
      footerHtml: '<button class="btn" id="dcCancel" data-t="Abbrechen">' + I.t('Abbrechen') + '</button>' +
        '<button class="btn btn-primary" id="dcSave" data-t="Speichern">' + I.t('Speichern') + '</button>',
      onMount: function (r) {
        r.querySelector('#dcCancel').addEventListener('click', LNP.ui.closeModal);
        r.querySelector('#dcGeocode').addEventListener('click', function () {
          var city = r.querySelector('#dcCity').value, country = r.querySelector('#dcCountry').value;
          var res = LNP.geo.resolve({ city: city, country: country });
          if (res) {
            r.querySelector('#dcLat').value = res.lat.toFixed(4);
            r.querySelector('#dcLng').value = res.lng.toFixed(4);
            r.querySelector('#dcCoordSource').textContent = I.t('Quelle') + ': ' + I.t(res.source);
            r.querySelector('#dcCoordSource').setAttribute('data-source', res.source);
          } else {
            LNP.ui.toast(I.t('Keine Koordinate gefunden — bitte manuell eintragen.'), 'bad');
          }
        });
        r.querySelector('#dcSave').addEventListener('click', function () {
          var name = r.querySelector('#dcName').value.trim();
          if (!name) { LNP.ui.toast(I.t('Pflichtfeld fehlt') + ': ' + I.t('Name'), 'bad'); return; }
          var regionCosts = {};
          r.querySelectorAll('.js-region-cost').forEach(function (inp) {
            var v = parseNullableNumber(inp.value);
            if (v !== null) regionCosts[inp.getAttribute('data-district')] = v;
          });
          var latVal = parseNullableNumber(r.querySelector('#dcLat').value);
          var lngVal = parseNullableNumber(r.querySelector('#dcLng').value);
          var srcEl = r.querySelector('#dcCoordSource');
          var latSource = (latVal === null) ? 'offen' : (srcEl.getAttribute('data-source') || (existing ? existing.latSource : 'manuell')) || 'manuell';
          if (existing && (latVal !== existing.lat || lngVal !== existing.lng) && !srcEl.getAttribute('data-source')) latSource = 'manuell';

          var fields = {
            name: name, code: (r.querySelector('#dcCode').value.trim() || name.slice(0, 4).toUpperCase()),
            country: r.querySelector('#dcCountry').value.trim() || null, city: r.querySelector('#dcCity').value.trim() || null,
            lat: latVal, lng: lngVal, latSource: latSource,
            capacity: parseFloat(r.querySelector('#dcCapacity').value) || 0,
            usedSlots: parseFloat(r.querySelector('#dcUsedSlots').value) || 0,
            fixedCostPerPeriod: parseFloat(r.querySelector('#dcFixed').value) || 0,
            active: r.querySelector('#dcActive').checked,
            storageCostPerSlotMonth: parseNullableNumber(r.querySelector('[data-field=storageCostPerSlotMonth]').value),
            handlingCostPerPallet: parseNullableNumber(r.querySelector('[data-field=handlingCostPerPallet]').value),
            transportBasePerPallet: parseNullableNumber(r.querySelector('[data-field=transportBasePerPallet]').value),
            transportCostPerKm: parseNullableNumber(r.querySelector('[data-field=transportCostPerKm]').value),
            regionCosts: regionCosts
          };
          if (existing) LNP.state.updateDc(existing.id, fields); else LNP.state.addDc(fields);
          LNP.sim.invalidateCaches();
          LNP.ui.closeModal();
          LNP.ui.toast(I.t('Speichern') + ': ' + name, 'good');
        });
      }
    });
  }

  function render(container) {
    var dcs = LNP.state.data.dcs;
    var rows = dcs.map(function (dc) {
      var util = dc.capacity > 0 ? (dc.usedSlots || 0) / dc.capacity : null;
      return '<tr>' +
        '<td>' + U.escapeHtml(dc.name) + '</td>' +
        '<td class="mono">' + U.escapeHtml(dc.code || '') + '</td>' +
        '<td>' + U.escapeHtml(dc.country || '–') + '</td>' +
        '<td class="num">' + I.fmtInt(dc.capacity) + '</td>' +
        '<td class="num">' + (util === null ? '–' : I.fmtPct(util, 0)) + '</td>' +
        '<td>' + (dc.active !== false ? '<span class="badge badge-good">' + I.t('Aktiv') + '</span>' : '<span class="badge badge-bad">' + I.t('Inaktiv') + '</span>') + '</td>' +
        '<td class="row-actions">' +
        '<button class="btn btn-sm js-edit" data-id="' + dc.id + '" data-t="Bearbeiten">' + I.t('Bearbeiten') + '</button>' +
        '<button class="btn btn-sm js-dup" data-id="' + dc.id + '" data-t="Duplizieren">' + I.t('Duplizieren') + '</button>' +
        '<button class="btn btn-sm btn-danger js-del" data-id="' + dc.id + '" data-t="Löschen">' + I.t('Löschen') + '</button>' +
        '</td></tr>';
    }).join('');

    container.innerHTML =
      '<div class="card"><div class="card-head"><h2>' + I.t('Distributionszentren') + LNP.ui.infoBtn('Kapazitäts-Score') + '</h2>' +
      '<div class="actions"><button class="btn btn-primary" id="dcNewBtn" data-t="Neues DC">' + I.t('Neues DC') + '</button></div></div>' +
      (dcs.length ?
        '<div class="table-wrap"><table class="tbl"><thead><tr>' +
        '<th data-t="Name">' + I.t('Name') + '</th><th data-t="Code">' + I.t('Code') + '</th><th data-t="Land">' + I.t('Land') + '</th>' +
        '<th class="num" data-t="Kapazität (Stellplätze)">' + I.t('Kapazität (Stellplätze)') + '</th><th class="num" data-t="Auslastung">' + I.t('Auslastung') + '</th><th data-t="Status">' + I.t('Status') + '</th><th data-t="Aktionen">' + I.t('Aktionen') + '</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' :
        '<div class="empty"><p>' + I.t('Noch keine Distributionszentren. Werden beim Import von SKU View oder DC Translation Table automatisch angelegt, oder hier manuell erfassen.') + '</p></div>') +
      '</div>';

    var newBtn = container.querySelector('#dcNewBtn');
    if (newBtn) newBtn.addEventListener('click', function () { openDcModal(null); });
    container.querySelectorAll('.js-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dc = dcs.filter(function (d) { return d.id === btn.getAttribute('data-id'); })[0];
        if (dc) openDcModal(dc);
      });
    });
    container.querySelectorAll('.js-dup').forEach(function (btn) {
      btn.addEventListener('click', function () { LNP.state.duplicateDc(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('.js-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dc = dcs.filter(function (d) { return d.id === btn.getAttribute('data-id'); })[0];
        LNP.ui.confirmDialog(I.t('DC wirklich löschen?'), dc ? dc.name : '', function () {
          LNP.state.removeDc(btn.getAttribute('data-id'));
          LNP.sim.invalidateCaches();
        });
      });
    });
  }

  LNP.viewDcs = { render: render, openDcModal: openDcModal };
})();
