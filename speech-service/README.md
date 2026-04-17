# Cornerstone Speech Service

Local offline speech-to-text service for Cornerstone Bible Display.

---

## Speech Mode Options

Cornerstone supports four speech recognition modes. Choose the one that fits your setup:

| Mode | What it uses | Internet needed? | Setup required? |
|------|-------------|-----------------|----------------|
| **Local (Offline)** | This speech service (Sherpa-ONNX / Vosk / Whisper) | No | Yes — installer below |
| **Local AI** | Browser mic + local LLM (Ollama, LM Studio, Jan, Llamafile) | No | Yes — see below |
| **Quick** | Browser built-in speech (Chrome/Edge/Safari) | Yes | None |
| **Cloud (OpenAI)** | OpenAI Realtime API | Yes | API key needed |

Change your mode in the app under **Settings → Speech Recognition**.

---

## Local (Offline) Mode — This Service

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

The service runs a WebSocket server on `wss://127.0.0.1:8765/asr`

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

---

## Local AI Mode — Ollama, LM Studio, Jan & more

This mode uses your **browser's built-in microphone** for audio capture, then sends the transcript to a **locally-running LLM** for intelligent Bible verse reference extraction. No audio or data is sent to any cloud service.

### How it works

1. Your browser listens via the microphone (same as Quick mode)
2. When speech is detected, the transcript is sent to your local LLM
3. The LLM extracts the verse reference (e.g. "John 3:16") from natural speech
4. The verse is looked up and displayed automatically

### Supported servers

| Server | Default URL | API type | Download |
|--------|------------|---------|---------|
| **Ollama** | `http://localhost:11434` | Ollama native | [ollama.com/download](https://ollama.com/download) |
| **LM Studio** | `http://localhost:1234` | OpenAI-compatible | [lmstudio.ai](https://lmstudio.ai) |
| **Jan** | `http://localhost:1337` | OpenAI-compatible | [jan.ai](https://jan.ai) |
| **Llamafile** | `http://localhost:8080` | OpenAI-compatible | [github.com/Mozilla-Ocho/llamafile](https://github.com/Mozilla-Ocho/llamafile) |
| **llama.cpp server** | `http://localhost:8080` | OpenAI-compatible | [github.com/ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp) |

### Setup (Ollama — recommended)

1. **Install Ollama**
   - Download and install from [ollama.com/download](https://ollama.com/download)

2. **Pull a model** — open a terminal and run:
   ```bash
   ollama pull llama3.2
   ```
   Other good options: `mistral`, `phi3`, `gemma3`

3. **In the app**: go to **Settings → Speech Recognition**, select **Local AI**, confirm the URL is `http://localhost:11434`, enter your model name, and click **Test Connection**.

### Setup (LM Studio)

1. Download and install [LM Studio](https://lmstudio.ai)
2. Browse and download a model from the Discover tab
3. Go to the **Local Server** tab and click **Start Server**
4. In the app: select **Local AI**, choose **OpenAI-compatible server**, set the preset to **LM Studio**, enter the model name shown in LM Studio, and click **Test Connection**

### Setup (Jan)

1. Download and install [Jan](https://jan.ai)
2. Download a model from the Hub
3. Go to **Local API Server** and start it
4. In the app: select **Local AI**, choose **OpenAI-compatible server**, set the preset to **Jan**, enter the model name, and click **Test Connection**

### Browser requirement

Local AI mode uses the Web Speech API for audio capture. It requires **Chrome, Edge, or Safari**. Firefox is not supported for this mode.

### Recommended models

| Model | Size | Notes |
|-------|------|-------|
| `llama3.2` | ~2GB | Recommended default — fast and accurate |
| `mistral` | ~4GB | Excellent accuracy |
| `phi3` | ~2GB | Very lightweight, good for older hardware |
| `gemma3` | ~3GB | Good general-purpose option |
