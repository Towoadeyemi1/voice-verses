import { getRealtimeTokenUrl } from '@/lib/realtimeToken';
import { 
  ISpeechProvider, 
  TranscriptCallback, 
  VolumeCallback, 
  ErrorCallback,
  SpeechEngineType 
} from '../ISpeechProvider';

interface OpenAIProviderConfig {
  apiKey: string | null;
  language: string;
  audioDeviceId: string | null;
}

interface OpenAIProviderCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onVolumeUpdate: (volume: number) => void;
  onError: (err: Error) => void;
}

/**
 * OpenAI Realtime Speech Provider
 * 
 * This provider uses OpenAI's Realtime API via WebRTC for speech-to-text.
 * IMPORTANT: This provider is now TRANSCRIPTION-ONLY. All verse detection
 * is handled centrally by the VerseDetectionController.
 */
export class OpenAISpeechProvider implements ISpeechProvider {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private connected: boolean = false;
  
  private transcriptCallback: TranscriptCallback | null = null;
  private volumeCallback: VolumeCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  constructor(
    private config: OpenAIProviderConfig,
    private callbacks: OpenAIProviderCallbacks
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    
    // Register callbacks immediately
    this.transcriptCallback = callbacks.onTranscript;
    this.volumeCallback = callbacks.onVolumeUpdate;
    this.errorCallback = callbacks.onError;
  }

  getEngineType(): SpeechEngineType {
    return 'openai';
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
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  async init(): Promise<void> {
    try {
      console.log('OpenAISpeechProvider: Initializing WebRTC connection...');

      // Use the server token endpoint when one exists; otherwise (GitHub Pages,
      // Electron, local dev) call OpenAI directly with the user's API key
      const tokenUrl = getRealtimeTokenUrl();
      
      let EPHEMERAL_KEY: string;
      
      if (!tokenUrl) {
        if (!this.config.apiKey) {
          throw new Error('OpenAI API key required. Enter your key when prompted, or choose another speech engine in Settings.');
        }
        console.log('No token server: using provided OpenAI API key');
        
        const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-realtime-preview-2024-12-17",
            modalities: ["text"],  // No audio output - we only want transcription
            input_audio_transcription: {
              model: "whisper-1",
              language: this.config.language
            },
            // NO TOOLS - transcription only!
            // NO INSTRUCTIONS about verse detection - all centralized now
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 600  // Reduced for lower latency
            }
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('OpenAI API error:', tokenResponse.status, errorText);
          throw new Error(`OpenAI API error: ${tokenResponse.status}`);
        }

        const data = await tokenResponse.json();
        EPHEMERAL_KEY = data.client_secret.value;
      } else {
        console.log('Fetching ephemeral token from:', tokenUrl);
        
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language: this.config.language })
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token request failed:', errorText);
          throw new Error(`Failed to get ephemeral token: ${errorText}`);
        }

        const data = await tokenResponse.json();
        
        if (!data.client_secret?.value) {
          console.error('Invalid token response:', data);
          throw new Error("Invalid token response from server");
        }

        EPHEMERAL_KEY = data.client_secret.value;
      }
      
      console.log('Ephemeral token received');

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Disable remote audio playback - we only want transcription
      this.pc.ontrack = (e) => {
        console.log('Received remote audio track (playback disabled)');
      };

      // Add local audio track with selected device
      console.log('Requesting microphone access...');
      
      // Validate selected device exists before using it
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
        autoGainControl: true
      };
      
      if (validDeviceId) {
        audioConstraints.deviceId = { exact: validDeviceId };
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      this.pc.addTrack(this.stream.getTracks()[0]);
      console.log('Microphone added to peer connection');

      // Set up audio processing for volume visualization
      this.setupVolumeMonitor();

      // Set up data channel for events
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.onopen = () => {
        console.log('Data channel opened');
        this.connected = true;
      };

      this.dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          this.handleEvent(event);
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      };

      this.dc.onerror = (error) => {
        console.error('Data channel error:', error);
        this.errorCallback?.(new Error('Data channel error'));
      };

      this.dc.onclose = () => {
        console.log('Data channel closed');
        this.connected = false;
      };

      // Create and set local description
      console.log('Creating WebRTC offer...');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      console.log('Connecting to OpenAI Realtime API...');
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('OpenAI connection failed:', errorText);
        throw new Error(`Failed to connect to OpenAI: ${errorText}`);
      }

      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log('WebRTC connection established successfully');

    } catch (error) {
      console.error("Error initializing OpenAI provider:", error);
      this.cleanup();
      this.errorCallback?.(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  private setupVolumeMonitor(): void {
    if (!this.stream) return;

    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.min(100, Math.floor(rms * 100 * 10));
        this.volumeCallback?.(volume);
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error setting up volume monitor:', error);
    }
  }

  private handleEvent(event: any): void {
    console.log('OpenAI event:', event.type);

    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        console.log('Transcript received:', event.transcript);
        // Emit as final transcript - VerseDetectionController will handle parsing
        this.transcriptCallback?.(event.transcript, true);
        break;

      case 'conversation.item.input_audio_transcription.failed':
        console.error('Transcription failed:', event.error);
        break;

      // NOTE: We no longer handle function calls here!
      // All verse detection is centralized in VerseDetectionController

      case 'error':
        console.error('OpenAI API error:', event.error);
        this.errorCallback?.(new Error(event.error?.message || 'OpenAI API error'));
        break;

      case 'input_audio_buffer.speech_started':
        console.log('Speech detected');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('Speech stopped');
        break;
    }
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
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.connected = false;
  }

  disconnect(): void {
    console.log('OpenAISpeechProvider: Disconnecting...');
    this.cleanup();
  }
}
