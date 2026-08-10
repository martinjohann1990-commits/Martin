"""Rule 1 (spec section 2): the workbook must stay compatible with
Google Sheets, LibreOffice and Numbers, so a fixed list of Excel-only or
dynamic-array functions may never appear in a formula. This scans every
formula in every generated workbook (all vertical x language
combinations), not just the default one, since the banned list applies
regardless of vertical or language."""

import re

import pytest

from tests._helpers import all_workbooks, iter_formula_cells

# TEXTJOIN is only banned "with arrays" per spec, but since nothing in
# this project needs TEXTJOIN at all, it is banned outright here - the
# simpler, safer rule wins per spec section 7 (compatibility beats
# cleverness when the two are in tension).
BANNED_FUNCTIONS = [
    "LET", "LAMBDA", "XLOOKUP", "TEXTJOIN", "FILTER", "SORT", "UNIQUE", "SEQUENCE",
]

BANNED_PATTERNS = {name: re.compile(rf"\b{name}\s*\(", re.IGNORECASE) for name in BANNED_FUNCTIONS}


@pytest.mark.parametrize("vertical,lang,wb", all_workbooks())
def test_no_banned_functions_in_formulas(vertical, lang, wb):
    violations = []
    for sheet_name, cell in iter_formula_cells(wb):
        for name, pattern in BANNED_PATTERNS.items():
            if pattern.search(cell.value):
                violations.append(f"{sheet_name}!{cell.coordinate} uses banned function {name}: {cell.value}")
    assert not violations, "\n".join(violations)


@pytest.mark.parametrize("vertical,lang,wb", all_workbooks())
def test_no_table_objects(vertical, lang, wb):
    """Excel ListObjects (structured Table references) aren't Sheets/LibreOffice/Numbers safe."""
    for ws in wb.worksheets:
        assert len(ws.tables) == 0, f"{ws.title} has an Excel Table object, which is not allowed"
