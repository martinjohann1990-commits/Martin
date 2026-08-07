import pytest

from kleinanzeigen_tool.analyzer import AnalysisResult
from kleinanzeigen_tool.models import Attribute, ListingDraft, PriceEstimate


@pytest.fixture
def listing() -> ListingDraft:
    return ListingDraft(
        title="Bosch PSR 18 LI Akkuschrauber mit 2 Akkus",
        category_path=["Heimwerken", "Werkzeug", "Handwerkzeug"],
        item_type="Akkuschrauber",
        brand="Bosch",
        model_name="PSR 18 LI",
        condition="Gut",
        condition_notes="Leichte Kratzer am Gehäuse.",
        description="Gut erhaltener Akkuschrauber.\n\n- 18 Volt\n- 2 Akkus",
        attributes=[Attribute(name="Marke", value="Bosch")],
        price=PriceEstimate(
            recommended_eur=55,
            range_low_eur=45,
            range_high_eur=70,
            reasoning="Vergleichbare Geräte liegen bei 45 bis 70 Euro.",
        ),
        price_type="VB",
        shipping="Versand und Abholung",
        tags=["akkuschrauber", "bosch"],
        open_questions=["Ist das Ladegerät dabei?"],
        confidence="hoch",
    )


@pytest.fixture
def result(listing) -> AnalysisResult:
    return AnalysisResult(
        listing=listing,
        input_tokens=1234,
        output_tokens=567,
        warnings=["Preisspanne prüfen."],
    )
