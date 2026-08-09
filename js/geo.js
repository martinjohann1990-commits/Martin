/* =========================================================================
   geo.js – Nachschlagetabelle für Koordinaten von Ländern und Regionen
   Dient nur der Vorbelegung; alle Werte sind in der Oberfläche überschreibbar.
   ========================================================================= */
(function (NS) {
  'use strict';

  /* Schwerpunkte (Näherungswerte) – Land / ISO-Code / gängige Schreibweisen */
  var PLACES = {
    // --- Länder Europa
    'deutschland|germany|de|deu|ger': [51.10, 10.40],
    'österreich|oesterreich|austria|at|aut': [47.60, 14.10],
    'schweiz|switzerland|ch|che': [46.85, 8.20],
    'frankreich|france|fr|fra': [46.60, 2.40],
    'italien|italy|it|ita': [42.80, 12.60],
    'spanien|spain|es|esp': [40.20, -3.60],
    'portugal|pt|prt': [39.60, -8.20],
    'niederlande|netherlands|nl|nld|holland': [52.15, 5.40],
    'belgien|belgium|be|bel': [50.65, 4.60],
    'luxemburg|luxembourg|lu|lux': [49.75, 6.10],
    'dänemark|daenemark|denmark|dk|dnk': [56.00, 9.60],
    'schweden|sweden|se|swe': [59.30, 15.20],
    'norwegen|norway|no|nor': [60.80, 9.50],
    'finnland|finland|fi|fin': [62.20, 25.70],
    'polen|poland|pl|pol': [52.10, 19.40],
    'tschechien|czech republic|czechia|cz|cze': [49.80, 15.40],
    'slowakei|slovakia|sk|svk': [48.70, 19.50],
    'ungarn|hungary|hu|hun': [47.10, 19.50],
    'slowenien|slovenia|si|svn': [46.10, 14.80],
    'kroatien|croatia|hr|hrv': [45.30, 16.20],
    'serbien|serbia|rs|srb': [44.10, 20.80],
    'bosnien|bosnia|ba|bih': [44.00, 17.90],
    'rumänien|rumaenien|romania|ro|rou': [45.90, 25.00],
    'bulgarien|bulgaria|bg|bgr': [42.70, 25.30],
    'griechenland|greece|gr|grc': [39.10, 22.40],
    'türkei|tuerkei|turkey|tr|tur': [39.10, 33.10],
    'irland|ireland|ie|irl': [53.20, -8.10],
    'großbritannien|grossbritannien|united kingdom|uk|gb|gbr|england': [52.60, -1.50],
    'estland|estonia|ee|est': [58.70, 25.30],
    'lettland|latvia|lv|lva': [56.90, 24.60],
    'litauen|lithuania|lt|ltu': [55.30, 23.90],
    'ukraine|ua|ukr': [49.00, 31.50],
    'weißrussland|belarus|by|blr': [53.70, 27.90],
    'russland|russia|ru|rus': [55.75, 37.60],
    'island|iceland|is|isl': [64.90, -18.60],
    'malta|mt|mlt': [35.90, 14.40],
    'zypern|cyprus|cy|cyp': [35.10, 33.20],
    'albanien|albania|al|alb': [41.15, 20.10],
    'nordmazedonien|macedonia|mk|mkd': [41.60, 21.70],
    'moldawien|moldova|md|mda': [47.20, 28.50],
    'montenegro|me|mne': [42.70, 19.40],

    // --- Übersee (für internationale Netzwerke)
    'usa|vereinigte staaten|united states|us|america': [39.80, -98.60],
    'kanada|canada|ca|can': [56.10, -106.30],
    'mexiko|mexico|mx|mex': [23.60, -102.60],
    'brasilien|brazil|br|bra': [-14.20, -51.90],
    'china|cn|chn': [35.90, 104.20],
    'japan|jp|jpn': [36.20, 138.30],
    'indien|india|in|ind': [22.60, 79.00],
    'australien|australia|au|aus': [-25.30, 133.80],
    'südafrika|suedafrika|south africa|za|zaf': [-28.50, 24.70],
    'vereinigte arabische emirate|uae|ae|are': [24.00, 54.00],

    // --- Deutsche Bundesländer
    'baden-württemberg|baden-wuerttemberg|bw': [48.66, 9.35],
    'bayern|bavaria|by-de': [48.95, 11.40],
    'berlin': [52.52, 13.40],
    'brandenburg': [52.40, 13.05],
    'bremen': [53.08, 8.80],
    'hamburg': [53.55, 9.99],
    'hessen|hesse': [50.60, 9.00],
    'mecklenburg-vorpommern': [53.75, 12.60],
    'niedersachsen|lower saxony': [52.75, 9.40],
    'nordrhein-westfalen|nrw|north rhine-westphalia': [51.45, 7.30],
    'rheinland-pfalz': [49.95, 7.45],
    'saarland': [49.40, 7.02],
    'sachsen|saxony': [51.05, 13.35],
    'sachsen-anhalt': [51.95, 11.70],
    'schleswig-holstein': [54.20, 9.70],
    'thüringen|thueringen|thuringia': [50.90, 11.03],

    // --- Grobe Regionsbezeichnungen (DACH-Vertriebsgebiete)
    'nord|norden|north|region nord': [53.55, 9.99],
    'süd|sued|süden|south|region süd|region sued': [48.14, 11.58],
    'ost|osten|east|region ost': [52.52, 13.40],
    'west|westen|region west': [51.23, 6.78],
    'mitte|zentral|central|region mitte': [50.11, 8.68],
    'nordost|nordosten|northeast': [53.55, 13.20],
    'nordwest|nordwesten|northwest': [53.10, 8.30],
    'südost|suedost|southeast': [48.90, 12.60],
    'südwest|suedwest|southwest': [48.50, 8.20],
    'dach': [49.50, 10.50],
    'benelux': [51.30, 5.00],
    'skandinavien|scandinavia|nordics': [59.50, 14.00],
    'osteuropa|eastern europe|cee': [50.00, 20.00],
    'westeuropa|western europe': [48.50, 3.00],
    'südeuropa|suedeuropa|southern europe': [41.50, 12.00],
    'nordeuropa|northern europe': [60.00, 15.00],
    'europa|europe|emea': [50.00, 10.00],

    // --- Wichtige Logistikstandorte / Großstädte
    'duisburg': [51.43, 6.76], 'düsseldorf|duesseldorf': [51.23, 6.78],
    'köln|koeln|cologne': [50.94, 6.96], 'dortmund': [51.51, 7.47],
    'essen': [51.46, 7.01], 'hannover': [52.37, 9.73],
    'bremen-stadt': [53.08, 8.80], 'leipzig': [51.34, 12.37],
    'dresden': [51.05, 13.74], 'nürnberg|nuernberg|nuremberg': [49.45, 11.08],
    'münchen|muenchen|munich': [48.14, 11.58], 'stuttgart': [48.78, 9.18],
    'frankfurt': [50.11, 8.68], 'mannheim': [49.49, 8.47],
    'kassel': [51.32, 9.50], 'erfurt': [50.98, 11.03],
    'magdeburg': [52.13, 11.63], 'rostock': [54.09, 12.14],
    'kiel': [54.32, 10.13], 'saarbrücken|saarbruecken': [49.24, 6.99],
    'wien|vienna': [48.21, 16.37], 'graz': [47.07, 15.44], 'linz': [48.31, 14.29],
    'zürich|zuerich|zurich': [47.38, 8.54], 'bern': [46.95, 7.45], 'basel': [47.56, 7.59],
    'paris': [48.86, 2.35], 'lyon': [45.76, 4.84], 'marseille': [43.30, 5.37],
    'lille': [50.63, 3.06], 'bordeaux': [44.84, -0.58],
    'mailand|milano|milan': [45.46, 9.19], 'rom|rome|roma': [41.90, 12.50],
    'bologna': [44.49, 11.34], 'turin|torino': [45.07, 7.69],
    'madrid': [40.42, -3.70], 'barcelona': [41.39, 2.17], 'valencia': [39.47, -0.38],
    'lissabon|lisboa|lisbon': [38.72, -9.14], 'porto': [41.15, -8.61],
    'amsterdam': [52.37, 4.90], 'rotterdam': [51.92, 4.48], 'venlo': [51.37, 6.17],
    'tilburg': [51.56, 5.09], 'eindhoven': [51.44, 5.48],
    'antwerpen|antwerp': [51.22, 4.40], 'brüssel|bruessel|brussels': [50.85, 4.35],
    'lüttich|liege': [50.63, 5.57],
    'kopenhagen|copenhagen': [55.68, 12.57], 'stockholm': [59.33, 18.07],
    'göteborg|goeteborg|gothenburg': [57.71, 11.97], 'oslo': [59.91, 10.75],
    'helsinki': [60.17, 24.94],
    'warschau|warsaw|warszawa': [52.23, 21.01], 'posen|poznan': [52.41, 16.93],
    'breslau|wroclaw': [51.11, 17.04], 'krakau|krakow': [50.06, 19.94],
    'prag|prague|praha': [50.08, 14.44], 'brünn|brno': [49.20, 16.61],
    'bratislava': [48.15, 17.11], 'budapest': [47.50, 19.04],
    'ljubljana': [46.06, 14.51], 'zagreb': [45.81, 15.98],
    'bukarest|bucharest': [44.43, 26.10], 'sofia': [42.70, 23.32],
    'athen|athens': [37.98, 23.73], 'istanbul': [41.01, 28.98],
    'london': [51.51, -0.13], 'birmingham': [52.49, -1.89], 'manchester': [53.48, -2.24],
    'dublin': [53.35, -6.26]
  };

  /* Index aufbauen: jede Schreibweise → Koordinate */
  var INDEX = Object.create(null);
  Object.keys(PLACES).forEach(function (keys) {
    keys.split('|').forEach(function (k) { INDEX[k] = PLACES[keys]; });
  });

  function normalize(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/^(region|land|country|gebiet|zone)\s+/, '')
      .replace(/[.,;]+$/, '');
  }

  /**
   * Sucht Koordinaten für einen Regions- oder Länderbegriff.
   * @returns {{lat:number,lng:number,match:string}|null}
   */
  function lookup(name, country) {
    var candidates = [];
    if (name) candidates.push(normalize(name));
    if (country) candidates.push(normalize(country));

    // Zusammengesetzte Bezeichnungen wie "DE-Süd" oder "Deutschland / Nord" zerlegen
    if (name) {
      String(name).split(/[\/|,>–-]/).forEach(function (part) {
        var p = normalize(part);
        if (p) candidates.push(p);
      });
    }

    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (INDEX[c]) return { lat: INDEX[c][0], lng: INDEX[c][1], match: c };
    }
    // Teilstring-Treffer als letzter Versuch (nur bei ausreichender Länge)
    for (var j = 0; j < candidates.length; j++) {
      var cand = candidates[j];
      if (cand.length < 4) continue;
      var hit = Object.keys(INDEX).find(function (k) {
        return k.length >= 4 && (cand.indexOf(k) >= 0 || k.indexOf(cand) >= 0);
      });
      if (hit) return { lat: INDEX[hit][0], lng: INDEX[hit][1], match: hit };
    }
    return null;
  }

  NS.geo = { lookup: lookup, normalize: normalize };
})(window.LNP);
