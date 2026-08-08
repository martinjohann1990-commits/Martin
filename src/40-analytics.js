/* ============================================================
   Analytics — turns mapped CSV rows into the dashboard model.
   Pure functions over plain objects; no DOM access in here.
   ============================================================ */

const DAY_MS = 86400000;

/* ---------- formatting ---------- */
function fmtCurrency(v, opts) {
  if (v === null || v === undefined || !isFinite(v)) return t("ui.none");
  const o = opts || {};
  const abs = Math.abs(v);
  // `force` lets an axis compact every tick once its maximum warrants it,
  // so a scale never mixes "5,000" with "15K"
  const compact = o.compact && (o.force || abs >= 10000);
  // German compact notation does not abbreviate below a million, so a
  // fraction digit would leak into axis ticks — only allow one past 1M.
  const compactDigits = abs >= 1e6 ? 1 : 0;
  try {
    return new Intl.NumberFormat(localeTag(), {
      style: "currency",
      currency: STATE.settings.currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? compactDigits : (o.decimals !== undefined ? o.decimals : (abs >= 1000 ? 0 : 2)),
      minimumFractionDigits: compact ? 0 : (o.decimals !== undefined ? o.decimals : (abs >= 1000 ? 0 : 2))
    }).format(v);
  } catch (e) {
    return v.toFixed(2) + " " + STATE.settings.currency;
  }
}

function fmtNum(v, decimals) {
  if (v === null || v === undefined || !isFinite(v)) return t("ui.none");
  return new Intl.NumberFormat(localeTag(), {
    maximumFractionDigits: decimals === undefined ? 0 : decimals,
    minimumFractionDigits: decimals === undefined ? 0 : decimals
  }).format(v);
}

function fmtPct(v, decimals) {
  if (v === null || v === undefined || !isFinite(v)) return t("ui.none");
  return new Intl.NumberFormat(localeTag(), {
    style: "percent",
    maximumFractionDigits: decimals === undefined ? 1 : decimals,
    minimumFractionDigits: decimals === undefined ? 1 : decimals
  }).format(v);
}

function fmtSigned(v) {
  if (v === null || v === undefined || !isFinite(v)) return t("ui.none");
  const s = new Intl.NumberFormat(localeTag(), { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });
  try { return s.format(v); } catch (e) { return (v >= 0 ? "+" : "") + Math.round(v * 100) + "%"; }
}

function fmtDate(d, style) {
  if (!d) return t("ui.none");
  const opts = style === "long"
    ? { year: "numeric", month: "short", day: "numeric" }
    : { month: "2-digit", day: "2-digit" };
  return new Intl.DateTimeFormat(localeTag(), opts).format(d);
}

function fmtISO(d) {
  if (!d) return "";
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function diffDays(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS); }

/* ---------- row normalisation ---------- */
function buildSalesRows(raw, map, settings) {
  const get = (row, field) => (map[field] ? row[map[field]] : undefined);
  const dateValues = raw.rows.map(r => get(r, "date"));
  const parseDateCol = makeDateParser(dateValues);

  const rows = [];
  let skipped = 0;
  let sawCost = false, sawFees = false, sawQty = false, sawOrder = false;

  for (const r of raw.rows) {
    const date = parseDateCol(get(r, "date"));
    if (!date) { skipped++; continue; }

    let qty = parseNumber(get(r, "qty"));
    if (qty === null) qty = 1; else sawQty = true;
    if (qty === 0) qty = 1;
    qty = Math.abs(qty);

    let revenue = parseNumber(get(r, "revenue"));
    const price = parseNumber(get(r, "price"));
    if (revenue === null && price !== null) revenue = price * qty;
    if (revenue === null) revenue = 0;

    const discount = parseNumber(get(r, "discount")) || 0;
    const shipRev = parseNumber(get(r, "shipRev")) || 0;
    revenue = revenue - Math.abs(discount) + shipRev;

    const unitCost = parseNumber(get(r, "cost"));
    if (unitCost !== null) sawCost = true;

    let fees = parseNumber(get(r, "fees"));
    if (fees !== null) { sawFees = true; fees = Math.abs(fees); }

    const shipping = Math.abs(parseNumber(get(r, "shipping")) || 0);

    const skuRaw = get(r, "sku");
    const nameRaw = get(r, "product");
    const sku = skuRaw !== undefined && String(skuRaw).trim() !== "" ? String(skuRaw).trim() : null;
    const name = nameRaw !== undefined && String(nameRaw).trim() !== "" ? String(nameRaw).trim() : null;
    const key = sku || name || "—";

    const channelRaw = get(r, "channel");
    const channel = channelRaw !== undefined && String(channelRaw).trim() !== "" ? String(channelRaw).trim() : null;

    const orderRaw = get(r, "order");
    const order = orderRaw !== undefined && String(orderRaw).trim() !== "" ? String(orderRaw).trim() : null;
    if (order) sawOrder = true;

    rows.push({
      date: startOfDay(date),
      ts: startOfDay(date).getTime(),
      key, sku, name: name || sku || "—",
      qty, revenue,
      unitCost,
      fees, shipping,
      channel, order
    });
  }

  rows.sort((a, b) => a.ts - b.ts);
  return { rows, skipped, sawCost, sawFees, sawQty, sawOrder };
}

function buildInventory(raw, map) {
  if (!raw || !map || !map.sku) return null;
  const byKey = {};
  for (const r of raw.rows) {
    const sku = String(r[map.sku] || "").trim();
    if (!sku) continue;
    const stock = parseNumber(map.stock ? r[map.stock] : null);
    byKey[sku] = {
      sku,
      name: map.product ? String(r[map.product] || "").trim() || null : null,
      stock: stock === null ? null : Math.max(0, stock),
      cost: parseNumber(map.cost ? r[map.cost] : null),
      lead: parseNumber(map.lead ? r[map.lead] : null),
      moq: parseNumber(map.moq ? r[map.moq] : null),
      supplier: map.supplier ? String(r[map.supplier] || "").trim() || null : null
    };
  }
  return Object.keys(byKey).length ? byKey : null;
}

/* ---------- effective per-row economics ---------- */
function rowEconomics(row, inv, settings) {
  const feeRate = settings.defaultFee / 100;
  const costRate = settings.defaultCost / 100;

  let unitCost = row.unitCost;
  if (unitCost === null && inv) {
    const m = (row.sku && inv[row.sku]) || (row.name && inv[row.name]);
    if (m && m.cost !== null && m.cost !== undefined) unitCost = m.cost;
  }
  let cogs, costEstimated = false;
  if (unitCost !== null && unitCost !== undefined) cogs = unitCost * row.qty;
  else { cogs = row.revenue * costRate; costEstimated = true; }

  let fees = row.fees, feesEstimated = false;
  if (fees === null || fees === undefined) { fees = row.revenue * feeRate; feesEstimated = true; }

  const shipping = row.shipping || 0;
  const profit = row.revenue - fees - shipping - cogs;
  return { cogs, fees, shipping, profit, unitCost: unitCost === null ? undefined : unitCost, costEstimated, feesEstimated };
}

/* ---------- bucketing ---------- */
function bucketKey(date, mode) {
  if (mode === "day") return fmtISO(date);
  if (mode === "week") {
    const d = startOfDay(date);
    const dow = (d.getDay() + 6) % 7;              // Monday = 0
    return fmtISO(addDays(d, -dow));
  }
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-01";
}

function pickBucketMode(spanDays) {
  if (spanDays <= 45) return "day";
  if (spanDays <= 400) return "week";
  return "month";
}

/* ---------- main ---------- */
function analyze(state) {
  const s = state.settings;
  const all = state.sales.rows;
  const inv = state.inventory;

  if (!all.length) return null;

  const dataMin = all[0].date;
  const dataMax = all[all.length - 1].date;
  const asOf = dataMax;

  /* --- period filter --- */
  let from = dataMin;
  if (state.filters.range !== "all") {
    const n = parseInt(state.filters.range, 10);
    from = addDays(asOf, -(n - 1));
    if (from < dataMin) from = dataMin;
  }
  const spanDays = Math.max(1, diffDays(from, asOf) + 1);
  const prevFrom = addDays(from, -spanDays);
  const prevTo = addDays(from, -1);

  const q = (state.filters.search || "").trim().toLowerCase();
  const chan = state.filters.channel || "__all";
  const matches = r =>
    (chan === "__all" || (r.channel || t("ui.other")) === chan) &&
    (!q || (r.key + " " + r.name).toLowerCase().indexOf(q) !== -1);

  const current = [], previous = [];
  for (const r of all) {
    if (!matches(r)) continue;
    if (r.date >= from && r.date <= asOf) current.push(r);
    else if (r.date >= prevFrom && r.date <= prevTo) previous.push(r);
  }

  /* --- totals --- */
  function totals(rows) {
    const acc = { revenue: 0, fees: 0, shipping: 0, cogs: 0, profit: 0, units: 0, rows: 0, orders: new Set() };
    for (const r of rows) {
      const e = rowEconomics(r, inv, s);
      acc.revenue += r.revenue;
      acc.fees += e.fees;
      acc.shipping += e.shipping;
      acc.cogs += e.cogs;
      acc.profit += e.profit;
      acc.units += r.qty;
      acc.rows += 1;
      if (r.order) acc.orders.add(r.order);
    }
    acc.orderCount = acc.orders.size || acc.rows;
    acc.margin = acc.revenue > 0 ? acc.profit / acc.revenue : null;
    acc.aov = acc.orderCount > 0 ? acc.revenue / acc.orderCount : null;
    delete acc.orders;
    return acc;
  }
  const cur = totals(current);
  const prev = previous.length ? totals(previous) : null;

  /* --- time buckets --- */
  const bucketMode = pickBucketMode(spanDays);
  const bucketMap = new Map();
  for (const r of current) {
    const k = bucketKey(r.date, bucketMode);
    let b = bucketMap.get(k);
    if (!b) {
      b = { key: k, date: new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)), inflow: 0, outflow: 0, revenue: 0, units: 0 };
      bucketMap.set(k, b);
    }
    const e = rowEconomics(r, inv, s);
    b.revenue += r.revenue;
    b.inflow += r.revenue - e.fees - e.shipping;    // net payout
    b.outflow += e.cogs;
    b.units += r.qty;
  }
  const buckets = Array.from(bucketMap.values()).sort((a, b) => a.date - b.date);
  // spread fixed costs across the buckets they actually cover
  const fixedPerDay = (s.fixedCosts || 0) / 30.44;
  const bucketDays = bucketMode === "day" ? 1 : bucketMode === "week" ? 7 : 30.44;
  for (const b of buckets) b.outflow += fixedPerDay * bucketDays;
  for (const b of buckets) b.net = b.inflow - b.outflow;

  /* --- per product --- */
  const skuMap = new Map();
  for (const r of current) {
    let p = skuMap.get(r.key);
    if (!p) {
      p = { key: r.key, sku: r.sku, name: r.name, units: 0, revenue: 0, profit: 0, cogs: 0, fees: 0, costEstimated: false, unitCosts: [] };
      skuMap.set(r.key, p);
    }
    const e = rowEconomics(r, inv, s);
    p.units += r.qty;
    p.revenue += r.revenue;
    p.profit += e.profit;
    p.cogs += e.cogs;
    p.fees += e.fees;
    if (e.costEstimated) p.costEstimated = true;
    if (e.unitCost !== undefined) p.unitCosts.push(e.unitCost);
  }

  /* --- velocity window (always anchored at asOf, independent of the period filter) --- */
  const velWindow = Math.max(1, s.velWindow);
  const velFrom = addDays(asOf, -(velWindow - 1));
  const velUnits = new Map();
  for (const r of all) {
    if (r.date < velFrom || r.date > asOf) continue;
    if (!matches(r)) continue;
    velUnits.set(r.key, (velUnits.get(r.key) || 0) + r.qty);
  }
  const velDays = Math.max(1, Math.min(velWindow, diffDays(dataMin, asOf) + 1));

  const hasStock = !!inv;
  const products = [];
  for (const p of skuMap.values()) {
    const m = inv ? (inv[p.key] || (p.sku && inv[p.sku]) || null) : null;
    const velocity = (velUnits.get(p.key) || 0) / velDays;
    const unitCost = p.unitCosts.length
      ? p.unitCosts.reduce((a, b) => a + b, 0) / p.unitCosts.length
      : (m && m.cost !== null && m.cost !== undefined ? m.cost : (p.units > 0 ? (p.cogs / p.units) : 0));
    const stock = m && m.stock !== null && m.stock !== undefined ? m.stock : null;
    const lead = m && m.lead !== null && m.lead !== undefined && m.lead > 0 ? m.lead : s.leadTime;
    const moq = m && m.moq !== null && m.moq !== undefined && m.moq > 0 ? m.moq : 1;

    const item = {
      key: p.key, sku: p.sku, name: p.name || p.key,
      units: p.units, revenue: p.revenue, profit: p.profit,
      margin: p.revenue > 0 ? p.profit / p.revenue : null,
      avgPrice: p.units > 0 ? p.revenue / p.units : 0,
      costEstimated: p.costEstimated,
      velocity, unitCost, stock, lead, moq,
      supplier: m ? m.supplier : null,
      stockValue: stock !== null ? stock * unitCost : null,
      cover: null, stockoutDate: null, orderByDate: null, orderQty: 0, orderCost: 0,
      status: "unknown"
    };

    if (stock === null) {
      item.status = velocity > 0 ? "unknown" : "idle";
    } else if (velocity <= 0) {
      item.status = "idle";
      item.cover = Infinity;
    } else {
      const cover = stock / velocity;
      item.cover = cover;
      item.stockoutDate = addDays(asOf, Math.floor(cover));
      const reorderPoint = velocity * (lead + s.safetyDays);
      const orderInDays = Math.max(0, Math.floor(cover - lead - s.safetyDays));
      item.orderByDate = addDays(asOf, orderInDays);

      const target = velocity * (lead + s.targetCover + s.safetyDays);
      let qty = Math.ceil(Math.max(0, target - stock));
      if (qty > 0 && moq > 1) qty = Math.ceil(qty / moq) * moq;
      if (qty > 0 && qty < moq) qty = moq;
      item.orderQty = qty;
      item.orderCost = qty * unitCost;

      if (stock <= 0) item.status = "critical";
      else if (stock <= reorderPoint) item.status = "serious";
      else if (cover <= lead + s.safetyDays + Math.max(7, s.targetCover * 0.3)) item.status = "warning";
      else item.status = "good";
    }
    products.push(item);
  }
  products.sort((a, b) => b.profit - a.profit);

  const stockValue = products.reduce((a, p) => a + (p.stockValue || 0), 0);
  const stockUnits = products.reduce((a, p) => a + (p.stock || 0), 0);
  const atRisk = products.filter(p => p.status === "critical" || p.status === "serious").length;

  /* --- restock plan --- */
  const severity = { critical: 0, serious: 1, warning: 2, good: 3, idle: 4, unknown: 5 };
  const plan = products
    .filter(p => p.orderQty > 0 && (p.status === "critical" || p.status === "serious" || p.status === "warning"))
    .sort((a, b) => {
      const d = severity[a.status] - severity[b.status];
      if (d !== 0) return d;
      return (a.orderByDate || 0) - (b.orderByDate || 0);
    });
  const planCost = plan.reduce((a, p) => a + p.orderCost, 0);

  /* --- channels --- */
  const chanMap = new Map();
  for (const r of current) {
    const k = r.channel || t("ui.other");
    const e = rowEconomics(r, inv, s);
    let c = chanMap.get(k);
    if (!c) { c = { key: k, revenue: 0, profit: 0, units: 0 }; chanMap.set(k, c); }
    c.revenue += r.revenue;
    c.profit += e.profit;
    c.units += r.qty;
  }
  const channels = Array.from(chanMap.values()).sort((a, b) => b.revenue - a.revenue);

  /* --- cash forecast --- */
  const forecast = buildForecast({
    products, asOf, settings: s, totals: cur, spanDays, hasStock
  });

  /* --- historical balance, back-cast so that "today" equals the stated opening balance --- */
  const histDays = Math.min(spanDays, 120);
  const histFrom = addDays(asOf, -(histDays - 1));
  const dailyNet = new Map();
  for (const r of current) {
    if (r.date < histFrom) continue;
    const e = rowEconomics(r, inv, s);
    const k = fmtISO(r.date);
    dailyNet.set(k, (dailyNet.get(k) || 0) + (r.revenue - e.fees - e.shipping - e.cogs));
  }
  const history = [];
  let bal = s.startCash;
  for (let i = 0; i < histDays; i++) {
    const d = addDays(asOf, -i);
    history.push({ date: d, balance: bal, actual: true });
    bal -= (dailyNet.get(fmtISO(d)) || 0) - fixedPerDay;
  }
  history.reverse();

  return {
    asOf, dataMin, dataMax, from, spanDays, bucketMode,
    totals: cur, prev,
    buckets, products, plan, planCost, channels,
    stockValue, stockUnits, atRisk,
    hasStock,
    history, forecast,
    flags: {
      costEstimated: products.filter(p => p.costEstimated).length,
      feesEstimated: !state.sales.sawFees,
      skipped: state.sales.skipped
    }
  };
}

/* ---------- forward projection ---------- */
function buildForecast(o) {
  const { products, asOf, settings, totals, spanDays, hasStock } = o;
  const horizon = settings.horizon;
  const fixedPerDay = (settings.fixedCosts || 0) / 30.44;
  const payoutRatio = totals.revenue > 0
    ? Math.max(0, (totals.revenue - totals.fees - totals.shipping) / totals.revenue)
    : 0.8;

  // per-product simulation state
  const sim = products
    .filter(p => p.velocity > 0)
    .map(p => ({
      key: p.key, name: p.name,
      velocity: p.velocity,
      price: p.avgPrice,
      stock: hasStock && p.stock !== null ? p.stock : Infinity,
      unitCost: p.unitCost,
      lead: Math.max(0, Math.round(p.lead)),
      moq: p.moq || 1,
      reorderPoint: p.velocity * (p.lead + settings.safetyDays),
      target: p.velocity * (p.lead + settings.targetCover + settings.safetyDays),
      inFlight: []                       // [{arriveDay, qty}]
    }));

  // fallback when nothing has a price/velocity: flat run-rate from history
  const dailyRunRate = spanDays > 0 ? totals.revenue / spanDays : 0;
  const simRevenue = sim.reduce((a, p) => a + p.velocity * p.price, 0);
  const useSim = simRevenue > 0;

  const days = [];
  let balance = settings.startCash;
  let lowest = { balance: balance, date: asOf };
  let zeroDate = null;
  const orders = [];

  for (let i = 1; i <= horizon; i++) {
    const date = addDays(asOf, i);
    let gross = 0, outflow = fixedPerDay, restock = 0;

    for (const p of sim) {
      // goods arriving today
      for (let k = p.inFlight.length - 1; k >= 0; k--) {
        if (p.inFlight[k].arriveDay === i) { p.stock += p.inFlight[k].qty; p.inFlight.splice(k, 1); }
      }
      // rolling replenishment: order again whenever the position falls to the
      // reorder point, so a long horizon shows repeat purchases, not just one
      if (p.stock !== Infinity) {
        const onOrder = p.inFlight.reduce((a, o) => a + o.qty, 0);
        if (p.stock + onOrder <= p.reorderPoint) {
          let qty = Math.ceil(Math.max(0, p.target - p.stock - onOrder));
          if (qty > 0 && p.moq > 1) qty = Math.ceil(qty / p.moq) * p.moq;
          if (qty > 0 && qty < p.moq) qty = p.moq;
          if (qty > 0) {
            const cost = qty * p.unitCost;
            restock += cost;
            p.inFlight.push({ arriveDay: i + p.lead, qty });
            orders.push({ day: i, date, key: p.key, name: p.name, qty, cost });
          }
        }
      }
      const sellable = Math.min(p.velocity, p.stock === Infinity ? p.velocity : Math.max(0, p.stock));
      gross += sellable * p.price;
      if (p.stock !== Infinity) p.stock = Math.max(0, p.stock - p.velocity);
    }

    if (!useSim) gross = dailyRunRate;
    const inflow = gross * payoutRatio;
    outflow += restock;
    balance += inflow - outflow;

    days.push({ date, balance, inflow, outflow, restock, gross, actual: false });
    if (balance < lowest.balance) lowest = { balance, date };
    if (balance < 0 && !zeroDate) zeroDate = date;
  }

  return {
    days, orders, lowest, zeroDate,
    end: days.length ? days[days.length - 1].balance : settings.startCash,
    horizon,
    runwayDays: zeroDate ? diffDays(asOf, zeroDate) : null,
    payoutRatio
  };
}
