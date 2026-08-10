"""Wandelt eine von openpyxl geschriebene .xlsx in eine makrofaehige .xlsm um.

openpyxl kann keine .xlsm mit VBA-Projekt erzeugen. Die Umwandlung besteht aus
drei Eingriffen in das OPC-Paket (ZIP):

1. ``[Content_Types].xml``      - Workbook-Part auf den macroEnabled-Typ
                                  umstellen und Default fuer ``.bin`` ergaenzen
2. ``xl/_rels/workbook.xml.rels`` - Beziehung auf ``vbaProject.bin`` ergaenzen
3. ``xl/vbaProject.bin``        - VBA-Projekt einfuegen

Zusaetzlich wird ``fullCalcOnLoad`` gesetzt, damit Excel beim Oeffnen alle
Formeln rechnet (openpyxl schreibt keine zwischengespeicherten Ergebnisse).
"""

from __future__ import annotations

import re
import shutil
import zipfile
from pathlib import Path

_MACRO_MAIN = "application/vnd.ms-excel.sheet.macroEnabled.main+xml"
_VBA_TYPE = "application/vnd.ms-office.vbaProject"
_VBA_REL = "http://schemas.microsoft.com/office/2006/relationships/vbaProject"


def _patch_content_types(xml: str) -> str:
    xml = xml.replace(
        'ContentType="application/vnd.openxmlformats-officedocument'
        '.spreadsheetml.sheet.main+xml"',
        f'ContentType="{_MACRO_MAIN}"',
    )
    if 'Extension="bin"' not in xml:
        xml = re.sub(
            r"(<Types[^>]*>)",
            r'\1<Default Extension="bin" ContentType="%s"/>' % _VBA_TYPE,
            xml,
            count=1,
        )
    return xml


def _patch_workbook_rels(xml: str) -> str:
    if "vbaProject.bin" in xml:
        return xml
    ids = [int(m) for m in re.findall(r'Id="rId(\d+)"', xml)]
    new_id = f"rId{max(ids) + 1 if ids else 1}"
    rel = (
        f'<Relationship Id="{new_id}" Type="{_VBA_REL}" Target="vbaProject.bin"/>'
    )
    return xml.replace("</Relationships>", rel + "</Relationships>")


def _patch_workbook(xml: str) -> str:
    """Erzwingt vollstaendige Neuberechnung beim Oeffnen."""
    if "<calcPr" in xml:
        return re.sub(
            r"<calcPr([^>]*?)/>",
            lambda m: "<calcPr%s fullCalcOnLoad=\"1\"/>" % m.group(1).replace(
                ' fullCalcOnLoad="1"', ""
            ),
            xml,
            count=1,
        )
    return xml.replace("</workbook>", '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>')


def convert(xlsx_path: str | Path, xlsm_path: str | Path, vba_project: bytes) -> Path:
    """Schreibt ``xlsx_path`` als makrofaehige Arbeitsmappe nach ``xlsm_path``."""
    xlsx_path, xlsm_path = Path(xlsx_path), Path(xlsm_path)
    if xlsm_path.exists():
        xlsm_path.unlink()

    with zipfile.ZipFile(xlsx_path) as src:
        items = [(i, src.read(i.filename)) for i in src.infolist()]

    with zipfile.ZipFile(xlsm_path, "w", zipfile.ZIP_DEFLATED) as out:
        for info, data in items:
            name = info.filename
            if name == "[Content_Types].xml":
                data = _patch_content_types(data.decode("utf-8")).encode("utf-8")
            elif name == "xl/_rels/workbook.xml.rels":
                data = _patch_workbook_rels(data.decode("utf-8")).encode("utf-8")
            elif name == "xl/workbook.xml":
                data = _patch_workbook(data.decode("utf-8")).encode("utf-8")
            out.writestr(name, data)
        out.writestr("xl/vbaProject.bin", vba_project)
    return xlsm_path


def load_vba_modules(directory: str | Path) -> list[tuple[str, str]]:
    """Liest ``*.bas`` aus ``directory``; Modulname = Dateiname ohne Endung.

    Die Reihenfolge ist alphabetisch, damit Builds reproduzierbar sind.
    """
    directory = Path(directory)
    modules = []
    for path in sorted(directory.glob("*.bas")):
        text = path.read_text(encoding="utf-8")
        # Eine bereits vorhandene Attribut-Zeile wird entfernt; ovba setzt sie neu.
        text = re.sub(r'^Attribute VB_Name = ".*?"\r?\n', "", text)
        modules.append((path.stem, text))
    if not modules:
        raise FileNotFoundError(f"keine .bas-Dateien in {directory}")
    return modules


__all__ = ["convert", "load_vba_modules"]


def _selftest() -> None:  # pragma: no cover - manuelle Pruefung
    import openpyxl
    import sys

    sys.path.insert(0, str(Path(__file__).parent))
    import ovba

    wb = openpyxl.Workbook()
    wb.active["A1"] = 1
    wb.active["A2"] = "=A1+1"
    wb.save("/tmp/_t.xlsx")
    convert("/tmp/_t.xlsx", "/tmp/_t.xlsm", ovba.build_vba_project([("m", "Sub S()\nEnd Sub\n")]))
    print(zipfile.ZipFile("/tmp/_t.xlsm").namelist())


if __name__ == "__main__":
    _selftest()
