"""Füllt das Kleinanzeigen-Formular im Browser vor.

Bewusste Designentscheidung: dieses Modul **veröffentlicht nichts**. Es öffnet
einen sichtbaren Browser, trägt die generierten Felder ein und übergibt danach
an die verkaufende Person. Gründe:

* Die Nutzungsbedingungen von kleinanzeigen.de untersagen automatisiertes
  Einstellen von Anzeigen; ein Bot-artiger Ablauf riskiert die Sperrung des
  Kontos.
* Ein KI-Entwurf gehört vor der Veröffentlichung gegengelesen — Preis, Zustand
  und Mängelangaben sind rechtlich relevante Aussagen.

Die Selektoren sind bewusst als Liste von Kandidaten hinterlegt und per
JSON-Datei überschreibbar, weil sich das Markup der Seite ändern kann, ohne
dass dieses Paket aktualisiert wird.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from kleinanzeigen_tool.models import ListingDraft

POST_AD_URL = "https://www.kleinanzeigen.de/p-anzeige-aufgeben.html"

DEFAULT_SELECTORS: dict[str, list[str]] = {
    "title": ["#postad-title", "input[name='title']", "#pstad-title"],
    "description": ["#pstad-descrptn", "textarea[name='description']"],
    "price": ["#pstad-price", "input[name='price']"],
    "price_type_fixed": ["#priceType-FIXED", "input[value='FIXED']"],
    "price_type_negotiable": ["#priceType-NEGOTIABLE", "input[value='NEGOTIABLE']"],
    "price_type_giveaway": ["#priceType-GIVE_AWAY", "input[value='GIVE_AWAY']"],
    "image_upload": ["input[type='file']"],
}


class BrowserUnavailable(Exception):
    """Playwright ist nicht installiert oder kein Browser vorhanden."""


@dataclass
class FillReport:
    """Was tatsächlich eingetragen werden konnte."""

    filled: list[str]
    skipped: list[str]

    def summary(self) -> str:
        parts = []
        if self.filled:
            parts.append("Eingetragen: " + ", ".join(self.filled))
        if self.skipped:
            parts.append("Nicht gefunden: " + ", ".join(self.skipped))
        return " | ".join(parts) if parts else "Nichts eingetragen."


def load_selectors(path: Path | None) -> dict[str, list[str]]:
    """Lädt eigene Selektoren und ergänzt sie um die Standardwerte."""
    selectors = {key: list(value) for key, value in DEFAULT_SELECTORS.items()}
    if path is None:
        return selectors
    override = json.loads(path.read_text(encoding="utf-8"))
    for key, value in override.items():
        candidates = [value] if isinstance(value, str) else list(value)
        # Eigene Selektoren zuerst, Standardwerte als Rückfallebene.
        selectors[key] = candidates + selectors.get(key, [])
    return selectors


def _first_visible(page, candidates: list[str], timeout_ms: int = 4000):
    """Gibt das erste sichtbare Element aus der Kandidatenliste zurück."""
    for selector in candidates:
        locator = page.locator(selector).first
        try:
            locator.wait_for(state="visible", timeout=timeout_ms)
            return locator
        except Exception:
            continue
    return None


def fill_listing(
    listing: ListingDraft,
    image_paths: list[Path] | None = None,
    *,
    profile_dir: Path | None = None,
    selectors_file: Path | None = None,
    url: str = POST_AD_URL,
    timeout_ms: int = 4000,
) -> FillReport:
    """Öffnet das Anzeigenformular und trägt den Entwurf ein.

    Der finale Klick auf "Anzeige aufgeben" bleibt bewusst beim Menschen.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:  # pragma: no cover - hängt von der Installation ab
        raise BrowserUnavailable(
            "Playwright fehlt. Installation:\n"
            "  pip install 'kleinanzeigen-tool[browser]'\n"
            "  playwright install chromium"
        ) from exc

    selectors = load_selectors(selectors_file)
    profile = profile_dir or (Path.home() / ".kleinanzeigen-tool" / "browser-profile")
    profile.mkdir(parents=True, exist_ok=True)

    filled: list[str] = []
    skipped: list[str] = []

    with sync_playwright() as playwright:
        # Persistenter Kontext: die Anmeldung überlebt so den nächsten Aufruf,
        # und es werden keine Zugangsdaten von diesem Tool verarbeitet.
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=str(profile),
            headless=False,
            viewport={"width": 1400, "height": 1000},
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(url, wait_until="domcontentloaded")

        print(
            "\nBrowser ist offen.\n"
            "  1. Melde dich an (falls nötig) und wähle die passende Kategorie:\n"
            f"     Vorschlag: {' → '.join(listing.category_path)}\n"
            "  2. Wenn das Anzeigenformular sichtbar ist, hier Enter drücken —\n"
            "     dann werden Titel, Beschreibung und Preis eingetragen.\n"
        )
        input("Enter zum Ausfüllen ... ")

        def fill_text(key: str, value: str, label: str) -> None:
            if not value:
                return
            element = _first_visible(page, selectors[key], timeout_ms)
            if element is None:
                skipped.append(label)
                return
            element.fill(value)
            filled.append(label)

        fill_text("title", listing.title, "Titel")
        fill_text("description", listing.description, "Beschreibung")

        if listing.price_type == "Zu verschenken":
            radio = _first_visible(page, selectors["price_type_giveaway"], timeout_ms)
            if radio is not None:
                radio.check()
                filled.append("Preistyp (Zu verschenken)")
            else:
                skipped.append("Preistyp")
        else:
            fill_text("price", str(listing.price.recommended_eur), "Preis")
            key = (
                "price_type_negotiable"
                if listing.price_type == "VB"
                else "price_type_fixed"
            )
            radio = _first_visible(page, selectors[key], timeout_ms)
            if radio is not None:
                radio.check()
                filled.append(f"Preistyp ({listing.price_type})")
            else:
                skipped.append("Preistyp")

        if image_paths:
            upload = page.locator(selectors["image_upload"][0]).first
            try:
                upload.set_input_files([str(p) for p in image_paths])
                filled.append(f"{len(image_paths)} Bild(er)")
            except Exception:
                skipped.append("Bild-Upload")

        report = FillReport(filled=filled, skipped=skipped)
        print("\n" + report.summary())
        print(
            "\nJetzt bitte selbst prüfen: Kategorie, Zustand, Standort, Versand.\n"
            "Das Tool veröffentlicht nichts — der Klick auf 'Anzeige aufgeben'\n"
            "liegt bei dir.\n"
        )
        input("Enter zum Schließen des Browsers ... ")
        context.close()

    return report
