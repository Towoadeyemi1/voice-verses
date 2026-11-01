import { desktop, SpeechWorkerEvent } from '@/lib/desktop';
import {
  ISpeechProvider,
  TranscriptCallback,
  VolumeCallback,
  ErrorCallback,
  SpeechEngineType,
} from '../ISpeechProvider';
import { channelCountOf, createChannelCapture, openMicrophone, explainMicrophoneError } from '../audioInput';

interface BuiltInProviderConfig {
  audioDeviceId: string | null;
  audioDeviceName?: string | null;
  /** One channel of a multichannel input (e.g. the pulpit mic in a desk feed), or null */
  audioChannel: number | null;
}

interface BuiltInProviderCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onVolumeUpdate: (volume: number) => void;
  onError: (err: Error) => void;
}

const SAMPLE_RATE = 16000;
const CHUNK = SAMPLE_RATE / 10; // send 100 ms at a time

/**
 * Built-in on-device speech recognition (desktop app only).
 *
 * Captures the microphone at 16 kHz and streams it to the speech worker in the
 * Electron main process (electron/speech), which runs voice activity detection
 * and NVIDIA Parakeet locally. No internet connection or API key is needed.
 */
export class BuiltInSpeechProvider implements ISpeechProvider {
  private session: number | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private unsubscribe: (() => void) | null = null;
  private buffer = new Float32Array(CHUNK);
  private buffered = 0;
  private connected = false;

  private transcriptCallback: TranscriptCallback;
  private volumeCallback: VolumeCallback;
  private errorCallback: ErrorCallback;

  constructor(
    private config: BuiltInProviderConfig,
    callbacks: BuiltInProviderCallbacks,
  ) {
    this.transcriptCallback = callbacks.onTranscript;
    this.volumeCallback = callbacks.onVolumeUpdate;
    this.errorCallback = callbacks.onError;
  }

  static isSupported(): boolean {
    return desktop !== null;
  }

  getEngineType(): SpeechEngineType {
    return 'builtin';
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
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  async init(): Promise<void> {
    if (!desktop) {
      throw new Error('Built-in speech recognition is only available in the Voice Verses desktop app.');
    }
    try {
      this.unsubscribe = desktop.speech.onEvent((event) => this.handleEvent(event));
      // Loads the model on first use (a few seconds)
      this.session = await desktop.speech.start('live');

      this.stream = await openMicrophone({ deviceId: this.config.audioDeviceId, deviceName: this.config.audioDeviceName, channel: this.config.audioChannel });

      // The browser resamples the microphone to the model's 16 kHz
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      const capture = await createChannelCapture(
        this.audioContext,
        source,
        channelCountOf(this.stream),
        this.config.audioChannel ?? 0,
      );
      capture.port.onmessage = (e: MessageEvent<Float32Array>) => this.handleFrame(e.data);

      this.connected = true;
    } catch (error) {
      this.disconnect();
      throw new Error(error instanceof DOMException ? explainMicrophoneError(error) : error instanceof Error ? error.message : 'Could not start built-in speech recognition');
    }
  }

  private handleFrame(frame: Float32Array): void {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    this.volumeCallback?.(Math.min(100, Math.floor(Math.sqrt(sum / frame.length) * 1000)));

    let offset = 0;
    while (offset < frame.length) {
      const n = Math.min(CHUNK - this.buffered, frame.length - offset);
      this.buffer.set(frame.subarray(offset, offset + n), this.buffered);
      this.buffered += n;
      offset += n;
      if (this.buffered === CHUNK && this.session !== null) {
        desktop!.speech.sendAudio(this.session, this.buffer.slice());
        this.buffered = 0;
      }
    }
  }

  private handleEvent(event: SpeechWorkerEvent): void {
    if (event.session !== undefined && event.session !== this.session) return;
    switch (event.type) {
      case 'partial':
        this.transcriptCallback?.(event.text, false);
        break;
      case 'final':
        this.transcriptCallback?.(event.text, true);
        break;
      case 'error':
        this.errorCallback?.(new Error(event.message));
        break;
    }
  }

  disconnect(): void {
    if (this.session !== null) desktop?.speech.stop(this.session);
    this.session = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    this.buffered = 0;
    this.connected = false;
  }
}
