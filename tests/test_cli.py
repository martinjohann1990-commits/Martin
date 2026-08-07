import json

import pytest

from kleinanzeigen_tool import browser
from kleinanzeigen_tool.cli import build_parser, main


def test_parser_create_defaults():
    args = build_parser().parse_args(["create", "fotos"])
    assert args.command == "create"
    assert args.max_images == 12
    assert args.research is False
    assert args.fill is False


def test_parser_create_optionen():
    args = build_parser().parse_args(
        ["create", "a.jpg", "--price", "80", "--research", "--condition", "Gut"]
    )
    assert args.price == 80
    assert args.research is True
    assert args.condition == "Gut"


def test_parser_lehnt_unbekannten_zustand_ab():
    with pytest.raises(SystemExit):
        build_parser().parse_args(["create", "a.jpg", "--condition", "Schrott"])


def test_parser_fill():
    args = build_parser().parse_args(["fill", "anzeige.json", "--images", "fotos"])
    assert args.command == "fill"
    assert args.listing.name == "anzeige.json"


def test_main_ohne_kommando_beendet_mit_fehler():
    with pytest.raises(SystemExit):
        main([])


def test_fill_meldet_fehlende_datei(tmp_path, capsys):
    code = main(["fill", str(tmp_path / "weg.json")])
    assert code == 2
    assert "nicht gefunden" in capsys.readouterr().err


def test_create_meldet_leeren_ordner(tmp_path, capsys):
    code = main(["create", str(tmp_path)])
    assert code == 2
    assert "Keine Bilder gefunden" in capsys.readouterr().err


def test_selectors_override_haelt_standard_als_rueckfall(tmp_path):
    path = tmp_path / "sel.json"
    path.write_text(json.dumps({"title": "#neuer-titel"}), encoding="utf-8")
    selectors = browser.load_selectors(path)
    assert selectors["title"][0] == "#neuer-titel"
    assert "#postad-title" in selectors["title"]
    assert selectors["price"] == browser.DEFAULT_SELECTORS["price"]


def test_selectors_ohne_datei_sind_die_standardwerte():
    assert browser.load_selectors(None) == browser.DEFAULT_SELECTORS


def test_fill_report_summary():
    report = browser.FillReport(filled=["Titel"], skipped=["Preis"])
    assert "Eingetragen: Titel" in report.summary()
    assert "Nicht gefunden: Preis" in report.summary()
    assert browser.FillReport([], []).summary() == "Nichts eingetragen."
