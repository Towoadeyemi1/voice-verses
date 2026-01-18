/**
 * RealtimeWebRTC Module
 * 
 * This module provides WebRTC-based speech-to-text using OpenAI's Realtime API.
 * 
 * IMPORTANT: This is now TRANSCRIPTION-ONLY. All verse detection is handled
 * by the centralized VerseDetectionController to prevent duplicate triggers.
 * 
 * For new implementations, prefer using OpenAISpeechProvider which implements
 * the ISpeechProvider interface for consistent API across all speech engines.
 */

interface SessionData {
  client_secret: {
    value: string;
  };
}

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  setMuted(muted: boolean) {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  async startWithStream(stream: MediaStream) {
    try {
      this.stream = stream;
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error setting up audio processor:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    // Don't stop the stream tracks here - let the caller handle that
    this.stream = null;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * RealtimeWebRTC - OpenAI Realtime API via WebRTC
 * 
 * IMPORTANT: This class is now TRANSCRIPTION-ONLY.
 * All verse detection is handled by the VerseDetectionController.
 * The tools, processTranscript, and handleFunctionCall have been removed
 * to prevent duplicate verse triggers.
 * 
 * For new implementations, prefer using OpenAISpeechProvider from
 * src/speech/providers/OpenAISpeechProvider.ts
 */
export class RealtimeWebRTC {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private audioRecorder: AudioRecorder | null = null;
  private selectedDeviceId: string | null = null;

  constructor(
    private onTranscript: (text: string, isFinal: boolean) => void,
    private onVolumeUpdate: (volume: number) => void,
    private apiKey: string | null = null,
    private language: string = 'en'
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    
    // Get selected audio device from settings
    const savedSettings = localStorage.getItem('cornerstone-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      this.selectedDeviceId = settings.audioDevice || null;
      console.log('Using audio device:', this.selectedDeviceId || 'default');
    }
  }

  setMicrophoneMuted(muted: boolean) {
    if (this.audioRecorder) {
      this.audioRecorder.setMuted(muted);
    }
  }

  async init() {
    try {
      console.log('Initializing WebRTC connection...');

      // Check if we're in development (Lovable preview) or production (Azure)
      const isDevelopment = window.location.hostname.includes('lovableproject.com') || 
                           window.location.hostname.includes('lovable.dev');
      
      let EPHEMERAL_KEY: string;
      
      if (isDevelopment && this.apiKey) {
        // DEVELOPMENT: Use provided API key
        console.log('Development mode: Using provided OpenAI API key');
        
        const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-realtime-preview-2024-12-17",
            modalities: ["text"],  // No audio output - transcription only
            input_audio_transcription: {
              model: "whisper-1",
              language: this.language
            },
            // NO TOOLS - transcription only! Verse detection is centralized.
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
        // PRODUCTION: Use Azure Function
        const AZURE_FUNCTION_URL = `${window.location.origin}/api/realtime-token`;
        console.log('Fetching ephemeral token from:', AZURE_FUNCTION_URL);
        
        const tokenResponse = await fetch(AZURE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language: this.language })
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
      if (this.selectedDeviceId && this.selectedDeviceId !== 'default') {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioDevices = devices.filter(d => d.kind === 'audioinput');
          const deviceExists = audioDevices.some(d => d.deviceId === this.selectedDeviceId);
          if (deviceExists) {
            validDeviceId = this.selectedDeviceId;
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
      
      // Only add deviceId constraint if we have a valid device
      if (validDeviceId) {
        audioConstraints.deviceId = { exact: validDeviceId };
      }
      
      const ms = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      this.pc.addTrack(ms.getTracks()[0]);
      console.log('Microphone added to peer connection');

      // Set up audio recorder for volume visualization - reuse the same stream
      this.audioRecorder = new AudioRecorder((audioData) => {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
          sum += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sum / audioData.length);
        const volume = Math.min(100, Math.floor(rms * 100 * 10));
        this.onVolumeUpdate(volume);
      });
      await this.audioRecorder.startWithStream(ms);

      // Set up data channel for events
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.onopen = () => {
        console.log('Data channel opened');
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
      console.error("Error initializing WebRTC:", error);
      this.cleanup();
      throw error;
    }
  }

  private handleEvent(event: any) {
    console.log('Received event:', event.type);

    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        console.log('Transcript:', event.transcript);
        // Emit as final transcript - VerseDetectionController handles parsing
        this.onTranscript(event.transcript, true);
        break;

      case 'conversation.item.input_audio_transcription.failed':
        console.error('Transcription failed:', event.error);
        break;

      // NOTE: Function call handling removed!
      // All verse detection is now centralized in VerseDetectionController

      case 'error':
        console.error('OpenAI API error:', event.error);
        break;

      case 'input_audio_buffer.speech_started':
        console.log('Speech detected');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('Speech stopped');
        break;
    }
  }

  private cleanup() {
    if (this.audioRecorder) {
      this.audioRecorder.stop();
      this.audioRecorder = null;
    }
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }

  disconnect() {
    console.log('Disconnecting WebRTC...');
    this.cleanup();
  }
}
