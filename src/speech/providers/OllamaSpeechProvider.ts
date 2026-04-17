import {
  ISpeechProvider,
  TranscriptCallback,
  VolumeCallback,
  ErrorCallback,
  SpeechEngineType,
} from '../ISpeechProvider';

interface OllamaProviderConfig {
  ollamaUrl: string;
  ollamaModel: string;
  apiType: 'ollama' | 'openai-compatible';
  language: string;
  audioDeviceId: string | null;
}

interface OllamaProviderCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onVolumeUpdate: (volume: number) => void;
  onError: (err: Error) => void;
}

// Web Speech API type declarations (same as WebSpeechProvider)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

const VERSE_EXTRACTION_PROMPT = `You are a Bible verse reference extractor for church presentation software.
Given a speech transcript, extract the Bible verse reference if one is clearly mentioned.
Rules:
- Return ONLY the verse reference in format "Book Chapter:Verse" (e.g. "John 3:16", "Psalm 23:1", "Romans 8:28")
- For ranges, use "Book Chapter:Start-End" (e.g. "John 3:16-17")
- If no clear verse reference is present, return exactly: none
- Do not include any explanation, punctuation, or extra text

Transcript: `;

/**
 * Ollama Speech Provider
 *
 * Uses the browser's Web Speech API for audio-to-text transcription,
 * then sends final transcripts to a locally-running LLM to
 * intelligently extract Bible verse references with contextual understanding.
 *
 * Supports two server types:
 *   - Ollama native  (default):  POST /api/generate
 *   - OpenAI-compatible servers: POST /v1/chat/completions
 *     (LM Studio, Jan, Llamafile, llama.cpp server, etc.)
 *
 * Ollama setup:   Install from https://ollama.com, then: ollama pull llama3.2
 * LM Studio setup: Download from https://lmstudio.ai and load a model.
 * Jan setup:       Download from https://jan.ai and load a model.
 */
export class OllamaSpeechProvider implements ISpeechProvider {
  private recognition: SpeechRecognition | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private volumeInterval: number | null = null;
  private connected: boolean = false;
  private intentionallyStopped: boolean = false;
  private muted: boolean = false;
  private pendingOllamaRequest: AbortController | null = null;

  private transcriptCallback: TranscriptCallback | null = null;
  private volumeCallback: VolumeCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  constructor(
    private config: OllamaProviderConfig,
    private callbacks: OllamaProviderCallbacks
  ) {
    this.transcriptCallback = callbacks.onTranscript;
    this.volumeCallback = callbacks.onVolumeUpdate;
    this.errorCallback = callbacks.onError;
  }

  getEngineType(): SpeechEngineType {
    return 'ollama';
  }

  isConnected(): boolean {
    return this.connected;
  }

  onTranscript(cb: TranscriptCallback): void {
    this.transcriptCallback = cb;
  }

  onVolumeUpdate(cb: VolumeCallback): void {
    this.volumeCallback = cb;
  }

  onError(cb: ErrorCallback): void {
    this.errorCallback = cb;
  }

  setMicrophoneMuted(muted: boolean): void {
    this.muted = muted;
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  async init(): Promise<void> {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      throw new Error(
        'Local AI mode requires browser speech recognition for audio capture. ' +
          'Please use Chrome, Edge, or Safari.'
      );
    }

    await this.setupMicrophone();
    this.setupRecognition(SpeechRecognitionClass);
    this.recognition!.start();
    this.connected = true;
    console.log('OllamaSpeechProvider: Initialized');
  }

  private async setupMicrophone(): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: this.config.audioDeviceId
          ? { deviceId: { exact: this.config.audioDeviceId } }
          : true,
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.volumeInterval = window.setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        this.volumeCallback?.(avg / 255);
      }, 50);
    } catch (error) {
      throw new Error(
        `Microphone access denied: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private setupRecognition(SpeechRecognitionClass: new () => SpeechRecognition): void {
    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language || 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (this.muted) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';

        if (result.isFinal) {
          // Emit raw transcript immediately so regex detection can run in parallel
          this.transcriptCallback?.(transcript, true);
          // Also run Ollama-enhanced extraction
          this.queryOllama(transcript);
        } else {
          this.transcriptCallback?.(transcript, false);
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted') return;
      this.errorCallback?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onend = () => {
      if (!this.intentionallyStopped && this.connected) {
        // Auto-restart on unexpected end
        setTimeout(() => {
          if (!this.intentionallyStopped && this.recognition) {
            try {
              this.recognition.start();
            } catch {
              // Recognition may already be running
            }
          }
        }, 300);
      }
    };
  }

  /**
   * Query the local LLM to extract a Bible verse reference from the transcript.
   * Supports both Ollama native format and OpenAI-compatible format.
   * If a clean reference is returned, emit it as an additional final transcript
   * so VerseDetectionController can easily parse it.
   */
  private async queryOllama(transcript: string): Promise<void> {
    if (!transcript.trim()) return;

    // Cancel any in-flight request
    this.pendingOllamaRequest?.abort();
    this.pendingOllamaRequest = new AbortController();

    const baseUrl = this.config.ollamaUrl.replace(/\/$/, '');

    try {
      let response: Response;

      if (this.config.apiType === 'openai-compatible') {
        // OpenAI-compatible: /v1/chat/completions
        response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: this.pendingOllamaRequest.signal,
          body: JSON.stringify({
            model: this.config.ollamaModel,
            messages: [
              { role: 'user', content: VERSE_EXTRACTION_PROMPT + `"${transcript}"` },
            ],
            stream: false,
            temperature: 0,
            max_tokens: 20,
          }),
        });
      } else {
        // Ollama native: /api/generate
        response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: this.pendingOllamaRequest.signal,
          body: JSON.stringify({
            model: this.config.ollamaModel,
            prompt: VERSE_EXTRACTION_PROMPT + `"${transcript}"`,
            stream: false,
            options: {
              temperature: 0,
              num_predict: 20,
            },
          }),
        });
      }

      if (!response.ok) {
        console.warn(`LocalLLMProvider: Server returned HTTP ${response.status}`);
        return;
      }

      const data = await response.json();
      let llmResponse: string;

      if (this.config.apiType === 'openai-compatible') {
        llmResponse = (data.choices?.[0]?.message?.content ?? '').trim();
      } else {
        llmResponse = (data.response ?? '').trim();
      }

      console.log('LocalLLMProvider: LLM response:', llmResponse);

      if (!llmResponse || llmResponse.toLowerCase() === 'none') return;

      // Emit LLM-extracted reference as a new final transcript
      // VerseDetectionController will parse this clean reference easily
      this.transcriptCallback?.(llmResponse, true);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.warn('LocalLLMProvider: LLM query failed:', error);
    }
  }

  disconnect(): void {
    this.intentionallyStopped = true;
    this.connected = false;

    this.pendingOllamaRequest?.abort();
    this.pendingOllamaRequest = null;

    if (this.volumeInterval !== null) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }

    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

/**
 * Check if a local LLM server is running and the requested model is available.
 * Supports Ollama native (/api/tags) and OpenAI-compatible (/v1/models) servers.
 */
export async function checkOllamaHealth(
  ollamaUrl: string,
  model: string,
  apiType: 'ollama' | 'openai-compatible' = 'ollama'
): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  const baseUrl = ollamaUrl.replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const endpoint =
      apiType === 'openai-compatible'
        ? `${baseUrl}/v1/models`
        : `${baseUrl}/api/tags`;

    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, error: `Server returned HTTP ${response.status}` };
    }

    const data = await response.json();
    let models: string[];

    if (apiType === 'openai-compatible') {
      // OpenAI /v1/models returns { data: [{ id, ... }] }
      models = (data.data ?? []).map((m: { id: string }) => m.id);
    } else {
      // Ollama /api/tags returns { models: [{ name, ... }] }
      models = (data.models ?? []).map(
        (m: { name: string }) => m.name.split(':')[0]
      );
    }

    const modelAvailable = models.some(
      (m) => m.toLowerCase() === model.toLowerCase()
    );

    if (!modelAvailable) {
      const hint =
        apiType === 'openai-compatible'
          ? `Model "${model}" not found. Download it in your LLM server's model manager.`
          : `Model "${model}" not found. Run: ollama pull ${model}`;
      return { ok: false, models, error: hint };
    }

    return { ok: true, models };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: 'Connection timeout — is the server running?' };
    }
    return {
      ok: false,
      error: `Cannot reach server at ${baseUrl}`,
    };
  }
}
