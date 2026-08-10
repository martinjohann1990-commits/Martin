"""Method sheet: hidden documentation, one row per calculation (spec
4.11). Milestone 1 only lays out the header row; rows are appended by
each sheet module as its formulas are built (Milestone 3 onward). Hiding
the sheet itself happens once in workbook.py after every sheet exists."""

from openpyxl.styles import Alignment

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_table_headers

HEADER_ROW = 5


def build(ws, ctx):
    s = ctx["strings"]["method"]
    h = s["headers"]

    init_sheet(ws, freeze=None)
    styles.set_column_widths(ws, {"A": 3, "B": 16, "C": 22, "D": 55, "E": 55})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    write_intro(ws, s["intro"], row, span=4, height=24)

    write_table_headers(ws, HEADER_ROW, 2, [h["sheet"], h["field"], h["explanation"], h["formula"]])


def append_row(ws, sheet_name, field, explanation, formula_text):
    """Used by other sheet modules once they add real formulas, to keep
    the human-readable documentation in lockstep with the calculations."""
    next_row = ws.max_row + 1
    values = [sheet_name, field, explanation, formula_text]
    for i, value in enumerate(values):
        cell = ws.cell(row=next_row, column=2 + i, value=value)
        styles.style_formula(cell)
        cell.alignment = Alignment(wrap_text=True)
