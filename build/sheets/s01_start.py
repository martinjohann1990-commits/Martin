"""Start sheet: what the tool does, three steps, pointers to Example and
Method. No inputs, so unlike every other sheet this one is fully content-
complete already in Milestone 1."""

from build import styles
from build.sheets._common import init_sheet, write_heading, write_intro, write_note


def build(ws, ctx):
    s = ctx["strings"]["start"]

    init_sheet(ws, freeze=None)
    styles.set_column_widths(ws, {"A": 3, "B": 95})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=1, height=60)
    row += 1

    c = ws.cell(row=row, column=2, value=s["steps_heading"])
    styles.style_label(c, bold=True)
    row += 1

    for i, step in enumerate(s["steps"], start=1):
        c = ws.cell(row=row, column=2, value=f"{i}.  {step}")
        styles.style_label(c)
        ws.row_dimensions[row].height = 28
        row += 1

    row += 1
    row = write_note(ws, s["example_note"], row, span=1)
    row = write_note(ws, s["method_note"], row, span=1)

    ws.sheet_view.zoomScale = 100
