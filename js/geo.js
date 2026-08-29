/* NetPlan+ geo.js — country/city centroid lookup, Haversine distance, East/West classification.
   Built-in table is best-effort (~230 entries incl. synonyms); every coordinate can be
   overridden manually in the UI and its source ('datei'|'automatisch'|'manuell'|'offen') is
   always shown, per spec §6.6 / §13. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};

  var COUNTRY = {
    DE: { lat: 51.16, lng: 10.45, name: 'Deutschland', names: ['germany', 'deutschland', 'allemagne'] },
    FR: { lat: 46.60, lng: 1.89, name: 'Frankreich', names: ['france', 'frankreich'] },
    IT: { lat: 42.50, lng: 12.57, name: 'Italien', names: ['italy', 'italien', 'italia'] },
    ES: { lat: 40.30, lng: -3.70, name: 'Spanien', names: ['spain', 'spanien', 'espana', 'españa'] },
    PT: { lat: 39.55, lng: -8.00, name: 'Portugal', names: ['portugal'] },
    GB: { lat: 54.00, lng: -2.50, name: 'Vereinigtes Königreich', names: ['united kingdom', 'uk', 'great britain', 'grossbritannien', 'großbritannien'] },
    UK: { lat: 54.00, lng: -2.50, name: 'Vereinigtes Königreich', names: ['united kingdom', 'uk'] },
    IE: { lat: 53.17, lng: -8.00, name: 'Irland', names: ['ireland', 'irland'] },
    BE: { lat: 50.64, lng: 4.67, name: 'Belgien', names: ['belgium', 'belgien', 'belgique'] },
    NL: { lat: 52.24, lng: 5.67, name: 'Niederlande', names: ['netherlands', 'niederlande', 'holland'] },
    LU: { lat: 49.75, lng: 6.10, name: 'Luxemburg', names: ['luxembourg', 'luxemburg'] },
    CH: { lat: 46.90, lng: 8.20, name: 'Schweiz', names: ['switzerland', 'schweiz', 'suisse'] },
    AT: { lat: 47.55, lng: 14.30, name: 'Österreich', names: ['austria', 'österreich', 'oesterreich'] },
    DK: { lat: 56.10, lng: 9.90, name: 'Dänemark', names: ['denmark', 'dänemark', 'daenemark'] },
    NO: { lat: 61.00, lng: 9.00, name: 'Norwegen', names: ['norway', 'norwegen'] },
    SE: { lat: 62.20, lng: 15.60, name: 'Schweden', names: ['sweden', 'schweden'] },
    FI: { lat: 63.90, lng: 26.60, name: 'Finnland', names: ['finland', 'finnland'] },
    PL: { lat: 52.00, lng: 19.30, name: 'Polen', names: ['poland', 'polen'] },
    CZ: { lat: 49.75, lng: 15.30, name: 'Tschechien', names: ['czech republic', 'czechia', 'tschechien'] },
    SK: { lat: 48.70, lng: 19.50, name: 'Slowakei', names: ['slovakia', 'slowakei'] },
    HU: { lat: 47.10, lng: 19.50, name: 'Ungarn', names: ['hungary', 'ungarn'] },
    RO: { lat: 45.90, lng: 24.97, name: 'Rumänien', names: ['romania', 'rumänien', 'rumaenien'] },
    BG: { lat: 42.73, lng: 25.49, name: 'Bulgarien', names: ['bulgaria', 'bulgarien'] },
    HR: { lat: 45.30, lng: 16.40, name: 'Kroatien', names: ['croatia', 'kroatien'] },
    SI: { lat: 46.10, lng: 14.80, name: 'Slowenien', names: ['slovenia', 'slowenien'] },
    RS: { lat: 44.20, lng: 20.90, name: 'Serbien', names: ['serbia', 'serbien'] },
    BA: { lat: 44.17, lng: 17.77, name: 'Bosnien und Herzegowina', names: ['bosnia'] },
    ME: { lat: 42.71, lng: 19.37, name: 'Montenegro', names: ['montenegro'] },
    MK: { lat: 41.61, lng: 21.75, name: 'Nordmazedonien', names: ['macedonia', 'north macedonia'] },
    AL: { lat: 41.15, lng: 20.17, name: 'Albanien', names: ['albania', 'albanien'] },
    GR: { lat: 39.07, lng: 21.82, name: 'Griechenland', names: ['greece', 'griechenland'] },
    TR: { lat: 38.96, lng: 35.24, name: 'Türkei', names: ['turkey', 'türkei', 'tuerkei'] },
    EE: { lat: 58.60, lng: 25.01, name: 'Estland', names: ['estonia', 'estland'] },
    LV: { lat: 56.88, lng: 24.60, name: 'Lettland', names: ['latvia', 'lettland'] },
    LT: { lat: 55.17, lng: 23.88, name: 'Litauen', names: ['lithuania', 'litauen'] },
    UA: { lat: 48.38, lng: 31.17, name: 'Ukraine', names: ['ukraine'] },
    MD: { lat: 47.41, lng: 28.37, name: 'Moldau', names: ['moldova'] },
    BY: { lat: 53.71, lng: 27.95, name: 'Belarus', names: ['belarus', 'weissrussland', 'weißrussland'] },
    GE: { lat: 42.32, lng: 43.36, name: 'Georgien', names: ['georgia', 'georgien'] },
    RU: { lat: 61.52, lng: 105.32, name: 'Russland', names: ['russia', 'russland'] },
    CY: { lat: 35.13, lng: 33.43, name: 'Zypern', names: ['cyprus', 'zypern'] },
    MT: { lat: 35.94, lng: 14.38, name: 'Malta', names: ['malta'] },
    IS: { lat: 64.96, lng: -19.02, name: 'Island', names: ['iceland', 'island'] },
    US: { lat: 39.83, lng: -98.58, name: 'USA', names: ['united states', 'usa'] },
    CA: { lat: 56.13, lng: -106.35, name: 'Kanada', names: ['canada', 'kanada'] },
    CN: { lat: 35.86, lng: 104.20, name: 'China', names: ['china'] },
    AU: { lat: -25.27, lng: 133.78, name: 'Australien', names: ['australia', 'australien'] },
    BR: { lat: -14.24, lng: -51.93, name: 'Brasilien', names: ['brazil', 'brasilien'] },
    ZA: { lat: -30.56, lng: 22.94, name: 'Südafrika', names: ['south africa', 'südafrika'] },
    TW: { lat: 23.70, lng: 121.00, name: 'Taiwan', names: ['taiwan'] },
    JP: { lat: 36.20, lng: 138.25, name: 'Japan', names: ['japan'] },
    KR: { lat: 35.91, lng: 127.77, name: 'Südkorea', names: ['south korea', 'korea'] },
    IN: { lat: 20.59, lng: 78.96, name: 'Indien', names: ['india', 'indien'] },
    EG: { lat: 26.82, lng: 30.80, name: 'Ägypten', names: ['egypt', 'ägypten', 'aegypten'] },
    TH: { lat: 15.87, lng: 100.99, name: 'Thailand', names: ['thailand'] }
  };

  /* A curated set of major European cities/logistics hubs used as a finer-grained fallback
     before falling back to the country centroid. Keys are lower-case city names. */
  var CITY = {
    'berlin': { lat: 52.52, lng: 13.40 }, 'hamburg': { lat: 53.55, lng: 9.99 }, 'münchen': { lat: 48.14, lng: 11.58 },
    'munich': { lat: 48.14, lng: 11.58 }, 'köln': { lat: 50.94, lng: 6.96 }, 'cologne': { lat: 50.94, lng: 6.96 },
    'frankfurt': { lat: 50.11, lng: 8.68 }, 'stuttgart': { lat: 48.78, lng: 9.18 }, 'düsseldorf': { lat: 51.23, lng: 6.78 },
    'saarbrücken': { lat: 49.24, lng: 6.99 }, 'saarbruecken': { lat: 49.24, lng: 6.99 }, 'losheim': { lat: 49.52, lng: 6.75 },
    'merzig': { lat: 49.44, lng: 6.64 }, 'leipzig': { lat: 51.34, lng: 12.37 }, 'dresden': { lat: 51.05, lng: 13.74 },
    'hannover': { lat: 52.37, lng: 9.73 }, 'nürnberg': { lat: 49.45, lng: 11.08 }, 'bremen': { lat: 53.08, lng: 8.80 },
    'paris': { lat: 48.86, lng: 2.35 }, 'lyon': { lat: 45.76, lng: 4.83 }, 'marseille': { lat: 43.30, lng: 5.37 },
    'dole': { lat: 47.09, lng: 5.49 }, 'strasbourg': { lat: 48.58, lng: 7.75 }, 'lille': { lat: 50.63, lng: 3.06 },
    'toulouse': { lat: 43.60, lng: 1.44 }, 'nantes': { lat: 47.22, lng: -1.55 },
    'roma': { lat: 41.90, lng: 12.50 }, 'rome': { lat: 41.90, lng: 12.50 }, 'milano': { lat: 45.46, lng: 9.19 },
    'milan': { lat: 45.46, lng: 9.19 }, 'bassano del grappa': { lat: 45.77, lng: 11.73 }, 'bassano': { lat: 45.77, lng: 11.73 },
    'torino': { lat: 45.07, lng: 7.69 }, 'turin': { lat: 45.07, lng: 7.69 }, 'napoli': { lat: 40.85, lng: 14.27 },
    'venezia': { lat: 45.44, lng: 12.33 }, 'venice': { lat: 45.44, lng: 12.33 },
    'madrid': { lat: 40.42, lng: -3.70 }, 'barcelona': { lat: 41.39, lng: 2.17 }, 'valencia': { lat: 39.47, lng: -0.38 },
    'lisboa': { lat: 38.72, lng: -9.14 }, 'lisbon': { lat: 38.72, lng: -9.14 }, 'porto': { lat: 41.15, lng: -8.61 },
    'london': { lat: 51.51, lng: -0.13 }, 'armitage': { lat: 52.73, lng: -1.80 }, 'birmingham': { lat: 52.48, lng: -1.90 },
    'manchester': { lat: 53.48, lng: -2.24 }, 'leeds': { lat: 53.80, lng: -1.55 },
    'dublin': { lat: 53.35, lng: -6.26 },
    'brussel': { lat: 50.85, lng: 4.35 }, 'bruxelles': { lat: 50.85, lng: 4.35 }, 'brussels': { lat: 50.85, lng: 4.35 },
    'antwerpen': { lat: 51.22, lng: 4.40 }, 'antwerp': { lat: 51.22, lng: 4.40 },
    'amsterdam': { lat: 52.37, lng: 4.90 }, 'rotterdam': { lat: 51.92, lng: 4.48 }, 'venlo': { lat: 51.37, lng: 6.17 },
    'luxembourg city': { lat: 49.61, lng: 6.13 },
    'zürich': { lat: 47.38, lng: 8.54 }, 'zurich': { lat: 47.38, lng: 8.54 }, 'genf': { lat: 46.20, lng: 6.14 }, 'geneva': { lat: 46.20, lng: 6.14 },
    'wien': { lat: 48.21, lng: 16.37 }, 'vienna': { lat: 48.21, lng: 16.37 },
    'kopenhagen': { lat: 55.68, lng: 12.57 }, 'copenhagen': { lat: 55.68, lng: 12.57 },
    'oslo': { lat: 59.91, lng: 10.75 }, 'stockholm': { lat: 59.33, lng: 18.06 }, 'helsinki': { lat: 60.17, lng: 24.94 },
    'warszawa': { lat: 52.23, lng: 21.01 }, 'warsaw': { lat: 52.23, lng: 21.01 }, 'wroclaw': { lat: 51.11, lng: 17.04 },
    'wrocław': { lat: 51.11, lng: 17.04 }, 'poznan': { lat: 52.41, lng: 16.93 }, 'gdansk': { lat: 54.35, lng: 18.65 },
    'praha': { lat: 50.08, lng: 14.44 }, 'prague': { lat: 50.08, lng: 14.44 }, 'brno': { lat: 49.20, lng: 16.61 },
    'bratislava': { lat: 48.15, lng: 17.11 },
    'budapest': { lat: 47.50, lng: 19.04 },
    'bucuresti': { lat: 44.44, lng: 26.10 }, 'bucharest': { lat: 44.44, lng: 26.10 },
    'sofia': { lat: 42.70, lng: 23.32 }, 'sevlievo': { lat: 43.03, lng: 25.11 }, 'plovdiv': { lat: 42.14, lng: 24.75 },
    'zagreb': { lat: 45.81, lng: 15.98 }, 'ljubljana': { lat: 46.06, lng: 14.51 },
    'belgrade': { lat: 44.79, lng: 20.45 }, 'beograd': { lat: 44.79, lng: 20.45 },
    'athina': { lat: 37.98, lng: 23.73 }, 'athens': { lat: 37.98, lng: 23.73 },
    'istanbul': { lat: 41.01, lng: 28.98 },
    'wittlich': { lat: 49.99, lng: 6.89 }, 'valence d\' agen': { lat: 44.13, lng: 0.91 }, 'valence-d\'agen': { lat: 44.13, lng: 0.91 },
    'sevelievo': { lat: 43.03, lng: 25.11 }, 'treuchtlingen': { lat: 48.96, lng: 10.91 }, 'lugoj': { lat: 45.69, lng: 21.90 },
    'roeselare': { lat: 50.95, lng: 3.12 }, 'roden': { lat: 53.14, lng: 6.42 }, 'teplice': { lat: 50.64, lng: 13.82 }
  };

  /* Countries considered "east of the PL / CZ / AT / SI line" (inclusive), used to pre-fill
     Scenario 3 (Central & Eastern Europe split). Purely a modeling default — every district
     can be moved to the other side manually in the Scenario editor. */
  var EAST_OF_LINE = {
    PL: true, CZ: true, AT: true, SI: true,
    SK: true, HU: true, RO: true, BG: true, HR: true, RS: true, BA: true, ME: true, MK: true, AL: true,
    UA: true, MD: true, EE: true, LV: true, LT: true, GR: true, TR: true, CY: true, RU: true
  };

  /* Curated multi-country region groups, matched by keyword against the free-text region/
     "Land / Einheit" labels used in sales-hierarchy style tables (e.g. "Nordics", "Iberia",
     "Belgium/Luxemburg"). Used when a label doesn't resolve to a single country. Order matters:
     first keyword match wins, so more specific groups should precede broader ones. */
  var REGION_GROUPS = [
    { keywords: ['dach'], countries: ['DE', 'AT', 'CH'] },
    { keywords: ['benelux'], countries: ['BE', 'NL', 'LU'] },
    { keywords: ['belgium/luxemburg', 'belgium/luxembourg', 'belux'], countries: ['BE', 'LU'] },
    { keywords: ['nordic'], countries: ['SE', 'NO', 'DK', 'FI', 'IS'] },
    { keywords: ['baltic'], countries: ['EE', 'LV', 'LT'] },
    { keywords: ['iberia', 'iberian'], countries: ['ES', 'PT'] },
    { keywords: ['greece', 'cyprus', 'griechenland'], countries: ['GR', 'CY'] },
    { keywords: ['czech', 'slovak', 'tschech'], countries: ['CZ', 'SK'] },
    { keywords: ['romania', 'moldova', 'rumän'], countries: ['RO', 'MD'] },
    { keywords: ['bulgaria', 'balkan', 'bulgarien'], countries: ['BG', 'HR', 'SI', 'RS', 'BA', 'ME', 'MK', 'AL'] },
    { keywords: ['poland/cis', 'cis/caucasus', 'poland'], countries: ['PL', 'BY', 'GE'] },
    { keywords: ['uk / ir', 'uk/ir', 'uk & ireland', 'britain & ireland'], countries: ['GB', 'IE'] },
    { keywords: ['export', 'oem', 'not assigned', 'n/a', 'others', 'sonstige', 'divers'], countries: [] }
  ];

  /* Resolves a free-text region/"Land / Einheit" label to the ISO2 countries it represents.
     Priority matters: an EXACT single-country name match wins first ("GB", "Austria"); then
     curated multi-country groups, so a compound label like "Bulgaria/Balkans" or "Belgium/
     Luxemburg" expands fully instead of being short-circuited by the "Bulgaria"/"Belgium"
     substring inside it; only then a loose substring single-country fallback ("Germany Total"
     -> DE). Returns [] for non-geographic buckets (e.g. "OEM/Others", "Kitchen Export"). */
  function expandUnitToCountries(rawText) {
    if (!rawText) return [];
    var text = String(rawText).trim();
    if (!text) return [];
    var upper = text.toUpperCase();
    var low = text.toLowerCase();

    if (COUNTRY[upper]) return [upper];
    var code;
    for (code in COUNTRY) {
      if (!COUNTRY.hasOwnProperty(code)) continue;
      var e = COUNTRY[code];
      if (low === e.name.toLowerCase()) return [code];
      for (var i = 0; i < e.names.length; i++) if (low === e.names[i]) return [code];
    }

    for (var g = 0; g < REGION_GROUPS.length; g++) {
      var grp = REGION_GROUPS[g];
      for (var k = 0; k < grp.keywords.length; k++) {
        if (low.indexOf(grp.keywords[k]) !== -1) return grp.countries;
      }
    }

    for (code in COUNTRY) {
      if (!COUNTRY.hasOwnProperty(code)) continue;
      var e2 = COUNTRY[code];
      if (low.indexOf(e2.name.toLowerCase()) !== -1) return [code];
      for (var j = 0; j < e2.names.length; j++) {
        if (e2.names[j].length >= 4 && low.indexOf(e2.names[j]) !== -1) return [code];
      }
    }
    return [];
  }

  function normalizeCountryKey(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    if (s.length <= 3) {
      var up = s.toUpperCase();
      if (COUNTRY[up]) return up;
    }
    var low = s.toLowerCase();
    for (var code in COUNTRY) {
      if (!COUNTRY.hasOwnProperty(code)) continue;
      var e = COUNTRY[code];
      if (low === e.name.toLowerCase()) return code;
      for (var i = 0; i < e.names.length; i++) if (low === e.names[i]) return code;
    }
    return s.toUpperCase();
  }

  function countryName(code) {
    var c = COUNTRY[normalizeCountryKey(code)];
    return c ? c.name : code;
  }

  function isEastOfLine(countryCode) {
    var c = normalizeCountryKey(countryCode);
    return !!EAST_OF_LINE[c];
  }

  /* resolve({city, country, region}) -> {lat, lng, source} | null */
  function resolve(spec) {
    spec = spec || {};
    if (spec.city) {
      var parts = String(spec.city).split(/[\/\|>–-]/);
      for (var p = 0; p < parts.length; p++) {
        var key = parts[p].trim().toLowerCase();
        if (key.length >= 3 && CITY[key]) return { lat: CITY[key].lat, lng: CITY[key].lng, source: 'automatisch' };
      }
      var lowFull = String(spec.city).trim().toLowerCase();
      for (var cname in CITY) {
        if (cname.length >= 4 && (lowFull.indexOf(cname) !== -1 || cname.indexOf(lowFull) !== -1)) {
          return { lat: CITY[cname].lat, lng: CITY[cname].lng, source: 'automatisch' };
        }
      }
    }
    if (spec.country) {
      var code = normalizeCountryKey(spec.country);
      if (COUNTRY[code]) return { lat: COUNTRY[code].lat, lng: COUNTRY[code].lng, source: 'automatisch' };
    }
    return null;
  }

  function toRad(d) { return d * Math.PI / 180; }

  function haversineKm(lat1, lng1, lat2, lng2) {
    if (!LNP.util.isNum(lat1) || !LNP.util.isNum(lng1) || !LNP.util.isNum(lat2) || !LNP.util.isNum(lng2)) return null;
    var R = 6371;
    var dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function roadDistanceKm(lat1, lng1, lat2, lng2) {
    var d = haversineKm(lat1, lng1, lat2, lng2);
    return d === null ? null : d * 1.28;
  }

  LNP.geo = {
    COUNTRY: COUNTRY, CITY: CITY, REGION_GROUPS: REGION_GROUPS,
    normalizeCountryKey: normalizeCountryKey, countryName: countryName, isEastOfLine: isEastOfLine,
    expandUnitToCountries: expandUnitToCountries,
    resolve: resolve, haversineKm: haversineKm, roadDistanceKm: roadDistanceKm
  };
})();
