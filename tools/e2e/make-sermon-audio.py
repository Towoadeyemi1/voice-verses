# Speaks a short test sermon with Piper TTS into one 16 kHz WAV for the fake microphone.
#   pip install piper-tts
#   download a voice, e.g. en_US-lessac-medium.onnx (+ .onnx.json) from huggingface.co/rhasspy/piper-voices
#   python tools/e2e/make-sermon-audio.py path/to/en_US-lessac-medium.onnx  out.wav  [sermon|chapter]
# 'chapter' (for chapter.cjs): a chapter called without a verse, a verse of it read, "verse 6", then a
# story told in the preacher's own words and "help me find it".
# Text is KJV, a public-domain hymn, and words written for the test only.
import subprocess, sys, wave, tempfile, os

voice, out = sys.argv[1], sys.argv[2]
script = sys.argv[3] if len(sys.argv) > 3 else 'sermon'
LINES = [
    'Good morning church. Let us read John chapter 5 verses 8 to 13.',
    'Jesus saith unto him, Rise, take up thy bed, and walk.',
    'And immediately the man was made whole, and took up his bed, and walked: and on the same day was the sabbath.',
    'The Jews therefore said unto him that was cured, It is the sabbath day: it is not lawful for thee to carry thy bed.',
    'Now listen church. Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.',
    'Let us stand and worship.',
    'Amazing grace how sweet the sound, that saved a wretch like me.',
    'I once was lost, but now am found, was blind but now I see.',
    "'Twas grace that taught my heart to fear, and grace my fears relieved.",
]
CHAPTER = [
    'There is a word for us this morning somewhere in Isaiah chapter 53.',
    'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.',
    'Now look at verse 6 with me.',
    'Church, you know Zacchaeus. He was a tax collector, too short to see over the crowd, so he ran ahead and climbed up into a sycamore tree.',
    'Somebody help me find it.',
]
if script == 'chapter':
    LINES = CHAPTER
frames, params = b'', None
with tempfile.TemporaryDirectory() as tmp:
    for i, line in enumerate(LINES):
        part = os.path.join(tmp, f'{i}.wav')
        subprocess.run(['piper', '--model', voice, '--output_file', part, '--length_scale', '1.1'], input=line.encode(), check=True, capture_output=True)
        with wave.open(part) as w:
            params = w.getparams(); frames += w.readframes(w.getnframes())
        frames += b'\x00\x00' * int(params.framerate * 1.2)  # a pause between sentences
with wave.open(out, 'wb') as o:
    o.setparams(params); o.writeframes(frames)
print(f'{out}: {len(frames) / 2 / params.framerate:.1f} s')
