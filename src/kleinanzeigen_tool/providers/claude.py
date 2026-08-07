"""Anbieter: Anthropic Claude."""

from __future__ import annotations

import os

from kleinanzeigen_tool.providers.base import (
    MissingCredentials,
    MissingDependency,
    Provider,
    ProviderError,
    ProviderResult,
)

MAX_TOKENS = 16000
RESEARCH_MAX_TOKENS = 8000
MAX_PAUSE_RESUMES = 5


class ClaudeProvider(Provider):
    """Beste Erkennungsqualität, kostet pro Inserat wenige Cent."""

    name = "claude"
    default_model = "claude-opus-5"
    api_key_env = "ANTHROPIC_API_KEY"

    # Günstigere Alternativen, auf die die CLI hinweist.
    cheaper_models = ("claude-sonnet-5", "claude-haiku-4-5")

    def _client(self):
        try:
            import anthropic
        except ImportError as exc:
            import sys

            raise MissingDependency(
                f"Für Claude fehlt das Anthropic-SDK ({exc}). Installation:\n"
                f"  {sys.executable} -m pip install -U anthropic\n"
                "Auf Android dauert das länger — es enthält eine Rust-Komponente.\n"
                "Wer nur Gemini nutzt, braucht es nicht: --provider gemini"
            ) from exc
        self._anthropic = anthropic
        try:
            return anthropic.Anthropic()
        except Exception as exc:
            raise MissingCredentials(
                "Keine Anthropic-Zugangsdaten. Setze ANTHROPIC_API_KEY oder melde "
                "dich mit `ant auth login` an."
            ) from exc

    def _content(self, request) -> list[dict]:
        """Bilder mit Beschriftung, danach der Anweisungstext."""
        from kleinanzeigen_tool.analyzer import build_instruction_text

        content: list[dict] = []
        for index, image in enumerate(request.images, start=1):
            content.append(
                {"type": "text", "text": f"Bild {index}: {image.source_path.name}"}
            )
            content.append(image.to_content_block())
        content.append({"type": "text", "text": build_instruction_text(request)})
        return content

    def analyze(self, request) -> ProviderResult:
        from kleinanzeigen_tool.analyzer import SYSTEM_PROMPT
        from kleinanzeigen_tool.models import ListingDraft

        client = self._client()
        try:
            response = client.messages.parse(
                model=self.model,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                thinking={"type": "adaptive"},
                messages=[{"role": "user", "content": self._content(request)}],
                output_format=ListingDraft,
            )
        except self._anthropic.AuthenticationError as exc:
            raise MissingCredentials(
                "Anthropic hat den API-Schlüssel abgelehnt. Prüfe ANTHROPIC_API_KEY."
            ) from exc
        except self._anthropic.NotFoundError as exc:
            raise ProviderError(
                f"Modell '{self.model}' nicht gefunden. Verfügbare Modelle: "
                "kleinanzeigen models --provider claude"
            ) from exc
        except self._anthropic.RateLimitError as exc:
            raise ProviderError(
                "Anthropic-Rate-Limit erreicht. Bitte später erneut versuchen."
            ) from exc
        except self._anthropic.APIError as exc:
            raise ProviderError(f"Anthropic-API-Fehler: {exc}") from exc

        if response.stop_reason == "refusal":
            raise ProviderError(_refusal_message(response))
        if response.stop_reason == "max_tokens":
            raise ProviderError(
                "Die Antwort wurde abgeschnitten (max_tokens erreicht). "
                "Versuche es mit weniger Bildern."
            )
        if response.parsed_output is None:
            raise ProviderError("Claude hat kein auswertbares Inserat geliefert.")

        return ProviderResult(
            listing=response.parsed_output,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )

    def research(self, request) -> str:
        from kleinanzeigen_tool.analyzer import RESEARCH_SYSTEM_PROMPT

        client = self._client()
        messages = [{"role": "user", "content": self._content(request)}]
        tools = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 5}]

        for _ in range(MAX_PAUSE_RESUMES):
            try:
                response = client.messages.create(
                    model=self.model,
                    max_tokens=RESEARCH_MAX_TOKENS,
                    system=RESEARCH_SYSTEM_PROMPT,
                    tools=tools,
                    messages=messages,
                )
            except self._anthropic.APIError as exc:
                raise ProviderError(f"Anthropic-API-Fehler: {exc}") from exc

            if response.stop_reason == "refusal":
                raise ProviderError(_refusal_message(response))
            if response.stop_reason == "pause_turn":
                # Serverseitige Tool-Schleife hat ihr Limit erreicht — fortsetzen.
                messages.append({"role": "assistant", "content": response.content})
                continue
            return "\n".join(b.text for b in response.content if b.type == "text").strip()

        raise ProviderError(
            "Die Preisrecherche wurde nach mehreren Fortsetzungen nicht fertig."
        )

    def list_models(self) -> list[str]:
        client = self._client()
        try:
            return [m.id for m in client.models.list()]
        except self._anthropic.APIError as exc:
            raise ProviderError(f"Modelle konnten nicht abgerufen werden: {exc}") from exc

    @classmethod
    def has_credentials(cls) -> bool:
        if os.environ.get(cls.api_key_env):
            return True
        # `ant auth login` legt ein Profil ohne Umgebungsvariable an.
        config = os.environ.get("ANTHROPIC_CONFIG_DIR")
        from pathlib import Path

        base = Path(config) if config else Path.home() / ".config" / "anthropic"
        return (base / "credentials").is_dir()


def _refusal_message(response) -> str:
    details = getattr(response, "stop_details", None)
    category = getattr(details, "category", None) if details else None
    suffix = f" (Kategorie: {category})" if category else ""
    return (
        "Die Anfrage wurde von den Sicherheitsfiltern abgelehnt" + suffix + ". "
        "Bitte prüfe, ob die Bilder zu einem zulässigen Verkaufsartikel gehören."
    )
