"""Central registry of every named range used across the workbook.

Rule 5 of the spec forbids hard-coded numbers inside formulas: every
parameter (service-level z-value, cure time, caps, ...) must live in a
named cell on Settings and be referenced by name. Keeping the full list
of names here - rather than scattering string literals through
formulas.py and the sheet modules - means:

- formulas.py always refers to a constant, never a typed-out name;
- `define()` is the one place that actually registers a name on the
  workbook, so a typo shows up as an import error, not a silent #NAME?;
- `test_references_resolve` can check that every name a formula uses was
  actually defined somewhere.

Sheet modules call `define()` once the cell a name points to exists.
Nothing in this module creates worksheet content itself.
"""

from openpyxl.workbook.defined_name import DefinedName
from openpyxl.workbook.workbook import Workbook
from openpyxl.utils import quote_sheetname


class NAMES:
    """Settings-sheet parameters referenced by formulas across the workbook."""

    CURRENCY = "Currency"
    START_DATE = "PlanStartDate"
    HORIZON_WEEKS = "HorizonWeeks"
    WORK_HOURS_WEEK = "WorkHoursPerWeek"
    SERVICE_LEVEL = "ServiceLevel"
    SERVICE_Z = "ServiceZ"
    GROWTH_PCT = "GrowthPct"
    CURE_DAYS = "CureDays"
    LEAD_TIME_BUFFER_DAYS = "LeadTimeBufferDays"
    FEE_RATE = "FeeRate"
    SCENARIO = "Scenario"
    SCENARIO_Z = "ScenarioZ"
    SCENARIO_CV_CAP = "ScenarioCvCap"
    SEASONALITY_CAP_MIN = "SeasonalityCapMin"
    SEASONALITY_CAP_MAX = "SeasonalityCapMax"

    @classmethod
    def all(cls):
        return [
            v for k, v in vars(cls).items()
            if not k.startswith("_") and isinstance(v, str)
        ]


def define(wb: Workbook, name: str, sheet_name: str, cell_ref: str):
    """Register a workbook-scoped defined name pointing at an absolute cell,
    e.g. define(wb, NAMES.CURRENCY, "Settings", "C4")."""
    col_row = cell_ref.replace("$", "")
    absolute_ref = f"{quote_sheetname(sheet_name)}!${_col(col_row)}${_row(col_row)}"
    wb.defined_names[name] = DefinedName(name, attr_text=absolute_ref)


def _col(cell_ref: str) -> str:
    return "".join(ch for ch in cell_ref if ch.isalpha())


def _row(cell_ref: str) -> str:
    return "".join(ch for ch in cell_ref if ch.isdigit())


def defined_names_in(wb: Workbook) -> set:
    return set(wb.defined_names.keys())
