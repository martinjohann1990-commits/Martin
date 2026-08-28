/* NetPlan+ charts.js — thin Chart.js wrappers with a fixed categorical palette (spec §14). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var registry = {};

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function palette() {
    return [cssVar('--s1'), cssVar('--s2'), cssVar('--s3'), cssVar('--s4'), cssVar('--s5'), cssVar('--s6'), cssVar('--s7'), cssVar('--s8')];
  }
  function statusColors() {
    return { good: cssVar('--good'), warn: cssVar('--warn'), bad: cssVar('--bad'), info: cssVar('--info') };
  }
  function textColor() { return cssVar('--text-dim'); }
  function gridColor() { return cssVar('--border'); }

  function destroy(canvasId) {
    if (registry[canvasId]) { registry[canvasId].destroy(); delete registry[canvasId]; }
  }

  function baseOptions(extra) {
    var opts = {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false, labels: { color: textColor(), boxWidth: 12, font: { size: 11 } } },
        tooltip: { titleFont: { size: 12 }, bodyFont: { size: 12 } }
      },
      scales: {}
    };
    return Object.assign(opts, extra || {});
  }

  function bar(canvasId, labels, series, opts) {
    opts = opts || {};
    var ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return null;
    destroy(canvasId);
    var colors = palette();
    var datasets = series.map(function (s, i) {
      return {
        label: s.label, data: s.data, backgroundColor: s.color || colors[i % colors.length],
        borderRadius: 4, maxBarThickness: 34, stack: opts.stacked ? 'stack1' : undefined
      };
    });
    var chart = new window.Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: datasets },
      options: baseOptions({
        plugins: { legend: { display: series.length > 1, labels: { color: textColor(), boxWidth: 12 } } },
        scales: {
          x: { stacked: !!opts.stacked, ticks: { color: textColor(), font: { size: 11 } }, grid: { display: false } },
          y: { stacked: !!opts.stacked, beginAtZero: true, ticks: { color: textColor(), font: { size: 11 } }, grid: { color: gridColor() } }
        },
        indexAxis: opts.horizontal ? 'y' : 'x'
      })
    });
    registry[canvasId] = chart;
    return chart;
  }

  function line(canvasId, labels, series, opts) {
    opts = opts || {};
    var ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return null;
    destroy(canvasId);
    var colors = palette();
    var datasets = series.map(function (s, i) {
      var c = s.color || colors[i % colors.length];
      return { label: s.label, data: s.data, borderColor: c, backgroundColor: c, tension: 0.3, pointRadius: 2, fill: false };
    });
    var chart = new window.Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: baseOptions({
        plugins: { legend: { display: series.length > 1, labels: { color: textColor(), boxWidth: 12 } } },
        scales: {
          x: { ticks: { color: textColor(), font: { size: 11 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: textColor(), font: { size: 11 } }, grid: { color: gridColor() } }
        }
      })
    });
    registry[canvasId] = chart;
    return chart;
  }

  function stackedScoreBar(canvasId, labels, weighted, opts) {
    opts = opts || {};
    var ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return null;
    destroy(canvasId);
    var sc = statusColors();
    var datasets = [
      { label: LNP.i18n.t('Kapazität'), data: weighted.map(function (w) { return w.capacity; }), backgroundColor: sc.info, borderRadius: 4, stack: 's' },
      { label: LNP.i18n.t('Transport'), data: weighted.map(function (w) { return w.transport; }), backgroundColor: sc.good, borderRadius: 4, stack: 's' },
      { label: LNP.i18n.t('Reichweite'), data: weighted.map(function (w) { return w.service; }), backgroundColor: sc.warn, borderRadius: 4, stack: 's' }
    ];
    var chart = new window.Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: datasets },
      options: baseOptions({
        indexAxis: 'y',
        plugins: { legend: { display: true, position: 'bottom', labels: { color: textColor(), boxWidth: 12 } } },
        scales: {
          x: { stacked: true, max: 100, ticks: { color: textColor() }, grid: { color: gridColor() } },
          y: { stacked: true, ticks: { color: textColor() }, grid: { display: false } }
        }
      })
    });
    registry[canvasId] = chart;
    return chart;
  }

  function doughnut(canvasId, labels, data, opts) {
    opts = opts || {};
    var ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return null;
    destroy(canvasId);
    var colors = palette();
    var chart = new window.Chart(ctx, {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: data, backgroundColor: labels.map(function (l, i) { return colors[i % colors.length]; }) }] },
      options: baseOptions({ plugins: { legend: { display: true, position: 'bottom', labels: { color: textColor(), boxWidth: 12, font: { size: 11 } } } }, cutout: '62%' })
    });
    registry[canvasId] = chart;
    return chart;
  }

  LNP.charts = { bar: bar, line: line, stackedScoreBar: stackedScoreBar, doughnut: doughnut, destroy: destroy, palette: palette, statusColors: statusColors };
})();
