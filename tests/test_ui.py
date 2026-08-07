"""Tests der Web-Oberfläche.

Geprüft wird die Übersetzung vom Browser-JSON in einen ListingRequest sowie
das Fehlerverhalten — ohne Server und ohne Netzwerk. Ein echter
Server-Durchlauf steckt in `test_ui_server_end_to_end`.
"""

import base64
import io
import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import pytest
from PIL import Image

from kleinanzeigen_tool import ui
from kleinanzeigen_tool.ui import BadRequest, Handler, build_request


def bild_b64(size=(400, 300)) -> str:
    buf = io.BytesIO()
    Image.new("RGB", size, (120, 90, 60)).save(buf, format="JPEG")
    return base64.standard_b64encode(buf.getvalue()).decode("ascii")


def payload(**over) -> dict:
    basis = {"images": [{"name": "a.jpg", "data": bild_b64()}], "image_size": "klein"}
    basis.update(over)
    return basis


# --- Übersetzung Browser -> ListingRequest ------------------------------


def test_uebernimmt_alle_felder():
    request, provider, model = build_request(
        payload(
            notes="  zweimal benutzt  ",
            price=90,
            location=" 10115 Berlin ",
            condition="Sehr Gut",
            provider="gemini",
            model="gemini-3.6-flash",
        )
    )
    assert request.notes == "zweimal benutzt"      # getrimmt
    assert request.location == "10115 Berlin"
    assert request.price_hint == 90
    assert request.condition_hint == "Sehr Gut"
    assert (provider, model) == ("gemini", "gemini-3.6-flash")


def test_leere_optionale_felder_werden_zu_defaults():
    request, provider, model = build_request(payload())
    assert (request.notes, request.location, request.condition_hint) == ("", "", "")
    assert request.price_hint is None
    assert (provider, model) == ("auto", None)


def test_preis_als_string_wird_akzeptiert():
    # <input type=number> liefert je nach Browser einen String.
    assert build_request(payload(price="120"))[0].price_hint == 120


def test_bildgroesse_wird_angewandt():
    request, _, _ = build_request(payload(image_size="winzig"))
    assert max(request.images[0].width, request.images[0].height) <= 768


def test_ohne_bilder():
    with pytest.raises(BadRequest, match="Keine Bilder"):
        build_request({"images": []})


def test_zu_viele_bilder():
    viele = [{"name": f"{i}.jpg", "data": bild_b64()} for i in range(13)]
    with pytest.raises(BadRequest, match="Höchstens"):
        build_request({"images": viele})


def test_unbekannte_bildgroesse():
    with pytest.raises(BadRequest, match="Unbekannte Bildgröße"):
        build_request(payload(image_size="riesig"))


def test_kaputtes_base64():
    with pytest.raises(BadRequest, match="dekodiert"):
        build_request({"images": [{"name": "x.jpg", "data": "!!!kein base64!!!"}]})


def test_leeres_bild():
    with pytest.raises(BadRequest, match="leer"):
        build_request({"images": [{"name": "x.jpg", "data": ""}]})


def test_kein_bildformat():
    daten = base64.standard_b64encode(b"das ist ein Textdokument").decode()
    with pytest.raises(BadRequest, match="kein lesbares Bild"):
        build_request({"images": [{"name": "x.jpg", "data": daten}]})


def test_preis_keine_zahl():
    with pytest.raises(BadRequest, match="Zahl"):
        build_request(payload(price="teuer"))


# --- Server -------------------------------------------------------------


@pytest.fixture
def server():
    httpd = ThreadingHTTPServer((ui.HOST, 0), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://{ui.HOST}:{httpd.server_address[1]}"
    httpd.shutdown()
    httpd.server_close()


def post(base, path, body):
    req = urllib.request.Request(
        base + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read())


def test_seite_wird_ausgeliefert(server):
    with urllib.request.urlopen(server + "/") as res:
        html = res.read().decode()
    assert res.status == 200
    assert "Kleinanzeigen-Tool" in html
    assert res.headers["Content-Type"].startswith("text/html")


def test_unbekannter_pfad_ist_404(server):
    with pytest.raises(urllib.error.HTTPError) as exc:
        urllib.request.urlopen(server + "/gibtsnicht")
    assert exc.value.code == 404


def test_falscher_api_pfad_ist_404(server):
    assert post(server, "/api/anderes", {})[0] == 404


def test_fehlerhafte_anfrage_gibt_400_mit_meldung(server):
    status, body = post(server, "/api/create", {"images": []})
    assert status == 400
    assert "Keine Bilder" in body["error"]


def test_kaputtes_json_gibt_400(server):
    req = urllib.request.Request(
        server + "/api/create",
        data=b"{kein json",
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with pytest.raises(urllib.error.HTTPError) as exc:
        urllib.request.urlopen(req)
    assert exc.value.code == 400


def test_ui_server_end_to_end(server, monkeypatch, listing):
    """Vollständiger Weg Browser -> Analyse -> Antwort, mit Anbieter-Attrappe."""
    from kleinanzeigen_tool.providers.base import Provider, ProviderResult

    class StubProvider(Provider):
        name = "stub"
        default_model = "stub-1"
        api_key_env = "STUB"

        def analyze(self, request):
            return ProviderResult(listing=listing, input_tokens=7, output_tokens=9)

        def research(self, request):
            return ""

        def list_models(self):
            return []

    monkeypatch.setattr(ui, "get_provider", lambda *a, **k: StubProvider())

    status, body = post(server, "/api/create", payload(notes="Testlauf"))
    assert status == 200
    assert body["listing"]["title"] == listing.title
    assert body["usage"] == {
        "input_tokens": 7,
        "output_tokens": 9,
        "provider": "stub",
        "model": "stub-1",
    }
    assert "warnings" in body


def test_favicon_gibt_204_statt_404(server):
    """Sonst steht bei jedem Seitenaufruf ein roter Fehler in der Konsole."""
    with urllib.request.urlopen(server + "/favicon.ico") as res:
        assert res.status == 204


def test_csp_erlaubt_blob_bilder(server):
    """Die Fotovorschau nutzt URL.createObjectURL (blob:). Fehlt blob: in der
    CSP, blockiert der Browser sie stillschweigend — kaputtes Bildsymbol,
    keine Fehlermeldung im UI."""
    with urllib.request.urlopen(server + "/") as res:
        csp = res.headers["Content-Security-Policy"]
    assert "img-src" in csp
    assert "blob:" in csp
    # Fremde Quellen bleiben ausgeschlossen.
    assert "default-src 'self'" in csp
    assert "http://" not in csp
