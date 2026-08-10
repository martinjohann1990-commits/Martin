"""Rule 4 (spec section 2): the freshly generated, unfilled workbook must
never show an error value or a stray '#' to a buyer who just opened it.
Checked across every vertical x language combination, on every sheet
including hidden ones (a buyer who unhides Method shouldn't see one
either)."""

import pytest

from tests._helpers import ERROR_VALUES, all_workbooks, iter_all_cells


@pytest.mark.parametrize("vertical,lang,wb", all_workbooks())
def test_empty_workbook_has_no_error_values(vertical, lang, wb):
    offenders = []
    for sheet_name, cell in iter_all_cells(wb):
        value = cell.value
        if not isinstance(value, str) or value.startswith("="):
            continue
        if value in ERROR_VALUES or value.startswith("#"):
            offenders.append(f"{sheet_name}!{cell.coordinate}: {value!r}")
    assert not offenders, "\n".join(offenders)


@pytest.mark.parametrize("vertical,lang,wb", all_workbooks())
def test_workbook_has_no_macros(vertical, lang, wb):
    assert wb.vba_archive is None
