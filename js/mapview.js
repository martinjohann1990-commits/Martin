/* =========================================================================
   mapview.js – Netzwerkkarte
   ---------------------------------------------------------------------------
   Drei Betriebsarten:
     • tiles  – Leaflet mit OpenStreetMap-Kacheln (nur online)
     • schema – Leaflet mit selbst gezeichnetem Koordinatenraster (offline)
     • svg    – reine SVG-Streudarstellung, falls Leaflet nicht verfügbar ist
   „Automatisch“ startet mit Kacheln und wechselt bei blockierten Kacheln
   selbsttätig in den Schema-Modus.
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state;

  var map = null;
  var layers = { tiles: null, schema: null, marks: null };
  var mode = null;             // aktuell aktive Betriebsart
  var tileErrors = 0;
  var tileErrorTimer = null;
  var initialized = false;

  var TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var TILE_ATTR = '© OpenStreetMap-Mitwirkende';

  /* ------------------------------------------------------------ Schema-Layer */
  function createSchemaLayer() {
    var c = NS.charts.chrome();
    var SchemaLayer = L.GridLayer.extend({
      createTile: function (coords) {
        var tile = document.createElement('canvas');
        var size = this.getTileSize();
        tile.width = size.x; tile.height = size.y;
        var ctx = tile.getContext('2d');

        ctx.fillStyle = NS.charts.cssVar('--surface-3', '#f2f2ef');
        ctx.fillRect(0, 0, size.x, size.y);

        ctx.strokeStyle = c.grid;
        ctx.lineWidth = 1;
        var step = size.x / 4;
        for (var i = 0; i <= 4; i++) {
          ctx.beginPath(); ctx.moveTo(i * step + .5, 0); ctx.lineTo(i * step + .5, size.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i * step + .5); ctx.lineTo(size.x, i * step + .5); ctx.stroke();
        }

        // Eckkoordinate zur Orientierung
        var nw = map.unproject(new L.Point(coords.x * size.x, coords.y * size.y), coords.z);
        ctx.fillStyle = c.muted;
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(nw.lat.toFixed(1) + '° / ' + nw.lng.toFixed(1) + '°', 5, 12);
        return tile;
      }
    });
    return new SchemaLayer({ tileSize: 256, minZoom: 2, maxZoom: 12 });
  }

  /* ------------------------------------------------------------ Modus */
  function setMode(next, silent) {
    if (!map) return;
    if (mode === next) return;

    if (layers.tiles) { map.removeLayer(layers.tiles); layers.tiles = null; }
    if (layers.schema) { map.removeLayer(layers.schema); layers.schema = null; }

    if (next === 'tiles') {
      layers.tiles = L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 12, crossOrigin: true });
      layers.tiles.on('tileerror', onTileError);
      layers.tiles.addTo(map);
      note('Kartenkacheln werden von openstreetmap.org geladen. Ohne Internetzugang wird automatisch auf die Schema-Ansicht umgeschaltet.');
    } else {
      layers.schema = createSchemaLayer().addTo(map);
      note('Schema-Ansicht: Standorte und Regionen werden ohne externe Kartenkacheln auf einem Koordinatenraster dargestellt – vollständig offline nutzbar.');
    }
    // Marker liegen in der overlayPane und damit stets über den Kacheln
    mode = next;
    if (!silent) render();
  }

  function onTileError() {
    tileErrors++;
    clearTimeout(tileErrorTimer);
    tileErrorTimer = setTimeout(function () { tileErrors = 0; }, 6000);
    if (tileErrors >= 3 && S.settings().mapMode === 'auto' && mode === 'tiles') {
      setMode('schema', true);
      note('Kartenkacheln nicht erreichbar – automatisch auf die Offline-Schema-Ansicht umgeschaltet.');
      render();
    }
  }

  var noteKey = '';
  /** Merkt den deutschen Originaltext, damit er bei Sprachwechsel neu übersetzt wird. */
  function note(textDe) {
    noteKey = textDe;
    var n = U.$('#map-note');
    if (n) n.textContent = U.t(textDe);
  }

  /* ------------------------------------------------------------ Daten */
  /** Sammelt Punkte und Verbindungen aus Stammdaten und Zuordnungen. */
  function collect() {
    var st = S.get();
    var dcs = S.activeDCs().filter(function (d) { return U.isNum(d.lat) && U.isNum(d.lng); });

    var regionTotals = Object.create(null);
    st.records.forEach(function (r) {
      regionTotals[r.regionKey] = (regionTotals[r.regionKey] || 0) + S.recordPallets(r);
    });

    var regions = Object.keys(st.regions).map(function (k) {
      var info = st.regions[k];
      return { key: k, lat: info.lat, lng: info.lng, pallets: regionTotals[k] || 0 };
    }).filter(function (r) { return U.isNum(r.lat) && U.isNum(r.lng); });

    var links = [];
    Object.keys(st.assignments).forEach(function (cat) {
      var a = st.assignments[cat];
      (a.regions || []).forEach(function (ra) {
        var dc = S.getDC(ra.dcId);
        var reg = st.regions[ra.regionKey];
        if (!dc || !reg || !U.isNum(dc.lat) || !U.isNum(reg.lat)) return;
        links.push({
          category: cat, dcId: ra.dcId, dcName: dc.name, regionKey: ra.regionKey,
          pallets: ra.pallets, from: [dc.lat, dc.lng], to: [reg.lat, reg.lng]
        });
      });
    });
    links.sort(function (a, b) { return b.pallets - a.pallets; });

    return { dcs: dcs, regions: regions, links: links.slice(0, 400) };
  }

  function dcLoad(dcId) {
    var dc = S.getDC(dcId);
    if (!dc || !dc.capacity) return { used: 0, util: NaN };
    var used = S.usedSlots(dcId);
    return { used: used, util: used / dc.capacity };
  }

  function radiusFor(value, maxValue, min, max) {
    if (!isFinite(value) || value <= 0 || !isFinite(maxValue) || maxValue <= 0) return min;
    return min + (max - min) * Math.sqrt(value / maxValue);
  }

  /* ------------------------------------------------------------ Zeichnen */
  function render() {
    if (!initialized) return;
    if (noteKey) note(noteKey);          // Sprache des Hinweises aktualisieren
    if (!map) { renderSVG(); return; }

    if (layers.marks) map.removeLayer(layers.marks);
    layers.marks = L.layerGroup().addTo(map);

    var data = collect();
    var c = NS.charts.chrome();
    var maxRegion = Math.max.apply(null, [1].concat(data.regions.map(function (r) { return r.pallets; })));
    var maxCap = Math.max.apply(null, [1].concat(data.dcs.map(function (d) { return d.capacity; })));
    var maxLink = Math.max.apply(null, [1].concat(data.links.map(function (l) { return l.pallets; })));

    // Verbindungen zuerst (liegen unter den Punkten)
    data.links.forEach(function (l) {
      var color = NS.charts.seriesColor(NS.dcs.dcIndex(l.dcId));
      L.polyline([l.from, l.to], {
        color: color,
        weight: 1 + 3 * Math.sqrt(l.pallets / maxLink),
        opacity: 0.45,
        interactive: true
      }).bindTooltip('<b>' + U.esc(l.category) + '</b>' + U.esc(l.regionKey) + ' ← ' + U.esc(l.dcName) +
        '<br>' + U.fmt.int(l.pallets) + ' Paletten', { className: 'map-tip' })
        .addTo(layers.marks);
    });

    // Kundenregionen
    data.regions.forEach(function (r) {
      L.circleMarker([r.lat, r.lng], {
        radius: radiusFor(r.pallets, maxRegion, 4, 11),
        color: c.surface, weight: 2,
        fillColor: c.muted, fillOpacity: 0.75
      }).bindTooltip('<b>' + U.esc(r.key) + '</b>' + U.tf('Kundenregion · {0} Paletten', U.fmt.int(r.pallets)),
        { className: 'map-tip' }).addTo(layers.marks);
    });

    // Distributionszentren
    data.dcs.forEach(function (d) {
      var color = NS.charts.seriesColor(NS.dcs.dcIndex(d.id));
      var load = dcLoad(d.id);
      L.circleMarker([d.lat, d.lng], {
        radius: radiusFor(d.capacity, maxCap, 8, 18),
        color: c.surface, weight: 2,
        fillColor: color, fillOpacity: 0.9
      }).bindTooltip('<b>' + U.esc(d.name) + '</b>' + U.tf('Kapazität {0} Stellplätze', U.fmt.int(d.capacity)) + '<br>' +
        U.tf('Belegung {0}', isFinite(load.util) ? U.fmt.pct(load.util) : '–'),
        { className: 'map-tip' }).addTo(layers.marks);
    });

    var pts = data.dcs.map(function (d) { return [d.lat, d.lng]; })
      .concat(data.regions.map(function (r) { return [r.lat, r.lng]; }));
    if (pts.length) {
      try { map.fitBounds(L.latLngBounds(pts).pad(0.18), { animate: false }); } catch (e) { /* ignorieren */ }
    }
  }

  /* ------------------------------------------------------------ SVG-Notfallmodus */
  function renderSVG() {
    var box = U.$('#map');
    if (!box) return;
    var data = collect();
    var c = NS.charts.chrome();
    var w = box.clientWidth || 600, h = box.clientHeight || 300, pad = 26;

    var pts = data.dcs.concat(data.regions);
    if (!pts.length) {
      box.innerHTML = '<div class="empty-inline" style="padding:20px">' + U.t('Keine Standorte mit Koordinaten vorhanden.') + '</div>';
      return;
    }

    var lats = pts.map(function (p) { return p.lat; }), lngs = pts.map(function (p) { return p.lng; });
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
    var spanLat = Math.max(maxLat - minLat, 0.5), spanLng = Math.max(maxLng - minLng, 0.5);

    function x(lng) { return pad + (lng - minLng) / spanLng * (w - 2 * pad); }
    function y(lat) { return h - pad - (lat - minLat) / spanLat * (h - 2 * pad); }

    var maxCap = Math.max.apply(null, [1].concat(data.dcs.map(function (d) { return d.capacity; })));
    var maxRegion = Math.max.apply(null, [1].concat(data.regions.map(function (r) { return r.pallets; })));

    var svg = ['<svg class="map-fallback" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + U.t('Schematische Netzwerkkarte') + '">'];
    svg.push('<rect width="' + w + '" height="' + h + '" fill="' + NS.charts.cssVar('--surface-3', '#f2f2ef') + '"/>');
    for (var gx = 1; gx < 6; gx++) {
      svg.push('<line x1="' + (gx * w / 6) + '" y1="0" x2="' + (gx * w / 6) + '" y2="' + h + '" stroke="' + c.grid + '"/>');
    }
    for (var gy = 1; gy < 4; gy++) {
      svg.push('<line x1="0" y1="' + (gy * h / 4) + '" x2="' + w + '" y2="' + (gy * h / 4) + '" stroke="' + c.grid + '"/>');
    }

    data.links.forEach(function (l) {
      var color = NS.charts.seriesColor(NS.dcs.dcIndex(l.dcId));
      svg.push('<line x1="' + x(l.from[1]) + '" y1="' + y(l.from[0]) + '" x2="' + x(l.to[1]) + '" y2="' + y(l.to[0]) +
        '" stroke="' + color + '" stroke-width="1.5" opacity="0.45"><title>' +
        U.esc(l.category + ': ' + l.regionKey + ' ← ' + l.dcName) + '</title></line>');
    });

    data.regions.forEach(function (r) {
      svg.push('<circle cx="' + x(r.lng) + '" cy="' + y(r.lat) + '" r="' + radiusFor(r.pallets, maxRegion, 4, 10) +
        '" fill="' + c.muted + '" stroke="' + c.surface + '" stroke-width="2"><title>' +
        U.esc(r.key + ' · ' + U.fmt.int(r.pallets) + ' Paletten') + '</title></circle>');
    });

    data.dcs.forEach(function (d) {
      var color = NS.charts.seriesColor(NS.dcs.dcIndex(d.id));
      svg.push('<circle cx="' + x(d.lng) + '" cy="' + y(d.lat) + '" r="' + radiusFor(d.capacity, maxCap, 7, 16) +
        '" fill="' + color + '" stroke="' + c.surface + '" stroke-width="2"><title>' +
        U.esc(d.name + ' · ' + U.fmt.int(d.capacity) + ' Stellplätze') + '</title></circle>');
      svg.push('<text x="' + x(d.lng) + '" y="' + (y(d.lat) - 18) + '" text-anchor="middle" font-size="11" fill="' +
        c.secondary + '">' + U.esc(d.code || d.name) + '</text>');
    });

    svg.push('</svg>');
    box.innerHTML = svg.join('');
    note('Vereinfachte Schemadarstellung (Leaflet nicht verfügbar): Positionen sind maßstäblich nach Koordinaten angeordnet.');
  }

  /* ------------------------------------------------------------ Init */
  function init() {
    var box = U.$('#map');
    if (!box) return;
    initialized = true;

    if (typeof L === 'undefined') {
      map = null;
      renderSVG();
      bindModeSelect(true);
      return;
    }

    map = L.map(box, {
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: false,
      minZoom: 2, maxZoom: 12
    }).setView([50.5, 10.0], 4);

    // Voreingestellten Leaflet-Verweis entfernen; der Quellenhinweis der
    // Kartenkacheln bleibt als reiner Text erhalten. Die Anwendung enthält
    // damit keinen einzigen Link nach außen.
    if (map.attributionControl) map.attributionControl.setPrefix('');

    var pref = S.settings().mapMode || 'auto';
    setMode(pref === 'schema' ? 'schema' : 'tiles', true);
    bindModeSelect(false);
    render();
  }

  function bindModeSelect(svgOnly) {
    var sel = U.$('#map-mode');
    if (!sel) return;
    sel.value = S.settings().mapMode || 'auto';
    if (svgOnly) { sel.disabled = true; return; }
    sel.addEventListener('change', function () {
      S.settings().mapMode = sel.value;
      S.emit('settings');
      tileErrors = 0;
      setMode(sel.value === 'schema' ? 'schema' : 'tiles');
      render();
    });
  }

  /** Nach Größenänderung des Containers (z.B. Ansichtswechsel) neu vermessen. */
  function invalidate() {
    if (map) { setTimeout(function () { map.invalidateSize(); render(); }, 60); }
    else renderSVG();
  }

  NS.mapview = { init: init, render: render, invalidate: invalidate, setMode: setMode };
})(window.LNP);
