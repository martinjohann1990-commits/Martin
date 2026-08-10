"""Products sheet: one row per product, up to 60 (spec 4.4). Milestone 1
lays out the header row and pre-formats the row range; pre-filling rows
from Import and seeding sample data happens in Milestone 2."""

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_table_headers

MAX_ROWS = 60
FIRST_DATA_ROW = 6


def build(ws, ctx):
    s = ctx["strings"]["products"]
    h = s["headers"]

    init_sheet(ws)
    styles.set_column_widths(ws, {
        "A": 3, "B": 12, "C": 28, "D": 12, "E": 16, "F": 16,
        "G": 12, "H": 12, "I": 16, "J": 10,
    })

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=9, height=28)
    row += 1

    headers = [
        h["sku"], h["name"], h["price"], h["material_cost"], h["minutes_per_unit"],
        h["stock_on_hand"], h["batch_size"], h["cure_days_override"], h["active"],
    ]
    header_row = row
    write_table_headers(ws, header_row, 2, headers)

    number_formats = [
        None, None, styles.NUMBER_FORMATS["currency"], styles.NUMBER_FORMATS["currency"],
        styles.NUMBER_FORMATS["integer"], styles.NUMBER_FORMATS["integer"],
        styles.NUMBER_FORMATS["integer"], styles.NUMBER_FORMATS["integer"], None,
    ]

    last_row = header_row + MAX_ROWS
    for r in range(header_row + 1, last_row + 1):
        for i, number_format in enumerate(number_formats):
            cell = ws.cell(row=r, column=2 + i)
            styles.style_input(cell, number_format=number_format)
        if r - header_row > 20:
            ws.row_dimensions[r].hidden = True
