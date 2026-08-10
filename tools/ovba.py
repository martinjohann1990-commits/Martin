"""Erzeugt eine gueltige ``vbaProject.bin`` (VBA-Projekt) aus VBA-Quelltexten.

Hintergrund: openpyxl kann Arbeitsblaetter, Formeln, Tabellen und Diagramme
schreiben, aber kein VBA-Projekt. Ein VBA-Projekt ist ein OLE-Container (CFB,
[MS-CFB]) mit RLE-komprimierten Streams ([MS-OVBA]). Dieses Modul implementiert
beides in reinem Python, ohne externe Abhaengigkeiten:

* ``CfbWriter``       - schreibt einen CFB-Container (512-Byte-Sektoren, FAT,
                        MiniFAT, Directory als balancierter Suchbaum)
* ``compress``        - MS-OVBA Run-Length-Komprimierung (2.4.1)
* ``encrypt_hex``     - MS-OVBA Data Encryption (2.4.3) fuer CMG/DPB/GC
* ``build_vba_project`` - setzt PROJECT, PROJECTwm, VBA/dir, VBA/_VBA_PROJECT
                        und die Modul-Streams zusammen

Die Byte-Layouts wurden gegen eine bekannte, funktionierende ``vbaProject.bin``
verifiziert (Referenz: XlsxWriter 3.2.9, ``examples/vbaProject.bin``,
BSD-2-Clause). Insbesondere wurden CMG/DPB/GC der Referenz mit der hier
implementierten Umkehrfunktion entschluesselt; Ergebnis: Version 2,
ProjectKey = Summe der Bytes der Projekt-ID mod 256, Klartexte 0x00000000
(kein Schutz), 0x00 (kein Passwort), 0xFF (sichtbar).
"""

from __future__ import annotations

import struct
import uuid

# ---------------------------------------------------------------------------
# MS-OVBA 2.4.1 - Komprimierung
# ---------------------------------------------------------------------------

# Ein komprimierter Chunk darf hoechstens 4096 Byte Nutzdaten enthalten
# (12-Bit-Groessenfeld => CompressedChunkSize max. 4098 inkl. 2-Byte-Header).
# Wir kodieren ausschliesslich Literale: je 8 Datenbytes wird ein FlagByte
# (0x00 = alle acht Token sind Literale) vorangestellt. Damit gilt
# n + ceil(n/8) <= 4096, also n <= 3640 dekomprimierte Bytes pro Chunk.
_MAX_RAW_PER_CHUNK = 3640


def compress(data: bytes) -> bytes:
    """Komprimiert ``data`` in einen MS-OVBA CompressedContainer."""
    out = bytearray(b"\x01")  # SignatureByte
    for start in range(0, len(data), _MAX_RAW_PER_CHUNK):
        raw = data[start : start + _MAX_RAW_PER_CHUNK]
        body = bytearray()
        for i in range(0, len(raw), 8):
            body.append(0x00)  # FlagByte: acht Literal-Token
            body += raw[i : i + 8]
        # CompressedChunkSize = Chunk-Gesamtlaenge (inkl. Header) - 3
        size_field = len(body) - 1
        assert 0 <= size_field <= 0x0FFF, size_field
        header = 0xB000 | size_field  # Signature 0b011 << 12, CompressedFlag = 1
        out += struct.pack("<H", header)
        out += body
    return bytes(out)


def decompress(data: bytes) -> bytes:
    """Umkehrung von :func:`compress` - dient der Selbstpruefung im Build."""
    if not data or data[0] != 0x01:
        raise ValueError("kein CompressedContainer (SignatureByte != 0x01)")
    out = bytearray()
    pos = 1
    while pos < len(data):
        (header,) = struct.unpack_from("<H", data, pos)
        pos += 2
        size = (header & 0x0FFF) + 3
        flag = (header >> 15) & 1
        end = pos + size - 2
        if not flag:  # unkomprimierter Chunk
            out += data[pos:end]
            pos = end
            continue
        chunk_start = len(out)
        while pos < end:
            flags = data[pos]
            pos += 1
            for bit in range(8):
                if pos >= end:
                    break
                if not (flags >> bit) & 1:
                    out.append(data[pos])
                    pos += 1
                else:
                    (token,) = struct.unpack_from("<H", data, pos)
                    pos += 2
                    diff = len(out) - chunk_start
                    bit_count = max(4, (diff - 1).bit_length())
                    length = (token & ((1 << (16 - bit_count)) - 1)) + 3
                    offset = (token >> (16 - bit_count)) + 1
                    for _ in range(length):
                        out.append(out[-offset])
    return bytes(out)


# ---------------------------------------------------------------------------
# MS-OVBA 2.4.3 - Verschluesselung der PROJECT-Felder CMG / DPB / GC
# ---------------------------------------------------------------------------


def project_key(project_id: str) -> int:
    """ProjectKey = Summe der Bytes der Projekt-ID (mit Klammern) mod 256."""
    return sum(project_id.encode("latin-1")) & 0xFF


def encrypt_hex(plain: bytes, project_id: str, seed: int) -> str:
    """Verschluesselt ``plain`` und liefert den Hex-String fuer die PROJECT-Datei."""
    key = project_key(project_id)
    version = 2
    version_enc = seed ^ version
    key_enc = seed ^ key
    ignored_len = (seed & 6) >> 1
    body = bytes(ignored_len) + struct.pack("<L", len(plain)) + plain

    out = bytearray([seed, version_enc, key_enc])
    unenc1, enc1, enc2 = key, key_enc, version_enc
    for byte in body:
        enc = byte ^ ((enc2 + unenc1) & 0xFF)
        enc2, enc1, unenc1 = enc1, enc, byte
        out.append(enc)
    return out.hex().upper()


def decrypt_hex(text: str) -> tuple[int, int, bytes]:
    """Umkehrung von :func:`encrypt_hex`; liefert (Version, ProjectKey, Klartext)."""
    data = bytes.fromhex(text)
    seed, version_enc, key_enc = data[0], data[1], data[2]
    version, key = seed ^ version_enc, seed ^ key_enc
    unenc1, enc1, enc2 = key, key_enc, version_enc
    out = bytearray()
    for byte in data[3:]:
        out.append(byte ^ ((enc2 + unenc1) & 0xFF))
        enc2, enc1, unenc1 = enc1, byte, out[-1]
    body = bytes(out[(seed & 6) >> 1 :])
    (length,) = struct.unpack_from("<L", body, 0)
    return version, key, body[4 : 4 + length]


# ---------------------------------------------------------------------------
# MS-CFB - OLE-Container
# ---------------------------------------------------------------------------

FREESECT = 0xFFFFFFFF
ENDOFCHAIN = 0xFFFFFFFE
FATSECT = 0xFFFFFFFD
NOSTREAM = 0xFFFFFFFF

_SECTOR = 512
_MINI_SECTOR = 64
_MINI_CUTOFF = 4096


class _Entry:
    def __init__(self, name: str, data: bytes | None = None):
        if len(name) > 31:
            raise ValueError(f"Name zu lang fuer CFB-Directory: {name}")
        self.name = name
        self.data = data
        self.children: list[_Entry] = []
        self.left = NOSTREAM
        self.right = NOSTREAM
        self.child = NOSTREAM
        self.start = ENDOFCHAIN
        self.size = 0 if data is None else len(data)

    @property
    def is_stream(self) -> bool:
        return self.data is not None


class CfbWriter:
    """Minimaler, aber spezifikationstreuer CFB-Writer (Version 3)."""

    def __init__(self) -> None:
        self.root = _Entry("Root Entry")

    def add_storage(self, name: str, parent: _Entry | None = None) -> _Entry:
        entry = _Entry(name)
        (parent or self.root).children.append(entry)
        return entry

    def add_stream(self, name: str, data: bytes, parent: _Entry | None = None) -> _Entry:
        entry = _Entry(name, data)
        (parent or self.root).children.append(entry)
        return entry

    # -- Directory-Baum ----------------------------------------------------
    @staticmethod
    def _sort_key(entry: _Entry) -> tuple[int, str]:
        # CFB-Sortierung: erst Namenslaenge, dann Name in Grossschreibung
        return (len(entry.name), entry.name.upper())

    def _link_tree(self, entry: _Entry) -> None:
        kids = sorted(entry.children, key=self._sort_key)

        def build(nodes: list[_Entry]) -> int:
            if not nodes:
                return NOSTREAM
            mid = len(nodes) // 2
            node = nodes[mid]
            node.left = build(nodes[:mid])
            node.right = build(nodes[mid + 1 :])
            return node.index

        entry.child = build(kids)
        for kid in entry.children:
            self._link_tree(kid)

    def _flatten(self) -> list[_Entry]:
        entries: list[_Entry] = []

        def walk(entry: _Entry) -> None:
            entry.index = len(entries)
            entries.append(entry)
            for kid in entry.children:
                walk(kid)

        walk(self.root)
        return entries

    # -- Serialisierung ----------------------------------------------------
    def tobytes(self) -> bytes:
        entries = self._flatten()
        self._link_tree(self.root)

        sectors: list[bytes] = []
        fat: list[int] = []

        def alloc(data: bytes, size: int = _SECTOR) -> int:
            """Legt ``data`` in eine zusammenhaengende Sektorkette und liefert den Start."""
            if not data:
                return ENDOFCHAIN
            count = -(-len(data) // size)
            start = len(sectors)
            for i in range(count):
                sectors.append(data[i * size : (i + 1) * size].ljust(size, b"\x00"))
                fat.append(start + i + 1 if i < count - 1 else ENDOFCHAIN)
            return start

        # 1) grosse Streams direkt in Sektoren, kleine in den Mini-Stream
        mini_data = bytearray()
        mini_fat: list[int] = []
        for entry in entries:
            if not entry.is_stream or not entry.data:
                continue
            if len(entry.data) >= _MINI_CUTOFF:
                entry.start = alloc(entry.data)
            else:
                count = -(-len(entry.data) // _MINI_SECTOR)
                entry.start = len(mini_fat)
                for i in range(count):
                    mini_fat.append(entry.start + i + 1 if i < count - 1 else ENDOFCHAIN)
                mini_data += entry.data.ljust(count * _MINI_SECTOR, b"\x00")

        # 2) Mini-Stream (haengt am Root-Entry) und MiniFAT
        self.root.start = alloc(bytes(mini_data))
        self.root.size = len(mini_data)
        mini_fat_start = ENDOFCHAIN
        mini_fat_count = 0
        if mini_fat:
            packed = b"".join(struct.pack("<L", v) for v in mini_fat)
            pad = (-len(packed)) % _SECTOR
            packed += struct.pack("<L", FREESECT) * (pad // 4)
            mini_fat_start = alloc(packed)
            mini_fat_count = len(packed) // _SECTOR

        # 3) Directory
        dir_data = b"".join(self._dir_entry(e) for e in entries)
        pad = (-len(dir_data)) % _SECTOR
        dir_data += b"\x00" * pad
        dir_start = alloc(dir_data)
        dir_count = len(dir_data) // _SECTOR

        # 4) FAT-Sektoren (Fixpunkt: die FAT beschreibt sich selbst mit)
        per_fat = _SECTOR // 4
        n_fat = 1
        while True:
            need = -(-(len(sectors) + n_fat) // per_fat)
            if need <= n_fat:
                break
            n_fat = need
        fat_first = len(sectors)
        fat = fat + [FATSECT] * n_fat
        fat += [FREESECT] * (n_fat * per_fat - len(fat))
        fat_bytes = b"".join(struct.pack("<L", v) for v in fat)
        for i in range(n_fat):
            sectors.append(fat_bytes[i * _SECTOR : (i + 1) * _SECTOR])

        if n_fat > 109:
            raise ValueError("DIFAT-Ueberlauf: Container zu gross fuer diesen Writer")

        # 5) Header
        header = bytearray()
        header += b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
        header += b"\x00" * 16  # CLSID
        header += struct.pack("<HHHHH", 0x003E, 3, 0xFFFE, 9, 6)
        header += b"\x00" * 6  # Reserved
        header += struct.pack("<L", 0)  # NumberOfDirectorySectors (v3: 0)
        header += struct.pack("<L", n_fat)
        header += struct.pack("<L", dir_start)
        header += struct.pack("<L", 0)  # TransactionSignature
        header += struct.pack("<L", _MINI_CUTOFF)
        header += struct.pack("<L", mini_fat_start)
        header += struct.pack("<L", mini_fat_count)
        header += struct.pack("<L", ENDOFCHAIN)  # FirstDIFATSector
        header += struct.pack("<L", 0)  # NumberOfDIFATSectors
        difat = [fat_first + i for i in range(n_fat)] + [FREESECT] * (109 - n_fat)
        header += b"".join(struct.pack("<L", v) for v in difat)
        assert len(header) == _SECTOR, len(header)
        assert dir_count >= 1

        return bytes(header) + b"".join(sectors)

    @staticmethod
    def _dir_entry(entry: _Entry) -> bytes:
        name = entry.name.encode("utf-16-le") + b"\x00\x00"
        obj_type = 5 if entry.index == 0 else (2 if entry.is_stream else 1)
        out = bytearray(name.ljust(64, b"\x00"))
        out += struct.pack("<H", len(name))
        out += struct.pack("<BB", obj_type, 1)  # ColorFlag 1 = black
        out += struct.pack("<LLL", entry.left, entry.right, entry.child)
        out += b"\x00" * 16  # CLSID
        out += struct.pack("<L", 0)  # StateBits
        out += b"\x00" * 16  # Creation-/ModifiedTime
        out += struct.pack("<L", entry.start)
        out += struct.pack("<Q", entry.size)
        assert len(out) == 128, len(out)
        return bytes(out)


# ---------------------------------------------------------------------------
# VBA-Projekt zusammensetzen
# ---------------------------------------------------------------------------

# Verweise, die im dir-Stream registriert werden. Die Host-Bibliotheken (VBA
# selbst und Excel) traegt Excel implizit nach - die Referenz-Datei fuehrt
# ebenfalls nur stdole und Office auf.
_REFERENCES = [
    (
        "stdole",
        "*\\G{00020430-0000-0000-C000-000000000046}#2.0#0"
        "#C:\\Windows\\System32\\stdole2.tlb#OLE Automation",
    ),
    (
        "Office",
        "*\\G{2DF8D04C-5BFA-101B-BDE5-00AA0044DE52}#2.8#0"
        "#C:\\Program Files\\Common Files\\Microsoft Shared\\OFFICE16\\MSO.DLL"
        "#Microsoft Office 16.0 Object Library",
    ),
]


def _rec(rec_id: int, body: bytes = b"") -> bytes:
    return struct.pack("<HL", rec_id, len(body)) + body


def _mbcs(text: str) -> bytes:
    return text.encode("latin-1")


def _utf16(text: str) -> bytes:
    return text.encode("utf-16-le")


def _dir_stream(project_name: str, modules: list[tuple[str, str]]) -> bytes:
    out = bytearray()
    # --- PROJECTINFORMATION
    out += _rec(0x0001, struct.pack("<L", 0x00000001))  # SysKind: 32-Bit-Windows
    out += _rec(0x0002, struct.pack("<L", 0x00000409))  # Lcid
    out += _rec(0x0014, struct.pack("<L", 0x00000409))  # LcidInvoke
    out += _rec(0x0003, struct.pack("<H", 0x04E4))  # CodePage 1252
    out += _rec(0x0004, _mbcs(project_name))
    out += _rec(0x0005)  # DocString
    out += _rec(0x0040)  # DocString Unicode
    out += _rec(0x0006)  # HelpFilePath 1
    out += _rec(0x003D)  # HelpFilePath 2
    out += _rec(0x0007, struct.pack("<L", 0))  # HelpContext
    out += _rec(0x0008, struct.pack("<L", 0))  # LibFlags
    # PROJECTVERSION: Reserved = 4, dann Major (4 Byte) und Minor (2 Byte)
    out += struct.pack("<HL", 0x0009, 4) + struct.pack("<LH", 1, 0)
    out += _rec(0x000C)  # Constants
    out += _rec(0x003C)  # Constants Unicode
    # --- PROJECTREFERENCES
    for name, libid in _REFERENCES:
        out += _rec(0x0016, _mbcs(name))
        out += _rec(0x003E, _utf16(name))
        body = struct.pack("<L", len(_mbcs(libid))) + _mbcs(libid)
        body += struct.pack("<LH", 0, 0)  # Reserved1 / Reserved2
        out += _rec(0x000D, body)
    # --- PROJECTMODULES
    out += _rec(0x000F, struct.pack("<H", len(modules)))
    out += _rec(0x0013, struct.pack("<H", 0xFFFF))  # ProjectCookie
    for name, _source in modules:
        out += _rec(0x0019, _mbcs(name))  # MODULENAME
        out += _rec(0x0047, _utf16(name))  # MODULENAMEUNICODE
        out += _rec(0x001A, _mbcs(name))  # MODULESTREAMNAME
        out += _rec(0x0032, _utf16(name))  # ... Unicode
        out += _rec(0x001C)  # MODULEDOCSTRING
        out += _rec(0x0048)  # ... Unicode
        # MODULEOFFSET: kein PerformanceCache im Modul-Stream => Offset 0,
        # Excel kompiliert beim Oeffnen aus dem Quelltext.
        out += _rec(0x0031, struct.pack("<L", 0))
        out += _rec(0x001E, struct.pack("<L", 0))  # MODULEHELPCONTEXT
        out += _rec(0x002C, struct.pack("<H", 0xFFFF))  # MODULECOOKIE
        out += _rec(0x0021)  # MODULETYPE: 0x21 = Standardmodul
        out += _rec(0x002B)  # Terminator
    out += _rec(0x0010)  # Terminator + Reserved
    out += struct.pack("<L", 0)
    return bytes(out)


def _project_stream(project_id: str, project_name: str, modules) -> bytes:
    # Klartexte laut MS-OVBA: kein Projektschutz, kein Passwort, Projekt sichtbar
    cmg = encrypt_hex(struct.pack("<L", 0), project_id, 0x0A)
    dpb = encrypt_hex(b"\x00", project_id, 0x14)
    gc = encrypt_hex(b"\xff", project_id, 0x2E)

    lines = ['ID="%s"' % project_id]
    lines += [f"Module={name}" for name, _ in modules]
    lines += [
        f'Name="{project_name}"',
        'HelpContextID="0"',
        'VersionCompatible32="393222000"',
        f'CMG="{cmg}"',
        f'DPB="{dpb}"',
        f'GC="{gc}"',
        "",
        "[Host Extender Info]",
        "&H00000001={3832D640-CF90-11CF-8E43-00A0C911005A};VBE;&H00000000",
        "",
        "[Workspace]",
    ]
    lines += [f"{name}=0, 0, 0, 0, C" for name, _ in modules]
    return ("\r\n".join(lines) + "\r\n").encode("latin-1")


def _projectwm_stream(modules) -> bytes:
    out = bytearray()
    for name, _ in modules:
        out += _mbcs(name) + b"\x00" + _utf16(name) + b"\x00\x00"
    out += b"\x00\x00"
    return bytes(out)


def build_vba_project(modules: list[tuple[str, str]], project_name: str = "VBAProject") -> bytes:
    """Baut eine ``vbaProject.bin`` aus ``[(Modulname, Quelltext), ...]``.

    Jedes Modul wird als Standardmodul (kein Dokumentmodul) angelegt; der
    Quelltext erhaelt automatisch die noetige ``Attribute VB_Name``-Zeile.
    """
    project_id = "{" + str(uuid.UUID(int=0x5D9C7B1E4A2F41C8B6D3E07F1A2B3C4D)).upper() + "}"

    cfb = CfbWriter()
    vba = cfb.add_storage("VBA")

    # _VBA_PROJECT: Reserved1 = 0x61CC, danach eine Version, die nicht zur
    # laufenden VBA-Instanz passt -> Excel verwirft den (hier leeren)
    # PerformanceCache und kompiliert die Module aus dem Quelltext neu.
    cfb.add_stream("_VBA_PROJECT", b"\xcc\x61\xff\xff\x00\x00\x00", parent=vba)
    cfb.add_stream("dir", compress(_dir_stream(project_name, modules)), parent=vba)
    for name, source in modules:
        attribute = f'Attribute VB_Name = "{name}"\r\n'
        text = source.replace("\r\n", "\n").replace("\n", "\r\n")
        if not text.endswith("\r\n"):
            text += "\r\n"
        cfb.add_stream(name, compress(_mbcs(attribute + text)), parent=vba)

    cfb.add_stream("PROJECT", _project_stream(project_id, project_name, modules))
    cfb.add_stream("PROJECTwm", _projectwm_stream(modules))
    return cfb.tobytes()
