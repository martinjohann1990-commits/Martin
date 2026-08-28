/* NetPlan+ demo.js — synthetic demo data across all 7 source-file schemas, so the tool can be
   tried before any upload (spec §19: "Ein Demodatensatz zahlt sich ab Schritt 4 aus"). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};
  var U = LNP.util;

  function rng(seed) {
    var s = seed;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  var DISTRICTS = [
    { code: 'D_DE', name: 'Deutschland', countries: ['DE'] },
    { code: 'D_FR', name: 'Frankreich', countries: ['FR'] },
    { code: 'D_UK', name: 'Vereinigtes Königreich', countries: ['GB', 'IE'] },
    { code: 'D_IT', name: 'Italien', countries: ['IT'] },
    { code: 'D_BNL', name: 'Benelux', countries: ['BE', 'NL', 'LU'] },
    { code: 'D_IB', name: 'Iberien', countries: ['ES', 'PT'] },
    { code: 'D_NORD', name: 'Nordics', countries: ['SE', 'NO', 'DK', 'FI'] },
    { code: 'D_CEE', name: 'Zentral-/Osteuropa', countries: ['PL', 'CZ', 'SK', 'HU'] },
    { code: 'D_SEE', name: 'Südosteuropa', countries: ['RO', 'BG', 'HR', 'SI', 'RS'] }
  ];

  var SHIP_POINTS = [
    { code: 'SP_BAS', name: 'Versandpunkt Bassano', dc: 'Bassano' },
    { code: 'SP_ARM', name: 'Versandpunkt Armitage', dc: 'Armitage' },
    { code: 'SP_SEV', name: 'Versandpunkt Sevlievo', dc: 'Sevlievo' },
    { code: 'SP_SAA', name: 'Versandpunkt Saar', dc: 'Saar' },
    { code: 'SP_LOS', name: 'Versandpunkt Losheim', dc: 'Losheim' },
    { code: 'SP_DOL', name: 'Versandpunkt Dole', dc: 'Dole' },
    { code: 'SP_WRO', name: 'Versandpunkt Wroclaw', dc: 'Wroclaw' }
  ];

  var DISTRICT_SP_WEIGHTS = {
    D_DE: [{ sp: 'SP_SAA', w: 0.7 }, { sp: 'SP_LOS', w: 0.3 }],
    D_FR: [{ sp: 'SP_DOL', w: 0.8 }, { sp: 'SP_BAS', w: 0.2 }],
    D_UK: [{ sp: 'SP_ARM', w: 1.0 }],
    D_IT: [{ sp: 'SP_BAS', w: 1.0 }],
    D_BNL: [{ sp: 'SP_SAA', w: 0.5 }, { sp: 'SP_LOS', w: 0.5 }],
    D_IB: [{ sp: 'SP_BAS', w: 0.6 }, { sp: 'SP_DOL', w: 0.4 }],
    D_NORD: [{ sp: 'SP_SAA', w: 1.0 }],
    D_CEE: [{ sp: 'SP_WRO', w: 0.7 }, { sp: 'SP_SEV', w: 0.3 }],
    D_SEE: [{ sp: 'SP_SEV', w: 1.0 }]
  };

  var DC_COUNTRY = { Bassano: 'IT', Armitage: 'GB', Sevlievo: 'BG', Saar: 'DE', Losheim: 'DE', Dole: 'FR', Wroclaw: 'PL' };
  var DC_COORDS = {
    Bassano: { lat: 45.77, lng: 11.73 }, Armitage: { lat: 52.73, lng: -1.80 }, Sevlievo: { lat: 43.03, lng: 25.11 },
    Saar: { lat: 49.24, lng: 6.99 }, Losheim: { lat: 49.52, lng: 6.75 }, Dole: { lat: 47.09, lng: 5.49 }, Wroclaw: { lat: 51.11, lng: 17.04 }
  };

  var CATEGORIES = ['Armaturen', 'Sanitärkeramik', 'Badmöbel', 'Accessoires'];
  var PRODUCT_LINES = { 'Armaturen': ['Serie Alpha', 'Serie Beta'], 'Sanitärkeramik': ['Serie Delta'], 'Badmöbel': ['Serie Gamma'], 'Accessoires': ['Serie Epsilon'] };

  var CITY_BY_COUNTRY = {
    DE: ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt'], FR: ['Paris', 'Lyon', 'Marseille', 'Lille'],
    GB: ['London', 'Birmingham', 'Manchester'], IE: ['Dublin'], IT: ['Roma', 'Milano', 'Torino'],
    BE: ['Antwerpen', 'Brüssel'], NL: ['Amsterdam', 'Rotterdam'], LU: ['Luxembourg'],
    ES: ['Madrid', 'Barcelona'], PT: ['Lisboa'], SE: ['Stockholm'], NO: ['Oslo'], DK: ['Kopenhagen'], FI: ['Helsinki'],
    PL: ['Warschau', 'Wroclaw', 'Poznan'], CZ: ['Prag', 'Brno'], SK: ['Bratislava'], HU: ['Budapest'],
    RO: ['Bukarest'], BG: ['Sofia', 'Plovdiv'], HR: ['Zagreb'], SI: ['Ljubljana'], RS: ['Belgrad']
  };

  function weightedPick(rand, weights) {
    var r = rand(), acc = 0;
    for (var i = 0; i < weights.length; i++) { acc += weights[i].w; if (r <= acc) return weights[i].sp; }
    return weights[weights.length - 1].sp;
  }

  function load() {
    var rand = rng(42);
    var S = LNP.state;
    S.resetAll();

    SHIP_POINTS.forEach(function (sp) {
      var coords = DC_COORDS[sp.dc];
      S.getOrCreateDc(sp.dc, {
        country: DC_COUNTRY[sp.dc], lat: coords.lat, lng: coords.lng, latSource: 'datei',
        capacity: 3000 + Math.floor(rand() * 4000), usedSlots: Math.floor(rand() * 400), active: true
      });
    });
    S.emit('dcs');

    var dcTranslation = SHIP_POINTS.map(function (sp) {
      return { id: U.uid('dct'), shippingPoint: sp.code, shippingPointName: sp.name, dc: sp.dc };
    });

    var salesHierarchy = [];
    DISTRICTS.forEach(function (d) {
      d.countries.forEach(function (c) { salesHierarchy.push({ id: U.uid('sh'), districtCode: d.code, district: d.name, code: c, unit: LNP.geo.countryName(c) }); });
    });

    var destinations = [];
    var shipToSeq = 100001;
    DISTRICTS.forEach(function (d) {
      var custCount = 12 + Math.floor(rand() * 28);
      for (var i = 0; i < custCount; i++) {
        var country = d.countries[Math.floor(rand() * d.countries.length)];
        var cities = CITY_BY_COUNTRY[country] || [country];
        var city = cities[Math.floor(rand() * cities.length)];
        var sp = weightedPick(rand, DISTRICT_SP_WEIGHTS[d.code]);
        destinations.push({
          id: U.uid('dest'), shipTo: String(shipToSeq), name: 'Kunde ' + (shipToSeq - 100000),
          city: city, country: country, district: d.code, districtName: d.name, shippingPoint: sp
        });
        shipToSeq++;
      }
    });

    var skus = [], matSeq = 500001, materialsByCategory = {};
    CATEGORIES.forEach(function (cat) {
      var lines = PRODUCT_LINES[cat];
      var n = 20 + Math.floor(rand() * 40);
      materialsByCategory[cat] = [];
      for (var i = 0; i < n; i++) {
        var mat = String(matSeq);
        var dcName = SHIP_POINTS[Math.floor(rand() * SHIP_POINTS.length)].dc;
        skus.push({ id: U.uid('sku'), material: mat, marketingView: cat, productLine: lines[Math.floor(rand() * lines.length)], gtin: 4000000000000 + matSeq, dc: dcName });
        materialsByCategory[cat].push(mat);
        matSeq++;
      }
    });

    var forecast = [];
    var year = 2026, startWeek = 1;
    for (var w = 0; w < 26; w++) {
      var periodInt = year * 100 + (startWeek + w);
      DISTRICTS.forEach(function (d) {
        CATEGORIES.forEach(function (cat) {
          var mats = materialsByCategory[cat];
          var pick = 2 + Math.floor(rand() * 3);
          for (var m = 0; m < pick; m++) {
            var mat = mats[Math.floor(rand() * mats.length)];
            var qty = 20 + Math.floor(rand() * 300);
            var pallets = +(qty / 180 + rand() * 0.4).toFixed(2);
            var volume = +(pallets * 1.8).toFixed(2);
            var p = U.parsePeriod(periodInt);
            forecast.push({
              id: U.uid('fc'), district: d.code, districtName: d.name, plant: 'WERK_' + (1 + Math.floor(rand() * 2)),
              material: mat, periodKey: p.key, periodTs: p.ts, periodDays: p.days, qty: qty, pallets: pallets, volume: volume
            });
          }
        });
      });
    }

    var history = DISTRICTS.map(function (d) {
      return { id: U.uid('hi'), district: d.code, districtName: d.name, plant: 'WERK_1', qty: 8000 + Math.floor(rand() * 40000) };
    });

    S.setDataset('dcTranslation', dcTranslation);
    S.setDataset('salesHierarchy', salesHierarchy);
    S.setDataset('destinations', destinations);
    S.setDataset('skus', skus);
    S.setDataset('forecast', forecast);
    S.setDataset('history', history);
    LNP.sim.invalidateCaches();
    S.emit('project');
  }

  LNP.demo = { load: load };
})();
