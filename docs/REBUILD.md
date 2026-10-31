# Rebuilding Voice Verses from nothing

Build in this order. Each stage ends with a check that must pass before moving on. Read `PRODUCT_SPEC.md` for what to build, `DECISIONS.md` for why, `LESSONS.md` for traps, and `DESIGN_SYSTEM.md` before any UI. The `rebuild` skill walks through it.

| # | Stage | Build | Check |
| --- | --- | --- | --- |
| 0 | Skeleton | Vite + React + TS + Tailwind + shadcn; HashRouter; `appUrl()`; GitHub Pages workflow with `VITE_BASE_PATH`; QA workflow (tsc + builds) | `npm run build` and the Pages URL loads |
| 1 | Bibles | Bundled KJV, WEB and ASV JSON (lazy); `BibleParser` (getVerse, search, version label); KJV italics `{word}` and margin notes removed (`verseText.ts`) | John 3:16 in each version; Esther 8:9 renders with no braces |
| 2 | Outputs | `syncService` (BroadcastChannel + localStorage live keys); `/projection`, `/lower-third`, `/confidence`; `ScaledStage`, `FitText`, `TemplateRenderer`, `OutputContent`; looks, assignments, logo | Long verses fit; windows opened late catch up; the confidence screen shows the verse and what's next |
| 3 | Reference detection | Normalisation, reference extraction, `VerseDetectionController` (references, dedupe, nav commands); Web Speech provider; `detector-check.ts` in CI | All detector checks pass |
| 4 | Desktop app | Electron main, sandboxed preload, sender checks, `ELECTRON_BUILD`, safeStorage secrets with `secrets:fetch`, `electron-builder` config, `build-electron.yml` on `v*` tags, updater | `ELECTRON_LOAD_DIST=1 electron .` runs; a tag build makes 3 installers |
| 5 | Built-in speech | `fetch-models.mjs`; utilityProcess worker (sherpa-onnx, Parakeet, Silero VAD, `vad.front(false)`, lag-aware partials, adaptive interval); AudioWorklet capture; multichannel mic picker; Test with a recording | The e2e sermon run (`tools/e2e/sermon.cjs`) shows John 5:8 → 13 in order |
| 6 | Following and quotes | Scripture trigram index; `followReading`; passages and `followPassage`; reading tracker with pace; `findQuotes` with confidence; `AUTO_SHOW_CONFIDENCE`; suggestions with previews; send mode | Detector checks for passages, quotes (99% whole verse) and fast readers pass |
| 7 | Screens | `electron/screens.js` (display for each output, frameless full screen, `showInactive`, reconnect, Esc off, suspend and resume); Settings → Screens; throttling switches and power blockers | `tools/e2e/screens.cjs` passes with a faked second display |
| 8 | Service content | Service Planner and Builder (sections, scripture ranges, songs with arrangements and CCLI, announcements, pictures, videos, countdowns); Presenter; media in IndexedDB; duplicate service; SongSelect import | Build a service, present it, and confirm all outputs follow |
| 9 | Songs live | `lyricsMatcher` identify and follow; song mode; ask before switching | The sermon e2e recognises the song and follows its sections |
| 10 | Network and ProPresenter | `electron/network.js` (SSE `/live`, `/media` with Range); network viewer mode; `?transparent=1`; optional ProPresenter messages | A browser on another device shows the projector; `tools/propresenter-check.mjs` passes |
| 11 | Library and AI | Library folder sync (JSON per item, tombstones, conflicts); AI providers (Claude, OpenAI, Ollama, compatible); the AI verse assistant (suggest only, verified); AI slides | Sync unit checks; AI slides against `tools/e2e/mock-ollama.cjs` |
| 12 | Design tools | Slide designer (layers, rich text, snapping, undo); apply to slide, item or kind; colour teams, themes, month switching; lower-third presets | Changing a team recolours looks and the app accent; designer e2e |
| 13 | Online Bibles | API.Bible (key, choose translations, FUMS), ESV, NLT (footnotes removed); memory-only chapter cache | Parsers tested on saved responses; the owner checks with a real key |
| 14 | Screen shapes | `screenShapes.ts`, stage width from shape, spread or middle, previews in shape, designer shape preview, network snapshot | `tools/e2e/smoke.cjs` checks 32:9 spread and middle |
| 15 | Design 3 | Live screen per `DESIGN_SYSTEM.md`, then the other pages | Side by side with `docs/design/live-redesign-v3.html`; the design-review skill checklist |

**Release:** after each stage that users would notice, bump the version, open a PR, merge it after the `qa` check passes, and ask the owner to publish `vX.Y.Z`.
