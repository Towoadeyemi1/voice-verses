// Runs a WAV through several on-device engines; writes final transcript
// segments with timestamps and the real-time factor for each.
const sherpa = require('sherpa-onnx-node');
const fs = require('fs');
// Models from https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models, extracted into MODELS
const M = process.env.MODELS || 'models';
const [, , wavPath, outPath, only] = process.argv;
const wave = sherpa.readWave(wavPath);
const SR = wave.sampleRate;
const duration = wave.samples.length / SR;
const THREADS = 4;

const BOOKS = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','First Samuel','Second Samuel','First Kings','Second Kings','First Chronicles','Second Chronicles','Ezra','Nehemiah','Esther','Job','Psalm','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','First Corinthians','Second Corinthians','Galatians','Ephesians','Philippians','Colossians','First Thessalonians','Second Thessalonians','First Timothy','Second Timothy','Titus','Philemon','Hebrews','James','First Peter','Second Peter','First John','Second John','Third John','Jude','Revelation','Chapter','Verse'];
const hotwordsFile = 'hotwords.txt';
fs.writeFileSync(hotwordsFile, BOOKS.map((b) => b.toUpperCase()).join('\n') + '\n');

function streaming(dir, files, { hotwords = false } = {}) {
  const recognizer = new sherpa.OnlineRecognizer({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      transducer: { encoder: `${dir}/${files.encoder}`, decoder: `${dir}/${files.decoder}`, joiner: `${dir}/${files.joiner}` },
      tokens: `${dir}/tokens.txt`, numThreads: THREADS, provider: 'cpu', debug: 0,
      ...(hotwords && { modelingUnit: 'bpe', bpeVocab: process.env.BPE_VOCAB || 'bpe.vocab' }),
    },
    decodingMethod: hotwords ? 'modified_beam_search' : 'greedy_search',
    maxActivePaths: 4,
    enableEndpoint: 1, rule1MinTrailingSilence: 2.4, rule2MinTrailingSilence: 0.8, rule3MinUtteranceLength: 20,
    ...(hotwords && { hotwordsFile, hotwordsScore: 2.0 }),
  });
  return (samples) => {
    const stream = recognizer.createStream();
    const segments = []; const chunk = SR / 10; let compute = 0;
    for (let i = 0; i < samples.length; i += chunk) {
      stream.acceptWaveform({ samples: samples.subarray(i, i + chunk), sampleRate: SR });
      const t0 = performance.now();
      while (recognizer.isReady(stream)) recognizer.decode(stream);
      const ended = recognizer.isEndpoint(stream);
      compute += performance.now() - t0;
      if (ended) {
        const text = recognizer.getResult(stream).text.trim();
        if (text) segments.push({ text, at: Math.min(i + chunk, samples.length) / SR });
        recognizer.reset(stream);
      }
    }
    stream.inputFinished();
    while (recognizer.isReady(stream)) recognizer.decode(stream);
    const text = recognizer.getResult(stream).text.trim();
    if (text) segments.push({ text, at: samples.length / SR });
    return { segments, compute };
  };
}

function withVad(modelConfig) {
  const recognizer = new sherpa.OfflineRecognizer({ featConfig: { sampleRate: 16000, featureDim: 80 }, modelConfig: { ...modelConfig, numThreads: THREADS, provider: 'cpu', debug: 0 } });
  return (samples) => {
    const vad = new sherpa.Vad({ sileroVad: { model: `${M}/silero_vad.onnx`, threshold: Number(process.env.VAD_T || 0.7), minSpeechDuration: 0.25, minSilenceDuration: Number(process.env.VAD_S || 0.25), windowSize: 512, maxSpeechDuration: Number(process.env.VAD_M || 8) }, sampleRate: SR, numThreads: 1 }, 60);
    const segments = []; let compute = 0;
    const drain = (now) => {
      while (!vad.isEmpty()) {
        const seg = vad.front(); vad.pop();
        const t0 = performance.now();
        const stream = recognizer.createStream();
        // Pre-roll: the detector reacts a little late, so include audio just before the segment
        const PRE = Math.round(Number(process.env.PREROLL ?? 0.3) * SR);
        const from = Math.max(0, seg.start - PRE);
        const padded = samples.subarray(from, seg.start + seg.samples.length);
        stream.acceptWaveform({ samples: padded, sampleRate: SR });
        recognizer.decode(stream);
        const text = recognizer.getResult(stream).text.trim();
        const ms = performance.now() - t0; compute += ms;
        if (text) segments.push({ text, at: now + ms / 1000 });
      }
    };
    for (let i = 0; i < samples.length; i += 512) {
      const t0 = performance.now();
      vad.acceptWaveform(samples.subarray(i, i + 512));
      compute += performance.now() - t0;
      drain(Math.min(i + 512, samples.length) / SR);
    }
    vad.flush(); drain(samples.length / SR);
    return { segments, compute };
  };
}

const z = `${M}/sherpa-onnx-streaming-zipformer-en-2023-06-26`;
const zf = { encoder: 'encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx', decoder: 'decoder-epoch-99-avg-1-chunk-16-left-128.onnx', joiner: 'joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx' };
const z20 = `${M}/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17`;
const z20f = { encoder: 'encoder-epoch-99-avg-1.int8.onnx', decoder: 'decoder-epoch-99-avg-1.onnx', joiner: 'joiner-epoch-99-avg-1.int8.onnx' };
const mb = `${M}/sherpa-onnx-moonshine-base-en-int8`;
const wb = `${M}/sherpa-onnx-whisper-base.en`;
const ws = `${M}/sherpa-onnx-whisper-small.en`;
const pk = `${M}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8`;

const engines = {
  'zipformer-streaming': () => streaming(z, zf),
  'zipformer-streaming+hotwords': () => streaming(z, zf, { hotwords: true }),
  'zipformer-20M-streaming': () => streaming(z20, z20f),
  'moonshine-base+vad': () => withVad({ moonshine: { preprocessor: `${mb}/preprocess.onnx`, encoder: `${mb}/encode.int8.onnx`, uncachedDecoder: `${mb}/uncached_decode.int8.onnx`, cachedDecoder: `${mb}/cached_decode.int8.onnx` }, tokens: `${mb}/tokens.txt` }),
  'whisper-base.en+vad': () => withVad({ whisper: { encoder: `${wb}/base.en-encoder.int8.onnx`, decoder: `${wb}/base.en-decoder.int8.onnx`, language: 'en', task: 'transcribe' }, tokens: `${wb}/base.en-tokens.txt` }),
  'whisper-small.en+vad': () => withVad({ whisper: { encoder: `${ws}/small.en-encoder.int8.onnx`, decoder: `${ws}/small.en-decoder.int8.onnx`, language: 'en', task: 'transcribe' }, tokens: `${ws}/small.en-tokens.txt` }),
  'parakeet-tdt-0.6b+vad': () => withVad({ transducer: { encoder: `${pk}/encoder.int8.onnx`, decoder: `${pk}/decoder.int8.onnx`, joiner: `${pk}/joiner.int8.onnx` }, tokens: `${pk}/tokens.txt`, modelType: 'nemo_transducer' }),
};

const results = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
for (const [name, make] of Object.entries(engines)) {
  if (only && !name.includes(only)) continue;
  try {
    const run = make();
    const t0 = performance.now();
    const { segments, compute } = run(wave.samples);
    const wall = (performance.now() - t0) / 1000;
    results[name] = { rtf: compute / 1000 / duration, wall, segments };
    console.log(`${name}: rtf=${(compute / 1000 / duration).toFixed(3)} segments=${segments.length}`);
  } catch (e) {
    console.log(`${name}: FAILED ${e.message}`);
  }
  fs.writeFileSync(outPath, JSON.stringify(results, null, 1));
}
