"""Lokale Web-Oberfläche für Leute, die kein Terminal benutzen wollen.

Bewusst ohne Framework und ohne Build-Schritt: eine HTML-Datei plus die
Python-Standardbibliothek. Damit bleibt `pip install kleinanzeigen-tool`
ausreichend, und es gibt keinen zweiten Abhängigkeitsbaum zu pflegen.

Der Server bindet ausschließlich an 127.0.0.1. Er führt Aufrufe mit dem
API-Schlüssel der Nutzerin aus — wäre er im Netz erreichbar, könnte jeder
im selben WLAN auf deren Kosten Anfragen stellen.
"""

from __future__ import annotations

import base64
import binascii
import json
import os
import subprocess
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from kleinanzeigen_tool.analyzer import AnalysisFailed, ListingRequest, analyze
from kleinanzeigen_tool.images import (
    DEFAULT_MAX_IMAGES,
    IMAGE_SIZE_PRESETS,
    prepare_image_bytes,
    resolve_max_edge,
)
from kleinanzeigen_tool.providers import (
    MissingCredentials,
    ProviderError,
    get_provider,
)

HOST = "127.0.0.1"
PAGE = Path(__file__).parent / "web" / "page.html"

#: Bilder kommen base64-kodiert im JSON-Body. 12 Fotos à ~8 MB Rohgröße
#: ergeben mit base64-Aufschlag rund 130 MB — darüber ist etwas faul.
MAX_BODY_BYTES = 160 * 1024 * 1024


class BadRequest(Exception):
    """Die Anfrage aus dem Browser war unbrauchbar."""


def build_request(payload: dict) -> tuple[ListingRequest, str, str | None]:
    """Übersetzt den JSON-Body der Seite in einen ListingRequest.

    Gibt zusätzlich Anbieter- und Modellwunsch zurück. Wirft `BadRequest`
    bei allem, was der Browser falsch geschickt hat — das sind Nutzerfehler
    und keine Serverfehler.
    """
    raw_images = payload.get("images") or []
    if not raw_images:
        raise BadRequest("Keine Bilder übermittelt.")
    if len(raw_images) > DEFAULT_MAX_IMAGES:
        raise BadRequest(
            f"Höchstens {DEFAULT_MAX_IMAGES} Bilder pro Anzeige — "
            f"{len(raw_images)} erhalten."
        )

    size = payload.get("image_size") or "mittel"
    if size not in IMAGE_SIZE_PRESETS:
        raise BadRequest(f"Unbekannte Bildgröße '{size}'.")
    max_edge = resolve_max_edge(size)

    images = []
    for index, item in enumerate(raw_images, start=1):
        name = str(item.get("name") or f"Bild {index}")
        try:
            data = base64.standard_b64decode(item.get("data") or "")
        except (binascii.Error, ValueError) as exc:
            raise BadRequest(f"'{name}' konnte nicht dekodiert werden.") from exc
        if not data:
            raise BadRequest(f"'{name}' ist leer.")
        try:
            images.append(prepare_image_bytes(name, data, max_edge))
        except Exception as exc:
            raise BadRequest(
                f"'{name}' ist kein lesbares Bild ({type(exc).__name__})."
            ) from exc

    price = payload.get("price")
    if price is not None:
        try:
            price = int(price)
        except (TypeError, ValueError):
            raise BadRequest("Die Preisvorstellung muss eine Zahl sein.") from None

    request = ListingRequest(
        images=images,
        notes=str(payload.get("notes") or "").strip(),
        price_hint=price,
        location=str(payload.get("location") or "").strip(),
        condition_hint=str(payload.get("condition") or "").strip(),
    )
    return request, str(payload.get("provider") or "auto"), (
        str(payload.get("model")).strip() or None if payload.get("model") else None
    )


def run_analysis(payload: dict) -> dict:
    """Kompletter Ablauf für eine Browser-Anfrage."""
    request, provider_name, model = build_request(payload)
    provider = get_provider(provider_name, model)
    result = analyze(provider, request)
    return {
        "listing": result.listing.model_dump(),
        "warnings": result.warnings,
        "usage": {
            "input_tokens": result.input_tokens,
            "output_tokens": result.output_tokens,
            "provider": result.provider,
            "model": result.model,
        },
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "kleinanzeigen-tool"

    def log_message(self, *args) -> None:  # noqa: D102 - Zugriffslog unterdrücken
        pass

    def _send(self, code: int, body: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        # Die Seite lädt nichts von außen; das schließt auch untergeschobene
        # Skripte aus, falls doch einmal Fremdtext gerendert wird.
        # `blob:` muss bei img-src stehen — die Vorschau der ausgewählten
        # Fotos läuft über URL.createObjectURL und wird sonst stillschweigend
        # blockiert (kaputtes Bildsymbol, keine Fehlermeldung).
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "img-src 'self' blob: data:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline'",
        )
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, payload: dict) -> None:
        self._send(
            code,
            json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            "application/json; charset=utf-8",
        )

    def do_GET(self) -> None:  # noqa: N802 - von BaseHTTPRequestHandler vorgegeben
        if self.path in ("/", "/index.html"):
            self._send(200, PAGE.read_bytes(), "text/html; charset=utf-8")
        elif self.path == "/favicon.ico":
            # Der Browser fragt es ungefragt an; ein 404 landet sonst als
            # roter Fehler in der Konsole und sieht nach einem Defekt aus.
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
        else:
            self._json(404, {"error": "Nicht gefunden."})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/create":
            self._json(404, {"error": "Nicht gefunden."})
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            self._json(400, {"error": "Leere Anfrage."})
            return
        if length > MAX_BODY_BYTES:
            self._json(413, {"error": "Die Bilder sind zusammen zu groß."})
            return

        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(400, {"error": "Ungültige Anfrage."})
            return

        try:
            self._json(200, run_analysis(payload))
        except (BadRequest, MissingCredentials) as exc:
            # Fehlender Schlüssel ist ein Einrichtungsproblem, kein Ausfall
            # des Anbieters — deshalb 400 und nicht 502.
            self._json(400, {"error": str(exc)})
        except (AnalysisFailed, ProviderError) as exc:
            self._json(502, {"error": str(exc)})
        except Exception as exc:  # pragma: no cover - unerwartete Fehler
            self._json(500, {"error": f"Unerwarteter Fehler: {exc}"})


def is_termux() -> bool:
    """Läuft das hier in Termux auf einem Android-Gerät?

    Termux setzt PREFIX auf sein eigenes Verzeichnis unterhalb des
    App-Datenordners — das ist das verlässlichste Merkmal.
    """
    return "com.termux" in os.environ.get("PREFIX", "")


def open_in_browser(url: str) -> bool:
    """Öffnet die Seite. Gibt zurück, ob das geklappt hat.

    Unter Termux gibt es keinen Desktop-Browser, den `webbrowser` finden
    könnte; dort übernimmt `termux-open-url` (aus dem Paket termux-api) und
    reicht die Adresse an den Android-Browser weiter.
    """
    if is_termux():
        try:
            return (
                subprocess.run(
                    ["termux-open-url", url], timeout=10, check=False
                ).returncode
                == 0
            )
        except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
            return False
    try:
        return webbrowser.open(url)
    except Exception:
        return False


def serve(port: int = 8765, open_browser: bool = True) -> None:
    """Startet die Oberfläche und blockiert bis Strg+C."""
    httpd = ThreadingHTTPServer((HOST, port), Handler)
    url = f"http://{HOST}:{httpd.server_address[1]}/"

    print(f"\n  Oberfläche läuft auf:  {url}\n")
    if is_termux():
        # Auf dem Handy ist das Terminal im Vordergrund — der Hinweis, wie
        # man von hier in den Browser kommt, ist wichtiger als auf dem PC.
        print("  Falls sich der Browser nicht öffnet: Adresse oben in Chrome")
        print("  eintippen. Termux dabei im Hintergrund laufen lassen.\n")
    print("  Beenden mit Strg+C.\n")

    if open_browser:
        def spaeter() -> None:
            if not open_in_browser(url):
                print(f"  Browser ließ sich nicht öffnen — bitte {url} aufrufen.\n")

        threading.Timer(0.4, spaeter).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nBeendet.")
    finally:
        httpd.server_close()
