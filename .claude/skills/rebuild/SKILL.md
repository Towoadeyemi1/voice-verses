---
name: rebuild
description: Rebuild Voice Verses from an empty repository, or rebuild one subsystem from scratch, following the documented stages, decisions and lessons so earlier mistakes aren't repeated. Use when asked to recreate the app, port it, or rewrite a large part.
---

# Rebuilding the app

1. Read, in order:
   - `CLAUDE.md`
   - `docs/PRODUCT_SPEC.md` (what)
   - `docs/DECISIONS.md` (why)
   - `docs/LESSONS.md` (traps)
   - `docs/DESIGN_SYSTEM.md` (look)
   - `docs/REBUILD.md` (order)
2. Follow `docs/REBUILD.md` stage by stage. Don't start a stage until the previous stage's check passes. Ship each stage with the `steward` skill (branch, checks, PR, merge).
3. For each stage, before coding, list which lessons apply. For example:
   - Stage 2: `FitText` uses `offsetHeight`, and KJV braces.
   - Stage 4: `ELECTRON_BUILD`, PWA disabled, sender checks.
   - Stage 5: `vad.front(false)`, lag-aware partials.
   - Stage 7: `showInactive`, `setImmediate` for Esc, throttling switches.
4. Copy behaviour exactly where the spec gives numbers: thresholds, sizes, keys, file names. They were tuned against real use.
5. Use only KJV, WEB, ASV and public-domain hymns in code, tests and mock-ups.
6. Use `tools/e2e/` and `tools/speech-eval/` as the definition of done. Stages 5, 6 and 9 aren't done until the spoken sermon run passes.
7. When the owner asks for something new, add it to the spec and decisions first, then build.
