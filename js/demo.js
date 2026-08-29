/* NetPlan+ demo.js — synthetic demo data modeled on the real SAP-BI export structure (DC-native
   Forecast, Sales History linking Shipping Point/District with real ESU volume, Sales Hierarchie
   district/unit hierarchy, Destinations/Ship-to-address), so the tool can be tried before any
   upload (spec §19: "Ein Demodatensatz zahlt sich ab Schritt 4 aus"). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util;

  function rng(seed) {
    var s = seed;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  var DCS = [
    { name: 'Bassano', shippingPoint: 'IT01', country: 'IT', lat: 45.77, lng: 11.73 },
    { name: 'Armitage', shippingPoint: 'UK40', country: 'GB', lat: 52.73, lng: -1.80 },
    { name: 'Sevelievo', shippingPoint: 'BG12', country: 'BG', lat: 43.03, lng: 25.11 },
    { name: 'Wittlich', shippingPoint: 'GE14', country: 'DE', lat: 49.99, lng: 6.89 },
    { name: 'Losheim', shippingPoint: '0027', country: 'DE', lat: 49.52, lng: 6.75 },
    { name: 'Dole', shippingPoint: 'FR30', country: 'FR', lat: 47.09, lng: 5.49 },
    { name: 'Wroclaw', shippingPoint: 'PL10', country: 'PL', lat: 51.11, lng: 17.04 },
    { name: "Valence d' Agen", shippingPoint: 'FR40', country: 'FR', lat: 44.13, lng: 0.91 }
  ];

  var HIERARCHY = [
    { districtCode: 'Z1001', district: 'DACH', code: 'XD01', unit: 'Germany Total' },
    { districtCode: 'Z1001', district: 'DACH', code: 'Z1200', unit: 'Austria' },
    { districtCode: 'Z1001', district: 'DACH', code: 'Z1300', unit: 'Switzerland' },
    { districtCode: 'Z2001', district: 'UK / IR', code: 'Z3300', unit: 'GB' },
    { districtCode: 'Z2001', district: 'UK / IR', code: 'Z3311', unit: 'Ireland' },
    { districtCode: 'Z2000', district: 'Western Europe', code: 'Z2100', unit: 'France' },
    { districtCode: 'Z2000', district: 'Western Europe', code: 'Z3141', unit: 'Belgium/Luxemburg' },
    { districtCode: 'Z2000', district: 'Western Europe', code: 'Z3600', unit: 'Netherlands' },
    { districtCode: 'Z5000', district: 'Southern Europe', code: 'Z3200', unit: 'Italy' },
    { districtCode: 'Z5000', district: 'Southern Europe', code: 'Z2500', unit: 'Iberia' },
    { districtCode: 'Z5001', district: 'North-Eastern Europe', code: 'Z4001', unit: 'Nordics' },
    { districtCode: 'Z5001', district: 'North-Eastern Europe', code: 'X4140', unit: 'Poland/CIS/Caucasus' },
    { districtCode: 'Z5001', district: 'North-Eastern Europe', code: 'Z5102', unit: 'Bulgaria/Balkans' },
    { districtCode: 'XX900', district: 'Others', code: 'Z9000', unit: 'OEM/Others' }
  ];

  /* Each DC's historical district mix (must sum to 1 per DC) — drives Sales History generation. */
  var DC_DISTRICT_MIX = {
    Bassano: { 'Southern Europe': 0.82, 'DACH': 0.08, 'Western Europe': 0.07, 'North-Eastern Europe': 0.03 },
    Armitage: { 'UK / IR': 0.95, 'Western Europe': 0.03, 'North-Eastern Europe': 0.02 },
    Sevelievo: { 'North-Eastern Europe': 0.55, 'Western Europe': 0.22, 'Southern Europe': 0.15, 'DACH': 0.06, 'UK / IR': 0.02 },
    Wittlich: { 'DACH': 0.90, 'Western Europe': 0.06, 'Southern Europe': 0.04 },
    Losheim: { 'DACH': 0.70, 'Western Europe': 0.12, 'North-Eastern Europe': 0.10, 'Southern Europe': 0.08 },
    Dole: { 'Western Europe': 0.93, 'DACH': 0.04, 'Others': 0.03 },
    Wroclaw: { 'DACH': 0.55, 'Western Europe': 0.25, 'North-Eastern Europe': 0.20 },
    "Valence d' Agen": { 'Western Europe': 0.60, 'DACH': 0.25, 'Southern Europe': 0.15 }
  };

  var CATEGORIES = ['kitchen taps', 'bath taps', 'other taps', 'taps accessories', 'spareparts taps'];
  var PLANTS = ['ISI DE TAPS', 'ISI UK CERAMICS', 'ISI BG TAPS'];

  var CITY_BY_COUNTRY = {
    DE: ['Berlin', 'Hamburg', 'München', 'Köln'], AT: ['Wien', 'Graz'], CH: ['Zürich', 'Genf'],
    GB: ['London', 'Birmingham', 'Manchester'], IE: ['Dublin'],
    FR: ['Paris', 'Lyon', 'Lille'], BE: ['Antwerpen', 'Brüssel'], NL: ['Amsterdam', 'Rotterdam'],
    IT: ['Roma', 'Milano', 'Torino'], ES: ['Madrid', 'Barcelona'], PT: ['Lisboa'],
    SE: ['Stockholm'], NO: ['Oslo'], DK: ['Kopenhagen'], FI: ['Helsinki'],
    PL: ['Warschau', 'Wroclaw'], BG: ['Sofia', 'Plovdiv'], HR: ['Zagreb'], RS: ['Belgrade']
  };

  function weightedPick(rand, weightMap) {
    var entries = Object.keys(weightMap).map(function (k) { return { k: k, w: weightMap[k] }; });
    var r = rand(), acc = 0;
    for (var i = 0; i < entries.length; i++) { acc += entries[i].w; if (r <= acc) return entries[i].k; }
    return entries[entries.length - 1].k;
  }

  function load() {
    var rand = rng(42);
    var S = LNP.state;
    S.resetAll();

    DCS.forEach(function (dc) {
      S.getOrCreateDc(dc.name, {
        country: dc.country, lat: dc.lat, lng: dc.lng, latSource: 'automatisch',
        capacity: 3000 + Math.floor(rand() * 5000), usedSlots: Math.floor(rand() * 400), active: true
      });
    });
    S.emit('dcs');

    var dcTranslation = DCS.map(function (dc) {
      return { id: U.uid('dct'), shippingPoint: dc.shippingPoint, shippingPointName: dc.name + ' Deliveries', dc: dc.name };
    });

    var salesHierarchy = HIERARCHY.map(function (h) {
      return { id: U.uid('sh'), districtCode: h.districtCode, district: h.district, code: h.code, unit: h.unit };
    });

    /* Sales History: for each DC x district-mix entry, also emit the constituent unit-level
       rows (matching the real file's drill-down pattern) so districtCountryBreakdown() has data. */
    var history = [];
    DCS.forEach(function (dc) {
      var mix = DC_DISTRICT_MIX[dc.name];
      var totalEsu = 20000 + Math.floor(rand() * 60000);
      Object.keys(mix).forEach(function (district) {
        var districtEsu = totalEsu * mix[district];
        history.push({ id: U.uid('sh2'), plant: PLANTS[Math.floor(rand() * PLANTS.length)], shippingPoint: dc.shippingPoint, shippingPointName: dc.name, districtLabel: district, qtyEsu: districtEsu });
        var units = HIERARCHY.filter(function (h) { return h.district === district; });
        if (units.length === 1) {
          history.push({ id: U.uid('sh3'), plant: PLANTS[Math.floor(rand() * PLANTS.length)], shippingPoint: dc.shippingPoint, shippingPointName: dc.name, districtLabel: units[0].unit, qtyEsu: districtEsu });
        } else if (units.length > 1) {
          /* First listed unit (the district's "home" country, e.g. Germany under DACH) always
             dominates; the rest share what's left — avoids an unrealistic even split. */
          var dominant = 0.7 + rand() * 0.2;
          var remaining = districtEsu;
          units.forEach(function (u, i) {
            var portion;
            if (i === 0) portion = districtEsu * dominant;
            else if (i === units.length - 1) portion = remaining;
            else portion = remaining * (0.3 + rand() * 0.4) / (units.length - 1);
            portion = Math.max(0, Math.min(portion, remaining));
            remaining -= portion;
            history.push({ id: U.uid('sh3'), plant: PLANTS[Math.floor(rand() * PLANTS.length)], shippingPoint: dc.shippingPoint, shippingPointName: dc.name, districtLabel: u.unit, qtyEsu: portion });
          });
        }
      });
    });

    /* Ship-to-address + Destinations: a handful of synthetic customers per DC, geographically
       spread according to the same district mix. */
    var shipToAddresses = [], destinations = [];
    var shipToSeq = 300001;
    DCS.forEach(function (dc) {
      var mix = DC_DISTRICT_MIX[dc.name];
      var custCount = 6 + Math.floor(rand() * 10);
      for (var i = 0; i < custCount; i++) {
        var district = weightedPick(rand, mix);
        var units = HIERARCHY.filter(function (h) { return h.district === district; });
        var unit = units.length ? units[Math.floor(rand() * units.length)].unit : null;
        var countries = unit ? LNP.geo.expandUnitToCountries(unit) : [];
        var country = countries.length ? countries[Math.floor(rand() * countries.length)] : 'DE';
        var cities = CITY_BY_COUNTRY[country] || [country];
        var city = cities[Math.floor(rand() * cities.length)];
        var shipToId = String(shipToSeq++);
        shipToAddresses.push({
          id: U.uid('sta'), shipTo: shipToId, name: 'Kunde ' + shipToId, name2: null,
          street: 'Musterstraße ' + (1 + Math.floor(rand() * 99)), postCode: String(10000 + Math.floor(rand() * 89999)),
          city: city, region: null, country: country, accountGroup: '2'
        });
        destinations.push({
          id: U.uid('dest'), shippingPoint: dc.shippingPoint, shippingPointName: dc.name,
          vbShipTo: shipToId, vbShipToName: 'Kunde ' + shipToId, isiShipTo: null, isiShipToName: null,
          qtyEsu: 50 + Math.floor(rand() * 2000)
        });
      }
    });

    var skus = [], matSeq = 500001, materialsByCategory = {};
    CATEGORIES.forEach(function (cat) {
      var n = 15 + Math.floor(rand() * 25);
      materialsByCategory[cat] = [];
      for (var i = 0; i < n; i++) {
        var mat = String(matSeq);
        materialsByCategory[cat].push({ article: mat, palletLoad: 30 + Math.floor(rand() * 90) });
        var dc = DCS[Math.floor(rand() * DCS.length)];
        skus.push({
          id: U.uid('sku'), shippingPoint: dc.shippingPoint, shippingPointName: dc.name,
          isiArticle: null, isiArticleName: null, article: mat, articleName: cat + ' ' + mat,
          qtyEsu: Math.floor(rand() * 500)
        });
        matSeq++;
      }
    });

    var forecast = [];
    var year = 2026, startMonth = 7;
    for (var m = 0; m < 18; m++) {
      var monthIdx = startMonth + m;
      var y = year + Math.floor((monthIdx - 1) / 12);
      var mo = ((monthIdx - 1) % 12) + 1;
      var period = U.monthPeriodOf(y, mo);
      DCS.forEach(function (dc) {
        CATEGORIES.forEach(function (cat) {
          var mats = materialsByCategory[cat];
          var pick = 2 + Math.floor(rand() * 3);
          for (var p = 0; p < pick; p++) {
            var mat = mats[Math.floor(rand() * mats.length)];
            var qty = 5 + Math.floor(rand() * 120);
            forecast.push({
              id: U.uid('fc'), dc: dc.name, article: mat.article, articleDesc: cat + ' ' + mat.article,
              bpSp: rand() < 0.5 ? 'Big piece' : 'Small Piece', category: cat, subCategory: cat,
              packaging: 'EW', palletLoad: mat.palletLoad,
              periodKey: period.key, periodTs: period.ts, periodDays: period.days,
              qty: qty, pallets: qty / mat.palletLoad
            });
          }
        });
      });
    }

    S.setDataset('dcTranslation', dcTranslation);
    S.setDataset('salesHierarchy', salesHierarchy);
    S.setDataset('history', history);
    S.setDataset('destinations', destinations);
    S.setDataset('shipToAddresses', shipToAddresses, null, 'shipToAddress');
    S.setDataset('skus', skus, null, 'sku');
    S.setDataset('forecast', forecast);
    LNP.sim.invalidateCaches();
    S.emit('project');
  }

  LNP.demo = { load: load };
})();
