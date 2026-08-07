"""Ausgabeformate: JSON zum Weiterverarbeiten, Markdown/Text zum Lesen."""

from __future__ import annotations

import json
from pathlib import Path

from kleinanzeigen_tool.analyzer import AnalysisResult
from kleinanzeigen_tool.models import ListingDraft

# ANSI-Codes werden nur genutzt, wenn die Ausgabe wirklich in ein Terminal geht.
_BOLD = "\033[1m"
_DIM = "\033[2m"
_RESET = "\033[0m"


def to_json(result: AnalysisResult, image_paths: list[Path] | None = None) -> str:
    """Vollständiger Entwurf als JSON — Eingabe für `kleinanzeigen fill`."""
    payload = {
        "listing": result.listing.model_dump(),
        "images": [str(p) for p in (image_paths or [])],
        "warnings": result.warnings,
        "research_notes": result.research_notes,
        "usage": {
            "input_tokens": result.input_tokens,
            "output_tokens": result.output_tokens,
            "provider": result.provider,
            "model": result.model,
        },
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def load_json(path: Path) -> ListingDraft:
    """Liest einen zuvor exportierten Entwurf zurück ein."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    listing = payload["listing"] if "listing" in payload else payload
    return ListingDraft.model_validate(listing)


def to_markdown(result: AnalysisResult) -> str:
    """Menschenlesbare Fassung zum Gegenlesen vor dem Einstellen."""
    listing = result.listing
    lines = [
        f"# {listing.title}",
        "",
        f"**Preis:** {listing.price_label()}  ",
        f"**Zustand:** {listing.condition}  ",
        f"**Kategorie:** {' → '.join(listing.category_path)}  ",
        f"**Versand:** {listing.shipping}",
        "",
        "## Beschreibung",
        "",
        listing.description,
        "",
    ]

    if listing.attributes:
        lines += ["## Details", ""]
        lines += [f"- **{a.name}:** {a.value}" for a in listing.attributes]
        lines.append("")

    lines += [
        "## Preiseinschätzung",
        "",
        f"- Empfehlung: **{listing.price.recommended_eur} €**",
        f"- Realistische Spanne: {listing.price.range_low_eur} – "
        f"{listing.price.range_high_eur} €",
        f"- Begründung: {listing.price.reasoning}",
        "",
    ]

    if listing.tags:
        lines += ["## Suchbegriffe", "", ", ".join(listing.tags), ""]

    if listing.condition_notes:
        lines += ["## Sichtbare Gebrauchsspuren", "", listing.condition_notes, ""]

    if listing.open_questions:
        lines += ["## Offene Fragen", ""]
        lines += [f"- {q}" for q in listing.open_questions]
        lines.append("")

    if result.warnings:
        lines += ["## Hinweise", ""]
        lines += [f"- {w}" for w in result.warnings]
        lines.append("")

    if result.research_notes:
        lines += ["## Preisrecherche", "", result.research_notes, ""]

    return "\n".join(lines).rstrip() + "\n"


def to_terminal(result: AnalysisResult, color: bool = True) -> str:
    """Kompakte Übersicht für die Konsole."""

    def bold(text: str) -> str:
        return f"{_BOLD}{text}{_RESET}" if color else text

    def dim(text: str) -> str:
        return f"{_DIM}{text}{_RESET}" if color else text

    listing = result.listing
    out = [
        "",
        bold("TITEL"),
        f"  {listing.title}",
        dim(f"  ({len(listing.title)}/65 Zeichen)"),
        "",
        bold("PREIS"),
        f"  {listing.price_label()}"
        f"   {dim(f'(Spanne {listing.price.range_low_eur}–{listing.price.range_high_eur} €)')}",
        f"  {dim(listing.price.reasoning)}",
        "",
        bold("KATEGORIE"),
        f"  {' → '.join(listing.category_path)}",
        "",
        bold("ZUSTAND"),
        f"  {listing.condition}"
        + (f" — {listing.condition_notes}" if listing.condition_notes else ""),
        "",
        bold("VERSAND"),
        f"  {listing.shipping}",
        "",
        bold("BESCHREIBUNG"),
    ]
    out += [f"  {line}" for line in listing.description.splitlines()]

    if listing.tags:
        out += ["", bold("SUCHBEGRIFFE"), f"  {', '.join(listing.tags)}"]

    if listing.open_questions:
        out += ["", bold("OFFENE FRAGEN")]
        out += [f"  ? {q}" for q in listing.open_questions]

    if result.warnings:
        out += ["", bold("HINWEISE")]
        out += [f"  ! {w}" for w in result.warnings]

    footer = f"Erkennungssicherheit: {listing.confidence}"
    if result.provider:
        footer += f" · {result.provider}/{result.model}"
    footer += f" · Tokens: {result.input_tokens} in / {result.output_tokens} out"

    out += ["", dim(footer), ""]
    return "\n".join(out)
