// Downloads the on-device speech models into resources/models, which the
// desktop installer bundles (package.json → build.extraResources).
// Run automatically before desktop builds; safe to re-run (skips existing files).
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const RELEASES = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models';
const ASR = 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8';
const ASR_FILES = ['encoder.int8.onnx', 'decoder.int8.onnx', 'joiner.int8.onnx', 'tokens.txt'];
const OUT = join(process.cwd(), 'resources', 'models');

async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(file));
}

mkdirSync(join(OUT, 'asr'), { recursive: true });

if (!existsSync(join(OUT, 'vad', 'silero_vad.onnx'))) {
  mkdirSync(join(OUT, 'vad'), { recursive: true });
  console.log('Downloading Silero VAD…');
  await download(`${RELEASES}/silero_vad.onnx`, join(OUT, 'vad', 'silero_vad.onnx'));
}

if (!ASR_FILES.every((f) => existsSync(join(OUT, 'asr', f)))) {
  const archive = join(OUT, `${ASR}.tar.bz2`);
  console.log(`Downloading ${ASR} (~480 MB)…`);
  await download(`${RELEASES}/${ASR}.tar.bz2`, archive);
  console.log('Extracting…');
  // bsdtar on macOS/Windows and GNU tar on Linux all read .tar.bz2
  execFileSync('tar', ['-xjf', archive, '-C', OUT, ...ASR_FILES.map((f) => `${ASR}/${f}`)], { stdio: 'inherit' });
  for (const f of ASR_FILES) renameSync(join(OUT, ASR, f), join(OUT, 'asr', f));
  rmSync(join(OUT, ASR), { recursive: true, force: true });
  rmSync(archive, { force: true });
}

writeFileSync(
  join(OUT, 'NOTICE.txt'),
  [
    'Speech recognition: NVIDIA Parakeet TDT 0.6B v2 (int8 ONNX export by the sherpa-onnx project).',
    'Licensed under CC-BY-4.0: https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2',
    'Voice activity detection: Silero VAD, MIT License: https://github.com/snakers4/silero-vad',
    'Runtime: sherpa-onnx, Apache License 2.0: https://github.com/k2-fsa/sherpa-onnx',
    '',
  ].join('\n'),
);
console.log(`Models ready in ${OUT}`);
