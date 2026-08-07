"""Anbieterunabhängige Prompts und Orchestrierung der Inseratserstellung."""

from __future__ import annotations

from dataclasses import dataclass, field

from kleinanzeigen_tool.images import PreparedImage
from kleinanzeigen_tool.models import (
    DESCRIPTION_MAX_CHARS,
    TITLE_MAX_CHARS,
    ListingDraft,
)
from kleinanzeigen_tool.providers.base import Provider, ProviderError

SYSTEM_PROMPT = f"""\
Du bist ein erfahrener Verkäufer auf kleinanzeigen.de und schreibst Inserate, \
die schnell verkaufen, ohne zu übertreiben.

Du bekommst Fotos eines Gegenstands und erstellst daraus ein vollständiges \
Inserat auf Deutsch.

Grundregeln:
- Beschreibe ausschließlich, was auf den Bildern tatsächlich zu sehen ist. \
Erfinde keine technischen Daten, kein Zubehör, keine Baujahre und keine \
Kaufbelege. Wenn du eine Marke oder ein Modell nicht sicher erkennst, lass \
das Feld leer und setze `confidence` entsprechend niedriger.
- Sei bei Mängeln ehrlich und konkret. Sichtbare Kratzer, Flecken, fehlende \
Teile oder Verschleiß gehören in `condition_notes` und in die Beschreibung. \
Verschwiegene Mängel führen zu Rückfragen, Streit und Rücksendungen.
- Der Titel ist das wichtigste Suchfeld: Marke, Modell, Produktart, ggf. \
Größe/Farbe. Maximal {TITLE_MAX_CHARS} Zeichen, keine Ausrufezeichen, keine \
Sternchen, kein "TOP!!!", kein Preis im Titel.
- Die Beschreibung hat maximal {DESCRIPTION_MAX_CHARS} Zeichen und ist \
gegliedert: ein Einstiegssatz, dann Stichpunkte mit den Eigenschaften, dann \
ein Absatz zum Zustand, zuletzt ein Satz zu Abholung/Versand.
- Keine Kontaktdaten, keine Telefonnummern, keine Links, keine externen \
Zahlungsaufforderungen. Keine seitenlangen Haftungsausschlüsse — ein kurzer \
Hinweis auf Privatverkauf ohne Garantie und Rücknahme reicht.
- Der Preis ist ein realistischer Gebrauchtpreis für den deutschen Markt, \
nicht der Neupreis. Berücksichtige Zustand, Alter, Marke und Nachfrage.
- Schreibe in normalem, sachlichem Deutsch. Kein Marketing-Sprech, keine \
Emojis, keine erfundene Vorgeschichte des Gegenstands.

Zeigen mehrere Bilder offensichtlich verschiedene Gegenstände, beschreibe den \
Gegenstand, der auf den meisten Bildern zu sehen ist, und weise in \
`open_questions` darauf hin.
"""

RESEARCH_SYSTEM_PROMPT = """\
Du recherchierst aktuelle Gebrauchtpreise für den deutschen Markt.

Nutze die Websuche, um herauszufinden, was der beschriebene Artikel gebraucht \
kostet — bevorzugt auf kleinanzeigen.de, ebay.de und vergleichbaren Portalen.

Antworte kompakt auf Deutsch mit:
- typische Angebotspreise gebraucht (Spanne)
- ungefährer Neupreis, falls auffindbar
- was den Preis nach oben oder unten treibt

Wenn du nichts Belastbares findest, sage das ausdrücklich. Erfinde keine Preise.
"""


@dataclass
class ListingRequest:
    """Alles, was in die Analyse einfließt."""

    images: list[PreparedImage]
    notes: str = ""
    price_hint: int | None = None
    location: str = ""
    condition_hint: str = ""
    price_research: str = ""
    extra_instructions: str = ""


@dataclass
class AnalysisResult:
    """Ergebnis inklusive Verbrauchsdaten für die Kostenkontrolle."""

    listing: ListingDraft
    input_tokens: int = 0
    output_tokens: int = 0
    research_notes: str = ""
    warnings: list[str] = field(default_factory=list)
    provider: str = ""
    model: str = ""


class AnalysisFailed(Exception):
    """Die Analyse konnte nicht abgeschlossen werden."""


def build_instruction_text(request: ListingRequest) -> str:
    """Der Anweisungstext, der auf die Bilder folgt.

    Anbieterunabhängig: Claude und Gemini bekommen wortgleich dieselbe
    Aufgabe, nur in ihr jeweiliges Nachrichtenformat verpackt.
    """
    lines = [
        f"Erstelle aus diesen {len(request.images)} Foto(s) ein vollständiges "
        "Inserat für kleinanzeigen.de."
    ]

    if request.notes:
        lines.append(
            "\nZusatzinformationen der verkaufenden Person (diese sind verlässlich "
            "und dürfen die Bildanalyse ergänzen):\n" + request.notes
        )
    if request.condition_hint:
        lines.append(
            f"\nAngegebener Zustand: {request.condition_hint}. Übernimm diese Angabe, "
            "sofern die Bilder ihr nicht klar widersprechen."
        )
    if request.price_hint is not None:
        lines.append(
            f"\nPreisvorstellung der verkaufenden Person: {request.price_hint} €. "
            "Orientiere dich daran, weise aber in `price.reasoning` darauf hin, "
            "falls der Betrag deutlich vom realistischen Marktpreis abweicht."
        )
    if request.location:
        lines.append(f"\nStandort des Artikels: {request.location}.")
    if request.price_research:
        lines.append(
            "\nRechercheergebnisse zu aktuellen Gebrauchtpreisen:\n"
            + request.price_research
        )
    if request.extra_instructions:
        lines.append("\nZusätzliche Vorgaben:\n" + request.extra_instructions)

    return "\n".join(lines)


def analyze(provider: Provider, request: ListingRequest) -> AnalysisResult:
    """Erzeugt über den gewählten Anbieter einen Inseratsentwurf."""
    if not request.images:
        raise AnalysisFailed("Keine Bilder übergeben.")

    try:
        result = provider.analyze(request)
    except ProviderError as exc:
        raise AnalysisFailed(str(exc)) from exc

    listing = result.listing.normalize()
    return AnalysisResult(
        listing=listing,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        research_notes=request.price_research,
        warnings=_collect_warnings(listing),
        provider=provider.name,
        model=provider.model,
    )


def research_prices(provider: Provider, request: ListingRequest) -> str:
    """Optionale Websuche nach aktuellen Gebrauchtpreisen."""
    try:
        return provider.research(request)
    except ProviderError as exc:
        raise AnalysisFailed(str(exc)) from exc


def _collect_warnings(listing: ListingDraft) -> list[str]:
    """Hinweise, bei denen die verkaufende Person nachschauen sollte."""
    warnings: list[str] = []
    if listing.confidence == "niedrig":
        warnings.append(
            "Der Artikel wurde nur unsicher erkannt — Titel und Beschreibung "
            "unbedingt prüfen."
        )
    if not listing.brand:
        warnings.append("Keine Marke erkannt. Marke im Titel ergänzt die Auffindbarkeit.")
    if listing.price.range_high_eur > 0 and listing.price.range_low_eur > 0:
        spread = listing.price.range_high_eur / max(1, listing.price.range_low_eur)
        if spread >= 3:
            warnings.append(
                "Die geschätzte Preisspanne ist sehr breit — ein Blick auf "
                "vergleichbare Anzeigen lohnt sich."
            )
    return warnings
