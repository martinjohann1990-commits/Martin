"""Rule 5 (spec section 2): no formula may hard-code a parameter - every
one lives in a named cell on Settings. This test checks two things for
every formula in every generated workbook:

1. no formula text contains a literal #REF! (a broken reference baked
   into the generator would show up this way immediately);
2. any token that matches one of the registered parameter names
   (build.names.NAMES) is backed by an actual defined name in the
   workbook, and any explicit 'Sheet'! reference points at a sheet that
   actually exists.

There are no formulas yet in Milestone 1 - this test starts meaningful
once Settings gets named ranges and Forecast gets formulas (Milestone 2/3)
and is kept here now so later milestones can't skip wiring names up.
"""

import re

import pytest

from build.names import NAMES
from tests._helpers import all_workbooks, iter_formula_cells

STRING_LITERAL = re.compile(r'"[^"]*"')
SHEET_REF = re.compile(r"(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))!")
CELL_REF = re.compile(r"^\$?[A-Za-z]{1,3}\$?[0-9]+$")
TOKEN = re.compile(r"\b([A-Za-z_][A-Za-z0-9_.]*)\b(?!\s*\()")

KNOWN_NAMES = set(NAMES.all())


@pytest.mark.parametrize("vertical,lang,wb", all_workbooks())
def test_no_broken_references(vertical, lang, wb):
    broken = []
    for sheet_name, cell in iter_formula_cells(wb):
        if "#REF!" in cell.value:
            broken.append(f"{sheet_name}!{cell.coordinate}: {cell.value}")
    assert not broken, "\n".join(broken)


@pytest.mark.parametrize("vertical,lang,wb", all_workbooks())
def test_sheet_references_point_at_real_sheets(vertical, lang, wb):
    sheet_titles = set(wb.sheetnames)
    missing = []
    for sheet_name, cell in iter_formula_cells(wb):
        for quoted, bare in SHEET_REF.findall(cell.value):
            referenced = quoted or bare
            if referenced not in sheet_titles:
                missing.append(f"{sheet_name}!{cell.coordinate} references unknown sheet '{referenced}'")
    assert not missing, "\n".join(missing)


@pytest.mark.parametrize("vertical,lang,wb", all_workbooks())
def test_named_parameters_are_defined(vertical, lang, wb):
    defined = set(wb.defined_names.keys())
    missing = []
    for sheet_name, cell in iter_formula_cells(wb):
        text_without_strings = STRING_LITERAL.sub("", cell.value)
        for token in TOKEN.findall(text_without_strings):
            if token in KNOWN_NAMES and token not in defined:
                missing.append(f"{sheet_name}!{cell.coordinate} references undefined name '{token}'")
    assert not missing, "\n".join(missing)
