from pathlib import Path

import pytest

from kleinanzeigen_tool import analyzer
from kleinanzeigen_tool.analyzer import (
    AnalysisFailed,
    ListingRequest,
    build_instruction_text,
)
from kleinanzeigen_tool.images import PreparedImage
from kleinanzeigen_tool.providers.base import Provider, ProviderError, ProviderResult


def fake_image(name="a.jpg") -> PreparedImage:
    return PreparedImage(
        source_path=Path(name),
        media_type="image/jpeg",
        data_b64="AAAA",
        width=100,
        height=100,
    )


class StubProvider(Provider):
    """Anbieter-Attrappe — hält die Tests frei von Netzwerkaufrufen."""

    name = "stub"
    default_model = "stub-1"
    api_key_env = "STUB_KEY"

    def __init__(self, listing=None, error=None):
        super().__init__()
        self._listing = listing
        self._error = error

    def analyze(self, request):
        if self._error:
            raise self._error
        return ProviderResult(listing=self._listing, input_tokens=10, output_tokens=20)

    def research(self, request):
        if self._error:
            raise self._error
        return "Gebraucht 40-60 Euro"

    def list_models(self):
        return ["stub-1"]


def test_instruction_uebernimmt_alle_hinweise():
    text = build_instruction_text(
        ListingRequest(
            images=[fake_image()],
            notes="Nur zweimal benutzt",
            price_hint=90,
            location="10115 Berlin",
            condition_hint="Sehr Gut",
            price_research="Gebraucht 70-110 Euro",
            extra_instructions="Bitte kurz halten",
        )
    )
    assert "Nur zweimal benutzt" in text
    assert "90 €" in text
    assert "10115 Berlin" in text
    assert "Sehr Gut" in text
    assert "Gebraucht 70-110 Euro" in text
    assert "Bitte kurz halten" in text


def test_instruction_ohne_hinweise_bleibt_schlank():
    text = build_instruction_text(ListingRequest(images=[fake_image()]))
    assert "Zusatzinformationen" not in text
    assert "Preisvorstellung" not in text
    assert "1 Foto(s)" in text


def test_analyze_ohne_bilder_schlaegt_fehl():
    with pytest.raises(AnalysisFailed, match="Keine Bilder"):
        analyzer.analyze(StubProvider(), ListingRequest(images=[]))


def test_analyze_reicht_ergebnis_und_metadaten_durch(listing):
    result = analyzer.analyze(
        StubProvider(listing=listing), ListingRequest(images=[fake_image()])
    )
    assert result.listing.title == listing.title
    assert (result.input_tokens, result.output_tokens) == (10, 20)
    assert result.provider == "stub"
    assert result.model == "stub-1"


def test_analyze_normalisiert_das_ergebnis(listing):
    listing.title = "Sehr langer Titel " * 10
    result = analyzer.analyze(
        StubProvider(listing=listing), ListingRequest(images=[fake_image()])
    )
    assert len(result.listing.title) <= 65


def test_analyze_uebersetzt_provider_fehler(listing):
    provider = StubProvider(error=ProviderError("Kontingent erschöpft"))
    with pytest.raises(AnalysisFailed, match="Kontingent erschöpft"):
        analyzer.analyze(provider, ListingRequest(images=[fake_image()]))


def test_research_uebersetzt_provider_fehler():
    provider = StubProvider(error=ProviderError("Suche fehlgeschlagen"))
    with pytest.raises(AnalysisFailed, match="Suche fehlgeschlagen"):
        analyzer.research_prices(provider, ListingRequest(images=[fake_image()]))


def test_research_liefert_freitext():
    text = analyzer.research_prices(StubProvider(), ListingRequest(images=[fake_image()]))
    assert "40-60" in text


def test_warnungen_bei_niedriger_sicherheit(listing):
    listing.confidence = "niedrig"
    assert any("unsicher" in w for w in analyzer._collect_warnings(listing))


def test_warnung_bei_fehlender_marke(listing):
    listing.brand = ""
    assert any("Marke" in w for w in analyzer._collect_warnings(listing))


def test_warnung_bei_sehr_breiter_preisspanne(listing):
    listing.price.range_low_eur = 20
    listing.price.range_high_eur = 200
    assert any("Preisspanne" in w for w in analyzer._collect_warnings(listing))


def test_keine_warnungen_bei_sauberem_ergebnis(listing):
    assert analyzer._collect_warnings(listing) == []


# --- Erfundenes Zubehoer -----------------------------------------------
# Regressionstests aus einem echten Lauf: bei Apple-Watch-Fotos ohne
# sichtbares Ladekabel schrieb das Modell zweimal "Ladekabel" in die
# Beschreibung, einmal sogar mit "laut Fotos" davor.


def test_zubehoer_in_beschreibung_ohne_lieferumfang_wird_gemeldet(listing):
    listing.description = "Verkaufe die Uhr inklusive Ladekabel und OVP."
    listing.included_items = ["Uhr", "Armband"]
    warnungen = analyzer._collect_warnings(listing)
    assert any("Ladekabel" in w for w in warnungen)


def test_zubehoer_im_lieferumfang_wird_nicht_gemeldet(listing):
    listing.description = "Verkaufe die Uhr inklusive Ladekabel und OVP."
    listing.included_items = ["Uhr", "Ladekabel"]
    assert not any("Ladekabel" in w for w in analyzer._collect_warnings(listing))


def test_zubehoer_auch_in_attributen_erkannt(listing):
    from kleinanzeigen_tool.models import Attribute

    listing.description = "Gepflegtes Geraet."
    listing.attributes = [Attribute(name="Lieferumfang", value="Geraet, Netzteil")]
    listing.included_items = ["Geraet"]
    assert any("Netzteil" in w for w in analyzer._collect_warnings(listing))


def test_mehrere_erfundene_teile_in_einer_warnung(listing):
    listing.description = "Mit Ladekabel, Fernbedienung und Bedienungsanleitung."
    listing.included_items = ["Geraet"]
    warnungen = [w for w in analyzer._collect_warnings(listing) if "Zubehörteile" in w]
    assert len(warnungen) == 1
    assert all(t in warnungen[0] for t in ("Ladekabel", "Fernbedienung"))


# --- Formatierung ------------------------------------------------------


def test_lange_beschreibung_ohne_absaetze_wird_gemeldet(listing):
    listing.description = "Ein Satz ohne jeden Umbruch. " * 20
    assert any("Absätze" in w for w in analyzer._collect_warnings(listing))


def test_kurze_beschreibung_ohne_absaetze_ist_in_ordnung(listing):
    listing.description = "Kurzer Einzeiler."
    assert not any("Absätze" in w for w in analyzer._collect_warnings(listing))


def test_gegliederte_beschreibung_wird_nicht_gemeldet(listing):
    listing.description = "Einstieg.\n\n- Merkmal: Wert\n" + "Fuelltext. " * 40
    assert not any("Absätze" in w for w in analyzer._collect_warnings(listing))
