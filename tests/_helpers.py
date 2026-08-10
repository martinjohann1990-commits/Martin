"""Shared test helpers: build every vertical/language combination once so
individual test modules can iterate over them without regenerating."""

import itertools

from build.workbook import LANGUAGES, VERTICALS, build_workbook

ERROR_VALUES = {"#DIV/0!", "#N/A", "#REF!", "#VALUE!", "#NAME?", "#NULL!", "#NUM!", "#SPILL!", "#CALC!"}


def all_combos():
    return list(itertools.product(VERTICALS, LANGUAGES))


def all_workbooks():
    """Returns [(vertical, lang, workbook), ...] for every supported combination."""
    return [(vertical, lang, build_workbook(vertical, lang)) for vertical, lang in all_combos()]


def iter_formula_cells(wb):
    """Yields (sheet_name, cell) for every cell whose value is a formula string."""
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and cell.value.startswith("="):
                    yield ws.title, cell


def iter_all_cells(wb):
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                if cell.value is not None:
                    yield ws.title, cell
