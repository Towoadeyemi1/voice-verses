# Lessons: mistakes already made, and their fixes

Check this list before debugging. Add every new mistake that cost time.

## Building and running

- **Electron window blank:** `dist/` was a web build (absolute `/voice-verses/` paths). Build with `ELECTRON_BUILD=true` before running Electron from `dist/`.
- **`virtual:pwa-register` breaks the Electron build:** VitePWA must be `disable: isElectronBuild`. Keep the registration code guarded.
- **`vite preview` shows 404s:** the web build needs `VITE_BASE_PATH=/voice-verses/`. Open `/voice-verses/`, not `/`.
- **`pkill -f "vite preview"` or `pkill -f electron` killed the calling shell** (exit 144), because the pattern matched the shell's own command line. Use `pkill -9 -x electron`, or kill by PID.
- **Tailwind config missing from a commit:** after a styling change, check `git status` for `tailwind.config.ts` and the fonts.
- **Lint:** about 37 errors are old (`any` in bibleParser, ServiceBuilder, MediaLibrary; tailwind `require`; ui files). Compare the count before and after a change, and add none. A literal NBSP in source is a lint error, so write ` `.
- **A Python edit script truncated `Presenter.tsx`.** After any scripted edit, check `git diff --stat` and restore from git if a file shrank unexpectedly.

## Electron specifics

- **"External buffers are not allowed"** in the speech worker: use `vad.front(false)` (copy, don't share).
- **`fs.watch` with `recursive` doesn't work on Linux.** Watch each subfolder (`services/`, `media/`).
- **Output window placement wasn't remembered:** `window.open` sizes overrode `setBounds`. Set placement in `overrideBrowserWindowOptions`, and save on `close` too.
- **The projector stole focus from the operator:** create output windows with `show: false`, call `place()`, then `showInactive()`, and refocus the operator window.
- **Destroying a window inside its own input event hung Electron** (Esc on an output). Defer with `setImmediate`.
- **Closing the main window left outputs orphaned:** `suspendScreens()` on close and `resumeScreens()` on reopen. `activate` checks `!mainWindow`.
- **Detection stopped when the app wasn't focused:** Chromium throttles background windows. Use the three command-line switches, `backgroundThrottling: false`, and both power-save blockers.
- **The `screen` module can't fake a second display under Xvfb/xinerama.** In tests, patch `screen.getAllDisplays`, `getPrimaryDisplay` and `getDisplayMatching`, and emit `display-added` (see `tools/e2e/lib.cjs`).

## Rendering

- **Text didn't fit the screen; the lower third overflowed:** never size text in fixed px without fitting. Use `FitText` on the shared stage.
- **`FitText` shrank countdown digits to nothing:** `scrollHeight` includes glyph overhang. Compare `offsetHeight <= clientHeight + 1`.
- **KJV margin notes `{for: or, of}` and italic braces `{his}` appeared on screen:** detect notes (`:`, `; or,`, `Heb.`) and remove them; render `{word}` as italics (`src/lib/verseText.ts`).
- **The confidence preview showed only the reference:** previews must render the real `ConfidenceScreen` component, not a copy.
- **CSS container units:** an element can't size with `cqw` against itself. Put `container-type` on the parent (found in the design 3 mock-up).
- **A class name shared by layout and content** (`.now` for both the pane and a timeline segment) silently broke layout. Use specific names.
- **`useEffect(() => el.scrollIntoView(...))` crashed with "c is not a function":** that Chromium returned a Promise from `scrollIntoView`, and an arrow without braces returns it as the cleanup. Always use braces in effects.

- **Moving backgrounds came out flat grey:** CSS `color-mix()` does not work inside an SVG `fill` in a data URI, and older Safari lacks it. Work colours out in JavaScript (`rgba()`, blended hex).
- **Blending two team colours halfway made grey** (gold and blue are opposites). Blend a colour towards the background colour instead.
- **A dissolve dipped darker halfway:** two opaque layers each at 50% let black show through. The leaving background holds at full opacity under the new one (`vv-hold`).
- **Crossfading the whole slide flickered shapes and logos** that were the same on both slides. Transition the background, the look's own layers and the words separately, each keyed on what actually changed.
- **Measuring background cost:** under Xvfb there is no graphics chip, so it shows the worst case. Plain slides drew at 60 fps; full-screen soft gradients at 17–25.
  - Stepped animation timing (`steps()`) saved nothing: the screen is still redrawn every frame.
  - One element drawing a whole field of lights with `box-shadow` was **slower** (18 fps) than many tiny separate layers (33 fps). Chromium skips empty tiles, so small separate layers cost little.
  - Fold static overlays together (the vignette and the darkening are one layer).
- **Keep the leaving slide's React key** when it moves to the "leaving" list, or React remounts it and a video behind it restarts.

- **"Can't get sound" after an update (1.6.0):** unsigned (ad-hoc signed) Mac builds get a new code signature with every version, so macOS can treat the update as a new app. It may refuse the microphone without asking, while System Settings still shows it switched on. The app now asks the system (`mic:status`), says so plainly and opens the privacy pane (`mic:open-settings`). Signing with the owner's Apple Developer ID ends this for good.
- **A saved input can come back with a new id** (an update, replugging, a cleared profile). Save its name too and find it again by name.
- **A sound-check message that follows the instant level flickers** between words. Hold "sound is coming in" for about 2.5 s after the last sound.

- **Writing a very large file in one go failed several times** (the sample library), and the owner saw repeated "writing it now" messages with nothing saved. Write big content in several smaller files.
- **Adding a second "Start listening" button** (the welcome view) broke e2e scripts that clicked it by name. Use `.first()`, or scope to the capsule.

## Detection

- **Psalm 23:1 was only suggested, or shown late:** words heard were cleared after a suggestion. Keep them, use a quote window of the last 18 words, and skip the verse already on screen.
- **That change made John 3:15 match while 3:16 was being read:** skip quote search while the reader is still in the verse on screen (`wordsFrom(current) >= 2`).
- **Whole-verse quotes never reached 99%:** coverage ignored common trigrams and the window was too short. Measure coverage with all trigrams over the last 40 words, and count only rivals with at least 3 hits.
- **Paraphrased stories were never found offline:** only runs of three words in a row were searched, and only after the sentence ended. Single rare words (names, places) carry a story; search them, while the sentence is spoken (1.10.0).
- **The stemmer made "loves" look rare:** `stem` keeps "love" from "loves" but makes "lov" from "love". For counting how rare a word is, also drop a final "e" (`storyStem`), or common words pass as telling ones.
- **One rare word is not a story:** "please your neighbour" matched Romans 15:2. Ask for three telling words (or two very rare ones), and don't let a lone match look sure: distinctness counts fully only with three telling words.
- **A story's words are spread over its chapter:** Goliath is named in 1 Samuel 17:4 and the sling is in 17:50. Count the telling words of the whole chapter when the verse itself has two.
- **Verse 1 went up for "somewhere in Isaiah 53":** a chapter reference defaulted to verse 1 and was shown like a verse said outright. A chapter alone now waits for the verse (D24).
- **Good suggestions sank under faint late ones:** the bar showed the newest. Show the surest of the last 20 seconds, let a later hearing of the same sentence replace its earlier guesses, and keep the full list one click away.
- **"30% sure" confused the owner when the verse was right:** the number is how much wording was heard, not a probability. Say the strength in words and why it is offered; never hide faint matches behind a cut-off.
- **A range or chapter showed only its first verse:** a range must become a passage that is followed (`followPassage`, then the reading tracker).
- **The word tracker was too slow for fast readers:** search the whole rest of the verse, with neighbour agreement, and estimate pace between recognitions.
- **Slow on older Macs:** partials piled up. Make partials lag-aware (`MAX_LAG`) and adapt the interval to decode time.
- **Search failed with punctuation:** simplify text (lowercase, letters only) before matching.
- **A reference in a partial ("John 3:1…") went live before it finished ("…6"):** act on a partial only when at least 2 words follow the reference.

## Online Bibles

- **NLT footnotes leaked into verses:** the `tn` footnote holds a nested `tn-ref` span, so a non-greedy regex stopped early. Remove `tn-ref` first, then `tn`.
- **API.Bible can't be tested without a key** (401). Unit-test the parsers on saved JSON; the owner tests live.

## Process

- **Tag pushes are blocked here** (403 or the classifier). The owner creates releases in the GitHub UI.
- **A capital `V1.1.0` tag did not trigger the build.** Tags must be lowercase `vX.Y.Z`.
- **The build-electron run failed for billing:** GitHub Actions needed the owner's payment method. If CI doesn't start, check billing before the code.
- **Installed the arm64 build on an Intel iMac** ("not supported on this Mac"): the download page detects the chip. Tell users which build to get.
- **YouTube and Buzzsprout downloads were blocked** (bot checks). Don't get around them; ask the owner for the audio file or use the TTS test audio.
- **Force-push is blocked.** Make a new branch instead.
- **The GitHub merge tool needs the full 40-character SHA** when a SHA is given.
- **E2E failures that were the test's fault, not the app's:**
  - The "Song" thumbnail matched a "Song" button.
  - dnd-kit menus needed keyboard focus plus Enter.
  - "Save as Template" was clicked instead of "Save".
  - Use exact names and roles.
- **Test words for songs:** a test line quoted a modern song's title and opening line. Use public-domain hymns (Amazing Grace, the Doxology, Be Thou My Vision) or words written for the test.
- **"One more time" at the first slide of a section** is ambiguous: the section just sung, or this one? It means the one just sung only if the lyrics moved on in the last few seconds. Record when the follower moves the lyrics in the controller itself; the window's later `setLiveLyrics` sees no change.
- **A captured spontaneous song must not be followed** by the song follower, or its own lines move the slides and end the capture.
- **Sending a verse to an output open in the same window:** `localStorage` changes don't fire `storage` events in the window that made them. Post on a new `BroadcastChannel('cornerstone-bible-sync')` too (`tools/e2e/transitions.cjs`).
- **The starters e2e broke silently in 1.4.2** when themes moved to their own tab. Run every e2e script, not only the one for the feature.
- **IndexedDB in tests:** open version 2 and create the stores (`services`, `media` with keyPath `id`; `settings`, `state`, `files`) before seeding.
- **Merging main into a feature branch** dropped a closing brace in `detector-check.ts`. Run the detector check after every merge.
- **A component used a prop (`still`) that existed only on an unmerged branch.** Build from `main` before opening a PR.

## Design

- **The owner rejected design 1** ("not like a standard app like ProPresenter, does not fill the screen") **and design 2** ("not like an Apple designed application… the white color looks so bad… why is it just monochrome?").
  - Never ship stark white or monochrome grey.
  - Fill the window.
  - Colour must carry meaning.
  - The order of service scrolls sideways.
  - Follow `DESIGN_SYSTEM.md`, and show a mock-up before building.
- **Mock-ups 1 and 2 quoted copyrighted worship lyrics, and so did the test songs and the lyrics placeholder.** All were replaced with public-domain hymns (Amazing Grace, Holy Holy Holy, the Doxology, It Is Well). Song titles are fine; lyrics are not. **This is only about the public code.** The owner's library holds the SongSelect songs they paid for, and the app is built to import, show and follow them. When explaining this rule, say that clearly: the owner was alarmed when it sounded as if their own songs weren't allowed.
- **Owner on design 3:** "can be better aesthetically and looking very clean, intuitive and very easy to use". They also asked why the mock-up had Laptop and 45″ switches instead of detecting the screen. Mock-ups must adapt to the real window, as the app does, never with pretend device switches.
- **The `.now` class was used twice again in design 4**, for the current timeline part and for the main pane. Also, `.app > * { position: relative }` turned the absolute ambient layer into a grid item and shifted every row. Exclude overlay layers from such rules, and give the app grid `grid-template-columns: minmax(0, 1fr)`, so a long scroller can't widen the page.
- **Owner on the Take button:** "Why is the take button yellow like that… it doesn't look good at all." A large flat slab in the colour team's colour (Gold by default) clashed with the red Live and green Next frames, and the three together read as a traffic light. Large controls are now quiet raised graphite. The team colour is for small accents and tints only, never big solid areas next to the red and green frames.
- **shadcn's `--accent` is a hover surface, not a brand colour.** Setting it to the colour team made every menu item, outline button and hover turn yellow. Only `--primary` follows the team.
- **Calendar: when today is also the selected day, the "today" text colour won over the selected text colour** and the date vanished (white on white). Mark selected styles `!important`, and don't set a text colour for today.
- **Owner on 1.13.0's Settings pages (Features, booth check, ProPresenter set-up, screen tiles):** "I am very disappointed with the aesthetics, design standards and usability, ease and intuitiveness approach. It seems these few pages or sections you added are devoid of the aesthetic standards we have discussed over and over again. Every part of the app must have that excellence." They were built straight into the old Settings panel: shadcn Cards inside a pane (boxes inside boxes), long paragraphs, plain forms, a stark white full-width button, no picture of the real thing. **Every new page or section, however small, gets a mock-up and the design checklist first**, and is screenshotted in both themes before it ships. Settings is redesigned in `design/settings-redesign.html`.
- **The header didn't line up with the body:** use one container width or padding for the header and the content.

## NDI (1.15.0)

- **Strings handed to NDI must outlive the call.** koffi passes a JS string as a temporary C string for one call; NDI keeps the source name it is given (`NDIlib_recv_create_v3`, and possibly `NDIlib_send_create`), so the receiver crashed later. Pass names as Buffers ending in `\0`, typed `void *`, and keep them as long as the sender or receiver.
- **A function returning a struct pointer** declared as `const T *` is decoded by koffi into one object; declare it `void *` and `koffi.decode(ptr, koffi.array(T, n))` for lists (`NDIlib_find_get_current_sources`).
- **Copying an 8 MB frame out** with `koffi.array('uint8_t', n)` builds a JS array and seems to hang; add the `'Typed'` hint for a Uint8Array.
- **NDI calls block,** so a test receiver in the same process as a sender starves it: receive in another process (`tools/e2e/ndi.cjs` runs `ndi-receiver.cjs` with `execFileSync`).
- **Chromium's offscreen bitmaps are premultiplied; NDI's BGRA is not.** Unpremultiply partly see-through pixels before sending, or edges of the lower third darken.

## spirit (1.17.0)

- **"Before we go any further" was taken as the close of the service.** Moment phrases must be narrow ("as we close this service", "go in peace"); and no two moments within 8 s.
- **Learning by watching first suggested several overlapping pieces of one sentence** ("as the ushers make", "the ushers make their way"). Keep only the last 3 sentences within 15 s of the operator's pick, and join overlapping phrases that came from the same occasions into one.
- **Two computers sharing what spirit learned can rewrite each other for ever** when every save stamps a new time. Compare what is in the file without the times before writing it.
- **A find-and-replace of "Spirit" also changed the Bibles** (the Holy Spirit in KJV, WEB and ASV) and the test sentences. They were put back at once. Rename only in the files that name the feature, and check `git diff --stat` shows nothing under `src/data/`, `src/lib/samples/` or `tools/speech-eval/sentences.json`.
- **The first spoken e2e run timed out** while the speech models warmed up; give spoken checks a generous wait (spirit.cjs waits up to a minute for the first cue).

- **A service named "Sunday Celebration" was guessed as a Midweek service** because the sample is dated today (a Thursday in the test). The name decides before the day.
- **spirit's next song replaced the slides in the middle** while the last slide was still being sung, which would have broken following the singers. What spirit gets ready now waits in Next only; its part comes into the middle when it is taken (`goLive`).

## Listening got slower (1.18.0 → 1.18.2)

- **The owner: "the detection of what the speaker is saying is now very bad".** The words were the same; the live results were not. Measure before guessing: the same recording through the old and new builds (`tools/e2e/listening-load.cjs`; for an old build, `git worktree add` it and symlink `node_modules`).
- **Anything that keeps the live screen's thread busy holds back the sound.** The microphone's samples pass through the window on their way to the speech engine. If they arrive late, the engine skips live (partial) results (`MAX_LAG`), so words and verses come late.
- **Never redraw the live screen per audio frame.** The meter was set 125 times a second, and each redraw did spirit's work. Throttle the meter (about 15 a second), and work out anything derived with `useMemo` from state already loaded.
- **Never read or write a large saved state in a hot path.** `loadSpirit()` parses everything spirit learned; calling it inside a render, or saving after every sentence, costs milliseconds each time. Use what is loaded (`cueModeIn`, `moveModeIn`) and batch writes (`hearSoon`, `flushHeard` every 20 s).
- **A CSS animation that never stops keeps the window drawing 60 times a second.** Keep marks still on the live screen (`SpiritOrb still`).
- **The web build overwrites the desktop build in `dist/`.** Build the desktop renderer last before running e2e, or the app will not load and the tests hang.
- **A service made from a saved order shared its parts' and slides' ids with the order** (the old "Your saved orders" copied the template as it was). Two services with the same slide ids get mixed up on screen and in spirit's records. Templates and the services made from them now always get new ids.

- **Read the whole screenshot before diagnosing.** The owner's ProPresenter picture showed the message detail of "Service Countdown" (it was selected) and I concluded Voice Verses had changed it; the next picture showed the separate "Voice Verses" message, on air. A wrong diagnosis costs more trust than "I can't tell from this; here is how we find out".
- **When ProPresenter takes a verse but shows nothing, ask ProPresenter, don't guess.** `diagnose()` reads the message (`/v1/message/{uuid}`), `/v1/status/layers`, `/v1/status/screens` and `/v1/look/current`, and says what each means. Address the message by the uuid read back from `/v1/messages`; never create one with an empty uuid and index 0 (an id may be read as a uuid, a name or an index).

- **A verse Voice Verses kept re-sending beat the operator's Hide in ProPresenter.** Two people (or two apps) driving one output must notice each other: before sending, check whether what was sent is still showing (`/v1/status/layers`); if someone hid it, stop and offer Send again. Clear what you put up when your own screens clear, and only that.
- **"Best-suited theme" meant a full-screen scripture theme.** For a message over other content, prefer a lower third.

## Hardware

- **"No signal" on the ProPresenter computer:** it has no microphone; its only inputs are a DeckLink's virtual audio devices, silent without SDI-embedded sound. "Default input" hid which device it was. Name the device behind Default, and say plainly when an input belongs to a video card (`isVideoCardInput`).
- **A DeckLink never appears in Settings → Screens:** it is a video card, not a display; macOS lists only displays plugged into a video output. Until native DeckLink output exists, an HDMI-to-SDI converter on a spare HDMI port is the way.
- **"groups.forEach is not a function" with ProPresenter 21:** `/v1/themes` became an object (`{ system, groups }`) instead of a list. Read API answers by what they contain (any object with `slides` is a theme), not by one version's shape (`themeSlidesFrom`, checked in QA by `tools/checks/propresenter-themes.mjs`).
- **Build output reached main:** `git add -A` on another branch (whose `.gitignore` didn't list `native/decklink/build/`) committed node-gyp output. Ignore build folders on `main` first, and look at `git status` before `git add -A`.
- **"Needs both a {Verse} and a {Reference} token" with both tokens there (ProPresenter 21.4):** the check trusted one version's answer (`tokens[].name` in `/v1/messages`). Read the message itself too, accept other shapes, and when the API doesn't say, let the operator send a test verse instead of blocking them (`messageReadiness`, `tools/checks/propresenter-messages.mjs`).

