"""Anbieter: Google Gemini.

Interessant vor allem wegen des kostenlosen Kontingents in Google AI Studio.
Wichtig zu wissen: auf der kostenlosen Stufe darf Google die übermittelten
Daten zur Produktverbesserung verwenden — für Fotos aus der eigenen Wohnung
ist das eine bewusste Entscheidung, keine Nebensache.
"""

from __future__ import annotations

import base64
import os

from kleinanzeigen_tool.providers.base import (
    MissingCredentials,
    MissingDependency,
    Provider,
    ProviderError,
    ProviderResult,
)

MAX_OUTPUT_TOKENS = 16000
RESEARCH_MAX_OUTPUT_TOKENS = 8000

# Abbruchgründe, die nicht "fertig" bedeuten, mit erklärendem Text.
BLOCKING_FINISH_REASONS = {
    "SAFETY": "Die Antwort wurde von Googles Sicherheitsfiltern blockiert.",
    "PROHIBITED_CONTENT": "Der Inhalt wurde als unzulässig eingestuft.",
    "RECITATION": "Die Antwort wurde wegen möglicher Urheberrechtsverletzung blockiert.",
    "BLOCKLIST": "Die Antwort enthielt gesperrte Begriffe.",
    "SPII": "Die Antwort enthielt möglicherweise sensible personenbezogene Daten.",
    "MAX_TOKENS": (
        "Die Antwort wurde abgeschnitten (Token-Limit erreicht). "
        "Versuche es mit weniger Bildern."
    ),
}


class GeminiProvider(Provider):
    """Nutzt die Gemini-API; mit kostenlosem Kontingent verfügbar."""

    name = "gemini"
    # Bewusst ein mitlaufender Alias statt einer festen Version: Google nimmt
    # ältere Modelle für neue Nutzer vom Netz ("no longer available to new
    # users"), und ein fest verdrahteter Standard wäre dann sofort kaputt.
    # Wer Reproduzierbarkeit braucht, pinnt eine Version über --model.
    default_model = "gemini-flash-latest"
    api_key_env = "GEMINI_API_KEY"

    def _client(self):
        try:
            from google import genai
        except ImportError as exc:
            raise MissingDependency(
                "Das Google-GenAI-SDK fehlt. Installation:\n"
                "  pip install 'kleinanzeigen-tool[gemini]'"
            ) from exc

        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise MissingCredentials(
                "Kein Gemini-Schlüssel gefunden. Kostenlos erstellen unter\n"
                "  https://aistudio.google.com/apikey\n"
                "und setzen mit:\n"
                "  export GEMINI_API_KEY=\"...\""
            )
        self._genai = genai
        from google.genai import types

        self._types = types
        return genai.Client(api_key=api_key)

    def _contents(self, request) -> list:
        """Bilder als Parts, danach der Anweisungstext."""
        from kleinanzeigen_tool.analyzer import build_instruction_text

        parts = []
        for index, image in enumerate(request.images, start=1):
            parts.append(
                self._types.Part.from_text(
                    text=f"Bild {index}: {image.source_path.name}"
                )
            )
            parts.append(
                self._types.Part.from_bytes(
                    data=base64.standard_b64decode(image.data_b64),
                    mime_type=image.media_type,
                )
            )
        parts.append(self._types.Part.from_text(text=build_instruction_text(request)))
        return [self._types.Content(role="user", parts=parts)]

    def analyze(self, request) -> ProviderResult:
        from kleinanzeigen_tool.analyzer import SYSTEM_PROMPT
        from kleinanzeigen_tool.models import ListingDraft

        client = self._client()
        config = self._types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=ListingDraft,
            max_output_tokens=MAX_OUTPUT_TOKENS,
        )

        response = self._generate(client, self._contents(request), config)
        self._raise_on_block(response)

        listing = response.parsed
        if listing is None:
            raise ProviderError(
                "Gemini hat kein auswertbares Inserat geliefert. "
                "Ein anderes Modell (--model) liefert hier oft bessere Ergebnisse."
            )
        if not isinstance(listing, ListingDraft):
            # Je nach Schema-Konvertierung kann ein dict zurückkommen.
            listing = ListingDraft.model_validate(listing)

        usage = response.usage_metadata
        return ProviderResult(
            listing=listing,
            input_tokens=getattr(usage, "prompt_token_count", 0) or 0,
            output_tokens=(getattr(usage, "candidates_token_count", 0) or 0)
            + (getattr(usage, "thoughts_token_count", 0) or 0),
        )

    def research(self, request) -> str:
        from kleinanzeigen_tool.analyzer import RESEARCH_SYSTEM_PROMPT

        client = self._client()
        # Die Google-Suche ist ein serverseitiges Tool und lässt sich nicht mit
        # response_schema kombinieren — deshalb läuft die Recherche als
        # eigener Freitext-Schritt vor der strukturierten Analyse.
        config = self._types.GenerateContentConfig(
            system_instruction=RESEARCH_SYSTEM_PROMPT,
            tools=[self._types.Tool(google_search=self._types.GoogleSearch())],
            max_output_tokens=RESEARCH_MAX_OUTPUT_TOKENS,
        )

        response = self._generate(
            client, self._contents(request), config, uses_search=True
        )
        self._raise_on_block(response)
        return (response.text or "").strip()

    def _generate(self, client, contents, config, *, uses_search: bool = False):
        try:
            return client.models.generate_content(
                model=self.model, contents=contents, config=config
            )
        except Exception as exc:
            message = str(exc)
            if "API key" in message or "API_KEY" in message or "PERMISSION" in message:
                raise MissingCredentials(
                    f"Gemini hat den Schlüssel abgelehnt: {message}"
                ) from exc
            if "not found" in message.lower() or "404" in message:
                # Googles eigene Begründung mitgeben — sie nennt oft den Grund
                # (z.B. "no longer available to new users"), den die Modellliste
                # nicht verrät: dort taucht das Modell weiterhin auf.
                raise ProviderError(
                    f"Modell '{self.model}' nicht verfügbar.\n"
                    f"  Google meldet: {_api_message(message)}\n"
                    "  Verfügbare Modelle: kleinanzeigen models --provider gemini"
                ) from exc
            if "RESOURCE_EXHAUSTED" in message or "429" in message:
                if uses_search:
                    # Die Google-Suche zählt gegen ein eigenes, deutlich
                    # knapperes Kontingent als die normale Generierung. Auf der
                    # kostenlosen Stufe schlägt sie oft sofort fehl, obwohl
                    # Inserate ohne --research problemlos durchlaufen.
                    raise ProviderError(
                        "Die Google-Suche ist mit diesem Schlüssel nicht nutzbar "
                        "(eigenes Kontingent, auf der kostenlosen Stufe meist "
                        "gesperrt).\n"
                        "  → Lass --research weg; die Analyse selbst funktioniert.\n"
                        "  → Oder nutze für die Recherche --provider claude."
                    ) from exc
                raise ProviderError(
                    "Gemini-Kontingent erschöpft. Auf der kostenlosen Stufe gelten "
                    "Limits pro Minute und pro Tag — kurz warten und erneut "
                    "versuchen."
                ) from exc
            raise ProviderError(f"Gemini-Fehler: {message}") from exc

    def _raise_on_block(self, response) -> None:
        """Übersetzt Abbruchgründe in verständliche Fehlermeldungen."""
        feedback = getattr(response, "prompt_feedback", None)
        blocked = getattr(feedback, "block_reason", None) if feedback else None
        if blocked:
            raise ProviderError(
                f"Die Anfrage wurde von Gemini blockiert ({blocked}). "
                "Bitte prüfe, ob die Bilder zu einem zulässigen Artikel gehören."
            )

        for candidate in getattr(response, "candidates", None) or []:
            reason = getattr(candidate, "finish_reason", None)
            key = getattr(reason, "name", None) or str(reason or "")
            if key in BLOCKING_FINISH_REASONS:
                raise ProviderError(BLOCKING_FINISH_REASONS[key])

    def list_models(self) -> list[str]:
        client = self._client()
        try:
            names = []
            for model in client.models.list():
                actions = getattr(model, "supported_actions", None) or []
                if actions and "generateContent" not in actions:
                    continue
                names.append((model.name or "").removeprefix("models/"))
            return [n for n in names if n]
        except Exception as exc:
            raise ProviderError(f"Modelle konnten nicht abgerufen werden: {exc}") from exc

    @classmethod
    def has_credentials(cls) -> bool:
        return bool(
            os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        )


def _api_message(raw: str) -> str:
    """Zieht den lesbaren Teil aus Googles verschachtelter Fehlermeldung."""
    import json
    import re

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            payload = json.loads(match.group(0))
            message = payload.get("error", {}).get("message")
            if message:
                return message
        except (json.JSONDecodeError, AttributeError):
            pass
    return raw.strip()
