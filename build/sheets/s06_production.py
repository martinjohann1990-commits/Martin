"""Production sheet: net requirement, start week, cumulative capacity
check, and the contribution-per-minute priority list (spec 4.6).
Milestone 1 lays out the four blocks; formulas follow in Milestone 4."""

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_section_header, write_table_headers


def build(ws, ctx):
    s = ctx["strings"]["production"]
    h = s["headers"]

    init_sheet(ws)
    styles.set_column_widths(ws, {"A": 3, "B": 12, "C": 12, "D": 14, "E": 16, "F": 18, "G": 14, "H": 14, "I": 14})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=8, height=28)
    row += 1

    row = write_section_header(ws, s["section_net_need"], row, span=8)
    row = write_table_headers(ws, row, 2, [
        h["sku"], h["week"], h["forecast"], h["safety_stock"], h["stock_end_prior"],
        h["in_progress"], h["net_need"], h["batch_qty"],
    ])
    row += 2

    row = write_section_header(ws, s["section_start_week"], row, span=8)
    row = write_table_headers(ws, row, 2, [h["sku"], h["batch_qty"], h["start_week"], h["status"]])
    row += 2

    row = write_section_header(ws, s["section_capacity"], row, span=8)
    row = write_table_headers(ws, row, 2, [
        h["week"], h["cum_demand_hours"], h["cum_capacity_hours"], h["gap_hours"],
    ])
    row += 2

    row = write_section_header(ws, s["section_priority"], row, span=8)
    write_table_headers(ws, row, 2, [h["sku"], h["margin_per_minute"]])
