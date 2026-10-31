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

## Detection

- **Psalm 23:1 was only suggested, or shown late:** words heard were cleared after a suggestion. Keep them, use a quote window of the last 18 words, and skip the verse already on screen.
- **That change made John 3:15 match while 3:16 was being read:** skip quote search while the reader is still in the verse on screen (`wordsFrom(current) >= 2`).
- **Whole-verse quotes never reached 99%:** coverage ignored common trigrams and the window was too short. Measure coverage with all trigrams over the last 40 words, and count only rivals with at least 3 hits.
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
