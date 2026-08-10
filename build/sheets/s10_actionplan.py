"""Action Plan sheet: every dated action from Production and Materials,
sorted by date via a rank column + INDEX/MATCH (no SORT(), spec 4.10 and
section 2). Milestone 1 lays out the header row and the print area;
the ranking/lookup formulas are built in Milestone 5."""

from openpyxl.worksheet.page import PageMargins

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_table_headers

MAX_ROWS = 120


def build(ws, ctx):
    s = ctx["strings"]["actionplan"]
    h = s["headers"]

    init_sheet(ws)
    styles.set_column_widths(ws, {"A": 3, "B": 12, "C": 26, "D": 20, "E": 12, "F": 12, "G": 16})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=6, height=24)
    row += 1

    header_row = row
    write_table_headers(ws, header_row, 2, [
        h["date"], h["action"], h["sku_or_material"], h["quantity"], h["due_by"], h["status"],
    ])
    last_row = header_row + MAX_ROWS
    for r in range(header_row + 1, last_row + 1):
        for col in range(2, 8):
            styles.style_formula(ws.cell(row=r, column=col))

    ws.print_area = f"A1:G{last_row}"
    ws.page_setup.orientation = "portrait"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_margins = PageMargins(left=0.4, right=0.4, top=0.5, bottom=0.5)
