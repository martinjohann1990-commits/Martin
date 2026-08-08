/* ============================================================
   Application shell — state, persistence, language, rendering.
   ============================================================ */

const LS = {
  settings: "flowstock.settings.v1",
  lang: "flowstock.lang",
  theme: "flowstock.theme",
  data: "flowstock.data.v1"
};

const DEFAULT_SETTINGS = {
  currency: "EUR",
  startCash: 5000,
  fixedCosts: 600,
  horizon: 90,
  leadTime: 21,
  targetCover: 45,
  safetyDays: 7,
  velWindow: 30,
  defaultCost: 40,
  defaultFee: 12,
  remember: false
};

const STATE = {
  settings: Object.assign({}, DEFAULT_SETTINGS),
  salesRaw: null, salesMap: null,
  invRaw: null, invMap: null,
  sales: null, inventory: null,
  filters: { range: "all", channel: "__all", search: "" },
  model: null,
  views: { flow: "chart", cash: "chart", sku: "chart", chan: "chart" },
  sort: { inv: { key: "profit", dir: -1 }, plan: null },
  fileNames: { sales: null, inv: null }
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.prototype.slice.call(document.querySelectorAll(sel));

/* ============================================================
   Language & theme
   ============================================================ */
function applyI18n() {
  document.documentElement.lang = LANG;
  const vars = { days: STATE.settings.horizon, bucket: t("chart.bucketWeek"), cash: "", n: 0, total: 0, pct: "", value: "" };
  $$("[data-i18n]").forEach(node => {
    const key = node.getAttribute("data-i18n");
    node.textContent = t(key, vars);
  });
  $("#lang-de").setAttribute("aria-pressed", String(LANG === "de"));
  $("#lang-en").setAttribute("aria-pressed", String(LANG === "en"));
  document.title = "FlowStock — " + t("app.tagline");
  $("#about-body").innerHTML = I18N_PROSE[LANG].about.replace("{version}", APP_VERSION);
  $("#help-body").innerHTML = I18N_PROSE[LANG].help;
  rebuildChannelFilter();
}

function setLang(lang) {
  LANG = (lang === "en" || lang === "de") ? lang : "de";
  try { localStorage.setItem(LS.lang, LANG); } catch (e) {}
  applyI18n();
  if (STATE.model) render();
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("#ic-sun").hidden = theme === "dark";
  $("#ic-moon").hidden = theme !== "dark";
  try { localStorage.setItem(LS.theme, theme); } catch (e) {}
  if (STATE.model) renderCharts();
}

/* ============================================================
   Persistence
   ============================================================ */
function loadSettings() {
  try {
    const raw = localStorage.getItem(LS.settings);
    if (raw) Object.assign(STATE.settings, JSON.parse(raw));
  } catch (e) {}
}

function saveSettings() {
  try { localStorage.setItem(LS.settings, JSON.stringify(STATE.settings)); } catch (e) {}
}

function persistData() {
  if (!STATE.settings.remember || !STATE.salesRaw) { return; }
  try {
    localStorage.setItem(LS.data, JSON.stringify({
      salesRaw: STATE.salesRaw, salesMap: STATE.salesMap,
      invRaw: STATE.invRaw, invMap: STATE.invMap,
      fileNames: STATE.fileNames
    }));
  } catch (e) {
    STATE.settings.remember = false;
    saveSettings();
  }
}

function restoreData() {
  try {
    const raw = localStorage.getItem(LS.data);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !d.salesRaw) return false;
    STATE.salesRaw = d.salesRaw; STATE.salesMap = d.salesMap;
    STATE.invRaw = d.invRaw || null; STATE.invMap = d.invMap || null;
    STATE.fileNames = d.fileNames || { sales: null, inv: null };
    return buildAndRender();
  } catch (e) { return false; }
}

function clearStoredData() {
  try {
    localStorage.removeItem(LS.data);
    localStorage.removeItem(LS.settings);
  } catch (e) {}
  STATE.settings.remember = false;
}

/* ============================================================
   File intake
   ============================================================ */
function showLandingError(msg) {
  const box = $("#landing-error");
  if (!msg) { box.hidden = true; return; }
  $("#landing-error-text").textContent = msg;
  box.hidden = false;
}

async function handleFile(file, kind) {
  showLandingError("");
  try {
    const text = await readFileText(file);
    const parsed = parseCSV(text);
    if (!parsed.rows.length) throw new Error(t("err.empty"));
    if (kind === "sales") {
      STATE.salesRaw = parsed;
      STATE.salesMap = detectColumns(parsed.headers, FIELD_ALIASES);
      STATE.fileNames.sales = file.name;
    } else {
      STATE.invRaw = parsed;
      STATE.invMap = detectColumns(parsed.headers, INV_ALIASES);
      STATE.fileNames.inv = file.name;
    }
    updateSlots();
    if (STATE.salesRaw) openMapping();
  } catch (err) {
    showLandingError(t("err.parse", { msg: err.message || String(err) }));
  }
}

function updateSlots() {
  const s = $("#slot-sales"), i = $("#slot-inv");
  s.classList.toggle("is-set", !!STATE.salesRaw);
  i.classList.toggle("is-set", !!STATE.invRaw);
  s.querySelector(".nm").textContent = STATE.fileNames.sales
    ? STATE.fileNames.sales + " · " + STATE.salesRaw.rows.length
    : t("landing.slotSalesEmpty");
  i.querySelector(".nm").textContent = STATE.fileNames.inv
    ? STATE.fileNames.inv + " · " + STATE.invRaw.rows.length
    : t("landing.slotInvEmpty");
  s.querySelector("[data-clear]").hidden = !STATE.salesRaw;
  i.querySelector("[data-clear]").hidden = !STATE.invRaw;
}

/* ============================================================
   Column mapping dialog
   ============================================================ */
const SALES_FIELDS = ["date", "sku", "product", "qty", "revenue", "price", "cost", "fees", "shipping", "shipRev", "discount", "channel", "order"];
const INV_FIELDS = ["sku", "product", "stock", "cost", "lead", "moq", "supplier"];

function mapRow(field, headers, selected, required) {
  const opts = ['<option value="">— ' + esc(t("ui.notSet")) + " —</option>"]
    .concat(headers.map(h => `<option value="${esc(h)}"${h === selected ? " selected" : ""}>${esc(h)}</option>`))
    .join("");
  return `<div class="map-row"><span class="lab">${esc(t("map.f." + field))}</span>` +
    `<select data-map-field="${esc(field)}">${opts}</select></div>`;
}

function openMapping() {
  const sm = STATE.salesMap || {};
  $("#map-sales").innerHTML = SALES_FIELDS.map(f => mapRow(f, STATE.salesRaw.headers, sm[f])).join("");
  const hasInv = !!STATE.invRaw;
  $("#map-inv-block").hidden = !hasInv;
  if (hasInv) {
    const im = STATE.invMap || {};
    $("#map-inv").innerHTML = INV_FIELDS.map(f => mapRow(f, STATE.invRaw.headers, im[f])).join("");
  }
  $("#map-error").hidden = true;
  $("#dlg-map").showModal();
}

function readMapping() {
  const sales = {}, inv = {};
  $$("#map-sales [data-map-field]").forEach(sel => { if (sel.value) sales[sel.getAttribute("data-map-field")] = sel.value; });
  $$("#map-inv [data-map-field]").forEach(sel => { if (sel.value) inv[sel.getAttribute("data-map-field")] = sel.value; });
  return { sales, inv };
}

/* ============================================================
   Build model + render
   ============================================================ */
function buildAndRender() {
  const built = buildSalesRows(STATE.salesRaw, STATE.salesMap, STATE.settings);
  if (!built.rows.length) {
    showLandingError(t("err.noRows"));
    return false;
  }
  STATE.sales = built;
  STATE.inventory = STATE.invRaw && STATE.invMap ? buildInventory(STATE.invRaw, STATE.invMap) : null;
  STATE.filters.channel = "__all";
  $("#view-landing").hidden = true;
  $("#view-dash").hidden = false;
  $("#btn-settings").hidden = false;
  $("#btn-reset").hidden = false;
  rebuildChannelFilter();
  render();
  persistData();
  window.scrollTo(0, 0);
  return true;
}

function rebuildChannelFilter() {
  const sel = $("#f-channel");
  if (!sel) return;
  const chans = new Set();
  if (STATE.sales) for (const r of STATE.sales.rows) chans.add(r.channel || t("ui.other"));
  const list = Array.from(chans).sort();
  const cur = STATE.filters.channel;
  sel.innerHTML = `<option value="__all">${esc(t("ui.all"))}</option>` +
    list.map(c => `<option value="${esc(c)}"${c === cur ? " selected" : ""}>${esc(c)}</option>`).join("");
  sel.disabled = list.length < 2;
}

function render() {
  const model = analyze(STATE);
  STATE.model = model;
  if (!model) return;
  renderWarnings(model);
  renderKPIs(model);
  renderCharts();
  renderPlan(model);
  renderInventory(model);
}

function renderWarnings(model) {
  const msgs = [];
  if (!model.hasStock) msgs.push(t("warn.noStock"));
  if (model.flags.costEstimated > 0) msgs.push(t("warn.noCost", { n: model.flags.costEstimated, pct: STATE.settings.defaultCost + " %" }));
  if (model.flags.feesEstimated) msgs.push(t("warn.noFees", { pct: STATE.settings.defaultFee + " %" }));
  if (model.flags.skipped > 0) msgs.push(t("warn.skipped", { n: model.flags.skipped }));
  const box = $("#dash-warn");
  if (!msgs.length) { box.hidden = true; return; }
  $("#dash-warn-text").textContent = msgs.join(" ");
  box.hidden = false;
}

function delta(node, cur, prev, invert) {
  if (prev === null || prev === undefined || !isFinite(prev) || prev === 0) {
    node.className = "delta";
    node.textContent = t("kpi.noPrev");
    return;
  }
  const change = (cur - prev) / Math.abs(prev);
  const good = invert ? change < 0 : change > 0;
  node.className = "delta " + (Math.abs(change) < 0.005 ? "" : good ? "up" : "down");
  node.textContent = (change > 0 ? "▲ " : change < 0 ? "▼ " : "") + fmtSigned(change) + " " + t("kpi.vsPrev");
}

function renderKPIs(m) {
  const s = STATE.settings;
  const f = m.forecast;

  $("#hero-val").textContent = fmtCurrency(f.end, { decimals: 0 });
  $("[data-i18n='kpi.heroLabel']").textContent = t("kpi.heroLabel", { days: s.horizon });
  $("#hero-sub").textContent = t("kpi.heroSub", { cash: fmtCurrency(s.startCash, { decimals: 0 }) });
  $("#hero-today").textContent = fmtCurrency(s.startCash, { decimals: 0 });
  $("#hero-low").textContent = fmtCurrency(f.lowest.balance, { decimals: 0 });
  $("#hero-runway").textContent = f.runwayDays === null
    ? t("kpi.runwayOk", { days: s.horizon })
    : f.runwayDays + " " + t("ui.days");

  $("#k-rev").textContent = fmtCurrency(m.totals.revenue, { decimals: 0 });
  delta($("#k-rev-d"), m.totals.revenue, m.prev ? m.prev.revenue : null);

  $("#k-profit").textContent = fmtCurrency(m.totals.profit, { decimals: 0 });
  delta($("#k-profit-d"), m.totals.profit, m.prev ? m.prev.profit : null);

  $("#k-margin").textContent = m.totals.margin === null ? t("ui.none") : fmtPct(m.totals.margin, 1);
  $("#k-margin-d").className = "delta";
  $("#k-margin-d").textContent = t("kpi.ofRevenue", { pct: fmtCurrency(m.totals.profit, { compact: true, decimals: 0 }) });

  $("#k-orders").textContent = fmtNum(m.totals.orderCount);
  $("#k-orders-d").className = "delta";
  $("#k-orders-d").textContent = m.totals.aov === null ? "" : t("kpi.avgOrder", { value: fmtCurrency(m.totals.aov) });

  $("#k-stock").textContent = m.hasStock ? fmtCurrency(m.stockValue, { decimals: 0 }) : t("ui.none");
  $("#k-stock-d").className = "delta";
  $("#k-stock-d").textContent = m.hasStock ? t("kpi.stockUnits", { n: fmtNum(m.stockUnits) }) : "";

  $("#k-risk").textContent = m.hasStock ? fmtNum(m.atRisk) : t("ui.none");
  $("#k-risk-d").className = "delta" + (m.hasStock && m.atRisk > 0 ? " down" : "");
  $("#k-risk-d").textContent = m.hasStock ? t("kpi.skuCount", { n: m.atRisk, total: m.products.length }) : "";

  $("[data-i18n='chart.flowSub']").textContent = t("chart.flowSub", {
    bucket: t("chart.bucket" + m.bucketMode.charAt(0).toUpperCase() + m.bucketMode.slice(1))
  });
}

function renderCharts() {
  const m = STATE.model;
  if (!m) return;

  if (STATE.views.flow === "chart") renderFlowChart($("#flow-chart"), m);
  $("#flow-table").innerHTML = flowTableHTML(m);

  if (STATE.views.cash === "chart") renderCashChart($("#cash-chart"), m);
  $("#cash-table").innerHTML = cashTableHTML(m);

  const top = m.products.filter(p => p.profit !== 0).slice(0, 10);
  if (STATE.views.sku === "chart") {
    renderBarChart($("#sku-chart"), top.map(p => ({
      label: p.name,
      value: p.profit,
      detail: [
        [t("inv.h.revenue"), fmtCurrency(p.revenue)],
        [t("inv.h.profit"), fmtCurrency(p.profit)],
        [t("inv.h.marginPct"), p.margin === null ? t("ui.none") : fmtPct(p.margin, 0)],
        [t("inv.h.units"), fmtNum(p.units) + " " + t("ui.units")]
      ]
    })), { color: "var(--s1)", title: t("chart.skuTitle"), format: v => fmtCurrency(v, { compact: true, decimals: 0 }) });
  }
  $("#sku-table").innerHTML = simpleTableHTML(
    [{ label: t("inv.h.sku") }, { label: t("inv.h.revenue"), num: true }, { label: t("inv.h.profit"), num: true }, { label: t("inv.h.marginPct"), num: true }],
    top.map(p => [p.name, fmtCurrency(p.revenue), fmtCurrency(p.profit), p.margin === null ? t("ui.none") : fmtPct(p.margin, 0)])
  );

  const chans = m.channels.slice(0, 8);
  if (STATE.views.chan === "chart") {
    renderBarChart($("#chan-chart"), chans.map(c => ({
      label: c.key,
      value: c.revenue,
      detail: [
        [t("inv.h.revenue"), fmtCurrency(c.revenue)],
        [t("inv.h.profit"), fmtCurrency(c.profit)],
        [t("inv.h.units"), fmtNum(c.units) + " " + t("ui.units")]
      ]
    })), { color: "var(--s1)", title: t("chart.chanTitle"), format: v => fmtCurrency(v, { compact: true, decimals: 0 }) });
  }
  $("#chan-table").innerHTML = simpleTableHTML(
    [{ label: t("filter.channel") }, { label: t("inv.h.revenue"), num: true }, { label: t("inv.h.profit"), num: true }],
    chans.map(c => [c.key, fmtCurrency(c.revenue), fmtCurrency(c.profit)])
  );
}

/* ---------- status pill ---------- */
const STATUS_ICON = { critical: "✕", serious: "▲", warning: "●", good: "✓", idle: "–", unknown: "?" };
function statusPill(status) {
  return `<span class="pill ${esc(status)}" title="${esc(t("status." + status + "Desc") || "")}">` +
    `<span class="ic" aria-hidden="true">${STATUS_ICON[status] || "?"}</span>${esc(t("status." + status))}</span>`;
}

function renderPlan(m) {
  const tbl = $("#plan-table");
  const empty = $("#plan-empty");
  if (!m.hasStock || !m.plan.length) {
    tbl.innerHTML = "";
    empty.hidden = false;
    empty.textContent = m.hasStock ? t("plan.empty") : t("inv.noStock");
    return;
  }
  empty.hidden = true;
  const head = `<thead><tr>
    <th>${esc(t("plan.h.status"))}</th>
    <th>${esc(t("plan.h.sku"))}</th>
    <th>${esc(t("plan.h.orderBy"))}</th>
    <th class="num">${esc(t("plan.h.qty"))}</th>
    <th class="num">${esc(t("plan.h.cost"))}</th>
    <th>${esc(t("plan.h.stockout"))}</th>
    <th class="num">${esc(t("plan.h.cover"))}</th>
  </tr></thead>`;
  const body = m.plan.map(p => `<tr>
    <td>${statusPill(p.status)}</td>
    <td class="name">${esc(p.name)}${p.sku && p.sku !== p.name ? ' <span style="color:var(--muted)">· ' + esc(p.sku) + "</span>" : ""}</td>
    <td>${esc(fmtDate(p.orderByDate, "long"))}</td>
    <td class="num">${esc(fmtNum(p.orderQty))}</td>
    <td class="num">${esc(fmtCurrency(p.orderCost))}</td>
    <td>${esc(p.stockoutDate ? fmtDate(p.stockoutDate, "long") : t("ui.none"))}</td>
    <td class="num">${esc(isFinite(p.cover) ? fmtNum(p.cover, 0) + " " + t("ui.days") : t("ui.none"))}</td>
  </tr>`).join("");
  const foot = `<tfoot><tr><td colspan="4" style="font-weight:600">${esc(t("plan.totalCost", { value: "" })).replace(/:\s*$/, ":")}</td>` +
    `<td class="num" style="font-weight:600">${esc(fmtCurrency(m.planCost))}</td><td colspan="2"></td></tr></tfoot>`;
  tbl.innerHTML = head + "<tbody>" + body + "</tbody>" + foot;
}

const INV_COLS = [
  { key: "name", label: "inv.h.sku", num: false },
  { key: "units", label: "inv.h.units", num: true },
  { key: "revenue", label: "inv.h.revenue", num: true },
  { key: "profit", label: "inv.h.profit", num: true },
  { key: "margin", label: "inv.h.marginPct", num: true },
  { key: "velocity", label: "inv.h.velocity", num: true },
  { key: "stock", label: "inv.h.stock", num: true },
  { key: "cover", label: "inv.h.cover", num: true },
  { key: "stockValue", label: "inv.h.value", num: true },
  { key: "status", label: "inv.h.status", num: false }
];

function renderInventory(m) {
  const tbl = $("#inv-table");
  const empty = $("#inv-empty");
  if (!m.products.length) {
    tbl.innerHTML = ""; empty.hidden = false; empty.textContent = t("inv.empty");
    return;
  }
  empty.hidden = true;
  const sort = STATE.sort.inv;
  const rows = m.products.slice().sort((a, b) => {
    const va = a[sort.key], vb = b[sort.key];
    if (typeof va === "string" || typeof vb === "string")
      return String(va || "").localeCompare(String(vb || ""), localeTag()) * sort.dir;
    const na = va === null || va === undefined || !isFinite(va) ? -Infinity : va;
    const nb = vb === null || vb === undefined || !isFinite(vb) ? -Infinity : vb;
    return (na - nb) * sort.dir;
  });

  const head = "<thead><tr>" + INV_COLS.map(c =>
    `<th class="sortable${c.num ? " num" : ""}" data-sort="${c.key}">${esc(t(c.label))}` +
    (sort.key === c.key ? ` <span class="arrow">${sort.dir < 0 ? "▼" : "▲"}</span>` : "") + "</th>").join("") + "</tr></thead>";

  const body = rows.map(p => `<tr>
    <td class="name">${esc(p.name)}${p.sku && p.sku !== p.name ? ' <span style="color:var(--muted)">· ' + esc(p.sku) + "</span>" : ""}</td>
    <td class="num">${esc(fmtNum(p.units))}</td>
    <td class="num">${esc(fmtCurrency(p.revenue))}</td>
    <td class="num">${esc(fmtCurrency(p.profit))}${p.costEstimated ? ' <span style="color:var(--muted)" title="' + esc(t("inv.estimated")) + '">~</span>' : ""}</td>
    <td class="num">${esc(p.margin === null ? t("ui.none") : fmtPct(p.margin, 0))}</td>
    <td class="num">${esc(fmtNum(p.velocity, 2))}</td>
    <td class="num">${esc(p.stock === null ? t("ui.none") : fmtNum(p.stock))}</td>
    <td class="num">${esc(p.cover === null ? t("ui.none") : isFinite(p.cover) ? fmtNum(p.cover, 0) : "∞")}</td>
    <td class="num">${esc(p.stockValue === null ? t("ui.none") : fmtCurrency(p.stockValue))}</td>
    <td>${statusPill(p.status)}</td>
  </tr>`).join("");

  tbl.innerHTML = head + "<tbody>" + body + "</tbody>";
  $$("#inv-table th.sortable").forEach(th => th.addEventListener("click", () => {
    const key = th.getAttribute("data-sort");
    if (STATE.sort.inv.key === key) STATE.sort.inv.dir *= -1;
    else STATE.sort.inv = { key, dir: key === "name" || key === "status" ? 1 : -1 };
    renderInventory(STATE.model);
  }));
}

/* ============================================================
   Exports
   ============================================================ */
function exportSummary() {
  const m = STATE.model;
  if (!m) return;
  const c = STATE.settings.currency;
  const rows = [
    [t("kpi.revenue"), m.totals.revenue.toFixed(2), c],
    [t("kpi.profit"), m.totals.profit.toFixed(2), c],
    [t("kpi.margin"), m.totals.margin === null ? "" : (m.totals.margin * 100).toFixed(1), "%"],
    [t("kpi.orders"), String(m.totals.orderCount), ""],
    [t("kpi.stockValue"), m.stockValue.toFixed(2), c],
    [t("kpi.atRisk"), String(m.atRisk), ""],
    [t("kpi.heroLabel", { days: STATE.settings.horizon }), m.forecast.end.toFixed(2), c],
    [t("kpi.lowest"), m.forecast.lowest.balance.toFixed(2), c],
    [t("plan.totalCost", { value: "" }).replace(/[: ]+$/, ""), m.planCost.toFixed(2), c],
    [], [t("chart.bucket" + m.bucketMode.charAt(0).toUpperCase() + m.bucketMode.slice(1)), t("chart.inflow"), t("chart.outflow"), t("chart.balance")]
  ];
  for (const b of m.buckets) rows.push([fmtISO(b.date), b.inflow.toFixed(2), b.outflow.toFixed(2), b.net.toFixed(2)]);
  rows.push([], [t("plan.h.orderBy"), t("chart.balance")]);
  for (const d of m.forecast.days) rows.push([fmtISO(d.date), d.balance.toFixed(2)]);
  downloadText(t("csv.exportName") + "-" + fmtISO(new Date()) + ".csv", toCSV(["FlowStock", "", "", ""], rows, ";"));
}

function exportPlan() {
  const m = STATE.model;
  if (!m) return;
  const head = [t("plan.h.status"), "SKU", t("plan.h.sku"), t("plan.h.orderBy"), t("plan.h.qty"), t("plan.h.cost"), t("plan.h.stockout"), t("plan.h.cover")];
  const rows = m.plan.map(p => [
    t("status." + p.status), p.sku || "", p.name,
    p.orderByDate ? fmtISO(p.orderByDate) : "",
    String(p.orderQty), p.orderCost.toFixed(2),
    p.stockoutDate ? fmtISO(p.stockoutDate) : "",
    isFinite(p.cover) ? p.cover.toFixed(0) : ""
  ]);
  downloadText(t("csv.planName") + "-" + fmtISO(new Date()) + ".csv", toCSV(head, rows, ";"));
}

function exportInventory() {
  const m = STATE.model;
  if (!m) return;
  const head = ["SKU", t("inv.h.sku"), t("inv.h.units"), t("inv.h.revenue"), t("inv.h.profit"), t("inv.h.marginPct"),
    t("inv.h.velocity"), t("inv.h.stock"), t("inv.h.cover"), t("inv.h.value"), t("inv.h.status")];
  const rows = m.products.map(p => [
    p.sku || "", p.name, String(p.units), p.revenue.toFixed(2), p.profit.toFixed(2),
    p.margin === null ? "" : (p.margin * 100).toFixed(1),
    p.velocity.toFixed(3),
    p.stock === null ? "" : String(p.stock),
    p.cover === null ? "" : (isFinite(p.cover) ? p.cover.toFixed(0) : ""),
    p.stockValue === null ? "" : p.stockValue.toFixed(2),
    t("status." + p.status)
  ]);
  downloadText(t("csv.invName") + "-" + fmtISO(new Date()) + ".csv", toCSV(head, rows, ";"));
}

/* ============================================================
   Demo / sample data
   ============================================================ */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}

const DEMO_PRODUCTS = [
  { sku: "KER-001", name: { de: "Keramiktasse Sand", en: "Ceramic Mug Sand" }, price: 24.9, cost: 7.2, pop: 1.5, stock: 42, lead: 21, moq: 20 },
  { sku: "KER-002", name: { de: "Keramikschale Ocean", en: "Ceramic Bowl Ocean" }, price: 34.0, cost: 11.0, pop: 0.8, stock: 8, lead: 21, moq: 20 },
  { sku: "TEX-014", name: { de: "Leinenkissen 45×45", en: "Linen Cushion 45×45" }, price: 39.0, cost: 14.5, pop: 0.9, stock: 0, lead: 35, moq: 25 },
  { sku: "SCH-100", name: { de: "Silberkette Luna", en: "Silver Necklace Luna" }, price: 59.0, cost: 18.0, pop: 0.6, stock: 26, lead: 14, moq: 10 },
  { sku: "SCH-102", name: { de: "Ohrringe Nova", en: "Earrings Nova" }, price: 29.0, cost: 8.4, pop: 1.1, stock: 61, lead: 14, moq: 10 },
  { sku: "PRT-220", name: { de: "Kunstdruck A3 Fjord", en: "Art Print A3 Fjord" }, price: 22.0, cost: 4.1, pop: 1.8, stock: 120, lead: 10, moq: 50 },
  { sku: "PRT-221", name: { de: "Kunstdruck A2 Düne", en: "Art Print A2 Dune" }, price: 32.0, cost: 6.3, pop: 0.7, stock: 34, lead: 10, moq: 50 },
  { sku: "KRZ-050", name: { de: "Sojakerze Zeder", en: "Soy Candle Cedar" }, price: 18.5, cost: 5.2, pop: 1.6, stock: 15, lead: 18, moq: 30 },
  { sku: "KRZ-051", name: { de: "Kerzen-Set 3er", en: "Candle Set of 3" }, price: 45.0, cost: 13.8, pop: 0.5, stock: 22, lead: 18, moq: 15 },
  { sku: "PAP-300", name: { de: "Notizbuch Recycling", en: "Recycled Notebook" }, price: 16.0, cost: 4.6, pop: 1.0, stock: 88, lead: 12, moq: 40 },
  { sku: "TEX-020", name: { de: "Wolldecke Nordic", en: "Wool Blanket Nordic" }, price: 89.0, cost: 34.0, pop: 0.35, stock: 11, lead: 42, moq: 10 },
  { sku: "SEI-010", name: { de: "Naturseife Lavendel", en: "Natural Soap Lavender" }, price: 9.5, cost: 2.4, pop: 2.1, stock: 4, lead: 15, moq: 60 }
];

const DEMO_CHANNELS = [
  { name: "Etsy", share: 0.58, fee: 0.105 },
  { name: "Shopify", share: 0.27, fee: 0.032 },
  { name: "eBay", share: 0.15, fee: 0.115 }
];

function demoSalesCSV(lang) {
  const de = lang === "de";
  const head = de
    ? ["Datum", "Artikelnummer", "Artikel", "Menge", "Umsatz", "Einkaufspreis", "Gebühren", "Versandkosten", "Kanal", "Bestellnummer"]
    : ["Date", "SKU", "Product", "Quantity", "Revenue", "Unit cost", "Fees", "Shipping", "Channel", "Order ID"];
  const rand = mulberry32(20240815);
  const rows = [];
  const today = startOfDay(new Date());
  let orderNo = 10001;

  for (let back = 179; back >= 0; back--) {
    const day = addDays(today, -back);
    const dow = day.getDay();
    const weekend = dow === 0 || dow === 6 ? 0.75 : 1.05;
    const trend = 0.78 + (179 - back) / 179 * 0.5;             // slow growth
    const season = 1 + 0.28 * Math.sin((179 - back) / 27);
    const orders = Math.max(0, Math.round((2.6 * weekend * trend * season) + (rand() * 2.4 - 1)));

    for (let o = 0; o < orders; o++) {
      const oid = "ORD-" + (orderNo++);
      const rc = rand();
      let acc = 0, chan = DEMO_CHANNELS[0];
      for (const c of DEMO_CHANNELS) { acc += c.share; if (rc <= acc) { chan = c; break; } }
      const lines = rand() < 0.22 ? 2 : 1;
      const shipping = 3.6 + rand() * 2.2;

      for (let l = 0; l < lines; l++) {
        const totalPop = DEMO_PRODUCTS.reduce((a, p) => a + p.pop, 0);
        let pick = rand() * totalPop, prod = DEMO_PRODUCTS[0], acc2 = 0;
        for (const p of DEMO_PRODUCTS) { acc2 += p.pop; if (pick <= acc2) { prod = p; break; } }
        const qty = rand() < 0.16 ? 2 : 1;
        const revenue = prod.price * qty;
        rows.push([
          de ? fmtDateDE(day) : fmtISO(day),
          prod.sku,
          prod.name[lang] || prod.name.en,
          String(qty),
          numOut(revenue, de),
          numOut(prod.cost, de),
          numOut(revenue * chan.fee, de),
          l === 0 ? numOut(shipping, de) : numOut(0, de),
          chan.name,
          oid
        ]);
      }
    }
  }
  return toCSV(head, rows, de ? ";" : ",");
}

function demoInventoryCSV(lang) {
  const de = lang === "de";
  const head = de
    ? ["Artikelnummer", "Artikel", "Bestand", "Einkaufspreis", "Lieferzeit", "Mindestbestellmenge", "Lieferant"]
    : ["SKU", "Product", "Stock", "Unit cost", "Lead time", "MOQ", "Supplier"];
  const rows = DEMO_PRODUCTS.map(p => [
    p.sku, p.name[lang] || p.name.en, String(p.stock), numOut(p.cost, de),
    String(p.lead), String(p.moq),
    p.sku.slice(0, 3) === "KER" ? "Studio Töpferei" : p.sku.slice(0, 3) === "PRT" ? "PrintLab" : "Manufaktur Nord"
  ]);
  return toCSV(head, rows, de ? ";" : ",");
}

function numOut(v, de) {
  const s = v.toFixed(2);
  return de ? s.replace(".", ",") : s;
}

function fmtDateDE(d) {
  const p = n => String(n).padStart(2, "0");
  return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear();
}

function loadDemo() {
  const salesText = demoSalesCSV(LANG);
  const invText = demoInventoryCSV(LANG);
  STATE.salesRaw = parseCSV(salesText);
  STATE.salesMap = detectColumns(STATE.salesRaw.headers, FIELD_ALIASES);
  STATE.invRaw = parseCSV(invText);
  STATE.invMap = detectColumns(STATE.invRaw.headers, INV_ALIASES);
  STATE.fileNames = { sales: "demo-sales.csv", inv: "demo-stock.csv" };
  updateSlots();
  buildAndRender();
}

/* ============================================================
   Settings dialog
   ============================================================ */
function fillSettingsForm() {
  const s = STATE.settings;
  $("#s-currency").value = s.currency;
  $("#s-cash").value = s.startCash;
  $("#s-fixed").value = s.fixedCosts;
  $("#s-horizon").value = String(s.horizon);
  $("#s-lead").value = s.leadTime;
  $("#s-cover").value = s.targetCover;
  $("#s-safety").value = s.safetyDays;
  $("#s-velwin").value = String(s.velWindow);
  $("#s-margin-default").value = s.defaultCost;
  $("#s-fee-default").value = s.defaultFee;
  $("#s-remember").checked = !!s.remember;
}

function readSettingsForm() {
  const num = (id, min, max, fallback) => {
    const v = parseFloat($(id).value);
    if (!isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  const s = STATE.settings;
  s.currency = $("#s-currency").value || "EUR";
  s.startCash = num("#s-cash", 0, 1e9, DEFAULT_SETTINGS.startCash);
  s.fixedCosts = num("#s-fixed", 0, 1e7, DEFAULT_SETTINGS.fixedCosts);
  s.horizon = Math.round(num("#s-horizon", 7, 365, DEFAULT_SETTINGS.horizon));
  s.leadTime = Math.round(num("#s-lead", 0, 365, DEFAULT_SETTINGS.leadTime));
  s.targetCover = Math.round(num("#s-cover", 1, 365, DEFAULT_SETTINGS.targetCover));
  s.safetyDays = Math.round(num("#s-safety", 0, 180, DEFAULT_SETTINGS.safetyDays));
  s.velWindow = Math.round(num("#s-velwin", 7, 365, DEFAULT_SETTINGS.velWindow));
  s.defaultCost = num("#s-margin-default", 0, 95, DEFAULT_SETTINGS.defaultCost);
  s.defaultFee = num("#s-fee-default", 0, 60, DEFAULT_SETTINGS.defaultFee);
  s.remember = $("#s-remember").checked;
  saveSettings();
  if (s.remember) persistData(); else { try { localStorage.removeItem(LS.data); } catch (e) {} }
}

/* ============================================================
   Wiring
   ============================================================ */
function debounce(fn, ms) {
  let h = null;
  return function () {
    const args = arguments;
    clearTimeout(h);
    h = setTimeout(() => fn.apply(null, args), ms);
  };
}

function init() {
  // language: stored → browser → German
  let lang = null;
  try { lang = localStorage.getItem(LS.lang); } catch (e) {}
  if (!lang) lang = (navigator.language || "de").toLowerCase().indexOf("de") === 0 ? "de" : "en";
  LANG = lang === "en" ? "en" : "de";

  let theme = null;
  try { theme = localStorage.getItem(LS.theme); } catch (e) {}
  if (!theme) theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  loadSettings();
  applyI18n();
  setTheme(theme);
  updateSlots();

  $("#lang-de").addEventListener("click", () => setLang("de"));
  $("#lang-en").addEventListener("click", () => setLang("en"));
  $("#btn-theme").addEventListener("click", () =>
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));
  $("#btn-about").addEventListener("click", () => $("#dlg-about").showModal());
  $("#btn-about2").addEventListener("click", () => $("#dlg-about").showModal());
  $("#btn-help").addEventListener("click", () => $("#dlg-help").showModal());

  // file pickers
  $("#btn-pick-sales").addEventListener("click", () => $("#file-sales").click());
  $("#btn-pick-inv").addEventListener("click", () => $("#file-inv").click());
  $("#file-sales").addEventListener("change", e => { if (e.target.files[0]) handleFile(e.target.files[0], "sales"); e.target.value = ""; });
  $("#file-inv").addEventListener("change", e => { if (e.target.files[0]) handleFile(e.target.files[0], "inv"); e.target.value = ""; });
  $$("[data-clear]").forEach(btn => btn.addEventListener("click", () => {
    const k = btn.getAttribute("data-clear");
    if (k === "sales") { STATE.salesRaw = null; STATE.salesMap = null; STATE.fileNames.sales = null; }
    else { STATE.invRaw = null; STATE.invMap = null; STATE.fileNames.inv = null; }
    updateSlots();
  }));

  // drag & drop
  const dz = $("#dropzone");
  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); dz.classList.add("is-over");
  }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); if (ev === "dragleave" && dz.contains(e.relatedTarget)) return;
    dz.classList.remove("is-over");
  }));
  dz.addEventListener("drop", e => {
    const files = Array.prototype.slice.call(e.dataTransfer.files || []);
    if (!files.length) return;
    // first file is the sales export, a second one is treated as stock
    handleFile(files[0], STATE.salesRaw ? "inv" : "sales").then(() => {
      if (files[1]) handleFile(files[1], "inv");
    });
  });

  $("#btn-demo").addEventListener("click", loadDemo);
  $("#btn-sample-sales").addEventListener("click", () =>
    downloadText("flowstock-sample-sales-" + LANG + ".csv", demoSalesCSV(LANG)));
  $("#btn-sample-inv").addEventListener("click", () =>
    downloadText("flowstock-sample-stock-" + LANG + ".csv", demoInventoryCSV(LANG)));

  // mapping dialog
  $("#dlg-map").addEventListener("close", () => {
    if ($("#dlg-map").returnValue !== "apply") return;
    const maps = readMapping();
    if (!maps.sales.date || (!maps.sales.revenue && !maps.sales.price)) {
      showLandingError(t("err.mapRequired"));
      return;
    }
    STATE.salesMap = maps.sales;
    STATE.invMap = STATE.invRaw && maps.inv.sku && maps.inv.stock ? maps.inv : null;
    buildAndRender();
  });

  // settings dialog
  $("#btn-settings").addEventListener("click", () => { fillSettingsForm(); $("#dlg-settings").showModal(); });
  $("#dlg-settings").addEventListener("close", () => {
    if ($("#dlg-settings").returnValue !== "save") return;
    readSettingsForm();
    render();
  });
  $("#btn-clear-storage").addEventListener("click", () => {
    clearStoredData();
    $("#s-remember").checked = false;
    $("#btn-clear-storage").textContent = t("set.cleared");
    setTimeout(() => { $("#btn-clear-storage").textContent = t("set.clearStorage"); }, 2200);
  });

  $("#btn-reset").addEventListener("click", () => {
    STATE.salesRaw = STATE.salesMap = STATE.invRaw = STATE.invMap = null;
    STATE.sales = STATE.inventory = STATE.model = null;
    STATE.fileNames = { sales: null, inv: null };
    try { localStorage.removeItem(LS.data); } catch (e) {}
    updateSlots();
    showLandingError("");
    $("#view-dash").hidden = true;
    $("#view-landing").hidden = false;
    $("#btn-settings").hidden = true;
    $("#btn-reset").hidden = true;
    window.scrollTo(0, 0);
  });

  // filters
  $("#f-range").addEventListener("change", e => { STATE.filters.range = e.target.value; render(); });
  $("#f-channel").addEventListener("change", e => { STATE.filters.channel = e.target.value; render(); });
  $("#f-search").addEventListener("input", debounce(e => { STATE.filters.search = e.target.value; render(); }, 220));

  $("#btn-export").addEventListener("click", exportSummary);
  $("#btn-export-plan").addEventListener("click", exportPlan);
  $("#btn-export-inv").addEventListener("click", exportInventory);
  $("#btn-print").addEventListener("click", () => window.print());

  // chart / table toggles
  $$("[data-view-for]").forEach(group => {
    const name = group.getAttribute("data-view-for");
    group.addEventListener("click", e => {
      const btn = e.target.closest("button[data-view]");
      if (!btn) return;
      const view = btn.getAttribute("data-view");
      STATE.views[name] = view;
      group.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", String(b === btn)));
      $("#" + name + "-chart").hidden = view !== "chart";
      $("#" + name + "-table").hidden = view !== "table";
      const legend = $("#" + name + "-legend");
      if (legend) legend.hidden = view !== "chart";
      if (view === "chart") renderCharts();
    });
  });

  window.addEventListener("resize", debounce(() => { if (STATE.model) renderCharts(); }, 180));

  restoreData();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
