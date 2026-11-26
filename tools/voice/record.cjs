// Records the guide's lines in its voice (1.19.13): each sentence of every line the guide says
// in Training and the demo (tools/voice/lines.ts) is spoken by Kyutai's Pocket TTS, copying the
// voice in voice-c.wav (CC0), and kept only when Voice Verses' own speech recognition hears
// every word and its length is natural. Up to 8 takes a sentence (each comes out a little
// differently). Writes public/voice/<id>.mp3 and src/lib/voice-lines.json.
//
//   npm run models                       (the speech recognition, once)
//   node tools/voice/record.cjs          (records what is new or changed)
//   node tools/voice/record.cjs --all    (records everything again)
//
// Needs ffmpeg. The voice model (about 100 MB, not shipped) is downloaded to
// ~/.cache/voice-verses/ the first time, or set VOICE_MODEL_DIR.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const esbuild = require('esbuild');
const sherpa = require('sherpa-onnx-node');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'public/voice');
const MANIFEST = path.join(ROOT, 'src/lib/voice-lines.json');
const ASR = path.join(ROOT, 'resources/models/asr');
const MODEL_NAME = 'sherpa-onnx-pocket-tts-int8-2026-01-26';
const MODEL_DIR = process.env.VOICE_MODEL_DIR || path.join(os.homedir(), '.cache/voice-verses', MODEL_NAME);
const TAKES = Number((process.argv.find((a) => a.startsWith('--takes=')) ?? '').slice(8)) || 8;
const all = process.argv.includes('--all');
/** --only=<words>: record again only the sentences containing them */
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).toLowerCase();
/**
 * The voice mumbles as it starts ("Um", "I'll"), so each take begins with a throwaway word
 * and is cut at the pause after it; what is left must be heard as the sentence exactly.
 */
const LEAD = 'Okay.';

// The lines and the helpers the app uses (one source of truth)
const bundle = path.join(os.tmpdir(), 'vv-voice-lines.cjs');
esbuild.buildSync({ entryPoints: [path.join(__dirname, 'lines-entry.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const { guideSentences, lineId, spokenForm } = require(bundle);

if (!fs.existsSync(path.join(MODEL_DIR, 'lm_main.int8.onnx'))) {
  console.log(`Downloading the voice model (${MODEL_NAME}, about 100 MB)…`);
  fs.mkdirSync(path.dirname(MODEL_DIR), { recursive: true });
  const archive = `${MODEL_DIR}.tar.bz2`;
  execFileSync('curl', ['-sSL', '-o', archive, `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${MODEL_NAME}.tar.bz2`], { stdio: 'inherit' });
  execFileSync('tar', ['-xjf', archive, '-C', path.dirname(MODEL_DIR)], { stdio: 'inherit' });
  fs.rmSync(archive, { force: true });
}
if (!fs.existsSync(path.join(ASR, 'encoder.int8.onnx'))) {
  console.error('The speech recognition models are missing: run npm run models first.');
  process.exit(1);
}

const tts = new sherpa.OfflineTts({
  model: {
    pocket: {
      lmFlow: path.join(MODEL_DIR, 'lm_flow.int8.onnx'),
      lmMain: path.join(MODEL_DIR, 'lm_main.int8.onnx'),
      encoder: path.join(MODEL_DIR, 'encoder.onnx'),
      decoder: path.join(MODEL_DIR, 'decoder.int8.onnx'),
      textConditioner: path.join(MODEL_DIR, 'text_conditioner.onnx'),
      vocabJson: path.join(MODEL_DIR, 'vocab.json'),
      tokenScoresJson: path.join(MODEL_DIR, 'token_scores.json'),
    },
    numThreads: Math.max(1, Math.min(4, os.cpus().length)),
  },
  maxNumSentences: 1,
});
const voice = sherpa.readWave(path.join(__dirname, 'voice-c.wav'));
const recognizer = new sherpa.OfflineRecognizer({
  featConfig: { sampleRate: 16000, featureDim: 80 },
  modelConfig: {
    transducer: { encoder: path.join(ASR, 'encoder.int8.onnx'), decoder: path.join(ASR, 'decoder.int8.onnx'), joiner: path.join(ASR, 'joiner.int8.onnx') },
    tokens: path.join(ASR, 'tokens.txt'),
    modelType: 'nemo_transducer',
    numThreads: 2,
  },
});

/** Words to compare: lower case, numbers kept ("3:16" → 3 16), sound-alikes the recogniser spells its own way */
const SAME = { versus: 'verses', q: 'cue', queue: 'cue', qs: 'cues', queues: 'cues' };
const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
NUMBERS.forEach((n, i) => (SAME[n] = String(i)));
const words = (text) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    // Names the recogniser hears as two words
    .replace(/\bsong ?select\b/g, 'songselect')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => SAME[w] ?? w);

/** Word errors between what should be said and what was heard (edit distance on words) */
function errors(want, got) {
  const a = words(want);
  const b = words(got);
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** What the speech recognition hears, with half a second of quiet either side (it misses a word that starts at once) */
function hear(samples, sampleRate) {
  const quiet = new Float32Array(Math.round(sampleRate * 0.5));
  const padded = new Float32Array(quiet.length * 2 + samples.length);
  padded.set(samples, quiet.length);
  const stream = recognizer.createStream();
  stream.acceptWaveform({ samples: padded, sampleRate });
  recognizer.decode(stream);
  return recognizer.getResult(stream).text;
}

/** Cuts off the throwaway word: everything up to the end of the first pause of 150 ms or more after it */
function afterLead(samples, sampleRate) {
  const frame = Math.round(sampleRate * 0.01);
  const level = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let peak = 0;
    for (let j = i; j < i + frame; j++) peak = Math.max(peak, Math.abs(samples[j]));
    level.push(peak);
  }
  const loud = (v) => v > 0.02;
  let i = 0;
  while (i < level.length && !loud(level[i])) i++; // quiet before the word
  const start = i;
  while (i < level.length && (loud(level[i]) || i - start < 15)) i++; // the word itself (at least 150 ms)
  let quiet = 0;
  for (; i < level.length; i++) {
    // "Okay." is short: a pause found much later is a pause inside the sentence (at a comma)
    if (i - start > 110) return null;
    if (!loud(level[i])) quiet++;
    else if (quiet >= 15) return samples.slice(Math.max(0, (i - 8) * frame));
    else quiet = 0;
  }
  return null;
}

/** Trims silence at the ends, keeping 100 ms (a soft first sound like the P of "Press" stays) */
function trim(samples, sampleRate) {
  const loud = (v) => Math.abs(v) > 0.006;
  let a = 0;
  let b = samples.length - 1;
  while (a < b && !loud(samples[a])) a++;
  while (b > a && !loud(samples[b])) b--;
  const keep = Math.round(sampleRate * 0.1);
  return samples.slice(Math.max(0, a - keep), Math.min(samples.length, b + keep));
}

function save(samples, sampleRate, file) {
  const wav = path.join(os.tmpdir(), 'vv-voice-take.wav');
  sherpa.writeWave(wav, { samples, sampleRate });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '24000', '-b:a', '48k', file]);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const sentences = guideSentences();
const keep = new Set(sentences.map((s) => lineId(s.sentence)));
const doubtful = [];
let recorded = 0;

for (const { sentence, from } of sentences) {
  const id = lineId(sentence);
  const file = `${id}.mp3`;
  const have = manifest.lines[id];
  if (only ? !sentence.toLowerCase().includes(only) : !all && have && have.text === sentence && fs.existsSync(path.join(OUT, file))) continue;
  const spoken = spokenForm(sentence);
  const expected = 0.3 + words(spoken).length * 0.36;
  let best = null;
  for (let take = 1; take <= TAKES; take++) {
    const a = tts.generate({ text: `${LEAD} ${spoken}`, sid: 0, speed: 1, generationConfig: { referenceAudio: voice.samples, referenceSampleRate: voice.sampleRate } });
    const cut = afterLead(a.samples, a.sampleRate);
    if (!cut) continue;
    const samples = trim(cut, a.sampleRate);
    const seconds = samples.length / a.sampleRate;
    const natural = seconds >= expected * 0.45 && seconds <= expected * 1.9 + 0.6;
    const heard = hear(samples, a.sampleRate);
    const wrong = errors(spoken, heard) + (natural ? 0 : 5);
    if (!best || wrong < best.wrong) best = { samples, sampleRate: a.sampleRate, seconds, heard, wrong, take };
    if (wrong === 0) break;
  }
  if (!best) {
    doubtful.push({ sentence, from, heard: '(no take could be cut cleanly)' });
    console.log(`CHECK  ${sentence}  (no take could be cut cleanly)`);
    continue;
  }
  save(best.samples, best.sampleRate, path.join(OUT, file));
  manifest.lines[id] = { text: sentence, file, ms: Math.round(best.seconds * 1000) };
  recorded++;
  const mark = best.wrong === 0 ? 'ok ' : 'CHECK';
  console.log(`${mark}  ${sentence}  (take ${best.take}, ${best.seconds.toFixed(1)} s${best.wrong ? `; heard “${best.heard}”` : ''})`);
  if (best.wrong) doubtful.push({ sentence, from, heard: best.heard });
}

// Recordings of lines the guide no longer says
for (const id of Object.keys(manifest.lines))
  if (!keep.has(id)) {
    fs.rmSync(path.join(OUT, manifest.lines[id].file), { force: true });
    delete manifest.lines[id];
  }
manifest.lines = Object.fromEntries(Object.entries(manifest.lines).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\n${recorded} recorded, ${sentences.length} sentences in all.`);
if (doubtful.length) {
  console.log(`\n${doubtful.length} not heard word for word after ${TAKES} takes. Listen to them, or reword the line:`);
  for (const d of doubtful) console.log(`  “${d.sentence}” (${d.from}): heard “${d.heard}”`);
  process.exit(2);
}
