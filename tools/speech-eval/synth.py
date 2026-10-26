# Synthetic "sermon": test sentences spoken by 5 Piper voices at varied speeds,
# written as clean and room-simulated 16 kHz WAVs plus the ground-truth timeline.
import json, os, subprocess, wave
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

M = os.environ.get('MODELS', 'models'); OUT = 'audio'
os.makedirs(OUT, exist_ok=True)
names = ['vits-piper-en_US-lessac-medium', 'vits-piper-en_US-ryan-medium', 'vits-piper-en_GB-alan-medium', 'vits-piper-en_US-amy-medium', 'vits-piper-en_US-joe-medium']
voices = [PiperVoice.load(f"{M}/{n}/{n.replace('vits-piper-', '')}.onnx") for n in names]
sentences = json.load(open('sentences.json'))
SR = 16000
def resample(x, sr):
    if sr == SR: return x
    n = int(len(x) * SR / sr)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
parts = [np.zeros(SR, np.float32)]; cursor = SR; timeline = []
for i, s in enumerate(sentences):
    v = voices[i % len(voices)]
    cfg = SynthesisConfig(length_scale=[1.0, 1.08, 0.95][i % 3])
    chunks = list(v.synthesize(s['t'], syn_config=cfg))
    audio = np.concatenate([c.audio_float_array for c in chunks])
    audio = resample(audio, chunks[0].sample_rate)
    timeline.append({**s, 'start': cursor / SR, 'end': (cursor + len(audio)) / SR})
    parts.append(audio); cursor += len(audio)
    g = np.zeros(int((0.8 + (i % 4) * 0.3) * SR), np.float32); parts.append(g); cursor += len(g)
allx = np.concatenate(parts)
with wave.open(f'{OUT}/clean.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(allx, -1, 1) * 32767).astype(np.int16).tobytes())
json.dump(timeline, open(f'{OUT}/timeline.json', 'w'), indent=1)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{OUT}/clean.wav', '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.03:sample_rate=16000',
  '-filter_complex', '[0:a]aecho=0.8:0.5:60|120:0.3|0.2,highpass=f=120,lowpass=f=6000,volume=0.8[s];[s][1:a]amix=inputs=2:duration=first:weights=1 1[out]',
  '-map', '[out]', '-ar', '16000', '-ac', '1', '-sample_fmt', 's16', f'{OUT}/room.wav'], check=True)
print('duration', round(cursor / SR, 1), 's')
