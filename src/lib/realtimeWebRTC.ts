import { BibleVerse } from '@/types/bible';
import { BibleParser } from './bibleParser';

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

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
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
      console.error('Error accessing microphone:', error);
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
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export class RealtimeWebRTC {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private audioRecorder: AudioRecorder | null = null;

  constructor(
    private onTranscript: (text: string) => void,
    private onVerseDetected: (verse: BibleVerse | null) => void,
    private onVolumeUpdate: (volume: number) => void
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async init() {
    try {
      console.log('Initializing WebRTC connection...');

      // Get ephemeral token from edge function
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      if (!SUPABASE_URL) {
        throw new Error('VITE_SUPABASE_URL not configured');
      }

      console.log('Fetching ephemeral token...');
      const tokenResponse = await fetch(`${SUPABASE_URL}/functions/v1/realtime-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token request failed:', errorText);
        throw new Error(`Failed to get ephemeral token: ${errorText}`);
      }

      const data: SessionData = await tokenResponse.json();
      
      if (!data.client_secret?.value) {
        console.error('Invalid token response:', data);
        throw new Error("Invalid token response from server");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log('Ephemeral token received');

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio (AI responses)
      this.pc.ontrack = (e) => {
        console.log('Received remote audio track');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      console.log('Requesting microphone access...');
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.pc.addTrack(ms.getTracks()[0]);
      console.log('Microphone added to peer connection');

      // Set up audio recorder for volume visualization
      this.audioRecorder = new AudioRecorder((audioData) => {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
          sum += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sum / audioData.length);
        const volume = Math.min(100, Math.floor(rms * 100 * 10));
        this.onVolumeUpdate(volume);
      });
      await this.audioRecorder.start();

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
        this.onTranscript(event.transcript);
        this.processTranscript(event.transcript);
        break;

      case 'response.function_call_arguments.done':
        console.log('Function call:', event.name, event.arguments);
        this.handleFunctionCall(event.name, event.arguments);
        break;

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

  private processTranscript(text: string) {
    const verse = BibleParser.parseReference(text);
    if (verse) {
      console.log('Verse detected from transcript:', verse);
      this.onVerseDetected(verse);
    }
  }

  private handleFunctionCall(name: string, args: string) {
    if (name === 'display_verse') {
      try {
        const params = JSON.parse(args);
        const verse = BibleParser.getVerse(params.book, params.chapter, params.verse);
        console.log('Function call - display verse:', verse);
        this.onVerseDetected(verse);
      } catch (error) {
        console.error('Error parsing function call arguments:', error);
      }
    }
  }

  sendMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: 'response.create' }));
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
