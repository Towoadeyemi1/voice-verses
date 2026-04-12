#!/usr/bin/env python3
"""
Cornerstone Speech Service - Local Vosk-based speech-to-text server
Binds to ws://0.0.0.0:8765 (plain WebSocket, no SSL needed for localhost)

Chrome/Firefox/Safari allow ws:// connections to 127.0.0.1 from HTTPS pages
because loopback is a "potentially trustworthy origin" per the W3C Mixed Content spec.
"""

import asyncio
import json
import base64
import os
import sys
import ctypes
import platform
from pathlib import Path

# Pre-load the native Vosk library before importing the Python bindings.
# In a PyInstaller frozen build the dynamic linker cannot find libvosk on its
# own because the bundle's _internal/vosk subfolder is not on PATH/LD_LIBRARY_PATH.
# Loading it explicitly here fixes the generic "Failed to create a model" crash.
if getattr(sys, "frozen", False):
    _FROZEN_DIR = Path(sys._MEIPASS)
    _lib_names = {
        "Windows": "vosk/libvosk.dll",
        "Darwin":  "vosk/libvosk.dylib",
        "Linux":   "vosk/libvosk.so",
    }
    _lib_rel = _lib_names.get(platform.system())
    if _lib_rel:
        _lib_path = _FROZEN_DIR / _lib_rel
        if _lib_path.exists():
            try:
                ctypes.CDLL(str(_lib_path))
            except OSError as _e:
                print(f"WARNING: Could not pre-load {_lib_path}: {_e}")
        else:
            print(f"WARNING: Native Vosk library not found at {_lib_path}")

import numpy as np
import websockets
from vosk import Model, KaldiRecognizer

# Configuration
HOST = "0.0.0.0"
PORT = 8765
SAMPLE_RATE = 16000

# Detect if running as a PyInstaller bundle
if getattr(sys, "frozen", False):
    _BASE_DIR = Path(sys._MEIPASS)
else:
    _BASE_DIR = Path(__file__).parent

MODEL_PATH = os.environ.get("VOSK_MODEL_PATH", str(_BASE_DIR / "model"))

# Global model (loaded once)
model = None
recognizers = {}


def load_model():
    """Load Vosk model from local path"""
    global model

    model_dir = Path(MODEL_PATH)
    if not model_dir.exists():
        for path in [
            _BASE_DIR / "model",
            _BASE_DIR / "vosk-model-small-en-us-0.15",
            Path("model"),
            Path("vosk-model-small-en-us-0.15"),
        ]:
            if path.exists():
                model_dir = path
                break
        else:
            print("ERROR: No Vosk model found. Download from https://alphacephei.com/vosk/models")
            print("Place in ./model directory or set VOSK_MODEL_PATH environment variable")
            sys.exit(1)

    print(f"Loading Vosk model from {model_dir}...")
    model = Model(str(model_dir))
    print("Model loaded successfully")


async def health_handler(path, request_headers):
    """Handle HTTP health check requests"""
    if path == "/health":
        return (200, [("Content-Type", "application/json")],
                json.dumps({"ok": True, "engines": ["vosk"], "active": "vosk"}).encode())
    return None


async def handle_client(websocket, path):
    """Handle a single WebSocket client connection"""
    client_id = id(websocket)
    recognizer = None

    print(f"Client {client_id} connected from {websocket.remote_address} path={path}")

    # Immediately tell the client the service is alive
    await websocket.send(json.dumps({
        "type": "ready",
        "engine": "vosk",
        "sampleRate": SAMPLE_RATE
    }))

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")

                if msg_type == "hello":
                    sample_rate = data.get("sample_rate", SAMPLE_RATE)
                    recognizer = KaldiRecognizer(model, sample_rate)
                    recognizers[client_id] = recognizer

                    await websocket.send(json.dumps({
                        "type": "ready",
                        "engine": "vosk",
                        "sampleRate": sample_rate
                    }))
                    print(f"Client {client_id} initialized with sample rate {sample_rate}")

                elif msg_type == "audio" and recognizer:
                    pcm16_b64 = data.get("pcm16_b64", "")
                    try:
                        audio_bytes = base64.b64decode(pcm16_b64)

                        if recognizer.AcceptWaveform(audio_bytes):
                            result = json.loads(recognizer.Result())
                            text = result.get("text", "").strip()
                            if text:
                                await websocket.send(json.dumps({
                                    "type": "transcript.final",
                                    "text": text
                                }))
                        else:
                            partial = json.loads(recognizer.PartialResult())
                            text = partial.get("partial", "").strip()
                            if text:
                                await websocket.send(json.dumps({
                                    "type": "transcript.partial",
                                    "text": text
                                }))
                    except Exception as e:
                        print(f"Audio processing error: {e}")

                elif msg_type == "mute":
                    muted = data.get("muted", False)
                    print(f"Client {client_id} mute: {muted}")

            except json.JSONDecodeError:
                print(f"Invalid JSON from client {client_id}")

    except websockets.exceptions.ConnectionClosed:
        print(f"Client {client_id} disconnected")
    finally:
        if client_id in recognizers:
            del recognizers[client_id]


async def main():
    """Start the WebSocket server"""
    load_model()

    print(f"Starting Cornerstone Speech Service on ws://{HOST}:{PORT}")
    print(f"Connect from same machine: ws://127.0.0.1:{PORT}")
    print(f"Connect from iPad/other devices: ws://<this-machine-ip>:{PORT}")

    async with websockets.serve(
        handle_client,
        HOST,
        PORT,
        process_request=health_handler
    ):
        print("Server ready. Press Ctrl+C to stop.")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
