"""Cash sheet: material spend in the order week, revenue net of fees in
the sales week, cumulative cash line, and the lowest point (spec 4.8).
Milestone 1 lays out the table and summary blocks; formulas follow in
Milestone 5."""

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_table_headers, write_label_value_row


def build(ws, ctx):
    s = ctx["strings"]["cash"]
    h = s["headers"]
    summary = s["summary"]

    init_sheet(ws)
    styles.set_column_widths(ws, {"A": 3, "B": 12, "C": 16, "D": 16, "E": 14, "F": 16, "G": 16, "H": 18})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=7, height=28)
    row += 1

    row = write_table_headers(ws, row, 2, [
        h["week"], h["material_spend"], h["revenue_gross"], h["fees"],
        h["revenue_net"], h["net_cash_flow"], h["cumulative_cash"],
    ])
    row += 2

    row = write_label_value_row(ws, row, 2, 3, summary["lowest_point"])
    write_label_value_row(ws, row, 2, 3, summary["lowest_point_week"])
