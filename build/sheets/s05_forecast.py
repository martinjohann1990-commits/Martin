"""Forecast sheet: the core of the product (spec 4.5). Milestone 1 only
lays out the five calculation stages as clearly separated, labelled
blocks. The seasonality fallback cascade, week-weight distribution,
scenario bands and safety-stock formulas are built in Milestone 3, which
is where the spec asks for the most care."""

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_section_header, write_table_headers


def build(ws, ctx):
    s = ctx["strings"]["forecast"]
    h = s["headers"]

    init_sheet(ws)
    styles.set_column_widths(ws, {"A": 3, "B": 12, "C": 26, "D": 16, "E": 16, "F": 16, "G": 16, "H": 16})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=7, height=28)
    row += 1

    row = write_section_header(ws, s["section_seasonality"], row, span=7)
    row = write_table_headers(ws, row, 2, [h["sku"], h["month"], h["seasonality_index"], h["index_source"]])
    row += 2

    row = write_section_header(ws, s["section_base_level"], row, span=7)
    row = write_table_headers(ws, row, 2, [h["sku"], h["base_level"]])
    row += 2

    row = write_section_header(ws, s["section_weekly"], row, span=7)
    row = write_table_headers(ws, row, 2, [h["sku"], h["week"], h["forecast_units"], h["forecast_revenue"]])
    row += 2

    row = write_section_header(ws, s["section_scenarios"], row, span=7)
    row = write_table_headers(ws, row, 2, [h["sku"], h["cv"], h["low"], h["expected"], h["high"]])
    row += 2

    row = write_section_header(ws, s["section_safety_stock"], row, span=7)
    write_table_headers(ws, row, 2, [
        h["sku"], h["sigma_week"], h["lead_time_weeks"], h["safety_stock"], h["reorder_point"],
    ])
