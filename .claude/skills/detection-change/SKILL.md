---
name: detection-change
description: Safely change how Voice Verses hears and detects scripture or songs (reference extraction, passages, the word follower, quotes and confidence, song matching, speech engine settings). Use for any edit under src/speech/ or electron/speech/.
---

# Changing detection

The worst failure is a wrong verse on the big screen, and the second worst is a late one. Every change must keep both rare.

1. Read `docs/PRODUCT_SPEC.md` §2–3 and the detection section of `docs/LESSONS.md`. Many tempting changes were tried and reverted there, such as clearing heard words after a suggestion, or a short quote window.
2. **Write the test first:** add cases to `tools/speech-eval/detector-check.ts` for the new behaviour and for the nearest thing it could break. Typical neighbours:
   - The verse before or after.
   - A common phrase in many verses.
   - The same words in a parallel gospel.
   - A partial transcript that is still growing.
3. Make the change. Keep these as they are unless a new reason is written in `docs/DECISIONS.md`:
   - `AUTO_SHOW_CONFIDENCE` = 0.99.
   - Act on a partial reference only when at least 2 words follow it.
   - Quote search uses the last 40 words for coverage, rivals need at least 3 hits, and phrases in more than 120 verses are ignored.
   - The reading tracker accepts a jump only when a neighbouring word agrees, runs at most 3 words ahead, and stops after a 2.5 s pause.
   - Song mode lets through references said outright only.
   - Worship cues count only in utterances of 10 words or fewer, act once per sentence, and never guess a section a song doesn't have.
   - Spontaneous singing is only offered; its words go up after the operator chooses, and are saved as a draft.
   - Predictive Next only fills Next; it never puts a verse on screen.
4. Run the detector check:
   `npx esbuild tools/speech-eval/detector-check.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/dc.cjs && node /tmp/dc.cjs`
5. Run the spoken sermon e2e (`e2e-electron` skill) in **auto** and **preview** modes. Check timing in the printed log: a verse should go live within about 1–2 s of being read.
6. **Engine changes** (VAD, partial timing, models) also need `tools/speech-eval` (README there) on clean and room audio, compared with `docs/speech-engine-evaluation.md`. Test on a slow machine profile: the 2020 Intel iMac must keep up.
7. Write the result in the PR's Testing section: the cases added, the e2e timeline, and any change in the evaluation numbers.
