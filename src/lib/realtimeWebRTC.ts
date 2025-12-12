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

  setMuted(muted: boolean) {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  async start(deviceId?: string | null) {
    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      
      // Use selected device if specified (already validated by caller)
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      
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
  private selectedDeviceId: string | null = null;

  constructor(
    private onTranscript: (text: string) => void,
    private onVerseDetected: (verse: BibleVerse | null, detectionInfo?: { method: string; description?: string; confidence?: string }) => void,
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
            voice: "alloy",
            modalities: ["text", "audio"],
            input_audio_transcription: {
              model: "whisper-1",
              language: this.language
            },
            instructions: `You are a silent Bible verse detection system for church services. You have deep knowledge of the entire Bible.

CRITICAL: YOU ARE COMPLETELY SILENT. NEVER generate any audio or text responses. ONLY call functions.

YOUR ONLY JOB:
1. Listen to audio input
2. Detect Bible verse references or descriptions
3. Call the appropriate function
4. DO NOT speak, respond, acknowledge, or make any output except function calls

DETECTION MODES:

A) EXPLICIT REFERENCES → Call display_verse:
- "John 3:16", "john three sixteen", "Romans 8:28"
- "Turn to Psalm 23", "Let's read verse 5"
- "Next verse", "Chapter 3 verse 16"

B) PARAPHRASES/DESCRIPTIONS → Call suggest_verse_from_description:
- "The verse about God so loved the world" → John 3:16
- "Where Jesus wept" → John 11:35
- "The Lord is my shepherd" → Psalm 23:1

FORBIDDEN:
- Speaking or generating audio responses
- Acknowledging user input verbally
- Responding to greetings, questions, or conversation
- Any output except function calls`,
            tools: [
              {
                type: "function",
                name: "display_verse",
                description: "Display a Bible verse when an explicit reference is mentioned",
                parameters: {
                  type: "object",
                  properties: {
                    book: { type: "string" },
                    chapter: { type: "number" },
                    verse: { type: "number" }
                  },
                  required: ["book", "chapter", "verse"]
                }
              },
              {
                type: "function",
                name: "suggest_verse_from_description",
                description: "Suggest a Bible verse from description",
                parameters: {
                  type: "object",
                  properties: {
                    book: { type: "string" },
                    chapter: { type: "number" },
                    verse: { type: "number" },
                    description: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  },
                  required: ["book", "chapter", "verse", "description", "confidence"]
                }
              }
            ],
            tool_choice: "auto",
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
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

      // Set up remote audio (AI responses)
      this.pc.ontrack = (e) => {
        console.log('Received remote audio track');
        this.audioEl.srcObject = e.streams[0];
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

      // Set up audio recorder for volume visualization using same device
      this.audioRecorder = new AudioRecorder((audioData) => {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
          sum += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sum / audioData.length);
        const volume = Math.min(100, Math.floor(rms * 100 * 10));
        this.onVolumeUpdate(volume);
      });
      await this.audioRecorder.start(validDeviceId);

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

  private async processTranscript(text: string) {
    const verse = await BibleParser.parseReference(text);
    if (verse) {
      console.log('Verse detected from transcript:', verse);
      this.onVerseDetected(verse);
    }
  }

  private async handleFunctionCall(name: string, args: string) {
    if (name === 'display_verse') {
      try {
        const params = JSON.parse(args);
        // Default to verse 1 if not specified (for chapter-only references)
        const verseNum = params.verse || 1;
        const verse = await BibleParser.getVerse(params.book, params.chapter, verseNum);
        console.log('Function call - display verse:', verse);
        this.onVerseDetected(verse, { method: 'explicit' });
      } catch (error) {
        console.error('Error parsing function call arguments:', error);
      }
    } else if (name === 'suggest_verse_from_description') {
      try {
        const params = JSON.parse(args);
        const verse = await BibleParser.getVerse(params.book, params.chapter, params.verse);
        console.log('Function call - suggest verse from description:', {
          verse,
          description: params.description,
          confidence: params.confidence
        });
        
        if (verse) {
          this.onVerseDetected(verse, { 
            method: 'description',
            description: params.description,
            confidence: params.confidence
          });
        }
      } catch (error) {
        console.error('Error parsing suggest verse arguments:', error);
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
