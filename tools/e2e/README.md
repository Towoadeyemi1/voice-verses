# Desktop end-to-end checks

These scripts drive the real Electron app with Playwright. Build the renderer first, then run each script under Xvfb on Linux (on a Mac, run with `node` directly).

```sh
ELECTRON_BUILD=true npx vite build
xvfb-run -a -s "-screen 0 3840x1600x24" node tools/e2e/smoke.cjs     # outputs, screen shapes, settings (~30 s)
xvfb-run -a -s "-screen 0 3840x1600x24" node tools/e2e/screens.cjs   # Settings → Screens with a faked second display
xvfb-run -a node tools/e2e/transitions.cjs   # moving backgrounds, transitions, the designer and the backgrounds gallery
xvfb-run -a node tools/e2e/starters.cjs      # starter looks, themes, colour teams, orders of service, countdowns
xvfb-run -a node tools/e2e/microphone.cjs [/tmp/vv-e2e/worship.wav]   # Settings → Listening: sound check, channel, input found again by name
xvfb-run -a node tools/e2e/pages.cjs         # every page renders without errors (screenshots)
# Spoken sermon through the built-in engine (needs `npm run models` and Piper TTS):
python3 tools/e2e/make-sermon-audio.py path/to/en_US-lessac-medium.onnx /tmp/vv-e2e/sermon.wav
xvfb-run -a -s "-screen 0 3840x1600x24" node tools/e2e/sermon.cjs auto     # or: preview
python3 tools/e2e/make-worship-audio.py path/to/en_US-lessac-medium.onnx /tmp/vv-e2e/worship.wav
xvfb-run -a node tools/e2e/worship.cjs     # Predictive Next, the leader's cues, spontaneous worship (~2 min)
node tools/e2e/mock-ollama.cjs &                                           # fake Ollama for AI slide tests
```

Each script prints a `PASS` or `FAIL` line for each check and exits non-zero on failure. Screenshots and profiles go to `$E2E_OUT` (default `/tmp/vv-e2e`).

`lib.cjs` has the helpers:
- `launch(name, { audio })` starts the app with a fresh profile and, optionally, a fake microphone playing a WAV.
- `plugInSecondDisplay(app)` fakes a second display, because Xvfb can't.
- `showVerse(win, verse)` puts a verse on screen without speech.
- `seedMedia(win, items)` adds songs or pictures to IndexedDB.
- `stageSize(page)` reads an output's stage size.

Add a script, or a check to an existing one, for every user-visible feature.
