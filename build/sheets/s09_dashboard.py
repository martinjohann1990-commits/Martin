"""Dashboard sheet: one screen, no scrolling. Four KPI tiles, a
cumulative demand-vs-capacity chart, top-10 products, and a bottleneck
indicator (spec 4.9). This is the first listing image, so layout and
color get extra care once the data is real. Milestone 1 lays out the
tile grid and section headings; charts are added in Milestone 5."""

from build import styles
from build.sheets._common import init_sheet, write_heading, write_section_header


def build(ws, ctx):
    s = ctx["strings"]["dashboard"]
    tiles = s["tiles"]

    init_sheet(ws, freeze=None)
    styles.set_column_widths(ws, {
        "A": 3, "B": 24, "C": 20, "D": 4, "E": 24, "F": 20,
        "G": 4, "H": 24, "I": 20,
    })

    row = write_heading(ws, s["heading"], row=2)
    row += 2

    tile_row = row
    tile_specs = [
        (2, tiles["forecast_revenue"]),
        (5, tiles["hours_needed_vs_available"]),
        (8, tiles["material_budget"]),
    ]
    for col, label in tile_specs:
        lc = ws.cell(row=tile_row, column=col, value=label)
        styles.style_label(lc, bold=True)
        vc = ws.cell(row=tile_row + 1, column=col)
        styles.style_formula(vc)
        ws.row_dimensions[tile_row + 1].height = 24

    tile_row += 3
    lc = ws.cell(row=tile_row, column=2, value=tiles["lowest_cash_point"])
    styles.style_label(lc, bold=True)
    vc = ws.cell(row=tile_row + 1, column=2)
    styles.style_formula(vc)

    row = tile_row + 4
    row = write_section_header(ws, s["chart_capacity_title"], row, span=8)
    row += 10  # room reserved for the capacity chart (Milestone 5)

    row = write_section_header(ws, s["top_products_heading"], row, span=8)
    row += 11  # room reserved for the top-10 table (Milestone 5)

    row = write_section_header(ws, s["bottleneck_heading"], row, span=8)
    cell = ws.cell(row=row, column=2, value=s["bottleneck_ok"])
    styles.style_formula(cell)
