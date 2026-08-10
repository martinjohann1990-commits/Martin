"""Erzeugt reproduzierbare Beispiel-/Dummy-Daten fuer die Arbeitsmappe.

Die Daten sind frei erfunden und dienen ausschliesslich dazu, das Werkzeug
sofort testbar zu machen. Der Zufallsgenerator ist mit einem festen Startwert
initialisiert, damit jeder Build identische Zahlen liefert.
"""

from __future__ import annotations

import datetime as dt
import random

SEED = 20240817

# --- Distributionszentren ---------------------------------------------------
# Name, Region, Lat, Lon, Kapazitaet (Paletten), Lagerkosten (EUR/Pal/Periode),
# Transport-Basiskosten (EUR/Palette), Transportkosten (EUR/km/Palette),
# Vorbelegung (Paletten), aktiv
DCS = [
    ("DC Hamburg", "DE-Nord", 53.55, 9.99, 12000, 8.50, 12.00, 0.045, 5200, "Ja"),
    ("DC Duisburg", "DE-West", 51.43, 6.76, 18000, 7.80, 10.50, 0.040, 9800, "Ja"),
    # Frankfurt ist bewusst fast voll: So zeigt das Beispiel, dass ein
    # verkehrsguenstiger Standort am Platzmangel scheitern kann - der
    # Reichweiten-Score unterscheidet nur dann, wenn die freie Kapazitaet
    # kleiner als der Ziel-Bestand ist.
    ("DC Frankfurt", "DE-Mitte", 50.11, 8.68, 9000, 9.60, 13.00, 0.048, 8600, "Ja"),
    ("DC Muenchen", "DE-Sued", 48.14, 11.58, 11000, 9.20, 12.50, 0.046, 6400, "Ja"),
    ("DC Leipzig", "DE-Ost", 51.34, 12.37, 7500, 7.10, 11.00, 0.042, 2600, "Ja"),
    ("DC Poznan", "PL", 52.41, 16.93, 14000, 5.40, 9.50, 0.038, 3300, "Ja"),
]

# --- Absatzregionen (Kunden-Schwerpunkte) -----------------------------------
REGIONEN = [
    ("DE-Nord", "Deutschland", 53.50, 10.00),
    ("DE-West", "Deutschland", 51.20, 7.00),
    ("DE-Mitte", "Deutschland", 50.30, 8.80),
    ("DE-Sued", "Deutschland", 48.50, 11.50),
    ("DE-Ost", "Deutschland", 51.30, 12.40),
    ("NL", "Niederlande", 52.20, 5.50),
    ("AT", "Oesterreich", 47.60, 14.10),
    ("PL", "Polen", 52.20, 20.90),
]

# --- Produktkategorien ------------------------------------------------------
# Name, Ziel-Reichweite (Tage), Stueck pro Palette, Preis EUR/Stueck,
# m3 pro Palette, Basis-Bedarf (Paletten/Monat), Saisonamplitude
KATEGORIEN = [
    ("Trockensortiment", 21, 720, 1.85, 1.45, 900, 0.10),
    ("Kuehlware", 7, 480, 3.40, 1.30, 520, 0.18),
    ("Getraenke", 14, 960, 0.95, 1.55, 1150, 0.25),
    ("Non-Food", 35, 240, 12.50, 1.60, 310, 0.12),
    ("Aktionsware", 10, 360, 6.20, 1.50, 240, 0.45),
]

# Regionsanteile am Gesamtbedarf je Kategorie (Summe je Kategorie = 1,0)
_REGIONSANTEILE = {
    "Trockensortiment": [0.18, 0.24, 0.13, 0.19, 0.10, 0.07, 0.05, 0.04],
    "Kuehlware": [0.22, 0.21, 0.12, 0.17, 0.11, 0.09, 0.05, 0.03],
    "Getraenke": [0.16, 0.22, 0.14, 0.21, 0.12, 0.05, 0.06, 0.04],
    "Non-Food": [0.14, 0.20, 0.12, 0.16, 0.09, 0.08, 0.06, 0.15],
    "Aktionsware": [0.12, 0.18, 0.11, 0.15, 0.10, 0.06, 0.05, 0.23],
}

KUNDEN = {
    "DE-Nord": ["Nordmarkt AG", "Elbe Handel GmbH", "Kuestenlager KG"],
    "DE-West": ["Rheinland Retail SE", "Ruhr Frische GmbH", "Westfilial AG"],
    "DE-Mitte": ["Hessen Vertrieb GmbH", "Mainpunkt Handel"],
    "DE-Sued": ["Alpenmarkt GmbH", "Donau Handel AG", "Sued Filialen KG"],
    "DE-Ost": ["Sachsen Handel GmbH", "Spree Markt AG"],
    "NL": ["Randstad Retail BV", "Delta Foods BV"],
    "AT": ["Austria Markt GmbH", "Tirol Handel AG"],
    "PL": ["Wisla Retail Sp.", "Odra Handel Sp."],
}


def _monatsanfaenge(start: dt.date, monate: int) -> list[dt.date]:
    tage = []
    jahr, monat = start.year, start.month
    for _ in range(monate):
        tage.append(dt.date(jahr, monat, 1))
        monat += 1
        if monat > 12:
            monat, jahr = 1, jahr + 1
    return tage


def _zeilen(start: dt.date, monate: int, rng: random.Random, trend: float) -> list[list]:
    """Erzeugt Bewegungszeilen je Monat, Region und Kategorie."""
    zeilen: list[list] = []
    for m_index, monat in enumerate(_monatsanfaenge(start, monate)):
        # Saison: Peak im Sommer (Getraenke) bzw. Jahresende (Aktionsware)
        saison_basis = 1.0 + trend * m_index / max(1, monate)
        for kat, _rw, stk_pal, preis, m3_pal, basis, amplitude in KATEGORIEN:
            phase = 6 if kat == "Getraenke" else (11 if kat == "Aktionsware" else 3)
            saison = 1.0 + amplitude * _cos_naeherung(monat.month, phase)
            for r_index, (region, _land, _lat, _lon) in enumerate(REGIONEN):
                anteil = _REGIONSANTEILE[kat][r_index]
                paletten = basis * anteil * saison * saison_basis * rng.uniform(0.88, 1.12)
                paletten = round(paletten, 1)
                if paletten <= 0:
                    continue
                kunde = rng.choice(KUNDEN[region])
                tag = monat + dt.timedelta(days=rng.randint(0, 24))
                menge = int(round(paletten * stk_pal))
                umsatz = round(menge * preis, 2)
                volumen = round(paletten * m3_pal, 2)
                zeilen.append(
                    [tag, kunde, region, kat, menge, umsatz, volumen, paletten]
                )
    zeilen.sort(key=lambda z: (z[0], z[2], z[3]))
    return zeilen


def _cos_naeherung(monat: int, phase: int) -> float:
    """Einfache Saisonkurve ohne math-Import: Dreieckswelle um ``phase``."""
    abstand = min(abs(monat - phase), 12 - abs(monat - phase))
    return 1.0 - abstand / 3.0


def historie(monate: int = 12) -> list[list]:
    """Historische Bewegungsdaten (abgeschlossene Perioden)."""
    rng = random.Random(SEED)
    return _zeilen(dt.date(2025, 1, 1), monate, rng, trend=0.06)


def forecast(monate: int = 6) -> list[list]:
    """Extern erstellte Forecast-Daten (zukuenftige Perioden)."""
    rng = random.Random(SEED + 1)
    return _zeilen(dt.date(2026, 1, 1), monate, rng, trend=0.12)


# Spaltennamen der Rohdaten auf dem Blatt "Beispieldaten". Sie weichen
# absichtlich von den Zielspalten der Import-Blaetter ab, damit die
# Mapping-Tabelle einen echten Zweck erfuellt.
ROH_SPALTEN_HISTORIE = [
    "Buchungsdatum",
    "Kunde_Name",
    "Land_Region",
    "Warengruppe",
    "Menge_Stk",
    "Umsatz_EUR",
    "Volumen_m3",
    "Paletten_Anzahl",
]

ROH_SPALTEN_FORECAST = [
    "Planperiode",
    "Kunde",
    "Vertriebsregion",
    "Produktgruppe",
    "Planmenge_Stk",
    "Planumsatz_EUR",
    "Planvolumen_m3",
    "Planpaletten",
]

# Zielspalten der Import-Blaetter (Reihenfolge = Spaltenreihenfolge im Blatt)
ZIEL_SPALTEN = [
    "Datum",
    "Kunde",
    "Land/Region",
    "Produktkategorie",
    "Menge (Stück)",
    "EUR-Umsatz",
    "Transportvolumen",
    "Paletten",
    "Paletten-Äquivalent",
]
