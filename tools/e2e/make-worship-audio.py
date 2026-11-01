# Speaks the worship test with Piper TTS into one 16 kHz WAV for the fake microphone:
# a verse and a hint (Predictive Next), a public-domain hymn with the leader's cues,
# then new words that are in no song (spontaneous worship, written for this test).
#   python tools/e2e/make-worship-audio.py path/to/en_US-lessac-medium.onnx out.wav
import subprocess, sys, wave, tempfile, os

voice, out = sys.argv[1], sys.argv[2]
LINES = [
    ('Good morning church. Let us read John chapter 3 verse 16.', 1.2),
    ('For God so loved the world, that he gave his only begotten Son.', 1.2),
    ('And Paul says the same thing in Romans.', 6.0),
    ('Let us stand and worship.', 1.2),
    ('Amazing grace how sweet the sound, that saved a wretch like me.', 1.0),
    ('I once was lost, but now am found, was blind but now I see.', 4.0),
    ('Go to the bridge.', 4.0),
    ('Back to the chorus.', 4.0),
    ('Morning light is breaking over every hill.', 1.0),
    ('Grace upon grace is falling on us here.', 6.0),
    ('We will rest within your mercy.', 1.0),
    ('Your love will hold us all our days.', 4.0),
]
frames, params = b'', None
with tempfile.TemporaryDirectory() as tmp:
    for i, (line, pause) in enumerate(LINES):
        part = os.path.join(tmp, f'{i}.wav')
        subprocess.run(['piper', '--model', voice, '--output_file', part, '--length_scale', '1.1'], input=line.encode(), check=True, capture_output=True)
        with wave.open(part) as w:
            params = w.getparams(); frames += w.readframes(w.getnframes())
        frames += b'\x00\x00' * int(params.framerate * pause)
with wave.open(out, 'wb') as o:
    o.setparams(params); o.writeframes(frames)
print(f'{out}: {len(frames) / 2 / params.framerate:.1f} s')
