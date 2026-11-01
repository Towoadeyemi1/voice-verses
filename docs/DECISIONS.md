# Decisions

Each entry records what was decided and why. Add new ones at the end. Reverse a decision only with a new reason, written here.

### D1. On-device speech first, cloud speech optional
- **Context:** The first version called OpenAI through an Azure token server. That server was decommissioned, so the app broke with "405 Not Allowed". Church internet is unreliable, and the owner asked why everything depended on OpenAI.
- **Decision:** A built-in offline engine is the default on desktop: Parakeet TDT 0.6B v2 int8 with Silero VAD via sherpa-onnx, in an Electron utilityProcess. Web Speech is the default on the web. OpenAI Realtime is optional.
- **Why:**
  - It works with no internet and no account.
  - It was the best accuracy for Bible references among the engines tested (`docs/speech-engine-evaluation.md`).
  - It runs on a 2020 Intel iMac.
  - The utilityProcess keeps the UI smooth.

### D2. No servers of our own; Azure removed
- **Context:** Azure (functions, storage, sync) was decommissioned.
- **Decision:** No backend.
  - Desktop keeps keys in `safeStorage` and adds them in the main process.
  - Shared storage is a plain folder of JSON files that any cloud drive syncs.
- **Why:** Nothing to host or pay for and nothing to break. Churches already have a cloud drive.

### D3. Any AI model, all optional
- **Context:** The owner wants people to choose: Ollama for local models, Claude, OpenAI.
- **Decision:** One provider layer (`src/ai/providers.ts`) covering Claude, OpenAI, Ollama and OpenAI-compatible servers. AI only *suggests*, and every answer is checked against the Bible.
- **Why:** No lock-in, offline possible with Ollama, and no hallucinated verse can reach the screen.

### D4. Desktop app is the product; the web version is a demo and a light tool
- **Context:** Dependencies had to be installed separately in the past. Churches use older Macs and Windows.
- **Decision:** An Electron app with everything bundled, including the models. Installers are built by CI on a tag. Updates arrive through `electron-updater`.
- **Why:** One download, nothing else to install, works offline, can place screens and keep keys safe.

### D5. Voice Verses is the main app; ProPresenter is optional
- **Context:** One version made Voice Verses a ProPresenter add-on. The owner said: "So my app will be just a propresenter sidekick? That wasn't the plan!"
- **Decision:** The full app is the default. ProPresenter messaging and the companion screen are optional extras.
- **Why:** This is the product vision: replace ProPresenter, scripture first.

### D6. One renderer for every screen and preview
- **Context:** Text didn't fit the screen, and previews didn't match the outputs.
- **Decision:** Everything draws through `TemplateRenderer` on a stage of fixed height, scaled by `ScaledStage`. `FitText` shrinks text to fit.
- **Why:** What the operator sees is exactly what the room sees, at any size.

### D7. Outputs placed by the app, never dragged
- **Context:** The owner asked: "Must I have the screen open on the app… Can't it be selected in the app?"
- **Decision:** Settings → Screens assigns a display to each output. The app opens each output there full screen, without taking focus, and restores it after a display reconnects.
- **Why:** Volunteers shouldn't have to manage windows. It works with HDMI, an HDMI-to-SDI converter, or any display.

### D8. SDI via a converter now, DeckLink later
- **Context:** The owner has a DeckLink Duo with 2 free SDI outputs.
- **Decision:** Ship with HDMI-to-SDI converters, which appear as displays. Native DeckLink output needs the Blackmagic SDK and testing on the owner's hardware.
- **Why:** Works today with no native code risk. DeckLink can't be tested without the hardware.

### D9. Recommended booth architecture
- **Decision:**
  - Run Voice Verses on the computer that drives the screens.
  - Bring the preacher's mic in by cable: a pre-fader aux or bus from the desk, or one channel out of the DAW (for example Logic → Focusrite output 3/4) into a small USB interface or that computer's input.
  - Video: eGPU HDMI → HDMI-to-SDI converter → a free switcher input → aux → projector.
  - Stage TVs use network outputs.
- **Why:** The fewest parts, with no audio over the network, which adds latency and fragility.

### D10. Auto-show only when certain
- **Context:** The owner wants suggestions with a confidence level, sent automatically only at 99–100%.
- **Decision:**
  - `AUTO_SHOW_CONFIDENCE = 0.99`; anything below is a suggestion with a % and a preview.
  - Clear spoken references always go up in Auto mode.
  - A Preview-first mode holds everything.
- **Why:** A wrong verse on the big screen is the worst failure.

### D11. Follow the reader word by word
- **Decision:**
  - Passages (ranges or chapters) are followed verse by verse.
  - The word tracker searches the whole rest of the verse, with neighbour agreement, and estimates pace between recognitions.
  - The next verse goes live at the end of the verse being read.
- **Why:** The owner reported it was "too slow for fast readers" and that it didn't follow through John 5:8-13.

### D12. Song mode and song following
- **Decision:**
  - A Song toggle pauses scripture detection, except references said outright.
  - Library songs are recognised from what is sung, and the app asks before switching.
  - A live song follows the section being sung.
- **Why:** The owner's request. Worship between sermon parts must not trigger verses.

### D13. Licensed Bibles at run time only
- **Context:** The owner has paid for many translations in ProPresenter, but those licences are tied to ProPresenter.
- **Decision:** API.Bible covers NKJV, NIV and others with the church's own licence, alongside ESV and NLT. Text is fetched a chapter at a time and kept in memory only. FUMS is reported.
- **Why:** This is legal under the publishers' terms. Nothing copyrighted ships in the app.

### D14. Colour teams and themes
- **Decision:** A colour team is 5 named colours. Looks may use `team:<key>`, and so does the app's accent. Teams can follow the month. A theme is a saved set of assignments plus a team.
- **Why:** The church changes colours monthly and seasonally. One change should recolour everything.

### D15. Screen shapes
- **Decision:** Each output has a shape, defaulting to match the screen. The stage is 1080 tall and as wide as the shape. Wide screens either spread the design or keep it in the middle 16:9.
- **Why:** The owner asked: "if the screen used is a wide 45 stretch width, will it display clean?"

### D16. Live screen design direction: design 3
- **Context:** The owner rejected the first two redesigns: not Apple-quality, too monochrome, stark white, not easier than ProPresenter.
- **Decision:** Design 3, based on research into ProPresenter, FreeShow, Linear's 2026 refresh, Apple's pro apps and Liquid Glass, and ATEM/vMix tally conventions. See `DESIGN_SYSTEM.md`.
  - One screen with no modes.
  - The order of service as a timeline.
  - On Air (red frame) and Next (green frame) with one Take button.
  - Colour taken from the content.
  - Warm graphite dark and warm paper light.
- **Why:** Volunteers under pressure need one obvious action. Colour should carry meaning, and the screens should be the hero.

### D18. Backgrounds made by the app, and layered transitions
- **Context:** The owner chose "Background and transitions" first. Built-in looks were plain black and slides cut hard.
- **Decision:**
  - Moving backgrounds are drawn by the app from gradients, not shipped as videos. They take the colour team's colours, need no files or downloads, and have no copyright to check.
  - Only `transform` and `opacity` animate (the graphics card does it), so they stay smooth on the owner's 2020 Intel iMac. No JavaScript timers drive them (rule 7).
  - They are timed from the wall clock (a negative `animation-delay`), so the projector, lower third and previews match exactly.
  - Transitions belong to a look, with a per-slide choice; the incoming slide's transition is used, as in ProPresenter.
  - The background, the look's shapes and the words change as separate layers, so a verse change never flickers the background.
- **Why:** Rich from the first launch, offline, and the operator's previews still show exactly what the room sees.

### D17. Releases are published by the owner
- **Context:** Tag pushes from Claude sessions are blocked.
- **Decision:** Claude merges to `main` after CI passes. The owner creates a GitHub release with a lowercase `vX.Y.Z` tag on `main`.
- **Why:** This is the only path that works, and it keeps a human approving every public release.
