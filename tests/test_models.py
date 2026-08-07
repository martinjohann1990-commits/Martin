from kleinanzeigen_tool.models import (
    DESCRIPTION_MAX_CHARS,
    MAX_TAGS,
    TITLE_MAX_CHARS,
    _truncate,
)


def test_normalize_kuerzt_zu_langen_titel(listing):
    listing.title = "Bosch " + "Sehr langer Zusatztext " * 10
    normalized = listing.normalize()
    assert len(normalized.title) <= TITLE_MAX_CHARS


def test_normalize_kuerzt_beschreibung(listing):
    listing.description = "x" * (DESCRIPTION_MAX_CHARS + 500)
    assert len(listing.normalize().description) <= DESCRIPTION_MAX_CHARS


def test_normalize_begrenzt_und_saeubert_tags(listing):
    listing.tags = ["#bosch", " akku ", ""] + [f"tag{i}" for i in range(20)]
    tags = listing.normalize().tags
    assert len(tags) == MAX_TAGS
    assert tags[0] == "bosch"
    assert tags[1] == "akku"
    assert "" not in tags


def test_normalize_setzt_verschenkpreis_auf_null(listing):
    listing.price_type = "Zu verschenken"
    listing.price.recommended_eur = 40
    assert listing.normalize().price.recommended_eur == 0


def test_normalize_verhindert_negative_preise(listing):
    listing.price.range_low_eur = -10
    assert listing.normalize().price.range_low_eur == 0


def test_price_label(listing):
    assert listing.price_label() == "55 € VB"
    listing.price_type = "Festpreis"
    assert listing.price_label() == "55 € Festpreis"
    listing.price_type = "Zu verschenken"
    assert listing.price_label() == "Zu verschenken"


def test_truncate_schneidet_an_wortgrenze():
    assert _truncate("Bosch Akkuschrauber blau", 20) == "Bosch Akkuschrauber"


def test_truncate_schneidet_hart_wenn_wortgrenze_zu_frueh_liegt():
    # Eine Wortgrenze am Anfang würde fast den ganzen Titel wegwerfen —
    # dann ist harter Schnitt das kleinere Übel.
    assert _truncate("Bosch Akkuschrauber blau", 15) == "Bosch Akkuschra"


def test_truncate_laesst_kurzen_text_unveraendert():
    assert _truncate("kurz", 50) == "kurz"
