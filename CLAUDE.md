# Voice Verses: rules for working on this app

Voice Verses is a church presentation app. It listens to the preacher, finds the Bible verses they read, quote or refer to, and puts them on the projector, the stream lower third and the stage (confidence) monitor. It also runs songs, pictures, videos, countdowns, announcements and the order of service.

It is meant to be a church's **main** presentation app, easier and more beautiful than ProPresenter. ProPresenter support is an optional extra, never the centre.

Read these before changing anything:

| Read | When |
| --- | --- |
| [`docs/OWNER_REQUESTS.md`](docs/OWNER_REQUESTS.md) | **Everything the owner has asked for, and its status. Read it first; add new requests the moment they are made.** |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | What is still missing, and the order to build it in. |
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) | What the app does: every feature, number and saved setting. The source of truth for rebuilding it. |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Why it is built this way. Don't reverse a decision without a new reason. |
| [`docs/LESSONS.md`](docs/LESSONS.md) | Mistakes already made and how they were fixed. Check before debugging. |
| [`docs/architecture/`](docs/architecture/README.md) | How the modules talk: the event bus, the registry, the local API to come. Required for any new module, connector or importer. |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | How the app must look and read. Required for any UI work. |
| [`docs/REBUILD.md`](docs/REBUILD.md) | The order to build it from nothing, with a check after each stage. |
| [`docs/user-guide/`](docs/user-guide/README.md) | How to use every feature, with numbered screenshots, for churches. Rebuild it when the UI changes: `tools/guide/capture.cjs`, then `python3 tools/guide/build.py`. |
| `.claude/skills/*` | Step-by-step procedures: testing in Electron, shipping a change, releasing, detection work, design review, rebuilding. |
| [`docs/FOUNDATION.md`](docs/FOUNDATION.md) | The owner's foundation for every project, drawn from this one. When a rule changes here, or a lesson applies beyond this app, update it too. |

## The people and the setting

- **Who uses it:** church volunteers in a dark sound/media booth, under time pressure, often with little training. The owner's church also distributes it to other churches.
- **The owner's booth:**
  - A 2020 Intel iMac 27" (macOS Tahoe) runs Logic. The desk feeds it over USB, with the preacher on a channel named "APOSTLE", and a Focusrite Scarlett 4i4 handles output.
  - A separate ProPresenter computer (a Mac mini) has a Blackmagic eGPU (a free HDMI port) and a DeckLink Duo whose three outputs ProPresenter uses (projector, lower third, confidence). Since 26 Nov 2026 it has its own Focusrite (the iMac has a spare) for the preacher's sound: Voice Verses there listens through it (Settings → Listening, the APOSTLE channel). Voice Verses must not take the DeckLink ports.
  - Plan (25 Nov 2026): run Voice Verses on the ProPresenter computer alongside ProPresenter, with its Projector output on the eGPU's HDMI → a Decimator (HDMI to SDI, set to the switcher's format) → the balcony SDI cable → the switcher input that was Camera 1 (the old PTZ).
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
  - `src/core/`: the event bus, the events and the module registry (D33, `docs/architecture/`). New parts register as modules and talk through the bus.
  - `src/modules/`: modules that act only on bus events (ProPresenter) or bridge the bus to the local API (`localApi.ts`).
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

- Design 4 is in the live screen (1.4.0), and every other page uses `AppShell` with the same design (1.4.2). The old redesign PR #8 is obsolete and can be closed.
- DeckLink SDI output shipped in 1.12.0 (Mac, `native/decklink`); still to confirm on the owner's real card, then Windows, and key-and-fill for the lower third.
- Worship leader cues, spontaneous worship capture and Predictive Next shipped in 1.6.0. Remaining signature features are in `docs/ROADMAP.md` (spirit next).
- Moving backgrounds and transitions shipped in 1.5.0 (17 styles, 40 samples and the speed guard in 1.5.1). Phase 1 still needs light mode and the designer inspector restyle.
- Alerts (messages over any slide) shipped in 1.8.0.
- 1.9.0: every slide of what is loaded in a strip or grid, "When I pick a slide: Goes live | Waits in Next" above Live, Quick edit, the translation switch on the live screen, several services a day, part countdowns that start themselves, and Move on by time.
- 1.10.0: stories and paraphrases found offline from names and telling words, while the preacher is still speaking, and "help me find it" searches at once.
- 1.11.0: a chapter alone waits for its verse (read, quoted or "verse 5"), every suggestion in a list, context makes suggestions surer, half-second partials.
- 1.13.0: Settings → Features (every smart feature optional, presets Essentials/Recommended/Everything), the booth check light and warnings during the service, Find and set up ProPresenter, screen tiles and Identify screens. 1.14.0: Settings redesigned to the approved mock-up (`docs/design/settings-redesign.html`, parts in `src/components/settings/`), ProPresenter found on the network. 1.15.0: NDI® output through the free NDI Runtime (`electron/ndi.js`, koffi; D28), lower third see-through. 1.16.0: moment autopilot and sermon points on cue (`speech/momentCues.ts`, off by default, into Next only), small previews (strip, grid, Settings) stand still (`StillMotion`); Live and Next move. 1.17.0: spirit (`lib/spirit.ts`, D29): Settings → spirit and Cues, a trust ladder per cue (Hands-free after 10 right in a row), "Not this" with why, learning by watching, shared as `spirit/learned.json`. 1.18.0: types of service (`lib/serviceTypes.ts`, D30), every spirit move on its own ladder (Settings → What spirit does), "What spirit will do next" with Pause (P), How it went. 1.18.2: listening as light as before spirit (`tools/e2e/listening-load.cjs`; LESSONS "Listening got slower"). 1.18.3: service templates for every type (`lib/serviceTemplates.ts`), a ready-made order per type, Children's Sunday school. 1.18.4: ProPresenter "Why isn't it on the screens?" (`diagnose()`), its message addressed by uuid, "not showing" reported. 1.18.5: ProPresenter Hide respected, Clear/slides clear ProPresenter, lower-third theme. 1.19.0: Set up your booth (`components/booth-setup/`, `lib/boothSetup.ts`; opens by itself on a new computer) and practice mode (`lib/practice.ts`, D31: only the operator's window sees it). 1.19.1: the Training tab (`pages/Training.tsx`, `lib/lessons.ts`) and the guide (`components/guide/`: pointer, spotlight, spoken caption; Show me / Let me try), the demo narrated aloud. 1.19.2: the user guide (`docs/user-guide/`, built by `tools/guide/`). 1.19.3: ProPresenter's three ways (D32): a slide with linked text (`electron/linkedText.js`), a slide with the NDI picture, or the message. 1.19.4: the event bus and module registry (`src/core/`, D33, `docs/architecture/`; approved design): every module announces on the bus, ProPresenter follows it. 1.19.5: the local API v1 (`electron/api.js`, `electron/mdns.js`, `src/core/commands.ts`, Settings → Other apps and devices; D34, `docs/api/README.md`): pairing codes, scoped keys, live control, events over SSE/WebSocket and webhooks, Bonjour. 1.19.6: the service package (`lib/servicePackage.ts`, D35, `docs/api/service-package.md`): `POST /api/v1/packages` or Services → Import; expected scriptures become slides in the sermon. 1.19.7: Add from a file (`lib/importers/`, `service-builder/AddFromFileDialog.tsx`, D36; approved mock-up): PDF pages as pictures (pdf.js), PowerPoint and Word read with fflate, written references and points found, reviewed before adding; notes on the stage monitor. 1.19.8: the Mac installer builds on `macos-15`. 1.19.9: updates people see (`electron/updates.js`): checks at start and every 4 hours, Settings → Desktop app → Updates (Check now, Restart to update, or on an unsigned Mac Download and Open the installer), a message and a Settings badge. 1.19.10: the demo switches on what it narrates. 1.19.11: Show me the fix (`lib/fixGuide.ts`) on warnings and the booth check: the one control lit up, Do it for me for the microphone, back to the live screen when fixed. 1.19.12: One screen | Every screen beside Live (approved mock-up `docs/design/all-screens.html`): every output live, like a multiview. 1.19.13: the guide's voice recorded ahead (`tools/voice/`, D37; Pocket TTS, CC0 voice C), heard only in lessons and the demo after "Hear the guide?", never during a service. After changing what the guide says, run `node tools/voice/record.cjs`. 1.19.14: lessons Screens and outputs, Plan a service from a template, Teach spirit a cue (`lib/lessons.ts`; `tryOnly` steps, `onStart`/`onEnd` tidy-up). 1.19.15: Add a Bible file (`lib/bibleFiles.ts`: OSIS, USFX, Zefania, USFM, JSON; kept in IndexedDB). Next: 2.4 connectors (CCCG, Planning Center), 2.5 sermon preparation (mock-up first). Also: the Songs and slides lesson, Moving on safely (mock-up `docs/design/moving-on-safely.html` awaiting approval), 1.20.0 spirit runs the order of service, 1.21.0 Help from AI (incl. Ollama/LM Studio), 1.22.0 the church app feed (`docs/integrations/church-app-feed.md`).
- Props layers, multiple timers, a stage layout editor, live captions and translation, verses on phones (QR), PowerPoint and Planning Center import, Stream Deck/remote control, NDI input, CCLI reporting.
- Signed and notarised installers, which need the owner's Apple Developer account and a Windows certificate.
