import { BibleVerse } from '@/types/bible';
import { BibleParser } from './bibleParser';

export class RealtimeAPI {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioQueue | null = null;
  private sessionReady: boolean = false;
  
  constructor(
    private apiKey: string,
    private onTranscript: (text: string) => void,
    private onVerseDetected: (verse: BibleVerse | null) => void
  ) {}

  connect() {
    console.log('Connecting to OpenAI Realtime API...');
    
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.audioQueue = new AudioQueue(this.audioContext);
    
    this.ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
      ['realtime', `openai-insecure-api-key.${this.apiKey}`, 'openai-beta.realtime-v1']
    );

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data.type, data);

      switch (data.type) {
        case 'session.created':
          console.log('Session created, sending session.update...');
          this.sendSessionConfig();
          break;

        case 'session.updated':
          console.log('Session configured successfully');
          this.sessionReady = true;
          break;

        case 'input_audio_buffer.speech_started':
          console.log('Speech started');
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('Speech stopped');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          console.log('Transcript:', data.transcript);
          this.onTranscript(data.transcript);
          this.processTranscript(data.transcript);
          break;

        case 'response.audio.delta':
          if (data.delta && this.audioQueue) {
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            await this.audioQueue.addToQueue(bytes);
          }
          break;

        case 'response.function_call_arguments.done':
          console.log('Function call:', data.name, data.arguments);
          this.handleFunctionCall(data.name, data.arguments);
          break;

        case 'error':
          console.error('API Error:', data.error);
          break;
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.sessionReady = false;
    };
  }

  private sendSessionConfig() {
    const config = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful assistant for a Bible projection system. When the user mentions a Bible verse, call the display_verse function. Be brief and acknowledge verse displays.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        },
        tools: [
          {
            type: 'function',
            name: 'display_verse',
            description: 'Display a Bible verse on the projection screen. Call this when the user mentions any Bible reference.',
            parameters: {
              type: 'object',
              properties: {
                book: { type: 'string', description: 'Bible book name (e.g., John, Genesis, Psalm)' },
                chapter: { type: 'number', description: 'Chapter number' },
                verse: { type: 'number', description: 'Verse number' }
              },
              required: ['book', 'chapter', 'verse']
            }
          }
        ],
        tool_choice: 'auto',
        temperature: 0.8
      }
    };

    console.log('Sending session config:', config);
    this.send(config);
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

  sendAudio(audioData: Float32Array) {
    if (!this.sessionReady || !this.ws) {
      console.warn('Session not ready, skipping audio chunk');
      return;
    }

    const int16Array = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64 = btoa(binary);

    this.send({
      type: 'input_audio_buffer.append',
      audio: base64
    });
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.sessionReady = false;
  }
}

class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;

  constructor(private audioContext: AudioContext) {}

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = this.createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer as ArrayBuffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext();
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer as ArrayBuffer), wavHeader.byteLength);
    
    return wavArray;
  }
}
