"""Bilder einlesen, für die Vision-API aufbereiten und kodieren."""

from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

# Claude Opus 5 verarbeitet Bilder bis 2576px an der langen Kante nativ.
# Größere Bilder werden serverseitig skaliert — wir sparen Upload und Tokens,
# indem wir vorher runterrechnen.
MAX_EDGE_PX = 2576
DEFAULT_MAX_IMAGES = 12
JPEG_QUALITY = 85

SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}


@dataclass(frozen=True)
class PreparedImage:
    """Ein für die API vorbereitetes Bild."""

    source_path: Path
    media_type: str
    data_b64: str
    width: int
    height: int

    @property
    def size_kb(self) -> float:
        # base64 bläht um Faktor 4/3 auf.
        return len(self.data_b64) * 3 / 4 / 1024

    def to_content_block(self) -> dict:
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": self.media_type,
                "data": self.data_b64,
            },
        }


class NoImagesFound(Exception):
    """Im angegebenen Pfad wurde kein verwertbares Bild gefunden."""


def collect_image_paths(
    inputs: list[Path], max_images: int = DEFAULT_MAX_IMAGES
) -> list[Path]:
    """Sammelt Bilddateien aus Dateien und/oder Verzeichnissen.

    Verzeichnisse werden nicht rekursiv durchsucht — ein Ordner pro Anzeige ist
    das erwartete Ablagemuster, und rekursives Einsammeln würde bei einer
    verschachtelten Fotomediathek versehentlich fremde Artikel mit aufnehmen.
    """
    found: list[Path] = []
    for item in inputs:
        if item.is_dir():
            found.extend(
                sorted(
                    p
                    for p in item.iterdir()
                    if p.is_file() and p.suffix.lower() in SUPPORTED_SUFFIXES
                )
            )
        elif item.is_file():
            if item.suffix.lower() not in SUPPORTED_SUFFIXES:
                raise NoImagesFound(f"Nicht unterstütztes Bildformat: {item}")
            found.append(item)
        else:
            raise NoImagesFound(f"Pfad existiert nicht: {item}")

    # Duplikate entfernen, Reihenfolge erhalten.
    seen: set[Path] = set()
    unique: list[Path] = []
    for path in found:
        resolved = path.resolve()
        if resolved not in seen:
            seen.add(resolved)
            unique.append(path)

    if not unique:
        raise NoImagesFound(
            "Keine Bilder gefunden. Unterstützt: "
            + ", ".join(sorted(SUPPORTED_SUFFIXES))
        )
    return unique[:max_images]


def prepare_image(path: Path, max_edge: int = MAX_EDGE_PX) -> PreparedImage:
    """Lädt ein Bild, dreht es nach EXIF, skaliert und kodiert es als JPEG.

    Die Neukodierung entfernt nebenbei die EXIF-Daten — inklusive
    GPS-Koordinaten, die sonst mit dem Foto die eigene Wohnadresse verraten.
    """
    with Image.open(path) as img:
        # EXIF-Orientierung anwenden, sonst liegen Handyfotos quer.
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")

        long_edge = max(img.size)
        if long_edge > max_edge:
            scale = max_edge / long_edge
            new_size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
            img = img.resize(new_size, Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        width, height = img.size

    return PreparedImage(
        source_path=path,
        media_type="image/jpeg",
        data_b64=base64.standard_b64encode(buffer.getvalue()).decode("ascii"),
        width=width,
        height=height,
    )


def prepare_images(
    inputs: list[Path], max_images: int = DEFAULT_MAX_IMAGES
) -> list[PreparedImage]:
    """Sammelt und bereitet alle Bilder auf."""
    return [prepare_image(p) for p in collect_image_paths(inputs, max_images)]
