/* NetPlan+ mapview.js — Leaflet network map (DCs, customer districts, lanes) with an inline-SVG
   fallback when Leaflet/OSM tiles are unavailable (spec §13, simplified: two fallback stages
   instead of three — a full offline canvas tile layer was judged not worth the added complexity). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var map = null, layerGroup = null, tileErrorCount = 0, tileErrorTimer = null;

  function ensureMap(el) {
    if (map) { try { map.remove(); } catch (e) {} map = null; }
    map = window.L.map(el, { worldCopyJump: true, zoomControl: true }).setView([48, 10], 4);
    layerGroup = window.L.layerGroup().addTo(map);
    return map;
  }

  function addTiles(onFallback) {
    var tl = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; OpenStreetMap contributors'
    });
    tileErrorCount = 0;
    tl.on('tileerror', function () {
      tileErrorCount++;
      if (tileErrorTimer) clearTimeout(tileErrorTimer);
      tileErrorTimer = setTimeout(function () { tileErrorCount = 0; }, 6000);
      if (tileErrorCount >= 3) {
        try { map.removeLayer(tl); } catch (e) {}
        if (onFallback) onFallback();
      }
    });
    tl.addTo(map);
  }

  function scaleRadius(value, maxValue, minR, maxR) {
    if (!value || !maxValue) return minR;
    return minR + (maxR - minR) * Math.sqrt(value / maxValue);
  }

  function drawMarkersAndLanes(target, data, isSvg, helpers) {
    var maxCap = Math.max.apply(Math, data.dcs.map(function (d) { return d.capacity || 0; }).concat([1]));
    var maxVol = Math.max.apply(Math, data.regions.map(function (r) { return r.volume || 0; }).concat([1]));
    var colors = LNP.charts.palette();
    var dcColor = {};
    data.dcs.forEach(function (dc, i) { dcColor[dc.id] = colors[i % colors.length]; });
    var lanes = data.lanes.slice().sort(function (a, b) { return b.volume - a.volume; }).slice(0, 400);
    return { maxCap: maxCap, maxVol: maxVol, dcColor: dcColor, lanes: lanes };
  }

  function renderLeaflet(container, data, withTiles) {
    var mapEl = document.createElement('div');
    mapEl.style.width = '100%'; mapEl.style.height = '100%';
    container.appendChild(mapEl);
    var noteEl = document.createElement('div');
    noteEl.className = 'map-mode-note';
    noteEl.textContent = withTiles ? 'OpenStreetMap' : LNP.i18n.t('Offline-Kartenmodus (Kacheln nicht erreichbar)');
    container.appendChild(noteEl);
    ensureMap(mapEl);
    if (withTiles) {
      addTiles(function () {
        noteEl.textContent = LNP.i18n.t('Offline-Kartenmodus (Kacheln nicht erreichbar)');
      });
    }

    var pre = drawMarkersAndLanes(null, data, false);
    var bounds = [];

    pre.lanes.forEach(function (l) {
      if (!LNP.util.isNum(l.fromLat) || !LNP.util.isNum(l.fromLng) || !LNP.util.isNum(l.toLat) || !LNP.util.isNum(l.toLng)) return;
      var weight = 1 + 5 * Math.sqrt((l.volume || 0) / pre.maxVol);
      window.L.polyline([[l.fromLat, l.fromLng], [l.toLat, l.toLng]], { color: pre.dcColor[l.dcId] || '#888', weight: weight, opacity: 0.45 }).addTo(layerGroup);
    });

    data.regions.forEach(function (r) {
      if (!LNP.util.isNum(r.lat) || !LNP.util.isNum(r.lng)) return;
      var radius = scaleRadius(r.volume, pre.maxVol, 4, 16);
      var m = window.L.circleMarker([r.lat, r.lng], { radius: radius, color: '#8992a3', weight: 1, fillColor: '#8992a3', fillOpacity: 0.35 });
      m.bindTooltip(LNP.util.escapeHtml(r.name) + ': ' + LNP.i18n.fmtInt(r.volume) + ' PAL');
      m.addTo(layerGroup);
      bounds.push([r.lat, r.lng]);
    });

    data.dcs.forEach(function (dc) {
      if (!LNP.util.isNum(dc.lat) || !LNP.util.isNum(dc.lng)) return;
      var radius = scaleRadius(dc.capacity, pre.maxCap, 6, 20);
      var m = window.L.circleMarker([dc.lat, dc.lng], { radius: radius, color: '#1b2130', weight: 2, fillColor: pre.dcColor[dc.id], fillOpacity: 0.9 });
      m.bindTooltip('<b>' + LNP.util.escapeHtml(dc.name) + '</b><br>' + LNP.i18n.fmtInt(dc.capacity) + ' ' + LNP.i18n.t('Stellplätze'));
      m.addTo(layerGroup);
      bounds.push([dc.lat, dc.lng]);
    });

    if (bounds.length) { try { map.fitBounds(bounds, { padding: [24, 24], maxZoom: 6 }); } catch (e) {} }
  }

  function renderSvg(container, data) {
    var W = 800, H = 420;
    var lats = [], lngs = [];
    data.dcs.concat(data.regions).forEach(function (p) { if (LNP.util.isNum(p.lat) && LNP.util.isNum(p.lng)) { lats.push(p.lat); lngs.push(p.lng); } });
    if (!lats.length) { container.innerHTML = '<div class="empty">' + LNP.i18n.t('Keine Koordinaten verfügbar.') + '</div>'; return; }
    var minLat = Math.min.apply(Math, lats) - 2, maxLat = Math.max.apply(Math, lats) + 2;
    var minLng = Math.min.apply(Math, lngs) - 2, maxLng = Math.max.apply(Math, lngs) + 2;
    function x(lng) { return (lng - minLng) / (maxLng - minLng) * W; }
    function y(lat) { return H - (lat - minLat) / (maxLat - minLat) * H; }

    var pre = drawMarkersAndLanes(null, data, true);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="map-svg-fallback" preserveAspectRatio="xMidYMid meet">';
    pre.lanes.forEach(function (l) {
      if (!LNP.util.isNum(l.fromLat) || !LNP.util.isNum(l.toLat)) return;
      var sw = 0.6 + 2.5 * Math.sqrt((l.volume || 0) / pre.maxVol);
      svg += '<line x1="' + x(l.fromLng) + '" y1="' + y(l.fromLat) + '" x2="' + x(l.toLng) + '" y2="' + y(l.toLat) + '" stroke="' + (pre.dcColor[l.dcId] || '#888') + '" stroke-width="' + sw + '" opacity="0.4"/>';
    });
    data.regions.forEach(function (r) {
      if (!LNP.util.isNum(r.lat)) return;
      var rad = scaleRadius(r.volume, pre.maxVol, 3, 10);
      svg += '<circle cx="' + x(r.lng) + '" cy="' + y(r.lat) + '" r="' + rad + '" fill="#8992a3" opacity="0.4"><title>' + LNP.util.escapeHtml(r.name) + '</title></circle>';
    });
    data.dcs.forEach(function (dc) {
      if (!LNP.util.isNum(dc.lat)) return;
      var rad = scaleRadius(dc.capacity, pre.maxCap, 5, 14);
      svg += '<circle cx="' + x(dc.lng) + '" cy="' + y(dc.lat) + '" r="' + rad + '" fill="' + (pre.dcColor[dc.id] || '#2f6fed') + '" stroke="#1b2130" stroke-width="1.5"><title>' + LNP.util.escapeHtml(dc.name) + '</title></circle>';
    });
    svg += '</svg>';
    var note = document.createElement('div');
    note.className = 'map-mode-note';
    note.textContent = LNP.i18n.t('Schema-Ansicht (SVG, ohne Kartenbibliothek)');
    container.innerHTML = svg;
    container.appendChild(note);
  }

  function resolveMode() {
    var pref = (LNP.state.settings.mapMode) || 'auto';
    if (pref === 'svg') return 'svg';
    if (!window.L) return 'svg';
    return pref === 'offline' ? 'offline' : 'tiles';
  }

  function render(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!data.dcs.length && !data.regions.length) {
      container.innerHTML = '<div class="empty">' + LNP.i18n.t('Keine Daten geladen') + '</div>';
      return;
    }
    var mode = resolveMode();
    try {
      if (mode === 'svg') renderSvg(container, data);
      else renderLeaflet(container, data, mode === 'tiles');
    } catch (e) {
      if (window.console) console.error('map render failed, falling back to SVG', e);
      container.innerHTML = '';
      renderSvg(container, data);
    }
  }

  LNP.mapview = { render: render, resolveMode: resolveMode };
})();
