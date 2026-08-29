/* NetPlan+ sim.js — calculation core. No DOM access. Numbers in, numbers out (spec §7).
   Forecast is DC-native (each row already carries its own "DC"), so the demand-by-DC total is
   exact, not a proxy. The geographic footprint of each DC (which districts/customers it
   historically serves) comes from Sales History, which links Shipping Point (-> DC via
   DC_Translation_Table) to District with real ESU volume — this is what feeds distance-based
   scoring, scenario re-routing after a consolidation, and the geographic reports. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util, GEO = LNP.geo;

  function S() { return LNP.state; }

  /* Known real-world coordinates for a handful of Villeroy & Boch sites, used only to pre-fill
     a DC's country/coordinates the first time it is auto-created from the Forecast file — never
     overrides a value the user has already set, and is always shown as source 'automatisch'
     (editable/overridable in DC-Verwaltung like any other coordinate). */
  var KNOWN_DC_HINTS = {
    bassano: { country: 'IT', lat: 45.77, lng: 11.73 },
    armitage: { country: 'GB', lat: 52.73, lng: -1.80 },
    sevelievo: { country: 'BG', lat: 43.03, lng: 25.11 },
    sevlievo: { country: 'BG', lat: 43.03, lng: 25.11 },
    wittlich: { country: 'DE', lat: 49.99, lng: 6.89 },
    losheim: { country: 'DE', lat: 49.52, lng: 6.75 },
    dole: { country: 'FR', lat: 47.09, lng: 5.49 },
    wroclaw: { country: 'PL', lat: 51.11, lng: 17.04 },
    "valence d' agen": { country: 'FR', lat: 44.13, lng: 0.91 },
    "valence d'agen": { country: 'FR', lat: 44.13, lng: 0.91 }
  };
  function dcHintFor(name) { return KNOWN_DC_HINTS[String(name || '').trim().toLowerCase()] || null; }

  /* ================= lazy join maps ================= */
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

  function resolveCandidates(params) {
    var all = candidateDcs();
    if (!params || !params.candidateDcIds) return all;
    var allow = {};
    params.candidateDcIds.forEach(function (id) { allow[id] = true; });
    return all.filter(function (dc) { return allow[dc.id]; });
  }

  var _cache = {};
  function invalidateCaches() { _cache = {}; }
  S().onChange(function (evt) {
    if (evt === 'destinations' || evt === 'dcTranslation' || evt === 'dcs' || evt === 'skus' ||
      evt === 'records' || evt === 'salesHierarchy' || evt === 'shipToAddresses' || evt === 'reset' || evt === 'project') invalidateCaches();
  });

  /* Canonical districts = the top level of the Sales Hierarchie ("District" column), e.g.
     DACH, UK / IR, Western Europe... The finer "Land / Einheit" rows (Austria, Nordics, ...)
     are each rolled up into exactly one of these. */
  function canonicalDistrictSet() {
    if (_cache.canonicalDistricts) return _cache.canonicalDistricts;
    var set = {};
    S().data.salesHierarchy.forEach(function (r) { if (r.district) set[r.district] = true; });
    _cache.canonicalDistricts = set;
    return set;
  }
  function allDistricts() {
    var set = canonicalDistrictSet();
    return Object.keys(set).sort().map(function (d) { return { district: d, name: d }; });
  }

  /* ================= Sales History -> DC x District real volume shares =================
     Sales History reports the same underlying facts at BOTH the District level (e.g. "DACH")
     and its constituent "Land / Einheit" level (e.g. "Austria") simultaneously — the District
     row IS the sum of its children. Only the District-level rows are used here, or the share
     computation would double- (or triple-) count. */
  function dcDistrictShares() {
    if (_cache.dcDistrictShares) return _cache.dcDistrictShares;
    var spMap = shippingPointDcMap();
    var canonical = canonicalDistrictSet();
    var totals = {}; // dcName -> { district: esu }
    S().data.history.forEach(function (r) {
      if (!r.districtLabel || !canonical[r.districtLabel]) return;
      var dcName = r.shippingPoint ? spMap[r.shippingPoint] : null;
      if (!dcName) return;
      totals[dcName] = totals[dcName] || {};
      totals[dcName][r.districtLabel] = (totals[dcName][r.districtLabel] || 0) + (r.qtyEsu || 0);
    });
    var out = {};
    Object.keys(totals).forEach(function (dcName) {
      var id = dcId(dcName);
      if (!id) return;
      var byDistrict = totals[dcName];
      var sum = 0;
      Object.keys(byDistrict).forEach(function (d) { sum += Math.max(0, byDistrict[d]); });
      var shares = {};
      if (sum > 0) Object.keys(byDistrict).forEach(function (d) { shares[d] = Math.max(0, byDistrict[d]) / sum; });
      out[id] = { totalEsu: sum, shares: shares };
    });
    _cache.dcDistrictShares = out;
    return out;
  }

  /* Real country/region mix WITHIN a district, from Sales History's "Land / Einheit"-level rows
     (the leaves of the same hierarchy dcDistrictShares uses at the District level) — a genuine
     volume-weighted breakdown, not a customer-count proxy. */
  function districtCountryBreakdown(districtName) {
    var key = 'districtCountryBreakdown:' + districtName;
    if (_cache[key]) return _cache[key];
    var units = {};
    S().data.salesHierarchy.forEach(function (r) { if (r.district === districtName && r.unit) units[r.unit] = true; });
    var totals = {};
    S().data.history.forEach(function (r) {
      if (!r.districtLabel || !units[r.districtLabel]) return;
      totals[r.districtLabel] = (totals[r.districtLabel] || 0) + (r.qtyEsu || 0);
    });
    var rows = Object.keys(units).map(function (u) { return { unit: u, esu: totals[u] || 0 }; });
    rows.sort(function (a, b) { return b.esu - a.esu; });
    _cache[key] = rows;
    return rows;
  }

  /* ================= Ship-to-Party precision layer =================
     Sales History's District / Land-Einheit labels are reporting buckets, not addresses, so
     districtCentroid()'s country-centroid average is only ever an approximation. Destinations
     (Shipping point <-> Ship-to Party, with real ESU volume) joined against Ship-to-address
     (Ship-to Party -> actual country/city) gives the real, volume-weighted location of a
     district's customers — used here to sharpen the centroid Sales History alone can't provide.
     Sales History stays authoritative for the DC<->district VOLUME split (dcDistrictShares) —
     this layer only refines WHERE that volume actually sits geographically. */
  function normShipToId(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).trim().replace(/^0+(?=\d)/, '');
    return s || null;
  }
  function shipToIndex() {
    if (_cache.shipToIndex) return _cache.shipToIndex;
    var idx = {};
    S().data.shipToAddresses.forEach(function (r) {
      var key = normShipToId(r.shipTo);
      if (key) idx[key] = r;
    });
    _cache.shipToIndex = idx;
    return idx;
  }
  /* Country -> District, reverse-engineered from Sales Hierarchie's "Land / Einheit" labels
     (the same expansion districtCentroid's fallback uses) so a Ship-to-address's real ISO
     country code can be placed into a district without needing a second, SAP-internal code
     mapping (Sales Hierarchie's own "Code" column is not an ISO country code). */
  function countryToDistrictMap() {
    if (_cache.countryToDistrict) return _cache.countryToDistrict;
    var map = {};
    S().data.salesHierarchy.forEach(function (r) {
      if (!r.district) return;
      GEO.expandUnitToCountries(r.unit).forEach(function (cc) { if (!map[cc]) map[cc] = r.district; });
    });
    _cache.countryToDistrict = map;
    return map;
  }
  /* District -> ESU-weighted average of real Ship-to-address coordinates (city if resolvable,
     else the customer's own country) for every Destinations row that joins to an address. */
  function districtCustomerGeo() {
    if (_cache.districtCustomerGeo) return _cache.districtCustomerGeo;
    var idx = shipToIndex(), countryDistrict = countryToDistrictMap();
    var acc = {};
    S().data.destinations.forEach(function (r) {
      var shipToKey = normShipToId(r.vbShipTo) || normShipToId(r.isiShipTo);
      if (!shipToKey) return;
      var addr = idx[shipToKey];
      if (!addr || !addr.country) return;
      var district = countryDistrict[GEO.normalizeCountryKey(addr.country)];
      if (!district) return;
      var geo = GEO.resolve({ city: addr.city, country: addr.country });
      if (!geo) return;
      var w = Math.max(0, r.qtyEsu || 0) || 0.01;
      acc[district] = acc[district] || { sumLat: 0, sumLng: 0, weight: 0, customers: 0 };
      acc[district].sumLat += geo.lat * w; acc[district].sumLng += geo.lng * w;
      acc[district].weight += w; acc[district].customers++;
    });
    var out = {};
    Object.keys(acc).forEach(function (d) {
      var a = acc[d];
      if (a.weight > 0) out[d] = { lat: a.sumLat / a.weight, lng: a.sumLng / a.weight, customers: a.customers };
    });
    _cache.districtCustomerGeo = out;
    return out;
  }

  function districtCentroid(district) {
    var override = S().settings.districtCoordOverrides && S().settings.districtCoordOverrides[district];
    if (override && U.isNum(override.lat) && U.isNum(override.lng)) return { lat: override.lat, lng: override.lng, source: 'manuell' };
    var key = 'districtCentroid:' + district;
    if (_cache[key] !== undefined) return _cache[key];
    var precise = districtCustomerGeo()[district];
    if (precise) {
      var preciseOut = { lat: precise.lat, lng: precise.lng, source: 'ship-to', customers: precise.customers };
      _cache[key] = preciseOut;
      return preciseOut;
    }
    var rows = districtCountryBreakdown(district);
    var sumLat = 0, sumLng = 0, weight = 0;
    var haveVolume = rows.some(function (r) { return r.esu > 0; });
    rows.forEach(function (r) {
      var w = haveVolume ? r.esu : 1;
      if (haveVolume && r.esu <= 0) return;
      var countries = GEO.expandUnitToCountries(r.unit);
      if (!countries.length) return;
      var cLat = 0, cLng = 0, n = 0;
      countries.forEach(function (code) {
        var c = GEO.COUNTRY[code];
        if (c) { cLat += c.lat; cLng += c.lng; n++; }
      });
      if (!n) return;
      sumLat += (cLat / n) * w; sumLng += (cLng / n) * w; weight += w;
    });
    var out = weight > 0 ? { lat: sumLat / weight, lng: sumLng / weight, source: 'automatisch' } : null;
    _cache[key] = out;
    return out;
  }

  function countryDisplayName(unit) { return unit; }

  /* ================= demand (DC-native, exact) ================= */
  function filterForecast(params) {
    params = params || {};
    var rows = S().data.forecast, out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (U.isNum(params.periodFrom) && r.periodTs < params.periodFrom) continue;
      if (U.isNum(params.periodTo) && r.periodTs > params.periodTo) continue;
      if (params.category && params.category !== 'all' && r.category !== params.category) continue;
      if (params.dc && r.dc !== params.dc) continue;
      out.push(r);
    }
    return out;
  }

  function distinctPeriodDays(rows) {
    var seen = {}, total = 0;
    for (var i = 0; i < rows.length; i++) { if (!seen[rows[i].periodKey]) { seen[rows[i].periodKey] = true; total += rows[i].periodDays; } }
    return total || 30.44;
  }

  /* demand.byDc is the primary, exact figure (straight from Forecast). demand.byDistrict is a
     DERIVED footprint — each DC's total fanned out through dcDistrictShares() — used only for
     distance/service scoring and maps, never as the source of truth for DC totals. */
  function demandFor(params) {
    var rows = filterForecast(params);
    var totalDays = distinctPeriodDays(rows);
    var byDcRows = U.groupBy(rows, function (r) { return r.dc; });
    var byDc = {};
    for (var dcName in byDcRows) {
      if (!byDcRows.hasOwnProperty(dcName)) continue;
      var recs = byDcRows[dcName];
      byDc[dcName] = { dc: dcName, pallets: U.sum(recs, function (r) { return r.pallets; }), qty: U.sum(recs, function (r) { return r.qty; }) };
    }
    var shares = dcDistrictShares();
    var byDistrict = {};
    Object.keys(byDc).forEach(function (dcName) {
      var id = dcId(dcName);
      var s = id ? shares[id] : null;
      var d = byDc[dcName];
      if (s && Object.keys(s.shares).length) {
        Object.keys(s.shares).forEach(function (district) {
          byDistrict[district] = byDistrict[district] || { district: district, districtName: district, pallets: 0, qty: 0 };
          byDistrict[district].pallets += d.pallets * s.shares[district];
          byDistrict[district].qty += d.qty * s.shares[district];
        });
      } else {
        var key = '(ohne Distrikt-Zuordnung)';
        byDistrict[key] = byDistrict[key] || { district: key, districtName: key, pallets: 0, qty: 0 };
        byDistrict[key].pallets += d.pallets;
        byDistrict[key].qty += d.qty;
      }
    });
    return { byDc: byDc, byDistrict: byDistrict, totalDays: totalDays, rows: rows };
  }

  function resolveCoverageWeeks(category, settings) {
    settings = settings || S().settings;
    if (category && category !== 'all' && settings.coverageWeeksByCategory && U.isNum(settings.coverageWeeksByCategory[category])) {
      return settings.coverageWeeksByCategory[category];
    }
    return settings.coverageWeeksGlobal;
  }

  /* Ziel-Bestand = Bedarf/Tag x 7 x Coverage(Wochen) x Sicherheitsaufschlag — exact when a
     single category is selected. With category:'all' (or unset) a single global coverage
     figure would silently ignore any per-category "Ziel-Reichweite" override configured in
     Daten & Import, so each category's own pallet volume is weighted by its OWN coverage
     setting and summed, instead of blending every category's pallets under one number. */
  function blendedStorageDemand(params, settings, totalPallets, weeks) {
    if (params.category && params.category !== 'all') {
      return (totalPallets / (weeks || 1)) * resolveCoverageWeeks(params.category, settings) * (settings.stockFactor || 1);
    }
    var cats = allCategories();
    if (!cats.length) return (totalPallets / (weeks || 1)) * resolveCoverageWeeks(null, settings) * (settings.stockFactor || 1);
    var sum = 0;
    cats.forEach(function (cat) {
      var d = demandFor(Object.assign({}, params, { category: cat }));
      var catPallets = totalPalletsOf(d);
      if (!catPallets) return;
      var catWeeks = d.totalDays / 7 || weeks || 1;
      sum += (catPallets / catWeeks) * resolveCoverageWeeks(cat, settings) * (settings.stockFactor || 1);
    });
    return sum;
  }
  /* Ø slot-equivalent per pallet implied by blendedStorageDemand — lets DC/region-level pallet
     allocations (runSplit, runManual, computeScenarioNetwork) turn into storage-slot demand
     with a single multiplication while still honoring the per-category blend above. */
  function effectiveSlotFactor(params, settings, totalPallets, weeks) {
    return totalPallets > 0 ? blendedStorageDemand(params, settings, totalPallets, weeks) / totalPallets : 0;
  }

  function scopeSkuCount(rows) {
    var set = {};
    for (var i = 0; i < rows.length; i++) set[rows[i].article] = true;
    return Object.keys(set).length;
  }

  function allCategories() {
    var set = {};
    S().data.forecast.forEach(function (r) { set[r.category || 'Unbekannt'] = true; });
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

  function totalPalletsOf(demand) { return U.sum(Object.keys(demand.byDc), function (k) { return demand.byDc[k].pallets; }); }

  function runSingle(params) {
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var districtPalletsMap = {};
    Object.keys(demand.byDistrict).forEach(function (d) { districtPalletsMap[d] = demand.byDistrict[d].pallets; });
    var totalPallets = totalPalletsOf(demand);
    var weeks = demand.totalDays / 7 || 1;
    var coverageWeeks = resolveCoverageWeeks(params.category, settings);
    var storageDemand = blendedStorageDemand(params, settings, totalPallets, weeks);
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
    /* No artificial cap by default — an "optimal" network strategy has to weigh every
       selected candidate DC against capacity/cost/transport, not just a handful of the
       cheapest-on-average ones. params.candidatePoolSize still lets a caller restrict the
       pool explicitly (e.g. for performance with a very large DC list). */
    var poolSize = params.candidatePoolSize || candidates.length || 1;

    var districtPalletsMapFull = {};
    Object.keys(demand.byDistrict).forEach(function (d) { districtPalletsMapFull[d] = demand.byDistrict[d].pallets; });
    var totalPallets = totalPalletsOf(demand);

    var quickScored = candidates.map(function (dc) { return { dc: dc, cpp: avgTransportCostPerPallet(dc, districtPalletsMapFull, settings) }; })
      .filter(function (x) { return x.cpp !== null; });
    quickScored.sort(function (a, b) { return a.cpp - b.cpp; });
    var pool = quickScored.slice(0, poolSize).map(function (x) { return x.dc; });
    if (!pool.length) pool = candidates.slice(0, poolSize);

    var slotFactor = effectiveSlotFactor(params, settings, totalPallets, weeks);
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
    var districtPalletsMapFull = {};
    Object.keys(demand.byDistrict).forEach(function (d) { districtPalletsMapFull[d] = demand.byDistrict[d].pallets; });
    var totalPallets = totalPalletsOf(demand);
    var slotFactor = effectiveSlotFactor(params, settings, totalPallets, weeks);
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

  /* SKU count per DC: primary source is Forecast's own distinct (dc, article) pairs — the
     future-state assignment, and more reliable than SKU_View's historical, heavily-masked data. */
  function skuCountByDc(scenario) {
    var mapping = (scenario && scenario.dcMapping) || {};
    var groups = {};
    S().data.forecast.forEach(function (r) {
      var srcId = dcId(r.dc);
      if (!srcId) return;
      var target = resolveTarget(mapping, srcId);
      groups[target] = groups[target] || {};
      groups[target][r.article] = true;
    });
    var counts = {};
    for (var id in groups) if (groups.hasOwnProperty(id)) counts[id] = Object.keys(groups[id]).length;
    return counts;
  }

  /* Fans each DC's own (exact) forecast total out into district-level pieces via
     dcDistrictShares(), then routes each piece to its scenario target (regionOverrides first,
     else the scenario's dcMapping). Districts with no Sales-History coverage for that DC route
     as one undifferentiated piece so no volume is silently dropped. */
  function allocateToDcs(demand, scenario) {
    var shares = dcDistrictShares();
    var mapping = (scenario && scenario.dcMapping) || {};
    var overrides = (scenario && scenario.regionOverrides) || {};
    var alloc = {};
    function add(targetId, district, pallets, qty) {
      if (!targetId) return;
      alloc[targetId] = alloc[targetId] || { pallets: 0, qty: 0, districts: {} };
      alloc[targetId].pallets += pallets; alloc[targetId].qty += qty;
      alloc[targetId].districts[district] = (alloc[targetId].districts[district] || 0) + pallets;
    }
    Object.keys(demand.byDc).forEach(function (dcName) {
      var d = demand.byDc[dcName];
      var srcId = dcId(dcName);
      if (!srcId) return;
      var s = shares[srcId];
      if (s && Object.keys(s.shares).length) {
        Object.keys(s.shares).forEach(function (district) {
          var frac = s.shares[district];
          var target = overrides[district] || resolveTarget(mapping, srcId);
          add(target, district, d.pallets * frac, d.qty * frac);
        });
      } else {
        var fallbackDistrict = '(ohne Distrikt-Zuordnung)';
        var target2 = overrides[fallbackDistrict] || resolveTarget(mapping, srcId);
        add(target2, fallbackDistrict, d.pallets, d.qty);
      }
    });
    return { alloc: alloc, unassignedPallets: 0 };
  }

  function computeScenarioNetwork(scenario, params) {
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var allocResult = allocateToDcs(demand, scenario);
    var weeks = demand.totalDays / 7 || 1;
    var skuCounts = skuCountByDc(scenario);
    var coverageWeeks = resolveCoverageWeeks(params.category, settings);
    var totalPalletsAll = totalPalletsOf(demand);
    var slotFactor = effectiveSlotFactor(params, settings, totalPalletsAll, weeks);
    var perDc = [];
    Object.keys(allocResult.alloc).forEach(function (id) {
      var dc = dcById(id); if (!dc) return;
      var a = allocResult.alloc[id];
      var weeklyRate = a.pallets / weeks;
      var storageDemand = a.pallets * slotFactor;
      var skuCount = skuCounts[id] || 0;
      var pickingBins = Math.ceil(skuCount / (settings.skusPerBin || 1));
      var utilization = dc.capacity > 0 ? ((dc.usedSlots || 0) + storageDemand) / dc.capacity : null;
      perDc.push({
        dcId: id, dcName: dc.name, active: dc.active !== false,
        pallets: a.pallets, qty: a.qty,
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
    var sevlievo = findDcByPattern(/sev.{0,2}liev/i);
    var saar = findDcByPattern(/saar|losheim|merzig|wittlich/i);
    var mapping = {}, warnings = [];
    function keep(dc) { if (dc) mapping[dc.id] = dc.id; }

    if (templateKey === 'central-eu-consolidation') {
      keep(bassano); keep(armitage); keep(sevlievo);
      var hub = saar || findDcByPattern(/dole|wroclaw|vda|valence/i);
      dcs.forEach(function (dc) {
        if (dc === bassano || dc === armitage || dc === sevlievo) return;
        mapping[dc.id] = hub ? hub.id : dc.id;
      });
      if (!hub) warnings.push('Kein Standort passend zu "Saar/Losheim/Wittlich" gefunden — bitte Ziel-DC für die Konsolidierung im Szenario-Editor wählen.');
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
  function countryAllocationForDistrict(district, topN) {
    topN = topN || S().settings.countryAllocationTopN || 10;
    var rows = districtCountryBreakdown(district);
    var total = U.sum(rows, function (r) { return Math.max(0, r.esu); });
    var top = rows.slice(0, topN).map(function (r) {
      return { unit: r.unit, share: total > 0 ? Math.max(0, r.esu) / total : 0, esu: r.esu };
    });
    var restEsu = 0;
    for (var i = topN; i < rows.length; i++) restEsu += Math.max(0, rows[i].esu);
    if (rows.length > topN && restEsu > 0) top.push({ unit: 'Rest', share: total > 0 ? restEsu / total : 0, esu: restEsu, isRest: true });
    return { district: district, rows: top, total: total };
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

  /* Proxy: each (DC, Article, Month) forecast line stands in for a dispatch line, since the
     source data has no order/delivery-line grain. */
  function avgShipmentSize(params) {
    var settings = params.settings || S().settings;
    var rows = filterForecast(params);
    var bounds = settings.shipmentClusterBounds || [1, 5];
    var clusters = [
      { label: '0,1–' + bounds[0].toFixed(1) + ' ESU', min: 0, max: bounds[0], count: 0, qtySum: 0 },
      { label: bounds[0].toFixed(1) + '–' + bounds[1].toFixed(1) + ' ESU', min: bounds[0], max: bounds[1], count: 0, qtySum: 0 },
      { label: '> ' + bounds[1].toFixed(1) + ' ESU', min: bounds[1], max: Infinity, count: 0, qtySum: 0 }
    ];
    var perDc = {}, totalQty = 0;
    rows.forEach(function (r) {
      totalQty += r.qty;
      for (var c = 0; c < clusters.length; c++) {
        if (r.qty > clusters[c].min && r.qty <= clusters[c].max) { clusters[c].count++; clusters[c].qtySum += r.qty; break; }
      }
      perDc[r.dc] = perDc[r.dc] || { count: 0, qtySum: 0 };
      perDc[r.dc].count++; perDc[r.dc].qtySum += r.qty;
    });
    var perDcOut = Object.keys(perDc).map(function (dcName) {
      var d = perDc[dcName];
      return { dcId: dcId(dcName), dcName: dcName, avg: d.count > 0 ? d.qtySum / d.count : null, lines: d.count };
    }).sort(function (a, b) { return (b.avg || 0) - (a.avg || 0); });
    return { europeAvg: rows.length > 0 ? totalQty / rows.length : null, totalLines: rows.length, totalQty: totalQty, clusters: clusters, perDc: perDcOut };
  }

  /* Proxy: a (DC, Month) bundle of forecast lines stands in for a shipment/delivery. */
  function shipmentComposition(params) {
    var settings = params.settings || S().settings;
    var rows = filterForecast(Object.assign({}, params, { category: 'all' }));
    var bundles = U.groupBy(rows, function (r) { return r.dc + '|' + r.periodKey; });
    var totalBundles = 0, tapsOnly = 0, mixed = 0, noTaps = 0;
    var perDc = {};
    Object.keys(bundles).forEach(function (key) {
      var lines = bundles[key];
      var dcName = lines[0].dc;
      var hasTaps = false, hasOther = false;
      lines.forEach(function (l) {
        if (isTapsCategory(l.category, settings.tapsKeywords)) hasTaps = true; else hasOther = true;
      });
      totalBundles++;
      var kind = (hasTaps && hasOther) ? 'mixed' : (hasTaps ? 'tapsOnly' : 'noTaps');
      if (kind === 'mixed') mixed++; else if (kind === 'tapsOnly') tapsOnly++; else noTaps++;
      perDc[dcName] = perDc[dcName] || { total: 0, tapsOnly: 0, mixed: 0, noTaps: 0 };
      perDc[dcName].total++; perDc[dcName][kind]++;
    });
    var perDcOut = Object.keys(perDc).map(function (dcName) {
      var p = perDc[dcName];
      return {
        dcId: dcId(dcName), dcName: dcName,
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
    { title: 'Paletten', formula: 'Paletten = Menge (ESU je Monat) ÷ Pallett Load (artikelspezifisch, aus dem Forecast)', note: 'Der Forecast liegt bereits je DC vor (nicht je Distrikt) — die Palettenzahl je DC ist damit exakt, keine Näherung.' },
    { title: 'Bedarf/Tag', formula: 'Bedarf/Tag = Σ Paletten ÷ Σ echte Tageslängen der Perioden im Filter' },
    { title: 'Ziel-Bestand (Lagerbedarf)', formula: 'Ziel-Bestand = Bedarf/Tag × 7 × Coverage(Wochen) × Sicherheitsaufschlag', note: 'Bei Kategorie "Alle" wird nicht ein einzelner globaler Coverage-Wert auf die Gesamtmenge angewandt: jede Kategorie wird mit ihrer eigenen (ggf. individuell hinterlegten) Ziel-Reichweite gerechnet und die Ergebnisse werden aufsummiert — sonst würde eine je Kategorie unterschiedliche Reichweite unbemerkt überschrieben.' },
    { title: 'Geografischer Fußabdruck je DC', formula: 'Distrikt-Anteil(DC) = Sales History ESU(DC, Distrikt) ÷ Sales History ESU(DC, alle Distrikte)', note: 'Aus den echten historischen Mengen der Sales History (Shipping Point → DC via DC Translation Table), nicht aus einer Kundenanzahl-Näherung. Nur die Distrikt-Ebene wird summiert — die feinere Land/Einheit-Ebene ist in denselben Zahlen bereits enthalten (Vermeidung von Doppelzählung).' },
    { title: 'Distrikt-Zentroid (Distanzgrundlage)', formula: 'Primär: mengengewichtetes Mittel echter Kundenkoordinaten (Destinations-ESU je Ship-to-Party × Ship-to-Address-Ort/Land); ersatzweise mengengewichtetes Mittel der Länder-Zentroide laut Sales Hierarchie/Sales History.', note: 'Destinations liefert je Versandpunkt die belieferten Ship-to-Parties mit echter ESU-Menge; Ship-to-Address liefert deren tatsächliches Land/Ort. Wo sich beide verknüpfen lassen, ist der Distrikt-Standort damit kundenscharf statt länderweit gemittelt — Quelle wird in Daten & Import je Distrikt angezeigt.' },
    { title: 'Distanz', formula: 'Distanz = Haversine(DC, Distrikt-Zentroid) × 1,28' },
    { title: '€ / Palette', formula: 'Regionspauschale, sonst Grundkosten + €/km × Distanz' },
    { title: 'Transit', formula: 'Transit = Handlingtage + Distanz ÷ km pro Tag' },
    { title: 'Kapazitäts-Score', formula: 'Auslastung ≤ Grenze: 100 − 50 × (Auslastung ÷ Grenze); Grenze…100%: 50 × (1 − (Auslastung − Grenze) ÷ (1 − Grenze)); darüber: 0' },
    { title: 'Transport-Score', formula: '100 × günstigste €/Palette im Bewerberfeld ÷ eigene €/Palette' },
    { title: 'Service-Score (Reichweite)', formula: '100 × (0,7 × Bestandsfähigkeit + 0,3 × Reaktionsfähigkeit)', note: 'Eigene, transparent dokumentierte Ausformulierung: Bestandsfähigkeit = relative Nähe der eigenen Transitzeit zur schnellsten im Bewerberfeld; Reaktionsfähigkeit = 1 − Transit ÷ (Coverage in Tagen), begrenzt auf [0,1].' },
    { title: 'Gesamt-Score', formula: 'Σ normierte Gewichte × Teil-Scores (Kapazität/Transport/Service)' },
    { title: 'Szenario-Konsolidierung', formula: 'Beim Zusammenlegen von DC X in DC Y wird der Distrikt-Fußabdruck von X (s.o.) 1:1 auf Y übertragen, gewichtet mit dem Forecast-Volumen von X.' },
    { title: 'SKU / Picking Bins je DC', formula: 'SKU-Anzahl = Anzahl unterschiedlicher Artikel im Forecast je DC; Picking Bins = ⌈SKU-Anzahl ÷ SKUs je Bin⌉' },
    { title: 'Ø Sendungsgröße', formula: 'Mittelwert von Forecast-Menge (ESU) je (DC, Artikel, Monat)-Zeile', note: 'Proxy für eine Sendung, da keine Auftrags-/Lieferpositionen vorliegen.' },
    { title: 'Sendungszusammensetzung', formula: 'Anteil (DC, Monat)-Bündel, die ausschließlich "Taps"-Kategorien enthalten vs. gemischt' }
  ];

  LNP.sim = {
    dcId: dcId, dcById: dcById, candidateDcs: candidateDcs, resolveCandidates: resolveCandidates,
    dcHintFor: dcHintFor,
    allDistricts: allDistricts, canonicalDistrictSet: canonicalDistrictSet, allCategories: allCategories, periodRange: periodRange,
    dcDistrictShares: dcDistrictShares, districtCountryBreakdown: districtCountryBreakdown, districtCentroid: districtCentroid,
    districtCustomerGeo: districtCustomerGeo, countryToDistrictMap: countryToDistrictMap,
    countryDisplayName: countryDisplayName,
    demandFor: demandFor, resolveCoverageWeeks: resolveCoverageWeeks,
    distanceKm: distanceKm, transportCostPerPallet: transportCostPerPallet, transitDaysFor: transitDaysFor,
    evaluateDC: evaluateDC,
    runSingle: runSingle, runSplit: runSplit, runManual: runManual, runAll: runAll, applyResult: applyResult,
    skuCountByDc: skuCountByDc, allocateToDcs: allocateToDcs, computeScenarioNetwork: computeScenarioNetwork,
    resolveTarget: resolveTarget, buildScenarioTemplate: buildScenarioTemplate, SCENARIO_TEMPLATES: SCENARIO_TEMPLATES,
    countryAllocationForDistrict: countryAllocationForDistrict, skuCountPerDcReport: skuCountPerDcReport,
    avgShipmentSize: avgShipmentSize, shipmentComposition: shipmentComposition,
    invalidateCaches: invalidateCaches, FORMULA_REFERENCE: FORMULA_REFERENCE
  };
})();
