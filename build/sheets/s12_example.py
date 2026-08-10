"""Example sheet: a fully filled-in walkthrough with the demo data set,
read-only (spec 4.12). Populated once the demo CSV and the full
calculation chain exist (Milestone 6); Milestone 1 only lays out the
placeholder so the sheet exists in the right position and is protected
like every other sheet."""

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_note


def build(ws, ctx):
    s = ctx["strings"]["example"]

    init_sheet(ws, freeze=None)
    styles.set_column_widths(ws, {"A": 3, "B": 90})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=1, height=28)
    row += 1
    write_note(ws, s["placeholder_note"], row, span=1)
