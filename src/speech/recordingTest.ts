import { desktop, SpeechWorkerEvent } from '@/lib/desktop';
import { BibleVerse } from '@/types/bible';
import { VerseDetectionController } from './VerseDetectionController';

/**
 * Runs a recorded sermon through the built-in speech engine and the verse
 * detector, faster than real time, so a church can check what would have been
 * put on screen.
 */

export interface RecordingSegment {
  start: number;
  end: number;
  text: string;
  verse?: BibleVerse;
}

const SAMPLE_RATE = 16000;
const CHUNK_SECONDS = 15;

/** Decode any format the browser can play (MP3, M4A, WAV…) to 16 kHz mono. */
async function decodeToMono16k(file: File): Promise<Float32Array> {
  // decodeAudioData resamples to the context's rate
  const context = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const audio = await context.decodeAudioData(await file.arrayBuffer());
  if (audio.numberOfChannels === 1) return audio.getChannelData(0);
  const mono = new Float32Array(audio.length);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const channel = audio.getChannelData(c);
    for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / audio.numberOfChannels;
  }
  return mono;
}

export async function testRecording(
  file: File,
  onProgress: (fraction: number) => void,
  onSegment: (segment: RecordingSegment) => void,
): Promise<{ duration: number }> {
  if (!desktop) throw new Error('Testing recordings needs the desktop app.');

  onProgress(0);
  const samples = await decodeToMono16k(file);
  const duration = samples.length / SAMPLE_RATE;

  // Every final segment counts; the live debounce would hide verses at this speed
  let pending: RecordingSegment | null = null;
  const detector = new VerseDetectionController({
    onVerseDetected: (verse) => {
      if (pending) pending.verse = verse;
    },
    debounceMs: 0,
    dedupeWindowMs: 0,
  });
  detector.setEngine('builtin');

  const session = await desktop.speech.start('file');
  let resolveNext: (() => void) | null = null;
  let fail: ((error: Error) => void) | null = null;
  // Segments are checked one after another so each verse lands on its own segment
  let queue = Promise.resolve();

  const unsubscribe = desktop.speech.onEvent((event: SpeechWorkerEvent) => {
    if ('session' in event && event.session !== session) return;
    if (event.type === 'final') {
      queue = queue.then(async () => {
        pending = { start: event.start, end: event.end, text: event.text };
        const segment = pending;
        await detector.onTranscript(event.text, true);
        onSegment(segment);
      });
    } else if (event.type === 'progress' || event.type === 'done') {
      if (event.type === 'progress') onProgress(Math.min(1, event.seconds / duration));
      resolveNext?.();
    } else if (event.type === 'error') {
      fail?.(new Error(event.message));
    }
  });

  const waitForWorker = () =>
    new Promise<void>((resolve, reject) => {
      resolveNext = resolve;
      fail = reject;
    });

  try {
    // One chunk at a time, so the worker's queue (and memory) stays small
    const chunk = CHUNK_SECONDS * SAMPLE_RATE;
    for (let offset = 0; offset < samples.length; offset += chunk) {
      const next = waitForWorker();
      desktop.speech.sendAudio(session, samples.slice(offset, offset + chunk));
      await next;
    }
    const done = waitForWorker();
    desktop.speech.finish(session);
    await done;
    await queue;
    onProgress(1);
    return { duration };
  } finally {
    unsubscribe();
  }
}
