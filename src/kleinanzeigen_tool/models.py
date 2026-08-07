"""Datenmodelle für ein Kleinanzeigen-Inserat.

Die Modelle dienen gleichzeitig als JSON-Schema für die strukturierte Antwort
des Modells. Deshalb bewusst ohne Feld-Constraints (min/max length etc.) —
die Längenlimits von Kleinanzeigen werden in `normalize()` durchgesetzt, damit
eine leicht zu lange Antwort das Ergebnis nicht komplett verwirft.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Harte Limits der Kleinanzeigen-Formulare (Stand: Redaktionsschluss).
TITLE_MAX_CHARS = 65
DESCRIPTION_MAX_CHARS = 4000
MAX_TAGS = 10

Condition = Literal[
    "Neu",
    "Sehr Gut",
    "Gut",
    "In Ordnung",
    "Defekt",
]

PriceType = Literal[
    "Festpreis",
    "VB",
    "Zu verschenken",
]

Shipping = Literal[
    "Nur Abholung",
    "Versand möglich",
    "Versand und Abholung",
]


class PriceEstimate(BaseModel):
    """Preisvorschlag samt Spanne und Begründung."""

    recommended_eur: int = Field(
        description="Empfohlener Angebotspreis in ganzen Euro. 0 bei 'Zu verschenken'."
    )
    range_low_eur: int = Field(
        description="Unteres realistisches Ende der Preisspanne in Euro."
    )
    range_high_eur: int = Field(
        description="Oberes realistisches Ende der Preisspanne in Euro."
    )
    reasoning: str = Field(
        description=(
            "Kurze Begründung des Preises auf Deutsch: Modell, Zustand, "
            "typische Gebrauchtpreise, Nachfrage."
        )
    )


class Attribute(BaseModel):
    """Ein Detailfeld wie 'Marke', 'Größe', 'Farbe', 'Material'."""

    name: str = Field(description="Name des Merkmals auf Deutsch, z.B. 'Marke'.")
    value: str = Field(description="Wert des Merkmals, z.B. 'Bosch'.")


class ListingDraft(BaseModel):
    """Der vollständige Inseratsentwurf, wie ihn das Modell liefert."""

    title: str = Field(
        description=(
            f"Suchoptimierter Anzeigentitel auf Deutsch, maximal {TITLE_MAX_CHARS} "
            "Zeichen. Beginnt mit Marke und Modell, keine Ausrufezeichen, "
            "kein SPAM, keine Preise im Titel."
        )
    )
    category_path: list[str] = Field(
        description=(
            "Vorgeschlagener Kategoriepfad auf kleinanzeigen.de von grob nach fein, "
            "z.B. ['Elektronik', 'Handy & Telefon', 'Handy']. 2 bis 3 Ebenen."
        )
    )
    item_type: str = Field(
        description="Was der Gegenstand ist, in wenigen Worten. Z.B. 'Akkuschrauber'."
    )
    brand: str = Field(
        description="Erkannte Marke oder Hersteller. Leerer String, wenn nicht erkennbar."
    )
    model_name: str = Field(
        description="Erkannte Modellbezeichnung. Leerer String, wenn nicht erkennbar."
    )
    condition: Condition = Field(
        description="Zustand, ausschließlich anhand der sichtbaren Bilder eingeschätzt."
    )
    condition_notes: str = Field(
        description=(
            "Sichtbare Gebrauchsspuren, Kratzer, fehlende Teile — ehrlich und konkret. "
            "Leerer String, wenn nichts auffällt."
        )
    )
    description: str = Field(
        description=(
            f"Fertige Anzeigenbeschreibung auf Deutsch, maximal {DESCRIPTION_MAX_CHARS} "
            "Zeichen. Struktur: kurzer Einstiegssatz, dann Stichpunkte zu Eigenschaften, "
            "dann Zustand, dann Abhol-/Versandhinweis. Sachlich, keine erfundenen Fakten, "
            "keine Kontaktdaten, keine Rechtsklauseln-Wand."
        )
    )
    attributes: list[Attribute] = Field(
        description="Konkrete Merkmale, die aus den Bildern ablesbar sind. Nichts erfinden."
    )
    included_items: list[str] = Field(
        description=(
            "Der Lieferumfang: jeder einzelne Gegenstand, der auf mindestens einem "
            "Bild SICHTBAR ist und mitverkauft wird, z.B. ['Uhr', 'Armband S/M', "
            "'Originalkarton']. Ergänze NICHTS, was üblicherweise dabei ist, aber "
            "auf keinem Bild zu sehen ist — kein Ladekabel, kein Netzteil, keine "
            "Anleitung. Nur was du tatsächlich siehst."
        )
    )
    price: PriceEstimate
    price_type: PriceType = Field(
        description="'VB' wenn Verhandlungsspielraum sinnvoll ist, sonst 'Festpreis'."
    )
    shipping: Shipping = Field(
        description=(
            "Versandeinschätzung nach Größe/Gewicht des Gegenstands: sperrige Möbel "
            "'Nur Abholung', kleine Artikel 'Versand und Abholung'."
        )
    )
    tags: list[str] = Field(
        description=(
            f"Bis zu {MAX_TAGS} Suchbegriffe, unter denen Käufer den Artikel suchen. "
            "Einzelne Wörter oder kurze Phrasen, keine Hashtags."
        )
    )
    open_questions: list[str] = Field(
        description=(
            "Fragen an die verkaufende Person, deren Antwort das Inserat deutlich "
            "verbessern würde (z.B. 'Ist das Ladekabel dabei?'). Leere Liste, wenn keine."
        )
    )
    confidence: Literal["hoch", "mittel", "niedrig"] = Field(
        description="Wie sicher die Identifikation des Artikels anhand der Bilder ist."
    )

    # --- Nachbearbeitung -------------------------------------------------

    def normalize(self) -> "ListingDraft":
        """Erzwingt die Plattform-Limits, ohne das Ergebnis zu verwerfen."""
        data = self.model_dump()
        data["title"] = _truncate(data["title"].strip(), TITLE_MAX_CHARS)
        data["description"] = _truncate(
            data["description"].strip(), DESCRIPTION_MAX_CHARS
        )
        data["tags"] = [t.strip().lstrip("#") for t in data["tags"] if t.strip()][
            :MAX_TAGS
        ]
        data["category_path"] = [c.strip() for c in data["category_path"] if c.strip()]

        if data["price_type"] == "Zu verschenken":
            data["price"]["recommended_eur"] = 0
        for key in ("recommended_eur", "range_low_eur", "range_high_eur"):
            data["price"][key] = max(0, int(data["price"][key]))

        return ListingDraft.model_validate(data)

    def price_label(self) -> str:
        """Preis als Text, wie er in der Anzeige erscheint."""
        if self.price_type == "Zu verschenken":
            return "Zu verschenken"
        suffix = " VB" if self.price_type == "VB" else " Festpreis"
        return f"{self.price.recommended_eur} €{suffix}"


def _truncate(text: str, limit: int) -> str:
    """Kürzt auf `limit` Zeichen, möglichst an einer Wortgrenze."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    space = cut.rfind(" ")
    if space > limit * 0.6:
        cut = cut[:space]
    return cut.rstrip(" ,;-–")
