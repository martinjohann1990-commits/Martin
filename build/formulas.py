"""Formula text builders.

Per spec section 7, sheet modules never write formula string literals
directly - they call a function here. That keeps every formula
Google-Sheets-compatible (no LET/LAMBDA/XLOOKUP/dynamic arrays, see
section 2) reviewable and testable in one place, and keeps
`test_no_banned_functions` meaningful: it only has to scan this module's
output, not free-form strings copy-pasted across twelve sheet files.

Milestone 1 only needs the IFERROR wrapper (rule 4: an empty, freshly
opened workbook must never show an error value). The actual calculation
formulas (seasonality, forecast, safety stock, ...) are added starting
with the Forecast sheet in Milestone 3.
"""


def wrap_iferror(formula: str, fallback="") -> str:
    """Wrap a formula so a freshly opened, unfilled sheet shows a blank
    (or an explicit fallback) instead of #DIV/0!, #N/A or #REF!."""
    if isinstance(fallback, str):
        fallback_literal = f'"{fallback}"'
    else:
        fallback_literal = str(fallback)
    return f"=IFERROR({formula.lstrip('=')}, {fallback_literal})"
