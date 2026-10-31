---
name: e2e-electron
description: Test Voice Verses end to end in the real desktop app (Electron + Playwright under Xvfb), including fake second displays, a fake microphone playing a spoken sermon, seeded songs and a mock Ollama. Use after any change to outputs, screens, detection, the live screen or settings, before opening a PR.
---

# Testing in the real desktop app

1. Build the renderer for Electron (a web build gives a blank window):
   `ELECTRON_BUILD=true npx vite build`
2. Run the standing checks. Each prints PASS or FAIL lines and exits non-zero on failure:
   - `xvfb-run -a -s "-screen 0 3840x1600x24" node tools/e2e/smoke.cjs`: outputs, screen shapes, settings.
   - `xvfb-run -a -s "-screen 0 3840x1600x24" node tools/e2e/screens.cjs`: Settings → Screens and Esc to turn an output off.
   - Detection or song changes:
     1. `npm run models` (once).
     2. Make the audio: `python3 tools/e2e/make-sermon-audio.py <piper-voice.onnx> /tmp/vv-e2e/sermon.wav` (`pip install piper-tts`; voices from huggingface.co/rhasspy/piper-voices).
     3. `xvfb-run ... node tools/e2e/sermon.cjs auto`, then again with `preview`.
3. For the feature you changed, write a short script next to them using `tools/e2e/lib.cjs`:
   - `launch`, `setBounds`, `plugInSecondDisplay`, `showVerse`, `seedMedia`, `stageSize`, `check`, `done`.
   - Look at the screenshots it saves, with the Read tool, before calling it done.
4. **Selectors:** use exact roles and names. Earlier failures were test mistakes, not app bugs:
   - A "Song" thumbnail matched the Song button.
   - dnd-kit menus open with focus then Enter.
   - "Save as Template" was clicked instead of "Save".
5. **AI features:** run `node tools/e2e/mock-ollama.cjs &` (port 11555) and point the AI settings at it.
6. **Cleanup:** never `pkill -f electron`, because it kills your own shell. Use `pkill -9 -x electron`.

## Known limits

- Xvfb has one display; `plugInSecondDisplay` patches Electron's `screen` module.
- Test windows have a title bar, so "Match the screen" measures a slightly different shape than a real full-screen output. Set the shape outright when checking exact sizes.
- API.Bible, ESV and NLT need real keys. Test their parsers on saved responses, and ask the owner to check live.
