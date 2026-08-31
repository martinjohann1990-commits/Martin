/* NetPlan+ mapview.js — Leaflet network map (DCs, customer districts, lanes) with an inline-SVG
   fallback when Leaflet/OSM tiles are unavailable (spec §13, simplified: two fallback stages
   instead of three — a full offline canvas tile layer was judged not worth the added complexity). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var map = null, layerGroup = null, tileErrorCount = 0, tileErrorTimer = null;
  var heatMap = null, heatLayerGroup = null;

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

  /* leaflet.heat schedules its own redraw via requestAnimationFrame and never cancels it on
     removal (Leaflet.heat's onRemove only detaches the canvas/listeners, not the pending frame)
     — if a stale frame fires after the Szenarien view re-renders and wipes the container
     (innerHTML=''), it calls getImageData on a now-zero-sized, detached canvas and throws.
     Cancelling every layer's pending frame before tearing the map down avoids that. */
  function destroyHeatMap() {
    if (heatLayerGroup) {
      heatLayerGroup.eachLayer(function (layer) {
        if (layer._frame) { window.L.Util.cancelAnimFrame(layer._frame); layer._frame = null; }
      });
    }
    if (heatMap) { try { heatMap.remove(); } catch (e) {} }
    heatMap = null; heatLayerGroup = null;
  }

  function hexToRgba(hex, alpha) {
    var h = String(hex || '#8992a3').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(h.substr(0, 2), 16) || 0, g = parseInt(h.substr(2, 2), 16) || 0, b = parseInt(h.substr(4, 2), 16) || 0;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /* Szenarien heatmap: real address-level customer points (data.points, from
     LNP.sim.scenarioCustomerHeatmapPoints) coloured by the DC that serves them under the
     selected scenario (data.dcs, the scenario's "involved" DCs) — one leaflet.heat layer per DC
     using a single-hue gradient (transparent -> that DC's palette colour) so the geographic
     footprint of each DC's assignment reads as its own coloured heat cloud, with DC markers
     overlaid the same way the network map already marks them. */
  function renderScenarioHeatmapLeaflet(container, data, withTiles) {
    var mapEl = document.createElement('div');
    mapEl.style.width = '100%'; mapEl.style.height = '100%';
    container.appendChild(mapEl);
    var noteEl = document.createElement('div');
    noteEl.className = 'map-mode-note';
    noteEl.textContent = withTiles ? 'OpenStreetMap' : LNP.i18n.t('Offline-Kartenmodus (Kacheln nicht erreichbar)');
    container.appendChild(noteEl);

    destroyHeatMap();
    heatMap = window.L.map(mapEl, { worldCopyJump: true, zoomControl: true }).setView([48, 10], 4);
    heatLayerGroup = window.L.layerGroup().addTo(heatMap);
    if (withTiles) {
      var tl = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '&copy; OpenStreetMap contributors'
      });
      var errCount = 0;
      tl.on('tileerror', function () {
        errCount++;
        if (errCount >= 3) { try { heatMap.removeLayer(tl); } catch (e) {} noteEl.textContent = LNP.i18n.t('Offline-Kartenmodus (Kacheln nicht erreichbar)'); }
      });
      tl.addTo(heatMap);
    }

    var colors = LNP.charts.palette();
    var dcColor = {};
    data.dcs.forEach(function (dc, i) { dcColor[dc.id] = colors[i % colors.length]; });
    var bounds = [];

    /* Weight is real ESU volume, whose absolute scale varies wildly by dataset (a handful of
       units up into the thousands) — leaflet.heat's own default intensity scale (max: 1) would
       either wash out small-volume customers entirely or clip every real one to full saturation.
       Normalising against the heaviest point in THIS view, with a floor so even the lightest
       customer still shows as a faint dot rather than nothing, keeps the relative volume
       comparison meaningful regardless of the source data's units. */
    var maxWeight = 0;
    data.points.forEach(function (p) { if (LNP.util.isNum(p.weight) && p.weight > maxWeight) maxWeight = p.weight; });
    if (maxWeight <= 0) maxWeight = 1;

    var byDc = {};
    data.points.forEach(function (p) {
      if (!LNP.util.isNum(p.lat) || !LNP.util.isNum(p.lng)) return;
      var key = p.dcId || '_unassigned';
      byDc[key] = byDc[key] || [];
      byDc[key].push([p.lat, p.lng, Math.max(0.22, (p.weight || 0) / maxWeight)]);
    });
    Object.keys(byDc).forEach(function (dcKey) {
      var hex = dcColor[dcKey] || '#8992a3';
      window.L.heatLayer(byDc[dcKey], {
        /* leaflet.heat dampens intensity below its own `maxZoom` option (built for street-level
           GPS-trail density, where a lone point SHOULD look faint at a zoomed-out view) — this
           map instead opens at a pan-European overview (fitBounds caps at zoom 6), where a real,
           volume-weighted customer point must stay legible. Matching maxZoom to that overview
           zoom keeps intensity at full strength through the zoom range this view is actually
           used at, instead of crushing every point to near-invisible at the default view. */
        radius: 26, blur: 20, maxZoom: 6, max: 1,
        gradient: { 0.15: hexToRgba(hex, 0), 0.4: hexToRgba(hex, 0.55), 1.0: hexToRgba(hex, 0.95) }
      }).addTo(heatLayerGroup);
      byDc[dcKey].forEach(function (pt) { bounds.push([pt[0], pt[1]]); });
    });

    var maxCap = Math.max.apply(Math, data.dcs.map(function (d) { return d.capacity || 0; }).concat([1]));
    data.dcs.forEach(function (dc) {
      if (!LNP.util.isNum(dc.lat) || !LNP.util.isNum(dc.lng)) return;
      var radius = scaleRadius(dc.capacity, maxCap, 7, 20);
      var m = window.L.circleMarker([dc.lat, dc.lng], { radius: radius, color: '#1b2130', weight: 2, fillColor: dcColor[dc.id] || '#2f6fed', fillOpacity: 0.95 });
      m.bindTooltip('<b>' + LNP.util.escapeHtml(dc.name) + '</b>');
      m.addTo(heatLayerGroup);
      bounds.push([dc.lat, dc.lng]);
    });

    /* animate:false makes fitBounds fire 'moveend' synchronously, before this render call
       returns — with the animated default, leaflet.heat's own moveend-triggered redraw can still
       be in flight (Leaflet's pan/zoom transition) when the user navigates to another view a
       moment later; that redraw then runs against a hidden (0-width) container and throws. */
    if (bounds.length) { try { heatMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 6, animate: false }); } catch (e) {} }
  }

  function renderScenarioHeatmapSvg(container, data) {
    var W = 800, H = 420;
    var lats = [], lngs = [];
    data.dcs.concat(data.points).forEach(function (p) { if (LNP.util.isNum(p.lat) && LNP.util.isNum(p.lng)) { lats.push(p.lat); lngs.push(p.lng); } });
    if (!lats.length) { container.innerHTML = '<div class="empty">' + LNP.i18n.t('Keine Koordinaten verfügbar.') + '</div>'; return; }
    var minLat = Math.min.apply(Math, lats) - 2, maxLat = Math.max.apply(Math, lats) + 2;
    var minLng = Math.min.apply(Math, lngs) - 2, maxLng = Math.max.apply(Math, lngs) + 2;
    function x(lng) { return (lng - minLng) / (maxLng - minLng) * W; }
    function y(lat) { return H - (lat - minLat) / (maxLat - minLat) * H; }

    var colors = LNP.charts.palette();
    var dcColor = {};
    data.dcs.forEach(function (dc, i) { dcColor[dc.id] = colors[i % colors.length]; });
    var maxWeight = Math.max.apply(Math, data.points.map(function (p) { return p.weight || 0; }).concat([1]));
    var maxCap = Math.max.apply(Math, data.dcs.map(function (d) { return d.capacity || 0; }).concat([1]));

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="map-svg-fallback" preserveAspectRatio="xMidYMid meet">';
    data.points.forEach(function (p) {
      if (!LNP.util.isNum(p.lat) || !LNP.util.isNum(p.lng)) return;
      var rad = scaleRadius(p.weight, maxWeight, 1.5, 7);
      var hex = dcColor[p.dcId] || '#8992a3';
      svg += '<circle cx="' + x(p.lng) + '" cy="' + y(p.lat) + '" r="' + rad + '" fill="' + hex + '" opacity="0.35"/>';
    });
    data.dcs.forEach(function (dc) {
      if (!LNP.util.isNum(dc.lat) || !LNP.util.isNum(dc.lng)) return;
      var rad = scaleRadius(dc.capacity, maxCap, 5, 14);
      svg += '<circle cx="' + x(dc.lng) + '" cy="' + y(dc.lat) + '" r="' + rad + '" fill="' + (dcColor[dc.id] || '#2f6fed') + '" stroke="#1b2130" stroke-width="1.5"><title>' + LNP.util.escapeHtml(dc.name) + '</title></circle>';
    });
    svg += '</svg>';
    var note = document.createElement('div');
    note.className = 'map-mode-note';
    note.textContent = LNP.i18n.t('Schema-Ansicht (SVG, ohne Kartenbibliothek)');
    container.innerHTML = svg;
    container.appendChild(note);
  }

  function renderScenarioHeatmap(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;
    destroyHeatMap();
    container.innerHTML = '';
    if (!data.points.length && !data.dcs.length) {
      container.innerHTML = '<div class="empty">' + LNP.i18n.t('Keine Daten geladen') + '</div>';
      return;
    }
    var mode = resolveMode();
    try {
      if (mode === 'svg' || !window.L || !window.L.heatLayer) renderScenarioHeatmapSvg(container, data);
      else renderScenarioHeatmapLeaflet(container, data, mode === 'tiles');
    } catch (e) {
      if (window.console) console.error('scenario heatmap render failed, falling back to SVG', e);
      container.innerHTML = '';
      renderScenarioHeatmapSvg(container, data);
    }
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

  LNP.mapview = { render: render, resolveMode: resolveMode, renderScenarioHeatmap: renderScenarioHeatmap };
})();
