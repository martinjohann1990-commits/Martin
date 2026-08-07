"""Tests der Anbieter-Auswahl und der Nachrichtenaufbereitung.

Es wird kein Netzwerkaufruf gemacht — geprüft wird, dass beide Anbieter
dieselbe Aufgabe in ihr jeweiliges Format übersetzen und dass die Auswahl
anhand der Zugangsdaten funktioniert.
"""

from pathlib import Path

import pytest

from kleinanzeigen_tool.analyzer import ListingRequest
from kleinanzeigen_tool.images import PreparedImage
from kleinanzeigen_tool.providers import (
    ClaudeProvider,
    GeminiProvider,
    MissingCredentials,
    ProviderError,
    get_provider,
    resolve_provider_name,
)

ALL_KEYS = ("ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "ANTHROPIC_CONFIG_DIR")


@pytest.fixture
def clean_env(monkeypatch, tmp_path):
    for key in ALL_KEYS:
        monkeypatch.delenv(key, raising=False)
    # Verhindert, dass ein echtes ~/.config/anthropic-Profil die Tests beeinflusst.
    monkeypatch.setenv("ANTHROPIC_CONFIG_DIR", str(tmp_path / "leer"))
    return monkeypatch


@pytest.fixture
def request_obj():
    return ListingRequest(
        images=[
            PreparedImage(Path("a.jpg"), "image/jpeg", "AAAA", 100, 100),
            PreparedImage(Path("b.jpg"), "image/jpeg", "BBBB", 100, 100),
        ],
        notes="Zwei Jahre alt",
    )


# --- Auswahl -----------------------------------------------------------


def test_auto_waehlt_claude_wenn_beide_schluessel_da_sind(clean_env):
    clean_env.setenv("ANTHROPIC_API_KEY", "x")
    clean_env.setenv("GEMINI_API_KEY", "y")
    assert resolve_provider_name("auto") == "claude"


def test_auto_faellt_auf_gemini_zurueck(clean_env):
    clean_env.setenv("GEMINI_API_KEY", "y")
    assert resolve_provider_name("auto") == "gemini"


def test_auto_akzeptiert_google_api_key(clean_env):
    clean_env.setenv("GOOGLE_API_KEY", "y")
    assert resolve_provider_name("auto") == "gemini"


def test_auto_ohne_schluessel_erklaert_beide_wege(clean_env):
    with pytest.raises(MissingCredentials) as exc:
        resolve_provider_name("auto")
    assert "ANTHROPIC_API_KEY" in str(exc.value)
    assert "GEMINI_API_KEY" in str(exc.value)
    assert "aistudio.google.com" in str(exc.value)


def test_expliziter_anbieter_ignoriert_fehlende_schluessel(clean_env):
    # Der Fehler soll erst beim Aufruf kommen, nicht schon bei der Auswahl.
    assert get_provider("gemini").name == "gemini"


def test_unbekannter_anbieter(clean_env):
    with pytest.raises(ProviderError, match="Unbekannter Anbieter"):
        get_provider("chatgpt")


def test_modell_ueberschreibt_standard(clean_env):
    assert get_provider("gemini", "gemini-2.5-pro").model == "gemini-2.5-pro"
    assert get_provider("claude").model == ClaudeProvider.default_model


# --- Zugangsdaten-Erkennung -------------------------------------------


def test_claude_erkennt_ant_profil(clean_env, tmp_path):
    config = tmp_path / "anthropic"
    (config / "credentials").mkdir(parents=True)
    clean_env.setenv("ANTHROPIC_CONFIG_DIR", str(config))
    assert ClaudeProvider.has_credentials() is True


def test_gemini_ohne_schluessel(clean_env):
    assert GeminiProvider.has_credentials() is False


# --- Nachrichtenaufbereitung ------------------------------------------


def test_claude_content_wechselt_label_und_bild(request_obj):
    content = ClaudeProvider()._content(request_obj)
    assert content[0]["type"] == "text" and "Bild 1" in content[0]["text"]
    assert content[1]["type"] == "image"
    assert content[1]["source"]["type"] == "base64"
    assert content[2]["type"] == "text" and "Bild 2" in content[2]["text"]
    assert content[3]["type"] == "image"
    assert "Zwei Jahre alt" in content[-1]["text"]


def test_gemini_contents_enthalten_dieselben_bilder(request_obj, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-dummy")
    provider = GeminiProvider()
    provider._client()  # lädt das SDK und setzt provider._types
    contents = provider._contents(request_obj)

    assert len(contents) == 1
    parts = contents[0].parts
    assert contents[0].role == "user"
    assert "Bild 1" in parts[0].text
    assert parts[1].inline_data.mime_type == "image/jpeg"
    assert "Bild 2" in parts[2].text
    assert parts[3].inline_data is not None
    assert "Zwei Jahre alt" in parts[-1].text


def test_gemini_ohne_schluessel_nennt_die_registrierungsseite(clean_env):
    with pytest.raises(MissingCredentials) as exc:
        GeminiProvider()._client()
    assert "aistudio.google.com/apikey" in str(exc.value)


def test_gemini_uebersetzt_abbruchgruende():
    provider = GeminiProvider()

    class Candidate:
        finish_reason = type("R", (), {"name": "SAFETY"})()

    class Response:
        prompt_feedback = None
        candidates = [Candidate()]

    with pytest.raises(ProviderError, match="Sicherheitsfiltern blockiert"):
        provider._raise_on_block(Response())


def test_gemini_meldet_token_limit():
    provider = GeminiProvider()

    class Candidate:
        finish_reason = type("R", (), {"name": "MAX_TOKENS"})()

    class Response:
        prompt_feedback = None
        candidates = [Candidate()]

    with pytest.raises(ProviderError, match="abgeschnitten"):
        provider._raise_on_block(Response())


def test_gemini_laesst_normalen_abschluss_durch():
    provider = GeminiProvider()

    class Candidate:
        finish_reason = type("R", (), {"name": "STOP"})()

    class Response:
        prompt_feedback = None
        candidates = [Candidate()]

    provider._raise_on_block(Response())  # darf nicht werfen


def test_beide_anbieter_erzeugen_dieselbe_anweisung(request_obj, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-dummy")
    from kleinanzeigen_tool.analyzer import build_instruction_text

    expected = build_instruction_text(request_obj)
    claude_text = ClaudeProvider()._content(request_obj)[-1]["text"]

    gemini = GeminiProvider()
    gemini._client()
    gemini_text = gemini._contents(request_obj)[0].parts[-1].text

    assert claude_text == expected == gemini_text
