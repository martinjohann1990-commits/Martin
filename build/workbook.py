"""Orchestration: load config, create every sheet in spec order, apply
protection, and return the finished workbook. Sheet order here is the
order they appear in the file (spec section 3)."""

from pathlib import Path

import yaml
from openpyxl import Workbook

from build import styles
from build.sheets import (
    s01_start, s02_settings, s03_import, s04_products, s05_forecast,
    s06_production, s07_materials, s08_cash, s09_dashboard,
    s10_actionplan, s11_method, s12_example,
)

CONFIG_DIR = Path(__file__).parent / "config"

SHEET_MODULES = [
    ("start", s01_start),
    ("settings", s02_settings),
    ("import", s03_import),
    ("products", s04_products),
    ("forecast", s05_forecast),
    ("production", s06_production),
    ("materials", s07_materials),
    ("cash", s08_cash),
    ("dashboard", s09_dashboard),
    ("actionplan", s10_actionplan),
    ("method", s11_method),
    ("example", s12_example),
]

VERTICALS = ["candles", "jewelry", "printing3d", "generic"]
LANGUAGES = ["en", "de"]


def _load_yaml(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_context(vertical: str, lang: str) -> dict:
    if vertical not in VERTICALS:
        raise ValueError(f"Unknown vertical '{vertical}', expected one of {VERTICALS}")
    if lang not in LANGUAGES:
        raise ValueError(f"Unknown language '{lang}', expected one of {LANGUAGES}")
    return {
        "vertical": vertical,
        "vertical_cfg": _load_yaml(CONFIG_DIR / "verticals" / f"{vertical}.yaml"),
        "defaults": _load_yaml(CONFIG_DIR / "defaults.yaml"),
        "strings": _load_yaml(CONFIG_DIR / f"strings_{lang}.yaml"),
        "lang": lang,
    }


def sheet_title(ctx: dict, key: str) -> str:
    return ctx["strings"].get(key, {}).get("sheet_title", key.capitalize())


def build_workbook(vertical: str, lang: str) -> Workbook:
    ctx = load_context(vertical, lang)

    wb = Workbook()
    wb.remove(wb.active)
    wb.calculation.fullCalcOnLoad = True
    wb.properties.title = ctx["strings"].get("meta", {}).get("workbook_title", "Peak Season Planner")

    sheets = {}
    for key, module in SHEET_MODULES:
        ws = wb.create_sheet(title=sheet_title(ctx, key))
        module.build(ws, ctx)
        sheets[key] = ws

    for ws in sheets.values():
        styles.protect_sheet(ws)

    sheets["method"].sheet_state = "hidden"

    wb.active = 0
    return wb


def output_filename(ctx: dict) -> str:
    """Peak-Season-Planner-EN.xlsx for the default (candles) vertical, per
    spec section 0/3; other verticals get a vertical suffix so --all
    doesn't overwrite one language's file with another vertical's."""
    lang_suffix = ctx["strings"].get("meta", {}).get("file_suffix", ctx["lang"].upper())
    if ctx["vertical"] == "candles":
        return f"Peak-Season-Planner-{lang_suffix}.xlsx"
    return f"Peak-Season-Planner-{lang_suffix}-{ctx['vertical']}.xlsx"
