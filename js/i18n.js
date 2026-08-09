/* =========================================================================
   i18n.js – Zweisprachigkeit Deutsch / Englisch
   ---------------------------------------------------------------------------
   Schlüssel ist der deutsche Originaltext. Fehlt eine Übersetzung, wird der
   deutsche Text unverändert ausgegeben – die Oberfläche bleibt damit immer
   funktionsfähig.

   Statische Texte aus index.html werden beim Start einmalig erfasst und bei
   jedem Sprachwechsel neu gesetzt. Dynamisch erzeugte Texte laufen über t().
   ========================================================================= */
window.LNP = window.LNP || {};

(function (NS) {
  'use strict';

  var STORAGE_KEY = 'netplan.lang';
  var lang = 'de';

  /* ==================================================================== *
   *  Wörterbuch
   * ==================================================================== */
  var EN = {
    /* ---------- Navigation und Kopfbereich ---------- */
    'Logistik-Netzwerkplanung': 'Logistics Network Planning',
    'Dashboard': 'Dashboard',
    'Daten & Import': 'Data & Import',
    'DC-Verwaltung': 'DC Management',
    'Simulation': 'Simulation',
    'Szenarien': 'Scenarios',
    'Export & Projekt': 'Export & Project',
    'Überblick über Netzwerk, Auslastung und Kosten': 'Network, utilisation and cost at a glance',
    'Versandhistorie und Forecast einlesen, Zielreichweiten festlegen': 'Import shipment history and forecast, set target coverage',
    'Distributionszentren anlegen, bearbeiten und bewerten': 'Create, edit and evaluate distribution centres',
    'Zuordnung der Produktkategorien zu Distributionszentren ermitteln': 'Determine the allocation of product categories to distribution centres',
    'Varianten parallel anlegen und gegenüberstellen': 'Create and compare variants side by side',
    'Ergebnisse exportieren, Projekt sichern, Kostenparameter pflegen': 'Export results, save the project, maintain cost parameters',
    'DCs': 'DCs',
    'Datensätze': 'Records',
    'Alle Daten bleiben im Browser. Es werden keine Daten an einen Server gesendet.':
      'All data stays in your browser. Nothing is sent to a server.',
    'Auto-Speichern: an': 'Auto-save: on',
    'Auto-Speichern: aus': 'Auto-save: off',
    'Zwischenspeicherung im Browser (localStorage)': 'Local caching in the browser (localStorage)',
    'Hell/Dunkel umschalten': 'Toggle light/dark',
    '◐ Theme': '◐ Theme',
    'Demodaten laden': 'Load demo data',
    'Sprache umschalten': 'Switch language',

    /* ---------- Dashboard ---------- */
    'Noch keine Auswertung vorhanden': 'No analysis yet',
    'Legen Sie Distributionszentren an und importieren Sie Versand- oder Forecast-Daten. Anschließend simulieren Sie die Zuordnung der Produktkategorien.':
      'Create distribution centres and import shipment or forecast data. Then simulate the allocation of your product categories.',
    'DC anlegen': 'Create DC',
    'Daten importieren': 'Import data',
    'Ziel-Bestand vs. Kapazität je DC': 'Target stock vs. capacity per DC',
    'Stellplätze (Paletten)': 'Pallet positions',
    'Kostenverteilung je DC': 'Cost breakdown per DC',
    'EUR im Betrachtungszeitraum': 'EUR over the analysis period',
    'Volumenverteilung Kategorie → DC': 'Volume split category → DC',
    'Paletten im Betrachtungszeitraum': 'Pallets over the analysis period',
    'Netzwerkkarte': 'Network map',
    'Darstellung': 'Display',
    'Automatisch': 'Automatic',
    'Kartenkacheln (online)': 'Map tiles (online)',
    'Schema (offline)': 'Schematic (offline)',
    'Detailergebnisse je DC und Kategorie': 'Detailed results per DC and category',
    'CSV': 'CSV',

    /* KPI-Kacheln */
    'Gesamtkapazität': 'Total capacity',
    'Stellplätze': 'pallet positions',
    'Auslastung': 'Utilisation',
    'Ziel-Bestand (zugeordnet)': 'Target stock (allocated)',
    'Transportkosten': 'Transport cost',
    'Lager- & Handlingkosten': 'Storage & handling cost',
    'Gesamtkosten': 'Total cost',
    'Ø Bewertung': 'Avg. score',
    'Aktive DCs': 'Active DCs',
    'Belegung (inkl. Zuordnungen)': 'Occupancy (incl. allocations)',
    'Standorte mit Koordinaten': 'Sites with coordinates',
    'Grundlage für Distanzberechnung': 'Basis for distance calculation',
    '{0} aktive Standorte': '{0} active sites',
    '{0} inaktiv': '{0} inactive',
    '{0} belegt · {1} frei': '{0} occupied · {1} free',
    '{0} von {1} Kategorien zugeordnet': '{0} of {1} categories allocated',
    '{0} von {1}': '{0} of {1}',
    'Ø Distanz {0}': 'Avg. distance {0}',
    'im Betrachtungszeitraum': 'over the analysis period',
    'davon Lager {0}': 'of which storage {0}',
    '{0} € je Palette': '{0} € per pallet',
    'inkl. Fixkosten': 'incl. fixed cost',
    '{0} Zuordnung(en) über Kapazität': '{0} allocation(s) exceed capacity',
    'alle Zuordnungen kapazitätsgerecht': 'all allocations within capacity',

    /* ---------- Daten & Import ---------- */
    '1 · Datei einlesen': '1 · Read file',
    '2 · Spalten zuordnen': '2 · Map columns',
    '3 · Mengenlogik & Umrechnung': '3 · Quantity logic & conversion',
    '4 · Zielreichweite je Kategorie': '4 · Target coverage per category',
    '5 · Regionen & Koordinaten': '5 · Regions & coordinates',
    'CSV, XLSX, XLS – Verarbeitung ausschließlich lokal im Browser':
      'CSV, XLSX, XLS – processed exclusively in your browser',
    'Datensatz-Typ': 'Data set type',
    'Historie': 'History',
    'Forecast': 'Forecast',
    'Historische Versanddaten oder extern erstellter Forecast. Beide nutzen dasselbe Schema.':
      'Historical shipment data or an externally produced forecast. Both use the same schema.',
    'Import-Modus': 'Import mode',
    'Anhängen': 'Append',
    'Ersetzen': 'Replace',
    '„Ersetzen“ löscht vorhandene Datensätze des gewählten Typs.':
      '“Replace” deletes existing records of the selected type.',
    'Datenebene': 'Data level',
    'Einzeltransaktion': 'Single transaction',
    'Aggregiert': 'Aggregated',
    'Einzellieferungen und bereits aggregierte Zeilen (z.B. je Monat/Kunde) werden beide unterstützt.':
      'Individual deliveries and pre-aggregated rows (e.g. per month/customer) are both supported.',
    'Datei hierher ziehen': 'Drop a file here',
    'oder': 'or',
    'Datei auswählen': 'choose a file',
    'Unterstützt: .csv, .txt (Trennzeichen wird erkannt), .xlsx, .xls':
      'Supported: .csv, .txt (delimiter detected automatically), .xlsx, .xls',
    'Tabellenblatt': 'Worksheet',
    'Ordnen Sie die Spalten Ihrer Datei den Feldern des Datenmodells zu. Erkannte Zuordnungen sind vorbelegt.':
      'Map the columns of your file to the fields of the data model. Detected matches are pre-selected.',
    'Vorschau der Datei (erste 8 Zeilen)': 'File preview (first 8 rows)',
    'Abbrechen': 'Cancel',
    'Import ausführen': 'Run import',
    '– nicht zugeordnet –': '– not mapped –',
    'erkannt': 'detected',
    'Kunde': 'Customer',
    'Land': 'Country',
    'Region': 'Region',
    'Produktkategorie': 'Product category',
    'Periode / Datum': 'Period / date',
    'Menge (Stück)': 'Quantity (units)',
    'Umsatz (EUR)': 'Revenue (EUR)',
    'Transportvolumen (m³)': 'Transport volume (m³)',
    'Paletten': 'Pallets',
    'Paletten-Äquivalent': 'Pallet equivalent',
    'Breitengrad (optional)': 'Latitude (optional)',
    'Längengrad (optional)': 'Longitude (optional)',

    'Wird angewandt, wenn Paletten nicht direkt in den Daten stehen':
      'Applied when pallets are not stated directly in the data',
    'Stück je Palette': 'Units per pallet',
    'Volumen je Palette (m³)': 'Volume per pallet (m³)',
    'Betrachtungszeitraum (Tage)': 'Analysis period (days)',
    'Umschlagfaktor Bestand': 'Stock safety factor',
    'Aufschlag auf den Ziel-Bestand (z.B. 1,1 für Sicherheitspuffer)':
      'Uplift on target stock (e.g. 1.1 for a safety buffer)',
    'automatisch': 'automatic',
    'Priorität der Palettenermittlung:': 'Pallet derivation priority:',
    'Volumen ÷ Volumen je Palette': 'Volume ÷ volume per pallet',
    'Menge ÷ Stück je Palette': 'Quantity ÷ units per pallet',

    'Ziel-Bestand = Bedarf pro Tag × Zielreichweite': 'Target stock = demand per day × target coverage',
    'Globale Zielreichweite (Tage)': 'Global target coverage (days)',
    'Auf alle Kategorien anwenden': 'Apply to all categories',
    'Diese Übersicht rechnet über': 'This overview is calculated across',
    'alle importierten Daten': 'all imported data',
    '(Historie und Forecast zusammen). Die Simulation verwendet dagegen die dort gewählte Datenbasis und den gewählten Zeitraum – der Bedarf je Tag kann daher abweichen.':
      '(history and forecast combined). The simulation, by contrast, uses the data basis and period selected there – so demand per day may differ.',
    'Volumen (Paletten)': 'Volume (pallets)',
    'Zeitraum (Tage)': 'Period (days)',
    'Bedarf je Tag': 'Demand per day',
    'Zielreichweite (Tage)': 'Target coverage (days)',
    'Ziel-Bestand (Stellplätze)': 'Target stock (positions)',

    'Koordinaten automatisch ergänzen': 'Fill in coordinates automatically',
    'Für Distanz- und Kartendarstellung benötigt jede Kundenregion Koordinaten. Bekannte Länder/Regionen werden automatisch erkannt, alle Werte sind manuell überschreibbar.':
      'Every customer region needs coordinates for distance calculation and the map. Known countries and regions are detected automatically; every value can be overridden.',
    'Region / Land': 'Region / country',
    'Breitengrad': 'Latitude',
    'Längengrad': 'Longitude',
    'Quelle': 'Source',
    'Koordinaten fehlen': 'coordinates missing',
    'manuell': 'manual',
    'datei': 'file',
    'offen': 'open',

    'Datenbestand': 'Data inventory',
    'Alle Datensätze': 'All records',
    'Nur Historie': 'History only',
    'Nur Forecast': 'Forecast only',
    'Daten löschen': 'Delete data',
    'Typ': 'Type',
    'Periode': 'Period',
    'Kategorie': 'Category',
    'Menge': 'Quantity',
    'Umsatz': 'Revenue',
    'Volumen m³': 'Volume m³',
    'Kategorien': 'Categories',
    'Regionen': 'Regions',
    'Perioden': 'Periods',
    'Volumen gesamt': 'Total volume',
    '{0} Datensätze': '{0} records',
    '{0} Paletten': '{0} pallets',
    'Anzeige der ersten {0} von {1} Datensätzen.': 'Showing the first {0} of {1} records.',

    /* ---------- DC-Verwaltung ---------- */
    'Distributionszentren': 'Distribution centres',
    'Distributionszentrum': 'Distribution centre',
    'DCs aus Datei importieren': 'Import DCs from file',
    '+ Neues DC': '+ New DC',
    'Noch keine Distributionszentren angelegt.': 'No distribution centres created yet.',
    'Netzwerk-Kennzahlen': 'Network key figures',
    'Summen über alle aktiven DCs': 'Totals across all active DCs',
    'DC': 'DC',
    'Standort': 'Location',
    'Koordinaten': 'Coordinates',
    'fehlt': 'missing',
    'Kapazität': 'Capacity',
    'Grundbelegung': 'Base occupancy',
    'Lager €/Platz/Mon.': 'Storage €/pos./mth',
    'Transport €/Pal.': 'Transport €/pal.',
    'Sonderpreise': 'Special rates',
    '{0} Region(en)': '{0} region(s)',
    'Status': 'Status',
    'aktiv': 'active',
    'inaktiv': 'inactive',
    'Bearbeiten': 'Edit',
    'Duplizieren': 'Duplicate',
    'Löschen': 'Delete',
    '(Kopie)': '(copy)',

    'Neues Distributionszentrum': 'New distribution centre',
    'DC bearbeiten': 'Edit DC',
    'Name *': 'Name *',
    'Kurzcode': 'Short code',
    'Region / Standort': 'Region / location',
    'Breitengrad (lat)': 'Latitude (lat)',
    'Längengrad (lng)': 'Longitude (lng)',
    'Kapazität (Stellplätze)': 'Capacity (pallet positions)',
    'Bereits belegte Stellplätze': 'Positions already occupied',
    'Vorbelegung durch nicht simulierte Sortimente': 'Occupancy from ranges not covered by the simulation',
    'Lagerkosten je Stellplatz/Monat (EUR)': 'Storage cost per position/month (EUR)',
    'Handlingkosten je Palette (EUR)': 'Handling cost per pallet (EUR)',
    'Transport-Grundkosten je Palette (EUR)': 'Transport base cost per pallet (EUR)',
    'Transportkosten je Paletten-km (EUR)': 'Transport cost per pallet-km (EUR)',
    'Leer = Netzwerk-Standardwert': 'Empty = network default',
    'Fixkosten je Periode (EUR)': 'Fixed cost per period (EUR)',
    'Aktiv': 'Active',
    'Inaktiv (nicht in Simulation)': 'Inactive (excluded from simulation)',
    'Regionsspezifische Transportkosten (EUR je Palette)': 'Region-specific transport rates (EUR per pallet)',
    '+ Region hinzufügen': '+ Add region',
    'Pauschale je Zielregion. Überschreibt die distanzbasierte Berechnung für diese Region.':
      'Flat rate per destination region. Overrides the distance-based calculation for that region.',
    'Region / Land': 'Region / country',
    'EUR je Palette': 'EUR per pallet',
    'Speichern': 'Save',
    'Schließen': 'Close',
    'Standard: {0}': 'Default: {0}',

    /* ---------- Simulation ---------- */
    'Simulationsparameter': 'Simulation parameters',
    'Datenbasis': 'Data basis',
    'Historie + Forecast': 'History + forecast',
    'Periode von': 'Period from',
    'Periode bis': 'Period to',
    'Zuordnungsmodus': 'Allocation mode',
    'Alleinzuordnung': 'Single allocation',
    'Splitting': 'Split',
    'manuell': 'manual',
    'Split': 'Split',
    'Max. Anzahl DCs im Split': 'Max. number of DCs in the split',
    'Zielreichweite dieser Kategorie (Tage)': 'Target coverage for this category (days)',
    'Gewichtung der Kriterien': 'Criteria weighting',
    'Zurücksetzen': 'Reset',
    'Kapazität & Balance': 'Capacity & balance',
    'Transportkosten / Distanz': 'Transport cost / distance',
    'Zielreichweite / Bestand': 'Target coverage / stock',
    'Normiert: Kapazität {0} · Transport {1} · Reichweite {2}':
      'Normalised: capacity {0} · transport {1} · coverage {2}',
    'Ziel-Auslastungsgrenze': 'Target utilisation limit',
    'Ab dieser Auslastung wird ein DC im Kapazitäts-Score abgewertet.':
      'Above this utilisation a DC is penalised in the capacity score.',
    'Simulation starten': 'Run simulation',
    'Alle Kategorien simulieren': 'Simulate all categories',
    'Simulation noch nicht ausgeführt': 'Simulation not run yet',
    'Wählen Sie links eine Produktkategorie und starten Sie die Simulation.':
      'Select a product category on the left and start the simulation.',

    'Empfehlung': 'Recommendation',
    'Aufteilung auf {0} Standorte': 'Split across {0} sites',
    'Kategorie „{0}“ – kombinierte Belieferung nach regionaler Nähe und verfügbarer Kapazität.':
      'Category “{0}” – combined supply based on regional proximity and available capacity.',
    'Kategorie „{0}“ vollständig aus diesem Distributionszentrum.':
      'Category “{0}” served entirely from this distribution centre.',
    'Die Kapazität reicht für den Ziel-Bestand nicht aus.': 'Capacity is not sufficient for the target stock.',
    '{0} Paletten konnten nicht kapazitätsgerecht untergebracht werden.':
      '{0} pallets could not be placed within available capacity.',
    '{0} Region(en) ohne Koordinaten – für diese wird eine mittlere Netzdistanz angenommen.':
      '{0} region(s) without coordinates – an average network distance is assumed for these.',
    'Ausschlaggebend ist <b>{0}</b> mit {1} von {2} Punkten (Teil-Score {3}).':
      'The decisive factor is <b>{0}</b> with {1} of {2} points (sub-score {3}).',
    ' Der Abstand zum zweitplatzierten Standort {0} beträgt {1} Punkte':
      ' The gap to the runner-up site {0} is {1} points',
    ' bei {0} € Unterschied je Palette.': ', at a difference of {0} € per pallet.',
    'Kapazität und Auslastungsbalance': 'capacity and utilisation balance',
    'Transportkosten bzw. Kundennähe': 'transport cost and proximity to customers',
    'Einhaltung der Zielreichweite': 'meeting the target coverage',
    'Gesamt-Score': 'Total score',
    'Volumen': 'Volume',
    'Pal.': 'pal.',
    'Ziel-Bestand': 'Target stock',
    'Plätze': 'positions',
    'Zielreichweite': 'Target coverage',
    'Tage': 'days',
    'Ø Distanz': 'Avg. distance',
    'Auslastung danach': 'Utilisation after',

    'Bewertung aller Standorte': 'Evaluation of all sites',
    'Gewichteter Gesamt-Score aus drei Teil-Scores': 'Weighted total score from three sub-scores',
    'gewählt': 'selected',
    'Transport': 'Transport',
    'Reichweite': 'Coverage',
    'Transit': 'Transit',
    '€/Palette': '€/pallet',
    'Frei': 'Free',
    'Reichweite erreichbar': 'Coverage achievable',
    'ausreichend': 'sufficient',
    'zu klein': 'too small',
    'überschritten': 'exceeded',

    'Score-Zusammensetzung': 'Score composition',
    'Beiträge der gewichteten Kriterien': 'Contributions of the weighted criteria',
    'Kapazität & Balance ({0})': 'Capacity & balance ({0})',
    'Transport / Distanz ({0})': 'Transport / distance ({0})',
    'Zielreichweite ({0})': 'Target coverage ({0})',

    'Aufteilung der Kategorie': 'Category split',
    'Anteile lassen sich manuell überschreiben': 'Shares can be overridden manually',
    'Anteil (%)': 'Share (%)',
    'Volumen (Pal.)': 'Volume (pal.)',
    'Freie Kapazität': 'Free capacity',
    'Lagerkosten': 'Storage cost',
    'Score': 'Score',
    'Summe der Anteile: {0} %': 'Sum of shares: {0} %',
    'Mit manuellen Anteilen neu rechnen': 'Recalculate with manual shares',

    'Regionale Zuordnung': 'Regional allocation',
    'Welche Kundenregion wird aus welchem DC beliefert?': 'Which customer region is served from which DC?',
    'Kundenregion': 'Customer region',
    'Beliefert aus': 'Served from',
    'Anteil der Region': 'Share of region',
    'Distanz': 'Distance',
    'geschätzt': 'estimated',
    'Zuordnung übernehmen': 'Apply allocation',

    'Aktuelle Zuordnungen': 'Current allocations',
    'Alle zurücksetzen': 'Reset all',
    'Modus': 'Mode',
    'Zuordnung': 'Allocation',
    'Anteil': 'Share',
    'Erneut simulieren': 'Simulate again',
    'Entfernen': 'Remove',

    /* ---------- Szenarien ---------- */
    'Szenario aus aktuellem Stand erzeugen': 'Create a scenario from the current state',
    'Ein Szenario friert DC-Konfiguration, Gewichtungen, Zielreichweiten und Zuordnungen ein und macht sie vergleichbar.':
      'A scenario freezes the DC configuration, weightings, target coverage and allocations, making them comparable.',
    'Bezeichnung': 'Name',
    'z.B. Zentralisiert, 21 Tage Reichweite': 'e.g. centralised, 21 days coverage',
    'Szenario speichern': 'Save scenario',
    'Szenario-Vergleich': 'Scenario comparison',
    'Noch keine Szenarien gespeichert.': 'No scenarios saved yet.',
    'Die Markierung „best“ kennzeichnet je Zeile den günstigsten bzw. höchsten Wert. Die Ø Bewertung wird mit der jeweils im Szenario hinterlegten Gewichtung berechnet – bei unterschiedlichen Gewichtungen sind Kosten und Auslastung die belastbareren Vergleichsgrößen.':
      'The “best” marker highlights the lowest or highest value in each row. The average score is computed with the weighting stored in each scenario – where weightings differ, cost and utilisation are the more reliable comparators.',
    'Gesamtkosten je Szenario': 'Total cost per scenario',
    'Auslastung & Service je Szenario': 'Utilisation & service per scenario',
    'Prozent': 'Per cent',
    'Zuordnungen im Vergleich': 'Allocations compared',
    'Kategorie → DC je Szenario': 'Category → DC per scenario',
    'Aktueller Stand': 'Current state',
    'live': 'live',
    '{0} gespeicherte Szenarien im Vergleich zum aktuellen Stand':
      '{0} saved scenarios compared with the current state',
    'Noch kein Szenario gespeichert – angezeigt wird nur der aktuelle Stand.':
      'No scenario saved yet – only the current state is shown.',
    'Kennzahl': 'Key figure',
    'Aktionen': 'Actions',
    'Laden': 'Load',
    'Umbenennen': 'Rename',
    'best': 'best',
    'Genutzte DCs': 'DCs in use',
    'Gesamtkapazität (Stellplätze)': 'Total capacity (positions)',
    'Ziel-Bestand zugeordnet': 'Target stock allocated',
    'Handlingkosten': 'Handling cost',
    'Fixkosten': 'Fixed cost',
    'Kosten je Palette': 'Cost per pallet',
    'Ø Bewertung (0–100)': 'Avg. score (0–100)',
    'Zielreichweite global (Tage)': 'Global target coverage (days)',
    'Zugeordnete Kategorien': 'Categories allocated',
    'Kapazitätsverletzungen': 'Capacity violations',
    'Auslastung (%)': 'Utilisation (%)',
    'Prozent bzw. Punkte (0–100)': 'Per cent or points (0–100)',
    'Noch keine Zuordnungen vorhanden.': 'No allocations yet.',

    /* ---------- Export ---------- */
    'Ergebnisse exportieren': 'Export results',
    'Der Download wird vollständig im Browser erzeugt – es findet kein Server-Roundtrip statt.':
      'The download is generated entirely in your browser – there is no server round trip.',
    'Excel-Arbeitsmappe (.xlsx)': 'Excel workbook (.xlsx)',
    'Ergebnisse als CSV': 'Results as CSV',
    'Zuordnungen als CSV': 'Allocations as CSV',
    'Szenario-Vergleich als CSV': 'Scenario comparison as CSV',
    'Die Excel-Mappe enthält die Blätter: KPI, DCs, Zuordnungen, Simulationsdetails, Regionen, Szenarien und Rohdaten.':
      'The workbook contains the sheets: KPI, DCs, Allocations, Simulation details, Regions, Scenarios and Raw data.',
    'Projekt sichern & laden': 'Save & load project',
    'Speichert bzw. lädt den kompletten Arbeitsstand (DCs, Daten, Einstellungen, Szenarien) als JSON-Datei.':
      'Saves or loads the complete working state (DCs, data, settings, scenarios) as a JSON file.',
    'Projekt als JSON speichern': 'Save project as JSON',
    'Projekt aus JSON laden': 'Load project from JSON',
    'Automatisch im Browser zwischenspeichern (localStorage)': 'Cache automatically in the browser (localStorage)',
    'Alles zurücksetzen': 'Reset everything',
    'Kostenparameter des Netzwerks': 'Network cost parameters',
    'Fallback, wenn im DC kein Wert hinterlegt ist': 'Fallback when no value is set on the DC',
    'Ø Transportleistung (km/Tag)': 'Avg. transport performance (km/day)',
    'Für die Ermittlung der Transitzeit aus der Distanz': 'Used to derive transit time from distance',
    'Fixe Handlingzeit (Tage)': 'Fixed handling time (days)',
    'Rechenlogik im Überblick': 'Calculation logic at a glance',

    /* Formeln */
    'Paletten je Datensatz': 'Pallets per record',
    'Paletten = Paletten-Äquivalent\n      → sonst Paletten\n      → sonst Volumen ÷ {0} m³\n      → sonst Menge ÷ {1} Stück':
      'Pallets = pallet equivalent\n      → else pallets\n      → else volume ÷ {0} m³\n      → else quantity ÷ {1} units',
    'Die erste verfügbare Größe wird verwendet. So lassen sich Dateien mit unterschiedlichem Detailgrad gemeinsam auswerten.':
      'The first available figure is used, so files with different levels of detail can be analysed together.',
    'Bedarf/Tag = Paletten im Zeitraum ÷ Zeitraum in Tagen\nZiel-Bestand = Bedarf/Tag × Zielreichweite × {0}':
      'Demand/day = pallets in period ÷ period length in days\nTarget stock = demand/day × target coverage × {0}',
    'Der Ziel-Bestand belegt Stellplätze im DC und ist damit die kapazitätswirksame Größe.':
      'Target stock occupies pallet positions in the DC and is therefore the capacity-relevant figure.',
    'Kosten/Palette = Grundkosten + Kosten/km × Distanz\nDistanz = Luftlinie × {0} (Umwegfaktor)':
      'Cost/pallet = base cost + cost/km × distance\nDistance = great-circle × {0} (detour factor)',
    'Regionsspezifische Pauschalen im DC überschreiben die distanzbasierte Rechnung.':
      'Region-specific flat rates on the DC override the distance-based calculation.',
    'Lager- und Handlingkosten': 'Storage and handling cost',
    'Lager = Ziel-Bestand × €/Stellplatz/Monat × Monate\nHandling = Paletten × €/Palette':
      'Storage = target stock × €/position/month × months\nHandling = pallets × €/pallet',
    'Werte je DC haben Vorrang vor den Netzwerk-Standardwerten.': 'Values set per DC take precedence over network defaults.',
    'Score Kapazität & Balance': 'Capacity & balance score',
    '100 → leeres DC\n 50 → an der Ziel-Auslastungsgrenze ({0})\n  0 → ab Vollauslastung':
      '100 → empty DC\n 50 → at the target utilisation limit ({0})\n  0 → at and above full utilisation',
    'Belohnt Reserve und eine ausgeglichene Auslastung im Netzwerk.': 'Rewards headroom and balanced utilisation across the network.',
    'Score Transport': 'Transport score',
    'Score = 100 × günstigste €/Palette ÷ eigene €/Palette': 'Score = 100 × lowest €/pallet ÷ own €/pallet',
    'Verhältnisskala: doppelte Kosten ergeben den halben Teil-Score.': 'Ratio scale: twice the cost yields half the sub-score.',
    'Score Zielreichweite': 'Target coverage score',
    'Score = 100 × (0,7 × Bestandsfähigkeit + 0,3 × Reaktionsfähigkeit)\nBestandsfähigkeit = freie Plätze ÷ Ziel-Bestand (max. 1)\nReaktionsfähigkeit = 1 − Transitzeit ÷ Zielreichweite':
      'Score = 100 × (0.7 × stock capability + 0.3 × responsiveness)\nStock capability = free positions ÷ target stock (max. 1)\nResponsiveness = 1 − transit time ÷ target coverage',
    'Transitzeit = {0} Tage Handling + Distanz ÷ {1} km/Tag.': 'Transit time = {0} days handling + distance ÷ {1} km/day.',
    'Score = w₁ × Kapazität + w₂ × Transport + w₃ × Reichweite':
      'Score = w₁ × capacity + w₂ × transport + w₃ × coverage',
    'Die Gewichte werden auf 100 % normiert. Die Teil-Beiträge sind im Diagramm „Score-Zusammensetzung“ einzeln ausgewiesen.':
      'Weights are normalised to 100 %. The individual contributions are shown in the “Score composition” chart.',

    /* ---------- Diagramme ---------- */
    'Zugeordneter Ziel-Bestand': 'Allocated target stock',
    'Überlast': 'Overload',
    'Überlast (Kapazität überschritten)': 'Overload (capacity exceeded)',
    'Lager': 'Storage',
    'Handling': 'Handling',
    'Auslastung: {0} · Kapazität: {1}': 'Utilisation: {0} · capacity: {1}',
    'Gesamt: {0}': 'Total: {0}',
    'Gesamt: {0} / 100': 'Total: {0} / 100',
    '{0} Stellplätze': '{0} pallet positions',
    '{0} Punkte': '{0} points',

    /* ---------- Karte ---------- */
    'Kartenkacheln werden von openstreetmap.org geladen. Ohne Internetzugang wird automatisch auf die Schema-Ansicht umgeschaltet.':
      'Map tiles are loaded from openstreetmap.org. Without internet access the view switches to the schematic automatically.',
    'Schema-Ansicht: Standorte und Regionen werden ohne externe Kartenkacheln auf einem Koordinatenraster dargestellt – vollständig offline nutzbar.':
      'Schematic view: sites and regions are placed on a coordinate grid without external map tiles – fully usable offline.',
    'Kartenkacheln nicht erreichbar – automatisch auf die Offline-Schema-Ansicht umgeschaltet.':
      'Map tiles unreachable – switched to the offline schematic view automatically.',
    'Vereinfachte Schemadarstellung (Leaflet nicht verfügbar): Positionen sind maßstäblich nach Koordinaten angeordnet.':
      'Simplified schematic (Leaflet unavailable): positions are placed to scale by coordinates.',
    'Keine Standorte mit Koordinaten vorhanden.': 'No sites with coordinates available.',
    'Kundenregion · {0} Paletten': 'Customer region · {0} pallets',
    'Kapazität {0} Stellplätze': 'Capacity {0} pallet positions',
    'Belegung {0}': 'Occupancy {0}',
    'Schematische Netzwerkkarte': 'Schematic network map',

    /* ---------- Meldungen ---------- */
    'Keine Daten vorhanden': 'No data available',
    'Zwischengespeicherter Arbeitsstand wiederhergestellt.': 'Cached working state restored.',
    'Bitte einen Namen für das DC angeben.': 'Please enter a name for the DC.',
    'Koordinaten für „{0}“ automatisch ergänzt.': 'Coordinates for “{0}” filled in automatically.',
    'DC „{0}“ aktualisiert.': 'DC “{0}” updated.',
    'DC „{0}“ angelegt.': 'DC “{0}” created.',
    'DC dupliziert.': 'DC duplicated.',
    'DC gelöscht.': 'DC deleted.',
    'DC „{0}“ wirklich löschen? Bestehende Zuordnungen zu diesem Standort werden entfernt.':
      'Really delete DC “{0}”? Existing allocations to this site will be removed.',
    'Die Datei enthält keine Zeilen.': 'The file contains no rows.',
    'Es konnte keine Spalte mit dem DC-Namen erkannt werden.': 'No column containing the DC name could be detected.',
    '{0} Distributionszentren importiert.': '{0} distribution centres imported.',
    'Datei konnte nicht gelesen werden: {0}': 'The file could not be read: {0}',
    'Datei konnte nicht gelesen werden': 'The file could not be read',
    'Excel-Bibliothek nicht geladen': 'Excel library not loaded',
    'CSV-Bibliothek nicht geladen': 'CSV library not loaded',
    'Import fehlgeschlagen: {0}': 'Import failed: {0}',
    'Die Datei enthält keine Datenzeilen.': 'The file contains no data rows.',
    'Pflichtfeld „{0}“ ist nicht zugeordnet.': 'Required field “{0}” is not mapped.',
    'Mindestens eine Kennzahl (Menge, Paletten, Paletten-Äquivalent, Volumen oder Umsatz) muss zugeordnet sein.':
      'At least one measure (quantity, pallets, pallet equivalent, volume or revenue) must be mapped.',
    'Für die Distanzberechnung wird eine Regions-, Länder- oder Kundenspalte benötigt.':
      'A region, country or customer column is required for the distance calculation.',
    'Hinweis: Paletten werden aus der Menge über „Stück je Palette“ ({0}) umgerechnet.':
      'Note: pallets are derived from quantity using “units per pallet” ({0}).',
    'Es konnten keine gültigen Datensätze erzeugt werden. Bitte Spaltenzuordnung prüfen.':
      'No valid records could be created. Please check the column mapping.',
    '{0} Zeilen eingelesen': '{0} rows read',
    ', auf {0} Datensätze verdichtet': ', condensed into {0} records',
    ' – {0} Zeilen ohne lesbare Periode übersprungen': ' – {0} rows skipped due to an unreadable period',
    'Datensätze {0} wirklich löschen?': 'Really delete records of {0}?',
    'der Historie': 'the history',
    'des Forecasts': 'the forecast',
    'aller Datenbestände': 'all data sets',
    'Datensätze gelöscht.': 'Records deleted.',
    '{0} Regionen automatisch ergänzt': '{0} regions filled in automatically',
    ', {0} weiterhin offen': ', {0} still open',
    'Die Zielreichweite muss größer als 0 sein.': 'Target coverage must be greater than 0.',
    'Bitte eine Zielreichweite größer 0 angeben.': 'Please enter a target coverage greater than 0.',
    'Zielreichweite von {0} Tagen auf alle Kategorien angewendet.': 'Target coverage of {0} days applied to all categories.',
    'Bitte zuerst Daten importieren und eine Kategorie wählen.': 'Please import data and select a category first.',
    'Es ist kein aktives Distributionszentrum vorhanden.': 'There is no active distribution centre.',
    'Für diese Kategorie liegen im gewählten Zeitraum keine Mengen vor.':
      'There are no quantities for this category in the selected period.',
    'Die Summe der Anteile muss größer als 0 sein.': 'The sum of the shares must be greater than 0.',
    'Simulation für „{0}“ abgeschlossen.': 'Simulation for “{0}” completed.',
    'Keine Kategorien in der gewählten Datenbasis.': 'No categories in the selected data basis.',
    'Alle Kategorien werden nacheinander simuliert und zugeordnet (volumenstärkste zuerst). Bestehende Zuordnungen werden dabei ersetzt. Fortfahren?':
      'All categories will be simulated and allocated in sequence (highest volume first). Existing allocations will be replaced. Continue?',
    '{0} Kategorien simuliert und zugeordnet.': '{0} categories simulated and allocated.',
    'Bitte mindestens einen Anteil größer 0 angeben.': 'Please enter at least one share greater than 0.',
    'Neu berechnet mit manuellen Anteilen.': 'Recalculated with manual shares.',
    'Bitte zuerst eine Simulation ausführen.': 'Please run a simulation first.',
    'Zuordnung für „{0}“ übernommen.': 'Allocation for “{0}” applied.',
    'Alle übernommenen Zuordnungen zurücksetzen?': 'Reset all applied allocations?',
    'Zuordnungen zurückgesetzt.': 'Allocations reset.',
    'Zuordnung für „{0}“ entfernt.': 'Allocation for “{0}” removed.',
    'Es sind noch keine Zuordnungen übernommen – das Szenario hätte keine Ergebnisse.':
      'No allocations have been applied yet – the scenario would contain no results.',
    'Szenario „{0}“ gespeichert.': 'Scenario “{0}” saved.',
    'Szenario „{0}“ laden? Die aktuelle DC-Konfiguration, die Einstellungen und die Zuordnungen werden dadurch ersetzt (importierte Daten bleiben erhalten).':
      'Load scenario “{0}”? The current DC configuration, settings and allocations will be replaced (imported data is kept).',
    'Szenario „{0}“ geladen.': 'Scenario “{0}” loaded.',
    'Szenario „{0}“ löschen?': 'Delete scenario “{0}”?',
    'Szenario gelöscht.': 'Scenario deleted.',
    'Neue Bezeichnung für das Szenario:': 'New name for the scenario:',
    'Szenario {0}': 'Scenario {0}',
    'CSV-Datei erzeugt.': 'CSV file created.',
    'Excel-Arbeitsmappe erzeugt.': 'Excel workbook created.',
    'Excel-Bibliothek nicht geladen.': 'Excel library not loaded.',
    'Projektdatei gespeichert.': 'Project file saved.',
    'Projekt geladen: {0} DCs, {1} Datensätze, {2} Szenarien.': 'Project loaded: {0} DCs, {1} records, {2} scenarios.',
    'Projektdatei konnte nicht gelesen werden: {0}': 'The project file could not be read: {0}',
    'Ungültiges Format': 'Invalid format',
    'Wirklich alles zurücksetzen? DCs, Daten, Zuordnungen und Szenarien werden gelöscht.':
      'Really reset everything? DCs, data, allocations and scenarios will be deleted.',
    'Arbeitsstand zurückgesetzt.': 'Working state reset.',
    'Automatische Zwischenspeicherung aktiviert.': 'Automatic caching enabled.',
    'Zwischenspeicherung deaktiviert und gelöschter Browser-Speicher.': 'Caching disabled and browser storage cleared.',
    'Ungültiger Wert – bitte eine Zahl{0} eingeben.': 'Invalid value – please enter a number{0}.',
    ' ≥ {0}': ' ≥ {0}',
    'Speicherlimit erreicht: Konfiguration gesichert, Rohdaten nicht. Bitte Projekt als JSON exportieren.':
      'Storage limit reached: configuration saved, raw data not. Please export the project as JSON.',
    'Die Demodaten ersetzen den aktuellen Arbeitsstand (DCs, Daten, Zuordnungen, Szenarien). Fortfahren?':
      'The demo data replaces the current working state (DCs, data, allocations, scenarios). Continue?',
    'Demodaten geladen: 5 DCs, {0} Datensätze über 36 Monate (24 Monate Historie, 12 Monate Forecast).':
      'Demo data loaded: 5 DCs, {0} records over 36 months (24 months of history, 12 months of forecast).',

    /* ---------- Export-Tabellen ---------- */
    'NetPlan – Auswertung Logistik-Netzwerk': 'NetPlan – logistics network analysis',
    'Erstellt am': 'Created on',
    'Wert': 'Value',
    'Einheit': 'Unit',
    'Aktive Distributionszentren': 'Active distribution centres',
    'Belegte Stellplätze': 'Occupied positions',
    'davon Grundbelegung': 'of which base occupancy',
    'davon zugeordneter Ziel-Bestand': 'of which allocated target stock',
    'Ø Distanz (mengengewichtet)': 'Avg. distance (volume-weighted)',
    'Punkte (0–100)': 'points (0–100)',
    'Zuordnungen': 'Allocations',
    'Parameter': 'Parameter',
    'Zielreichweite global': 'Global target coverage',
    'Sicherheitsaufschlag Bestand': 'Stock safety factor',
    'Faktor': 'factor',
    'Gewichtung Kapazität': 'Weighting capacity',
    'Gewichtung Transport': 'Weighting transport',
    'Gewichtung Zielreichweite': 'Weighting target coverage',
    'Transportkosten je Paletten-km': 'Transport cost per pallet-km',
    'Transport-Grundkosten je Palette': 'Transport base cost per pallet',
    'Lagerkosten je Stellplatz/Monat': 'Storage cost per position/month',
    'Handlingkosten je Palette': 'Handling cost per pallet',
    'Volumen je Palette': 'Volume per pallet',
    'Name': 'Name',
    'Code': 'Code',
    'Belegt gesamt': 'Total occupied',
    'Auslastung %': 'Utilisation %',
    'Volumen Paletten': 'Volume pallets',
    'Transportkosten EUR': 'Transport cost EUR',
    'Lagerkosten EUR': 'Storage cost EUR',
    'Handlingkosten EUR': 'Handling cost EUR',
    'Fixkosten EUR': 'Fixed cost EUR',
    'Gesamtkosten EUR': 'Total cost EUR',
    'Ø Distanz km': 'Avg. distance km',
    'Zielreichweite Tage': 'Target coverage days',
    'Ziel-Bestand Stellplätze': 'Target stock positions',
    'Ø Transitzeit Tage': 'Avg. transit time days',
    'Score Kapazität': 'Score capacity',
    'Score Reichweite': 'Score coverage',
    'Kapazität ausreichend': 'Capacity sufficient',
    'ja': 'yes',
    'nein': 'no',
    'Beliefert aus DC': 'Served from DC',
    'Distanz km': 'Distance km',
    'Menge Stück': 'Quantity units',
    'Umsatz EUR': 'Revenue EUR',
    'Datensatztyp': 'Record type',
    'Paletten (berechnet)': 'Pallets (calculated)',
    'Reichweite (Tage)': 'Coverage (days)',
    'Anteil %': 'Share %',
    'Zeitraum Tage': 'Period days',
    'Rohdaten': 'Raw data',
    'Detailergebnisse': 'Detailed results',
    'Regionszuordnung': 'Regional allocation',
    'Zielreichweiten': 'Target coverage',
    'z.B. DC Duisburg': 'e.g. DC Duisburg',
    'z.B. DUI': 'e.g. DUI',
    'z.B. Nordrhein-Westfalen': 'e.g. North Rhine-Westphalia',
    'z.B. Deutschland': 'e.g. Germany',
    '– keine Kategorien vorhanden –': '– no categories available –',
    'T': 'd',
    'Palette': 'pallet',
    'Blatt': 'Sheet',

    /* ---------- Demodaten (nur für den Beispieldatensatz) ---------- */
    'Kühlgeräte': 'Refrigeration', 'Kleingeräte': 'Small appliances',
    'Gartenmöbel': 'Garden furniture', 'Werkzeuge': 'Tools', 'Sanitärartikel': 'Sanitary ware',
    'Deutschland Nord': 'Germany North', 'Deutschland West': 'Germany West',
    'Deutschland Süd': 'Germany South', 'Deutschland Ost': 'Germany East',
    'Niederlande': 'Netherlands', 'Belgien': 'Belgium', 'Frankreich': 'France',
    'Italien': 'Italy', 'Spanien': 'Spain', 'Österreich': 'Austria', 'Polen': 'Poland',
    'Tschechien': 'Czechia', 'Dänemark': 'Denmark', 'Schweden': 'Sweden',
    'Deutschland': 'Germany',
    'Handelshaus Nord': 'Northern Trading', 'BauMarkt Gruppe': 'BuildMart Group',
    'Elektro Partner': 'Electro Partner', 'Fachhandel Süd': 'Southern Specialists',
    'Online Retail EU': 'Online Retail EU', 'Möbelkette West': 'Furniture Chain West',
    'Discount Kette': 'Discount Chain', 'Regionalhändler': 'Regional Dealer',
    'KPI': 'KPI'
  };

  var DICT = { en: EN };

  /* ==================================================================== *
   *  Übersetzen
   * ==================================================================== */
  function t(text) {
    if (lang === 'de' || text === null || text === undefined) return text;
    var d = DICT[lang];
    var hit = d && Object.prototype.hasOwnProperty.call(d, text) ? d[text] : undefined;
    return hit === undefined ? text : hit;
  }

  /** Wie t(), zusätzlich mit Platzhaltern {0}, {1}, … */
  function tf(text) {
    var args = Array.prototype.slice.call(arguments, 1);
    return String(t(text)).replace(/\{(\d+)\}/g, function (m, i) {
      return args[i] === undefined ? m : args[i];
    });
  }

  function locale() { return lang === 'en' ? 'en-GB' : 'de-DE'; }
  function get() { return lang; }

  /* ==================================================================== *
   *  Statische Texte aus dem Dokument
   * ==================================================================== */
  var records = [];   // { node, attr, de }
  var captured = false;

  /** Erfasst den Auslieferungszustand des Dokuments (einmalig beim Start). */
  function capture(root) {
    if (captured) return;
    captured = true;
    var scope = root || document.body;

    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentNode;
        if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      // Umbrüche und Einrückung aus dem Quelltext vereinheitlichen, damit der
      // Schlüssel dem einzeiligen Wörterbucheintrag entspricht
      records.push({
        node: node, attr: null,
        de: node.nodeValue.replace(/\s+/g, ' ').trim(),
        raw: node.nodeValue
      });
    }

    ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
      Array.prototype.forEach.call(scope.querySelectorAll('[' + attr + ']'), function (elem) {
        records.push({ node: elem, attr: attr, de: elem.getAttribute(attr) });
      });
    });
  }

  /** Setzt alle erfassten Texte in der aktuellen Sprache. */
  function applyStatic() {
    records.forEach(function (r) {
      var translated = t(r.de);
      if (r.attr) {
        r.node.setAttribute(r.attr, translated);
      } else if (translated !== r.de) {
        r.node.nodeValue = translated;
      } else {
        // Keine Übersetzung: den Auslieferungszustand wiederherstellen
        r.node.nodeValue = r.raw;
      }
    });
  }

  function setLang(next) {
    if (next !== 'de' && next !== 'en') return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignorieren */ }
    document.documentElement.setAttribute('lang', next);
    applyStatic();
  }

  function init() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignorieren */ }
    lang = stored === 'en' ? 'en' : 'de';
    capture();
    document.documentElement.setAttribute('lang', lang);
    applyStatic();
  }

  NS.i18n = {
    t: t, tf: tf, get: get, setLang: setLang, init: init, locale: locale,
    capture: capture, applyStatic: applyStatic,
    /** Für Tests: meldet Schlüssel ohne Übersetzung. */
    missing: function () {
      return records.map(function (r) { return r.de; })
        .filter(function (s) { return !Object.prototype.hasOwnProperty.call(EN, s); });
    }
  };
})(window.LNP);
