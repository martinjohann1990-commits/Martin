/* =========================================================================
   util.js – Hilfsfunktionen (Formatierung, DOM, Geo, Datei-Download)
   Globales Namespace-Objekt: window.LNP
   ========================================================================= */
window.LNP = window.LNP || {};

(function (NS) {
  'use strict';

  /* ------------------------------------------------------------ Formatierung */
  var nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nf2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  var fmt = {
    int: function (v) { return isFinite(v) ? nf0.format(Math.round(v)) : '–'; },
    dec1: function (v) { return isFinite(v) ? nf1.format(v) : '–'; },
    dec2: function (v) { return isFinite(v) ? nf2.format(v) : '–'; },
    /** Kompakte EUR-Darstellung: 1.234 € / 12,3 Tsd. € / 4,5 Mio. € */
    eur: function (v) {
      if (!isFinite(v)) return '–';
      var a = Math.abs(v);
      if (a >= 1e6) return nf1.format(v / 1e6) + ' Mio. €';
      if (a >= 1e4) return nf0.format(v / 1e3) + ' Tsd. €';
      return nf0.format(v) + ' €';
    },
    eurExact: function (v) { return isFinite(v) ? nf2.format(v) + ' €' : '–'; },
    pct: function (v, digits) {
      if (!isFinite(v)) return '–';
      return (digits === 1 ? nf1 : nf0).format(v * 100) + ' %';
    },
    pct1: function (v) { return isFinite(v) ? nf1.format(v * 100) + ' %' : '–'; },
    km: function (v) { return isFinite(v) ? nf0.format(v) + ' km' : '–'; },
    days: function (v) { return isFinite(v) ? nf1.format(v) + ' Tage' : '–'; },
    score: function (v) { return isFinite(v) ? nf1.format(v) : '–'; }
  };

  /** Robuste Zahlenerkennung: akzeptiert "1.234,56", "1,234.56", "1 234", "45%" */
  function parseNum(value) {
    if (value === null || value === undefined || value === '') return NaN;
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    var s = String(value).trim();
    if (!s) return NaN;
    s = s.replace(/[\s ']/g, '').replace(/(EUR|€|\$|%|Stk\.?|St\.?|Pal\.?|m³|m3|kg)/gi, '');
    var hasDot = s.indexOf('.') >= 0, hasComma = s.indexOf(',') >= 0;
    if (hasDot && hasComma) {
      // Das zuletzt auftretende Zeichen ist das Dezimaltrennzeichen
      s = s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
    } else if (hasComma) {
      // "1,234" = Tausendertrennzeichen nur bei durchgängigen Dreiergruppen
      s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (hasDot) {
      // Spiegelbildlich: "10.234" bzw. "1.234.567" sind Tausendertrennzeichen,
      // "10.5" ist ein Dezimalpunkt.
      if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  /**
   * Echte Zahl? Anders als isFinite() liefert dies für null, '' und true
   * korrekt false – wichtig für Koordinaten, die null sein dürfen.
   */
  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function num(v, fallback) {
    var n = parseNum(v);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function round(v, digits) {
    var f = Math.pow(10, digits || 0);
    return Math.round(v * f) / f;
  }

  function id(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  /* ------------------------------------------------------------ Perioden */
  var MONTHS_DE = ['jan', 'feb', 'mär', 'mrz', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dez'];
  var MONTHS_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  /**
   * Normalisiert Periodenangaben auf 'YYYY-MM' (bzw. 'YYYY-Qn' → Monat, 'YYYY' → Jahr).
   * Unterstützt Excel-Datumszahlen, Date-Objekte, ISO-Daten, "01.02.2025", "Feb 25", "2025-KW07".
   * @returns {{key:string, ts:number, days:number}|null}
   */
  function parsePeriod(value) {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date && !isNaN(value)) return monthKey(value.getFullYear(), value.getMonth());

    if (typeof value === 'number' && isFinite(value)) {
      if (value > 20000 && value < 60000) {           // Excel-Seriennummer
        var d = new Date(Math.round((value - 25569) * 86400 * 1000));
        return monthKey(d.getUTCFullYear(), d.getUTCMonth());
      }
      if (value >= 1900 && value <= 2200) return { key: String(value), ts: Date.UTC(value, 0, 1), days: 365 };
      return null;
    }

    var s = String(value).trim();
    var m;

    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})(?:[-\/.](\d{1,2}))?/))) {         // 2025-02 / 2025-02-14
      return monthKey(+m[1], +m[2] - 1);
    }
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/))) {           // 14.02.2025
      var y = +m[3]; if (y < 100) y += 2000;
      return monthKey(y, +m[2] - 1);
    }
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{4})$/))) return monthKey(+m[2], +m[1] - 1);   // 02/2025
    if ((m = s.match(/^(\d{4})[-\s]?[QqKk](?:W)?[-\s]?(\d{1,2})$/))) {          // 2025-Q2 / 2025-KW07
      var isWeek = /[Kk][Ww]/.test(s);
      if (isWeek) {
        var week = +m[2];
        var mon = clamp(Math.floor((week - 1) / 4.345), 0, 11);
        var r = monthKey(+m[1], mon); r.key = m[1] + '-KW' + String(week).padStart(2, '0');
        r.days = 7; return r;
      }
      var q = clamp(+m[2], 1, 4);
      var rq = monthKey(+m[1], (q - 1) * 3);
      rq.key = m[1] + '-Q' + q; rq.days = 91.3;
      return rq;
    }
    if ((m = s.match(/^([A-Za-zÄÖÜäöü]{3,})[-\s.]*(\d{2,4})$/))) {              // Feb 2025 / Februar 25
      var lower = m[1].slice(0, 3).toLowerCase();
      var idx = MONTHS_DE.indexOf(lower); if (idx === 3) idx = 2;               // "mrz" → März
      if (idx < 0) idx = MONTHS_EN.indexOf(lower);
      if (idx >= 0) {
        if (idx > 11) idx = 11;
        var yy = +m[2]; if (yy < 100) yy += 2000;
        return monthKey(yy, idx);
      }
    }
    if (/^\d{4}$/.test(s)) return { key: s, ts: Date.UTC(+s, 0, 1), days: 365 };

    var d2 = new Date(s);
    if (!isNaN(d2)) return monthKey(d2.getFullYear(), d2.getMonth());

    return { key: s, ts: NaN, days: 30.44 };   // unbekanntes Format – als eigenständige Periode führen
  }

  function monthKey(year, monthIdx) {
    var mi = clamp(monthIdx, 0, 11);
    return {
      key: year + '-' + String(mi + 1).padStart(2, '0'),
      ts: Date.UTC(year, mi, 1),
      days: new Date(Date.UTC(year, mi + 1, 0)).getUTCDate()
    };
  }

  /* ------------------------------------------------------------ Geo */
  var EARTH_R = 6371;

  /** Luftlinie in km (Haversine). */
  function haversine(lat1, lon1, lat2, lon2) {
    if (![lat1, lon1, lat2, lon2].every(function (v) { return typeof v === 'number' && isFinite(v); })) return NaN;
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad, dLon = (lon2 - lon1) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /** Straßenentfernung als Zuschlag auf die Luftlinie (Umwegfaktor). */
  var DETOUR = 1.28;
  function roadDistance(lat1, lon1, lat2, lon2) {
    var d = haversine(lat1, lon1, lat2, lon2);
    return isFinite(d) ? d * DETOUR : NaN;
  }

  /* ------------------------------------------------------------ DOM */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  /** Baut eine Tabelle aus Spaltendefinition und Zeilen-Objekten. */
  function renderTable(table, columns, rows, options) {
    var opt = options || {};
    var head = '<thead><tr>' + columns.map(function (c) {
      return '<th class="' + (c.num ? 'num ' : '') + (c.wrap ? 'wrap' : '') + '">' + esc(c.label) + '</th>';
    }).join('') + '</tr></thead>';

    var body = '<tbody>' + (rows.length ? rows.map(function (r, i) {
      var cls = opt.rowClass ? opt.rowClass(r, i) : '';
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + (r.__id ? ' data-id="' + esc(r.__id) + '"' : '') + '>' +
        columns.map(function (c) {
          var v = c.render ? c.render(r, i) : esc(r[c.key]);
          return '<td class="' + (c.num ? 'num ' : '') + (c.wrap ? 'wrap ' : '') + (c.cls || '') + '">' + v + '</td>';
        }).join('') + '</tr>';
    }).join('') : '<tr><td class="t-muted" colspan="' + columns.length + '">Keine Daten vorhanden</td></tr>') + '</tbody>';

    table.innerHTML = head + body;
  }

  /** Horizontaler Score-Balken für Tabellenzellen. */
  function scoreBar(value, color) {
    var v = clamp(value || 0, 0, 100);
    return '<div class="scorebar"><span class="scorebar-track">' +
      '<span class="scorebar-fill" style="width:' + v.toFixed(1) + '%;background:' + (color || 'var(--accent)') + '"></span>' +
      '</span><b>' + fmt.score(v) + '</b></div>';
  }

  /* ------------------------------------------------------------ Toast */
  function toast(message, kind) {
    var wrap = document.getElementById('toasts');
    if (!wrap) return;
    var t = el('div', { class: 'toast is-' + (kind || 'good'), text: message });
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .25s, transform .25s';
      t.style.opacity = '0'; t.style.transform = 'translateX(12px)';
      setTimeout(function () { t.remove(); }, 260);
    }, kind === 'error' ? 6000 : 3400);
  }

  /* ------------------------------------------------------------ Download */
  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
  }

  function downloadCSV(rows, filename) {
    var sep = ';';
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = cell === null || cell === undefined ? '' : String(cell);
        if (typeof cell === 'number') s = String(cell).replace('.', ',');
        return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(sep);
    }).join('\r\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), filename);
  }

  function timestamp() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }

  /* ------------------------------------------------------------ Sonstiges */
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  }

  function unique(arr) {
    var seen = Object.create(null), out = [];
    arr.forEach(function (v) { if (v !== '' && v !== null && v !== undefined && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }

  function sum(arr, pick) {
    return arr.reduce(function (a, b) { return a + (pick ? (pick(b) || 0) : (b || 0)); }, 0);
  }

  NS.util = {
    fmt: fmt, parseNum: parseNum, num: num, isNum: isNum, clamp: clamp, round: round, id: id, esc: esc, slug: slug,
    parsePeriod: parsePeriod, haversine: haversine, roadDistance: roadDistance, DETOUR: DETOUR,
    $: $, $$: $$, el: el, renderTable: renderTable, scoreBar: scoreBar,
    toast: toast, download: download, downloadCSV: downloadCSV, timestamp: timestamp,
    debounce: debounce, unique: unique, sum: sum
  };
})(window.LNP);
