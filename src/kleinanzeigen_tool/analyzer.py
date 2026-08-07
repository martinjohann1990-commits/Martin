"""Bildanalyse und Inseratserstellung über die Claude API."""

from __future__ import annotations

from dataclasses import dataclass, field

import anthropic

from kleinanzeigen_tool.images import PreparedImage
from kleinanzeigen_tool.models import (
    DESCRIPTION_MAX_CHARS,
    TITLE_MAX_CHARS,
    ListingDraft,
)

MODEL = "claude-opus-5"
MAX_TOKENS = 16000
RESEARCH_MAX_TOKENS = 8000
MAX_PAUSE_RESUMES = 5

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


class AnalysisFailed(Exception):
    """Die Analyse konnte nicht abgeschlossen werden."""


def build_user_content(request: ListingRequest) -> list[dict]:
    """Baut den User-Turn: erst die Bilder, dann die Anweisung."""
    content: list[dict] = []

    for index, image in enumerate(request.images, start=1):
        content.append({"type": "text", "text": f"Bild {index}: {image.source_path.name}"})
        content.append(image.to_content_block())

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

    content.append({"type": "text", "text": "\n".join(lines)})
    return content


def research_prices(
    client: anthropic.Anthropic, request: ListingRequest, *, max_uses: int = 5
) -> str:
    """Optionale Websuche nach aktuellen Gebrauchtpreisen.

    Läuft absichtlich als eigener Schritt vor der strukturierten Analyse: das
    hält den Hauptaufruf frei von Tool-Schleifen und macht das Ergebnis der
    Recherche für den Nutzer nachvollziehbar.
    """
    messages = [{"role": "user", "content": build_user_content(request)}]
    tools = [
        {"type": "web_search_20260209", "name": "web_search", "max_uses": max_uses}
    ]

    for _ in range(MAX_PAUSE_RESUMES):
        response = client.messages.create(
            model=MODEL,
            max_tokens=RESEARCH_MAX_TOKENS,
            system=RESEARCH_SYSTEM_PROMPT,
            tools=tools,
            messages=messages,
        )
        if response.stop_reason == "refusal":
            raise AnalysisFailed(_refusal_message(response))
        if response.stop_reason == "pause_turn":
            # Serverseitige Tool-Schleife hat ihr Limit erreicht — fortsetzen.
            messages.append({"role": "assistant", "content": response.content})
            continue
        return "\n".join(b.text for b in response.content if b.type == "text").strip()

    raise AnalysisFailed(
        "Die Preisrecherche wurde nach mehreren Fortsetzungen nicht fertig."
    )


def analyze(client: anthropic.Anthropic, request: ListingRequest) -> AnalysisResult:
    """Erzeugt aus den Bildern einen strukturierten Inseratsentwurf."""
    if not request.images:
        raise AnalysisFailed("Keine Bilder übergeben.")

    response = client.messages.parse(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": build_user_content(request)}],
        output_format=ListingDraft,
    )

    if response.stop_reason == "refusal":
        raise AnalysisFailed(_refusal_message(response))
    if response.stop_reason == "max_tokens":
        raise AnalysisFailed(
            "Die Antwort wurde abgeschnitten (max_tokens erreicht). "
            "Versuche es mit weniger Bildern."
        )
    if response.parsed_output is None:
        raise AnalysisFailed("Das Modell hat kein auswertbares Inserat geliefert.")

    listing = response.parsed_output.normalize()
    warnings = _collect_warnings(listing)

    return AnalysisResult(
        listing=listing,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        research_notes=request.price_research,
        warnings=warnings,
    )


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


def _refusal_message(response) -> str:
    details = getattr(response, "stop_details", None)
    category = getattr(details, "category", None) if details else None
    suffix = f" (Kategorie: {category})" if category else ""
    return (
        "Die Anfrage wurde von den Sicherheitsfiltern abgelehnt" + suffix + ". "
        "Bitte prüfe, ob die Bilder zu einem zulässigen Verkaufsartikel gehören."
    )
