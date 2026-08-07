import json

from kleinanzeigen_tool import export


def test_json_enthaelt_listing_und_metadaten(result, tmp_path):
    payload = json.loads(export.to_json(result, [tmp_path / "a.jpg"]))
    assert payload["listing"]["title"].startswith("Bosch")
    assert payload["images"] == [str(tmp_path / "a.jpg")]
    assert payload["usage"]["input_tokens"] == 1234
    assert payload["warnings"] == ["Preisspanne prüfen."]


def test_json_roundtrip(result, tmp_path):
    path = tmp_path / "anzeige.json"
    path.write_text(export.to_json(result), encoding="utf-8")
    assert export.load_json(path) == result.listing


def test_load_json_akzeptiert_blankes_listing(result, tmp_path):
    path = tmp_path / "roh.json"
    path.write_text(
        json.dumps(result.listing.model_dump(), ensure_ascii=False), encoding="utf-8"
    )
    assert export.load_json(path).title == result.listing.title


def test_markdown_enthaelt_alle_abschnitte(result):
    md = export.to_markdown(result)
    assert md.startswith("# Bosch")
    for heading in ("## Beschreibung", "## Details", "## Preiseinschätzung",
                    "## Suchbegriffe", "## Offene Fragen", "## Hinweise"):
        assert heading in md
    assert "55 € VB" in md


def test_markdown_ohne_optionale_felder(result):
    result.listing.tags = []
    result.listing.attributes = []
    result.listing.open_questions = []
    result.listing.condition_notes = ""
    result.warnings = []
    md = export.to_markdown(result)
    assert "## Suchbegriffe" not in md
    assert "## Details" not in md
    assert "## Beschreibung" in md


def test_terminal_ohne_farbe_hat_keine_ansi_codes(result):
    assert "\033[" not in export.to_terminal(result, color=False)


def test_terminal_mit_farbe_hat_ansi_codes(result):
    assert "\033[" in export.to_terminal(result, color=True)
