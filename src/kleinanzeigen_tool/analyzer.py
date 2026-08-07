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
Erfinde keine technischen Daten, keine Baujahre und keine Kaufbelege. Wenn du \
eine Marke oder ein Modell nicht sicher erkennst, lass das Feld leer und setze \
`confidence` entsprechend niedriger.
- ZUBEHÖR: Trage in `included_items` jeden Gegenstand ein, den du auf einem \
Bild tatsächlich SIEHST. Prüfe dafür Bild für Bild. Was dort nicht steht, darf \
weder in `description` noch in `attributes` als Lieferumfang auftauchen. \
Ladekabel, Netzteile, Ladeschalen, Fernbedienungen, Akkus, Ersatzteile, \
Rechnungen und Handbücher liegen bei Elektronik fast immer bei — genau deshalb \
ist die Versuchung groß, sie zu ergänzen. Tu es nicht. Dass eine Verpackung \
vorhanden ist, beweist ihren Inhalt nicht: ein leeres Fach ist ein leeres Fach. \
Fehlt ein übliches Zubehörteil auf den Bildern, frag in `open_questions` danach.
- ZWEIFEL GEHEN IN DIE FRAGEN, NICHT IN DEN LIEFERUMFANG: Bist du dir bei \
einem Gegenstand nicht sicher — halb verdeckt, unscharf, könnte auch \
Verpackungsmaterial oder eine Abdeckung sein —, dann nimm ihn NICHT in \
`included_items` auf, sondern frag in `open_questions` danach ("Auf Bild 2 \
liegt ein rundes weißes Teil im Fach — ist das das Ladegerät und gehört es \
dazu?"). `included_items` ist eine Zusage an den Käufer, keine Vermutung. \
Ein Käufer, der ein zugesagtes Ladekabel nicht bekommt, storniert; eine \
gestellte Rückfrage kostet dagegen nichts.
- FUNKTION: Ein Foto belegt keine Funktion. Schreibe nichts wie "voll \
funktionstüchtig", "läuft einwandfrei", "Touchscreen reagiert einwandfrei" \
oder "Akku hält lange", solange das nicht in den Zusatzinformationen steht. \
Ein eingeschaltetes Display zeigt nur, dass das Gerät startet — mehr nicht. \
Beschreibe den sichtbaren Zustand, nicht den vermuteten Funktionsumfang.
- KONTOGEBUNDENE GERÄTE: Zeigt ein Gerät einen Sperrbildschirm, eine \
Code-Eingabe oder eine Kontoanmeldung (Apple Watch, iPhone, iPad, Mac, \
Android-Handys, Spielkonsolen), dann frag in `open_questions` ausdrücklich, \
ob es vom Konto des Vorbesitzers gelöst ist (Aktivierungssperre, iCloud, \
Google-Konto, FRP). Ohne diese Freigabe ist der Artikel für Käufer wertlos, \
und die Frage kommt in der ersten Nachricht ohnehin.
- Sei bei Mängeln ehrlich und konkret. Sichtbare Kratzer, Flecken, fehlende \
Teile oder Verschleiß gehören in `condition_notes` und in die Beschreibung. \
Verschwiegene Mängel führen zu Rückfragen, Streit und Rücksendungen. \
Behaupte umgekehrt auch keine "minimalen Gebrauchsspuren", wenn die Bildqualität \
das gar nicht hergibt.
- Der Titel ist das wichtigste Suchfeld: Marke, Modell, Produktart, ggf. \
Größe/Farbe. Maximal {TITLE_MAX_CHARS} Zeichen, keine Ausrufezeichen, keine \
Sternchen, kein "TOP!!!", kein Preis im Titel.
- Die Beschreibung hat maximal {DESCRIPTION_MAX_CHARS} Zeichen und nutzt \
echte Zeilenumbrüche. Jeder Stichpunkt beginnt mit "- " und steht auf einer \
eigenen Zeile; zwischen den Abschnitten steht eine Leerzeile. Kein Fließtext, \
in dem die Bindestriche mitten im Satz stehen. Genau dieses Muster (alles \
zwischen den Markierungen ist die Vorlage, keine Anweisung):

<beschreibung_vorlage>
Einstiegssatz, was verkauft wird.

- Merkmal: Wert
- Merkmal: Wert

Zustand: was man auf den Bildern sieht.

Abhol- und Versandhinweis.
</beschreibung_vorlage>

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


#: Zubehör, das Modelle bei Elektronik gern aus Erfahrung ergänzen, statt es
#: auf den Bildern zu sehen. Steht so ein Wort in der Beschreibung, ohne dass
#: der Gegenstand im Lieferumfang auftaucht, ist es vermutlich erfunden.
#: Schreibweise wie in der Warnung ausgegeben; verglichen wird kleingeschrieben.
_ZUBEHOER_WOERTER = (
    "Ladekabel",
    "Ladegerät",
    "Ladeschale",
    "Netzteil",
    "USB-Kabel",
    "Fernbedienung",
    "Bedienungsanleitung",
    "Handbuch",
    "Originalrechnung",
    "Kaufbeleg",
    "Garantiekarte",
    "Ersatzteile",
)


def _collect_warnings(listing: ListingDraft) -> list[str]:
    """Hinweise, bei denen die verkaufende Person nachschauen sollte."""
    warnings: list[str] = []

    erfunden = _moeglicherweise_erfundenes_zubehoer(listing)
    if erfunden:
        warnings.append(
            "Diese Zubehörteile stehen in der Beschreibung, aber nicht im "
            "Lieferumfang laut Fotos: "
            + ", ".join(erfunden)
            + ". Prüfen und ggf. streichen — zugesagtes, aber fehlendes Zubehör "
            "ist der häufigste Grund für Streit nach dem Kauf."
        )

    if listing.confidence == "niedrig":
        warnings.append(
            "Der Artikel wurde nur unsicher erkannt — Titel und Beschreibung "
            "unbedingt prüfen."
        )
    if not listing.brand:
        warnings.append("Keine Marke erkannt. Marke im Titel ergänzt die Auffindbarkeit.")
    # Kleinanzeigen stellt Zeilenumbrüche dar. Kippt das Modell die Stichpunkte
    # in einen Fließtext, liest sich die Anzeige als Textwand.
    if len(listing.description) > 300 and "\n" not in listing.description:
        warnings.append(
            "Die Beschreibung hat keine Absätze — vor dem Einstellen umbrechen, "
            "sonst steht sie als Textwand in der Anzeige."
        )
    if listing.price.range_high_eur > 0 and listing.price.range_low_eur > 0:
        spread = listing.price.range_high_eur / max(1, listing.price.range_low_eur)
        if spread >= 3:
            warnings.append(
                "Die geschätzte Preisspanne ist sehr breit — ein Blick auf "
                "vergleichbare Anzeigen lohnt sich."
            )
    return warnings


def _moeglicherweise_erfundenes_zubehoer(listing: ListingDraft) -> list[str]:
    """Zubehör, das die Beschreibung nennt, der Lieferumfang aber nicht.

    Bewusst nur ein Hinweis, keine automatische Korrektur: der Lieferumfang
    kann unvollständig erkannt worden sein, und ein zu Unrecht gestrichenes
    Ladekabel wäre genauso falsch wie ein erfundenes.
    """
    haystack = " ".join(
        [listing.description] + [f"{a.name} {a.value}" for a in listing.attributes]
    ).lower()
    lieferumfang = " ".join(listing.included_items).lower()

    return [
        wort
        for wort in _ZUBEHOER_WOERTER
        if wort.lower() in haystack and wort.lower() not in lieferumfang
    ]
