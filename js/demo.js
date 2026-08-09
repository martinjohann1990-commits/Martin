/* =========================================================================
   demo.js – Beispieldatensatz zum Kennenlernen des Tools
   Erzeugt DCs, historische Versanddaten und einen Forecast. Alle Werte sind
   frei erfunden und dienen ausschließlich der Demonstration.
   ========================================================================= */
(function (NS) {
  'use strict';

  var U = NS.util, S = NS.state;

  /* Deterministischer Zufall, damit die Demo reproduzierbar bleibt */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  var DEMO_DCS = [
    { name: 'DC Duisburg', code: 'DUI', region: 'Nordrhein-Westfalen', country: 'Deutschland', lat: 51.4344, lng: 6.7623, capacity: 26000, usedSlots: 3200, storageCostPerSlotMonth: 13.5, handlingCostPerPallet: 3.8, transportBasePerPallet: 5.5, transportCostPerKm: 0.042, fixedCostPerPeriod: 48000 },
    { name: 'DC Hamburg', code: 'HAM', region: 'Hamburg', country: 'Deutschland', lat: 53.5511, lng: 9.9937, capacity: 15000, usedSlots: 1800, storageCostPerSlotMonth: 15.0, handlingCostPerPallet: 4.1, transportBasePerPallet: 6.0, transportCostPerKm: 0.045, fixedCostPerPeriod: 31000 },
    { name: 'DC München', code: 'MUC', region: 'Bayern', country: 'Deutschland', lat: 48.1372, lng: 11.5756, capacity: 18000, usedSlots: 2600, storageCostPerSlotMonth: 16.2, handlingCostPerPallet: 4.4, transportBasePerPallet: 6.2, transportCostPerKm: 0.047, fixedCostPerPeriod: 39000 },
    { name: 'DC Lyon', code: 'LYS', region: 'Auvergne-Rhône-Alpes', country: 'Frankreich', lat: 45.7640, lng: 4.8357, capacity: 14000, usedSlots: 1200, storageCostPerSlotMonth: 14.4, handlingCostPerPallet: 4.6, transportBasePerPallet: 6.8, transportCostPerKm: 0.049, fixedCostPerPeriod: 28000 },
    { name: 'DC Poznań', code: 'POZ', region: 'Wielkopolska', country: 'Polen', lat: 52.4064, lng: 16.9252, capacity: 22000, usedSlots: 900, storageCostPerSlotMonth: 8.6, handlingCostPerPallet: 2.6, transportBasePerPallet: 5.0, transportCostPerKm: 0.038, fixedCostPerPeriod: 19000 }
  ];

  var REGIONS = [
    { key: 'Deutschland Nord', country: 'Deutschland', weight: 1.5 },
    { key: 'Deutschland West', country: 'Deutschland', weight: 2.4 },
    { key: 'Deutschland Süd', country: 'Deutschland', weight: 2.0 },
    { key: 'Deutschland Ost', country: 'Deutschland', weight: 1.1 },
    { key: 'Niederlande', country: 'Niederlande', weight: 1.0 },
    { key: 'Belgien', country: 'Belgien', weight: 0.7 },
    { key: 'Frankreich', country: 'Frankreich', weight: 1.8 },
    { key: 'Italien', country: 'Italien', weight: 1.2 },
    { key: 'Spanien', country: 'Spanien', weight: 0.8 },
    { key: 'Österreich', country: 'Österreich', weight: 0.6 },
    { key: 'Polen', country: 'Polen', weight: 1.4 },
    { key: 'Tschechien', country: 'Tschechien', weight: 0.7 },
    { key: 'Dänemark', country: 'Dänemark', weight: 0.5 },
    { key: 'Schweden', country: 'Schweden', weight: 0.6 }
  ];

  /* Kategorien mit unterschiedlichem Profil: Volumen, Saison, regionaler Schwerpunkt */
  var CATEGORIES = [
    { name: 'Kühlgeräte', base: 900, season: 0.25, focus: 'Deutschland West', targetDays: 28, palletFactor: 1.0 },
    { name: 'Kleingeräte', base: 1500, season: 0.15, focus: 'Deutschland Süd', targetDays: 21, palletFactor: 0.55 },
    { name: 'Gartenmöbel', base: 700, season: 0.65, focus: 'Frankreich', targetDays: 35, palletFactor: 1.3 },
    { name: 'Werkzeuge', base: 1100, season: 0.1, focus: 'Polen', targetDays: 18, palletFactor: 0.4 },
    { name: 'Sanitärartikel', base: 600, season: 0.2, focus: 'Italien', targetDays: 24, palletFactor: 0.9 }
  ];

  var CUSTOMERS = ['Handelshaus Nord', 'BauMarkt Gruppe', 'Elektro Partner', 'Fachhandel Süd',
    'Online Retail EU', 'Möbelkette West', 'Discount Kette', 'Regionalhändler'];

  function monthKey(year, month) {
    return year + '-' + String(month + 1).padStart(2, '0');
  }

  function buildRecords(dataset, startYear, startMonth, months, seed, growth) {
    var rand = rng(seed);
    var out = [];

    for (var m = 0; m < months; m++) {
      var date = new Date(Date.UTC(startYear, startMonth + m, 1));
      var year = date.getUTCFullYear(), month = date.getUTCMonth();
      var period = monthKey(year, month);
      var days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

      CATEGORIES.forEach(function (cat) {
        REGIONS.forEach(function (region) {
          var focus = region.key === cat.focus ? 2.1 : 1;
          var seasonal = 1 + cat.season * Math.sin((month / 12) * 2 * Math.PI - Math.PI / 2);
          var noise = 0.8 + rand() * 0.4;
          var trend = Math.pow(1 + (growth || 0), m / 12);

          var qty = cat.base * region.weight * focus * seasonal * noise * trend * 100;
          if (qty < 1) return;

          // Umrechnung in Paletten je Kategorie (unterschiedliche Packdichten)
          var pallets = qty * cat.palletFactor / 150;
          var customer = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)];

          out.push({
            id: U.id('r'),
            dataset: dataset,
            customer: customer,
            country: region.country,
            region: region.key,
            regionKey: region.key,
            category: cat.name,
            period: period,
            periodTs: Date.UTC(year, month, 1),
            periodDays: days,
            qty: Math.round(qty),
            revenue: Math.round(qty * (12 + rand() * 30)),
            volume: U.round(pallets * 1.75, 2),
            pallets: U.round(pallets, 2),
            palletEq: 0,
            lat: NaN,
            lng: NaN
          });
        });
      });
    }
    return out;
  }

  function load() {
    var st = S.get();
    if (st.dcs.length || st.records.length) {
      if (!confirm('Die Demodaten ersetzen den aktuellen Arbeitsstand (DCs, Daten, Zuordnungen, Szenarien). Fortfahren?')) return;
    }

    S.hydrate(S.emptyState());

    DEMO_DCS.forEach(function (dc) { S.get().dcs.push(S.normalizeDC(dc)); });

    // Regionsspezifische Sonderkondition als Beispiel für Pauschalpreise
    var poz = S.get().dcs.find(function (d) { return d.code === 'POZ'; });
    if (poz) poz.regionCosts = { 'Polen': 4.2, 'Tschechien': 6.5 };

    var now = new Date();
    var histStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() - 11, 1));
    var fcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    var history = buildRecords('history', histStart.getUTCFullYear(), histStart.getUTCMonth(), 24, 20240815, 0.03);
    var forecast = buildRecords('forecast', fcStart.getUTCFullYear(), fcStart.getUTCMonth(), 12, 20250310, 0.06);

    S.get().records = history.concat(forecast);

    CATEGORIES.forEach(function (c) { S.get().settings.targetDaysByCategory[c.name] = c.targetDays; });
    S.syncRegions();

    S.emit('project');
    U.toast('Demodaten geladen: 5 DCs, ' + U.fmt.int(history.length + forecast.length) +
      ' Datensätze über 36 Monate (24 Monate Historie, 12 Monate Forecast).', 'good');
  }

  NS.demo = { load: load, DEMO_DCS: DEMO_DCS, CATEGORIES: CATEGORIES, REGIONS: REGIONS };
})(window.LNP);
