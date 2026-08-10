"""Import sheet: paste-in Etsy export with name-pattern column detection,
plus a manual fallback path. Milestone 1 lays out the sections; the
detection formulas (MATCH against per-language search-term lists) and the
manual fallback table are built in Milestone 2."""

from build import styles
from build.sheets._common import (
    init_sheet, write_heading, write_intro, write_section_header,
    write_label_value_row, write_note,
)


def build(ws, ctx):
    s = ctx["strings"]["import"]
    labels = s["detection_labels"]

    init_sheet(ws)
    styles.set_column_widths(ws, {"A": 3, "B": 26, "C": 20, "D": 18, "E": 18, "F": 18, "G": 18})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=6, height=30)
    row += 1

    row = write_section_header(ws, s["detection_heading"], row, span=6)
    row = write_label_value_row(ws, row, 2, 3, labels["date_column"])
    row = write_label_value_row(ws, row, 2, 3, labels["item_column"])
    row = write_label_value_row(ws, row, 2, 3, labels["quantity_column"])
    row = write_label_value_row(ws, row, 2, 3, labels["amount_column"])
    row = write_label_value_row(ws, row, 2, 3, labels["rows_found"])
    row = write_label_value_row(ws, row, 2, 3, labels["date_range"])
    row = write_label_value_row(ws, row, 2, 3, labels["unreadable_rows"])
    row = write_label_value_row(ws, row, 2, 3, labels["status"])
    row += 1

    row = write_section_header(ws, s["paste_area_heading"], row, span=6)
    row += 1

    row = write_section_header(ws, s["fallback_heading"], row, span=6)
    row = write_note(ws, s["fallback_intro"], row, span=6)
    row += 1

    write_section_header(ws, s["derived_heading"], row, span=6)
