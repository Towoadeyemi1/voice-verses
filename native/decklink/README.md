# DeckLink output addon

Sends Voice Verses outputs (projector, confidence monitor, lower third) straight out of a Blackmagic DeckLink card's SDI ports, as ProPresenter does, without an HDMI-to-SDI converter. Chosen in Settings → Screens.

- `src/decklink.cpp`: a small Node-API addon (`list`, `open`, `display`, `close`). Frames arrive as BGRA from an offscreen Electron window (`electron/decklink.js`), are converted to 8-bit 4:2:2 YUV (Rec. 709, video range) and sent with `DisplayVideoFrameSync`, double-buffered. The card repeats the last frame until the next.
- `sdk/`: the Blackmagic DeckLink SDK 12.0 headers (macOS, and Linux for the compile check in CI). Their licence (at the top of each file) allows them to be copied and distributed. They talk to Blackmagic Desktop Video, which comes with the card; without it, `list()` returns `null`.
- Built in CI: `build-electron.yml` compiles it for Intel and Apple-chip Macs into `prebuilt/darwin-<arch>/decklink.node`; `qa-checks.yml` compiles it on Linux to catch mistakes.
- Build here: `npx node-gyp rebuild --directory native/decklink`.
- Test without a card: `VOICE_VERSES_DECKLINK_MOCK=1` gives a pretend card with two ports (`tools/e2e/decklink.cjs`).
- Windows: not yet (the Windows SDK is COM, built from its IDL with MIDL).
