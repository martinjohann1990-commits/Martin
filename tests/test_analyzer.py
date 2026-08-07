import pytest

from kleinanzeigen_tool import analyzer
from kleinanzeigen_tool.analyzer import AnalysisFailed, ListingRequest, build_user_content
from kleinanzeigen_tool.images import PreparedImage
from pathlib import Path


def fake_image(name="a.jpg") -> PreparedImage:
    return PreparedImage(
        source_path=Path(name),
        media_type="image/jpeg",
        data_b64="AAAA",
        width=100,
        height=100,
    )


def test_user_content_wechselt_label_und_bild():
    content = build_user_content(ListingRequest(images=[fake_image(), fake_image("b.jpg")]))
    assert content[0]["type"] == "text" and "Bild 1" in content[0]["text"]
    assert content[1]["type"] == "image"
    assert content[2]["type"] == "text" and "Bild 2" in content[2]["text"]
    assert content[3]["type"] == "image"
    assert content[-1]["type"] == "text"


def test_user_content_uebernimmt_alle_hinweise():
    request = ListingRequest(
        images=[fake_image()],
        notes="Nur zweimal benutzt",
        price_hint=90,
        location="10115 Berlin",
        condition_hint="Sehr Gut",
        price_research="Gebraucht 70-110 Euro",
        extra_instructions="Bitte kurz halten",
    )
    text = build_user_content(request)[-1]["text"]
    assert "Nur zweimal benutzt" in text
    assert "90 €" in text
    assert "10115 Berlin" in text
    assert "Sehr Gut" in text
    assert "Gebraucht 70-110 Euro" in text
    assert "Bitte kurz halten" in text


def test_user_content_ohne_hinweise_bleibt_schlank():
    text = build_user_content(ListingRequest(images=[fake_image()]))[-1]["text"]
    assert "Zusatzinformationen" not in text
    assert "Preisvorstellung" not in text


def test_analyze_ohne_bilder_schlaegt_fehl():
    with pytest.raises(AnalysisFailed, match="Keine Bilder"):
        analyzer.analyze(client=None, request=ListingRequest(images=[]))


def test_warnungen_bei_niedriger_sicherheit(listing):
    listing.confidence = "niedrig"
    warnings = analyzer._collect_warnings(listing)
    assert any("unsicher" in w for w in warnings)


def test_warnung_bei_fehlender_marke(listing):
    listing.brand = ""
    assert any("Marke" in w for w in analyzer._collect_warnings(listing))


def test_warnung_bei_sehr_breiter_preisspanne(listing):
    listing.price.range_low_eur = 20
    listing.price.range_high_eur = 200
    assert any("Preisspanne" in w for w in analyzer._collect_warnings(listing))


def test_keine_warnungen_bei_sauberem_ergebnis(listing):
    assert analyzer._collect_warnings(listing) == []
