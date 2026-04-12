# -*- mode: python ; coding: utf-8 -*-

import platform
from pathlib import Path
import vosk
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = (
    collect_submodules("vosk")
    + collect_submodules("websockets")
    + collect_submodules("sounddevice")
    + collect_submodules("cryptography")
)

vosk_dir = Path(vosk.__file__).resolve().parent

if platform.system() == "Darwin":
    # Try both known macOS library names (older vosk used .dyld, newer uses .dylib)
    lib_name = "libvosk.dylib"
    if not (vosk_dir / lib_name).exists():
        lib_name = "libvosk.dyld"
elif platform.system() == "Windows":
    lib_name = "libvosk.dll"
else:
    lib_name = "libvosk.so"

lib_path = vosk_dir / lib_name
if not lib_path.exists():
    raise FileNotFoundError(f"Vosk native library not found: {lib_path}")

binaries = [(str(lib_path), "vosk")]

datas = [("vosk-model-small-en-us-0.15", "model")]

a = Analysis(
    ["server.py"],
    pathex=["."],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="CornerstoneSpeechService",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="CornerstoneSpeechService",
)
