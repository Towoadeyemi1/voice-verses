import { 
  ISpeechProvider, 
  TranscriptCallback, 
  VolumeCallback, 
  ErrorCallback,
  SpeechEngineType,
  LocalEngineType 
} from '../ISpeechProvider';

interface LocalProviderConfig {
  url: string;
  engine: LocalEngineType;
  language: string;
  audioDeviceId: string | null;
}

interface LocalProviderCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onVolumeUpdate: (volume: number) => void;
  onError: (err: Error) => void;
}

/**
 * Local Speech WebSocket Provider
 * 
 * This provider connects to a local speech service (Vosk, Sherpa-ONNX, or Whisper)
 * via WebSocket for offline, cost-free speech-to-text transcription.
 * 
 * Protocol:
 * - Client sends: hello, audio (base64 PCM16), end_segment, mute
 * - Server sends: ready, transcript.partial, transcript.final, error
 */
export class LocalSpeechWSProvider implements ISpeechProvider {
  private ws: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private connected: boolean = false;
  private audioSeq: number = 0;
  private muted: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  private transcriptCallback: TranscriptCallback | null = null;
  private volumeCallback: VolumeCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  constructor(
    private config: LocalProviderConfig,
    private callbacks: LocalProviderCallbacks
  ) {
    this.transcriptCallback = callbacks.onTranscript;
    this.volumeCallback = callbacks.onVolumeUpdate;
    this.errorCallback = callbacks.onError;
  }

  getEngineType(): SpeechEngineType {
    return 'local';
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
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
    // Also notify the server
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'mute', muted }));
    }
  }

  async init(): Promise<void> {
    try {
      console.log('LocalSpeechWSProvider: Initializing connection to', this.config.url);

      // First, get microphone access
      await this.setupMicrophone();

      // Then connect to the local speech service
      await this.connectWebSocket();

    } catch (error) {
      console.error("Error initializing local speech provider:", error);
      this.cleanup();
      this.errorCallback?.(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  private async setupMicrophone(): Promise<void> {
    console.log('LocalSpeechWSProvider: Setting up microphone...');

    // Validate selected device exists
    let validDeviceId: string | null = null;
    if (this.config.audioDeviceId && this.config.audioDeviceId !== 'default') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(d => d.kind === 'audioinput');
        const deviceExists = audioDevices.some(d => d.deviceId === this.config.audioDeviceId);
        if (deviceExists) {
          validDeviceId = this.config.audioDeviceId;
          console.log('Using selected audio device:', validDeviceId);
        } else {
          console.warn('Selected audio device not found, using default');
        }
      } catch (e) {
        console.warn('Could not enumerate devices, using default:', e);
      }
    }

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000, // Local ASR typically uses 16kHz
    };

    if (validDeviceId) {
      audioConstraints.deviceId = { exact: validDeviceId };
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    console.log('Microphone access granted');

    // Set up audio context for processing and volume monitoring
    // We need 16kHz for local ASR
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Using ScriptProcessor for compatibility - in future could use AudioWorklet
    this.processor = this.audioContext.createScriptProcessor(1024, 1, 1); // ~64ms chunks at 16kHz

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const volume = Math.min(100, Math.floor(rms * 100 * 10));
      this.volumeCallback?.(volume);

      // Send audio to WebSocket if connected and not muted
      if (this.ws?.readyState === WebSocket.OPEN && !this.muted) {
        const pcm16 = this.float32ToPcm16(inputData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
        
        this.ws.send(JSON.stringify({
          type: 'audio',
          seq: this.audioSeq++,
          pcm16_b64: base64
        }));
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.url.endsWith('/asr') 
        ? this.config.url 
        : `${this.config.url}/asr`;

      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        if (!this.connected) {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log('WebSocket connected, sending hello...');
        // Send hello message with configuration
        this.ws?.send(JSON.stringify({
          type: 'hello',
          engine: this.config.engine,
          language: this.config.language,
          sample_rate: 16000,
          format: 'pcm_s16le',
          channels: 1
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);

          // Resolve on 'ready' message
          if (data.type === 'ready') {
            clearTimeout(timeout);
            this.connected = true;
            this.reconnectAttempts = 0;
            resolve();
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(timeout);
        this.errorCallback?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.connected = false;

        // If we were previously connected, try to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.stream) {
          this.reconnectAttempts++;
          console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
          setTimeout(() => {
            this.connectWebSocket().catch(err => {
              console.error('Reconnect failed:', err);
            });
          }, 1000 * this.reconnectAttempts);
        }
      };
    });
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'ready':
        console.log('Local ASR ready:', data);
        break;

      case 'transcript.partial':
        console.log('Partial transcript:', data.text);
        this.transcriptCallback?.(data.text, false);
        break;

      case 'transcript.final':
        console.log('Final transcript:', data.text);
        this.transcriptCallback?.(data.text, true);
        break;

      case 'error':
        console.error('Local ASR error:', data.message);
        this.errorCallback?.(new Error(data.message));
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private float32ToPcm16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }

  private cleanup(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.audioSeq = 0;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect on intentional disconnect
  }

  disconnect(): void {
    console.log('LocalSpeechWSProvider: Disconnecting...');
    this.cleanup();
  }
}
