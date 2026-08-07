"""Gemeinsame Schnittstelle für die KI-Anbieter."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from kleinanzeigen_tool.models import ListingDraft


@dataclass
class ProviderResult:
    """Ergebnis eines Anbieter-Aufrufs samt Verbrauchsdaten."""

    listing: ListingDraft
    input_tokens: int = 0
    output_tokens: int = 0


class ProviderError(Exception):
    """Der Anbieter konnte die Anfrage nicht beantworten."""


class MissingCredentials(ProviderError):
    """Es sind keine Zugangsdaten für diesen Anbieter hinterlegt."""


class MissingDependency(ProviderError):
    """Das SDK des Anbieters ist nicht installiert."""


class Provider(ABC):
    """Ein austauschbarer KI-Anbieter.

    Beide Implementierungen liefern dasselbe `ListingDraft` — die Wahl des
    Anbieters ändert nur Kosten und Qualität, nicht das Datenformat. Ein
    Entwurf von Gemini lässt sich also genauso mit `kleinanzeigen fill`
    weiterverarbeiten wie einer von Claude.
    """

    #: Kurzname für `--provider`
    name: str
    #: Modell, das ohne `--model` verwendet wird
    default_model: str
    #: Umgebungsvariable mit dem API-Schlüssel
    api_key_env: str

    def __init__(self, model: str | None = None) -> None:
        self.model = model or self.default_model

    @abstractmethod
    def analyze(self, request) -> ProviderResult:
        """Erzeugt aus den Bildern einen strukturierten Inseratsentwurf."""

    @abstractmethod
    def research(self, request) -> str:
        """Recherchiert per Websuche aktuelle Gebrauchtpreise (Freitext)."""

    @abstractmethod
    def list_models(self) -> list[str]:
        """Nennt die für diesen Schlüssel tatsächlich verfügbaren Modelle."""
