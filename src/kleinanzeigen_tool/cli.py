"""Kommandozeile: `kleinanzeigen create`, `ui`, `fill` und `models`."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from kleinanzeigen_tool import __version__
from kleinanzeigen_tool.images import DEFAULT_IMAGE_SIZE, IMAGE_SIZE_PRESETS

EPILOG = """\
Beispiele:
  kleinanzeigen ui                                         # Oberflaeche im Browser
  kleinanzeigen create ./fotos/
  kleinanzeigen create ./fotos/ --provider gemini          # kostenloses Kontingent
  kleinanzeigen create ./fotos/ --image-size klein         # ~4x guenstiger
  kleinanzeigen create ./fotos/ --price 120 --research --out anzeige
  kleinanzeigen create ./fotos/ --fill
  kleinanzeigen fill anzeige.json --images ./fotos/
  kleinanzeigen models --provider gemini

Zugangsdaten (einer von beiden genuegt):
  export ANTHROPIC_API_KEY="..."   # console.anthropic.com, kostenpflichtig
  export GEMINI_API_KEY="..."      # aistudio.google.com/apikey, kostenloses Kontingent

Ohne --provider waehlt das Tool automatisch den Anbieter, fuer den ein
Schluessel hinterlegt ist.
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
        "--provider",
        choices=["auto", "claude", "gemini"],
        default="auto",
        help="KI-Anbieter. 'auto' nimmt den, für den ein Schlüssel gesetzt ist.",
    )
    create.add_argument(
        "--model",
        default=None,
        help="Konkretes Modell, z.B. claude-haiku-4-5 oder gemini-3.6-flash.",
    )
    create.add_argument(
        "--image-size",
        choices=list(IMAGE_SIZE_PRESETS),
        default=DEFAULT_IMAGE_SIZE,
        help=(
            "Auflösung der hochgeladenen Bilder — der größte Kostenfaktor. "
            f"Standard: {DEFAULT_IMAGE_SIZE}."
        ),
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

    ui = subparsers.add_parser(
        "ui", help="Startet die lokale Oberfläche im Browser."
    )
    ui.add_argument(
        "--port", type=int, default=8765, help="Port (Standard: 8765)."
    )
    ui.add_argument(
        "--no-browser",
        action="store_true",
        help="Browser nicht automatisch öffnen.",
    )

    models = subparsers.add_parser(
        "models", help="Zeigt die Modelle, die der hinterlegte Schlüssel freischaltet."
    )
    models.add_argument(
        "--provider", choices=["auto", "claude", "gemini"], default="auto"
    )

    return parser


def cmd_create(args: argparse.Namespace) -> int:
    from kleinanzeigen_tool import analyzer, export
    from kleinanzeigen_tool.images import NoImagesFound, collect_image_paths, prepare_images
    from kleinanzeigen_tool.providers import ProviderError, get_provider

    # Reihenfolge mit Absicht: erst der billige Pfad-Check (die konkretere
    # Fehlermeldung), dann die Zugangsdaten, und erst danach das teure
    # Skalieren der Bilder.
    try:
        image_paths = collect_image_paths(args.paths, args.max_images)
    except NoImagesFound as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 2

    try:
        provider = get_provider(args.provider, args.model)
    except ProviderError as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 3

    print(
        f"Bereite {len(image_paths)} Bild(er) vor (Größe: {args.image_size}) ...",
        file=sys.stderr,
    )
    images = prepare_images(args.paths, args.max_images, args.image_size)

    request = analyzer.ListingRequest(
        images=images,
        notes=args.notes,
        price_hint=args.price,
        location=args.location,
        condition_hint=args.condition,
    )

    try:
        if args.research:
            print(
                f"Recherchiere aktuelle Gebrauchtpreise ({provider.name}) ...",
                file=sys.stderr,
            )
            request.price_research = analyzer.research_prices(provider, request)

        print(
            f"Analysiere Bilder mit {provider.name}/{provider.model} ...",
            file=sys.stderr,
        )
        result = analyzer.analyze(provider, request)
    except analyzer.AnalysisFailed as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 1

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


def cmd_models(args: argparse.Namespace) -> int:
    from kleinanzeigen_tool.providers import ProviderError, get_provider

    try:
        provider = get_provider(args.provider)
        names = provider.list_models()
    except ProviderError as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 3

    print(f"Modelle für {provider.name} (Standard: {provider.default_model}):")
    for name in names:
        marker = " *" if name == provider.default_model else ""
        print(f"  {name}{marker}")
    return 0


def cmd_ui(args: argparse.Namespace) -> int:
    from kleinanzeigen_tool.ui import serve

    try:
        serve(port=args.port, open_browser=not args.no_browser)
    except OSError as exc:
        print(
            f"Fehler: Port {args.port} ist nicht verfügbar ({exc}). "
            "Anderen Port wählen: kleinanzeigen ui --port 8790",
            file=sys.stderr,
        )
        return 7
    return 0


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
    if args.command == "ui":
        return cmd_ui(args)
    if args.command == "models":
        return cmd_models(args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
