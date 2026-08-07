"""Zugangsdaten aus einer lokalen Datei laden.

Ohne das müsste der API-Schlüssel bei jedem Terminalstart neu exportiert
werden — und wer ihn stattdessen fest in die Shell-Konfiguration schreibt,
hat ihn irgendwann in einem Screenshot oder einem Backup.
"""

from __future__ import annotations

import os
from pathlib import Path

#: Reihenfolge der gesuchten Dateien. Die Projektdatei gewinnt, damit man
#: pro Projekt einen anderen Schlüssel nutzen kann.
CANDIDATES = (
    Path.cwd() / ".env",
    Path.home() / ".kleinanzeigen-tool" / ".env",
)

#: Nur diese Schlüssel werden übernommen. Eine .env-Datei kann alles
#: Mögliche enthalten; wir wollen nicht versehentlich PATH überschreiben.
ALLOWED = (
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "ANTHROPIC_CONFIG_DIR",
)


def parse_env(text: str) -> dict[str, str]:
    """Liest ein einfaches KEY=VALUE-Format.

    Bewusst minimal: keine Variablen-Expansion, keine mehrzeiligen Werte.
    Ein API-Schlüssel ist eine Zeile, und je weniger diese Datei kann,
    desto weniger kann sie kaputtgehen.
    """
    werte: dict[str, str] = {}
    for zeile in text.splitlines():
        zeile = zeile.strip()
        if not zeile or zeile.startswith("#") or "=" not in zeile:
            continue
        name, _, wert = zeile.partition("=")
        name = name.strip().removeprefix("export ").strip()
        wert = wert.strip()
        # Umschließende Anführungszeichen entfernen — die kopiert man leicht mit.
        if len(wert) >= 2 and wert[0] == wert[-1] and wert[0] in "\"'":
            wert = wert[1:-1]
        if name in ALLOWED and wert:
            werte[name] = wert
    return werte


def load_local_env(paths=None) -> list[Path]:
    """Setzt fehlende Umgebungsvariablen aus den gefundenen Dateien.

    Bereits gesetzte Variablen bleiben unangetastet: ein bewusst im Terminal
    gesetzter Schlüssel soll die Datei überstimmen, nicht umgekehrt.
    Gibt die Dateien zurück, aus denen etwas übernommen wurde.
    """
    benutzt: list[Path] = []
    for path in paths if paths is not None else CANDIDATES:
        try:
            if not path.is_file():
                continue
            werte = parse_env(path.read_text(encoding="utf-8"))
        except OSError:
            continue
        neu = {k: v for k, v in werte.items() if not os.environ.get(k)}
        if neu:
            os.environ.update(neu)
            benutzt.append(path)
    return benutzt
