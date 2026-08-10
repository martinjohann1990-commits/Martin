"""CLI entry point.

Usage:
    python -m build.main --vertical candles --lang de --out dist/
    python -m build.main --all --out dist/     # every vertical x language combo
"""

import argparse
import itertools
import sys
from pathlib import Path

from build.workbook import LANGUAGES, VERTICALS, build_workbook, load_context, output_filename


def generate(vertical: str, lang: str, out_dir: Path) -> Path:
    ctx = load_context(vertical, lang)
    wb = build_workbook(vertical, lang)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / output_filename(ctx)
    wb.save(out_path)
    return out_path


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Generate the Peak Season Planner workbook.")
    parser.add_argument("--vertical", choices=VERTICALS, default="candles")
    parser.add_argument("--lang", choices=LANGUAGES, default="en")
    parser.add_argument("--out", default="dist")
    parser.add_argument("--all", action="store_true", help="generate every vertical x language combination")
    args = parser.parse_args(argv)

    out_dir = Path(args.out)

    combos = itertools.product(VERTICALS, LANGUAGES) if args.all else [(args.vertical, args.lang)]
    for vertical, lang in combos:
        out_path = generate(vertical, lang, out_dir)
        print(f"wrote {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
