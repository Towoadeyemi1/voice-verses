# Speech engine evaluation (October 2026)

Which on-device speech engine should the desktop app ship? Measured by what
matters for Voice Verses: how many spoken Bible references end up on screen, how
many *wrong* verses do, how fast, and how much CPU it needs.

## Method

- **Audio:** 50 sermon-style sentences (`tools/speech-eval/sentences.json`): 42
  references in the forms preachers use ("Turn to First Corinthians chapter
  thirteen verse four", "Romans eight twenty-eight", "Obadiah verse seventeen"),
  plus 8 distractors with numbers but no reference ("the service ends at twelve
  thirty"). Spoken by 5 different synthetic voices (Piper) at varied speeds,
  4 minutes 13 seconds in total.
- **Two conditions:** clean, and "room": echo, band-limited like a PA or lapel
  mic, plus background noise.
- **Scoring:** each engine's transcript is fed through the app's own
  `VerseDetectionController`. *Found* = expected verse shown while it was being
  read; *wrong* = any other verse shown; *latency* = median seconds from the end
  of the sentence to the verse; *RTF* = CPU time ÷ audio time on a 4-core 2.8 GHz
  Xeon (lower is better; 0.10 means 10% of one real-time stream).
- **Engines:** all run locally through sherpa-onnx with int8 models. VAD-based
  engines use Silero VAD with the settings chosen below.

## Results

**Clean audio**

| Engine | Found | Wrong | Latency | RTF | Model size |
| --- | --- | --- | --- | --- | --- |
| **NVIDIA Parakeet TDT 0.6B v2** | **36/42** | **0** | **0.5 s** | 0.10 | 631 MB |
| Moonshine base | 32/42 | 2 | 0.5 s | 0.09 | 274 MB |
| Whisper base.en | 27/42 | 1 | 0.8 s | 0.18 | 160 MB |
| Whisper small.en | 27/42 | 3 | 2.5 s | 0.67 | 480 MB |
| Zipformer streaming + hotwords | 21/42 | 2 | 1.3 s | 0.22 | 71 MB |
| Zipformer streaming | 16/42 | 3 | 1.5 s | 0.17 | 71 MB |
| Zipformer streaming 20M | 16/42 | 1 | 1.1 s | 0.11 | 44 MB |

**Room audio (echo + noise)**

| Engine | Found | Wrong | Latency | RTF |
| --- | --- | --- | --- | --- |
| **NVIDIA Parakeet TDT 0.6B v2** | **37/42** | **0** | **1.2 s** | 0.10 |
| Moonshine base | 33/42 | 0 | 1.0 s | 0.06 |
| Whisper small.en | 32/42 | 0 | 3.1 s | 0.42 |
| Whisper base.en | 25/42 | 2 | 1.4 s | 0.12 |
| Zipformer streaming 20M | 7/42 | 1 | 1.2 s | 0.07 |
| Zipformer streaming + hotwords | 5/42 | 4 | 1.3 s | 0.19 |
| Zipformer streaming | 4/42 | 2 | 1.5 s | 0.16 |

The same audio through the shipped desktop app (Settings → Speech → Test with a
recording) found 38/42 in the room condition, and 34/42 when played into the app
live through a (virtual) microphone.

## Decision

The desktop app ships **Parakeet TDT 0.6B v2 + Silero VAD**: the most references
found in both conditions, no wrong verses, about one second from the end of a
sentence to the verse on screen, and about 10% of one CPU core. On a 2020 iMac
(10-core i9) that is negligible. The model is English-only and licensed CC-BY-4.0
(attribution in the app's `models/NOTICE.txt`).

Moonshine base is the runner-up at less than half the size; it would be the
choice if installer size mattered more than accuracy.

Chosen VAD settings (`electron/speech/worker.cjs`): threshold 0.7, minimum
silence 0.25 s, maximum utterance 8 s, plus 0.3 s of audio kept before each
utterance. The defaults (0.5 / 0.5 s / 20 s, no pre-roll) merged sentences into
long chunks in the noisy condition (Parakeet 19/42) and clipped the first word
after silence ("Habakkuk", "Acts" and "Luke" disappeared).

## Detector fixes found by this evaluation

Transcripts were often right while the detector missed them. Fixed in
`src/speech`:

- A pre-filter skipped text like "Zephaniah three seventeen" before parsing.
- "Habakkuk two verse four" normalized to "2 :4", which didn't parse.
- One-chapter books ("Obadiah verse 17", "Jude 24") weren't recognized.
- "Psalm 23" was read as Psalm 2:3.
- With several references in one segment, the choice depended on how each was
  phrased rather than when; now the last one spoken is shown.
- A reference split across two segments ("…Second Timothy three" |
  "sixteen…") was lost; now joined.
- "next", "back" and "continue" anywhere in a sentence ("we'll come back to
  that") moved the displayed verse; now only "next verse" / "previous verse".

`tools/speech-eval/detector-check.ts` keeps these working (run in CI).

## Limitations

- Synthetic voices are cleaner and more regular than a live preacher, so
  absolute numbers will be lower on real services; the ranking is what this
  measures. A real recording (the Cornerstone Nation Bible study on Buzzsprout)
  couldn't be fetched from the build environment. Run real services through
  **Test with a recording** to check.
- Misheard rare book names ("Namire" for Nehemiah, "Hage" for Haggai) remain;
  the optional AI verse assistant can resolve those.
- OpenAI and browser speech recognition weren't included: they need an API key
  or a real browser with a microphone.
