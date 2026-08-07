"""Tests des .env-Ladens."""

import pytest

from kleinanzeigen_tool.config import ALLOWED, load_local_env, parse_env


def test_liest_einfache_zuweisung():
    assert parse_env("GEMINI_API_KEY=abc123")["GEMINI_API_KEY"] == "abc123"


def test_ignoriert_kommentare_und_leerzeilen():
    text = "# Kommentar\n\nGEMINI_API_KEY=abc\n   \n"
    assert parse_env(text) == {"GEMINI_API_KEY": "abc"}


def test_entfernt_anfuehrungszeichen_und_export():
    text = 'export GEMINI_API_KEY="abc"\nANTHROPIC_API_KEY=\'xyz\''
    werte = parse_env(text)
    assert werte["GEMINI_API_KEY"] == "abc"
    assert werte["ANTHROPIC_API_KEY"] == "xyz"


def test_ignoriert_fremde_variablen():
    # Eine .env kann alles Moegliche enthalten; PATH zu ueberschreiben waere fatal.
    werte = parse_env("PATH=/boese\nHOME=/weg\nGEMINI_API_KEY=ok")
    assert set(werte) == {"GEMINI_API_KEY"}
    assert all(k in ALLOWED for k in werte)


def test_ignoriert_leere_werte():
    assert parse_env("GEMINI_API_KEY=") == {}


def test_load_setzt_fehlende_variable(tmp_path, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    datei = tmp_path / ".env"
    datei.write_text("GEMINI_API_KEY=aus-datei", encoding="utf-8")
    assert load_local_env([datei]) == [datei]
    import os
    assert os.environ["GEMINI_API_KEY"] == "aus-datei"


def test_gesetzte_variable_gewinnt_gegen_datei(tmp_path, monkeypatch):
    # Ein bewusst im Terminal gesetzter Schluessel darf nicht ueberschrieben werden.
    monkeypatch.setenv("GEMINI_API_KEY", "aus-terminal")
    datei = tmp_path / ".env"
    datei.write_text("GEMINI_API_KEY=aus-datei", encoding="utf-8")
    assert load_local_env([datei]) == []
    import os
    assert os.environ["GEMINI_API_KEY"] == "aus-terminal"


def test_fehlende_datei_ist_kein_fehler(tmp_path):
    assert load_local_env([tmp_path / "gibtsnicht"]) == []


def test_unlesbare_datei_ist_kein_fehler(tmp_path):
    d = tmp_path / "verzeichnis.env"
    d.mkdir()
    assert load_local_env([d]) == []
