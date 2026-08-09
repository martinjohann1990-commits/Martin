/* =========================================================================
   sim.js – Simulations- und Bewertungslogik
   ---------------------------------------------------------------------------
   Bewertung je Standort aus drei Teil-Scores (jeweils 0–100), die der Nutzer
   gewichtet:
     1. Kapazität & Balance   – Auslastung nach Zuordnung gegen die Zielgrenze
     2. Transport / Distanz   – Kosten je Palette relativ zum günstigsten DC
     3. Zielreichweite        – Bestandsfähigkeit + Transitzeit
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state;
  var DAYS_PER_MONTH = 30.44;
  var FALLBACK_DISTANCE = 500;   // km, falls Koordinaten fehlen

  /* ==================================================================== *
   *  Bedarf
   * ==================================================================== */

  /**
   * Aggregiert den Bedarf einer Kategorie über die gewählte Datenbasis.
   * @param {{category:string, dataset:string, periodFrom?:string, periodTo?:string}} p
   */
  function demandFor(p) {
    var st = S.get(), s = st.settings;
    var periods = S.periods(p.dataset);
    var fromIdx = p.periodFrom ? periods.indexOf(p.periodFrom) : 0;
    var toIdx = p.periodTo ? periods.indexOf(p.periodTo) : periods.length - 1;
    if (fromIdx < 0) fromIdx = 0;
    if (toIdx < 0) toIdx = periods.length - 1;
    if (toIdx < fromIdx) { var t = fromIdx; fromIdx = toIdx; toIdx = t; }
    var allowed = Object.create(null);
    periods.slice(fromIdx, toIdx + 1).forEach(function (k) { allowed[k] = 1; });

    var recs = S.recordsOf(p.dataset).filter(function (r) {
      return r.category === p.category && allowed[r.period];
    });

    var byRegion = Object.create(null);
    recs.forEach(function (r) {
      var e = byRegion[r.regionKey] || (byRegion[r.regionKey] = {
        key: r.regionKey, country: r.country, pallets: 0, qty: 0, revenue: 0, volume: 0, records: 0
      });
      e.pallets += S.recordPallets(r, s);
      e.qty += r.qty; e.revenue += r.revenue; e.volume += r.volume; e.records++;
    });

    var regions = Object.keys(byRegion).map(function (k) {
      var e = byRegion[k];
      var info = st.regions[k] || {};
      e.lat = U.isNum(info.lat) ? info.lat : null;
      e.lng = U.isNum(info.lng) ? info.lng : null;
      return e;
    }).sort(function (a, b) { return b.pallets - a.pallets; });

    var days = S.horizonDays(recs);
    var totalPallets = U.sum(regions, function (r) { return r.pallets; });
    var targetDays = S.targetDays(p.category);

    return {
      category: p.category,
      dataset: p.dataset,
      periodFrom: periods[fromIdx] || null,
      periodTo: periods[toIdx] || null,
      periodCount: toIdx - fromIdx + 1,
      regions: regions,
      records: recs.length,
      totalPallets: totalPallets,
      totalQty: U.sum(regions, function (r) { return r.qty; }),
      totalRevenue: U.sum(regions, function (r) { return r.revenue; }),
      totalVolume: U.sum(regions, function (r) { return r.volume; }),
      days: days,
      perDay: days > 0 ? totalPallets / days : 0,
      targetDays: targetDays,
      targetStock: (days > 0 ? totalPallets / days : 0) * targetDays * s.stockFactor,
      regionsWithoutCoords: regions.filter(function (r) { return !U.isNum(r.lat); }).length
    };
  }

  /* ==================================================================== *
   *  Kosten- und Distanzbausteine
   * ==================================================================== */

  function distance(dc, region) {
    if (!U.isNum(dc.lat) || !U.isNum(dc.lng) || !U.isNum(region.lat) || !U.isNum(region.lng)) return NaN;
    return U.roadDistance(dc.lat, dc.lng, region.lat, region.lng);
  }

  /** Transportkosten je Palette von einem DC in eine Region. */
  function costPerPallet(dc, region, dist, s, fallbackDist) {
    var oc = dc.regionCosts || {};
    if (isFinite(oc[region.key])) return oc[region.key];
    if (region.country && isFinite(oc[region.country])) return oc[region.country];

    var base = dc.transportBasePerPallet === null ? s.costBasePerPallet : dc.transportBasePerPallet;
    var perKm = dc.transportCostPerKm === null ? s.costPerPalletKm : dc.transportCostPerKm;
    var d = isFinite(dist) ? dist : (fallbackDist || FALLBACK_DISTANCE);
    return base + perKm * d;
  }

  function storageRate(dc, s) {
    return dc.storageCostPerSlotMonth === null ? s.storageCostPerSlotMonth : dc.storageCostPerSlotMonth;
  }

  function handlingRate(dc, s) {
    return dc.handlingCostPerPallet === null ? s.handlingCostPerPallet : dc.handlingCostPerPallet;
  }

  /** Mittlere bekannte Distanz im Netz – Ersatzwert für fehlende Koordinaten. */
  function fallbackDistance(dcs, regions) {
    var list = [];
    dcs.forEach(function (dc) {
      regions.forEach(function (r) {
        var d = distance(dc, r);
        if (isFinite(d)) list.push(d);
      });
    });
    if (!list.length) return FALLBACK_DISTANCE;
    return U.sum(list) / list.length;
  }

  /* ==================================================================== *
   *  Teil-Scores
   * ==================================================================== */

  /**
   * Kapazitäts-Score: 100 bei leerem Lager, 50 an der Ziel-Auslastungsgrenze,
   * 0 ab Vollauslastung. Bewertet Auslastungsbalance und Reserve zugleich.
   */
  function capacityScore(utilAfter, maxUtil) {
    if (!isFinite(utilAfter)) return 0;
    if (utilAfter <= 0) return 100;
    if (utilAfter <= maxUtil) return 100 - 50 * (utilAfter / maxUtil);
    if (utilAfter <= 1) return 50 * (1 - (utilAfter - maxUtil) / Math.max(1 - maxUtil, 1e-6));
    return 0;
  }

  /** Transport-Score: günstigstes DC = 100, doppelte Kosten = 50 (Verhältnisskala). */
  function transportScore(cpp, minCpp) {
    if (!isFinite(cpp) || cpp <= 0) return 0;
    if (!isFinite(minCpp) || minCpp <= 0) return 100;
    return U.clamp(100 * (minCpp / cpp), 0, 100);
  }

  /**
   * Service-Score: 70 % Bestandsfähigkeit (passt der Ziel-Bestand ins DC?),
   * 30 % Reaktionsfähigkeit (Transitzeit im Verhältnis zur Zielreichweite).
   */
  function serviceScore(coverage, transitDays, targetDays) {
    var cov = U.clamp(coverage, 0, 1);
    var resp = targetDays > 0 ? U.clamp(1 - transitDays / targetDays, 0, 1) : 0;
    return 100 * (0.7 * cov + 0.3 * resp);
  }

  function normalizedWeights(w) {
    var c = Math.max(0, U.num(w.capacity, 0)),
      t = Math.max(0, U.num(w.transport, 0)),
      s = Math.max(0, U.num(w.service, 0));
    var total = c + t + s;
    if (total <= 0) return { capacity: 1 / 3, transport: 1 / 3, service: 1 / 3 };
    return { capacity: c / total, transport: t / total, service: s / total };
  }

  /* ==================================================================== *
   *  Bewertung eines Standorts
   * ==================================================================== */

  /**
   * Bewertet ein DC für eine Zuteilung (regionKey → Paletten).
   * @param {object} dc
   * @param {object} alloc  { regionKey: pallets }
   * @param {object} ctx    Kontext aus buildContext()
   */
  function evaluateDC(dc, alloc, ctx) {
    var s = ctx.settings;
    var pallets = 0, transportCost = 0, distSum = 0, transitSum = 0;
    var regionDetails = [];

    ctx.demand.regions.forEach(function (r) {
      var p = alloc[r.key] || 0;
      if (p <= 0) return;
      var d = ctx.dist[dc.id][r.key];
      var dEff = isFinite(d) ? d : ctx.fallbackDist;
      var cpp = costPerPallet(dc, r, d, s, ctx.fallbackDist);
      var transit = s.handlingDays + (s.kmPerDay > 0 ? dEff / s.kmPerDay : 0);

      pallets += p;
      transportCost += p * cpp;
      distSum += p * dEff;
      transitSum += p * transit;
      regionDetails.push({
        key: r.key, pallets: p, distance: dEff, distanceKnown: isFinite(d),
        costPerPallet: cpp, cost: p * cpp, transitDays: transit
      });
    });

    var avgDistance = pallets > 0 ? distSum / pallets : NaN;
    var avgTransit = pallets > 0 ? transitSum / pallets : NaN;
    var cpp = pallets > 0 ? transportCost / pallets : NaN;

    var perDay = ctx.demand.days > 0 ? pallets / ctx.demand.days : 0;
    var required = perDay * ctx.targetDays * s.stockFactor;

    var used = S.usedSlots(dc.id, ctx.category);
    var capacity = U.num(dc.capacity, 0);
    var free = Math.max(capacity - used, 0);
    var utilBefore = capacity > 0 ? used / capacity : Infinity;
    var utilAfter = capacity > 0 ? (used + required) / capacity : Infinity;
    var coverage = required > 0 ? U.clamp(free / required, 0, 1) : 1;
    var achievableDays = perDay > 0 ? Math.min(ctx.targetDays, free / (perDay * s.stockFactor)) : ctx.targetDays;

    var months = ctx.demand.days / DAYS_PER_MONTH;
    var plannedStock = Math.min(required, Math.max(free, 0)) || required;
    var storageCost = required * storageRate(dc, s) * months;
    var handlingCost = pallets * handlingRate(dc, s);

    return {
      dcId: dc.id,
      dcName: dc.name,
      dcCode: dc.code,
      pallets: pallets,
      share: ctx.demand.totalPallets > 0 ? pallets / ctx.demand.totalPallets : 0,
      avgDistance: avgDistance,
      avgTransitDays: avgTransit,
      costPerPallet: cpp,
      transportCost: transportCost,
      storageCost: storageCost,
      handlingCost: handlingCost,
      totalCost: transportCost + storageCost + handlingCost,
      fixedCost: U.num(dc.fixedCostPerPeriod, 0) * (ctx.demand.periodCount || 1),
      requiredSlots: required,
      plannedStock: plannedStock,
      usedSlots: used,
      freeSlots: free,
      capacity: capacity,
      utilBefore: utilBefore,
      utilAfter: utilAfter,
      coverage: coverage,
      achievableDays: achievableDays,
      feasible: required <= free + 1e-6,
      regions: regionDetails,
      scores: { capacity: 0, transport: 0, service: 0, total: 0 }
    };
  }

  /** Ergänzt die Teil-Scores (Transport benötigt den Vergleich aller Kandidaten). */
  function scoreAll(details, ctx) {
    var minCpp = Infinity;
    details.forEach(function (d) {
      if (isFinite(d.costPerPallet) && d.costPerPallet > 0) minCpp = Math.min(minCpp, d.costPerPallet);
    });

    details.forEach(function (d) {
      var cap = capacityScore(d.utilAfter, ctx.settings.maxUtilization);
      var tra = transportScore(d.costPerPallet, minCpp);
      var srv = serviceScore(d.coverage, d.avgTransitDays, ctx.targetDays);
      d.scores = {
        capacity: cap,
        transport: tra,
        service: srv,
        total: ctx.weights.capacity * cap + ctx.weights.transport * tra + ctx.weights.service * srv,
        contributions: {
          capacity: ctx.weights.capacity * cap,
          transport: ctx.weights.transport * tra,
          service: ctx.weights.service * srv
        }
      };
    });
    return details;
  }

  /* ==================================================================== *
   *  Kontext
   * ==================================================================== */

  function buildContext(params) {
    var st = S.get(), s = st.settings;
    var demand = demandFor(params);
    var dcs = S.activeDCs();
    var fb = fallbackDistance(dcs, demand.regions);

    var dist = Object.create(null);
    dcs.forEach(function (dc) {
      dist[dc.id] = Object.create(null);
      demand.regions.forEach(function (r) { dist[dc.id][r.key] = distance(dc, r); });
    });

    return {
      settings: s,
      category: params.category,
      targetDays: isFinite(params.targetDays) && params.targetDays > 0 ? params.targetDays : demand.targetDays,
      weights: normalizedWeights(params.weights || s.weights),
      demand: demand,
      dcs: dcs,
      dist: dist,
      fallbackDist: fb
    };
  }

  function fullAllocation(demand) {
    var alloc = Object.create(null);
    demand.regions.forEach(function (r) { alloc[r.key] = r.pallets; });
    return alloc;
  }

  /* ==================================================================== *
   *  Alleinzuordnung
   * ==================================================================== */

  function runSingle(params) {
    var ctx = buildContext(params);
    if (!ctx.dcs.length) return { error: 'Es ist kein aktives Distributionszentrum vorhanden.' };
    if (ctx.demand.totalPallets <= 0) return { error: 'Für diese Kategorie liegen im gewählten Zeitraum keine Mengen vor.' };

    var alloc = fullAllocation(ctx.demand);
    var details = ctx.dcs.map(function (dc) { return evaluateDC(dc, alloc, ctx); });
    scoreAll(details, ctx);
    details.sort(function (a, b) { return b.scores.total - a.scores.total; });

    var best = details[0];
    return {
      mode: 'single',
      category: ctx.category,
      targetDays: ctx.targetDays,
      weights: ctx.weights,
      demand: ctx.demand,
      candidates: details,
      best: best,
      parts: [Object.assign({}, best, { share: 1 })],
      regionAssign: ctx.demand.regions.map(function (r) {
        var rd = best.regions.find(function (x) { return x.key === r.key; }) || {};
        return {
          regionKey: r.key, pallets: r.pallets, dcId: best.dcId, dcName: best.dcName,
          distance: rd.distance, costPerPallet: rd.costPerPallet, cost: rd.cost,
          transitDays: rd.transitDays, distanceKnown: rd.distanceKnown
        };
      }),
      metrics: aggregate([best], ctx)
    };
  }

  /* ==================================================================== *
   *  Splitting
   * ==================================================================== */

  /**
   * Verteilt die Regionen einer Kategorie greedy auf die besten DCs:
   * je Region wird das DC mit dem höchsten regionsbezogenen Score gewählt,
   * das noch freie Stellplätze hat. Reicht die Kapazität nicht, wird die
   * Region anteilig auf das nächstbeste DC verteilt.
   */
  function runSplit(params) {
    var ctx = buildContext(params);
    if (!ctx.dcs.length) return { error: 'Es ist kein aktives Distributionszentrum vorhanden.' };
    if (ctx.demand.totalPallets <= 0) return { error: 'Für diese Kategorie liegen im gewählten Zeitraum keine Mengen vor.' };

    var maxDC = U.clamp(U.num(params.maxDC, 2), 1, Math.max(1, ctx.dcs.length));

    // Kandidatenpool: die besten DCs aus der Gesamtbetrachtung
    var alloc = fullAllocation(ctx.demand);
    var overall = ctx.dcs.map(function (dc) { return evaluateDC(dc, alloc, ctx); });
    scoreAll(overall, ctx);
    overall.sort(function (a, b) { return b.scores.total - a.scores.total; });
    var poolIds = overall.slice(0, maxDC).map(function (d) { return d.dcId; });
    var pool = ctx.dcs.filter(function (dc) { return poolIds.indexOf(dc.id) >= 0; });

    // Verfügbare Stellplätze je DC im Pool
    var freeSlots = Object.create(null);
    pool.forEach(function (dc) {
      freeSlots[dc.id] = Math.max(U.num(dc.capacity, 0) - S.usedSlots(dc.id, ctx.category), 0);
    });

    var slotsPerPallet = ctx.demand.days > 0
      ? (ctx.targetDays * ctx.settings.stockFactor) / ctx.demand.days
      : 0;

    var allocByDC = Object.create(null);
    pool.forEach(function (dc) { allocByDC[dc.id] = Object.create(null); });
    var regionAssign = [];
    var overflow = 0;

    // Kosten je Palette vorab bestimmen (für die regionale Rangfolge)
    var cppMap = Object.create(null);
    ctx.demand.regions.forEach(function (r) {
      cppMap[r.key] = Object.create(null);
      pool.forEach(function (dc) {
        cppMap[r.key][dc.id] = costPerPallet(dc, r, ctx.dist[dc.id][r.key], ctx.settings, ctx.fallbackDist);
      });
    });

    ctx.demand.regions.forEach(function (region) {
      var remaining = region.pallets;
      var guard = 0;

      while (remaining > 1e-6 && guard++ < pool.length + 1) {
        var minCpp = Math.min.apply(null, pool.map(function (dc) { return cppMap[region.key][dc.id]; }));

        var ranked = pool.map(function (dc) {
          var need = remaining * slotsPerPallet;
          var cap = U.num(dc.capacity, 0);
          var used = cap - freeSlots[dc.id];
          var utilAfter = cap > 0 ? (used + Math.min(need, freeSlots[dc.id])) / cap : Infinity;
          var d = ctx.dist[dc.id][region.key];
          var dEff = isFinite(d) ? d : ctx.fallbackDist;
          var transit = ctx.settings.handlingDays + (ctx.settings.kmPerDay > 0 ? dEff / ctx.settings.kmPerDay : 0);
          var coverage = need > 0 ? U.clamp(freeSlots[dc.id] / need, 0, 1) : 1;

          var score = ctx.weights.capacity * capacityScore(utilAfter, ctx.settings.maxUtilization) +
            ctx.weights.transport * transportScore(cppMap[region.key][dc.id], minCpp) +
            ctx.weights.service * serviceScore(coverage, transit, ctx.targetDays);

          return { dc: dc, score: score, free: freeSlots[dc.id] };
        }).filter(function (x) { return x.free > 1e-6; })
          .sort(function (a, b) { return b.score - a.score; });

        if (!ranked.length) break;

        var pick = ranked[0];
        var needSlots = remaining * slotsPerPallet;
        var take = slotsPerPallet > 0 ? Math.min(needSlots, pick.free) / slotsPerPallet : remaining;
        take = Math.min(take, remaining);
        if (take <= 1e-9) break;

        allocByDC[pick.dc.id][region.key] = (allocByDC[pick.dc.id][region.key] || 0) + take;
        freeSlots[pick.dc.id] = Math.max(freeSlots[pick.dc.id] - take * slotsPerPallet, 0);
        remaining -= take;
      }

      // Rest ohne freie Kapazität: dem bestbewerteten DC zuweisen (Überlauf sichtbar machen)
      if (remaining > 1e-6) {
        var fallbackDC = pool[0];
        allocByDC[fallbackDC.id][region.key] = (allocByDC[fallbackDC.id][region.key] || 0) + remaining;
        overflow += remaining;
      }
    });

    var parts = pool.map(function (dc) { return evaluateDC(dc, allocByDC[dc.id], ctx); })
      .filter(function (d) { return d.pallets > 1e-6; });
    scoreAll(parts, ctx);
    parts.sort(function (a, b) { return b.pallets - a.pallets; });

    // Regionszuordnung für die Detailtabelle
    ctx.demand.regions.forEach(function (region) {
      parts.forEach(function (part) {
        var p = allocByDC[part.dcId][region.key];
        if (!p || p <= 1e-6) return;
        var rd = part.regions.find(function (x) { return x.key === region.key; }) || {};
        regionAssign.push({
          regionKey: region.key, pallets: p, dcId: part.dcId, dcName: part.dcName,
          distance: rd.distance, costPerPallet: rd.costPerPallet, cost: rd.cost,
          transitDays: rd.transitDays, distanceKnown: rd.distanceKnown,
          shareOfRegion: region.pallets > 0 ? p / region.pallets : 0
        });
      });
    });

    scoreAll(overall, ctx);
    overall.sort(function (a, b) { return b.scores.total - a.scores.total; });

    return {
      mode: 'split',
      category: ctx.category,
      targetDays: ctx.targetDays,
      weights: ctx.weights,
      demand: ctx.demand,
      candidates: overall,
      best: parts[0],
      parts: parts,
      regionAssign: regionAssign,
      overflowPallets: overflow,
      metrics: aggregate(parts, ctx)
    };
  }

  /* ==================================================================== *
   *  Manuelle Aufteilung
   * ==================================================================== */

  /**
   * Rechnet mit vom Nutzer vorgegebenen Anteilen. Jedes DC bedient dabei den
   * vorgegebenen Anteil jeder Region.
   * @param {object} params
   * @param {Array<{dcId:string, share:number}>} shares  Anteile (0–1)
   */
  function runManual(params, shares) {
    var ctx = buildContext(params);
    if (!ctx.dcs.length) return { error: 'Es ist kein aktives Distributionszentrum vorhanden.' };
    if (ctx.demand.totalPallets <= 0) return { error: 'Für diese Kategorie liegen im gewählten Zeitraum keine Mengen vor.' };

    var totalShare = U.sum(shares, function (x) { return Math.max(0, x.share); });
    if (totalShare <= 0) return { error: 'Die Summe der Anteile muss größer als 0 sein.' };

    var parts = [];
    var regionAssign = [];

    shares.forEach(function (sh) {
      if (sh.share <= 0) return;
      var dc = S.getDC(sh.dcId);
      if (!dc) return;
      var factor = sh.share / totalShare;
      var alloc = Object.create(null);
      ctx.demand.regions.forEach(function (r) { alloc[r.key] = r.pallets * factor; });
      var det = evaluateDC(dc, alloc, ctx);
      parts.push(det);
    });

    scoreAll(parts, ctx);
    var overall = ctx.dcs.map(function (dc) { return evaluateDC(dc, fullAllocation(ctx.demand), ctx); });
    scoreAll(overall, ctx);
    overall.sort(function (a, b) { return b.scores.total - a.scores.total; });

    parts.forEach(function (part) {
      part.regions.forEach(function (rd) {
        var region = ctx.demand.regions.find(function (r) { return r.key === rd.key; }) || { pallets: 0 };
        regionAssign.push({
          regionKey: rd.key, pallets: rd.pallets, dcId: part.dcId, dcName: part.dcName,
          distance: rd.distance, costPerPallet: rd.costPerPallet, cost: rd.cost,
          transitDays: rd.transitDays, distanceKnown: rd.distanceKnown,
          shareOfRegion: region.pallets > 0 ? rd.pallets / region.pallets : 0
        });
      });
    });

    parts.sort(function (a, b) { return b.pallets - a.pallets; });

    return {
      mode: 'manual',
      category: ctx.category,
      targetDays: ctx.targetDays,
      weights: ctx.weights,
      demand: ctx.demand,
      candidates: overall,
      best: parts[0],
      parts: parts,
      regionAssign: regionAssign,
      metrics: aggregate(parts, ctx)
    };
  }

  /* ==================================================================== *
   *  Aggregation
   * ==================================================================== */

  function aggregate(parts, ctx) {
    var pallets = U.sum(parts, function (p) { return p.pallets; });
    var transport = U.sum(parts, function (p) { return p.transportCost; });
    var storage = U.sum(parts, function (p) { return p.storageCost; });
    var handling = U.sum(parts, function (p) { return p.handlingCost; });
    var slots = U.sum(parts, function (p) { return p.requiredSlots; });

    var wDist = pallets > 0 ? U.sum(parts, function (p) { return (p.avgDistance || 0) * p.pallets; }) / pallets : NaN;
    var wTransit = pallets > 0 ? U.sum(parts, function (p) { return (p.avgTransitDays || 0) * p.pallets; }) / pallets : NaN;
    var wScore = pallets > 0 ? U.sum(parts, function (p) { return p.scores.total * p.pallets; }) / pallets : 0;
    var wService = pallets > 0 ? U.sum(parts, function (p) { return p.scores.service * p.pallets; }) / pallets : 0;

    var capacity = U.sum(parts, function (p) { return p.capacity; });
    var usedAfter = U.sum(parts, function (p) { return p.usedSlots + p.requiredSlots; });

    return {
      pallets: pallets,
      requiredSlots: slots,
      transportCost: transport,
      storageCost: storage,
      handlingCost: handling,
      totalCost: transport + storage + handling,
      costPerPallet: pallets > 0 ? (transport + storage + handling) / pallets : NaN,
      avgDistance: wDist,
      avgTransitDays: wTransit,
      score: wScore,
      serviceScore: wService,
      utilization: capacity > 0 ? usedAfter / capacity : NaN,
      feasible: parts.every(function (p) { return p.feasible; }),
      dcCount: parts.length,
      targetDays: ctx.targetDays,
      days: ctx.demand.days
    };
  }

  /* ==================================================================== *
   *  Ausführung / Übernahme
   * ==================================================================== */

  function run(params) {
    if (params.mode === 'split') return runSplit(params);
    return runSingle(params);
  }

  /** Übernimmt ein Simulationsergebnis als verbindliche Zuordnung. */
  function applyResult(result) {
    if (!result || result.error || !result.parts || !result.parts.length) return false;
    S.setAssignment(result.category, {
      mode: result.mode,
      targetDays: result.targetDays,
      createdAt: new Date().toISOString(),
      dataset: result.demand.dataset,
      periodFrom: result.demand.periodFrom,
      periodTo: result.demand.periodTo,
      parts: result.parts.map(function (p) {
        return {
          dcId: p.dcId, dcName: p.dcName, share: p.share, pallets: p.pallets,
          slots: p.requiredSlots, transportCost: p.transportCost, storageCost: p.storageCost,
          handlingCost: p.handlingCost, totalCost: p.totalCost, avgDistance: p.avgDistance,
          avgTransitDays: p.avgTransitDays, score: p.scores.total, feasible: p.feasible,
          scores: { capacity: p.scores.capacity, transport: p.scores.transport, service: p.scores.service }
        };
      }),
      // Regionsebene wird für Karte und Export mitgeführt
      regions: (result.regionAssign || []).map(function (ra) {
        return { regionKey: ra.regionKey, dcId: ra.dcId, pallets: ra.pallets, distance: ra.distance, cost: ra.cost };
      }),
      metrics: result.metrics
    });
    return true;
  }

  /** Simuliert alle Kategorien nacheinander (volumenstärkste zuerst). */
  function runAll(baseParams) {
    var cats = S.categories(baseParams.dataset);
    if (!cats.length) return { count: 0 };

    var ranked = cats.map(function (c) {
      var d = demandFor(Object.assign({}, baseParams, { category: c }));
      return { category: c, pallets: d.totalPallets };
    }).filter(function (x) { return x.pallets > 0; })
      .sort(function (a, b) { return b.pallets - a.pallets; });

    S.clearAssignments();
    var results = [];
    ranked.forEach(function (item) {
      var res = run(Object.assign({}, baseParams, {
        category: item.category,
        targetDays: S.targetDays(item.category)
      }));
      if (res && !res.error) { applyResult(res); results.push(res); }
    });
    return { count: results.length, results: results };
  }

  NS.sim = {
    demandFor: demandFor, buildContext: buildContext, evaluateDC: evaluateDC,
    runSingle: runSingle, runSplit: runSplit, runManual: runManual, run: run, runAll: runAll,
    applyResult: applyResult, aggregate: aggregate,
    capacityScore: capacityScore, transportScore: transportScore, serviceScore: serviceScore,
    normalizedWeights: normalizedWeights, distance: distance, costPerPallet: costPerPallet,
    storageRate: storageRate, handlingRate: handlingRate, DAYS_PER_MONTH: DAYS_PER_MONTH
  };
})(window.LNP);
