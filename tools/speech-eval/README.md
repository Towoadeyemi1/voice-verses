# Speech engine evaluation

Compares on-device speech engines on how many spoken Bible references the
app's own `VerseDetectionController` finds, how many wrong verses it shows, how
quickly, and how much CPU each needs. Results and the chosen configuration are in
[`docs/speech-engine-evaluation.md`](../../docs/speech-engine-evaluation.md).

```sh
cd tools/speech-eval
npm install sherpa-onnx-node@2.0.0
# Extract models from https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
# (and Piper voices from .../tts-models) into ./models, plus silero_vad.onnx

# 1. Synthetic test audio: sentences.json spoken by 5 voices, clean and with room echo/noise
pip install piper-tts numpy && python synth.py          # → audio/clean.wav, audio/room.wav, audio/timeline.json

# 2. Transcribe with each engine (or pass a name filter as the 3rd argument)
node eval.js audio/room.wav results-room.json

# 3. Score with the app's detector
npx esbuild score.ts --bundle --platform=node --alias:@=../../src --outfile=score.cjs
node score.cjs results-room.json audio/timeline.json "Room audio"
```

To score a real recording, write its `timeline.json` by hand: one entry per
reference with `e` (e.g. `"John 3:16"`) and the `start`/`end` seconds where it
is spoken. The desktop app's **Settings → Speech → Test with a recording** runs
the shipped engine on any recording without this setup.
