"""Settings sheet: every parameter the calculations depend on lives here
as a named, input-styled cell (spec rule 5). Milestone 1 only lays out
the labelled rows; seeding default values, data validation dropdowns and
the named ranges themselves is Milestone 2 (the layout must exist first
so the named cells have somewhere to point)."""

from build import styles
from build.sheets._common import (
    init_sheet, write_heading, write_intro, write_section_header,
    write_label_value_row,
)


def build(ws, ctx):
    s = ctx["strings"]["settings"]
    labels = s["labels"]
    units = s["units"]

    init_sheet(ws)
    styles.set_column_widths(ws, {"A": 3, "B": 42, "C": 18, "D": 14, "E": 40})

    row = write_heading(ws, s["heading"], row=2)
    row += 1
    row = write_intro(ws, s["intro"], row, span=4, height=30)
    row += 1

    row = write_section_header(ws, s["section_general"], row, span=4)
    row = write_label_value_row(ws, row, 2, 3, labels["currency"])
    row += 1

    row = write_section_header(ws, s["section_planning"], row, span=4)
    row = write_label_value_row(ws, row, 2, 3, labels["start_date"], number_format=styles.NUMBER_FORMATS["date"])
    row = write_label_value_row(ws, row, 2, 3, labels["horizon_weeks"], units["weeks"], unit_col=4)
    row = write_label_value_row(ws, row, 2, 3, labels["work_hours_week"], units["hours_per_week"], unit_col=4)
    row = write_label_value_row(ws, row, 2, 3, labels["work_hours_overrides"])
    row += 1

    row = write_section_header(ws, s["section_service"], row, span=4)
    row = write_label_value_row(ws, row, 2, 3, labels["service_level"])
    row = write_label_value_row(ws, row, 2, 3, labels["service_z"])
    row = write_label_value_row(ws, row, 2, 3, labels["growth_pct"], units["percent"], unit_col=4)
    row = write_label_value_row(ws, row, 2, 3, labels["scenario"])
    row = write_label_value_row(ws, row, 2, 3, labels["scenario_z"])
    row += 1

    row = write_section_header(ws, s["section_production"], row, span=4)
    row = write_label_value_row(ws, row, 2, 3, labels["cure_days"], units["days"], unit_col=4)
    row = write_label_value_row(ws, row, 2, 3, labels["lead_time_buffer_days"], units["days"], unit_col=4)
    row = write_label_value_row(ws, row, 2, 3, labels["fee_rate"], units["percent"], unit_col=4)
