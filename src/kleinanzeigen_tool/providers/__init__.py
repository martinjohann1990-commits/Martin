"""Registry der verfügbaren KI-Anbieter."""

from __future__ import annotations

from kleinanzeigen_tool.providers.base import (
    MissingCredentials,
    MissingDependency,
    Provider,
    ProviderError,
    ProviderResult,
)
from kleinanzeigen_tool.providers.claude import ClaudeProvider
from kleinanzeigen_tool.providers.gemini import GeminiProvider

PROVIDERS: dict[str, type[Provider]] = {
    ClaudeProvider.name: ClaudeProvider,
    GeminiProvider.name: GeminiProvider,
}

#: Reihenfolge für die automatische Wahl. Claude zuerst, weil die
#: Erkennungsqualität bei Produktfotos höher ist; Gemini als kostenlose
#: Rückfallebene, wenn kein Anthropic-Schlüssel hinterlegt ist.
AUTO_ORDER = (ClaudeProvider, GeminiProvider)

__all__ = [
    "PROVIDERS",
    "Provider",
    "ProviderError",
    "ProviderResult",
    "MissingCredentials",
    "MissingDependency",
    "ClaudeProvider",
    "GeminiProvider",
    "get_provider",
    "resolve_provider_name",
]


def resolve_provider_name(name: str) -> str:
    """Löst 'auto' anhand der vorhandenen Zugangsdaten auf."""
    if name != "auto":
        return name
    for provider in AUTO_ORDER:
        if provider.has_credentials():
            return provider.name
    raise MissingCredentials(
        "Keine Zugangsdaten gefunden. Setze einen der beiden Schlüssel:\n"
        "  export ANTHROPIC_API_KEY=\"...\"   # console.anthropic.com (kostenpflichtig)\n"
        "  export GEMINI_API_KEY=\"...\"      # aistudio.google.com/apikey "
        "(kostenloses Kontingent)"
    )


def get_provider(name: str = "auto", model: str | None = None) -> Provider:
    """Erzeugt den gewählten Anbieter."""
    resolved = resolve_provider_name(name)
    try:
        provider_class = PROVIDERS[resolved]
    except KeyError:
        raise ProviderError(
            f"Unbekannter Anbieter '{resolved}'. Verfügbar: "
            + ", ".join(sorted(PROVIDERS))
        ) from None
    return provider_class(model=model)
