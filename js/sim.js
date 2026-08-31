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
  /* Every Destinations row that joins to a Ship-to-address, resolved down to one real customer
     point (lat/lng, ESU weight, district). The raw material behind districtCustomerGeo's
     per-district centroid AND the scenario heatmap (scenarioCustomerHeatmapPoints), which needs
     the individual points rather than an already-averaged centroid to render at address-level
     precision. */
  function resolvedCustomerPoints() {
    if (_cache.resolvedCustomerPoints) return _cache.resolvedCustomerPoints;
    var idx = shipToIndex(), countryDistrict = countryToDistrictMap();
    var out = [];
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
      out.push({ lat: geo.lat, lng: geo.lng, weight: w, district: district, city: addr.city, country: addr.country, shipTo: shipToKey });
    });
    _cache.resolvedCustomerPoints = out;
    return out;
  }

  /* District -> ESU-weighted average of real Ship-to-address coordinates (city if resolvable,
     else the customer's own country) for every Destinations row that joins to an address. */
  function districtCustomerGeo() {
    if (_cache.districtCustomerGeo) return _cache.districtCustomerGeo;
    var acc = {};
    resolvedCustomerPoints().forEach(function (p) {
      acc[p.district] = acc[p.district] || { sumLat: 0, sumLng: 0, weight: 0, customers: 0 };
      acc[p.district].sumLat += p.lat * p.weight; acc[p.district].sumLng += p.lng * p.weight;
      acc[p.district].weight += p.weight; acc[p.district].customers++;
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

  var DAYS_PER_MONTH = 30.44;

  /* Ziel-Reichweite is configured in MONTHS (Daten & Import). */
  function resolveCoverageMonths(category, settings) {
    settings = settings || S().settings;
    if (category && category !== 'all' && settings.coverageMonthsByCategory && U.isNum(settings.coverageMonthsByCategory[category])) {
      return settings.coverageMonthsByCategory[category];
    }
    return settings.coverageMonthsGlobal;
  }
  /* The demand pipeline below (weeks/totalDays from demandFor) works in weeks — this converts
     the month-based setting into the equivalent number of weeks once, so the rest of the
     Bedarf/Tag x 7 x Coverage math doesn't need to change unit throughout. */
  function coverageWeeksEquivalent(category, settings) {
    return resolveCoverageMonths(category, settings) * DAYS_PER_MONTH / 7;
  }

  /* Ziel-Bestand = Bedarf/Tag x 7 x Coverage(Wochenäquivalent aus Monaten) x Sicherheitsaufschlag
     — exact when a single category is selected. With category:'all' (or unset) a single global
     coverage figure would silently ignore any per-category "Ziel-Reichweite" override configured
     in Daten & Import, so each category's own pallet volume is weighted by its OWN coverage
     setting and summed, instead of blending every category's pallets under one number. */
  function blendedStorageDemand(params, settings, totalPallets, weeks) {
    if (params.category && params.category !== 'all') {
      return (totalPallets / (weeks || 1)) * coverageWeeksEquivalent(params.category, settings) * (settings.stockFactor || 1);
    }
    var cats = allCategories();
    if (!cats.length) return (totalPallets / (weeks || 1)) * coverageWeeksEquivalent(null, settings) * (settings.stockFactor || 1);
    var sum = 0;
    cats.forEach(function (cat) {
      var d = demandFor(Object.assign({}, params, { category: cat }));
      var catPallets = totalPalletsOf(d);
      if (!catPallets) return;
      var catWeeks = d.totalDays / 7 || weeks || 1;
      sum += (catPallets / catWeeks) * coverageWeeksEquivalent(cat, settings) * (settings.stockFactor || 1);
    });
    return sum;
  }
  /* Ø slot-equivalent per pallet implied by blendedStorageDemand — lets DC/region-level pallet
     allocations (runSplit, runManual, computeScenarioNetwork) turn into storage-slot demand
     with a single multiplication while still honoring the per-category blend above. */
  function effectiveSlotFactor(params, settings, totalPallets, weeks) {
    return totalPallets > 0 ? blendedStorageDemand(params, settings, totalPallets, weeks) / totalPallets : 0;
  }

  /* ================= Sicherheitsbestand (pooling-aware safety stock) =================
     blendedStorageDemand/effectiveSlotFactor above give the CYCLE stock (Ø Menge x Reichweite)
     — a pure pipeline figure that is, by construction, the same total regardless of how many
     sites the same demand is split across. That is deliberate for cycle stock, but it means a
     "Ziel-Palettenbestand" built from cycle stock alone can never show the real-world effect
     where consolidating demand into fewer sites needs LESS total buffer stock than spreading it
     across many (classical safety-stock/risk-pooling): each additional site needs its own buffer
     against ITS OWN month-to-month variability, and variability doesn't simply add up 1:1 when
     summed across sites unless their demand is perfectly correlated.
     This adds that second, additive term: Sicherheitsbestand = z x sigma(monatliche Menge) x
     sqrt(Reichweite in Monaten) — the standard safety-stock formula, with sigma computed from
     the REAL observed month-to-month pallet totals for whatever demand actually lands at a given
     site (or, for a single "Alleinzuordnung" DC, the whole network's monthly series). Because
     sigma is computed directly from each site's own combined monthly series rather than added
     from independently-assumed per-district variances, the pooling benefit of consolidation
     falls out of the real data automatically — including showing zero benefit if the underlying
     demand really is perfectly correlated across sites (e.g. driven by the same seasonal plan). */
  function monthlySeriesFromRows(rows) {
    var out = {};
    rows.forEach(function (r) { out[r.periodKey] = (out[r.periodKey] || 0) + r.pallets; });
    return out;
  }
  function stdDevOfMap(map) {
    var values = Object.keys(map).map(function (k) { return map[k]; });
    var n = values.length;
    if (n < 2) return 0;
    var mean = U.sum(values, function (v) { return v; }) / n;
    var variance = U.sum(values, function (v) { return (v - mean) * (v - mean); }) / n;
    return Math.sqrt(variance);
  }
  function safetyStockPallets(monthlySeriesMap, coverageMonths, settings) {
    var z = U.isNum(settings.safetyZFactor) ? settings.safetyZFactor : 1;
    var sigma = stdDevOfMap(monthlySeriesMap || {});
    return z * sigma * Math.sqrt(Math.max(coverageMonths, 0));
  }
  /* District-level monthly series (each row's pallets fanned via dcDistrictShares, same as every
     other geographic split in this file), used to reconstruct an individual DC's own monthly
     series when it only receives a FRACTION of a district's pool (runSplit's district-greedy
     assignment) — that DC's period value = fraction-of-district-received x that district's own
     period value, summed over every district it receives a share of. Exact whenever a whole
     district goes to one DC (the common case); an assumption of proportionally-uniform-by-month
     splitting only where capacity constraints force a district to be split across DCs. */
  function districtMonthlySeries(rows) {
    var shares = dcDistrictShares();
    var out = {};
    rows.forEach(function (row) {
      var srcId = dcId(row.dc);
      var s = srcId ? shares[srcId] : null;
      if (s && Object.keys(s.shares).length) {
        Object.keys(s.shares).forEach(function (d) {
          out[d] = out[d] || {};
          out[d][row.periodKey] = (out[d][row.periodKey] || 0) + row.pallets * s.shares[d];
        });
      } else {
        var key = '(ohne Distrikt-Zuordnung)';
        out[key] = out[key] || {};
        out[key][row.periodKey] = (out[key][row.periodKey] || 0) + row.pallets;
      }
    });
    return out;
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
    var sScore = serviceScore(transit, ctx.bestTransit, ctx.worstTransit, coverageWeeksEquivalent(null, settings) * 7);
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
  function buildPart(dc, evald, share, pallets, slots, settings, stockBreakdown) {
    return {
      dcId: dc.id, dcName: dc.name, share: share, pallets: pallets, slots: slots,
      cycleStock: stockBreakdown ? stockBreakdown.cycle : null,
      safetyStock: stockBreakdown ? stockBreakdown.safety : null,
      skuCount: evald.skuCount, pickingBins: evald.pickingBins,
      utilization: evald.utilization, capacity: dc.capacity,
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
    var coverageWeeksEq = coverageWeeksEquivalent(params.category, settings);
    /* Alleinzuordnung = one DC holds the ENTIRE network's demand, so its safety stock is
       computed from the network's own combined monthly series (exact — no site-fraction
       reconstruction needed, unlike runSplit). */
    var cycleStock = blendedStorageDemand(params, settings, totalPallets, weeks);
    var safetyStock = safetyStockPallets(monthlySeriesFromRows(demand.rows), resolveCoverageMonths(params.category, settings), settings);
    var storageDemand = cycleStock + safetyStock;
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
      parts.push(buildPart(bestDc, best, 1, totalPallets, storageDemand, settings, { cycle: cycleStock, safety: safetyStock }));
    }
    var regions = Object.keys(districtPalletsMap).map(function (dist) {
      return { regionKey: dist, dcId: best ? best.dcId : null, pallets: districtPalletsMap[dist], distance: best ? distanceKm(dcById(best.dcId), dist) : null };
    });

    return {
      mode: 'single', category: params.category, dataset: params.dataset || 'forecast',
      periodFrom: params.periodFrom, periodTo: params.periodTo, targetDays: coverageWeeksEq * 7, createdAt: Date.now(),
      demand: { totalPallets: totalPallets, weeklyRate: totalPallets / weeks, totalDays: demand.totalDays, byDistrict: demand.byDistrict },
      ranking: results, recommended: best, parts: parts, regions: regions, warnings: warnings
    };
  }

  function runSplit(params) {
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var weeks = demand.totalDays / 7 || 1;
    var coverageWeeksEq = coverageWeeksEquivalent(params.category, settings);
    var skuCount = scopeSkuCount(demand.rows);
    var pickingBins = Math.ceil(skuCount / (settings.skusPerBin || 1));
    var candidates = resolveCandidates(params);
    /* No artificial cap by default — an "optimal" network strategy has to weigh every
       selected candidate DC against capacity/cost/transport, not just a handful of the
       cheapest-on-average ones. params.candidatePoolSize still lets a caller restrict the
       pool explicitly (e.g. for performance with a very large DC list). */
    var poolSize = params.candidatePoolSize || candidates.length || 1;
    var candidateIdSet = {};
    candidates.forEach(function (dc) { candidateIdSet[dc.id] = true; });
    var totalPallets = totalPalletsOf(demand);

    /* Redundancy-aware pre-routing (only meaningful when several DCs are candidates at once):
       the Artikel-Standortanalyse classifies each article as "zentral" (slow mover — stocking it
       at every site multiplies safety-stock overhead for volume that doesn't need more than one
       storage point), "regional" (strongly concentrated in one district) or "mehrere" (genuinely
       network-spread). Only "mehrere" volume — plus any zentral/regional article whose
       recommended DC isn't among the currently selected candidates — goes through the district
       greedy-assignment below; the rest is routed straight to its one recommended DC, so it never
       gets fragmented across multiple sites in the first place. */
    var artTarget = {};
    var analysis = articleLocationAnalysis({});
    analysis.rows.forEach(function (r) {
      if (r.recommendation === 'mehrere') return;
      if (r.recommendedDc && candidateIdSet[r.recommendedDc.id]) artTarget[r.article] = r.recommendedDc.id;
    });

    var shares = dcDistrictShares();
    var districtPalletsMapFull = {};
    var districtMonthlySeriesMap = {}; /* district -> {periodKey: pallets}, non-forced only */
    var forcedTotalByDc = {}, forcedDistrictByDc = {};
    var forcedMonthlyByDc = {}; /* dcId -> {periodKey: pallets}, exact */
    var consolidatedArticles = {}, consolidatedPallets = 0;
    function fanIntoDistricts(targetTotalMap, targetMonthlyMap, srcDcName, pallets, periodKey) {
      var srcId = srcDcName ? dcId(srcDcName) : null;
      var s = srcId ? shares[srcId] : null;
      if (s && Object.keys(s.shares).length) {
        Object.keys(s.shares).forEach(function (d) {
          var portion = pallets * s.shares[d];
          targetTotalMap[d] = (targetTotalMap[d] || 0) + portion;
          if (targetMonthlyMap) {
            targetMonthlyMap[d] = targetMonthlyMap[d] || {};
            targetMonthlyMap[d][periodKey] = (targetMonthlyMap[d][periodKey] || 0) + portion;
          }
        });
      } else {
        var key = '(ohne Distrikt-Zuordnung)';
        targetTotalMap[key] = (targetTotalMap[key] || 0) + pallets;
        if (targetMonthlyMap) {
          targetMonthlyMap[key] = targetMonthlyMap[key] || {};
          targetMonthlyMap[key][periodKey] = (targetMonthlyMap[key][periodKey] || 0) + pallets;
        }
      }
    }
    demand.rows.forEach(function (row) {
      var forcedId = artTarget[row.article];
      if (forcedId) {
        consolidatedArticles[row.article] = true;
        consolidatedPallets += row.pallets;
        forcedTotalByDc[forcedId] = (forcedTotalByDc[forcedId] || 0) + row.pallets;
        forcedDistrictByDc[forcedId] = forcedDistrictByDc[forcedId] || {};
        fanIntoDistricts(forcedDistrictByDc[forcedId], null, row.dc, row.pallets, row.periodKey);
        forcedMonthlyByDc[forcedId] = forcedMonthlyByDc[forcedId] || {};
        forcedMonthlyByDc[forcedId][row.periodKey] = (forcedMonthlyByDc[forcedId][row.periodKey] || 0) + row.pallets;
        return;
      }
      fanIntoDistricts(districtPalletsMapFull, districtMonthlySeriesMap, row.dc, row.pallets, row.periodKey);
    });

    var quickScored = candidates.map(function (dc) { return { dc: dc, cpp: avgTransportCostPerPallet(dc, districtPalletsMapFull, settings) }; })
      .filter(function (x) { return x.cpp !== null; });
    quickScored.sort(function (a, b) { return a.cpp - b.cpp; });
    var pool = quickScored.slice(0, poolSize).map(function (x) { return x.dc; });
    if (!pool.length) pool = candidates.slice(0, poolSize);

    var slotFactor = effectiveSlotFactor(params, settings, totalPallets, weeks);
    var remainingCapacity = {};
    pool.forEach(function (dc) { remainingCapacity[dc.id] = Math.max(0, (dc.capacity || 0) - (dc.usedSlots || 0)); });
    /* Capacity already committed to the forced (redundancy-avoided) consolidation above must be
       reserved before the greedy district assignment below spends the same slots twice. */
    Object.keys(forcedTotalByDc).forEach(function (id) {
      if (remainingCapacity[id] !== undefined) remainingCapacity[id] = Math.max(0, remainingCapacity[id] - forcedTotalByDc[id] * slotFactor);
    });

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
    /* Merge in the forced (redundancy-avoided) consolidation — still tagged with its real
       geographic origin (fanned via Sales History same as everything else) purely so
       transport-cost/transit averaging for that DC stays representative; it's never split
       across multiple DCs the way the greedy district assignment above would have. */
    Object.keys(forcedTotalByDc).forEach(function (id) {
      perDc[id] = perDc[id] || { pallets: 0, districtPalletsMap: {} };
      perDc[id].pallets += forcedTotalByDc[id];
      Object.keys(forcedDistrictByDc[id]).forEach(function (d) {
        perDc[id].districtPalletsMap[d] = (perDc[id].districtPalletsMap[d] || 0) + forcedDistrictByDc[id][d];
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

    /* Each DC's own combined monthly series (forced-exact + district-fraction reconstruction),
       used only for the pooling-aware safety-stock term below — this is what makes
       Ziel-Palettenbestand actually respond to consolidation (see safetyStockPallets doc). */
    var coverageMonthsForSafety = resolveCoverageMonths(params.category, settings);
    var dcMonthlySeries = {};
    Object.keys(districtAssignment).forEach(function (district) {
      var districtTotal = districtPalletsMapFull[district];
      if (!districtTotal) return;
      var series = districtMonthlySeriesMap[district] || {};
      Object.keys(districtAssignment[district]).forEach(function (id) {
        var fraction = districtAssignment[district][id] / districtTotal;
        dcMonthlySeries[id] = dcMonthlySeries[id] || {};
        Object.keys(series).forEach(function (pk) {
          dcMonthlySeries[id][pk] = (dcMonthlySeries[id][pk] || 0) + fraction * series[pk];
        });
      });
    });
    Object.keys(forcedMonthlyByDc).forEach(function (id) {
      dcMonthlySeries[id] = dcMonthlySeries[id] || {};
      Object.keys(forcedMonthlyByDc[id]).forEach(function (pk) {
        dcMonthlySeries[id][pk] = (dcMonthlySeries[id][pk] || 0) + forcedMonthlyByDc[id][pk];
      });
    });

    var parts = [];
    Object.keys(perDc).forEach(function (id) {
      var dc = dcById(id);
      var dcCycleStock = perDc[id].pallets * slotFactor;
      var dcSafetyStock = safetyStockPallets(dcMonthlySeries[id], coverageMonthsForSafety, settings);
      var slots = dcCycleStock + dcSafetyStock;
      var ctx = {
        settings: settings, districtPalletsMap: perDc[id].districtPalletsMap,
        storageDemandPallets: slots, skuCount: skuCount, pickingBins: pickingBins,
        cheapestCpp: cheapestCpp, bestTransit: bestTransit, worstTransit: worstTransit
      };
      var evald = evaluateDC(dc, ctx);
      parts.push(buildPart(dc, evald, totalPallets > 0 ? perDc[id].pallets / totalPallets : 0, perDc[id].pallets, slots, settings, { cycle: dcCycleStock, safety: dcSafetyStock }));
    });
    parts.sort(function (a, b) { return b.pallets - a.pallets; });

    var regions = Object.keys(districtAssignment).map(function (district) {
      var assigns = districtAssignment[district];
      var bestId = Object.keys(assigns).sort(function (a, b) { return assigns[b] - assigns[a]; })[0];
      return { regionKey: district, dcId: bestId, pallets: assigns[bestId], distance: distanceKm(dcById(bestId), district) };
    });

    return {
      mode: 'split', category: params.category, dataset: params.dataset || 'forecast',
      periodFrom: params.periodFrom, periodTo: params.periodTo, targetDays: coverageWeeksEq * 7, createdAt: Date.now(),
      demand: { totalPallets: totalPallets, weeklyRate: totalPallets / weeks, totalDays: demand.totalDays, byDistrict: demand.byDistrict },
      parts: parts, regions: regions, recommended: null,
      redundancy: { articleCount: Object.keys(consolidatedArticles).length, pallets: consolidatedPallets },
      warnings: parts.some(function (p) { return !p.feasible; }) ? ['Mindestens ein Standort überschreitet die Kapazitätsgrenze.'] : []
    };
  }

  function runManual(params, shareMap) {
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var weeks = demand.totalDays / 7 || 1;
    var coverageWeeksEq = coverageWeeksEquivalent(params.category, settings);
    var skuCount = scopeSkuCount(demand.rows);
    var pickingBins = Math.ceil(skuCount / (settings.skusPerBin || 1));
    var districtPalletsMapFull = {};
    Object.keys(demand.byDistrict).forEach(function (d) { districtPalletsMapFull[d] = demand.byDistrict[d].pallets; });
    var totalPallets = totalPalletsOf(demand);
    var slotFactor = effectiveSlotFactor(params, settings, totalPallets, weeks);
    var coverageMonthsForSafety = resolveCoverageMonths(params.category, settings);
    /* Manual mode splits every period by the same flat percentage (no district reasoning), so
       each DC's own monthly series is simply that share of the network's combined monthly
       series — consistent with how its pallets/districtPalletsMap are already scaled below. */
    var networkMonthly = monthlySeriesFromRows(demand.rows);
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
      var dcMonthly = {};
      Object.keys(networkMonthly).forEach(function (pk) { dcMonthly[pk] = networkMonthly[pk] * shareMap[id]; });
      var dcCycleStock = pallets * slotFactor;
      var dcSafetyStock = safetyStockPallets(dcMonthly, coverageMonthsForSafety, settings);
      var slots = dcCycleStock + dcSafetyStock;
      var scaledMap = {};
      Object.keys(districtPalletsMapFull).forEach(function (dist) { scaledMap[dist] = districtPalletsMapFull[dist] * shareMap[id]; });
      var ctx = {
        settings: settings, districtPalletsMap: scaledMap, storageDemandPallets: slots,
        skuCount: skuCount, pickingBins: pickingBins, cheapestCpp: cheapestCpp, bestTransit: bestTransit, worstTransit: worstTransit
      };
      var evald = evaluateDC(dc, ctx);
      return buildPart(dc, evald, shareMap[id], pallets, slots, settings, { cycle: dcCycleStock, safety: dcSafetyStock });
    });

    var regions = Object.keys(districtPalletsMapFull).map(function (district) {
      var top = ids.slice().sort(function (a, b) { return shareMap[b] - shareMap[a]; })[0];
      return { regionKey: district, dcId: top || null, pallets: districtPalletsMapFull[district], distance: top ? distanceKm(dcById(top), district) : null };
    });

    return {
      mode: 'manual', category: params.category, dataset: params.dataset || 'forecast',
      periodFrom: params.periodFrom, periodTo: params.periodTo, targetDays: coverageWeeksEq * 7, createdAt: Date.now(),
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
     future-state assignment, and more reliable than SKU_View's historical, heavily-masked data.
     A simulation-based Szenario (scenario.simParams, see runScenarioSimulation) has no dcMapping
     to resolve rows through — instead every article's own Artikel-Standortanalyse recommendation
     is reused, restricted to that scenario's candidate DCs, so this stays "verlinkt" with the
     same classification the Simulation's redundancy routing and the Artikel-Standortanalyse
     report already use. "mehrere" (network-spread) articles are counted at every candidate DC of
     the scenario — an honest approximation, since their demand genuinely has no single site. */
  function skuCountByDc(scenario) {
    if (scenario && scenario.simParams) {
      var candidateIds = scenarioCandidateDcIds(scenario);
      var candidateSet = {};
      candidateIds.forEach(function (id) { candidateSet[id] = true; });
      var analysis = articleLocationAnalysis({ candidateDcIds: candidateIds });
      var groupsSim = {};
      analysis.rows.forEach(function (r) {
        if (r.recommendation === 'mehrere') {
          candidateIds.forEach(function (id) { groupsSim[id] = groupsSim[id] || {}; groupsSim[id][r.article] = true; });
        } else if (r.recommendedDc) {
          groupsSim[r.recommendedDc.id] = groupsSim[r.recommendedDc.id] || {};
          groupsSim[r.recommendedDc.id][r.article] = true;
        }
      });
      var countsSim = {};
      for (var sid in groupsSim) if (groupsSim.hasOwnProperty(sid)) countsSim[sid] = Object.keys(groupsSim[sid]).length;
      return countsSim;
    }
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

  /* The set of DC ids a Szenario ultimately keeps in play — used to scope both skuCountByDc's
     simulation branch and any report that should reflect "what's left after this scenario":
     for a simulation-based Szenario, its own selected candidates (or all active DCs if it ran
     unrestricted); for a dcMapping-based Szenario (template/custom), the distinct TARGET ids
     the mapping resolves to (the sites that survive consolidation). null = no scenario, i.e.
     "current state" / all active DCs, unrestricted. */
  function scenarioCandidateDcIds(scenario) {
    if (!scenario) return null;
    if (scenario.simParams) {
      var ids = scenario.simParams.candidateDcIds;
      return (ids && ids.length) ? ids : candidateDcs().map(function (d) { return d.id; });
    }
    if (scenario.dcMapping) {
      var targets = {};
      Object.keys(scenario.dcMapping).forEach(function (src) { targets[resolveTarget(scenario.dcMapping, src)] = true; });
      return Object.keys(targets);
    }
    return null;
  }

  /* Which DC dominantly SUPPLIES each district today, from Sales History's real ESU volume
     (dcDistrictShares, inverted from DC->district to district->DC) — the "current state" a
     scenario's district->DC map falls back to when the district isn't covered by a scenario's
     own routing. */
  function districtDominantSourceDc() {
    if (_cache.districtDominantSourceDc) return _cache.districtDominantSourceDc;
    var shares = dcDistrictShares();
    var byDistrict = {};
    Object.keys(shares).forEach(function (sourceDcId) {
      var s = shares[sourceDcId];
      Object.keys(s.shares).forEach(function (district) {
        var esu = s.shares[district] * s.totalEsu;
        byDistrict[district] = byDistrict[district] || {};
        byDistrict[district][sourceDcId] = (byDistrict[district][sourceDcId] || 0) + esu;
      });
    });
    var out = {};
    Object.keys(byDistrict).forEach(function (district) {
      var best = null, bestEsu = -1;
      Object.keys(byDistrict[district]).forEach(function (candidateId) {
        if (byDistrict[district][candidateId] > bestEsu) { bestEsu = byDistrict[district][candidateId]; best = candidateId; }
      });
      out[district] = best;
    });
    _cache.districtDominantSourceDc = out;
    return out;
  }

  /* District -> serving DC id under a given Szenario (or the current state if scenario is
     null/unsaved) — the join point between "which DC serves which district" and the address-level
     customer points from resolvedCustomerPoints(), used to color the Szenarien heatmap by DC.
     Simulation-based Szenarien already compute this directly (runScenarioSimulation's own
     district fan-out, `.regions`); dcMapping-based (template/custom) and the base/no-scenario
     case reuse the same real-volume dominant-source-DC per district (districtDominantSourceDc),
     routed through the scenario's own regionOverrides/dcMapping exactly like allocateToDcs does. */
  function scenarioDistrictToDc(scenario) {
    var map = {};
    if (scenario && scenario.simParams) {
      var simResult = runScenarioSimulation(scenario);
      simResult.regions.forEach(function (r) { if (r.dcId) map[r.regionKey] = r.dcId; });
      return map;
    }
    var dominant = districtDominantSourceDc();
    var mapping = (scenario && scenario.dcMapping) || {};
    var overrides = (scenario && scenario.regionOverrides) || {};
    Object.keys(dominant).forEach(function (district) {
      var srcId = dominant[district];
      if (!srcId) return;
      var target = overrides[district] || resolveTarget(mapping, srcId);
      if (target) map[district] = target;
    });
    return map;
  }

  /* Real, address-level heatmap points for the Szenarien view: every resolved customer point
     (resolvedCustomerPoints — Destinations x Ship-to-address, real coordinates, real ESU weight)
     tagged with the DC that serves its district under the given Szenario. Precision comes from
     using the individual customer point, not a per-district centroid — the district is only used
     to look up which DC serves it, never to blur the point's own location. */
  function scenarioCustomerHeatmapPoints(scenario) {
    var districtDc = scenarioDistrictToDc(scenario);
    return resolvedCustomerPoints().map(function (p) {
      return { lat: p.lat, lng: p.lng, weight: p.weight, district: p.district, dcId: districtDc[p.district] || null };
    });
  }

  /* Re-runs the actual Simulation (runSingle/runSplit/runManual) from a saved scenario's stored
     parameters, rather than approximating it as a static DC-to-DC mapping — a simulation's
     allocation (district fan-out, redundancy-aware article routing, capacity-constrained greedy
     assignment) isn't representable as a simple mapping without losing exactly the precision the
     Simulation was built for. Always evaluated against the CURRENT global settings (coverage,
     stock factor, weights aren't re-read from the scenario beyond what's explicitly stored),
     consistent with every other report already re-evaluating live on settings changes. */
  function runScenarioSimulation(scenario, overrideParams) {
    var sp = scenario.simParams;
    var baseSettings = (overrideParams && overrideParams.settings) || S().settings;
    var settings = Object.assign({}, baseSettings, {
      weights: sp.weights || baseSettings.weights,
      maxUtilization: U.isNum(sp.maxUtilization) ? sp.maxUtilization : baseSettings.maxUtilization
    });
    var params = {
      /* The scenario's OWN saved category filter is authoritative — a scenario simulated for a
         single category should keep reproducing exactly that when reused (Szenarien-Vergleich
         always calls with category:'all', which must not silently override it). */
      category: sp.category || (overrideParams && overrideParams.category) || 'all',
      dataset: 'forecast',
      periodFrom: U.isNum(sp.periodFrom) ? sp.periodFrom : null,
      periodTo: U.isNum(sp.periodTo) ? sp.periodTo : null,
      settings: settings,
      candidateDcIds: sp.candidateDcIds || []
    };
    if (sp.mode === 'single') return runSingle(params);
    if (sp.mode === 'manual') return runManual(params, sp.manualShares || {});
    return runSplit(params);
  }

  /* Adapts a Simulation result's `parts` (see buildPart) into computeScenarioNetwork's `perDc`
     shape, so every existing consumer (Szenarien-Vergleich, Paletten-/Lagerbedarf je DC) works
     unchanged whether a Szenario is simulation-based or the older dcMapping-based kind. */
  function networkFromSimResult(scenario, simResult, params) {
    var weeks = simResult.demand.totalDays / 7 || 1;
    var perDc = simResult.parts.map(function (p) {
      return {
        dcId: p.dcId, dcName: p.dcName, active: true,
        pallets: p.pallets, qty: 0,
        weeklyRate: weeks > 0 ? p.pallets / weeks : 0, storageDemandPallets: p.slots,
        utilization: p.utilization, capacity: p.capacity,
        skuCount: p.skuCount, pickingBins: p.pickingBins, districts: null
      };
    });
    perDc.sort(function (a, b) { return b.pallets - a.pallets; });
    var settings = (params && params.settings) || S().settings;
    return {
      scenarioId: scenario.id, scenarioName: scenario.name,
      totalPallets: U.sum(perDc, function (x) { return x.pallets; }),
      totalQty: 0,
      unassignedPallets: 0,
      coverageMonths: resolveCoverageMonths((params && params.category) || scenario.simParams.category, settings),
      perDc: perDc, totalDays: simResult.demand.totalDays, weeks: weeks
    };
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
    if (scenario && scenario.simParams) {
      return networkFromSimResult(scenario, runScenarioSimulation(scenario, params), params);
    }
    var settings = params.settings || S().settings;
    var demand = demandFor(params);
    var allocResult = allocateToDcs(demand, scenario);
    var weeks = demand.totalDays / 7 || 1;
    var skuCounts = skuCountByDc(scenario);
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
      coverageMonths: resolveCoverageMonths(params.category, settings), perDc: perDc, totalDays: demand.totalDays, weeks: weeks
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

  function skuCountPerDcReport(scenario) {
    var counts = skuCountByDc(scenario || null);
    var dcIds = scenarioCandidateDcIds(scenario) || candidateDcs().map(function (d) { return d.id; });
    return dcIds.map(function (id) {
      var dc = dcById(id);
      if (!dc) return null;
      var n = counts[id] || 0;
      return { dcId: dc.id, dcName: dc.name, skuCount: n, pickingBins: Math.ceil(n / (S().settings.skusPerBin || 1)) };
    }).filter(function (x) { return x; }).sort(function (a, b) { return b.skuCount - a.skuCount; });
  }

  /* ================= Article-level location & turnover analysis =================
     SKU View has no district dimension of its own (only Shipping Point x Article x ESU), so its
     volume is fanned into districts using the SAME DC<->District shares Sales History already
     established (dcDistrictShares — the real historical footprint, not a proxy). This turns "how
     is this article's demand spread across the network" into a real, ESU-weighted answer, which
     is what a stocking-location decision actually needs — not just an aggregate, article-blind
     network score. */
  function articleDistrictBreakdown() {
    if (_cache.articleDistrictBreakdown) return _cache.articleDistrictBreakdown;
    var spMap = shippingPointDcMap();
    var shares = dcDistrictShares();
    var out = {};
    S().data.skus.forEach(function (r) {
      if (!r.article) return;
      var esu = Math.max(0, r.qtyEsu || 0);
      if (!esu) return;
      var dcName = r.shippingPoint ? spMap[r.shippingPoint] : null;
      var id = dcName ? dcId(dcName) : null;
      var s = id ? shares[id] : null;
      out[r.article] = out[r.article] || { totalEsu: 0, byDistrict: {}, articleName: null };
      if (r.articleName && !out[r.article].articleName) out[r.article].articleName = r.articleName;
      if (s && Object.keys(s.shares).length) {
        Object.keys(s.shares).forEach(function (d) {
          var portion = esu * s.shares[d];
          out[r.article].byDistrict[d] = (out[r.article].byDistrict[d] || 0) + portion;
          out[r.article].totalEsu += portion;
        });
      } else {
        var key = '(ohne Distrikt-Zuordnung)';
        out[r.article].byDistrict[key] = (out[r.article].byDistrict[key] || 0) + esu;
        out[r.article].totalEsu += esu;
      }
    });
    _cache.articleDistrictBreakdown = out;
    return out;
  }

  /* The candidate DC that historically already serves a district most (by Sales-History share);
     falls back to the geographically nearest candidate when Sales History has no coverage there.
     candidateIdSet (optional): restrict the search to these DC ids — used when a Szenario is
     selected (see scenarioCandidateDcIds) so the recommendation reflects the surviving/candidate
     DCs of THAT scenario, not the whole active network. */
  function bestDcForDistrict(district, candidateIdSet) {
    var shares = dcDistrictShares();
    var best = null, bestShare = -1;
    Object.keys(shares).forEach(function (id) {
      if (candidateIdSet && !candidateIdSet[id]) return;
      var s = shares[id].shares[district];
      if (s !== undefined && s > bestShare) { bestShare = s; best = id; }
    });
    if (best) return dcById(best);
    var candidates = candidateIdSet ? Object.keys(candidateIdSet).map(dcById).filter(function (d) { return d; }) : candidateDcs();
    var bestDc = null, bestDist = Infinity;
    candidates.forEach(function (dc) {
      var d = distanceKm(dc, district);
      if (d !== null && d < bestDist) { bestDist = d; bestDc = dc; }
    });
    return bestDc;
  }

  /* Per article: total volume (turnover proxy), which district it concentrates in (if any), and
     a stocking recommendation combining both — a classic ABC/regional-pattern read, not a single
     network-wide "best site" that treats every article the same:
       - "zentral": bottom of the ABC volume ranking (C-class, last 5% of cumulative volume) — a
         slow mover multiplies safety-stock overhead at every extra site it's stocked at, without
         a matching service-level payoff, so it belongs at one hub location regardless of its
         regional pattern.
       - "regional": a single district accounts for >= minShareForRegional of the article's volume
         — a genuine regional concentration, worth stocking close to that demand.
       - "mehrere": everything else — real volume, but spread across the network with no dominant
         region, so multi-site (or network-wide) stocking is the sensible default. */
  function articleLocationAnalysis(params) {
    params = params || {};
    var minShareForRegional = U.isNum(params.minShareForRegional) ? params.minShareForRegional : 0.6;
    var candidateIdSet = null;
    if (params.candidateDcIds && params.candidateDcIds.length) {
      candidateIdSet = {};
      params.candidateDcIds.forEach(function (id) { candidateIdSet[id] = true; });
    }
    var cacheKey = 'articleLocationAnalysis:' + minShareForRegional + ':' +
      (params.candidateDcIds ? params.candidateDcIds.slice().sort().join(',') : 'all');
    if (_cache[cacheKey]) return _cache[cacheKey];
    var breakdown = articleDistrictBreakdown();
    var rows = Object.keys(breakdown).map(function (article) {
      var b = breakdown[article];
      var top = null, topEsu = -1;
      Object.keys(b.byDistrict).forEach(function (d) {
        if (d === '(ohne Distrikt-Zuordnung)') return;
        if (b.byDistrict[d] > topEsu) { topEsu = b.byDistrict[d]; top = d; }
      });
      var topShare = (b.totalEsu > 0 && top) ? topEsu / b.totalEsu : 0;
      return { article: article, articleName: b.articleName, totalEsu: b.totalEsu, topDistrict: top, topShare: topShare, byDistrict: b.byDistrict };
    });
    rows.sort(function (a, b) { return b.totalEsu - a.totalEsu; });

    var grandTotal = U.sum(rows, function (r) { return r.totalEsu; });
    var cum = 0;
    rows.forEach(function (r) {
      cum += r.totalEsu;
      var cumShare = grandTotal > 0 ? cum / grandTotal : 0;
      r.abcClass = cumShare <= 0.8 ? 'A' : cumShare <= 0.95 ? 'B' : 'C';
    });

    var networkHubId = null, networkHubVol = -1;
    var sharesAll = dcDistrictShares();
    Object.keys(sharesAll).forEach(function (id) {
      if (candidateIdSet && !candidateIdSet[id]) return;
      if (sharesAll[id].totalEsu > networkHubVol) { networkHubVol = sharesAll[id].totalEsu; networkHubId = id; }
    });
    var networkHubDc = networkHubId ? dcById(networkHubId) : null;

    rows.forEach(function (r) {
      if (r.abcClass === 'C') {
        r.recommendation = 'zentral';
        r.recommendedDc = networkHubDc;
        r.reason = 'Geringe Drehung (C-Artikel, unterste 5 % der kumulierten Menge) — Streuung auf mehrere Standorte würde den Sicherheitsbestand vervielfachen, ohne den Servicegrad spürbar zu verbessern.';
      } else if (r.topDistrict && r.topShare >= minShareForRegional) {
        r.recommendation = 'regional';
        r.recommendedDc = bestDcForDistrict(r.topDistrict, candidateIdSet);
        r.reason = Math.round(r.topShare * 100) + ' % des Volumens entfällt auf ' + r.topDistrict + ' — starker regionaler Zusammenhang.';
      } else {
        r.recommendation = 'mehrere';
        r.recommendedDc = null;
        r.reason = 'Nachfrage ist netzweit verteilt, kein Distrikt dominiert — Lagerung an mehreren Standorten sinnvoll.';
      }
    });
    var result = { rows: rows, grandTotal: grandTotal, networkHubDc: networkHubDc, minShareForRegional: minShareForRegional };
    _cache[cacheKey] = result;
    return result;
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
    { title: 'Paletten', formula: 'Paletten = Menge (Stück je Monat, Spalten L–AI im Forecast-File) ÷ Pallett Load (artikelspezifisch, aus dem Forecast)', note: 'Der Forecast liegt bereits je DC vor (nicht je Distrikt) — die Palettenzahl je DC ist damit exakt, keine Näherung. Fehlt die Pallett Load für einen Artikel im Quellfile (reale Daten: ca. 28 % der Menge, meist Kleinteile/Ersatzteile), wird ersatzweise der Median-Wert der Produkt(unter)gruppe angesetzt, statt die Menge mit 0 Paletten zu verlieren — betroffene Importe werden im Upload-Dialog als Warnung ausgewiesen.' },
    { title: 'Bedarf/Tag', formula: 'Bedarf/Tag = Σ Paletten ÷ Σ echte Tageslängen der Perioden im Filter' },
    { title: 'Ziel-Palettenbestand', formula: 'Ziel-Palettenbestand = Zyklusbestand + Sicherheitsbestand', note: 'Zwei getrennte Bestandteile, siehe unten. Bei Kategorie "Alle" wird für den Zyklusbestand nicht ein einzelner globaler Coverage-Wert auf die Gesamtmenge angewandt: jede Kategorie wird mit ihrer eigenen (ggf. individuell hinterlegten) Ziel-Reichweite gerechnet und die Ergebnisse werden aufsummiert — sonst würde eine je Kategorie unterschiedliche Reichweite unbemerkt überschrieben.' },
    { title: 'Zyklusbestand', formula: 'Zyklusbestand = Bedarf/Tag × 30,44 × Reichweite(Monate) × Sicherheitsaufschlag', note: 'Reine Durchlaufmenge (Ø Menge im Zeitraum × Reichweite) — bei gleicher Gesamtmenge unabhängig davon, auf wie viele Standorte sie verteilt wird. Reichweite wird in Monaten gepflegt (30,44 Tage/Monat, mittlere Monatslänge).' },
    { title: 'Sicherheitsbestand', formula: 'Sicherheitsbestand(Standort) = z × σ(monatliche Palettenmenge am Standort) × √Reichweite(Monate)', note: 'Klassische Sicherheitsbestandsformel. σ wird direkt aus der monatlichen Ist-Verteilung der tatsächlich an diesem Standort landenden Menge berechnet (nicht aus einer angenommenen Kennzahl) — dadurch sinkt der GESAMTE Sicherheitsbestand automatisch, wenn Nachfrage auf weniger Standorte konsolidiert wird (Pooling-Effekt), und steigt bei Aufteilung auf mehr Standorte, sofern die Monatsmengen nicht perfekt korreliert sind. z ist der einstellbare "Sicherheits-Faktor" (Daten & Import → Mengenlogik; z=1 ≈ 84 %, z=1,65 ≈ 95 % Servicegrad, Normalverteilung angenommen).' },
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
    { title: 'Sendungszusammensetzung', formula: 'Anteil (DC, Monat)-Bündel, die ausschließlich "Taps"-Kategorien enthalten vs. gemischt' },
    { title: 'Artikel-Standortanalyse', formula: 'Je Artikel: SKU-View-Volumen über Sales-History-Distrikt-Anteile (s. Geografischer Fußabdruck je DC) auf Distrikte verteilt. ABC-Klasse = kumulierte Mengen-Rangfolge über alle Artikel (80/15/5-Grenzen). Empfehlung: "Zentral" wenn C-Klasse (unterste 5 % der kumulierten Menge); sonst "Regional" wenn ein Distrikt ≥ Schwellwert (einstellbar) des Artikelvolumens auf sich vereint, empfohlenes DC = laut Sales History stärkster Versorger dieses Distrikts; sonst "Mehrere Standorte".' },
    { title: 'Szenario-Heatmap (adressgenau)', formula: 'Jeder Ship-to-Kunde aus Destinations × Ship-to-Address (siehe Distrikt-Zentroid) einzeln, eingefärbt nach dem DC, das seinen Distrikt unter dem gewählten Szenario versorgt.', note: 'Simulationsbasierte Szenarien: Zuordnung direkt aus der Simulation. Andere Szenarien/aktueller Stand: der laut Sales History mengenmäßig dominante Quell-DC je Distrikt, ggf. über eine regionale Override-Zuordnung umgeleitet.' }
  ];

  LNP.sim = {
    dcId: dcId, dcById: dcById, candidateDcs: candidateDcs, resolveCandidates: resolveCandidates,
    dcHintFor: dcHintFor,
    allDistricts: allDistricts, canonicalDistrictSet: canonicalDistrictSet, allCategories: allCategories, periodRange: periodRange,
    dcDistrictShares: dcDistrictShares, districtCountryBreakdown: districtCountryBreakdown, districtCentroid: districtCentroid,
    districtCustomerGeo: districtCustomerGeo, countryToDistrictMap: countryToDistrictMap,
    resolvedCustomerPoints: resolvedCustomerPoints, scenarioDistrictToDc: scenarioDistrictToDc,
    scenarioCustomerHeatmapPoints: scenarioCustomerHeatmapPoints,
    countryDisplayName: countryDisplayName,
    demandFor: demandFor, resolveCoverageMonths: resolveCoverageMonths,
    distanceKm: distanceKm, transportCostPerPallet: transportCostPerPallet, transitDaysFor: transitDaysFor,
    evaluateDC: evaluateDC,
    runSingle: runSingle, runSplit: runSplit, runManual: runManual, runAll: runAll, applyResult: applyResult,
    skuCountByDc: skuCountByDc, allocateToDcs: allocateToDcs, computeScenarioNetwork: computeScenarioNetwork,
    scenarioCandidateDcIds: scenarioCandidateDcIds, runScenarioSimulation: runScenarioSimulation,
    resolveTarget: resolveTarget, buildScenarioTemplate: buildScenarioTemplate, SCENARIO_TEMPLATES: SCENARIO_TEMPLATES,
    countryAllocationForDistrict: countryAllocationForDistrict, skuCountPerDcReport: skuCountPerDcReport,
    articleLocationAnalysis: articleLocationAnalysis, bestDcForDistrict: bestDcForDistrict,
    avgShipmentSize: avgShipmentSize, shipmentComposition: shipmentComposition,
    invalidateCaches: invalidateCaches, FORMULA_REFERENCE: FORMULA_REFERENCE
  };
})();
