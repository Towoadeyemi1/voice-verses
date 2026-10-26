# Cornerstone Bible — Local Speech + Verse Suggestion Upgrade (Lovable Implementation Spec)

> **Superseded (October 2026).** The separate Python/Vosk speech service this spec describes
> has been replaced by speech recognition built into the desktop app (NVIDIA Parakeet via
> sherpa-onnx). See `docs/speech-engine-evaluation.md` and the Architecture section of `README.md`.

## 1) Goals and constraints

### Primary goals
1) **Reliability:** No duplicate verse popups, predictable behavior, clear fallbacks.
2) **Usability:** Simple church setup; works even if internet is down.
3) **Low latency:** Target ~**<= 2 seconds** from spoken reference to displayed verse.
4) **Low cost:** Avoid per-minute cloud costs; OpenAI becomes optional fallback.
5) **Minimal refactor:** Preserve existing UI + slide + BroadcastChannel logic.

### Non-goals (for this phase)
- No “full theology model training.”
- No requirement to ship one single installer yet (we can support it later).

---

## 2) Current system (as implemented today)

From the existing `realtimeWebRTC.ts`:
- The app uses **OpenAI Realtime WebRTC** for speech transcription and tool-call verse detection.
- Transcription events arrive as: `conversation.item.input_audio_transcription.completed`.
- Tool call events arrive as: `response.function_call_arguments.done`.
- The app currently performs **two parallel detection paths**:
  1) **Local parsing from transcript:** `processTranscript()` calls `BibleParser.parseReference(text)`.
  2) **OpenAI tool calls:** `display_verse` and `suggest_verse_from_description`.

### Critical reliability issue (must fix)
Because (1) and (2) both call `onVerseDetected`, the same spoken verse can trigger duplicates.

---

## 3) Design decision: Provider-based speech architecture

### Why
Engine switching (OpenAI vs local ASR engines) is safe only if it is **centralized**.
Do **NOT** scatter `if (engine === ...)` throughout UI components.

### Core pattern
- Introduce an `ISpeechProvider` interface.
- Keep your existing `RealtimeWebRTC` as the OpenAI provider.
- Add a `LocalSpeechWSProvider` for local engines.
- A single `SpeechProviderFactory` selects the provider based on user settings.

This isolates complexity and prevents regressions.

---

## 4) The new end-to-end pipeline

### A) Explicit references (fast path)
`Mic -> ASR (streaming) -> transcript -> normalize -> reference extraction -> BibleParser -> verse lookup -> slide -> BroadcastChannel`

### B) Descriptions / paraphrases (suggest path)
`Mic -> ASR -> transcript -> normalize -> description trigger -> local semantic search -> top verse candidates -> operator confirm OR auto if high confidence`

Important: The **Bible text remains local** (your existing JSON). Display is always grounded in local verse data.

---

## 5) Settings: allow users to choose engine safely

### Add to `cornerstone-settings`
Add:
- `speechEngine`: `'openai' | 'local'`
- `localEngine`: `'vosk' | 'sherpa' | 'whisper'` (used only when `speechEngine === 'local'`)
- `localAsrUrl`: string, default `wss://127.0.0.1:8765`
- `detectionAuthorityOpenAI`: `'tool' | 'transcript' | 'hybrid'` (default: `'tool'`)

### Safety guard
Only expose local engines that are actually available:
- On Settings load, attempt `GET http://127.0.0.1:8765/health` (or WS handshake).
- If not available, show status: `Local Speech Service: Not running` and disable local selection.
- Never silently switch the user into a broken state.

---


## 6) Core interface and factory (frontend)

### 6.1 `ISpeechProvider` interface
Create: `src/speech/ISpeechProvider.ts`

```ts
import { BibleVerse } from '@/types/bible';

export type DetectionInfo = {
  method: 'explicit' | 'description' | 'manual' | 'unknown';
  description?: string;
  confidence?: 'high' | 'medium' | 'low';
  engine?: 'openai' | 'vosk' | 'sherpa' | 'whisper';
};

export interface ISpeechProvider {
  init(): Promise<void>;
  disconnect(): void;
  setMicrophoneMuted(muted: boolean): void;

  // Provider emits transcripts (partial/final). Some providers may only emit final.
  onTranscript(cb: (text: string, isFinal: boolean) => void): void;

  // Provider can emit “verse detected” events (optional).
  // NOTE: In our final architecture, verse detection is centralized, so providers should normally NOT call this.
  onVerseCandidate?(cb: (text: string) => void): void;

  onError(cb: (err: Error) => void): void;
}
```

### 6.2 Provider factory
Create: `src/speech/SpeechProviderFactory.ts`

```ts
import { ISpeechProvider } from './ISpeechProvider';
import { RealtimeWebRTC } from '@/lib/realtimeWebRTC';
import { LocalSpeechWSProvider } from './providers/LocalSpeechWSProvider';

export function createSpeechProvider(settings: any, callbacks: {
  onTranscript: (text: string, isFinal: boolean) => void;
  onVolumeUpdate: (volume: number) => void;
  onError: (err: Error) => void;
}) : ISpeechProvider {
  if (settings.speechEngine === 'local') {
    return new LocalSpeechWSProvider({
      url: settings.localAsrUrl || 'wss://127.0.0.1:8765',
      engine: settings.localEngine || 'vosk',
      language: settings.language || 'en',
      audioDeviceId: settings.audioDevice || null,
    }, callbacks);
  }

  // Default OpenAI
  return new RealtimeWebRTC(
    (t: string) => callbacks.onTranscript(t, true),
    // IMPORTANT: do NOT allow provider to directly call onVerseDetected anymore.
    // We pass a no-op for verse detection here. Verse detection is centralized.
    () => {},
    callbacks.onVolumeUpdate,
    settings.openaiApiKey || null,
    settings.language || 'en'
  ) as unknown as ISpeechProvider;
}
```

**Important:** We are intentionally removing direct verse detection from providers. That is how we prevent duplicates and keep behavior identical across engines.

---

## 7) Centralize verse detection (frontend)

### 7.1 Why this is required
Your current `realtimeWebRTC.ts` triggers verse detection from:
- transcript parsing (`processTranscript`)
- tool calls (`display_verse`, `suggest_verse_from_description`)

This must be centralized behind a **single gate** that:
- normalizes transcripts
- extracts references
- runs suggestions
- applies debouncing + dedupe

### 7.2 Create `VerseDetectionController`
Create: `src/speech/VerseDetectionController.ts`

Responsibilities:
1) Accept transcript events from provider.
2) Run:
   - `normalizeTranscript(text)`
   - `extractReferences(text)`
3) Convert references to actual verses via existing BibleParser.
4) Gate output with dedupe rules.
5) Emit final `onVerseDetected(verse, detectionInfo)` to your Control Panel.

Pseudo-API:

```ts
import { BibleVerse } from '@/types/bible';

export class VerseDetectionController {
  constructor(private opts: {
    onVerseDetected: (verse: BibleVerse, info: any) => void;
    onSuggestion?: (candidates: { ref: string; score: number }[]) => void;
  }) {}

  async onTranscript(text: string, isFinal: boolean) {
    // 1) normalize
    // 2) detect explicit references quickly (even on partial)
    // 3) only attempt description suggestions on FINAL segments
  }
}
```

### 7.3 Dedupe / debounce rules (non-negotiable)
Implement in controller:
- `lastDisplayedKey`: `${book}:${chapter}:${startVerse}-${endVerse}`
- `lastDisplayedAt`: epoch ms
- If same key within **10 seconds** -> ignore
- If a new key triggers within **500ms** of the previous key, require confirmation (optional) to avoid rapid flicker

---

## 8) Fix OpenAI duplicate detection (required)

### Final decision (no ambiguity)
Make the OpenAI WebRTC integration **transcription-only**. All verse detection (explicit + suggestion) happens in `VerseDetectionController`.

This removes today’s duplicate-trigger risk (transcript parsing + tool calls) and makes behavior consistent across OpenAI and local engines.

### Exact edits to `src/lib/realtimeWebRTC.ts`

#### 8.1 Remove tool-call system entirely
In the OpenAI session create request (the `fetch("https://api.openai.com/v1/realtime/sessions", ...)` body):
- Remove `instructions` that mention being “silent” and calling functions.
- Remove the `tools` array.
- Remove `tool_choice`.

Keep only what is needed for transcription:
- `model`
- `modalities: ["text"]`
- `input_audio_transcription: { model: "whisper-1", language }`
- `turn_detection` (optionally tune latency; see section 13)

#### 8.2 Ignore function call events
In `handleEvent(...)`, delete the `response.function_call_arguments.done` case entirely.
Also delete `handleFunctionCall()` and `sendMessage()` if they are unused elsewhere.

#### 8.3 Stop local parsing inside the provider
In the transcription completed handler, remove:
- `this.processTranscript(event.transcript);`

Delete `processTranscript()` if it becomes unused.

**After this change, RealtimeWebRTC does ONLY:**
- mic capture + volume meter
- transcript delivery via `onTranscript(text)`

---

## 9) Local Speech via WebSocket (frontend + local service)

### 9.1 Why WebSocket
A local WebSocket service allows:
- reliable offline streaming ASR
- the web app (PWA) to stay unchanged except for one provider swap
- multiple ASR backends behind a single protocol

Sherpa-ONNX provides documented streaming WebSocket server patterns (Python/C++). Vosk provides a streaming offline toolkit with “zero-latency response with streaming API.”
Sources:
- Sherpa-ONNX WebSocket docs: https://k2-fsa.github.io/sherpa/onnx/websocket/index.html  (supports real-time WS)  
- Sherpa-ONNX streaming WS server: https://k2-fsa.github.io/sherpa/onnx/python/streaming-websocket-server.html  
- Vosk streaming / zero latency claim in official repo README: https://github.com/alphacep/vosk-api  

### 9.2 One protocol for all local engines
The app speaks one WS protocol regardless of whether the local engine is Vosk, Sherpa, or Whisper.

**WS URL:** `wss://127.0.0.1:8765/asr`

**Client -> Server messages**
1) `hello`
```json
{ "type": "hello", "engine": "vosk", "language": "en", "sample_rate": 16000, "format": "pcm_s16le", "channels": 1 }
```
2) `audio`
```json
{ "type": "audio", "seq": 123, "pcm16_b64": "...base64..." }
```
3) `end_segment`
```json
{ "type": "end_segment" }
```
4) `mute`
```json
{ "type": "mute", "muted": true }
```

**Server -> Client messages**
1) `ready`
```json
{ "type": "ready", "engines": ["vosk","sherpa","whisper"], "active": "vosk" }
```
2) `transcript.partial`
```json
{ "type": "transcript.partial", "text": "turn with me to john three", "seq": 123 }
```
3) `transcript.final`
```json
{ "type": "transcript.final", "text": "turn with me to john three sixteen", "seq": 130 }
```
4) `error`
```json
{ "type": "error", "message": "model missing" }
```

### 9.3 Frontend provider: `LocalSpeechWSProvider`
Create: `src/speech/providers/LocalSpeechWSProvider.ts`

Responsibilities:
- capture microphone audio (browser owns the mic)
- resample to 16kHz mono PCM16
- stream frames over WS
- emit transcript callbacks
- keep existing volume meter behavior

**Important:** In local mode, do not create a WebRTC peer connection.

**Frame size:** 20ms (320 samples @ 16k) or 40ms (640 samples). This keeps latency low.

### 9.4 Audio capture implementation
Avoid `ScriptProcessorNode` for streaming if possible (it is deprecated). Prefer `AudioWorklet`.

If speed is the priority and you want minimal change:
- You MAY use `ScriptProcessorNode` initially, but expect occasional latency jitter.

Minimum reliable approach:
- `getUserMedia()` with selected device
- `AudioContext({ sampleRate: 48000 })`
- `AudioWorklet` resampler -> 16k
- encode PCM16

---

## 10) Local Speech Service implementation (recommended)

### 10.1 Recommendation: implement Vosk first
Reason:
- Offline toolkit
- Streaming API; “zero-latency response with streaming API” in the official README
- Often easier to deploy on low-end hardware than Whisper
Source:
- Vosk official repo README: https://github.com/alphacep/vosk-api

### 10.2 Add Sherpa-ONNX and Whisper as optional backends
- Sherpa-ONNX supports streaming ASR and WebSocket server patterns (Python/C++).
  Sources: https://k2-fsa.github.io/sherpa/onnx/websocket/index.html and https://k2-fsa.github.io/sherpa/onnx/python/streaming-websocket-server.html
- whisper.cpp has a real-time mic streaming example; if using Whisper locally, it can be integrated via a wrapper.
  Source: https://github.com/ggerganov/whisper.cpp/blob/master/examples/stream/README.md

### 10.3 Service packaging constraint
Do NOT require churches to install Python tooling.

Preferred approach:
- Provide a simple downloadable **local companion service** (Node or packaged binary)
- It runs on `localhost` and exposes the WS endpoint.

If Lovable cannot build a separate service right now:
- Ship local mode as “experimental” and keep OpenAI as default.

---

## 11) Local “Suggest verse from description” (offline, in-app)

### 11.1 Why embeddings (and why local)
Description-based retrieval is best done as semantic search over verse text.
We will implement:
- local embeddings index (precomputed)
- local query embedding
- cosine similarity search

A lightweight, widely-used embedding model is `sentence-transformers/all-MiniLM-L6-v2`, which produces **384-dimensional** embeddings.
Sources:
- Model card: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- SentenceTransformers docs: https://sbert.net/

### 11.2 Key constraint: keep runtime simple
We avoid FAISS in-browser for v1.
Instead:
- Store embeddings as a typed array
- Pre-normalize vectors
- Search by dot-product (cosine similarity)

31k verses * 384 dims ~ 12M multiplications per query, which is feasible on modern CPUs.

### 11.3 Data preparation pipeline (developer build step)
Add a script that runs during build or pre-release:
- Load a chosen translation’s verse text (WEB recommended for licensing simplicity)
- Produce:
  - `public/semantic/web_embeddings.f32.bin` (Float32 vectors, normalized)
  - `public/semantic/web_meta.json` mapping index -> {book, chapter, verse}

Note: Suggestions return references. Display uses the user’s selected translation to fetch the verse via BibleParser.

### 11.4 Runtime module: `SemanticVerseSuggester`
Create: `src/speech/SemanticVerseSuggester.ts`

API:
```ts
export type VerseCandidate = {
  ref: string; // e.g., "John 3:16"
  score: number; // 0..1-ish cosine
};

export class SemanticVerseSuggester {
  async init(): Promise<void>; // loads embeddings + model
  async suggest(description: string, topK = 10): Promise<VerseCandidate[]>;
}
```

Implementation notes:
- Use an embedding runtime that works in browser (e.g., ONNX runtime web OR a JS transformer embedding runtime).
- Cache query embeddings.
- Keep the model warm (load on app start or when Settings enables “suggestions”).

### 11.5 Confidence mapping
Map scores to confidence:
- `>= 0.35` => high
- `0.25 - 0.35` => medium
- `< 0.25` => low

(Thresholds must be tuned with real sermons.)

### 11.6 Hybrid fallback (recommended)
If embeddings are not ready / model fails to load:
- fall back to keyword search:
  - tokenize description
  - score verses with TF-IDF or simple term matches

---

## 12) Transcript normalization + reference extraction

### 12.1 Normalization rules
Create: `src/speech/transcriptNormalization.ts`

Must handle:
- ordinals: first/second/third -> 1/2/3
- roman numerals: i/ii/iii -> 1/2/3 (common in “I John”)
- spoken numbers: sixteen, twenty eight -> 16, 28
- remove filler words and punctuation noise

### 12.2 Reference extraction rules
Create: `src/speech/referenceExtraction.ts`

Use book alias dictionary:
- “song of songs” == “song of solomon”
- “psalm” == “psalms”
- “1 corinthians” == “first corinthians” == “i corinthians”

Patterns:
- `Book + Chapter:Verse` (e.g., John 3:16)
- `Book + Chapter Verse` (john 3 16)
- `Book + chapter N` (john chapter 3)
- `Book + N verse M`
- ranges: `John 3:16-18`

Extraction returns canonical strings (e.g., `"John 3:16"`) and then calls your existing `BibleParser.parseReference`.

---

## 13) Latency strategy (how to meet ~2 seconds)

### 13.1 Use partial transcripts
- For explicit references, detect from partials.
- Trigger display when a reference is stable.

Stability rule example:
- The same extracted reference appears in 2 consecutive partial transcripts OR in a final transcript.

### 13.2 Reduce segment end waiting
- Local mode: you control frame sizes and can send `end_segment` when VAD indicates a pause.
- OpenAI mode: the current `silence_duration_ms: 1000` can add 1+ second delay. Consider lowering to 400-600ms if it does not harm accuracy.

### 13.3 UI behavior
- When verse is detected: display immediately.
- If the next transcript corrects the verse within 2 seconds (rare), update in place (optional), but avoid flicker.

---

## 14) Exact file-by-file change list (frontend)

### 14.1 Modify existing: `src/lib/realtimeWebRTC.ts`

Apply the transcription-only changes from section **8**. After this edit, `RealtimeWebRTC` must:
- emit transcripts via `onTranscript(...`)
- update the volume meter via `onVolumeUpdate` (unchanged)
- never call `onVerseDetected` or parse verses internally
- never handle tool-call events

**Checklist of exact diffs:**
1) Remove tool-call instructions + `tools` + `tool_choice` from the session creation request body.
2) Delete the `response.function_call_arguments.done` handler.
3) Remove `this.processTranscript(event.transcript)`.
4) Delete `processTranscript()`.
5) Delete `handleFunctionCall()`.
6) Delete `sendMessage()` if no longer referenced.

### 14.2 Add new files
- `src/speech/ISpeechProvider.ts`
- `src/speech/SpeechProviderFactory.ts`
- `src/speech/VerseDetectionController.ts`
- `src/speech/providers/LocalSpeechWSProvider.ts`
- `src/speech/transcriptNormalization.ts`
- `src/speech/referenceExtraction.ts`
- `src/speech/SemanticVerseSuggester.ts`

### 14.3 Update Control Panel / Index wiring
Wherever `RealtimeWebRTC` is created today:
- Replace direct construction with:
  - `createSpeechProvider(settings, callbacks)`
  - `const controller = new VerseDetectionController({ onVerseDetected })`
  - provider.onTranscript((t, final) => controller.onTranscript(t, final))

### 14.4 Settings UI
Add a Settings section:
- Speech Engine: OpenAI / Local
- Local Engine: Vosk / Sherpa / Whisper
- Local ASR URL
- Status indicator + “Test connection” button

---

## 15) Local Speech Service spec (backend companion)

### 15.1 Minimum endpoints
- `GET /health` returns:
```json
{ "ok": true, "engines": ["vosk"], "active": "vosk", "version": "1.0.0" }
```
- `WS /asr` implements protocol in section 9.2

### 15.2 Engine selection behavior
- If client requests an engine not available, server responds:
```json
{ "type": "error", "message": "engine_not_available" }
```
- Server always emits `ready` on connect.

### 15.3 Default recommendation
- Implement **Vosk** first for best latency and lower CPU.

---

## 16) Acceptance criteria and test checklist

### 16.1 Functional acceptance
1) OpenAI mode works as before.
2) Local mode works without internet.
3) Verse detection does not duplicate.
4) Manual search still works.
5) Suggest-from-description returns candidates locally.

### 16.2 Latency acceptance
- On a typical laptop, explicit reference display occurs within ~2 seconds in local mode.

### 16.3 Regression tests (manual)
Test these spoken patterns:
- “John 3:16”
- “John three sixteen”
- “First Corinthians 13”
- “Second Timothy chapter one verse seven”
- “Psalm 23”
- “Let’s read the next verse” (should advance only if reading mode is active)

### 16.4 Suggest tests
Speak descriptions:
- “Where Jesus wept” -> John 11:35
- “God so loved the world” -> John 3:16
- “The Lord is my shepherd” -> Psalm 23:1

### 16.5 Failure mode tests
- Local service not running -> app shows clear status and remains usable.
- Bad microphone permissions -> clear error.
- Switching engines while active -> provider disconnects cleanly and reconnects.

---

## 17) Implementation order (to avoid bugs)
1) Add `ISpeechProvider` + `SpeechProviderFactory`.
2) Add `VerseDetectionController` with dedupe.
3) Patch `realtimeWebRTC.ts` to remove direct verse detection.
4) Confirm OpenAI mode still works (transcript flows into controller).
5) Add `LocalSpeechWSProvider` (connect-only, no audio) with mocked transcripts to validate UI.
6) Add real audio streaming to local service.
7) Add local semantic suggestion module.
8) Add Settings UI and status health checks.

---

## 18) Final notes
- Vosk: offline streaming toolkit with “zero-latency response with streaming API” per official README: https://github.com/alphacep/vosk-api
- Sherpa-ONNX: streaming WebSocket patterns documented: https://k2-fsa.github.io/sherpa/onnx/websocket/index.html
- whisper.cpp: real-time mic stream example documented: https://github.com/ggerganov/whisper.cpp/blob/master/examples/stream/README.md
- all-MiniLM-L6-v2 embeddings are 384-dimensional and widely used for semantic search: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2

