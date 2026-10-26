import { 
  ISpeechProvider, 
  TranscriptCallback, 
  VolumeCallback, 
  ErrorCallback,
  SpeechEngineType 
} from '../ISpeechProvider';
import { readErrorResponse } from '@/lib/errors';
import { createClientSecret } from '../openai/credentials';
import { OPENAI_API_BASE } from '../openai/realtimeSession';

interface OpenAIProviderConfig {
  language: string;
  audioDeviceId: string | null;
}

interface RealtimeServerEvent {
  type: string;
  transcript?: string;
  error?: { message?: string };
}

interface OpenAIProviderCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onVolumeUpdate: (volume: number) => void;
  onError: (err: Error) => void;
}

/**
 * OpenAI Realtime Speech Provider
 * 
 * Streams the microphone to an OpenAI Realtime transcription session over
 * WebRTC. TRANSCRIPTION-ONLY: all verse detection is handled centrally by the
 * VerseDetectionController.
 */
export class OpenAISpeechProvider implements ISpeechProvider {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private volumeTimer: number | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private connected: boolean = false;
  
  private transcriptCallback: TranscriptCallback | null = null;
  private volumeCallback: VolumeCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  constructor(
    private config: OpenAIProviderConfig,
    private callbacks: OpenAIProviderCallbacks
  ) {
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

      const clientSecret = await createClientSecret(this.config.language);
      console.log('Ephemeral client secret received');

      this.pc = new RTCPeerConnection();

      // Transcription sessions send no audio back; ignore any remote track
      this.pc.ontrack = () => {};

      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        // 'disconnected' can recover on its own; 'failed' cannot
        if (state === 'failed') {
          console.error('OpenAI connection state:', state);
          this.connected = false;
          this.errorCallback?.(new Error('Lost connection to OpenAI. Check your internet connection and start listening again.'));
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: await this.buildAudioConstraints(),
      });
      this.pc.addTrack(this.stream.getTracks()[0]);
      console.log('Microphone added to peer connection');

      this.setupVolumeMonitor();

      this.dc = this.pc.createDataChannel('oai-events');

      this.dc.onopen = () => {
        console.log('Data channel opened');
        this.connected = true;
      };

      this.dc.onmessage = (e) => {
        try {
          this.handleEvent(JSON.parse(e.data));
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      };

      this.dc.onerror = (error) => {
        console.error('Data channel error:', error);
        this.errorCallback?.(new Error('OpenAI data channel error'));
      };

      this.dc.onclose = () => {
        console.log('Data channel closed');
        this.connected = false;
      };

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      console.log('Connecting to OpenAI Realtime API...');
      const sdpResponse = await fetch(`${OPENAI_API_BASE}/realtime/calls`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect to OpenAI: ${await readErrorResponse(sdpResponse)}`);
      }

      await this.pc.setRemoteDescription({ type: 'answer', sdp: await sdpResponse.text() });
      console.log('WebRTC connection established successfully');
    } catch (error) {
      console.error('Error initializing OpenAI provider:', error);
      this.cleanup();
      // Reported to the caller through the rejected promise (not onError) so the
      // user sees a single "failed to start" message
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  }

  private async buildAudioConstraints(): Promise<MediaTrackConstraints> {
    const constraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    const deviceId = this.config.audioDeviceId;
    if (deviceId && deviceId !== 'default') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (devices.some(d => d.kind === 'audioinput' && d.deviceId === deviceId)) {
          constraints.deviceId = { exact: deviceId };
        } else {
          console.warn('Selected audio device not found, using default');
        }
      } catch (e) {
        console.warn('Could not enumerate devices, using default:', e);
      }
    }

    return constraints;
  }

  private setupVolumeMonitor(): void {
    if (!this.stream) return;

    try {
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);

      const samples = new Float32Array(this.analyser.fftSize);
      this.volumeTimer = window.setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          sum += samples[i] * samples[i];
        }
        const rms = Math.sqrt(sum / samples.length);
        this.volumeCallback?.(Math.min(100, Math.floor(rms * 1000)));
      }, 100);
    } catch (error) {
      console.error('Error setting up volume monitor:', error);
    }
  }

  private handleEvent(event: RealtimeServerEvent): void {
    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        console.log('Transcript received:', event.transcript);
        // Final transcripts only: VerseDetectionController parses references
        // and navigation commands, which must not fire on every partial delta
        if (event.transcript) {
          this.transcriptCallback?.(event.transcript, true);
        }
        break;

      case 'conversation.item.input_audio_transcription.failed':
        console.error('Transcription failed:', event.error);
        break;

      case 'error':
        console.error('OpenAI API error:', event.error);
        this.errorCallback?.(new Error(event.error?.message || 'OpenAI API error'));
        break;
    }
  }

  private cleanup(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.volumeTimer !== null) {
      clearInterval(this.volumeTimer);
      this.volumeTimer = null;
    }
    this.analyser = null;
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
