"""Materials sheet: flat bill of materials, material master data, and the
order list sorted by order-by date (spec 4.7). Milestone 1 lays out the
three blocks; formulas follow together with Production in Milestone 4."""

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_section_header, write_table_headers


def build(ws, ctx):
    s = ctx["strings"]["materials"]
    bom = s["bom_headers"]
    master = s["master_headers"]
    order = s["order_headers"]

    init_sheet(ws)
    styles.set_column_widths(ws, {"A": 3, "B": 14, "C": 22, "D": 14, "E": 14, "F": 14, "G": 14, "H": 16})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=7, height=28)
    row += 1

    row = write_section_header(ws, s["section_bom"], row, span=7)
    row = write_table_headers(ws, row, 2, [bom["sku"], bom["material"], bom["qty_per_unit"], bom["unit"]])
    row += 2

    row = write_section_header(ws, s["section_master"], row, span=7)
    row = write_table_headers(ws, row, 2, [
        master["material"], master["unit"], master["price_per_unit"], master["lead_time_days"],
        master["moq"], master["pack_size"], master["stock_on_hand"], master["supplier"],
    ])
    row += 2

    row = write_section_header(ws, s["section_orders"], row, span=7)
    write_table_headers(ws, row, 2, [
        order["material"], order["week"], order["order_by"], order["quantity"],
        order["est_cost"], order["supplier"],
    ])
