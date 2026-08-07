import base64
import io

import pytest
from PIL import Image

from kleinanzeigen_tool.images import (
    MAX_EDGE_PX,
    NoImagesFound,
    collect_image_paths,
    prepare_image,
    prepare_images,
)


def make_image(path, size=(800, 600), color=(120, 30, 30)):
    Image.new("RGB", size, color).save(path)
    return path


def test_collect_aus_verzeichnis_sortiert(tmp_path):
    make_image(tmp_path / "b.jpg")
    make_image(tmp_path / "a.jpg")
    (tmp_path / "notizen.txt").write_text("kein Bild")

    paths = collect_image_paths([tmp_path])
    assert [p.name for p in paths] == ["a.jpg", "b.jpg"]


def test_collect_respektiert_max_images(tmp_path):
    for i in range(5):
        make_image(tmp_path / f"{i}.jpg")
    assert len(collect_image_paths([tmp_path], max_images=3)) == 3


def test_collect_entfernt_duplikate(tmp_path):
    path = make_image(tmp_path / "a.jpg")
    assert len(collect_image_paths([path, path, tmp_path])) == 1


def test_collect_ohne_bilder_meldet_fehler(tmp_path):
    with pytest.raises(NoImagesFound):
        collect_image_paths([tmp_path])


def test_collect_meldet_fehlenden_pfad(tmp_path):
    with pytest.raises(NoImagesFound, match="existiert nicht"):
        collect_image_paths([tmp_path / "gibtsnicht"])


def test_collect_meldet_falsches_format(tmp_path):
    doc = tmp_path / "handbuch.pdf"
    doc.write_text("kein Bild")
    with pytest.raises(NoImagesFound, match="Nicht unterstütztes"):
        collect_image_paths([doc])


def test_prepare_skaliert_grosse_bilder_herunter(tmp_path):
    path = make_image(tmp_path / "gross.jpg", size=(6000, 3000))
    prepared = prepare_image(path)
    assert max(prepared.width, prepared.height) == MAX_EDGE_PX
    assert prepared.width == MAX_EDGE_PX
    assert prepared.height == MAX_EDGE_PX // 2


def test_prepare_laesst_kleine_bilder_unveraendert(tmp_path):
    path = make_image(tmp_path / "klein.jpg", size=(400, 300))
    prepared = prepare_image(path)
    assert (prepared.width, prepared.height) == (400, 300)


def test_prepare_liefert_dekodierbares_jpeg(tmp_path):
    path = make_image(tmp_path / "a.png", size=(200, 100))
    prepared = prepare_image(path)
    assert prepared.media_type == "image/jpeg"
    raw = base64.standard_b64decode(prepared.data_b64)
    assert raw[:2] == b"\xff\xd8"  # JPEG-Magic
    assert prepared.size_kb > 0


def test_content_block_hat_api_format(tmp_path):
    prepared = prepare_image(make_image(tmp_path / "a.jpg"))
    block = prepared.to_content_block()
    assert block["type"] == "image"
    assert block["source"]["type"] == "base64"
    assert block["source"]["media_type"] == "image/jpeg"


def test_prepare_images_verarbeitet_ordner(tmp_path):
    make_image(tmp_path / "a.jpg")
    make_image(tmp_path / "b.jpg")
    assert len(prepare_images([tmp_path])) == 2


def test_bildgroessen_stufen_sind_absteigend():
    from kleinanzeigen_tool.images import IMAGE_SIZE_PRESETS

    werte = list(IMAGE_SIZE_PRESETS.values())
    assert werte == sorted(werte, reverse=True)


def test_resolve_max_edge_kennt_stufen():
    from kleinanzeigen_tool.images import resolve_max_edge

    assert resolve_max_edge("klein") == 1024
    assert resolve_max_edge("hoch") == MAX_EDGE_PX


def test_resolve_max_edge_deckelt_pixelangaben():
    from kleinanzeigen_tool.images import resolve_max_edge

    assert resolve_max_edge(99999) == MAX_EDGE_PX
    assert resolve_max_edge(10) == 256
    assert resolve_max_edge(1200) == 1200


def test_resolve_max_edge_meldet_unbekannte_stufe():
    from kleinanzeigen_tool.images import resolve_max_edge

    with pytest.raises(ValueError, match="Unbekannte Bildgröße"):
        resolve_max_edge("riesig")


def test_kleinere_stufe_erzeugt_kleinere_dateien(tmp_path):
    path = make_image(tmp_path / "gross.jpg", size=(3000, 2000))
    gross = prepare_images([path], size="hoch")[0]
    klein = prepare_images([path], size="klein")[0]
    assert klein.width < gross.width
    assert klein.size_kb < gross.size_kb


def _foto_mit_gps(path, size=(1200, 800), orientation=6):
    """Simuliert ein Handyfoto: GPS-Koordinaten, Kameramodell, Drehung."""
    from PIL.TiffImagePlugin import IFDRational

    img = Image.new("RGB", size, (90, 120, 60))
    exif = img.getexif()
    exif[0x0112] = orientation
    exif[0x010F] = "TestPhone"
    exif[0x0110] = "TestPhone 15 Pro"
    gps = exif.get_ifd(0x8825)
    gps[1] = "N"
    gps[2] = (IFDRational(52), IFDRational(30), IFDRational(58))
    gps[3] = "E"
    gps[4] = (IFDRational(13), IFDRational(22), IFDRational(39))
    img.save(path, exif=exif, quality=90)
    return path


def _exif_von(prepared):
    roh = base64.standard_b64decode(prepared.data_b64)
    return Image.open(io.BytesIO(roh)).getexif()


def test_gps_koordinaten_werden_entfernt(tmp_path):
    """Datenschutz-Zusage: das hochgeladene Bild darf die Wohnadresse
    nicht mehr enthalten. Bricht still, wenn jemand EXIF wieder mitspeichert."""
    path = _foto_mit_gps(tmp_path / "handyfoto.jpg")
    assert dict(Image.open(path).getexif().get_ifd(0x8825)), "Testaufbau kaputt"

    exif = _exif_von(prepare_image(path))
    assert not dict(exif.get_ifd(0x8825))


def test_kameramodell_wird_entfernt(tmp_path):
    exif = _exif_von(prepare_image(_foto_mit_gps(tmp_path / "a.jpg")))
    assert exif.get(0x010F) is None
    assert exif.get(0x0110) is None


def test_exif_drehung_wird_angewandt(tmp_path):
    # Orientation 6 = 90 Grad gedreht: Quer- wird zu Hochformat.
    prepared = prepare_image(_foto_mit_gps(tmp_path / "quer.jpg", size=(1200, 800)))
    assert (prepared.width, prepared.height) == (800, 1200)
    assert _exif_von(prepared).get(0x0112) is None
