/* NetPlan+ util.js — number/period parsing, formatting helpers, misc utilities. No DOM state, no i18n. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};

  var seq = 0;
  function uid(prefix) {
    seq += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + seq.toString(36);
  }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;')
      .split("'").join('&#39;');
  }

  function debounce(fn, ms) {
    var h = null;
    return function () {
      var args = arguments, ctx = this;
      if (h) clearTimeout(h);
      h = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function sum(arr, fn) {
    var s = 0;
    for (var i = 0; i < arr.length; i++) { var v = fn ? fn(arr[i]) : arr[i]; if (isNum(v)) s += v; }
    return s;
  }

  function groupBy(arr, keyFn) {
    var map = {};
    for (var i = 0; i < arr.length; i++) {
      var k = keyFn(arr[i]);
      if (!map[k]) map[k] = [];
      map[k].push(arr[i]);
    }
    return map;
  }

  function sortByDesc(arr, keyFn) {
    return arr.slice().sort(function (a, b) { return keyFn(b) - keyFn(a); });
  }

  function topNWithRest(rows, valueFn, labelFn, n) {
    var sorted = sortByDesc(rows, valueFn);
    var top = sorted.slice(0, n);
    var rest = sorted.slice(n);
    var restSum = sum(rest, valueFn);
    var out = [];
    for (var i = 0; i < top.length; i++) out.push({ label: labelFn(top[i]), value: valueFn(top[i]) });
    if (rest.length) out.push({ label: 'Rest', value: restSum, isRest: true, restCount: rest.length });
    return out;
  }

  /* ---------------- number parsing (German / English mixed) ---------------- */
  function parseLocaleNumber(raw) {
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    if (raw === null || raw === undefined) return null;
    var s = String(raw).trim();
    if (s === '') return null;
    var neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/[€$%]|EUR|Stk\.?|St\.?|m³|kg/gi, '');
    s = s.replace(/\s+/g, '');
    if (s === '') return null;
    if (/^-/.test(s)) { neg = true; s = s.slice(1); }
    else if (/-$/.test(s)) { neg = true; s = s.slice(0, -1); }

    var hasDot = s.indexOf('.') !== -1;
    var hasComma = s.indexOf(',') !== -1;
    var result;
    if (hasDot && hasComma) {
      var lastDot = s.lastIndexOf('.');
      var lastComma = s.lastIndexOf(',');
      var decSep = lastDot > lastComma ? '.' : ',';
      var thouSep = decSep === '.' ? ',' : '.';
      s = s.split(thouSep).join('');
      if (decSep === ',') s = s.replace(',', '.');
      result = parseFloat(s);
    } else if (hasComma && !hasDot) {
      if (/^[1-9]\d{0,2}(,\d{3})+$/.test(s)) result = parseFloat(s.split(',').join(''));
      else result = parseFloat(s.replace(',', '.'));
    } else if (hasDot && !hasComma) {
      if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) result = parseFloat(s.split('.').join(''));
      else result = parseFloat(s);
    } else {
      result = parseFloat(s);
    }
    if (!isFinite(result)) return null;
    return neg ? -result : result;
  }

  /* ---------------- period parsing ---------------- */
  var MONTHS_DE = { jan: 1, feb: 2, mär: 3, maer: 3, mar: 3, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dez: 12, dec: 12 };

  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  function fullYear(y) {
    y = Number(y);
    if (y >= 100) return y;
    return y >= 70 ? 1900 + y : 2000 + y;
  }

  /* Parses the ISO "Calendar week/year" integer used by the forecast file, e.g. 202401 -> {year:2024, week:1} */
  function parseCalendarWeekInt(v) {
    var n = Number(v);
    if (!isFinite(n)) return null;
    var s = String(Math.round(n));
    if (s.length === 6) {
      var year = Number(s.slice(0, 4));
      var week = Number(s.slice(4, 6));
      if (year > 1900 && year < 2200 && week >= 1 && week <= 53) return { year: year, week: week };
    }
    if (s.length === 5) {
      var year2 = Number(s.slice(0, 4));
      var week2 = Number(s.slice(4, 5));
      if (year2 > 1900 && year2 < 2200) return { year: year2, week: week2 };
    }
    return null;
  }

  function isoWeekToDate(year, week) {
    var simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    var dow = simple.getUTCDay() || 7;
    simple.setUTCDate(simple.getUTCDate() + 1 - dow);
    return simple;
  }

  function monthPeriodOf(y, m) {
    return { key: y + '-' + pad(m, 2), ts: Date.UTC(y, m - 1, 1), days: daysInMonth(y, m) };
  }

  /* Parses a plain YYYYMM integer/string (month, not week) -> {year, month} | null */
  function parseYearMonthInt(v) {
    var n = Number(v);
    if (!isFinite(n)) return null;
    var s = String(Math.round(n));
    if (s.length !== 6) return null;
    var year = Number(s.slice(0, 4)), month = Number(s.slice(4, 6));
    if (year > 1900 && year < 2200 && month >= 1 && month <= 12) return { year: year, month: month };
    return null;
  }

  /* Converts a JS Date (as produced by SheetJS with cellDates:true for a real Excel date
     column) to its calendar month period. Accepts a Date object or an ISO-ish date string. */
  function monthPeriodFromDate(v) {
    var d = (v instanceof Date) ? v : new Date(v);
    if (!d || isNaN(d.getTime())) return null;
    return monthPeriodOf(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }

  /* Converts a "Calendar week/year" value (e.g. 202401) to the calendar month that contains it. */
  function weekIntToMonthPeriod(raw) {
    var cw = parseCalendarWeekInt(raw);
    if (!cw) return null;
    var d = isoWeekToDate(cw.year, cw.week);
    return monthPeriodOf(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }

  /* Parses a period value given an explicit type, so an ambiguous 6-digit code (which could be
     read as either YYYYWW or YYYYMM) is resolved by user choice at import time rather than
     guessed. type: 'week' | 'month' | 'auto' (auto = legacy free-form parsePeriod below). */
  function parsePeriodByType(raw, type) {
    if (raw === null || raw === undefined || raw === '') return null;
    if (type === 'week') {
      var mp = weekIntToMonthPeriod(raw);
      if (mp) return mp;
      return parsePeriod(raw);
    }
    if (type === 'month') {
      var ym = parseYearMonthInt(raw);
      if (ym) return monthPeriodOf(ym.year, ym.month);
      return parsePeriod(raw);
    }
    return parsePeriod(raw);
  }

  /* Generic period normalizer per spec table -> {key, ts, days} */
  function parsePeriod(raw) {
    if (raw === null || raw === undefined || raw === '') return null;

    if (typeof raw === 'number' && raw >= 20000 && raw <= 60000) {
      var epoch = new Date(Date.UTC(1899, 11, 30));
      var d = new Date(epoch.getTime() + raw * 86400000);
      var y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
      return { key: y + '-' + pad(m, 2), ts: Date.UTC(y, m - 1, 1), days: daysInMonth(y, m) };
    }

    var cw = parseCalendarWeekInt(raw);
    if (cw && String(raw).length >= 5 && String(raw).length <= 6 && !/[^0-9]/.test(String(raw))) {
      var key = cw.year + '-KW' + pad(cw.week, 2);
      return { key: key, ts: isoWeekToDate(cw.year, cw.week).getTime(), days: 7 };
    }

    var s = String(raw).trim();

    var m1 = s.match(/^(\d{4})[-\/\.](\d{1,2})(?:[-\/\.](\d{1,2}))?$/);
    if (m1) {
      var yy = Number(m1[1]), mm = Number(m1[2]);
      if (mm >= 1 && mm <= 12) return { key: yy + '-' + pad(mm, 2), ts: Date.UTC(yy, mm - 1, 1), days: daysInMonth(yy, mm) };
    }
    var m2 = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/);
    if (m2) {
      var d2 = Number(m2[1]), mo2 = Number(m2[2]), y2 = fullYear(m2[3]);
      if (mo2 >= 1 && mo2 <= 12) return { key: y2 + '-' + pad(mo2, 2), ts: Date.UTC(y2, mo2 - 1, 1), days: daysInMonth(y2, mo2) };
    }
    var m3 = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (m3) {
      var mo3 = Number(m3[1]), y3 = Number(m3[2]);
      if (mo3 >= 1 && mo3 <= 12) return { key: y3 + '-' + pad(mo3, 2), ts: Date.UTC(y3, mo3 - 1, 1), days: daysInMonth(y3, mo3) };
    }
    var m4 = s.match(/^([A-Za-zÄÖÜäöü]{3,})\.?\s?['’]?(\d{2,4})$/);
    if (m4) {
      var monKey = m4[1].slice(0, 3).toLowerCase();
      var mon = MONTHS_DE[monKey];
      if (mon) {
        var y4 = fullYear(m4[2]);
        return { key: y4 + '-' + pad(mon, 2), ts: Date.UTC(y4, mon - 1, 1), days: daysInMonth(y4, mon) };
      }
    }
    var m5 = s.match(/^(\d{4})[-\s]?Q([1-4])$/i);
    if (m5) {
      var y5 = Number(m5[1]), q = Number(m5[2]);
      return { key: y5 + '-Q' + q, ts: Date.UTC(y5, (q - 1) * 3, 1), days: 91.3 };
    }
    var m6 = s.match(/^(\d{4})[-\s]?KW\s?(\d{1,2})$/i);
    if (m6) {
      var y6 = Number(m6[1]), w6 = Number(m6[2]);
      return { key: y6 + '-KW' + pad(w6, 2), ts: isoWeekToDate(y6, w6).getTime(), days: 7 };
    }
    var m7 = s.match(/^(\d{4})$/);
    if (m7) {
      var y7 = Number(m7[1]);
      if (y7 > 1900 && y7 < 2200) return { key: String(y7), ts: Date.UTC(y7, 0, 1), days: 365 };
    }
    return { key: s, ts: 0, days: 30.44 };
  }

  function pad(n, len) {
    var s = String(n);
    while (s.length < len) s = '0' + s;
    return s;
  }

  /* ---------------- file reading ---------------- */

  /* The real export bundles all 7 source tables as separate tabs in ONE workbook (plus a
     leftover hidden SAP-BI sheet) — picking sheet[0] blindly would silently read the wrong
     tab for every slot but one. Match by name instead (falls back to sheet[0] for a genuine
     single-sheet upload or when nothing matches well enough). */
  function pickSheetName(sheetNames, preferredName) {
    if (!sheetNames || !sheetNames.length) return null;
    if (!preferredName || sheetNames.length === 1) return sheetNames[0];
    var normPref = normHeader(preferredName);
    var best = null, bestScore = -1;
    for (var i = 0; i < sheetNames.length; i++) {
      var normName = normHeader(sheetNames[i]);
      var score = 0;
      if (normName === normPref) score = 100;
      else if (normName.indexOf(normPref) !== -1 || normPref.indexOf(normName) !== -1) score = 60;
      if (score > bestScore) { bestScore = score; best = sheetNames[i]; }
    }
    return bestScore > 0 ? best : sheetNames[0];
  }

  function readWorkbookFile(file, cb, preferredSheetName) {
    var name = file.name || '';
    var ext = name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xlsm' || ext === 'xlsb' || ext === 'xls') {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
          var sheetName = pickSheetName(wb.SheetNames, preferredSheetName);
          var sheet = wb.Sheets[sheetName];
          var json = window.XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
          cb(null, { rows: json, sheetNames: wb.SheetNames, sheetName: sheetName, workbook: wb });
        } catch (err) { cb(err); }
      };
      reader.onerror = function () { cb(new Error('read error')); };
      reader.readAsArrayBuffer(file);
    } else {
      window.Papa.parse(file, {
        header: true, dynamicTyping: false, skipEmptyLines: true,
        complete: function (res) { cb(null, { rows: res.data, sheetNames: null }); },
        error: function (err) { cb(err); }
      });
    }
  }

  /* Reads a file as an array-of-arrays (no header interpretation) — needed for sheets with
     duplicate column headers (e.g. two "V&B/ISI Shipping point" columns) or multi-row headers,
     which would collide under header:true parsing. */
  function readWorkbookFileRaw(file, cb, preferredSheetName) {
    var name = file.name || '';
    var ext = name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xlsm' || ext === 'xlsb' || ext === 'xls') {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
          var sheetName = pickSheetName(wb.SheetNames, preferredSheetName);
          var sheet = wb.Sheets[sheetName];
          var rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
          cb(null, rows);
        } catch (err) { cb(err); }
      };
      reader.onerror = function () { cb(new Error('read error')); };
      reader.readAsArrayBuffer(file);
    } else {
      window.Papa.parse(file, {
        header: false, dynamicTyping: false, skipEmptyLines: true,
        complete: function (res) { cb(null, res.data); },
        error: function (err) { cb(err); }
      });
    }
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function normHeader(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  LNP.util = {
    uid: uid, isNum: isNum, clamp: clamp, escapeHtml: escapeHtml, debounce: debounce,
    sum: sum, groupBy: groupBy, sortByDesc: sortByDesc, topNWithRest: topNWithRest,
    parseLocaleNumber: parseLocaleNumber, parsePeriod: parsePeriod, parseCalendarWeekInt: parseCalendarWeekInt,
    parseYearMonthInt: parseYearMonthInt, weekIntToMonthPeriod: weekIntToMonthPeriod, parsePeriodByType: parsePeriodByType,
    monthPeriodOf: monthPeriodOf, monthPeriodFromDate: monthPeriodFromDate,
    pad: pad, readWorkbookFile: readWorkbookFile, readWorkbookFileRaw: readWorkbookFileRaw,
    downloadBlob: downloadBlob, normHeader: normHeader
  };
})();
