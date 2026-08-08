/* ============================================================
   Charts — hand-rolled inline SVG. No chart library, no CDN.
   Mark specs follow the house rules: thin marks, 4px rounded
   data-ends, 2px surface gaps, hairline solid grid, legend for
   every multi-series chart, and a table twin for each one.
   ============================================================ */

const SVG_NS = "http://www.w3.org/2000/svg";

function el(name, attrs, parent) {
  const n = document.createElementNS(SVG_NS, name);
  if (attrs) for (const k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function esc(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function niceTicks(min, max, count) {
  if (min === max) { max = min + 1; }
  const span = max - min;
  const raw = span / (count || 4);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step * 0.001; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

/* One formatting decision per axis, applied to every tick on it.
   German compact notation only abbreviates from a million upwards, so below
   that grouped standard notation is both shorter to read and consistent. */
function makeTickFormat(maxAbs) {
  const compact = maxAbs >= 1e6;
  return v => fmtCurrency(v, { compact: compact, force: compact, decimals: 0 });
}

/* Rounded rect with 4px rounded data-end, square at the baseline. */
function barPath(x, y, w, h, r, dir) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  if (h <= 0.5) return "";
  if (dir === "up") {
    return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
  }
  // horizontal, rounded at the right end
  return `M${x},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} L${x},${y + h} Z`;
}

function makeTip(wrap) {
  let tip = wrap.querySelector(".tip");
  if (!tip) { tip = document.createElement("div"); tip.className = "tip"; wrap.appendChild(tip); }
  return tip;
}

function showTip(tip, wrap, x, y, html) {
  tip.innerHTML = html;
  tip.classList.add("on");
  const w = wrap.clientWidth;
  const tw = tip.offsetWidth;
  const left = Math.max(tw / 2 + 2, Math.min(w - tw / 2 - 2, x));
  tip.style.left = left + "px";
  tip.style.top = Math.max(tip.offsetHeight + 4, y - 10) + "px";
}

function hideTip(tip) { tip.classList.remove("on"); }

function legendHTML(items) {
  return items.map(it =>
    `<span class="item"><span class="sw${it.line ? " line" : ""}" style="background:${it.color}${it.dashed ? ";background:repeating-linear-gradient(90deg," + it.color + " 0 4px,transparent 4px 7px)" : ""}"></span>${esc(it.label)}</span>`
  ).join("");
}

function emptyState(wrap) {
  wrap.innerHTML = `<div class="empty">${esc(t("chart.noData"))}</div>`;
}

/* ============================================================
   1. Money in / money out — grouped columns, two series
   ============================================================ */
function renderFlowChart(wrap, model) {
  wrap.innerHTML = "";
  const data = model.buckets;
  if (!data.length) { emptyState(wrap); return; }

  const W = Math.max(320, wrap.clientWidth || 520);
  const H = 250;
  const m = { t: 12, r: 10, b: 30, l: 66 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;

  const maxV = Math.max(1, ...data.map(d => Math.max(d.inflow, d.outflow)));
  const ticks = niceTicks(0, maxV, 4);
  const yMax = ticks[ticks.length - 1];
  const y = v => m.t + ph - (v / yMax) * ph;

  const svg = el("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img" }, wrap);
  svg.setAttribute("aria-label", t("chart.flowTitle"));

  const tickFmt = makeTickFormat(yMax);
  for (const tk of ticks) {
    el("line", { class: "grid-line", x1: m.l, x2: m.l + pw, y1: y(tk), y2: y(tk) }, svg);
    el("text", { class: "axis-txt", x: m.l - 8, y: y(tk) + 4, "text-anchor": "end" }, svg).textContent = tickFmt(tk);
  }
  el("line", { class: "axis-line", x1: m.l, x2: m.l + pw, y1: y(0), y2: y(0) }, svg);

  const band = pw / data.length;
  const barW = Math.max(2, Math.min(11, band / 2 - 3));
  const gap = 2;                                     // surface gap between the pair

  data.forEach((d, i) => {
    const cx = m.l + band * i + band / 2;
    const xIn = cx - barW - gap / 2;
    const xOut = cx + gap / 2;
    const hIn = Math.max(0, y(0) - y(d.inflow));
    const hOut = Math.max(0, y(0) - y(d.outflow));
    el("path", { d: barPath(xIn, y(d.inflow), barW, hIn, 4, "up"), fill: "var(--s1)" }, svg);
    el("path", { d: barPath(xOut, y(d.outflow), barW, hOut, 4, "up"), fill: "var(--s2)" }, svg);
  });

  // x labels — thinned out, and the final label is dropped when it would
  // land on top of the previous one
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(pw / 62))));
  const lastShown = Math.floor((data.length - 1) / every) * every;
  const showLast = data.length - 1 - lastShown >= Math.max(1, Math.round(every * 0.6));
  data.forEach((d, i) => {
    if (i % every !== 0 && !(showLast && i === data.length - 1)) return;
    el("text", { class: "axis-txt", x: m.l + band * i + band / 2, y: H - 10, "text-anchor": "middle" }, svg)
      .textContent = model.bucketMode === "month"
        ? new Intl.DateTimeFormat(localeTag(), { month: "short", year: "2-digit" }).format(d.date)
        : fmtDate(d.date);
  });

  // hover layer
  const tip = makeTip(wrap);
  data.forEach((d, i) => {
    const hit = el("rect", { class: "hit", x: m.l + band * i, y: m.t, width: band, height: ph }, svg);
    const html =
      `<div class="t-head">${esc(fmtDate(d.date, "long"))}</div>` +
      `<div class="t-row"><span class="sw" style="background:var(--s1)"></span><span class="k">${esc(t("chart.inflow"))}</span><span class="v">${esc(fmtCurrency(d.inflow))}</span></div>` +
      `<div class="t-row"><span class="sw" style="background:var(--s2)"></span><span class="k">${esc(t("chart.outflow"))}</span><span class="v">${esc(fmtCurrency(d.outflow))}</span></div>` +
      `<div class="t-sep"></div>` +
      `<div class="t-row"><span class="k">${esc(t("chart.balance"))}</span><span class="v">${esc(fmtCurrency(d.net))}</span></div>`;
    const move = () => showTip(tip, wrap, m.l + band * i + band / 2, m.t + 20, html);
    hit.addEventListener("mouseenter", move);
    hit.addEventListener("mousemove", move);
    hit.addEventListener("mouseleave", () => hideTip(tip));
    hit.setAttribute("tabindex", "0");
    hit.addEventListener("focus", move);
    hit.addEventListener("blur", () => hideTip(tip));
  });

  document.getElementById("flow-legend").innerHTML = legendHTML([
    { color: "var(--s1)", label: t("chart.inflow") },
    { color: "var(--s2)", label: t("chart.outflow") }
  ]);
}

function flowTableHTML(model) {
  const head = `<tr><th>${esc(t("chart.bucket" + model.bucketMode.charAt(0).toUpperCase() + model.bucketMode.slice(1)))}</th>` +
    `<th class="num">${esc(t("chart.inflow"))}</th><th class="num">${esc(t("chart.outflow"))}</th><th class="num">${esc(t("chart.balance"))}</th></tr>`;
  const body = model.buckets.map(b =>
    `<tr><td>${esc(fmtDate(b.date, "long"))}</td><td class="num">${esc(fmtCurrency(b.inflow))}</td>` +
    `<td class="num">${esc(fmtCurrency(b.outflow))}</td><td class="num">${esc(fmtCurrency(b.net))}</td></tr>`
  ).join("");
  return `<div class="table-scroll"><table class="data"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/* ============================================================
   2. Balance forecast — line, actual + projection
   ============================================================ */
function renderCashChart(wrap, model) {
  wrap.innerHTML = "";
  const hist = model.history;
  const fc = model.forecast.days;
  const all = hist.concat(fc);
  if (all.length < 2) { emptyState(wrap); return; }

  const W = Math.max(320, wrap.clientWidth || 520);
  const H = 250;
  const m = { t: 14, r: 14, b: 30, l: 66 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;

  const vals = all.map(d => d.balance);
  const lo = Math.min(0, ...vals), hi = Math.max(...vals);
  const ticks = niceTicks(lo, hi, 4);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const y = v => m.t + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
  const x = i => m.l + (i / (all.length - 1)) * pw;

  const svg = el("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img" }, wrap);
  svg.setAttribute("aria-label", t("chart.cashTitle"));

  const tickFmt = makeTickFormat(Math.max(Math.abs(yMin), Math.abs(yMax)));
  for (const tk of ticks) {
    el("line", { class: "grid-line", x1: m.l, x2: m.l + pw, y1: y(tk), y2: y(tk) }, svg);
    el("text", { class: "axis-txt", x: m.l - 8, y: y(tk) + 4, "text-anchor": "end" }, svg).textContent = tickFmt(tk);
  }
  if (yMin < 0) el("line", { class: "axis-line", x1: m.l, x2: m.l + pw, y1: y(0), y2: y(0) }, svg);

  const path = pts => pts.map((p, i) => (i ? "L" : "M") + x(p.i) + "," + y(p.v)).join(" ");
  const histPts = hist.map((d, i) => ({ i, v: d.balance }));
  const fcPts = fc.map((d, i) => ({ i: hist.length + i, v: d.balance }));
  if (histPts.length) fcPts.unshift(histPts[histPts.length - 1]);

  // area wash under the actual line
  if (histPts.length > 1) {
    const area = path(histPts) + ` L${x(histPts[histPts.length - 1].i)},${y(Math.max(yMin, 0))} L${x(0)},${y(Math.max(yMin, 0))} Z`;
    el("path", { d: area, fill: "var(--s1)", "fill-opacity": ".10" }, svg);
    el("path", { d: path(histPts), fill: "none", stroke: "var(--s1)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
  }
  el("path", { d: path(fcPts), fill: "none", stroke: "var(--s1)", "stroke-width": 2, "stroke-dasharray": "5 4", "stroke-linecap": "round" }, svg);

  // today divider
  const todayX = x(Math.max(0, hist.length - 1));
  el("line", { class: "axis-line", x1: todayX, x2: todayX, y1: m.t, y2: m.t + ph }, svg);
  el("text", { class: "axis-txt", x: todayX + 5, y: m.t + 10 }, svg).textContent = t("chart.today");

  // restock markers on the forecast
  for (const o of model.forecast.orders) {
    const idx = hist.length + o.day - 1;
    if (idx >= all.length) continue;
    const px = x(idx), py = y(all[idx].balance);
    el("circle", { cx: px, cy: py, r: 5.5, fill: "var(--s2)", stroke: "var(--surface)", "stroke-width": 2 }, svg);
  }

  // end label — one direct label, on the last point
  const last = all[all.length - 1];
  const lx = x(all.length - 1), ly = y(last.balance);
  el("circle", { cx: lx, cy: ly, r: 4.5, fill: "var(--s1)", stroke: "var(--surface)", "stroke-width": 2 }, svg);
  const lab = el("text", { class: "dir-label", x: lx - 6, y: ly - 10, "text-anchor": "end" }, svg);
  lab.textContent = fmtCurrency(last.balance, { compact: true, decimals: 0 });

  // crosshair + tooltip
  const tip = makeTip(wrap);
  const cross = el("line", { class: "axis-line", x1: 0, x2: 0, y1: m.t, y2: m.t + ph, opacity: 0 }, svg);
  const dot = el("circle", { r: 4.5, fill: "var(--s1)", stroke: "var(--surface)", "stroke-width": 2, opacity: 0 }, svg);
  const surface = el("rect", { class: "hit", x: m.l, y: m.t, width: pw, height: ph }, svg);

  const ordersByDay = {};
  for (const o of model.forecast.orders) ordersByDay[o.day] = (ordersByDay[o.day] || []).concat(o);

  function at(clientX) {
    const box = svg.getBoundingClientRect();
    const px = (clientX - box.left) * (W / box.width);
    let idx = Math.round(((px - m.l) / pw) * (all.length - 1));
    idx = Math.max(0, Math.min(all.length - 1, idx));
    const d = all[idx];
    cross.setAttribute("x1", x(idx)); cross.setAttribute("x2", x(idx)); cross.setAttribute("opacity", 1);
    dot.setAttribute("cx", x(idx)); dot.setAttribute("cy", y(d.balance)); dot.setAttribute("opacity", 1);
    let html = `<div class="t-head">${esc(fmtDate(d.date, "long"))}</div>` +
      `<div class="t-row"><span class="sw" style="background:var(--s1)"></span><span class="k">${esc(t("chart.balance"))}</span><span class="v">${esc(fmtCurrency(d.balance))}</span></div>` +
      `<div class="t-row"><span class="k">${esc(d.actual ? t("chart.actual") : t("chart.forecast"))}</span><span class="v"></span></div>`;
    if (!d.actual) {
      const day = idx - hist.length + 1;
      const os = ordersByDay[day];
      if (os) {
        html += `<div class="t-sep"></div>`;
        for (const o of os) {
          html += `<div class="t-row"><span class="sw" style="background:var(--s2)"></span><span class="k">${esc(o.name)}</span><span class="v">${esc(fmtCurrency(o.cost))}</span></div>`;
        }
      }
    }
    showTip(tip, wrap, x(idx), y(d.balance), html);
  }
  surface.addEventListener("mousemove", e => at(e.clientX));
  surface.addEventListener("mouseleave", () => {
    hideTip(tip); cross.setAttribute("opacity", 0); dot.setAttribute("opacity", 0);
  });

  document.getElementById("cash-legend").innerHTML = legendHTML([
    { color: "var(--s1)", label: t("chart.actual"), line: true },
    { color: "var(--s1)", label: t("chart.forecast"), line: true, dashed: true },
    { color: "var(--s2)", label: t("chart.restockDue") }
  ]);
}

function cashTableHTML(model) {
  const rows = model.forecast.days.filter((d, i) => i % 7 === 0 || i === model.forecast.days.length - 1);
  const head = `<tr><th>${esc(t("plan.h.orderBy"))}</th><th class="num">${esc(t("chart.inflow"))}</th>` +
    `<th class="num">${esc(t("chart.outflow"))}</th><th class="num">${esc(t("chart.balance"))}</th></tr>`;
  const body = rows.map(d =>
    `<tr><td>${esc(fmtDate(d.date, "long"))}</td><td class="num">${esc(fmtCurrency(d.inflow))}</td>` +
    `<td class="num">${esc(fmtCurrency(d.outflow))}</td><td class="num">${esc(fmtCurrency(d.balance))}</td></tr>`
  ).join("");
  return `<div class="table-scroll"><table class="data"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/* ============================================================
   3 & 4. Horizontal bars — one series, direct-labelled
   ============================================================ */
function renderBarChart(wrap, items, opts) {
  wrap.innerHTML = "";
  if (!items.length) { emptyState(wrap); return; }

  const W = Math.max(320, wrap.clientWidth || 520);
  const rowH = 30;
  // the right margin reserves room for the direct value labels, so no
  // label is ever placed inside a bar or clipped at the edge
  const m = { t: 6, r: 74, b: 8, l: Math.min(150, Math.max(96, Math.round(W * 0.32))) };
  const H = m.t + m.b + items.length * rowH;
  const pw = W - m.l - m.r;

  const maxV = Math.max(1, ...items.map(d => Math.abs(d.value)));
  const minV = Math.min(0, ...items.map(d => d.value));
  const span = maxV - Math.min(0, minV);
  const zeroX = m.l + (Math.min(0, minV) < 0 ? (-minV / span) * pw : 0);
  const scale = v => (Math.abs(v) / span) * pw;

  const svg = el("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img" }, wrap);
  svg.setAttribute("aria-label", opts.title || "");

  const tip = makeTip(wrap);
  const barH = Math.min(14, rowH - 12);

  items.forEach((d, i) => {
    const yTop = m.t + i * rowH + (rowH - barH) / 2;
    const w = Math.max(1, scale(d.value));
    const x0 = d.value >= 0 ? zeroX : zeroX - w;

    el("path", { d: barPath(x0, yTop, w, barH, 4, "right"), fill: opts.color || "var(--s1)" }, svg);

    // category label, left of the axis, truncated with an ellipsis rather than clipped
    const maxChars = Math.max(8, Math.floor((m.l - 14) / 6.6));
    const label = d.label.length > maxChars ? d.label.slice(0, maxChars - 1) + "…" : d.label;
    const tx = el("text", { class: "axis-txt", x: m.l - 10, y: yTop + barH / 2 + 4, "text-anchor": "end" }, svg);
    tx.textContent = label;

    // direct value label at the bar tip, always outside the mark
    const vl = el("text", { class: "dir-label", y: yTop + barH / 2 + 4 }, svg);
    vl.textContent = opts.format(d.value);
    vl.setAttribute("x", d.value >= 0 ? x0 + w + 7 : x0 - 7);
    vl.setAttribute("text-anchor", d.value >= 0 ? "start" : "end");

    const hit = el("rect", { class: "hit", x: m.l, y: m.t + i * rowH, width: pw, height: rowH }, svg);
    const html = `<div class="t-head">${esc(d.label)}</div>` +
      (d.detail || []).map(row =>
        `<div class="t-row"><span class="k">${esc(row[0])}</span><span class="v">${esc(row[1])}</span></div>`).join("");
    const move = () => showTip(tip, wrap, Math.min(W - 40, x0 + w), m.t + i * rowH + 6, html);
    hit.addEventListener("mouseenter", move);
    hit.addEventListener("mousemove", move);
    hit.addEventListener("mouseleave", () => hideTip(tip));
  });

  if (minV < 0) el("line", { class: "axis-line", x1: zeroX, x2: zeroX, y1: m.t, y2: H - m.b }, svg);
}

function simpleTableHTML(cols, rows) {
  const head = "<tr>" + cols.map(c => `<th${c.num ? ' class="num"' : ""}>${esc(c.label)}</th>`).join("") + "</tr>";
  const body = rows.map(r => "<tr>" + r.map((v, i) =>
    `<td${cols[i].num ? ' class="num"' : ""}>${esc(v)}</td>`).join("") + "</tr>").join("");
  return `<div class="table-scroll"><table class="data"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
