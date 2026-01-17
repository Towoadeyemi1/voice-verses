#!/usr/bin/env python3
"""
Cornerstone Speech Service - Local Vosk-based speech-to-text server
Binds to ws://127.0.0.1:8765 for local-only access
"""

import asyncio
import json
import base64
import os
import sys
from pathlib import Path

import numpy as np
import websockets
from vosk import Model, KaldiRecognizer

# Configuration
HOST = "127.0.0.1"
PORT = 8765
SAMPLE_RATE = 16000
MODEL_PATH = os.environ.get("VOSK_MODEL_PATH", "model")

# Global model (loaded once)
model = None
recognizers = {}


def load_model():
    """Load Vosk model from local path or download if needed"""
    global model
    
    model_dir = Path(MODEL_PATH)
    if not model_dir.exists():
        # Try common locations
        for path in ["model", "vosk-model-small-en-us-0.15", "vosk-model-en-us-0.22"]:
            if Path(path).exists():
                model_dir = Path(path)
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
    
    print(f"Client {client_id} connected from {websocket.remote_address}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                
                if msg_type == "hello":
                    # Initialize recognizer for this client
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
                    # Decode and process audio
                    pcm16_b64 = data.get("pcm16_b64", "")
                    try:
                        audio_bytes = base64.b64decode(pcm16_b64)
                        
                        if recognizer.AcceptWaveform(audio_bytes):
                            # Final result
                            result = json.loads(recognizer.Result())
                            text = result.get("text", "").strip()
                            if text:
                                await websocket.send(json.dumps({
                                    "type": "transcript.final",
                                    "text": text
                                }))
                        else:
                            # Partial result
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
    
    async with websockets.serve(
        handle_client,
        HOST,
        PORT,
        process_request=health_handler
    ):
        print("Server ready. Press Ctrl+C to stop.")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
