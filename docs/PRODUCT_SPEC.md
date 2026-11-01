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

- **Microphone access and sound check** (1.6.1):
  - The desktop app asks the system whether it may use the microphone (`mic:status`: granted, denied, restricted, not-determined). When refused, Settings → Listening and a failed Start listening say so, with "Open microphone settings" (`mic:open-settings`: macOS Privacy → Microphone, Windows privacy-microphone).
  - Settings → Listening runs a sound check while open: one bar for what Voice Verses hears (the chosen channel, or the first two for the normal input), and a meter per channel to pick the preacher's. "Sound is coming in" holds 2.5 s after the last sound above 5%.
  - The input is saved with its name (`audioDeviceName` in `cornerstone-settings`) and found again by name when its id changes.
  - Listening with no sound (volume under 2) for the first 10 s shows "No sound is reaching Voice Verses", with a button to the Listening settings.

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
4. **Passages:** a range becomes a passage, and each verse goes on screen as it is read.
   - **A chapter named without a verse** (1.11.0: "somewhere in Isaiah 53", "turn to Psalm 23", not "John 5 from verse 8") puts nothing on screen. The whole chapter becomes the passage, `onChapterCalled` loads it into the live screen (verse 1 in Next, "which verse?"), and the verse goes up when three pairs of its words are heard, clearly more than any other verse of the chapter (read or quoted). A verse paraphrased is offered (two or more telling words shared, more than any other verse of the chapter; 55% and up). Showing any verse ends the wait.
   - **"Verse 5"** with no book, while a chapter is called or a passage is being read, is that verse of it, said outright (in a partial, once a word follows the number).
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
6b. **Stories told in the preacher's own words** (1.10.0, `scriptureMatcher.findStory`):
   - A second index of single words (KJV and WEB, stems without a final "e"), searched by weight: words in fewer verses count more (`ln(N/df)`), words in more than 1,200 verses are ignored, and a verse is weighed by its length (gently, like BM25). Its neighbours count a little (±1 at 0.35, ±2 at 0.15), because a story is told over several verses. One verse per story is offered (others within 3 verses are dropped).
   - A few modern words also look for the Bible's own ("boat" → ship, "giant" → Philistine, Goliath; `STORY_WORDS`).
   - It needs three **telling words** (in under 300 verses: names, places, "sycamore", "fleece"), or two **very rare** ones (under 40 verses: "Goliath", "sling"), or two telling words in the verse when its chapter has three, two of them very rare (Goliath is named early in 1 Samuel 17, the sling at the end). The best match must have a word in under ~150 verses and enough weight overall.
   - Confidence = 0.3 + 0.35 × strength + 0.2 × how far ahead of the next story it is (counted fully only with three telling words), at most `STORY_MAX_CONFIDENCE` 0.9. **A story is always a suggestion, never shown by itself.** It is offered only when it is surer than the quote search's best.
6c. **While the sentence is still being spoken** (1.10.0; 450 ms from 1.11.0): every 450 ms, once the sentence has 6 words and 3 more since the last look, the quote and story searches run on the partial transcript and offer what it sounds like. Nothing goes on screen from a partial; a whole verse quoted word for word still goes up when the sentence ends (99%).
6d. **"Help me find it"** (1.10.0, `ASKED_TO_FIND`): "help me find it", "somebody find it", "can you find…", "what verse is that", "look it up", "put it on the screen", acted on once per sentence as soon as the partial has it. Everything said since the screen last changed (up to 80 words) is searched at once, more widely (two telling words are enough), the AI assistant (if on) is asked about the last few sentences together, and the operator sees "Asked to find a scripture".
6e. **Offering** (1.11.0, `offer`): each candidate is made surer by context, up to 0.98 (never enough to go up by itself): the chapter called or being read +0.15 (its book +0.05), a verse planned in today's service +0.12 (its chapter +0.06, `setPlanned`), a book hinted at in the last minute +0.1. Only the best and those within 0.2 of it are offered, none under 20% (`MIN_OFFER`). Each offer carries its sentence (`utterance`) and search (`batch`): the live screen drops a sentence's earlier, less sure guesses when a later search of it offers more.
7. **AI assistant** (optional):
   - When the words describe a verse but don't quote it (and no quote or story was found), it asks the chosen model. A sentence under 8 words is asked about with the one before it. Bible people's names (Zacchaeus, Gideon, Elijah…) also wake it (1.10.0). It asks (Claude, OpenAI, Ollama or OpenAI-compatible) for a reference using a JSON schema.
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
  - The service chosen this session; otherwise, of today's services, the one under way (started, or starting within 30 minutes); otherwise the one opened last. Each item is as wide as its minutes.
  - **Several services today** (1.9.0, `live/ServicePicker.tsx`): they sit side by side before the timeline (time and name); one click switches, loading the first part into Next without putting anything on screen.
  - **Move on by time** (1.9.0, key `voice-verses-auto-advance`): a switch after the timeline. The part on screen is timed from when its first slide went live and shows "m:ss left" on its tile. When the time is up the next part loads (strip and Next, or on screen if picking a slide goes live). Parts named sermon/word/message/preach/teach, a verse on screen, and a song being captured never move on by themselves ("time up"). The length is the item's timer, or a typical length for its kind.
  - Each item is tinted by kind; the current one is solid with its progress.
  - It scrolls sideways; click an item to load it.
- **Now pane** (`live/NowPane.tsx`), the same pattern for scripture and songs:
  - A title and status, with the **translation switch** (1.9.0, `live/VersionSwitcher.tsx`, "KJV ▾") beside a chapter or verse: KJV, ASV, WEB, plus ESV/NLT with a key and the chosen API.Bible translations. Changing it refetches the chapter, Next and the verse on screen, and re-sends it. Step chips (verses or song sections) show only when nothing is loaded into the strip.
  - **The slides strip** (1.9.0, `live/SlideStrip.tsx`) along the bottom: every slide of what is loaded, as 184px pictures drawn by `OutputContent` (verses of a chapter as text cards), each with its label (V1.2, C, 16) and first words. Live is framed red ("Live · V2"), Next green, done slides faded. Click = pick (per the switch above Live); double-click = show now; the pencil = Quick edit. It scrolls to keep Live in view. "See all slides" makes it a grid filling the middle; "Show the words large" goes back. A part with its own countdown shows "Countdown 5:00 · starts with the first slide" (then "running").
  - The verse being read, large in Newsreader, with the word being read underlined at the reader's pace (`usePacedWord`).
  - What comes next, faded underneath.
  - "Heard" (the last words recognised).
- **Suggestion bar** (`live/SuggestionBar.tsx`): the surest suggestion of the last 20 seconds (else the newest), with a confidence ring, Show now, Use (puts it in Next) and dismiss. Clicking it or "All n" (1.11.0) opens every suggestion of the last 3 minutes (at most 12), newest first, each with its ring, how long ago, Show now, Use and dismiss, and "Clear them all".
- **Screens column** (`live/ScreensColumn.tsx`):
  - **When I pick a slide: Goes live | Waits in Next** (1.9.0, `lib/clickMode.ts`, key `voice-verses-click-mode`, default Waits in Next). It applies to the strip, step chips, Library verses and songs, parts of the service, ⌘K picks and moving on by time. Verses found by listening keep following Auto / Ask first.
  - Live (red frame), with Edit (Quick edit, for a slide), Logo and Clear.
  - **Take** (Space): a raised graphite button whose arrow turns green when Next is ready.
  - Next (green frame), with Edit. If Next is the first slide of a part with its own countdown, the picture shows that countdown, as the room will see it.
  - The stream and stage screens, as chips (below 1900px) or live pictures (1900px and up).
  - Monitors keep the projector's shape and fit the window's height (`.monitor-fit`).
- **Quick edit** (1.9.0, `live/QuickEdit.tsx`): title, section name, words (lyrics, announcement, picture caption) and look, beside a picture of how the room will see it. Saved to the slide's service in IndexedDB (or for this time only for a library song), in the strip and Next, and re-sent to the screens if live. Scripture keeps the Bible's words; only its look changes.
- **Part countdowns** (1.9.0): when a slide of a part whose `countdown.enabled` (and `autoStartCountdown` is not false) goes live, its countdown starts (`countdownFromConfig`); it is stopped when a slide of another part goes live. Only the countdown this screen started is stopped.
- **Library:** a column at 1900px and wider; otherwise a drawer from the left. Bible tab has the translation switch. Service tab (1.9.0) groups services under Today, Coming up, Earlier and Samples (date tile, time, number of parts, a green dot on the one on the timeline); inside, sections carry their timeline colour and each part its slides and minutes, the loaded one marked. The palette (`live/CommandPalette.tsx`, ⌘K or Ctrl+K) finds references, service items, songs and actions.
- **Layout by window width:** under 1000px, one column; 1000–1900px, Now and Screens; 1900px and up, Library, Now and Screens.
- **Keys:** Space or Enter = Take (or the next item); ←/→ = previous/next; Esc = clear the words; ⌘K = search.
- **Colours:** warm graphite tokens in `index.css`; `--live` and `--next` for meaning. The live look's colours softly light the window.

## 8b. Samples, welcome and demo (1.7.0)

- **Samples** (`src/lib/samples/`): the first time the operator window opens (`seedSamplesOnce`, key `voice-verses-samples`), three services are added: "Sample: Sunday Celebration" (today, 10:00), "Sample: Christmas Carols by Candlelight" (20 December, using the night-sky and rising-lights looks) and "Sample: Midweek Bible Study" (next Wednesday). Nine public-domain hymns and carols are added too (tag `sample`, category Samples). Scripture comes from the bundled KJV.
  - Services carry `sample: true`. The live screen and the Library only fall back to samples when the church has none of its own; a church song with the same title replaces the sample song in matching.
  - Services → "Remove samples" / "Add samples". Removed samples are never added back by themselves.
- **Welcome view** (`components/live/WelcomePane.tsx`): shown in the middle of the live screen while nothing is loaded or live. It has a greeting, "<service> is ready.", Start listening, "Watch a 1-minute demo", find (⌘K), a picture card for each part of today's service (click to load) and quick verses. The first slide of the service waits in Next from the start.
- **Demo** (`src/lib/demoScript.ts`): scripted words fed through the real detector, with Auto send for its length (restored after). It shows:
  - John 3:16 called, read and followed to 3:17;
  - "And Paul says the same thing in Romans" → Romans 5:8 in Next;
  - the quote offered with its percentage and taken by the operator;
  - Blessed Assurance followed, with "Verse two!" and "Back to the chorus";
  - new lines offered as a new song.
  A bar shows each step with Stop the demo. Starting to listen stops it.
- The overrun ("N min over") shows only on the service's day, for the church's own services, and up to 90 minutes.

## 8c. Countdowns, alerts and screens (1.8.0)

**Countdowns** (`src/lib/countdown.ts`):
- Several can run at once. Each has its screens (projector full/corner/off, stage monitor, stream), `warnSeconds` and `flash`. Starting one takes only its screens from those already running, so each screen can count to something of its own. Section timers from Presenter work the same way.
- Tones: normal; yellow (`#facc15`) from `warnSeconds` left; red (`#ef4444`) at zero. With `flash`, the time blinks (`.vv-blink`, 1 s) while yellow or red.
  - Projector: the full-screen numbers change colour, and the corner timer's box turns amber or red.
  - Stage monitor: every stage countdown is listed with its message (when there are several), and when over shows a red box with how far over it is.
- The sync message `COUNTDOWN` carries `countdowns` (and `countdown`, the first, for older screens). `voice-verses-countdown` holds the list.
- The panel lists what is running (time in its tone, +1 min, −1 min, Stop, Stop them all) above the form: quick starts, length or until, message, Show it on (All screens, Projector, Stage monitor, Stream, plus full screen or corner), Turn yellow with (30 s, 1, 2, 5 min) and Blink.

**Alerts** (`src/lib/alerts.ts`):

- An alert is a short message over whatever is on screen, without changing it: `{ text, projector, stream, stage, position: bottom|top, urgent, flash, until? }`.
- Several can be up at once. A new alert takes only the screens chosen for it; alerts already up keep their other screens and are dropped when they have none left. Each screen shows its newest.
- Alerts are sent like countdowns: sync message `ALERT` with `alerts` (and `alert`, the first, for older screens), kept in `voice-verses-alert` (a list) so reopened windows show them, and included in the network snapshot.
- **Projector and stream** (`components/AlertBanner.tsx`): a dark rounded bar 5% from the bottom (or top), 54 px bold Figtree, with the team colour along its left edge and a glowing dot. Urgent alerts are amber. It is drawn on the stage canvas over everything, the logo included, and on the operator's Live monitor and stream preview.
- **Stage monitor:** a full-width bar across the top (blue, or amber when urgent) at 90% of the verse size.
- **Operator** (`components/AlertControl.tsx`): an "Alert" button beside Countdown on the live screen, every page and Presenter. It turns amber ("Alert on") with a × to clear while one is up.
  - Presets for the room: nursery, children's church, car lights, move a car, seats at the front. Presets for the stage only: five minutes, please wrap up, a little louder, microphone off.
  - The number or number plate is typed in; any message can be written instead.
  - Options: which screens, where, normal or amber, and hide after 15 s, 30 s, 1 min, 2 min or until cleared. A preview shows the projector.

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
| `voice-verses-click-mode` | `live` or `next`: what picking a slide does (1.9.0) |
| `voice-verses-auto-advance` | `on` or `off`: the service moves on by time (1.9.0) |
| `voice-verses-templates`, `voice-verses-template-assignments` | Looks and which look each output and kind uses |
| `voice-verses-color-teams`, `voice-verses-color-team`, `voice-verses-color-team-by-month` | Colour teams, the chosen team, follow the month |
| `voice-verses-look-themes` | Saved themes |
| `voice-verses-screen-shapes`, `voice-verses-screen-measured` | Shape for each output; the ratio measured by "Match the screen" |
| `voice-verses-alert` | The alert on screen, if any (see §8c) |
| `voice-verses-samples` | When the sample services were first added (they are never added again by themselves) |
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
