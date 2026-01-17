import { 
  ISpeechProvider, 
  TranscriptCallback, 
  VolumeCallback, 
  ErrorCallback,
  SpeechEngineType 
} from '../ISpeechProvider';

interface WebSpeechProviderConfig {
  language: string;
  audioDeviceId: string | null;
}

interface WebSpeechProviderCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onVolumeUpdate: (volume: number) => void;
  onError: (err: Error) => void;
}

// TypeScript declarations for Web Speech API
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

/**
 * Web Speech API Provider
 * 
 * Uses the browser's built-in speech recognition (Chrome, Edge, Safari).
 * Zero installation required, but needs internet connection.
 * 
 * Features:
 * - Continuous recognition with interim results
 * - Auto-restart on unexpected end
 * - Graceful permission error handling
 */
export class WebSpeechProvider implements ISpeechProvider {
  private recognition: SpeechRecognition | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private volumeInterval: number | null = null;
  private connected: boolean = false;
  private intentionallyStopped: boolean = false;
  private muted: boolean = false;
  
  private transcriptCallback: TranscriptCallback | null = null;
  private volumeCallback: VolumeCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  constructor(
    private config: WebSpeechProviderConfig,
    private callbacks: WebSpeechProviderCallbacks
  ) {
    this.transcriptCallback = callbacks.onTranscript;
    this.volumeCallback = callbacks.onVolumeUpdate;
    this.errorCallback = callbacks.onError;
  }

  getEngineType(): SpeechEngineType {
    return 'webspeech';
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
  }

  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  async init(): Promise<void> {
    try {
      console.log('WebSpeechProvider: Initializing...');
      
      // Check browser support
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        throw new Error('Web Speech API not supported in this browser. Try Chrome, Edge, or Safari.');
      }

      // Request microphone permission (for volume visualization)
      await this.setupMicrophone();

      // Initialize recognition
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.config.language || 'en-US';
      this.recognition.maxAlternatives = 1;

      // Set up event handlers
      this.recognition.onstart = () => {
        console.log('WebSpeechProvider: Recognition started');
        this.connected = true;
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (this.muted) return;
        
        // Process results from resultIndex onwards
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const isFinal = result.isFinal;
          
          console.log(`WebSpeechProvider: ${isFinal ? 'Final' : 'Partial'}: "${transcript}"`);
          this.transcriptCallback?.(transcript, isFinal);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('WebSpeechProvider error:', event.error, event.message);
        
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            // Permission denied - stop trying
            this.intentionallyStopped = true;
            this.connected = false;
            this.errorCallback?.(new Error('Microphone access denied. Please allow microphone access in your browser settings.'));
            break;
            
          case 'network':
            this.errorCallback?.(new Error('Network error. Web Speech API requires internet connection.'));
            break;
            
          case 'no-speech':
            // Not really an error, just no speech detected - will auto-restart
            console.log('No speech detected, will continue listening...');
            break;
            
          case 'audio-capture':
            this.errorCallback?.(new Error('No microphone found. Please connect a microphone.'));
            break;
            
          default:
            this.errorCallback?.(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      this.recognition.onend = () => {
        console.log('WebSpeechProvider: Recognition ended');
        
        // Auto-restart unless intentionally stopped
        if (!this.intentionallyStopped && this.connected) {
          console.log('WebSpeechProvider: Auto-restarting...');
          try {
            this.recognition?.start();
          } catch (e) {
            console.error('Failed to restart recognition:', e);
            this.connected = false;
          }
        } else {
          this.connected = false;
        }
      };

      // Start recognition
      this.intentionallyStopped = false;
      this.recognition.start();
      console.log('WebSpeechProvider: Started');

    } catch (error) {
      console.error('Error initializing WebSpeechProvider:', error);
      this.cleanup();
      this.errorCallback?.(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  private async setupMicrophone(): Promise<void> {
    console.log('WebSpeechProvider: Setting up microphone for volume visualization...');

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    if (this.config.audioDeviceId && this.config.audioDeviceId !== 'default') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(d => d.kind === 'audioinput');
        const deviceExists = audioDevices.some(d => d.deviceId === this.config.audioDeviceId);
        if (deviceExists) {
          audioConstraints.deviceId = { exact: this.config.audioDeviceId };
        }
      } catch (e) {
        console.warn('Could not enumerate devices:', e);
      }
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    console.log('Microphone access granted');

    // Set up volume monitoring
    this.audioContext = new AudioContext();
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.source.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.volumeInterval = window.setInterval(() => {
      if (this.analyser) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const volume = Math.min(100, Math.floor(average * 0.4));
        this.volumeCallback?.(volume);
      }
    }, 50);
  }

  private cleanup(): void {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // Ignore errors when aborting
      }
      this.recognition = null;
    }
    this.connected = false;
  }

  disconnect(): void {
    console.log('WebSpeechProvider: Disconnecting...');
    this.intentionallyStopped = true;
    this.cleanup();
  }
}
