"""Kommandozeile: `kleinanzeigen create` und `kleinanzeigen fill`."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from kleinanzeigen_tool import __version__

EPILOG = """\
Beispiele:
  kleinanzeigen create ./fotos/
  kleinanzeigen create bild1.jpg bild2.jpg --notes "Nur 2x benutzt, OVP dabei"
  kleinanzeigen create ./fotos/ --price 120 --research --out anzeige
  kleinanzeigen create ./fotos/ --fill
  kleinanzeigen fill anzeige.json --images ./fotos/

Voraussetzung: die Umgebungsvariable ANTHROPIC_API_KEY ist gesetzt
(alternativ eine per `ant auth login` angelegte Anmeldung).
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="kleinanzeigen",
        description="Erstellt aus Fotos ein fertiges Inserat für kleinanzeigen.de.",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser(
        "create",
        help="Bilder analysieren und ein Inserat erzeugen.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    create.add_argument(
        "paths",
        nargs="+",
        type=Path,
        help="Bilddateien oder ein Ordner mit den Fotos eines Artikels.",
    )
    create.add_argument(
        "--notes",
        default="",
        help="Zusatzinfos, die man den Bildern nicht ansieht (Alter, Zubehör, Defekte).",
    )
    create.add_argument(
        "--price", type=int, default=None, help="Eigene Preisvorstellung in Euro."
    )
    create.add_argument("--location", default="", help="Standort, z.B. '10115 Berlin'.")
    create.add_argument(
        "--condition",
        choices=["Neu", "Sehr Gut", "Gut", "In Ordnung", "Defekt"],
        default="",
        help="Zustand vorgeben, statt ihn schätzen zu lassen.",
    )
    create.add_argument(
        "--research",
        action="store_true",
        help="Vorab per Websuche aktuelle Gebrauchtpreise recherchieren (kostet extra).",
    )
    create.add_argument(
        "--max-images",
        type=int,
        default=12,
        help="Maximale Anzahl Bilder, die analysiert werden (Standard: 12).",
    )
    create.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Basisname für die Ausgabedateien; erzeugt <name>.json und <name>.md.",
    )
    create.add_argument(
        "--fill",
        action="store_true",
        help="Nach der Analyse direkt den Browser öffnen und das Formular vorausfüllen.",
    )
    create.add_argument(
        "--no-color", action="store_true", help="Keine Farbcodes in der Ausgabe."
    )

    fill = subparsers.add_parser(
        "fill",
        help="Einen gespeicherten Entwurf im Browser ins Formular eintragen.",
    )
    fill.add_argument("listing", type=Path, help="JSON-Datei aus `kleinanzeigen create`.")
    fill.add_argument(
        "--images",
        nargs="*",
        type=Path,
        default=None,
        help="Bilder für den Upload (Dateien oder Ordner).",
    )
    fill.add_argument(
        "--profile-dir",
        type=Path,
        default=None,
        help="Browser-Profil für die dauerhafte Anmeldung.",
    )
    fill.add_argument(
        "--selectors",
        type=Path,
        default=None,
        help="JSON-Datei mit eigenen CSS-Selektoren, falls sich die Seite geändert hat.",
    )

    return parser


def cmd_create(args: argparse.Namespace) -> int:
    import anthropic

    from kleinanzeigen_tool import analyzer, export
    from kleinanzeigen_tool.images import NoImagesFound, collect_image_paths, prepare_images

    try:
        image_paths = collect_image_paths(args.paths, args.max_images)
        print(f"Bereite {len(image_paths)} Bild(er) vor ...", file=sys.stderr)
        images = prepare_images(args.paths, args.max_images)
    except NoImagesFound as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 2

    client = anthropic.Anthropic()
    request = analyzer.ListingRequest(
        images=images,
        notes=args.notes,
        price_hint=args.price,
        location=args.location,
        condition_hint=args.condition,
    )

    try:
        if args.research:
            print("Recherchiere aktuelle Gebrauchtpreise ...", file=sys.stderr)
            request.price_research = analyzer.research_prices(client, request)

        print("Analysiere Bilder und erstelle das Inserat ...", file=sys.stderr)
        result = analyzer.analyze(client, request)
    except analyzer.AnalysisFailed as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 1
    except anthropic.AuthenticationError:
        print(
            "Fehler: Keine gültigen API-Zugangsdaten. Setze ANTHROPIC_API_KEY "
            "oder melde dich mit `ant auth login` an.",
            file=sys.stderr,
        )
        return 3
    except anthropic.RateLimitError:
        print("Fehler: Rate-Limit erreicht. Bitte später erneut versuchen.", file=sys.stderr)
        return 4
    except anthropic.APIError as exc:
        print(f"API-Fehler: {exc}", file=sys.stderr)
        return 5

    color = sys.stdout.isatty() and not args.no_color and not os.environ.get("NO_COLOR")
    print(export.to_terminal(result, color=color))

    if args.out:
        json_path = args.out.with_suffix(".json")
        md_path = args.out.with_suffix(".md")
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(export.to_json(result, image_paths), encoding="utf-8")
        md_path.write_text(export.to_markdown(result), encoding="utf-8")
        print(f"Gespeichert: {json_path} und {md_path}", file=sys.stderr)

    if args.fill:
        return _run_fill(result.listing, image_paths, None, None)

    return 0


def cmd_fill(args: argparse.Namespace) -> int:
    from kleinanzeigen_tool import export
    from kleinanzeigen_tool.images import NoImagesFound, collect_image_paths

    if not args.listing.is_file():
        print(f"Fehler: Datei nicht gefunden: {args.listing}", file=sys.stderr)
        return 2

    listing = export.load_json(args.listing)

    image_paths: list[Path] = []
    if args.images:
        try:
            image_paths = collect_image_paths(args.images)
        except NoImagesFound as exc:
            print(f"Fehler: {exc}", file=sys.stderr)
            return 2

    return _run_fill(listing, image_paths, args.profile_dir, args.selectors)


def _run_fill(listing, image_paths, profile_dir, selectors) -> int:
    from kleinanzeigen_tool.browser import BrowserUnavailable, fill_listing

    try:
        fill_listing(
            listing,
            image_paths=image_paths,
            profile_dir=profile_dir,
            selectors_file=selectors,
        )
    except BrowserUnavailable as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 6
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "create":
        return cmd_create(args)
    if args.command == "fill":
        return cmd_fill(args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
