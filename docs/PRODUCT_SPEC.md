# Voice Verses: product specification

This document describes what the app does, precisely enough to rebuild it. Numbers are the shipped values, and the file that holds each one is named so it can be checked. The current version is in `package.json`.

## 1. Purpose and users

A church presentation app whose core is **listening**. It follows the preacher and puts the right scripture on every screen without anyone typing. It also runs everything else in a service: songs, pictures, videos, countdowns, announcements, the order of service and logos.

The goal is to replace ProPresenter as the church's main presentation app. ProPresenter integration remains optional, for churches that keep both.

- **Users:** volunteers in a dark booth, under pressure, little training. Other churches download it too, so nothing may assume the owner's hardware.
- **Platforms:**
  - macOS 12 or later on Intel and Apple chips (built separately).
  - Windows x64.
  - A web version on GitHub Pages, with fewer features: no built-in speech engine, no screen placement, no stored keys.

## 2. Listening (speech engines)

Engine types are `builtin`, `webspeech` and `openai` (`src/speech/SpeechProviderFactory.ts`). The default is `builtin` on desktop and `webspeech` on the web.

- **Built-in (desktop, offline):**
  - Runs in an Electron utilityProcess (`electron/speech/worker.cjs`) using `sherpa-onnx-node` 2.0.0, the NVIDIA **Parakeet TDT 0.6B v2 int8** model, and **Silero VAD**.
  - VAD settings: threshold 0.7, minimum silence 0.25 s, maximum speech 8 s, 0.3 s pre-roll.
  - Call `vad.front(false)`, because Electron forbids external buffers.
  - Audio is captured at 16 kHz by an AudioWorklet.
  - Partials are lag-aware: `MAX_LAG = 0.4` s, with the clock anchored on the earliest audio arrival. The partial interval adapts to 3× the decode time, clamped to 0.5–3 s, so a slow computer never falls behind.
  - The models download at build time (`npm run models`, `scripts/fetch-models.mjs`) and ship inside the installer, so users install nothing else.
- **Web Speech:** the browser's recogniser, online, on the web build.
- **OpenAI Realtime:** transcription-only session through `/v1/realtime/client_secrets` and `/v1/realtime/calls` with `gpt-4o-transcribe`. Optional, and needs a key.
- **Microphone:** any input device, including multichannel interfaces.
  - Requests up to 32 channels (`MAX_CHANNELS`) and picks one channel, for example the preacher's desk channel. Settings → Speech shows a meter for each channel.
- **Test with a recording** (Settings → Speech): runs the shipped engine and detector on an audio file in 15 s chunks and lists what would have been shown.
- **Background:** detection and display keep running when the app is not the focused window.
  - Main process switches: `disable-renderer-backgrounding`, `disable-background-timer-throttling`, `disable-backgrounding-occluded-windows`.
  - Windows are created with `backgroundThrottling: false`.
  - `powerSaveBlocker` uses `prevent-display-sleep` while outputs are open or listening, and `prevent-app-suspension`.

## 3. Detection (the heart)

`src/speech/VerseDetectionController.ts` receives every partial and final transcript.

1. **Normalisation** (`transcriptNormalization.ts`):
   - Number words become digits.
   - "verses" and "verse" are handled, `3 :16` is collapsed, and ranges and "through/to" are understood.
2. **References** (`referenceExtraction.ts`):
   - Book names and their spoken variants are recognised, including single-chapter books.
   - Concatenated numbers are split ("John 316" becomes John 3:16).
   - It returns the last confident reference spoken.
   - Forms understood: "John 3:16", "John chapter 3 verse 16", "John 5:8-13", "John 5 from verse 8", and a whole chapter ("John 5").
3. **Partials:** a reference in a partial transcript is acted on when at least 2 words follow it, so it cannot still grow (3:1 becoming 3:16). Otherwise it waits for the final.
4. **Passages:** a range or a whole chapter becomes a passage, and each verse goes on screen as it is read.
   - **Following inside a passage** (`followPassage`) compares word pairs from the last 12 words heard with each verse of the passage.
   - **The word follower** (`readingTracker.ts`):
     - `readingPosition` finds the last word read, searching the rest of the verse. A jump counts only when the neighbouring word agrees, so a common word cannot jump it ahead.
     - `wordsAhead` estimates the reader's pace and runs up to 3 words ahead between recognitions. It stops after a 2.5 s pause.
     - When the last word of a verse is read, the next verse of the passage goes live.
5. **Reading on without a reference** (`scriptureMatcher.followReading`): compares the last 14 words with the next 1–4 verses after the one on screen.
6. **Quotes without a reference** (`scriptureMatcher.findQuotes`):
   - The index holds word trigrams of KJV and WEB, hashed with FNV-1a and kept as sorted arrays.
   - Words are reduced to a common form: archaic endings, thee/you, hath/has.
   - Phrases found in more than 120 verses (`MAX_COMMON`) are ignored for finding candidates.
   - **Confidence** = coverage × (0.75 + 0.25 × distinctness).
     - Coverage is measured with all trigrams over the last 40 words.
     - Distinctness compares the match against rivals that have at least 3 hits.
   - `AUTO_SHOW_CONFIDENCE = 0.99`: only a verse said word for word, with nothing else matching, goes up by itself.
   - Everything else is a **suggestion** with its percentage (high ≥ 0.75, medium ≥ 0.45) and a preview of the verse.
7. **AI assistant** (optional):
   - When the words describe a verse but don't quote it, it asks the chosen model (Claude, OpenAI, Ollama or OpenAI-compatible) for a reference using a JSON schema.
   - The answer is checked against the Bible before it is offered.
   - It is shown as an "AI suggests…" suggestion, never auto-shown.
8. **Commands:** "next" or "next verse" (alone, on a final transcript) moves on. "previous verse" goes back. In song mode, "next" moves to the next slide.
9. **Duplicates and timing:** the same verse is not shown again within 10 s (`dedupeWindowMs`). Debounce is 500 ms.
10. **Song mode** (the ♪ Song toggle by the transcript):
    - Pauses scripture detection while people sing. A reference said outright, such as "John 3:16", still works.
    - **Library songs are recognised** from the words sung (`lyricsMatcher.ts`: triples score 2, pairs score 1). The app asks before switching to the song, and does not re-ask about the same song within 60 s.
    - **Following a song:** once a song is live, the matcher follows the section being sung and moves the slide.
    - **Worship leader cues** (1.6.0, `src/speech/worshipCues.ts`): "one more time", "sing it again", "last time", "go to the bridge", "back to the chorus", "pre-chorus", "verse two", "from the top".
      - Only an utterance of 10 words or fewer counts (a sung line with "again" is not a cue); "again"/"one more"/"last time" alone need 4 words or fewer, and a bare "verse" is ignored.
      - Acted on once per sentence, as soon as the partial transcript has it. The operator sees "Heard “go to the bridge” · Went to Bridge".
      - Targets use the slides' section labels in sung order: a section goes to its next occurrence after here, else the last one before. "One more time" goes to the start of the section being sung, or of the one just sung if the lyrics moved on in the last 4 s. Without section labels only "from the top" is followed.
    - **Spontaneous worship** (1.6.0, `src/lib/spontaneousSong.ts`): in song mode, two finished sung lines in a row (4+ words) that match neither the song on screen (score < 3) nor any library song (< 4) bring a "Singing something new" suggestion (at most once a minute).
      - "Show the words live" captures: each sung line (3+ words, fillers dropped, a line heard twice in a row kept once) goes up two lines to a slide, and the middle shows the song so far. A captured song is not followed or cued.
      - "Stop and save", song mode ending, or anything else going live ends it and saves a draft song (category Drafts, tags `draft`, `sung live`): lines sung three or more times become the Chorus, the rest Verses of four lines, Chorus after each verse.
12. **Predictive Next** (1.6.0, `src/speech/scriptureHints.ts`, `src/lib/predictNext.ts`):
    - A hint is a book named without a chapter ("the book of Acts", "turn to Isaiah", "in Romans", "Proverbs says") or a writer saying something ("Paul says", "as David wrote", "Jesus said"); with both ("Paul says the same thing in Romans") the book wins. Book names that are ordinary words or people (Job, Acts, Mark, John, Numbers…) count only after "the book of", "turn to", "the gospel of" and similar.
    - Candidates in the hinted books, best first: scripture planned in today's service (score 3), cross-references of the live verse (2, by votes), of the 4 verses before it (1.2 down). Verses already shown are skipped.
    - The best goes into **Next** labelled "likely next (why) · Take to show it". It never goes on screen by itself, and not while the operator has a suggestion in Next or a song is being captured.
    - Cross-references: OpenBible.info (CC BY), top 10 per verse with 4+ votes, bundled (`src/data/cross-references.json`, loaded when first needed; see `src/data/CROSS-REFERENCES.md`). Credited in Settings → Bible.
13. **Send mode** (`src/lib/sendMode.ts`, key `voice-verses-send-mode`):
    - **Auto:** clear references and 99%+ matches go live.
    - **Preview first (Ask):** everything waits in Preview/Next until the operator takes it.

The checks in `tools/speech-eval/detector-check.ts` cover all of the above and run in CI. Add a case for every behaviour change.

## 4. Bibles

- **Bundled (offline):** KJV (with italics shown and margin notes removed), WEB, ASV. Loaded lazily.
- **Online, licensed, chapter at a time** (`src/lib/onlineBibles.ts`):
  - Text is cached in memory for the session only and never stored on disk.
  - **API.Bible** (`rest.api.bible/v1`, header `api-key`):
    - Whichever translations the church has licensed: NKJV, NIV, CSB, NASB, AMP and others.
    - Verses are parsed from the JSON content by `attrs.verseId`.
    - Each time a verse is shown, its FUMS fair-use token is reported to `fums.api.bible/f3` with an image request.
  - **ESV** (`api.esv.org`, text with `[n]` verse markers).
  - **NLT** (`api.nlt.to`): HTML `verse_export` blocks, with footnotes removed (drop the nested `tn-ref` span first, then the `tn` note).
- Translations bought inside ProPresenter can't be used outside ProPresenter. Say so in the UI.
- Version keys: `kjv`, `web`, `asv`, `esv`, `nlt`, `api:<bibleId>`. `BibleParser.getVersionLabel()` gives the label shown after a reference.

## 5. Outputs (screens)

| Output | Route | What it shows |
| --- | --- | --- |
| Projector | `/projection` | Live content in its look; video slides full screen with sound; pictures as they are; a countdown full screen or in the corner; the logo |
| Lower third | `/lower-third` | The stream look on a key colour (green by default); `?transparent=1` for OBS/vMix browser sources |
| Confidence / stage | `/confidence` | Current verse or slide, what is coming next, the clock and the countdown; its own settings |

- **Shared state:** `syncService` uses BroadcastChannel plus the localStorage keys `voice-verses-live` and `voice-verses-countdown`, so a window opened later catches up.
- **Settings → Screens** (desktop, `electron/screens.js`):
  - Each output is Off or assigned to a display.
  - The app opens that output frameless and full screen on its display (`setSimpleFullScreen` on macOS), shown with `showInactive` so it doesn't take focus.
  - It reappears when a display is plugged back in.
  - It closes and reopens with the main window.
  - Esc on an output on the main screen turns that output off. The handler is deferred with `setImmediate`.
  - It warns when an output would cover the operator's screen.
- **Screen shape** (`src/lib/screenShapes.ts`), for each look-drawn output:
  - Shapes: Match the screen (the default, measured from the output window), 16:9, 16:10, 21:9, 32:9, 4:3, or a custom size.
  - The stage is 1080 tall and `round(1080 × ratio)` wide.
  - On screens wider than 16:9 the design either **spreads** across, or stays in the **middle** 16:9 with the background filling the sides.
- **Network outputs** (`electron/network.js`, port 47100):
  - Any device's browser can show any output.
  - `/live` is a Server-Sent Events stream of the live state, templates, assignments, logo, Bible version, colour team and screen shapes.
  - `/media/:id` serves media with Range support.
  - Viewer pages are flagged with `window.__VOICE_VERSES_NETWORK__`.
- **SDI today:** use an HDMI-to-SDI converter on a spare video output, assigned in Settings → Screens. Native DeckLink output is planned.
- **ProPresenter (optional, 7.9+ API):**
  - Creates a message named "Voice Verses" (`{Verse} — {Reference}`) and triggers it with token values; can also show a stage message.
  - Host and port are validated, and requests time out after 3 s.
  - A simple "ProPresenter companion" screen exists for churches that only want that.

## 6. Looks (templates), the designer, colour teams, themes

- **Template** (`src/lib/templates.ts`):
  - **background:** colour, gradient, **moving** (made by the app), image or video, with dim and blur.
    - Moving backgrounds (`src/lib/backgrounds.ts`, drawn by `components/MotionBackground.tsx`): 17 styles: aurora, colour flow, lights (bokeh), light rays, waves, stars, glow, horizon (dawn), paper, cross of light, clouds, snow, fireflies, ripples, sunburst, light streaks and sheen. Each has two colours (team colours by default) over the background colour, and a speed from 0 (still) to 2.
    - 40 ready-made **samples** in their own colours (`BACKGROUND_SAMPLES`), grouped Worship, Scripture and prayer, Seasons, Celebration and Calm. Samples don't follow the colour team.
    - **Speed guard** (`src/lib/motionQuality.ts`, Settings → Screens → "Moving backgrounds on this computer"): Automatic (default), Always move, Keep still. In Automatic, the first time a window shows a moving background at least 960 px wide, it counts frames for 3 s after a 1.5 s warm-up; under 40 a second, this computer is marked slow and every background stands still, with a "Try moving again" button. Hidden or paused windows abandon the measurement.
    - Galleries animate only the tile pointed at or chosen.
    - They are gradients moved only with CSS `transform` and `opacity` (keyframes `vv-*` in `index.css`), timed from the wall clock so every screen and preview is at the same point.
    - Where a stage is shown under 240 px wide on screen (thumbnails), they stand still.
  - **transition:** how slides in this look arrive (see Transitions below). Default: dissolve, 0.5 s.
  - **area:** the text box in %.
  - **panel:** a box behind the text, with colour, opacity and radius.
  - **text:** font, size, weight, italic, letter spacing, colour, alignment, vertical alignment, line height, uppercase, shadow, outline, and a highlight colour.
  - **label:** reference or title; above or below; size and colour; whether to include the version.
  - **logo:** corner position and size.
  - **layers:** text, shape or image, each positioned in %, with opacity, rotation, and above or below the text.
- **Built-in looks:** scripture full screen (glow), scripture lower part, songs centred (aurora), announcements (colour flow), countdown (lights), stream lower third (green), "Lower third – colour bar", "Lower third – light card". The four projector looks are on moving backgrounds in the team colours (1.5.0), so the app looks rich from the first launch. Plain black versions are starter looks.
- **Transitions** (`src/lib/transitions.ts`, `components/Transition.tsx`):
  - Kinds: dissolve, through black, lift, zoom, push and cut, each with a length from 0.2 to 3 s.
  - A look has one; a slide in a service can choose its own (Slide settings). The incoming slide's transition is used.
  - Layers: the background, the look's own shapes and logo, and the words each change separately. When only the words change, the background and shapes carry on untouched (no flicker, a video keeps playing). Through black is the exception: it takes the whole screen down to black and up again.
  - A leaving background stays fully visible under the new one until covered, so a dissolve never dips darker. Through black fades out, then in.
  - Changing between a look, a full-screen video, a picture and a countdown also plays the transition (`OutputContent`).
  - Nothing animates when a screen first opens. A timer removes the old slide even if the window was hidden and the animation never ran.
- **Backgrounds gallery** (Looks → Backgrounds, and "All backgrounds and samples" in the designer): every style in the team colours and every sample; one click puts it behind scripture, songs, announcements and countdowns on the projector (it changes the looks those use), or behind the look being designed.
- **Assignments:** one look per output and content kind (`scripture`, `lyrics`, `announcement`, `countdown`). A slide can choose its own look.
- **Rich text in bodies:** `**bold**`, `*italic*`, `__underline__`, `==highlight==`, `[#hex]coloured[/]` (`src/lib/richText.tsx`).
- **Rendering:**
  - `TemplateRenderer` draws on the stage (`ScaledStage` provides the size).
  - `FitText` shrinks text to fit by binary search. Measure with `offsetHeight`, not `scrollHeight`.
  - Positions are in %, and sizes are px at a height of 1080.
- **Designer** (`components/designer/SlideDesigner.tsx`, on the Templates page and on any slide):
  - Drag and resize with snapping guides, an inspector for every property, undo and redo.
  - Previews in 16:9 or the projector's wide shape.
  - `DesignSlideDialog` applies a design to this slide, the whole item, or every slide of that kind.
- **Colour teams** (`src/lib/colorTeams.ts`):
  - A team has 5 colours: main, second, highlight, background and text.
  - Built-in teams: Gold, Advent purple (December), Easter white & gold (April), Pentecost red, Ocean blue, Harvest (November).
  - Look colours can be `team:<key>`, so changing the team recolours every look.
  - The app's accent follows the team (`applyTeamAccent` sets `--primary`, `--accent` and `--ring`).
  - "Change with the month" picks the team for the current month.
- **Themes** (`src/lib/lookThemes.ts`): a saved set of assignments plus a team, applied in one click.

## 6b. Starter templates (`src/lib/starters.ts`)

Ready-made choices for everything that takes a design or a set-up. Each is added as the church's own copy, to change freely. They contain titles and layouts only, never copyrighted words.

- **Looks** (Templates page → Starter looks): 10 scripture, 9 songs, 6 announcements, 6 countdowns and 6 lower thirds, many on moving backgrounds, and a plain black version of each projector built-in. They are previewed with public-domain words; lower thirds are shown over a stand-in camera picture. "Add" copies one in; "Use on projector" or "Use on stream" also assigns it.
- **Colour teams:** "More colour teams" adds Christmas, Lent (March), Royal blue, Graphite, Spring (May), Youth and Thanksgiving.
- **Themes:** Living colour (the built-ins), Classic black, Night sky, Ocean, Modern, Editorial, Christmas, Easter, Pentecost and Youth night. "Use this theme" adds its looks and colour team, then applies them.
- **Orders of service** (Service Planner → Start from an order of service): Sunday, Midweek Bible Study, Prayer Meeting, Communion, Youth, Wedding and Thanksgiving (celebration of life). Each part has a typical length, stored as a switched-off timer so the live timeline works.
- **Stage layouts** (the confidence monitor's settings): Classic, Large words, Preacher, Singers and High contrast.
- **Countdowns** (Countdown → Quick start): before the service, until the service starts, a sermon timer (stage only), a 5-minute speaker timer (stage only), offering and break.

## 7. Services, songs, media

- **Service Planner → Service Builder:**
  - Sections and items: scripture (single, range or chapter), songs (library, with arrangement chips and the CCLI line), announcements, pictures, videos (loop and sound options), countdowns (a length of time or to a time of day; projector full, corner or off; stage; stream).
  - Drag to reorder (dnd-kit).
  - **Duplicate for next Sunday** gives every item a fresh id.
- **Songs** (`src/lib/songs.ts`): sections are parsed (Verse 1, Chorus…), with an effective arrangement, credits and the CCLI licence number.
  - **SongSelect import** (`songSelectImport.ts`): `.txt` and `.usr` files, with the title, CCLI number, writers, and the copyright or "Public Domain".
  - Worship-song import from other formats (`worshipSongImport.ts`).
- **Media library:** pictures and videos are kept in IndexedDB (`files` store) and played via object URLs; thumbnails come from video stills.
- **Library folder** (optional, `src/lib/library/*`):
  - Each service or media item is a JSON file in a folder the church chooses, so any cloud drive (iCloud, Dropbox, OneDrive, Google Drive) syncs it.
  - Uses `updatedAt`, tombstones for deletions, and conflict copies.
  - Desktop watches the `services/` and `media/` subfolders; the browser uses the File System Access API.
- **AI slides** (`src/ai/slideGenerator.ts`, `AiSlidesDialog`): from a bulletin or sermon notes, makes announcement or sermon slides through a JSON schema, with scripture references resolved to real verses.

## 8. The operator's live screen (1.4.0, design 4, `components/LiveWorkspace.tsx`)

- **Top bar:**
  - The service name and date, which opens a menu of the other pages.
  - `StatusCapsule`: Start/Stop listening, a level meter, what the app is following, Mute, ♪ Song, and Auto / Ask first.
  - Search (⌘K), Countdown, Settings, and a clock with "ends hh:mm" or "n min over".
- **Timeline** (`live/ServiceTimeline.tsx`):
  - Today's service (or the one opened last), with each item as wide as its minutes. The length is the item's timer, or a typical length for its kind.
  - Each item is tinted by kind; the current one is solid with its progress.
  - It scrolls sideways; click an item to load it.
- **Now pane** (`live/NowPane.tsx`), the same pattern for scripture and songs:
  - A title and status, plus step chips: verses of the passage or near the live verse, or a song's sections (V1, C, V2.1…). Red marks live and green marks next.
  - The verse being read, large in Newsreader, with the word being read underlined at the reader's pace (`usePacedWord`).
  - What comes next, faded underneath.
  - "Heard" (the last words recognised).
- **Suggestion bar** (`live/SuggestionBar.tsx`): one suggestion at a time, with a confidence ring, "n more", Show now, Use (puts it in Next), and dismiss.
- **Screens column** (`live/ScreensColumn.tsx`):
  - Live (red frame), with Logo and Clear.
  - **Take** (Space): a raised graphite button whose arrow turns green when Next is ready.
  - Next (green frame).
  - The stream and stage screens, as chips (below 1900px) or live pictures (1900px and up).
  - Monitors keep the projector's shape and fit the window's height (`.monitor-fit`).
- **Library:** a column at 1900px and wider; otherwise a drawer from the left. The palette (`live/CommandPalette.tsx`, ⌘K or Ctrl+K) finds references, service items, songs and actions.
- **Layout by window width:** under 1000px, one column; 1000–1900px, Now and Screens; 1900px and up, Library, Now and Screens.
- **Keys:** Space or Enter = Take (or the next item); ←/→ = previous/next; Esc = clear the words; ⌘K = search.
- **Colours:** warm graphite tokens in `index.css`; `--live` and `--next` for meaning. The live look's colours softly light the window.

## 9. Keys, AI and privacy

- Keys for OpenAI, Anthropic, ESV, NLT and API.Bible:
  - On desktop they are encrypted with Electron `safeStorage` (`electron/secrets.js`) and added to requests in the main process for that provider's host only (`secrets:fetch`).
  - On the web they stay in the browser, and the user is told so.
- **AI providers** (`src/ai/providers.ts`):
  - Claude through `@anthropic-ai/sdk`, using `secretFetch` on desktop, JSON-schema output and low effort.
  - OpenAI, Ollama (`/api/chat`, any installed model) and OpenAI-compatible servers.
  - Every provider is optional.
- No account or server of ours is needed. There is no telemetry.

## 10. Installing and updating

- `build-electron.yml` runs on a tag `v*`. It builds Mac arm64 and x64 DMG and zip, plus a Windows NSIS exe, with the speech models and native modules unpacked (`asarUnpack` sherpa), then publishes a GitHub Release.
- Download names (`src/lib/releases.ts`):
  - `Voice-Verses-mac-arm64.dmg`
  - `Voice-Verses-mac-x64.dmg`
  - `Voice-Verses-Setup-win-x64.exe`
- The download page detects the Mac's chip.
- `electron-updater` installs updates silently on quit. An unsigned Mac build can't self-update, so it shows a notice with a link instead.
- Signing secrets are optional in CI and need the owner's Apple Developer account and a Windows certificate.

## 11. Pages and settings (1.4.2)

Every page except the live screen and the output windows uses `components/shell/AppShell.tsx`:
- The same quiet top bar, with the pages as one pill: Live · Services · Media · Looks · Screens · Settings. Countdown and Logo sit on the right.
- Then the page's title, what it is for, and its actions (the main one is white on graphite).
- Content sits in soft `Section` surfaces.

The pages:
- **Services** (`/service-planner`):
  - A month calendar (dots on days with services) and a "Coming up" list.
  - The chosen day's services, each with its order as a coloured bar, and Edit and Present.
  - Starter orders of service, and the church's saved orders.
- **Service editor** (`/service-builder/:id`):
  - A sticky side panel: name, date and time; "Add to …" tiles for the selected part; Find a verse; Order of service tools.
  - Sections with a colour edge by kind. Parts are soft rows; slides are drawn by the real renderer.
- **Presenter** (`/presenter`):
  - The service as sections with slide thumbnails (real renderer), with the live slide in red and the next in green.
  - A Live/Next column, with a graphite Next slide button and Start/Stop.
- **Media**:
  - Filter pills with counts, search, and drag-and-drop to add.
  - Songs as a list (writers, sections, CCLI number, Lyrics).
  - Pictures and videos as a thumbnail grid.
- **Looks:** three tabs: Design a look (every look as a picture, with where it is used, and the designer), Which screen uses what (with previews), and Colour teams and themes.
- **Screens:** what each screen shows now; Screens and Network settings side by side; setting-up notes.
- **Settings** (`/settings`, also a panel over the live screen): a sidebar like System Settings, with Bible, Listening (microphone, channel, language, speech engine, AI), Screens, Network, Songs and CCLI, Logo, Library and backup, ProPresenter, and Desktop app. Everything saves as it is changed.

Base components: buttons default to white on graphite, with neutral hovers; delete is soft red. Cards are soft rounded surfaces. shadcn's `--accent` is a neutral hover colour, and only `--primary` follows the colour team.

## 12. Saved settings (localStorage keys)

| Key | Holds |
| --- | --- |
| `voice-verses-live`, `voice-verses-countdown` | What is on screen, and the running countdown (for late-opened windows) |
| `voice-verses-send-mode` | `auto` or `preview` |
| `voice-verses-templates`, `voice-verses-template-assignments` | Looks and which look each output and kind uses |
| `voice-verses-color-teams`, `voice-verses-color-team`, `voice-verses-color-team-by-month` | Colour teams, the chosen team, follow the month |
| `voice-verses-look-themes` | Saved themes |
| `voice-verses-screen-shapes`, `voice-verses-screen-measured` | Shape for each output; the ratio measured by "Match the screen" |
| `voice-verses-motion`, `voice-verses-motion-slow` | Moving backgrounds on this computer (`auto`/`full`/`still`); when and how slowly this computer drew them, if it was too slow |
| `voice-verses-network`, `voice-verses-propresenter` | Network outputs and ProPresenter connection |
| `voice-verses-mode`, `voice-verses-ask-first`, `voice-verses-last-service` | App mode, ask-before-showing, last opened service |
| `voice-verses-countdown-setup` | Countdown defaults |
| `cornerstone-bible-version`, `cornerstone-custom-bible` | Translation in use; an imported Bible |
| `cornerstone-confidence-settings` | Stage monitor colours and sizes |
| `cornerstone-settings`, `cornerstone-services`, `cornerstone-media` | Legacy settings and fallbacks |
| `apibible-key`, `apibible-versions`, `apibible-device`, `cornerstone-esv-api-key`, `cornerstone-nlt-api-key` | Online Bibles (web build; desktop uses safeStorage for keys) |
| `ai-assistant-settings` | AI provider and options |
| `global-service-logo` | The church logo (data URL) |
| `library-sync-state`, `library-tombstones` | Library folder sync |

Desktop-only files in `userData`: `screens.json` (display for each output), saved output window placement, and the encrypted secrets.
