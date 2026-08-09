/* =========================================================================
   charts.js – Chart.js-Konfiguration, Farbpalette, KPI-Kacheln, Legenden
   ---------------------------------------------------------------------------
   Kategoriale Farben werden in fester Reihenfolge vergeben (nie zyklisch);
   ab dem 9. Eintrag wird auf „Weitere“ verdichtet.
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util;
  function t(s) { return NS.i18n ? NS.i18n.t(s) : s; }
  var registry = Object.create(null);   // canvasId -> Chart-Instanz
  var MAX_SERIES = 8;

  /* ------------------------------------------------------------ Farben */
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v || '').trim() || fallback;
  }

  function palette() {
    var out = [];
    for (var i = 1; i <= MAX_SERIES; i++) out.push(cssVar('--series-' + i, '#2a78d6'));
    return out;
  }

  /** Farbe für den n-ten Eintrag; ab Slot 9 neutrales „Weitere“-Grau. */
  function seriesColor(index) {
    if (index < 0) return cssVar('--text-muted', '#898781');
    var p = palette();
    return index < MAX_SERIES ? p[index] : cssVar('--text-muted', '#898781');
  }

  function chrome() {
    return {
      surface: cssVar('--surface-1', '#fcfcfb'),
      grid: cssVar('--grid', '#e1e0d9'),
      axis: cssVar('--axis', '#c3c2b7'),
      text: cssVar('--text-primary', '#0b0b0b'),
      secondary: cssVar('--text-secondary', '#52514e'),
      muted: cssVar('--text-muted', '#898781'),
      border: cssVar('--border', 'rgba(0,0,0,.1)')
    };
  }

  /* ------------------------------------------------------------ Defaults */
  function applyGlobalDefaults() {
    if (typeof Chart === 'undefined') return;
    var c = chrome();
    Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = c.muted;
    Chart.defaults.animation.duration = 260;
    Chart.defaults.plugins.legend.display = false;      // eigene HTML-Legende
    Chart.defaults.plugins.tooltip.backgroundColor = cssVar('--surface-sidebar', '#12161d');
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: '600' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxWidth = 9;
    Chart.defaults.plugins.tooltip.boxHeight = 9;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.maintainAspectRatio = false;
  }

  function axisScale(opts) {
    var c = chrome();
    var o = opts || {};
    var ticks = {
      color: c.muted,
      padding: 6,
      maxRotation: o.rotate === false ? 0 : 40,
      autoSkip: true
    };
    // Nur setzen, wenn vorhanden – ein „undefined“ würde den Standard-Callback
    // der Kategorie-Achse überschreiben und Indizes statt Beschriftungen zeigen.
    if (typeof o.tickFormat === 'function') ticks.callback = o.tickFormat;

    var scale = {
      grid: {
        color: o.vertical ? 'transparent' : c.grid,
        drawTicks: false,
        drawOnChartArea: !o.vertical
      },
      border: { color: c.axis, display: true },
      ticks: ticks,
      stacked: !!o.stacked,
      beginAtZero: true
    };
    if (o.title) scale.title = { display: true, text: t(o.title), color: c.muted, font: { size: 11 } };
    return scale;
  }

  /* ------------------------------------------------------------ Erzeugung */
  function destroy(canvasId) {
    if (registry[canvasId]) { registry[canvasId].destroy(); delete registry[canvasId]; }
  }

  /**
   * Erzeugt/aktualisiert ein Diagramm.
   * @param {string} canvasId
   * @param {object} cfg  Chart.js-Konfiguration
   */
  function render(canvasId, cfg) {
    if (typeof Chart === 'undefined') return null;
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    destroy(canvasId);
    registry[canvasId] = new Chart(canvas.getContext('2d'), cfg);
    registry[canvasId].__cfgFactory = cfg.__factory || null;
    return registry[canvasId];
  }

  /** Standard-Balkendiagramm (vertikal oder horizontal, optional gestapelt). */
  function bar(canvasId, labels, datasets, options) {
    var o = options || {};
    var c = chrome();
    var horizontal = !!o.horizontal;

    var ds = datasets.map(function (d, i) {
      return Object.assign({}, d, {
        label: t(d.label),
        backgroundColor: d.color || seriesColor(i),
        borderColor: c.surface,
        borderWidth: o.stacked ? 2 : 0,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.78,
        categoryPercentage: 0.8,
        maxBarThickness: o.maxBarThickness || 46
      });
    });

    return render(canvasId, {
      type: 'bar',
      data: { labels: labels, datasets: ds },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 4, right: 6 } },
        scales: {
          x: axisScale({ vertical: !horizontal, stacked: o.stacked, tickFormat: horizontal ? o.valueFormat : o.labelFormat, rotate: o.rotate }),
          y: axisScale({ vertical: horizontal, stacked: o.stacked, tickFormat: horizontal ? o.labelFormat : o.valueFormat, title: o.axisTitle })
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed[horizontal ? 'x' : 'y'];
                return ' ' + ctx.dataset.label + ': ' + (o.tooltipFormat ? o.tooltipFormat(v, ctx) : U.fmt.int(v));
              },
              footer: o.tooltipFooter || undefined
            }
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------ Legende */
  /**
   * HTML-Legende (immer sichtbar ab zwei Serien – Identität nie nur über Farbe).
   * @param {HTMLElement|string} target
   * @param {Array<{label:string,color:string,kind?:string}>} items
   */
  function legend(target, items) {
    var node = typeof target === 'string' ? U.$(target) : target;
    if (!node) return;
    if (!items || items.length < 2) { node.innerHTML = ''; node.style.display = 'none'; return; }
    node.style.display = '';
    node.innerHTML = items.map(function (it) {
      return '<span class="legend-item"><i class="legend-swatch' + (it.kind === 'line' ? ' line' : '') +
        '" style="background:' + it.color + '"></i>' + U.esc(t(it.label)) + '</span>';
    }).join('');
  }

  /* ------------------------------------------------------------ KPI-Kacheln */
  /**
   * @param {HTMLElement|string} target
   * @param {Array<{label,value,unit?,sub?,bar?,accent?}>} tiles
   */
  function renderKPIs(target, tiles) {
    var node = typeof target === 'string' ? U.$(target) : target;
    if (!node) return;
    node.innerHTML = tiles.map(function (tile) {
      var accent = tile.accent || 'var(--accent)';
      var barHtml = tile.bar === undefined || tile.bar === null ? '' :
        '<div class="kpi-bar"><span style="width:' + U.clamp(tile.bar * 100, 0, 100).toFixed(1) + '%"></span></div>';
      return '<div class="kpi" style="--kpi-accent:' + accent + '">' +
        '<div class="kpi-label">' + U.esc(t(tile.label)) + '</div>' +
        '<div class="kpi-value">' + tile.value + (tile.unit ? '<span class="kpi-unit">' + U.esc(t(tile.unit)) + '</span>' : '') + '</div>' +
        (tile.sub ? '<div class="kpi-sub">' + tile.sub + '</div>' : '') +
        barHtml +
        '</div>';
    }).join('');
  }

  /**
   * Verdichtet eine Liste auf maximal MAX_SERIES Einträge + „Weitere“.
   * Verhindert, dass Farben zyklisch wiederverwendet werden.
   */
  function foldSeries(items, valueOf) {
    if (items.length <= MAX_SERIES) return { items: items, folded: null };
    var sorted = items.slice().sort(function (a, b) { return valueOf(b) - valueOf(a); });
    var keep = sorted.slice(0, MAX_SERIES - 1);
    var rest = sorted.slice(MAX_SERIES - 1);
    return { items: keep, folded: rest };
  }

  function init() {
    applyGlobalDefaults();
  }

  /** Nach Theme-Wechsel: Defaults neu setzen, damit Achsen/Tooltips passen. */
  function refreshTheme() {
    applyGlobalDefaults();
  }

  NS.charts = {
    init: init, render: render, bar: bar, legend: legend, renderKPIs: renderKPIs,
    seriesColor: seriesColor, palette: palette, chrome: chrome, cssVar: cssVar,
    destroy: destroy, refreshTheme: refreshTheme, foldSeries: foldSeries,
    axisScale: axisScale, registry: registry, MAX_SERIES: MAX_SERIES
  };
})(window.LNP);
