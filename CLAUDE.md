# Voice Verses: rules for working on this app

Voice Verses is a church presentation app. It listens to the preacher, finds the Bible verses they read, quote or refer to, and puts them on the projector, the stream lower third and the stage (confidence) monitor. It also runs songs, pictures, videos, countdowns, announcements and the order of service.

It is meant to be a church's **main** presentation app, easier and more beautiful than ProPresenter. ProPresenter support is an optional extra, never the centre.

Read these before changing anything:

| Read | When |
| --- | --- |
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) | What the app does: every feature, number and saved setting. The source of truth for rebuilding it. |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Why it is built this way. Don't reverse a decision without a new reason. |
| [`docs/LESSONS.md`](docs/LESSONS.md) | Mistakes already made and how they were fixed. Check before debugging. |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | How the app must look and read. Required for any UI work. |
| [`docs/REBUILD.md`](docs/REBUILD.md) | The order to build it from nothing, with a check after each stage. |
| `.claude/skills/*` | Step-by-step procedures: testing in Electron, shipping a change, releasing, detection work, design review, rebuilding. |

## The people and the setting

- **Who uses it:** church volunteers in a dark sound/media booth, under time pressure, often with little training. The owner's church also distributes it to other churches.
- **The owner's booth:**
  - A 2020 Intel iMac 27" (macOS Tahoe) runs Logic. The desk feeds it over USB, with the preacher on a channel named "APOSTLE", and a Focusrite Scarlett 4i4 handles output.
  - A separate ProPresenter computer has a Blackmagic eGPU (a free HDMI port) and a DeckLink Duo (2 free SDI outputs).
  - A Blackmagic switcher has 2 free inputs and an aux out to the projector.
  - There are confidence TVs on stage.
- **Requirements:**
  - Internet can be unreliable, so the core runs offline.
  - Must run on older Macs, both Intel and Apple chips, and on Windows.
  - Installing must be one download with nothing else to install.

## Stack and layout

- React 18 + Vite + TypeScript + Tailwind + shadcn/ui (Radix). It uses HashRouter, so build every link with `appUrl()` from `src/lib/appUrl.ts`.
- The web build goes to GitHub Pages under `/voice-verses/` and needs `VITE_BASE_PATH=/voice-verses/`.
- The desktop app is Electron. `electron/main.js` is the main process. `electron/preload.cjs` is a sandboxed bridge exposed as `window.voiceVerses` (typed in `src/lib/desktop.ts`). Every IPC handler checks the sender.
- The desktop build needs `ELECTRON_BUILD=true` (relative base, PWA off).
- Folders:
  - `src/speech/`: listening and detection.
  - `src/lib/`: data, storage, outputs, Bibles, templates, teams, shapes.
  - `src/components/`: UI. `live/` is the operator workspace and `designer/` is the slide designer.
  - `src/pages/`: routes. `/projection`, `/lower-third` and `/confidence` are the output windows.
  - `electron/`: main process, screens, speech worker, network server, ProPresenter, secrets, library, updates.
  - `tools/speech-eval/`: detector checks and the engine evaluation.
  - `tools/e2e/`: Electron end-to-end scripts.

## Commands

```sh
npm install --legacy-peer-deps
npx tsc -p tsconfig.app.json --noEmit          # type check (CI check 1)
VITE_BASE_PATH=/voice-verses/ npm run build     # web build (CI)
ELECTRON_BUILD=true npx vite build              # desktop renderer build, then:
ELECTRON_LOAD_DIST=1 npx electron .             # run the desktop app from dist/
npx eslint src                                  # lint; ~37 errors are old (any types, ui files): add no new ones
npx esbuild tools/speech-eval/detector-check.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/dc.cjs && node /tmp/dc.cjs   # detection checks (CI)
npm run models                                  # download speech models before packaging
```

To check changes end to end, use `tools/e2e/` and the `e2e-electron` skill. Run under `xvfb-run` on Linux.

## Hard rules

1. **Scripture first.** Detection, following a reading, and showing verses must be excellent before anything else. Never show a wrong verse confidently.
   - A verse goes on screen by itself only when it was said outright or the match is at least 99% sure (`AUTO_SHOW_CONFIDENCE`).
   - Anything less becomes a suggestion with its percentage and a preview.
2. **Offline core.** Speech recognition (on-device Parakeet via sherpa-onnx), the bundled Bibles (KJV, WEB, ASV) and all outputs work without internet. Cloud speech and AI are optional.
3. **No vendor lock-in for AI.** Claude, OpenAI, Ollama and OpenAI-compatible servers are all supported, and every one is optional.
4. **Keys stay out of the web.** Desktop keys are kept with Electron `safeStorage` and added to requests in the main process (`secrets:fetch`), only for that provider's host. Never ship a key in the web build. Never call a token server; Azure was removed.
5. **Outputs share one renderer.** The projector, lower third, previews and designer all draw through `TemplateRenderer` on a stage 1080 tall, with its width set by the screen shape. What the operator sees is what the room sees.
6. **Outputs never need dragging.** Settings → Screens puts each output on its display. Output windows never steal focus (`showInactive`).
7. **Keep listening in the background.** Don't add timers or animations that the browser throttles in a hidden window. The Electron throttling switches in `main.js` must stay.
8. **Copyright: the church's library versus the public code.**
   - **In the app,** a church can import and keep any song it is licensed to use, such as SongSelect songs under its CCLI licence. The app must make this easy, and credit each song (title, writers, copyright, CCLI number, licence number).
   - **In this repository** (code, tests, docs, mock-ups), never put copyrighted lyrics or Bible text. The repository is public, and a church's CCLI licence covers its own use, not publishing lyrics to the world. Use KJV/WEB/ASV and public-domain hymns. Song titles are fine.
   - **Licensed Bible translations** (NKJV, NIV and others) come through API.Bible, ESV or NLT at run time and are not stored on disk, as their terms require.
9. **Accessibility and clarity.** Red means on air and green means next, always with words as well as colour. Hit targets are at least 36px. Key text is never smaller than 13px. Esc clears, Space takes, ⌘K searches.
10. **Write UI text from the volunteer's side of the screen.** Plain words and active voice, and say exactly what a control does. No jargon such as "IPC", "template assignment" or "ephemeral".

## Shipping a change

Follow the `ship-change` skill. In short:

1. Branch from `main` as `feature/<name>` or `fix/<name>`.
2. Run the type check, both builds, the detector check, lint (no new errors) and an Electron e2e run of the feature.
3. Bump `package.json` by a patch for each shipped change.
4. Commit messages end with the attribution lines the session gives. Never put a model name in commits or PRs.
5. Open a PR, wait for the `qa` check, then merge with a merge commit.
6. **Releases:** the owner publishes them. They create a release in the GitHub UI with a lowercase tag `vX.Y.Z` on `main`, which runs `build-electron.yml`. Tag pushes from Claude sessions are blocked, so don't try. A capital `V` tag does not trigger the build.
7. **Never force-push.** If history must change, make a new branch.
8. **Never get around a bot check, paywall or proxy block.** Ask the owner for the file instead.

## Where things are saved

Settings live in `localStorage`, which every window shares, so outputs update the moment something changes. Services, media and files live in IndexedDB `cornerstone-bible-db` (version 2). The optional library folder is per-item JSON synced through any cloud drive. The full list of keys is in `docs/PRODUCT_SPEC.md` §12.

## Open work (keep this list current)

- Build the approved design into the app. The latest is design 4 (`docs/design/live-redesign-v4.html`, awaiting the owner's verdict); see `docs/DESIGN_SYSTEM.md`. The redesign PR #8 (1.4.0) is on hold and stale.
- Restyle the other pages (Service, Media, Templates, Settings) to the design system.
- Native DeckLink SDI output. It needs the Blackmagic Desktop Video SDK and testing on the owner's ProPresenter computer through Remote Control.
- Transitions, props/messages layers, multiple timers, a stage layout editor, live captions and translation, verses on phones (QR), PowerPoint and Planning Center import, Stream Deck/remote control, NDI, CCLI reporting.
- Signed and notarised installers, which need the owner's Apple Developer account and a Windows certificate.
