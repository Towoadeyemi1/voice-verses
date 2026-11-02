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
- **The header didn't line up with the body:** use one container width or padding for the header and the content.

## Hardware

- **"No signal" on the ProPresenter computer:** it has no microphone; its only inputs are a DeckLink's virtual audio devices, silent without SDI-embedded sound. "Default input" hid which device it was. Name the device behind Default, and say plainly when an input belongs to a video card (`isVideoCardInput`).
- **A DeckLink never appears in Settings → Screens:** it is a video card, not a display; macOS lists only displays plugged into a video output. Until native DeckLink output exists, an HDMI-to-SDI converter on a spare HDMI port is the way.

