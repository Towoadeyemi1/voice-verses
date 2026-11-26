# The guide's voice

What the guide says in Training's lessons and the demo is recorded ahead of time in one natural voice, so nothing has to be made while Voice Verses runs (D37). The recordings are `public/voice/<id>.mp3`, listed in `src/lib/voice-lines.json`; the app plays them sentence by sentence (`src/lib/voiceLines.ts`, `speak()` in `src/lib/guide.ts`).

The guide is heard only in a lesson or the demo, after **Hear the guide?** is answered **Play the voice**, each time, and never while a service is on.

## After changing what the guide says

```sh
npm run models                    # the speech recognition, once
node tools/voice/record.cjs       # records what is new or changed; removes what is no longer said
```

- Each sentence gets up to 8 takes. A take starts with a throwaway "Okay." (the voice mumbles as it starts), cut off at the pause after it, and is kept only when Voice Verses' own speech recognition hears the sentence word for word and its length is natural.
- A sentence not heard word for word after 8 takes is listed: listen to it, or reword the line. Short sentences of plain words work best. Write spoken lines with full stops and commas: a colon or dash is said as a full stop or comma (`spokenForm`).
- `--only=<words>` records again only the sentences containing those words; `--all` records everything again.
- A line made while the app runs needs its possible wordings listed so they are recorded: `sayings` on a lesson step, `spoken` on a narration.
- CI check 8b (`tools/voice/check-lines.ts`) fails when a line of the lessons or the demo has no recording.

Needs ffmpeg. The voice model (`sherpa-onnx-pocket-tts-int8-2026-01-26`, about 100 MB) is downloaded to `~/.cache/voice-verses/` the first time (or set `VOICE_MODEL_DIR`); it is not shipped.

## Credits

- **Pocket TTS** by Kyutai (kyutai.org), weights under CC BY 4.0, in the ONNX export run by sherpa-onnx (Apache 2.0).
- **The voice:** `unmute-prod-website/developer-1` from Kyutai's `tts-voices` (huggingface.co/kyutai/tts-voices), one of Kyutai's own recordings, shared under CC0. Copied here as `voice-c.wav` (the owner's pick, "voice C", 26 Nov 2026).
