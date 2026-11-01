// On-device speech recognition, run in an Electron utility process so model
// loading and decoding never block the app window.
//
// Voice activity detection (Silero) cuts the audio into utterances, each of
// which is transcribed by NVIDIA Parakeet TDT (via sherpa-onnx). While someone
// is speaking, the utterance so far is transcribed every half second as a
// partial result. Settings come from tools/speech-eval (docs/speech-engine-evaluation.md).
const sherpa = require('sherpa-onnx-node');
const os = require('os');
const path = require('path');

const SAMPLE_RATE = 16000;
const WINDOW = 512; // Silero VAD frame size at 16 kHz
const PRE_ROLL = Math.round(0.3 * SAMPLE_RATE); // VAD reacts late; keep the start of the first word
// Audio between partial results: half a second (1.11.0; was 1 s), so a reference or the next verse
// is seen sooner. The guard in emitPartial() still keeps partials under about a third of the CPU.
const PARTIAL_INTERVAL = SAMPLE_RATE / 2;
const HISTORY = 12 * SAMPLE_RATE; // longest utterance (8 s) + pre-roll, with margin
// Partial results are skipped while the recogniser is this far behind the live audio,
// so on a busy computer (e.g. running Logic too) it catches up instead of falling further behind
const MAX_LAG = 0.4;

let recognizer = null;
let vadModel = null;
const sessions = new Map();

const post = (message) => process.parentPort.postMessage(message);

function load(modelDir) {
  if (recognizer) return;
  const asr = path.join(modelDir, 'asr');
  recognizer = new sherpa.OfflineRecognizer({
    featConfig: { sampleRate: SAMPLE_RATE, featureDim: 80 },
    modelConfig: {
      transducer: {
        encoder: path.join(asr, 'encoder.int8.onnx'),
        decoder: path.join(asr, 'decoder.int8.onnx'),
        joiner: path.join(asr, 'joiner.int8.onnx'),
      },
      tokens: path.join(asr, 'tokens.txt'),
      modelType: 'nemo_transducer',
      numThreads: Math.max(1, Math.min(4, os.cpus().length - 1)),
      provider: 'cpu',
      debug: 0,
    },
  });
  vadModel = path.join(modelDir, 'vad', 'silero_vad.onnx');
}

function transcribe(samples) {
  const stream = recognizer.createStream();
  stream.acceptWaveform({ samples, sampleRate: SAMPLE_RATE });
  recognizer.decode(stream);
  return recognizer.getResult(stream).text.trim();
}

class Session {
  constructor(id, mode) {
    this.id = id;
    this.mode = mode; // 'live' (microphone) or 'file' (recording, as fast as possible)
    this.vad = new sherpa.Vad(
      {
        sileroVad: {
          model: vadModel,
          threshold: 0.7,
          minSilenceDuration: 0.25,
          minSpeechDuration: 0.25,
          maxSpeechDuration: 8,
          windowSize: WINDOW,
        },
        sampleRate: SAMPLE_RATE,
        numThreads: 1,
      },
      30,
    );
    this.history = new Float32Array(HISTORY); // ring buffer of recent audio
    this.total = 0; // samples received
    this.pending = new Float32Array(0);
    this.speechStart = null;
    this.lastPartialAt = 0;
    this.partialInterval = PARTIAL_INTERVAL;
    this.clock = null; // wall-clock time at which sample 0 would have arrived (live audio)
  }

  /** Seconds the recogniser is behind the live audio (0 for recordings). */
  lag() {
    if (this.mode !== 'live') return 0;
    const audioTime = this.total / SAMPLE_RATE;
    const now = Date.now() / 1000;
    // Audio arrives in real time, so the earliest arrival seen sets the clock
    if (this.clock === null || now - audioTime < this.clock) this.clock = now - audioTime;
    return now - (this.clock + audioTime);
  }

  remember(samples) {
    for (let i = 0; i < samples.length; i++) {
      this.history[(this.total + i) % HISTORY] = samples[i];
    }
    this.total += samples.length;
  }

  /** Audio from absolute sample `from` up to now (limited to the ring buffer). */
  recent(from) {
    const start = Math.max(from, this.total - HISTORY, 0);
    const out = new Float32Array(this.total - start);
    for (let i = 0; i < out.length; i++) out[i] = this.history[(start + i) % HISTORY];
    return out;
  }

  accept(samples) {
    const joined = new Float32Array(this.pending.length + samples.length);
    joined.set(this.pending);
    joined.set(samples, this.pending.length);

    let offset = 0;
    for (; offset + WINDOW <= joined.length; offset += WINDOW) {
      const frame = joined.subarray(offset, offset + WINDOW);
      this.remember(frame);
      this.vad.acceptWaveform(frame);
      this.emitSegments();
      this.emitPartial();
    }
    this.pending = joined.slice(offset);
  }

  emitSegments() {
    while (!this.vad.isEmpty()) {
      // Copy the samples: Electron doesn't allow native code to hand over external buffers
      const segment = this.vad.front(false);
      this.vad.pop();
      const from = Math.max(0, segment.start - PRE_ROLL);
      const audio = this.recent(from).subarray(0, segment.start + segment.samples.length - from);
      const text = transcribe(audio.length ? audio : segment.samples);
      this.speechStart = null;
      if (text) {
        post({
          type: 'final',
          session: this.id,
          text,
          start: segment.start / SAMPLE_RATE,
          end: (segment.start + segment.samples.length) / SAMPLE_RATE,
        });
      }
    }
  }

  emitPartial() {
    if (this.mode !== 'live') return;
    if (!this.vad.isDetected()) {
      this.speechStart = null;
      return;
    }
    if (this.speechStart === null) {
      this.speechStart = Math.max(0, this.total - PRE_ROLL - WINDOW * 8);
      this.lastPartialAt = this.total;
      return;
    }
    if (this.total - this.lastPartialAt < this.partialInterval) return;
    if (this.lag() > MAX_LAG) return; // behind: the final result will cover these words
    this.lastPartialAt = this.total;
    const started = Date.now();
    const text = transcribe(this.recent(this.speechStart));
    // Partials never take more than about a third of the computer's time
    const took = ((Date.now() - started) / 1000) * SAMPLE_RATE;
    this.partialInterval = Math.max(0.8 * PARTIAL_INTERVAL, Math.min(6 * PARTIAL_INTERVAL, 3 * took));
    if (text) post({ type: 'partial', session: this.id, text });
  }

  finish() {
    this.vad.flush();
    this.emitSegments();
  }
}

process.parentPort.on('message', ({ data }) => {
  try {
    switch (data.type) {
      case 'load':
        load(data.modelDir);
        post({ type: 'loaded' });
        break;
      case 'start':
        sessions.set(data.session, new Session(data.session, data.mode));
        break;
      case 'audio': {
        const session = sessions.get(data.session);
        if (!session) break;
        session.accept(data.samples);
        if (session.mode === 'file') {
          post({ type: 'progress', session: data.session, seconds: session.total / SAMPLE_RATE });
        }
        break;
      }
      case 'finish': {
        const session = sessions.get(data.session);
        session?.finish();
        sessions.delete(data.session);
        post({ type: 'done', session: data.session });
        break;
      }
      case 'stop':
        sessions.delete(data.session);
        break;
    }
  } catch (error) {
    post({ type: 'error', session: data.session, message: error instanceof Error ? error.message : String(error) });
  }
});
