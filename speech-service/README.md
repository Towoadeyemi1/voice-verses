# Cornerstone Speech Service

Local offline speech-to-text service for Cornerstone Bible Display.

## Quick Start

### Windows
1. Download `CornerstoneSpeechServiceSetup.exe` from [Releases](https://github.com/cornerstone-church/cornerstone-bible/releases)
2. Run the installer
3. The service starts automatically and runs in the system tray

### macOS
1. Download `CornerstoneSpeechService.dmg` from [Releases](https://github.com/cornerstone-church/cornerstone-bible/releases)
2. Open the DMG and drag to Applications
3. Run the app - it will appear in the menu bar

## For Developers

### Requirements
- Python 3.9+
- Microphone access

### Setup
```bash
cd speech-service/service
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python server.py
```

### Building Installers
```bash
# Windows (run in PowerShell)
./scripts/build_windows.ps1

# macOS
./scripts/build_macos.sh
```

## Protocol

The service runs a WebSocket server on `ws://127.0.0.1:8765/asr`

### Server → Client Messages
```json
{ "type": "ready", "engine": "vosk", "sampleRate": 16000 }
{ "type": "transcript.partial", "text": "turn with me to" }
{ "type": "transcript.final", "text": "turn with me to john three sixteen" }
{ "type": "error", "message": "model not found" }
```

### Client → Server Messages
```json
{ "type": "hello", "engine": "vosk", "language": "en", "sample_rate": 16000 }
{ "type": "audio", "seq": 0, "pcm16_b64": "base64-encoded-pcm16" }
{ "type": "mute", "muted": true }
```
