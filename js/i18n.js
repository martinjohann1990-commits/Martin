/* NetPlan+ i18n — dictionary key = German original text. Missing key -> German shown (safe fallback). */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};

  var DICT = {
    /* nav */
    'Dashboard': 'Dashboard',
    'Daten & Import': 'Data & Import',
    'DC-Verwaltung': 'DC Management',
    'Simulation': 'Simulation',
    'Szenarien': 'Scenarios',
    'Berichte': 'Reports',
    'Export & Projekt': 'Export & Project',
    'Logistiknetzwerk-Analyse': 'Logistics Network Analysis',
    'Demodaten laden': 'Load demo data',
    'Datensätze': 'records',

    /* generic */
    'Speichern': 'Save', 'Abbrechen': 'Cancel', 'Löschen': 'Delete', 'Bearbeiten': 'Edit',
    'Duplizieren': 'Duplicate', 'Anlegen': 'Create', 'Neu': 'New', 'Schließen': 'Close',
    'Suchen': 'Search', 'Filter': 'Filter', 'Alle': 'All', 'Aktiv': 'Active', 'Inaktiv': 'Inactive',
    'Ja': 'Yes', 'Nein': 'No', 'Zurücksetzen': 'Reset', 'Übernehmen': 'Apply', 'Exportieren': 'Export',
    'Importieren': 'Import', 'Hochladen': 'Upload', 'Datei wählen': 'Choose file',
    'Name': 'Name', 'Code': 'Code', 'Land': 'Country', 'Region': 'Region', 'Kategorie': 'Category',
    'Aktionen': 'Actions', 'Status': 'Status', 'Details': 'Details', 'Gesamt': 'Total',
    'Quelle': 'Source', 'unbekannt': 'unknown', 'automatisch': 'automatic', 'manuell': 'manual',
    'aus Datei': 'from file', 'nicht gesetzt': 'not set',

    /* dashboard */
    'Prognose Paletten (Gesamt)': 'Forecast pallets (total)', 'Prognose ESU (Gesamt)': 'Forecast ESU (total)',
    'Aktive Distributionszentren': 'Active distribution centers', 'SKUs im Bestand': 'SKUs on file',
    'Ship-to-Kunden': 'Ship-to customers', 'Ø Paletten je DC': 'Avg. pallets per DC',
    'Ziel-Reichweite (Monate)': 'Target coverage (months)', 'Volumen je Distributionszentrum': 'Volume per distribution center',
    'Ziel-Palettenbestand': 'Target pallet stock', 'Forecast-Menge im Zeitraum': 'Forecast quantity in period',
    'Top-10 Vertriebsgebiete': 'Top 10 sales districts', 'Prognoseverlauf je Periode': 'Forecast trend per period',
    'Netzwerkkarte': 'Network map', 'Keine Daten geladen': 'No data loaded',
    'Bitte laden Sie Ihre Excel-/CSV-Dateien im Bereich “Daten & Import” hoch oder starten Sie mit den Demodaten.':
      'Please upload your Excel/CSV files under “Data & Import”, or start with the demo data.',
    'Demodaten laden und loslegen': 'Load demo data and get started',

    /* data / import */
    'Datenquellen': 'Data sources', 'Zeilen erkannt': 'rows detected', 'Zeilen übernommen': 'rows accepted',
    'Warnungen': 'warnings', 'Fehler': 'errors', 'Noch keine Datei geladen': 'No file loaded yet',
    'Datei hierher ziehen oder klicken': 'Drag file here or click', 'CSV, XLSX, XLS, XLSM': 'CSV, XLSX, XLS, XLSM',
    'Spaltenzuordnung': 'Column mapping', 'Feld': 'Field', 'Spalte in Datei': 'Column in file', 'Konfidenz': 'Confidence',
    'Pflichtfeld fehlt': 'Required field missing', 'Bereit zum Import': 'Ready to import',
    'Mengenlogik': 'Quantity logic', 'Stück je Palette': 'Units per pallet', 'm³ je Palette': 'm³ per pallet',
    'Ziel-Reichweite je Kategorie': 'Target coverage per category', 'Globale Ziel-Reichweite (Monate)': 'Global target coverage (months)',
    'Sicherheitsaufschlag': 'Safety factor', 'Datenbestand': 'Data on file', 'Datensatz entfernen': 'Remove dataset',
    'Alle Daten zurücksetzen': 'Reset all data',

    /* DCs */
    'Distributionszentren': 'Distribution centers', 'Neues DC': 'New DC', 'Kapazität (Stellplätze)': 'Capacity (slots)',
    'Belegte Plätze (Basis)': 'Occupied slots (base)', 'Lagerkosten je Platz/Monat': 'Storage cost per slot/month',
    'Handlingkosten je Palette': 'Handling cost per pallet', 'Transport-Grundkosten je Palette': 'Transport base cost per pallet',
    'Transportkosten je km': 'Transport cost per km', 'Fixkosten je Periode': 'Fixed cost per period',
    'Koordinaten': 'Coordinates', 'Breitengrad': 'Latitude', 'Längengrad': 'Longitude',
    'DC wirklich löschen?': 'Really delete this DC?', 'Regionale Kostenpauschalen': 'Regional flat costs',

    /* simulation */
    'Parameter': 'Parameters', 'Datenbasis': 'Data basis', 'Prognose': 'Forecast', 'Historie': 'History',
    'Periode von': 'Period from', 'Periode bis': 'Period to', 'Modus': 'Mode', 'Alleinzuordnung': 'Single site',
    'Aufteilung': 'Split', 'Manuell': 'Manual', 'Gewichtung': 'Weighting', 'Kapazität': 'Capacity',
    'Transport': 'Transport', 'Reichweite': 'Service', 'Auslastungsgrenze': 'Utilization limit',
    'Simulation starten': 'Run simulation', 'Empfehlung': 'Recommendation', 'Rangliste': 'Ranking',
    'Score-Zusammensetzung': 'Score composition', 'Aufteilungstabelle': 'Split table', 'Regionale Zuordnung': 'Regional assignment',
    'Ausschlaggebend ist': 'Decisive factor is', 'von': 'of', 'Punkten': 'points',

    /* scenarios */
    'Szenario speichern': 'Save scenario', 'Aktueller Stand': 'Current state', 'Kennzahlenvergleich': 'KPI comparison',
    'Zuordnungsmatrix': 'Assignment matrix', 'Basis (Ist-Zustand)': 'Base (as-is)',
    'Erstellt': 'Created', 'Vergleichen': 'Compare', 'Auslastung': 'Utilization', 'Distanz': 'Distance', 'Wochen': 'weeks', 'Monate': 'months',

    /* reports */
    'Länder-Distrikt-Zuordnung': 'Country–district allocation', 'SKU je DC': 'SKUs per DC',
    'Paletten-/Lagerbedarf je DC': 'Pallet / storage demand per DC', 'Ø Sendungsgröße': 'Avg. shipment size',
    'Sendungszusammensetzung': 'Shipment composition', 'Rest': 'Rest',

    /* export */
    'Excel-Export': 'Excel export', 'CSV-Export': 'CSV export', 'PDF-Bericht': 'PDF report',
    'Projekt speichern': 'Save project', 'Projekt laden': 'Load project', 'Erscheinungsbild': 'Branding',
    'Kostenparameter': 'Cost parameters', 'Formelübersicht': 'Formula reference',

    /* formula reference (LNP.sim.FORMULA_REFERENCE) + info-button and remaining UI strings
       added across views as calculation-logic disclosure / English-mode coverage were extended */
    'Als Szenario speichern': 'Save as scenario',
    'Anteil': 'Share',
    'Anteil %': 'Share %',
    'App-Name': 'App name',
    'Artikel': 'Article',
    'Artikel / Bezeichnung suchen': 'Search article / description',
    'Artikel-Standortanalyse': 'Article location analysis',
    'Aktueller Stand (keine Konsolidierung)': 'Current state (no consolidation)',
    'Automatisch (Basistopologie)': 'Automatic (base topology)',
    'Begründung': 'Reason',
    'Benutzerdefiniert': 'Custom',
    'Benutzerdefiniertes Szenario': 'Custom scenario',
    'Berechnungslogik': 'Calculation logic',
    'Berechnungslogik anzeigen': 'Show calculation logic',
    'Cluster': 'Cluster',
    'Cluster-Grenze 1': 'Cluster boundary 1',
    'Cluster-Grenze 2': 'Cluster boundary 2',
    'DC&#8209;Zuordnung': 'DC&#8209;mapping',
    'Details je Artikel:': 'Details per article:',
    'Empfohlenes DC': 'Recommended DC',
    'Europa': 'Europe',
    'Excel-Bibliothek nicht verfügbar.': 'Excel library not available.',
    'Fehler beim Laden': 'Error loading',
    'Fehler beim Lesen': 'Error reading',
    'Forecast (Stück)': 'Forecast (units)',
    'Forecast / Ist': 'Forecast / actual',
    'Geografische Heatmap': 'Geographic heatmap',
    'Ist (ESU)': 'Actual (ESU)',
    'Ist (Sales History) vs. Forecast je Distrikt': 'Actual (Sales History) vs. forecast per district',
    'Je DC': 'Per DC',
    'Kandidat (Simulation)': 'Candidate (simulation)',
    'Keine': 'None',
    'Keine Distrikte importiert.': 'No districts imported.',
    'Keine Koordinate gefunden — bitte manuell eintragen.': 'No coordinate found — please enter manually.',
    'Keine Koordinaten verfügbar.': 'No coordinates available.',
    'Keine Regionen/Distrikte importiert.': 'No regions/districts imported.',
    'Keine Standorte mit Koordinaten für dieses Szenario.': 'No sites with coordinates for this scenario.',
    'Keine aktiven Distributionszentren vorhanden.': 'No active distribution centers available.',
    'Keine aktiven Distributionszentren.': 'No active distribution centers.',
    'Koordinate ermitteln': 'Determine coordinate',
    'Kürzel': 'Initials',
    'Logo (max. 300 kB)': 'Logo (max. 300 kB)',
    'Logo zu groß (max. 300 kB).': 'Logo too large (max. 300 kB).',
    'Netzwerk-Standardwert': 'Network default',
    'Neu berechnen': 'Recalculate',
    'Neu laden': 'Reload',
    'Neues Szenario': 'New scenario',
    'Nicht zugeordnet': 'Not assigned',
    'Offline-Kartenmodus (Kacheln nicht erreichbar)': 'Offline map mode (tiles unavailable)',
    'PAL/Woche': 'PAL/week',
    'Paletten je DC im Vergleich': 'Pallets per DC compared',
    'Picking Bins': 'Picking bins',
    'Schema-Ansicht (SVG, ohne Kartenbibliothek)': 'Schematic view (SVG, no map library)',
    'Schwelle „Regional“ (Anteil)': 'Threshold “Regional” (share)',
    'Score': 'Score',
    'Sicherheit': 'Safety',
    'Sicherheits-Faktor z (Std.-Abw.)': 'Safety factor z (std. dev.)',
    'Stadt': 'City',
    'Standorte': 'Sites',
    'Stellplätze': 'Slots',
    'Storage PAL': 'Storage PAL',
    'Szenario': 'Scenario',
    'Szenario-Heatmap (adressgenau)': 'Scenario heatmap (address-level)',
    'Szenario-Konsolidierung': 'Scenario consolidation',
    'Taps-Schlüsselwörter (Kategorie enthält)': 'Taps keywords (category contains)',
    'Top-N Länder': 'Top-N countries',
    'Transit': 'Transit',
    'Untertitel': 'Subtitle',
    'Zeilen': 'Lines',
    'Ziel': 'Target',
    'Zuordnung': 'Assignment',
    'Zuständiges DC': 'Responsible DC',
    'Zyklus': 'Cycle',
    'Zyklusbestand': 'Cycle stock',
    'Sicherheitsbestand': 'Safety stock',
    'Bedarf/Tag': 'Demand/day',
    'Geografischer Fußabdruck je DC': 'Geographic footprint per DC',
    'Distrikt-Zentroid (Distanzgrundlage)': 'District centroid (distance basis)',
    '€ / Palette': '€ / pallet',
    'Kapazitäts-Score': 'Capacity score',
    'Transport-Score': 'Transport score',
    'Service-Score (Reichweite)': 'Service score (coverage)',
    'Gesamt-Score': 'Overall score',
    'SKU / Picking Bins je DC': 'SKUs / picking bins per DC',
    'Paletten': 'Pallets',
    'davon Sicherheitsbestand': 'of which safety stock',
    'davon Zyklusbestand': 'of which cycle stock',
    'globale Ziel-Reichweite:': 'global target coverage:',
    'km pro Tag': 'km per day',
    'mit': 'with',
    'offen': 'open',
    'verdichtet': 'aggregated',
    'z. B. Artikelnummer': 'e.g. article number',
    'Ø Transit (Tage)': 'Avg. transit (days)',
    'Ø €/Palette': 'Avg. €/pallet',
    'Handlingtage': 'Handling days',
    'Regionale Zuordnung überschreiben': 'Override regional assignment',
    'SKUs je Picking Bin': 'SKUs per picking bin',
    ' — die ersten {0} nach Volumen angezeigt': ' — first {0} shown by volume',
    '(anpassbar unter Daten &amp; Import → Mengenlogik; wirkt sich sofort auf diesen Bericht aus).': '(adjustable under Data & Import → Quantity logic; takes effect immediately on this report).',
    'Alle importierten Daten, Distributionszentren, Szenarien und Einstellungen werden gelöscht.': 'All imported data, distribution centers, scenarios and settings will be deleted.',
    'Anteil (DC, Monat)-Bündel, die ausschließlich "Taps"-Kategorien enthalten vs. gemischt': 'Share of (DC, month) bundles containing only "Taps" categories vs. mixed',
    'Anteil je Land/Einheit = reale ESU-Menge aus der Sales History (Distrikt-Hierarchie), kein Zähl-Proxy. Länder außerhalb der Top-N werden als &bdquo;Rest&ldquo; gebündelt.': 'Share per country/unit = real ESU volume from Sales History (district hierarchy), not a count proxy. Countries outside the top N are bundled as “Rest”.',
    'Anteile eintragen (relative Gewichte, müssen nicht auf 100 summieren) und neu berechnen.': 'Enter shares (relative weights, need not add up to 100) and recalculate.',
    'Aufschlag auf den Zyklusbestand (Ø Menge × Reichweite).': 'Surcharge on the cycle stock (avg. quantity × coverage).',
    'Aus den echten historischen Mengen der Sales History (Shipping Point → DC via DC Translation Table), nicht aus einer Kundenanzahl-Näherung. Nur die Distrikt-Ebene wird summiert — die feinere Land/Einheit-Ebene ist in denselben Zahlen bereits enthalten (Vermeidung von Doppelzählung).': 'From Sales History\'s real historical volumes (Shipping Point → DC via DC Translation Table), not a customer-count proxy. Only the district level is summed — the finer country/unit level is already contained in the same figures (avoiding double-counting).',
    'Basis: Szenario „{0}“. Für Artikel ohne dominanten Distrikt („Mehrere Standorte“ in der Artikel-Standortanalyse) wird jedes verbleibende DC des Szenarios mitgezählt — echte Volumen ohne einen einzelnen Lagerort, daher eine bewusste Näherung nach oben.': 'Basis: scenario “{0}”. For articles without a dominant district ("Multiple sites" in the article location analysis), every remaining DC of the scenario is counted — genuine volume without a single storage site, hence a deliberate rounding up.',
    'Bitte mindestens ein Szenario zum Vergleich auswählen.': 'Please select at least one scenario to compare.',
    'Breitformat: eine Spalte je Monat. Paletten = Monatsmenge ÷ artikelspezifischer Palettenladung. Nullwerte werden nicht als Zeile übernommen.': 'Wide format: one column per month. Pallets = monthly quantity ÷ article-specific pallet load. Zero values are not imported as a row.',
    'Der Forecast liegt bereits je DC vor (nicht je Distrikt) — die Palettenzahl je DC ist damit exakt, keine Näherung. Fehlt die Pallett Load für einen Artikel im Quellfile (reale Daten: ca. 28 % der Menge, meist Kleinteile/Ersatzteile), wird ersatzweise der Median-Wert der Produkt(unter)gruppe angesetzt, statt die Menge mit 0 Paletten zu verlieren — betroffene Importe werden im Upload-Dialog als Warnung ausgewiesen.': 'The forecast is already available per DC (not per district) — the pallet count per DC is therefore exact, not an approximation. If the pallet load is missing for an article in the source file (real data: roughly 28% of quantity, mostly small parts/spares), the product (sub)group\'s median value is used instead, rather than losing that quantity as 0 pallets — affected imports are flagged as a warning in the upload dialog.',
    'Destinations liefert je Versandpunkt die belieferten Ship-to-Parties mit echter ESU-Menge; Ship-to-Address liefert deren tatsächliches Land/Ort. Wo sich beide verknüpfen lassen, ist der Distrikt-Standort damit kundenscharf statt länderweit gemittelt — Quelle wird in Daten & Import je Distrikt angezeigt.': 'Destinations supplies, per shipping point, the ship-to parties served with real ESU volume; Ship-to-Address supplies their actual country/city. Where the two can be joined, the district location is customer-precise instead of averaged across a country — the source is shown per district under Data & Import.',
    'Diese Datei enthält zwei Spalten mit dem Namen &bdquo;V&amp;B/ISI Shipping point&ldquo; (Code, dann Beschreibung) — die Zuordnung erfolgt daher positionsbasiert (Spalte 1 = Code, Spalte 2 = Beschreibung, Spalte mit Kopfzeile &bdquo;DC&ldquo; = Distributionszentrum). Distributionszentren selbst werden nicht aus dieser Tabelle angelegt — dafür ist die Forecast-Datei maßgeblich (diese Tabelle enthält auch Produktionswerke, Retouren u.ä., die keine Lagerstandorte sind).': 'This file contains two columns named “V&amp;B/ISI Shipping point” (code, then description) — the mapping is therefore position-based (column 1 = code, column 2 = description, the column headed “DC” = distribution center). Distribution centers themselves are not created from this table — the Forecast file is authoritative for that (this table also lists production plants, returns handling etc. that aren\'t warehouse sites).',
    'Distanz = Haversine(DC, Distrikt-Zentroid) × 1,28': 'Distance = Haversine(DC, district centroid) × 1.28',
    'Distrikt-Anteil(DC) = Sales History ESU(DC, Distrikt) ÷ Sales History ESU(DC, alle Distrikte)': 'District share(DC) = Sales History ESU(DC, district) ÷ Sales History ESU(DC, all districts)',
    'Distrikt-Zentroid = mengengewichtetes Mittel der tatsächlichen Kundenstandorte (Destinations × Ship-to-Address), sofern verknüpfbar; sonst mengengewichtetes Mittel der Länder, die laut Sales Hierarchie/Sales History zu diesem Distrikt gehören. Bei Bedarf manuell überschreibbar.': 'District centroid = volume-weighted average of actual customer locations (Destinations × Ship-to-Address) where they can be joined; otherwise the volume-weighted average of the countries that belong to this district per Sales Hierarchie/Sales History. Manually overridable if needed.',
    'Eigene, transparent dokumentierte Ausformulierung: Bestandsfähigkeit = relative Nähe der eigenen Transitzeit zur schnellsten im Bewerberfeld; Reaktionsfähigkeit = 1 − Transit ÷ (Coverage in Tagen), begrenzt auf [0,1].': 'Own, transparently documented formulation: stock capability = own transit time\'s relative closeness to the fastest in the candidate field; responsiveness = 1 − transit ÷ (coverage in days), clamped to [0,1].',
    'Empfehlungen gelten für die {0} im Szenario „{1}“ verbleibenden Standorte — bereits konsolidierte DCs stehen nicht mehr als Empfehlung zur Verfügung.': 'Recommendations apply to the {0} sites remaining in scenario “{1}” — DCs already consolidated away are no longer available as a recommendation.',
    'Enthält alle DCs, Datensätze, Regionen, Zuordnungen, Szenarien und Einstellungen als JSON — geeignet zur Weitergabe per Mail/Netzlaufwerk.': 'Contains all DCs, datasets, regions, assignments, scenarios and settings as JSON — suitable for sharing by email/network drive.',
    'Für den zusätzlichen Sicherheitsbestand aus der monatlichen Schwankung — z. B. z=1 &asymp; 84&nbsp;%, z=1,65 &asymp; 95&nbsp;% Servicegrad.': 'For the additional safety stock from monthly variability — e.g. z=1 &asymp; 84&nbsp;%, z=1.65 &asymp; 95&nbsp;% service level.',
    'Je Artikel wird das SKU-View-Volumen (Shipping Point → DC → Distrikt, mit demselben Verteilschlüssel aus der Sales History wie überall sonst) in seine Distrikt-Anteile zerlegt. <b>{0}</b> = geringe Drehung (C-Artikel, unterste 5&nbsp;% der kumulierten Menge) — Streuung auf mehrere Standorte würde den Sicherheitsbestand vervielfachen, ohne den Servicegrad spürbar zu verbessern. <b>{1}</b> = ein einzelner Distrikt vereint mindestens den unten eingestellten Anteil des Artikelvolumens auf sich. <b>{2}</b> = echtes Volumen, aber netzweit verteilt ohne dominanten Distrikt. Empfohlenes DC je Distrikt = der Standort, der diesen Distrikt laut Sales History bereits am stärksten beliefert.': 'Per article, the SKU View volume (Shipping Point → DC → district, using the same Sales-History distribution key as everywhere else) is broken down into its district shares. <b>{0}</b> = low turnover (C article, bottom 5&nbsp;% of cumulative volume) — spreading it across several sites would multiply safety stock without meaningfully improving service level. <b>{1}</b> = a single district accounts for at least the share of the article\'s volume set below. <b>{2}</b> = genuine volume, but spread network-wide with no dominant district. Recommended DC per district = the site that, per Sales History, already supplies that district the most.',
    'Je Artikel: SKU-View-Volumen über Sales-History-Distrikt-Anteile (s. Geografischer Fußabdruck je DC) auf Distrikte verteilt. ABC-Klasse = kumulierte Mengen-Rangfolge über alle Artikel (80/15/5-Grenzen). Empfehlung: "Zentral" wenn C-Klasse (unterste 5 % der kumulierten Menge); sonst "Regional" wenn ein Distrikt ≥ Schwellwert (einstellbar) des Artikelvolumens auf sich vereint, empfohlenes DC = laut Sales History stärkster Versorger dieses Distrikts; sonst "Mehrere Standorte".': 'Per article: SKU View volume distributed across districts via Sales-History district shares (see Geographic footprint per DC). ABC class = cumulative-volume ranking across all articles (80/15/5 cut-offs). Recommendation: "Central" if C class (bottom 5% of cumulative volume); otherwise "Regional" if one district accounts for ≥ the (adjustable) threshold of the article\'s volume, recommended DC = the strongest supplier of that district per Sales History; otherwise "Multiple sites".',
    'Jeder Ship-to-Kunde aus Destinations × Ship-to-Address (siehe Distrikt-Zentroid) einzeln, eingefärbt nach dem DC, das seinen Distrikt unter dem gewählten Szenario versorgt.': 'Every ship-to customer from Destinations × Ship-to-Address (see District centroid) shown individually, coloured by the DC that serves its district under the selected scenario.',
    'Jeder Standort wird auf einen Ziel-Standort abgebildet (identisch = bleibt eigenständig / Standort besteht weiter).': 'Every site is mapped to a target site (identical = stays independent / site continues to exist).',
    'Klassische Sicherheitsbestandsformel. σ wird direkt aus der monatlichen Ist-Verteilung der tatsächlich an diesem Standort landenden Menge berechnet (nicht aus einer angenommenen Kennzahl) — dadurch sinkt der GESAMTE Sicherheitsbestand automatisch, wenn Nachfrage auf weniger Standorte konsolidiert wird (Pooling-Effekt), und steigt bei Aufteilung auf mehr Standorte, sofern die Monatsmengen nicht perfekt korreliert sind. z ist der einstellbare "Sicherheits-Faktor" (Daten & Import → Mengenlogik; z=1 ≈ 84 %, z=1,65 ≈ 95 % Servicegrad, Normalverteilung angenommen).': 'Classic safety-stock formula. σ is computed directly from the actual monthly distribution of the quantity that genuinely lands at this site (not from an assumed metric) — so the TOTAL safety stock automatically falls when demand is consolidated onto fewer sites (pooling effect), and rises when split across more sites, as long as the monthly quantities aren\'t perfectly correlated. z is the adjustable "safety factor" (Data & Import → Quantity logic; z=1 ≈ 84%, z=1.65 ≈ 95% service level, assuming a normal distribution).',
    'Lokaler Speicher voll — Rohdaten werden nicht automatisch gesichert. Bitte Projektdatei manuell speichern.': 'Local storage full — raw data is not being backed up automatically. Please save the project file manually.',
    'Mengenbasis: Forecast (Perioden/Kategorien nur dort vorhanden). Der geografische Fußabdruck je Standort — und damit Distanz/Transportkosten/Score je Kandidat — stammt aus der echten Sales History (siehe Formelübersicht in Berichte). Eine artikelscharfe Standortempfehlung liefert der Bericht „Artikel-Standortanalyse“.': 'Quantity basis: Forecast (periods/categories only available there). The geographic footprint per site — and thus distance/transport cost/score per candidate — comes from real Sales History (see the formula reference under Reports). An article-precise site recommendation is provided by the “Article location analysis” report.',
    'Mittelwert von Forecast-Menge (ESU) je (DC, Artikel, Monat)-Zeile': 'Average of forecast quantity (ESU) per (DC, article, month) row',
    'Netzwerk-Standardwerte; einzelne DCs können diese in der DC-Verwaltung überschreiben.': 'Network default values; individual DCs can override these under DC Management.',
    'Noch keine Distributionszentren. Werden beim Import von SKU View oder DC Translation Table automatisch angelegt, oder hier manuell erfassen.': 'No distribution centers yet. These are created automatically when importing SKU View or DC Translation Table, or can be entered manually here.',
    'Noch keine Szenarien gespeichert. Benutzerdefiniert anlegen oder ein Simulationsergebnis als Szenario speichern.': 'No scenarios saved yet. Create a custom one, or save a simulation result as a scenario.',
    'Nur ausgewählte Standorte werden als Kandidaten bewertet.': 'Only selected sites are evaluated as candidates.',
    'Näherung: eine Sendung wird als (Distrikt, Periode)-Bündel aus dem Forecast approximiert, da keine Auftrags-/Lieferpositionen vorliegen. &bdquo;Taps&ldquo; wird über die SKU-Kategorie (Marketing-View / Productline) erkannt, die eines der obigen Schlüsselwörter enthält.': 'Approximation: a shipment is approximated as a (district, period) bundle from the forecast, since no order/delivery line items are available. “Taps” is detected via the SKU category (Marketing View / Productline) containing one of the keywords above.',
    'Optional: eine Region fest einem Standort zuweisen, unabhängig von der aus den Versanddaten abgeleiteten Basistopologie (Beispiel: „Sevlievo deckt Osteuropa“).': 'Optional: permanently assign a region to a site, independent of the base topology derived from shipping data (example: “Sevlievo covers Eastern Europe”).',
    'PAL = Forecast-Durchsatz im gewählten Zeitraum (Basis für Transportkosten/Anteil). Slots = Ziel-Palettenbestand je Standort = Zyklusbestand (Ø Menge × Reichweite, unabhängig von der Standortanzahl) + Sicherheitsbestand (aus der echten monatlichen Schwankung am jeweiligen Standort, sinkt bei Konsolidierung). Wie stark der Sicherheitsbestand insgesamt ausfällt bzw. wie stark er bei Konsolidierung sinkt, hängt von der tatsächlichen Schwankungsbreite der Monatsmengen im Forecast ab — ein sehr gleichmäßiger Forecast (Plan statt Ist-Nachfrage) zeigt entsprechend einen kleineren Effekt. Formel/Details: Berichte → Formelübersicht.': 'PAL = forecast throughput in the selected period (basis for transport cost/share). Slots = target pallet stock per site = cycle stock (avg. quantity × coverage, independent of the number of sites) + safety stock (from the real monthly variability at that site, falls with consolidation). How large the safety stock is overall, and how much it falls under consolidation, depends on the actual variability of the forecast\'s monthly quantities — a very even forecast (a plan rather than actual demand) accordingly shows a smaller effect. Formula/details: Reports → Formula reference.',
    'Paletten = Menge (Stück je Monat, Spalten L–AI im Forecast-File) ÷ Pallett Load (artikelspezifisch, aus dem Forecast)': 'Pallets = quantity (units per month, columns L–AI in the Forecast file) ÷ pallet load (article-specific, from the forecast)',
    'Picking Bins = ⌈SKU-Anzahl ÷ {0} SKUs je Bin⌉ (einstellbar unter Daten &amp; Import → Mengenlogik).': 'Picking bins = ⌈SKU count ÷ {0} SKUs per bin⌉ (adjustable under Data & Import → Quantity logic).',
    'Primär: mengengewichtetes Mittel echter Kundenkoordinaten (Destinations-ESU je Ship-to-Party × Ship-to-Address-Ort/Land); ersatzweise mengengewichtetes Mittel der Länder-Zentroide laut Sales Hierarchie/Sales History.': 'Primary: volume-weighted average of real customer coordinates (Destinations ESU per ship-to party × Ship-to-Address city/country); otherwise the volume-weighted average of the country centroids per Sales Hierarchie/Sales History.',
    'Proxy für eine Sendung, da keine Auftrags-/Lieferpositionen vorliegen.': 'Proxy for a shipment, since no order/delivery line items are available.',
    'Proxy: je (Distrikt, Periode, Material)-Zeile aus dem Forecast als Stellvertreter für eine Sendung, da keine Auftrags-/Lieferpositionen vorliegen.': 'Proxy: each (district, period, material) row from the forecast stands in for a shipment, since no order/delivery line items are available.',
    'Redundanzvermeidung aktiv: {0} Artikel ({1} PAL) wurden gemäß Artikel-Standortanalyse direkt ihrem einen empfohlenen Standort zugewiesen (zentral bei geringer Drehung, regional bei starkem Distrikt-Bezug), statt über mehrere Standorte gestreut zu werden — vermeidet doppelten Sicherheitsbestand für dasselbe Volumen.': 'Redundancy avoidance active: {0} articles ({1} PAL) were assigned directly to their one recommended site per the article location analysis (central for low turnover, regional for strong district affinity) instead of being spread across several sites — avoids duplicate safety stock for the same volume.',
    'Regionspauschale, sonst Grundkosten + €/km × Distanz': 'Regional flat rate, otherwise base cost + €/km × distance',
    'Reine Durchlaufmenge (Ø Menge im Zeitraum × Reichweite) — bei gleicher Gesamtmenge unabhängig davon, auf wie viele Standorte sie verteilt wird. Reichweite wird in Monaten gepflegt (30,44 Tage/Monat, mittlere Monatslänge).': 'Pure throughput quantity (avg. quantity in the period × coverage) — independent, for the same total quantity, of how many sites it\'s spread across. Coverage is maintained in months (30.44 days/month, average month length).',
    'SKU-Anzahl = Anzahl unterschiedlicher Artikel im Forecast je DC; Picking Bins = ⌈SKU-Anzahl ÷ SKUs je Bin⌉': 'SKU count = number of distinct articles in the forecast per DC; picking bins = ⌈SKU count ÷ SKUs per bin⌉',
    'Sicherheitsbestand(Standort) = z × σ(monatliche Palettenmenge am Standort) × √Reichweite(Monate)': 'Safety stock(site) = z × σ(monthly pallet quantity at the site) × √coverage(months)',
    'Simulationsbasierte Szenarien: Zuordnung direkt aus der Simulation. Andere Szenarien/aktueller Stand: der laut Sales History mengenmäßig dominante Quell-DC je Distrikt, ggf. über eine regionale Override-Zuordnung umgeleitet.': 'Simulation-based scenarios: assignment straight from the simulation. Other scenarios/current state: the source DC that, per Sales History, dominates each district by volume, optionally redirected via a regional override assignment.',
    'Speichert Modus, Kategorie/Zeitraum-Filter, ausgewählte Standorte und Gewichtung dieser Simulation als Szenario. Das Szenario wird bei jeder Auswertung live mit den aktuellen Daten/Einstellungen neu berechnet.': 'Saves this simulation\'s mode, category/period filter, selected sites and weighting as a scenario. The scenario is recalculated live from the current data/settings every time it\'s evaluated.',
    'Struktur mit dreizeiliger Kopfzeile (Division / Kennzahl / ID) und Spalten-Duplikaten — Spalten werden automatisch erkannt (Overall-Result-Spalte in Spalte {0}).': 'Structure with a three-row header (division / metric / ID) and duplicate columns — columns are detected automatically (Overall Result column in column {0}).',
    'Szenario „{0}“': 'Scenario “{0}”',
    'Transit = Handlingtage + Distanz ÷ km pro Tag': 'Transit = handling days + distance ÷ km per day',
    'Vorhandene Daten, DCs, Szenarien und Einstellungen werden durch die Demodaten ersetzt.': 'Existing data, DCs, scenarios and settings will be replaced by the demo data.',
    'Zeigt die am gewählten Szenario beteiligten DCs und, adressgenau auf Basis der Ship-to-Adressdaten, wo deren Kunden liegen — je Standort in dessen eigener Farbe eingefärbt.': 'Shows the DCs involved in the selected scenario and, at address-level precision from the Ship-to-Address data, where their customers are — each site coloured in its own colour.',
    'Ziel-Palettenbestand = Zyklusbestand + Sicherheitsbestand': 'Target pallet stock = cycle stock + safety stock',
    'Zwei getrennte Bestandteile, siehe unten. Bei Kategorie "Alle" wird für den Zyklusbestand nicht ein einzelner globaler Coverage-Wert auf die Gesamtmenge angewandt: jede Kategorie wird mit ihrer eigenen (ggf. individuell hinterlegten) Ziel-Reichweite gerechnet und die Ergebnisse werden aufsummiert — sonst würde eine je Kategorie unterschiedliche Reichweite unbemerkt überschrieben.': 'Two separate components, see below. For category "All", the cycle stock isn\'t computed by applying one single global coverage value to the total quantity: each category is computed with its own (optionally individually set) target coverage and the results are summed — otherwise a coverage that differs by category would be silently overridden.',
    '100 × (0,7 × Bestandsfähigkeit + 0,3 × Reaktionsfähigkeit)': '100 × (0.7 × stock capability + 0.3 × responsiveness)',
    '100 × günstigste €/Palette im Bewerberfeld ÷ eigene €/Palette': '100 × cheapest €/pallet in the candidate field ÷ own €/pallet',
    'Auslastung ≤ Grenze: 100 − 50 × (Auslastung ÷ Grenze); Grenze…100%: 50 × (1 − (Auslastung − Grenze) ÷ (1 − Grenze)); darüber: 0': 'Utilization ≤ limit: 100 − 50 × (utilization ÷ limit); limit…100%: 50 × (1 − (utilization − limit) ÷ (1 − limit)); above that: 0',
    'Σ normierte Gewichte × Teil-Scores (Kapazität/Transport/Service)': 'Σ normalized weights × partial scores (capacity/transport/service)',
    'Beim Zusammenlegen von DC X in DC Y wird der Distrikt-Fußabdruck von X (s.o.) 1:1 auf Y übertragen, gewichtet mit dem Forecast-Volumen von X.': 'When merging DC X into DC Y, X\'s district footprint (see above) is carried over 1:1 to Y, weighted by X\'s forecast volume.',
    'Bedarf/Tag = Σ Paletten ÷ Σ echte Tageslängen der Perioden im Filter': 'Demand/day = Σ pallets ÷ Σ actual day lengths of the periods in the filter',
    '{0} Monatsspalten erkannt ({1} … {2})': '{0} month columns detected ({1} … {2})',
    '{0} der Menge': '{0} of volume',
    '{0} von {1} Artikeln entsprechen dem Filter{2}.': '{0} of {1} articles match the filter{2}.',
    'Ship-to-Adressen ({0} Kunden)': 'Ship-to addresses ({0} customers)',
    'Zyklusbestand = Bedarf/Tag × 30,44 × Reichweite(Monate) × Sicherheitsaufschlag': 'Cycle stock = demand/day × 30.44 × coverage(months) × safety surcharge',
    'Ist = reale historische ESU-Menge je Distrikt aus der Sales History (Zeitraum It. Quelldatei, i.d.R. 12 Monate). Forecast = abgeleiteter Distrikt-Fußabdruck über den gesamten geladenen Forecast-Horizont (Menge je DC, verteilt nach dessen historischem Distrikt-Mix). <b>Achtung:</b> Forecast-Mengen liegen in Stück, Sales History in ESU (Equivalent Sales Unit) vor — beide Skalen sind nicht 1:1 vergleichbar, zusätzlich deckt der Forecast meist einen längeren Zeitraum ab. Die absolute Kennzahl „Forecast/Ist“ ist daher nur ein grober Anhaltspunkt; aussagekräftiger ist die <i>relative</i> Verteilung über die Distrikte in beiden Spalten.': 'Actual = real historical ESU volume per district from Sales History (period per the source file, usually 12 months). Forecast = derived district footprint across the entire loaded forecast horizon (quantity per DC, distributed by its historical district mix). <b>Note:</b> forecast quantities are in units, Sales History in ESU (Equivalent Sales Unit) — the two scales aren\'t directly comparable 1:1, and the forecast usually covers a longer period besides. The absolute “Forecast/actual” figure is therefore only a rough indicator; the <i>relative</i> distribution across districts in both columns is more meaningful.',
  };

  var lang = 'de';

  function t(s) {
    if (s === null || s === undefined) return s;
    if (lang === 'de') return s;
    return DICT[s] || s;
  }

  function tf(s) {
    var out = t(s);
    for (var i = 1; i < arguments.length; i++) {
      out = out.split('{' + (i - 1) + '}').join(String(arguments[i]));
    }
    return out;
  }

  function applyStatic(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-t]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-t');
      nodes[i].textContent = t(key);
    }
    var ph = root.querySelectorAll('[data-t-ph]');
    for (var j = 0; j < ph.length; j++) {
      ph[j].setAttribute('placeholder', t(ph[j].getAttribute('data-t-ph')));
    }
  }

  function locale() { return lang === 'de' ? 'de-DE' : 'en-GB'; }

  function fmtNum(v, decimals) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    try {
      return new Intl.NumberFormat(locale(), { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 }).format(v);
    } catch (e) { return v.toFixed(decimals || 0); }
  }
  function fmtInt(v) { return fmtNum(Math.round(v), 0); }
  function fmtPct(v, decimals) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    return fmtNum(v * 100, decimals === undefined ? 1 : decimals) + ' %';
  }
  function fmtCur(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    try {
      return new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
    } catch (e) { return fmtInt(v) + ' EUR'; }
  }
  function fmtDate(d) {
    try { return new Intl.DateTimeFormat(locale()).format(d); } catch (e) { return String(d); }
  }

  LNP.i18n = {
    get: function () { return lang; },
    setLang: function (l) {
      lang = (l === 'en') ? 'en' : 'de';
      try { window.localStorage.setItem('lnp.lang', lang); } catch (e) {}
      applyStatic(document);
      if (LNP.state) LNP.state.emit('lang');
    },
    init: function () {
      try {
        var saved = window.localStorage.getItem('lnp.lang');
        if (saved) lang = saved;
      } catch (e) {}
      applyStatic(document);
    },
    t: t, tf: tf, applyStatic: applyStatic, locale: locale,
    fmtNum: fmtNum, fmtInt: fmtInt, fmtPct: fmtPct, fmtCur: fmtCur, fmtDate: fmtDate
  };
})();
