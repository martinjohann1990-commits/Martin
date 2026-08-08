/* ============================================================
   CSV parsing, value coercion and column detection.
   Everything runs on the main thread against a string that was
   read with FileReader — no network, no worker, no dependency.
   ============================================================ */

const MAX_BYTES = 25 * 1024 * 1024;

/* ---------- delimiter sniffing ---------- */
function detectDelimiter(text) {
  const sample = text.slice(0, 64 * 1024).split(/\r?\n/).slice(0, 20);
  const cands = [",", ";", "\t", "|"];
  let best = ",", bestScore = -1;
  for (const d of cands) {
    const counts = sample
      .filter(l => l.trim() !== "")
      .map(l => countOutsideQuotes(l, d));
    if (!counts.length) continue;
    const max = Math.max(...counts);
    if (max === 0) continue;
    // prefer the delimiter with the highest, most consistent field count
    const mode = counts.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
    const consistency = Math.max(...Object.values(mode)) / counts.length;
    const score = max * consistency;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

function countOutsideQuotes(line, d) {
  let n = 0, q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') i++; else q = !q; }
    else if (c === d && !q) n++;
  }
  return n;
}

/* ---------- RFC4180-ish parser ---------- */
function parseCSV(text, delimiter) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const d = delimiter || detectDelimiter(text);
  const rows = [];
  let row = [], field = "", q = false, started = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else q = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field.trim() === "") { q = true; started = true; continue; }
    if (c === d) { row.push(field); field = ""; started = true; continue; }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field);
      if (started || row.length > 1 || row[0].trim() !== "") rows.push(row);
      row = []; field = ""; started = false;
      continue;
    }
    field += c;
    started = true;
  }
  row.push(field);
  if (started || row.length > 1) rows.push(row);

  if (!rows.length) return { headers: [], rows: [], delimiter: d };

  const headers = rows[0].map((h, i) => {
    const clean = String(h).trim();
    return clean === "" ? "column_" + (i + 1) : clean;
  });
  const body = [];
  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r];
    if (raw.length === 1 && String(raw[0]).trim() === "") continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = raw[c] === undefined ? "" : String(raw[c]).trim();
    body.push(obj);
  }
  return { headers, rows: body, delimiter: d };
}

/* ---------- number coercion ---------- */
function parseNumber(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return isFinite(input) ? input : null;
  let s = String(input).trim();
  if (s === "" || s === "-" || s === "—" || s === "n/a" || s === "N/A") return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  s = s.replace(/[\s  ]/g, "");
  s = s.replace(/[^0-9,.\-+]/g, "");        // drop currency symbols and letters
  if (s.startsWith("-")) { negative = !negative; s = s.slice(1); }
  else if (s.startsWith("+")) s = s.slice(1);
  if (s.endsWith("-")) { negative = !negative; s = s.slice(0, -1); }
  if (s === "") return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let decimalSep = "";
  if (lastComma !== -1 && lastDot !== -1) {
    decimalSep = lastComma > lastDot ? "," : ".";
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1;
    const occurrences = s.split(",").length - 1;
    decimalSep = (occurrences === 1 && after !== 3) ? "," : "";
  } else if (lastDot !== -1) {
    const after = s.length - lastDot - 1;
    const occurrences = s.split(".").length - 1;
    decimalSep = (occurrences === 1 && after !== 3) ? "." : "";
  }

  let intPart, fracPart = "";
  if (decimalSep) {
    const idx = decimalSep === "," ? lastComma : lastDot;
    intPart = s.slice(0, idx);
    fracPart = s.slice(idx + 1);
  } else {
    intPart = s;
  }
  intPart = intPart.replace(/[.,]/g, "");
  fracPart = fracPart.replace(/[.,]/g, "");
  const val = Number(intPart + (fracPart ? "." + fracPart : ""));
  if (!isFinite(val)) return null;
  return negative ? -val : val;
}

/* ---------- date coercion ---------- */
const MONTH_NAMES = {
  jan: 0, januar: 0, january: 0, jän: 0,
  feb: 1, februar: 1, february: 1,
  mar: 2, mär: 2, maerz: 2, "märz": 2, march: 2, mrz: 2,
  apr: 3, april: 3,
  mai: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oct: 9, oktober: 9, october: 9,
  nov: 10, november: 10,
  dez: 11, dec: 11, dezember: 11, december: 11
};

/** Returns {y,m,d} parts or null, without deciding day/month order. */
function dateParts(input) {
  if (input === null || input === undefined) return null;
  let s = String(input).trim();
  if (!s) return null;
  s = s.split(/[T ]/)[0].replace(/,/g, " ").trim();     // drop time part

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return { y: +m[1], a: +m[2], b: +m[3], order: "ymd" };

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += y < 70 ? 2000 : 1900;
    return { y, a: +m[1], b: +m[2], order: "amb" };
  }

  // "12 Mar 2024" / "March 12 2024" / "12. März 2024"
  const words = s.replace(/\./g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    let day = null, mon = null, year = null;
    for (const w of words) {
      const key = w.toLowerCase().replace(/[^a-zäöüß]/g, "");
      if (key && MONTH_NAMES[key] !== undefined) { mon = MONTH_NAMES[key]; continue; }
      const n = parseInt(w, 10);
      if (isNaN(n)) continue;
      if (n > 31 || w.length === 4) year = n;
      else if (day === null) day = n;
    }
    if (mon !== null && day !== null && year !== null) return { y: year, a: day, b: mon + 1, order: "dmy" };
  }
  return null;
}

/**
 * Decides day-first vs month-first for a whole column, then parses.
 * Returns a function(value) -> Date|null.
 */
function makeDateParser(values) {
  let dayFirstVotes = 0, monthFirstVotes = 0;
  for (const v of values) {
    const p = dateParts(v);
    if (!p || p.order !== "amb") continue;
    if (p.a > 12 && p.b <= 12) dayFirstVotes++;
    else if (p.b > 12 && p.a <= 12) monthFirstVotes++;
  }
  let dayFirst;
  if (dayFirstVotes || monthFirstVotes) dayFirst = dayFirstVotes >= monthFirstVotes;
  else {
    // no disambiguating sample: dotted dates are day-first, slashed are month-first
    const sample = values.find(v => dateParts(v) && dateParts(v).order === "amb") || "";
    dayFirst = String(sample).indexOf(".") !== -1 || LANG === "de";
  }
  return function (value) {
    const p = dateParts(value);
    if (!p) return null;
    let y = p.y, mo, dd;
    if (p.order === "ymd") { mo = p.a; dd = p.b; }
    else if (p.order === "dmy") { dd = p.a; mo = p.b; }
    else if (dayFirst) { dd = p.a; mo = p.b; }
    else { mo = p.a; dd = p.b; }
    if (mo < 1 || mo > 12 || dd < 1 || dd > 31 || y < 1970 || y > 2200) return null;
    const dt = new Date(y, mo - 1, dd);
    return isNaN(dt.getTime()) ? null : dt;
  };
}

/* ---------- column detection ---------- */
function normHeader(h) {
  return String(h).toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* Aliases are matched in order: exact normalised match wins over contains. */
const FIELD_ALIASES = {
  date: ["sale date", "order date", "date", "datum", "bestelldatum", "verkaufsdatum", "date sold", "purchase date", "created at", "transaktionsdatum", "buchungstag", "day", "tag", "paid at", "zeitpunkt"],
  sku: ["sku", "artikelnummer", "artikel nr", "item id", "item number", "product id", "produkt id", "listing id", "variant sku", "asin", "ean", "artikelnr", "seller sku"],
  product: ["item name", "product name", "product title", "title", "produkt", "artikel", "artikelname", "bezeichnung", "name", "description", "beschreibung", "listing title"],
  qty: ["quantity", "qty", "menge", "anzahl", "number of items", "units", "stuckzahl", "stueckzahl", "stuck", "stueck", "items", "lineitem quantity"],
  revenue: ["item total", "line total", "order total", "revenue", "umsatz", "gesamt", "gesamtpreis", "total", "gross sales", "bruttoumsatz", "sales", "erlos", "betrag", "zeilensumme", "amount"],
  price: ["unit price", "price", "preis", "stuckpreis", "stueckpreis", "einzelpreis", "item price", "vk", "verkaufspreis", "lineitem price"],
  cost: ["unit cost", "cost of goods", "cogs", "cost", "kosten", "ek", "einkaufspreis", "einkauf", "wareneinsatz", "herstellkosten", "purchase price", "cost price"],
  /* German exports appear both with umlauts and with the "ue" transcription,
     so both spellings are listed rather than normalised away (stripping "ue"
     would wreck unrelated words). */
  fees: ["fees", "fee", "gebuhren", "gebuehren", "gebuhr", "gebuehr", "provision", "commission", "marketplace fee", "transaction fee", "verkaufsgebuhr", "verkaufsgebuehr", "fees taxes", "etsy fees", "processing fee"],
  shipping: ["shipping cost", "shipping", "versandkosten", "versand", "porto", "postage", "delivery cost", "shipping expense", "shipping paid"],
  shipRev: ["shipping income", "shipping revenue", "versanderlose", "versanderlos", "shipping charged", "versandeinnahmen"],
  discount: ["discount", "rabatt", "coupon", "gutschein", "nachlass", "discount amount"],
  channel: ["channel", "kanal", "marketplace", "marktplatz", "plattform", "platform", "shop", "store", "source", "quelle", "sales channel"],
  order: ["order id", "order number", "bestellnummer", "bestell nr", "auftragsnummer", "transaction id", "receipt id", "order"]
};

const INV_ALIASES = {
  sku: FIELD_ALIASES.sku,
  product: FIELD_ALIASES.product,
  stock: ["stock", "stock on hand", "on hand", "bestand", "lagerbestand", "inventory", "quantity on hand", "verfugbar", "available", "menge", "qty", "quantity", "bestandsmenge"],
  cost: FIELD_ALIASES.cost,
  lead: ["lead time", "lead time days", "lieferzeit", "lieferzeit tage", "wiederbeschaffungszeit", "replenishment time", "leadtime"],
  moq: ["moq", "minimum order quantity", "mindestbestellmenge", "min order", "mindestmenge", "abnahmemenge"],
  supplier: ["supplier", "lieferant", "vendor", "hersteller", "manufacturer"]
};

function detectColumns(headers, aliases) {
  const norm = headers.map(normHeader);
  const used = new Set();
  const out = {};
  // pass 1: exact match
  for (const field in aliases) {
    for (const alias of aliases[field]) {
      const idx = norm.findIndex((h, i) => h === alias && !used.has(i));
      if (idx !== -1) { out[field] = headers[idx]; used.add(idx); break; }
    }
  }
  // pass 2: substring match
  for (const field in aliases) {
    if (out[field]) continue;
    for (const alias of aliases[field]) {
      if (alias.length < 3) continue;
      const idx = norm.findIndex((h, i) => !used.has(i) && (h.indexOf(alias) !== -1 || alias.indexOf(h) !== -1 && h.length >= 3));
      if (idx !== -1) { out[field] = headers[idx]; used.add(idx); break; }
    }
  }
  return out;
}

/* ---------- CSV writing ---------- */
function toCSV(headerRow, dataRows, delimiter) {
  const d = delimiter || ";";
  const esc = v => {
    const s = v === null || v === undefined ? "" : String(v);
    return /["\n\r]/.test(s) || s.indexOf(d) !== -1 ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headerRow.map(esc).join(d)];
  for (const r of dataRows) lines.push(r.map(esc).join(d));
  return "﻿" + lines.join("\r\n");
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: (mime || "text/csv") + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_BYTES) { reject(new Error(t("err.tooBig"))); return; }
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read error"));
    fr.onload = () => resolve(String(fr.result || ""));
    fr.readAsText(file, "utf-8");
  });
}
