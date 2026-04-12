#!/usr/bin/env python3
"""
Cornerstone Speech Service - Local Vosk-based speech-to-text server
Binds to wss://0.0.0.0:8765 with self-signed SSL for local-only access
"""

import asyncio
import json
import base64
import os
import sys
import ssl
import ctypes
import tempfile
import platform
from pathlib import Path
from datetime import datetime, timezone, timedelta

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


def generate_self_signed_cert():
    """Generate a self-signed certificate for wss:// support"""
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    # Generate private key
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    # Generate certificate
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Cornerstone Church"),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=3650))
        .add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName(u"localhost"),
                x509.IPAddress(__import__("ipaddress").IPv4Address("127.0.0.1")),
                x509.IPAddress(__import__("ipaddress").IPv4Address("0.0.0.0")),
            ]),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )

    # Save to temp files that persist for the session
    cert_dir = Path(tempfile.gettempdir()) / "cornerstone-speech"
    cert_dir.mkdir(exist_ok=True)

    cert_path = cert_dir / "cert.pem"
    key_path = cert_dir / "key.pem"

    cert_path.write_bytes(
        cert.public_bytes(serialization.Encoding.PEM)
    )
    key_path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        )
    )

    print(f"SSL certificate generated at {cert_path}")
    return str(cert_path), str(key_path)


def create_ssl_context():
    """Create SSL context with self-signed certificate"""
    cert_path, key_path = generate_self_signed_cert()
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(cert_path, key_path)
    return ssl_context


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

    ssl_context = create_ssl_context()

    print(f"Starting Cornerstone Speech Service on wss://{HOST}:{PORT}")
    print(f"Connect from same machine: wss://127.0.0.1:{PORT}")
    print(f"Connect from iPad/other devices: wss://<this-mac-ip>:{PORT}")
    print(f"NOTE: Browser will show a certificate warning — click Advanced → Accept once")

    async with websockets.serve(
        handle_client,
        HOST,
        PORT,
        ssl=ssl_context,
        process_request=health_handler
    ):
        print("Server ready. Press Ctrl+C to stop.")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
