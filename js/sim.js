/* NetPlan+ sim.js — calculation core. No DOM access. Numbers in, numbers out (spec §7).
   All cross-file joins (category via SKU_View, DC via DC_Translation_Table + Destinations,
   distance via a country/city centroid lookup) are resolved here, lazily, from state.data. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, GEO = LNP.geo;

  function S() { return LNP.state; }

  /* ================= lazy join maps ================= */
  function materialCategoryMap() {
    var map = {};
    var skus = S().data.skus;
    for (var i = 0; i < skus.length; i++) {
      var s = skus[i];
      map[s.material] = { category: s.marketingView || s.productLine || null, dc: s.dc };
    }
    return map;
  }
  function categoryFor(idx, material) {
    var e = idx[material];
    return (e && e.category) ? e.category : 'Unbekannt';
  }
  function shippingPointDcMap() {
    var map = {};
    var rows = S().data.dcTranslation;
    for (var i = 0; i < rows.length; i++) map[rows[i].shippingPoint] = rows[i].dc;
    return map;
  }
  function dcId(name) {
    if (!name) return null;
    var dc = S().findDcByName(name);
    return dc ? dc.id : null;
  }
  function dcById(id) {
    var dcs = S().data.dcs;
    for (var i = 0; i < dcs.length; i++) if (dcs[i].id === id) return dcs[i];
    return null;
  }
  function candidateDcs() { return S().data.dcs.filter(function (dc) { return dc.active !== false; }); }

  /* Active DCs, optionally narrowed to an explicit allow-list (params.candidateDcIds) so the
     Simulation view can let the user pick which sites are even considered. An empty array is a
     deliberate "none selected" and must yield zero candidates, not fall back to "all" — only a
     missing/null list means "no filter applied". */
  function resolveCandidates(params) {
    var all = candidateDcs();
    if (!params || !params.candidateDcIds) return all;
    var allow = {};
    params.candidateDcIds.forEach(function (id) { allow[id] = true; });
    return all.filter(function (dc) { return allow[dc.id]; });
  }
  function allDestinations() { return S().data.destinations; }

  var _cache = {};
  function invalidateCaches() { _cache = {}; }
  S().onChange(function (evt) {
    if (evt === 'destinations' || evt === 'dcTranslation' || evt === 'dcs' || evt === 'skus' ||
      evt === 'records' || evt === 'reset' || evt === 'project') invalidateCaches();
  });

  /* district -> {dcId: share 0..1} from real ship-to -> shipping point -> DC assignment (base topology) */
  function districtDcShares() {
    if (_cache.districtDcShares) return _cache.districtDcShares;
    var spMap = shippingPointDcMap();
    var byDistrict = U.groupBy(allDestinations(), function (d) { return d.district || '—'; });
    var out = {};
    for (var district in byDistrict) {
      if (!byDistrict.hasOwnProperty(district)) continue;
      var rows = byDistrict[district], counts = {}, total = 0;
      for (var i = 0; i < rows.length; i++) {
        var dcName = rows[i].shippingPoint ? spMap[rows[i].shippingPoint] : null;
        if (!dcName) continue;
        counts[dcName] = (counts[dcName] || 0) + 1; total++;
      }
      var shares = {};
      if (total > 0) {
        for (var name in counts) {
          if (!counts.hasOwnProperty(name)) continue;
          var id = dcId(name);
          if (id) shares[id] = (shares[id] || 0) + counts[name] / total;
        }
      }
      out[district] = shares;
    }
    _cache.districtDcShares = out;
    return out;
  }

  /* district -> {shares:[{country,share,count}], total} — proxy via ship-to customer counts
     (no per-customer volume exists in the source data; documented in the Reports view). */
  function districtCountryShares() {
    if (_cache.districtCountryShares) return _cache.districtCountryShares;
    var byDistrict = U.groupBy(allDestinations(), function (d) { return d.district || '—'; });
    var out = {};
    for (var district in byDistrict) {
      if (!byDistrict.hasOwnProperty(district)) continue;
      var rows = byDistrict[district], counts = {}, total = 0;
      for (var i = 0; i < rows.length; i++) {
        var c = GEO.normalizeCountryKey(rows[i].country);
        if (!c) continue;
        counts[c] = (counts[c] || 0) + 1; total++;
      }
      var shares = [];
      for (var code in counts) if (counts.hasOwnProperty(code)) shares.push({ country: code, share: counts[code] / (total || 1), count: counts[code] });
      shares.sort(function (a, b) { return b.share - a.share; });
      out[district] = { shares: shares, total: total };
    }
    _cache.districtCountryShares = out;
    return out;
  }

  function districtCentroid(district) {
    var override = S().settings.districtCoordOverrides && S().settings.districtCoordOverrides[district];
    if (override && U.isNum(override.lat) && U.isNum(override.lng)) return { lat: override.lat, lng: override.lng, n: null, source: 'manuell' };
    _cache.districtCentroid = _cache.districtCentroid || {};
    if (_cache.districtCentroid.hasOwnProperty(district)) return _cache.districtCentroid[district];
    var rows = allDestinations().filter(function (d) { return d.district === district; });
    var sumLat = 0, sumLng = 0, n = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = GEO.resolve({ city: rows[i].city, country: rows[i].country });
      if (r) { sumLat += r.lat; sumLng += r.lng; n++; }
    }
    var out = n > 0 ? { lat: sumLat / n, lng: sumLng / n, n: n, source: 'automatisch' } : null;
    _cache.districtCentroid[district] = out;
    return out;
  }

  function countryDisplayName(code) {
    var hier = S().data.salesHierarchy;
    for (var i = 0; i < hier.length; i++) if (hier[i].code === code) return hier[i].unit;
    return GEO.countryName(code);
  }

  function allDistricts() {
    var set = {};
    S().data.forecast.forEach(function (r) { set[r.district] = r.districtName || r.district; });
    S().data.destinations.forEach(function (r) { if (r.district) set[r.district] = r.districtName || set[r.district] || r.district; });
    return Object.keys(set).map(function (k) { return { district: k, name: set[k] }; });
  }

  function allCategories() {
    var idx = materialCategoryMap(), set = {};
    S().data.forecast.forEach(function (r) { set[categoryFor(idx, r.material)] = true; });
    return Object.keys(set).sort();
  }

  function periodRange() {
    var rows = S().data.forecast;
    var min = null, max = null;
    for (var i = 0; i < rows.length; i++) {
      if (min === null || rows[i].periodTs < min) min = rows[i].periodTs;
      if (max === null || rows[i].periodTs > max) max = rows[i].periodTs;
    }
    return { min: min, max: max };
  }

  /* ================= demand ================= */
  function filterForecast(params) {
    params = params || {};
    var rows = S().data.forecast, idx = materialCategoryMap(), out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (U.isNum(params.periodFrom) && r.periodTs < params.periodFrom) continue;
      if (U.isNum(params.periodTo) && r.periodTs > params.periodTo) continue;
      if (params.category && params.category !== 'all' && categoryFor(idx, r.material) !== params.category) continue;
      out.push(r);
    }
    return out;
  }

  function distinctPeriodDays(rows) {
    var seen = {}, total = 0;
    for (var i = 0; i < rows.length; i++) { if (!seen[rows[i].periodKey]) { seen[rows[i].periodKey] = true; total += rows[i].periodDays; } }
    return total || 7;
  }

  function demandFor(params) {
    var rows = filterForecast(params);
    var totalDays = distinctPeriodDays(rows);
    var byDistrict = U.groupBy(rows, function (r) { return r.district; });
    var out = {};
    for (var d in byDistrict) {
      if (!byDistrict.hasOwnProperty(d)) continue;
      var recs = byDistrict[d];
      out[d] = {
        district: d, districtName: recs[0].districtName || d,
        pallets: U.sum(recs, function (r) { return r.pallets; }),
        qty: U.sum(recs, function (r) { return r.qty; }),
        volume: U.sum(recs, function (r) { return r.volume; }),
        totalDays: totalDays
      };
    }
    return { byDistrict: out, totalDays: totalDays, rows: rows };
  }

  function resolveCoverageWeeks(category, settings) {
    settings = settings || S().settings;
    if (category && category !== 'all' && settings.coverageWeeksByCategory && U.isNum(settings.coverageWeeksByCategory[category])) {
      return settings.coverageWeeksByCategory[category];
    }
    return settings.coverageWeeksGlobal;
  }

  function scopeSkuCount(rows) {
    var set = {};
    for (var i = 0; i < rows.length; i++) set[rows[i].material] = true;
    return Object.keys(set).length;
  }

  /* ================= distance / cost / transit ================= */
  function distanceKm(dc, district) {
    var centroid = districtCentroid(district);
    if (!dc || !centroid || !U.isNum(dc.lat) || !U.isNum(dc.lng)) return null;
    return GEO.roadDistanceKm(dc.lat, dc.lng, centroid.lat, centroid.lng);
  }
  function transportCostPerPallet(dc, district, settings) {
    if (!dc) return null;
    if (dc.regionCosts && U.isNum(dc.regionCosts[district])) return dc.regionCosts[district];
    var dist = distanceKm(dc, district);
    if (dist === null) return null;
    var base = U.isNum(dc.transportBasePerPallet) ? dc.transportBasePerPallet : settings.costBasePerPallet;
    var perKm = U.isNum(dc.transportCostPerKm) ? dc.transportCostPerKm : settings.costPerPalletKm;
    return base + perKm * dist;
  }
  function transitDaysFor(dc, district, settings) {
    var dist = distanceKm(dc, district);
    if (dist === null) return null;
    return settings.handlingDays + dist / settings.kmPerDay;
  }
  function weightedAvg(districtPalletsMap, valueFn) {
    var totalP = 0, totalV = 0;
    for (var district in districtPalletsMap) {
      if (!districtPalletsMap.hasOwnProperty(district)) continue;
      var p = districtPalletsMap[district];
      var v = valueFn(district);
      if (v === null || !U.isNum(v)) continue;
      totalV += v * p; totalP += p;
    }
    return totalP > 0 ? totalV / totalP : null;
  }
  function avgTransportCostPerPallet(dc, districtPalletsMap, settings) {
    return weightedAvg(districtPalletsMap, function (d) { return transportCostPerPallet(dc, d, settings); });
  }
  function avgTransitDays(dc, districtPalletsMap, settings) {
    return weightedAvg(districtPalletsMap, function (d) { return transitDaysFor(dc, d, settings); });
  }
  function avgDistanceKm(dc, districtPalletsMap) {
    return weightedAvg(districtPalletsMap, function (d) { return distanceKm(dc, d); });
  }

  /* ================= scoring (spec §7 formulas; service-score sub-components are our own
     documented approximation since berechnungslogik.md was not supplied — see Formelübersicht) */
  function capacityScore(utilization, maxUtil) {
    if (!U.isNum(utilization)) return 0;
    if (utilization <= maxUtil) return 100 - 50 * (utilization / maxUtil);
    if (utilization <= 1) return 50 * (1 - (utilization - maxUtil) / (1 - maxUtil));
    return 0;
  }
  function transportScore(ownCpp, cheapestCpp) {
    if (!U.isNum(ownCpp) || ownCpp <= 0 || !U.isNum(cheapestCpp)) return 0;
    return U.clamp(100 * cheapestCpp / ownCpp, 0, 100);
  }
  function serviceScore(transit, bestTransit, worstTransit, coverageDays) {
    if (!U.isNum(transit)) return 0;
    var range = (U.isNum(worstTransit) && U.isNum(bestTransit)) ? worstTransit - bestTransit : 0;
    var bestand = range > 0 ? 1 - U.clamp((transit - bestTransit) / range, 0, 1) : 1;
    var reaktion = coverageDays > 0 ? U.clamp(1 - transit / coverageDays, 0, 1) : 0;
    return 100 * (0.7 * bestand + 0.3 * reaktion);
  }

  function evaluateDC(dc, ctx) {
    var settings = ctx.settings;
    var utilization = (dc.capacity > 0) ? ((dc.usedSlots || 0) + ctx.storageDemandPallets) / dc.capacity : null;
    var cScore = capacityScore(utilization, settings.maxUtilization);
    var ownCpp = avgTransportCostPerPallet(dc, ctx.districtPalletsMap, settings);
    var tScore = transportScore(ownCpp, ctx.cheapestCpp);
    var transit = avgTransitDays(dc, ctx.districtPalletsMap, settings);
    var sScore = serviceScore(transit, ctx.bestTransit, ctx.worstTransit, resolveCoverageWeeks(null, settings) * 7);
    var w = settings.weights || { capacity: 30, transport: 45, service: 25 };
    var wsum = (w.capacity + w.transport + w.service) || 1;
    var total = (w.capacity * cScore + w.transport * tScore + w.service * sScore) / wsum;
    return {
      dcId: dc.id, dcName: dc.name,
      utilization: utilization, capacityScore: cScore,
      transportCostPerPallet: ownCpp, transportScore: tScore,
      transitDays: transit, serviceScore: sScore,
      avgDistanceKm: avgDistanceKm(dc, ctx.districtPalletsMap),
      totalScore: total,
      feasible: utilization === null || utilization <= 1,
      storageDemandPallets: ctx.storageDemandPallets,
      skuCount: ctx.skuCount, pickingBins: ctx.pickingBins
    };
  }

  /* ================= per-category site simulation (spec §7/§8 "Simulation" view) ================= */
  function buildPart(dc, evald, share, pallets, slots, settings) {
    return {
      dcId: dc.id, dcName: dc.name, share: share, pallets: pallets, slots: slots,
      transportCost: evald.transportCostPerPallet,
      storageCost: (settings.storageCostPerSlotMonth || 0) * slots,
      handlingCost: (settings.handlingCostPerPallet || 0) * pallets,
      totalCost: (evald.transportCostPerPallet || 0) * pallets +
        (settings.storageCostPerSlotMonth || 0) * slots + (settings.handlingCostPerPallet || 0) * pallets,
      avgDistance: evald.avgDistanceKm, avgTransitDays: evald.transitDays, score: evald.totalScore,
      feasible: evald.feasible, scores: { capacity: evald.capacityScore, transport: evald.transportScore, service: evald.serviceScore }
    };
  }

  function runSingle(params) {
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var districtPalletsMap = {}, totalPallets = 0;
    for (var d in demand.byDistrict) {
      if (!demand.byDistrict.hasOwnProperty(d)) continue;
      districtPalletsMap[d] = demand.byDistrict[d].pallets; totalPallets += demand.byDistrict[d].pallets;
    }
    var weeks = demand.totalDays / 7 || 1;
    var coverageWeeks = resolveCoverageWeeks(params.category, settings);
    var storageDemand = (totalPallets / weeks) * coverageWeeks * (settings.stockFactor || 1);
    var skuCount = scopeSkuCount(demand.rows);
    var pickingBins = Math.ceil(skuCount / (settings.skusPerBin || 1));

    var candidates = resolveCandidates(params);
    var cpps = [], transits = [], i;
    for (i = 0; i < candidates.length; i++) {
      var cpp = avgTransportCostPerPallet(candidates[i], districtPalletsMap, settings);
      if (cpp !== null) cpps.push(cpp);
      var tr = avgTransitDays(candidates[i], districtPalletsMap, settings);
      if (tr !== null) transits.push(tr);
    }
    var cheapestCpp = cpps.length ? Math.min.apply(Math, cpps) : null;
    var bestTransit = transits.length ? Math.min.apply(Math, transits) : null;
    var worstTransit = transits.length ? Math.max.apply(Math, transits) : null;

    var results = [];
    for (i = 0; i < candidates.length; i++) {
      var ctx = {
        settings: settings, districtPalletsMap: districtPalletsMap,
        storageDemandPallets: storageDemand, skuCount: skuCount, pickingBins: pickingBins,
        cheapestCpp: cheapestCpp, bestTransit: bestTransit, worstTransit: worstTransit
      };
      results.push(evaluateDC(candidates[i], ctx));
    }
    results.sort(function (a, b) { return b.totalScore - a.totalScore; });
    var best = results.length ? results[0] : null;

    var warnings = [];
    if (!candidates.length) {
      warnings.push(candidateDcs().length ? 'Keine Standorte als Kandidaten ausgewählt.' : 'Keine aktiven Distributionszentren vorhanden.');
    }
    if (best && !best.feasible) warnings.push('Der empfohlene Standort überschreitet die Kapazitätsgrenze.');

    var parts = [];
    if (best) {
      var bestDc = dcById(best.dcId);
      parts.push(buildPart(bestDc, best, 1, totalPallets, storageDemand, settings));
    }
    var regions = Object.keys(districtPalletsMap).map(function (dist) {
      return { regionKey: dist, dcId: best ? best.dcId : null, pallets: districtPalletsMap[dist], distance: best ? distanceKm(dcById(best.dcId), dist) : null };
    });

    return {
      mode: 'single', category: params.category, dataset: params.dataset || 'forecast',
      periodFrom: params.periodFrom, periodTo: params.periodTo, targetDays: coverageWeeks * 7, createdAt: Date.now(),
      demand: { totalPallets: totalPallets, weeklyRate: totalPallets / weeks, totalDays: demand.totalDays, byDistrict: demand.byDistrict },
      ranking: results, recommended: best, parts: parts, regions: regions, warnings: warnings
    };
  }

  function runSplit(params) {
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var weeks = demand.totalDays / 7 || 1;
    var coverageWeeks = resolveCoverageWeeks(params.category, settings);
    var skuCount = scopeSkuCount(demand.rows);
    var pickingBins = Math.ceil(skuCount / (settings.skusPerBin || 1));
    var candidates = resolveCandidates(params);
    var poolSize = params.candidatePoolSize || Math.min(candidates.length, 5) || 1;

    var districtPalletsMapFull = {}, totalPallets = 0;
    for (var d in demand.byDistrict) {
      if (!demand.byDistrict.hasOwnProperty(d)) continue;
      districtPalletsMapFull[d] = demand.byDistrict[d].pallets; totalPallets += demand.byDistrict[d].pallets;
    }
    var quickScored = candidates.map(function (dc) { return { dc: dc, cpp: avgTransportCostPerPallet(dc, districtPalletsMapFull, settings) }; })
      .filter(function (x) { return x.cpp !== null; });
    quickScored.sort(function (a, b) { return a.cpp - b.cpp; });
    var pool = quickScored.slice(0, poolSize).map(function (x) { return x.dc; });
    if (!pool.length) pool = candidates.slice(0, poolSize);

    var slotFactor = weeks > 0 ? (coverageWeeks * (settings.stockFactor || 1)) / weeks : 0;
    var remainingCapacity = {};
    pool.forEach(function (dc) { remainingCapacity[dc.id] = Math.max(0, (dc.capacity || 0) - (dc.usedSlots || 0)); });

    var regionsSorted = Object.keys(districtPalletsMapFull).sort(function (a, b) { return districtPalletsMapFull[b] - districtPalletsMapFull[a]; });
    var districtAssignment = {};

    regionsSorted.forEach(function (district) {
      var remainingPallets = districtPalletsMapFull[district];
      var scoredForDistrict = pool.map(function (dc) { return { dc: dc, cpp: transportCostPerPallet(dc, district, settings) }; });
      scoredForDistrict.sort(function (a, b) {
        if (a.cpp === null) return 1; if (b.cpp === null) return -1; return a.cpp - b.cpp;
      });
      var idx = 0;
      while (remainingPallets > 1e-9 && idx < scoredForDistrict.length) {
        var dc = scoredForDistrict[idx].dc;
        var freeSlots = remainingCapacity[dc.id];
        var freePalletsCapacity = slotFactor > 0 ? freeSlots / slotFactor : Infinity;
        var take = Math.min(remainingPallets, Math.max(0, freePalletsCapacity));
        if (take > 1e-9) {
          districtAssignment[district] = districtAssignment[district] || {};
          districtAssignment[district][dc.id] = (districtAssignment[district][dc.id] || 0) + take;
          remainingCapacity[dc.id] -= take * slotFactor;
          remainingPallets -= take;
        }
        idx++;
      }
      if (remainingPallets > 1e-9 && scoredForDistrict.length) {
        var fallback = scoredForDistrict[0].dc;
        districtAssignment[district] = districtAssignment[district] || {};
        districtAssignment[district][fallback.id] = (districtAssignment[district][fallback.id] || 0) + remainingPallets;
      }
    });

    var perDc = {};
    Object.keys(districtAssignment).forEach(function (district) {
      Object.keys(districtAssignment[district]).forEach(function (id) {
        perDc[id] = perDc[id] || { pallets: 0, districtPalletsMap: {} };
        var p = districtAssignment[district][id];
        perDc[id].pallets += p; perDc[id].districtPalletsMap[district] = p;
      });
    });

    var cpps = [], transits = [];
    Object.keys(perDc).forEach(function (id) {
      var dc = dcById(id);
      var cpp = avgTransportCostPerPallet(dc, perDc[id].districtPalletsMap, settings);
      if (cpp !== null) cpps.push(cpp);
      var tr = avgTransitDays(dc, perDc[id].districtPalletsMap, settings);
      if (tr !== null) transits.push(tr);
    });
    var cheapestCpp = cpps.length ? Math.min.apply(Math, cpps) : null;
    var bestTransit = transits.length ? Math.min.apply(Math, transits) : null;
    var worstTransit = transits.length ? Math.max.apply(Math, transits) : null;

    var parts = [];
    Object.keys(perDc).forEach(function (id) {
      var dc = dcById(id);
      var slots = perDc[id].pallets * slotFactor;
      var ctx = {
        settings: settings, districtPalletsMap: perDc[id].districtPalletsMap,
        storageDemandPallets: slots, skuCount: skuCount, pickingBins: pickingBins,
        cheapestCpp: cheapestCpp, bestTransit: bestTransit, worstTransit: worstTransit
      };
      var evald = evaluateDC(dc, ctx);
      parts.push(buildPart(dc, evald, totalPallets > 0 ? perDc[id].pallets / totalPallets : 0, perDc[id].pallets, slots, settings));
    });
    parts.sort(function (a, b) { return b.pallets - a.pallets; });

    var regions = Object.keys(districtAssignment).map(function (district) {
      var assigns = districtAssignment[district];
      var bestId = Object.keys(assigns).sort(function (a, b) { return assigns[b] - assigns[a]; })[0];
      return { regionKey: district, dcId: bestId, pallets: assigns[bestId], distance: distanceKm(dcById(bestId), district) };
    });

    return {
      mode: 'split', category: params.category, dataset: params.dataset || 'forecast',
      periodFrom: params.periodFrom, periodTo: params.periodTo, targetDays: coverageWeeks * 7, createdAt: Date.now(),
      demand: { totalPallets: totalPallets, weeklyRate: totalPallets / weeks, totalDays: demand.totalDays, byDistrict: demand.byDistrict },
      parts: parts, regions: regions, recommended: null,
      warnings: parts.some(function (p) { return !p.feasible; }) ? ['Mindestens ein Standort überschreitet die Kapazitätsgrenze.'] : []
    };
  }

  function runManual(params, shareMap) {
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var weeks = demand.totalDays / 7 || 1;
    var coverageWeeks = resolveCoverageWeeks(params.category, settings);
    var skuCount = scopeSkuCount(demand.rows);
    var pickingBins = Math.ceil(skuCount / (settings.skusPerBin || 1));
    var districtPalletsMapFull = {}, totalPallets = 0;
    for (var d in demand.byDistrict) {
      if (!demand.byDistrict.hasOwnProperty(d)) continue;
      districtPalletsMapFull[d] = demand.byDistrict[d].pallets; totalPallets += demand.byDistrict[d].pallets;
    }
    var slotFactor = weeks > 0 ? (coverageWeeks * (settings.stockFactor || 1)) / weeks : 0;
    var ids = Object.keys(shareMap).filter(function (id) { return shareMap[id] > 0; });

    var cpps = [], transits = [];
    ids.forEach(function (id) {
      var dc = dcById(id); if (!dc) return;
      var cpp = avgTransportCostPerPallet(dc, districtPalletsMapFull, settings);
      if (cpp !== null) cpps.push(cpp);
      var tr = avgTransitDays(dc, districtPalletsMapFull, settings);
      if (tr !== null) transits.push(tr);
    });
    var cheapestCpp = cpps.length ? Math.min.apply(Math, cpps) : null;
    var bestTransit = transits.length ? Math.min.apply(Math, transits) : null;
    var worstTransit = transits.length ? Math.max.apply(Math, transits) : null;

    var parts = ids.map(function (id) {
      var dc = dcById(id);
      var pallets = totalPallets * shareMap[id];
      var slots = pallets * slotFactor;
      var scaledMap = {};
      Object.keys(districtPalletsMapFull).forEach(function (dist) { scaledMap[dist] = districtPalletsMapFull[dist] * shareMap[id]; });
      var ctx = {
        settings: settings, districtPalletsMap: scaledMap, storageDemandPallets: slots,
        skuCount: skuCount, pickingBins: pickingBins, cheapestCpp: cheapestCpp, bestTransit: bestTransit, worstTransit: worstTransit
      };
      var evald = evaluateDC(dc, ctx);
      return buildPart(dc, evald, shareMap[id], pallets, slots, settings);
    });

    var regions = Object.keys(districtPalletsMapFull).map(function (district) {
      var top = ids.slice().sort(function (a, b) { return shareMap[b] - shareMap[a]; })[0];
      return { regionKey: district, dcId: top || null, pallets: districtPalletsMapFull[district], distance: top ? distanceKm(dcById(top), district) : null };
    });

    return {
      mode: 'manual', category: params.category, dataset: params.dataset || 'forecast',
      periodFrom: params.periodFrom, periodTo: params.periodTo, targetDays: coverageWeeks * 7, createdAt: Date.now(),
      demand: { totalPallets: totalPallets, weeklyRate: totalPallets / weeks, totalDays: demand.totalDays, byDistrict: demand.byDistrict },
      parts: parts, regions: regions, recommended: null, warnings: parts.some(function (p) { return !p.feasible; }) ? ['Mindestens ein Standort überschreitet die Kapazitätsgrenze.'] : []
    };
  }

  function runAll(params) {
    var cats = allCategories(), out = {};
    cats.forEach(function (cat) {
      var p = Object.assign({}, params, { category: cat });
      out[cat] = (params.mode === 'split') ? runSplit(p) : runSingle(p);
    });
    return out;
  }

  function applyResult(result) { S().setAssignment(result.category || 'all', result); }

  /* ================= scenario / network flow (Base + templates + custom) ================= */
  function resolveTarget(mapping, id, guard) {
    guard = guard || {};
    if (!id || guard[id]) return id;
    guard[id] = true;
    var next = mapping[id];
    if (!next || next === id) return id;
    return resolveTarget(mapping, next, guard);
  }

  function skuCountByDc(scenario) {
    var mapping = (scenario && scenario.dcMapping) || {};
    var groups = {}, skus = S().data.skus;
    for (var i = 0; i < skus.length; i++) {
      var srcId = dcId(skus[i].dc);
      if (!srcId) continue;
      var target = resolveTarget(mapping, srcId);
      groups[target] = groups[target] || {};
      groups[target][skus[i].material] = true;
    }
    var counts = {};
    for (var id in groups) if (groups.hasOwnProperty(id)) counts[id] = Object.keys(groups[id]).length;
    return counts;
  }

  function allocateToDcs(demand, scenario) {
    var shares = districtDcShares();
    var mapping = (scenario && scenario.dcMapping) || {};
    var overrides = (scenario && scenario.regionOverrides) || {};
    var alloc = {}, unassignedPallets = 0;
    function add(id, d, share) {
      if (!id) return;
      alloc[id] = alloc[id] || { pallets: 0, qty: 0, volume: 0, districts: {} };
      alloc[id].pallets += d.pallets * share; alloc[id].qty += d.qty * share; alloc[id].volume += d.volume * share;
      alloc[id].districts[d.district] = (alloc[id].districts[d.district] || 0) + d.pallets * share;
    }
    for (var district in demand.byDistrict) {
      if (!demand.byDistrict.hasOwnProperty(district)) continue;
      var d = demand.byDistrict[district];
      if (overrides[district]) { add(resolveTarget(mapping, overrides[district]), d, 1); continue; }
      var ds = shares[district];
      if (!ds || !Object.keys(ds).length) { unassignedPallets += d.pallets; continue; }
      for (var srcId in ds) { if (ds.hasOwnProperty(srcId)) add(resolveTarget(mapping, srcId), d, ds[srcId]); }
    }
    return { alloc: alloc, unassignedPallets: unassignedPallets };
  }

  function computeScenarioNetwork(scenario, params) {
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var allocResult = allocateToDcs(demand, scenario);
    var weeks = demand.totalDays / 7 || 1;
    var skuCounts = skuCountByDc(scenario);
    var coverageWeeks = resolveCoverageWeeks(params.category, settings);
    var perDc = [];
    Object.keys(allocResult.alloc).forEach(function (id) {
      var dc = dcById(id); if (!dc) return;
      var a = allocResult.alloc[id];
      var weeklyRate = a.pallets / weeks;
      var storageDemand = weeklyRate * coverageWeeks * (settings.stockFactor || 1);
      var skuCount = skuCounts[id] || 0;
      var pickingBins = Math.ceil(skuCount / (settings.skusPerBin || 1));
      var utilization = dc.capacity > 0 ? ((dc.usedSlots || 0) + storageDemand) / dc.capacity : null;
      perDc.push({
        dcId: id, dcName: dc.name, active: dc.active !== false,
        pallets: a.pallets, qty: a.qty, volume: a.volume,
        weeklyRate: weeklyRate, storageDemandPallets: storageDemand,
        utilization: utilization, capacity: dc.capacity,
        skuCount: skuCount, pickingBins: pickingBins, districts: a.districts
      });
    });
    perDc.sort(function (a, b) { return b.pallets - a.pallets; });
    return {
      scenarioId: scenario ? scenario.id : 'base', scenarioName: scenario ? scenario.name : 'Basis (Ist-Zustand)',
      totalPallets: U.sum(perDc, function (x) { return x.pallets; }),
      totalQty: U.sum(perDc, function (x) { return x.qty; }),
      unassignedPallets: allocResult.unassignedPallets,
      coverageWeeks: coverageWeeks, perDc: perDc, totalDays: demand.totalDays, weeks: weeks
    };
  }

  function findDcByPattern(re) {
    var dcs = candidateDcs();
    for (var i = 0; i < dcs.length; i++) if (re.test(dcs[i].name)) return dcs[i];
    return null;
  }

  var SCENARIO_TEMPLATES = [
    { key: 'base', name: 'Basis (Ist-Zustand)' },
    { key: 'central-eu-consolidation', name: 'Szenario 1: Zentraleuropa-Konsolidierung' },
    { key: 'full-ee', name: 'Szenario 2: Gesamt-Kontinentaleuropa → Osteuropa' },
    { key: 'central-east-split', name: 'Szenario 3: Zentral-/Osteuropa-Split' }
  ];

  function buildScenarioTemplate(templateKey) {
    var dcs = candidateDcs();
    var bassano = findDcByPattern(/bassano/i);
    var armitage = findDcByPattern(/armitage/i);
    var sevlievo = findDcByPattern(/sevliev/i);
    var saar = findDcByPattern(/saar|losheim|merzig/i);
    var mapping = {}, warnings = [];
    function keep(dc) { if (dc) mapping[dc.id] = dc.id; }

    if (templateKey === 'central-eu-consolidation') {
      keep(bassano); keep(armitage); keep(sevlievo);
      var hub = saar || findDcByPattern(/dole|wroclaw|vda/i);
      dcs.forEach(function (dc) {
        if (dc === bassano || dc === armitage || dc === sevlievo) return;
        mapping[dc.id] = hub ? hub.id : dc.id;
      });
      if (!hub) warnings.push('Kein Standort passend zu "Saar" gefunden — bitte Ziel-DC für die Konsolidierung im Szenario-Editor wählen.');
    } else if (templateKey === 'full-ee') {
      keep(bassano); keep(armitage);
      dcs.forEach(function (dc) {
        if (dc === bassano || dc === armitage) return;
        mapping[dc.id] = sevlievo ? sevlievo.id : dc.id;
      });
      if (!sevlievo) warnings.push('Kein Standort passend zu "Sevlievo" gefunden — bitte Ziel-DC im Szenario-Editor wählen.');
    } else if (templateKey === 'central-east-split') {
      keep(bassano); keep(armitage);
      dcs.forEach(function (dc) {
        if (dc === bassano || dc === armitage) return;
        var east = dc.country ? GEO.isEastOfLine(dc.country) : null;
        if (east === true && sevlievo) mapping[dc.id] = sevlievo.id;
        else if (east === false && saar) mapping[dc.id] = saar.id;
        else { mapping[dc.id] = dc.id; warnings.push('DC "' + dc.name + '": Land nicht gesetzt — Ost/West-Zuordnung bitte prüfen.'); }
      });
    } else {
      dcs.forEach(function (dc) { mapping[dc.id] = dc.id; });
    }
    return { dcMapping: mapping, warnings: warnings };
  }

  /* ================= reports ================= */
  function countryDistrictAllocation(district, topN) {
    topN = topN || S().settings.countryAllocationTopN || 10;
    var cs = districtCountryShares()[district];
    if (!cs) return { district: district, rows: [], total: 0 };
    var rows = cs.shares.slice(0, topN).map(function (s) {
      return { country: s.country, countryName: countryDisplayName(s.country), share: s.share, count: s.count };
    });
    var restShare = 0, restCount = 0;
    for (var i = topN; i < cs.shares.length; i++) { restShare += cs.shares[i].share; restCount += cs.shares[i].count; }
    if (restCount > 0) rows.push({ country: 'REST', countryName: 'Rest', share: restShare, count: restCount, isRest: true });
    return { district: district, rows: rows, total: cs.total };
  }

  function skuCountPerDcReport() {
    var counts = skuCountByDc(null);
    return candidateDcs().map(function (dc) {
      var n = counts[dc.id] || 0;
      return { dcId: dc.id, dcName: dc.name, skuCount: n, pickingBins: Math.ceil(n / (S().settings.skusPerBin || 1)) };
    }).sort(function (a, b) { return b.skuCount - a.skuCount; });
  }

  function isTapsCategory(cat, keywords) {
    if (!cat) return false;
    var low = cat.toLowerCase();
    return keywords.some(function (k) { return low.indexOf(String(k).toLowerCase()) !== -1; });
  }

  function avgShipmentSize(params) {
    var settings = params.settings || S().settings;
    var rows = filterForecast(params);
    var bounds = settings.shipmentClusterBounds || [1, 5];
    var clusters = [
      { label: '0,1–' + bounds[0].toFixed(1) + ' ESU', min: 0, max: bounds[0], count: 0, qtySum: 0 },
      { label: bounds[0].toFixed(1) + '–' + bounds[1].toFixed(1) + ' ESU', min: bounds[0], max: bounds[1], count: 0, qtySum: 0 },
      { label: '> ' + bounds[1].toFixed(1) + ' ESU', min: bounds[1], max: Infinity, count: 0, qtySum: 0 }
    ];
    var perDc = {}, shares = districtDcShares(), totalQty = 0;
    rows.forEach(function (r) {
      totalQty += r.qty;
      for (var c = 0; c < clusters.length; c++) {
        if (r.qty > clusters[c].min && r.qty <= clusters[c].max) { clusters[c].count++; clusters[c].qtySum += r.qty; break; }
      }
      var ds = shares[r.district];
      if (ds) {
        Object.keys(ds).forEach(function (id) {
          perDc[id] = perDc[id] || { count: 0, qtySum: 0 };
          perDc[id].count += ds[id]; perDc[id].qtySum += r.qty * ds[id];
        });
      }
    });
    var perDcOut = Object.keys(perDc).map(function (id) {
      var dc = dcById(id);
      return { dcId: id, dcName: dc ? dc.name : id, avg: perDc[id].count > 0 ? perDc[id].qtySum / perDc[id].count : null, lines: perDc[id].count };
    }).sort(function (a, b) { return (b.avg || 0) - (a.avg || 0); });
    return { europeAvg: rows.length > 0 ? totalQty / rows.length : null, totalLines: rows.length, totalQty: totalQty, clusters: clusters, perDc: perDcOut };
  }

  function shipmentComposition(params) {
    var settings = params.settings || S().settings;
    var rows = filterForecast(Object.assign({}, params, { category: 'all' }));
    var idx = materialCategoryMap();
    var bundles = U.groupBy(rows, function (r) { return r.district + '|' + r.periodKey; });
    var totalBundles = 0, tapsOnly = 0, mixed = 0, noTaps = 0;
    var perDc = {}, shares = districtDcShares();
    Object.keys(bundles).forEach(function (key) {
      var lines = bundles[key];
      var district = lines[0].district;
      var hasTaps = false, hasOther = false;
      lines.forEach(function (l) {
        var cat = categoryFor(idx, l.material);
        if (isTapsCategory(cat, settings.tapsKeywords)) hasTaps = true; else hasOther = true;
      });
      totalBundles++;
      var kind = (hasTaps && hasOther) ? 'mixed' : (hasTaps ? 'tapsOnly' : 'noTaps');
      if (kind === 'mixed') mixed++; else if (kind === 'tapsOnly') tapsOnly++; else noTaps++;
      var ds = shares[district];
      if (ds) {
        Object.keys(ds).forEach(function (id) {
          perDc[id] = perDc[id] || { total: 0, tapsOnly: 0, mixed: 0, noTaps: 0 };
          perDc[id].total += ds[id]; perDc[id][kind] += ds[id];
        });
      }
    });
    var perDcOut = Object.keys(perDc).map(function (id) {
      var dc = dcById(id), p = perDc[id];
      return {
        dcId: id, dcName: dc ? dc.name : id,
        tapsOnlyShare: p.total > 0 ? p.tapsOnly / p.total : null,
        mixedShare: p.total > 0 ? p.mixed / p.total : null,
        noTapsShare: p.total > 0 ? p.noTaps / p.total : null, total: p.total
      };
    });
    return {
      totalBundles: totalBundles,
      tapsOnlyShare: totalBundles > 0 ? tapsOnly / totalBundles : null,
      mixedShare: totalBundles > 0 ? mixed / totalBundles : null,
      noTapsShare: totalBundles > 0 ? noTaps / totalBundles : null,
      perDc: perDcOut
    };
  }

  var FORMULA_REFERENCE = [
    { title: 'Paletten', formula: 'Paletten = PalÄq → Paletten → Volumen ÷ VolProPal → Menge ÷ StückProPal', note: 'Bei den 7 Quelldateien liegen Paletten (Sum of Pallet load) bereits direkt vor; die Umrechnungskette wird nicht benötigt.' },
    { title: 'Bedarf/Tag', formula: 'Bedarf/Tag = Σ Paletten ÷ Σ echte Tageslängen der Perioden im Filter' },
    { title: 'Ziel-Bestand (Lagerbedarf)', formula: 'Ziel-Bestand = Bedarf/Tag × 7 × Coverage(Wochen) × Sicherheitsaufschlag', note: 'Coverage (Ziel-Reichweite) ist global und je Kategorie/DC dynamisch einstellbar.' },
    { title: 'Distanz', formula: 'Distanz = Haversine(DC, Distrikt-Zentroid) × 1,28', note: 'Distrikt-Zentroid = Mittel der geokodierten Ship-to-Adressen des Distrikts.' },
    { title: '€ / Palette', formula: 'Regionspauschale, sonst Grundkosten + €/km × Distanz' },
    { title: 'Transit', formula: 'Transit = Handlingtage + Distanz ÷ km pro Tag' },
    { title: 'Kapazitäts-Score', formula: 'Auslastung ≤ Grenze: 100 − 50 × (Auslastung ÷ Grenze); Grenze…100%: 50 × (1 − (Auslastung − Grenze) ÷ (1 − Grenze)); darüber: 0' },
    { title: 'Transport-Score', formula: '100 × günstigste €/Palette im Bewerberfeld ÷ eigene €/Palette' },
    { title: 'Service-Score (Reichweite)', formula: '100 × (0,7 × Bestandsfähigkeit + 0,3 × Reaktionsfähigkeit)', note: 'Eigene, transparent dokumentierte Ausformulierung: Bestandsfähigkeit = relative Nähe der eigenen Transitzeit zur schnellsten im Bewerberfeld; Reaktionsfähigkeit = 1 − Transit ÷ (Coverage in Tagen), begrenzt auf [0,1]. Die Original-Formel aus berechnungslogik.md lag für diesen Nachbau nicht vor.' },
    { title: 'Gesamt-Score', formula: 'Σ normierte Gewichte × Teil-Scores (Kapazität/Transport/Service)' },
    { title: 'Länder-Distrikt-Zuordnung', formula: 'Anteil Land = Ship-to-Kunden(Land, Distrikt) ÷ Ship-to-Kunden(Distrikt)', note: 'Anzahl-basierter Proxy, da keine kundenscharfen Volumina in den Quelldaten vorliegen.' },
    { title: 'SKU / Picking Bins je DC', formula: 'Picking Bins = ⌈SKU-Anzahl ÷ SKUs je Bin⌉' },
    { title: 'Ø Sendungsgröße', formula: 'Mittelwert von Forecast qty ESU je (Distrikt, Periode, Material)-Zeile', note: 'Proxy für eine Sendung, da keine Auftrags-/Lieferpositionen vorliegen.' },
    { title: 'Sendungszusammensetzung', formula: 'Anteil (Distrikt, Periode)-Bündel, die ausschließlich "Taps"-Kategorien enthalten vs. gemischt' }
  ];

  LNP.sim = {
    materialCategoryMap: materialCategoryMap, categoryFor: categoryFor,
    districtDcShares: districtDcShares, districtCountryShares: districtCountryShares,
    districtCentroid: districtCentroid, countryDisplayName: countryDisplayName,
    allDistricts: allDistricts, allCategories: allCategories, periodRange: periodRange,
    demandFor: demandFor, resolveCoverageWeeks: resolveCoverageWeeks,
    distanceKm: distanceKm, transportCostPerPallet: transportCostPerPallet, transitDaysFor: transitDaysFor,
    evaluateDC: evaluateDC, dcById: dcById, candidateDcs: candidateDcs, resolveCandidates: resolveCandidates,
    runSingle: runSingle, runSplit: runSplit, runManual: runManual, runAll: runAll, applyResult: applyResult,
    skuCountByDc: skuCountByDc, allocateToDcs: allocateToDcs, computeScenarioNetwork: computeScenarioNetwork,
    resolveTarget: resolveTarget, buildScenarioTemplate: buildScenarioTemplate, SCENARIO_TEMPLATES: SCENARIO_TEMPLATES,
    countryDistrictAllocation: countryDistrictAllocation, skuCountPerDcReport: skuCountPerDcReport,
    avgShipmentSize: avgShipmentSize, shipmentComposition: shipmentComposition,
    invalidateCaches: invalidateCaches, FORMULA_REFERENCE: FORMULA_REFERENCE
  };
})();
