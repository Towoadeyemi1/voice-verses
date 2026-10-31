# Design system (design 3)

The reference mock-up is [`design/live-redesign-v3.html`](design/live-redesign-v3.html). It is interactive and covers before the service, worship, preaching, light, dark, colour teams and an ultrawide monitor. Designs 1 and 2 were rejected. They are not kept in the repo because they quoted copyrighted worship lyrics; their lessons are in `LESSONS.md` → Design.

## What the owner asked for (non-negotiable)

- It must look like an Apple-designed app and be far easier than ProPresenter.
- **Colourful, never monochrome. Never stark white.**
- Fills the whole window and any monitor, including 45″ ultrawide.
- The order of service scrolls horizontally.
- One obvious way to do the main job.

## Research behind it (October 2026)

| Source | Finding | Rule it gave us |
| --- | --- | --- |
| ProPresenter | Mode toolbar (Show, Edit, Reflow, Bible, and more), 7 separate Clear buttons; reviewers report a steep curve for volunteers and most features unused | One screen, no modes. One Clear (Esc), with the layers behind a menu |
| ATEM, vMix tally | Red = on air (program), green = next (preview). Operators misread when only a header is coloured | Full red and green **frames** plus the words ON AIR and NEXT. One **Take** between them |
| Linear 2026 refresh | "Don't compete for attention you haven't earned"; "structure should be felt, not seen"; warmer greys; dimmed sidebar | Few borders. Separate areas by space and light. Warm graphite greys, and the library as a quiet rail |
| Final Cut Pro, Logic | Fixed regions on one screen; the viewer is the hero; areas are shown or hidden, never floating | Fixed layout, the same every Sunday. On wide monitors the library opens as a column |
| Liquid Glass (macOS Tahoe) | Content-first material, but readability suffers over busy content | Glass only on the toolbar and the ⌘K palette. Reading surfaces are solid |
| FreeShow, EasyWorship | Clean but "less guided" | Next is always filled with the app's best guess, so the only decision is Take or not |

## Layout of the live screen (1600×1000 at its base size)

1. **Toolbar (52px, glass):**
   - Window controls, then the service name and date.
   - A centred ⌘K command field.
   - Mic status with a live level meter.
   - Auto / Ask, ♪ Song, and screens status.
2. **Timeline (96px):**
   - The order of service, with width proportional to minutes.
   - Each part is a solid colour by kind. Past parts are desaturated; the current part has a white ring and a progress fill.
   - A red playhead with the time.
   - On the right: the clock and status, with "ends 11:41" in orange when running over.
   - Scrolls sideways.
3. **Body**, three columns:
   - **Library rail:** 60px of icons on a laptop, or a 320px column on an ultrawide.
   - **Now pane:**
     - Scripture: the passage header, verse chips, and the verse in a large serif (52px) with the current word lit; Next appears below it in italics.
     - Song: the song's sections as tiles, with On Air framed red, Next framed green, and the sung line lit.
   - **Screens column** (532px; 640px on an ultrawide):
     - ON AIR monitor (red frame and glow).
     - **Take next** (Space): full width, 54px, ink on paper.
     - NEXT monitor (green frame).
     - A row of small outputs (stream lower third composited over a camera, stage monitor, lobby), each with a tally dot.
4. **Assistant lane**, at the bottom of the Now pane:
   - "Heard" with the words heard and any reference recognised as a chip.
   - Three suggestion cards, each with a **confidence ring**: green ≥ 90%, accent ≥ 60%, grey below. Click a card to put it in Next.

Monitors take the projector's shape (`usePreviewStage('projection')`). The output windows themselves follow the screen shape (`docs/PRODUCT_SPEC.md` §5).

## Tokens

```css
/* Light ("warm paper") */
--page: #efebe5; --win: #f7f4ef; --surface: #ffffff; --sunken: #ebe6de;
--ink: #1d1b20; --ink-2: #5d5862; --ink-3: #96909b; --line: rgba(40,30,50,.08);
--glass: rgba(250,247,242,.72);
/* Dark ("warm graphite"), the default in the booth */
--page: #0e0d10; --win: #161518; --surface: #1f1d22; --sunken: #121114;
--ink: #f4f1f6; --ink-2: #b2abb7; --ink-3: #78727e; --line: rgba(255,245,255,.07);
--glass: rgba(30,28,34,.7);
/* Meaning (both themes) */
--air: #ff3b30 / #ff453a (dark);   /* ON AIR */
--next: #1fb954 / #30d158 (dark);  /* NEXT */
--accent: the colour team's main colour; --accent-soft: the same at about 16% alpha
```

- **Parts of the service** (gradient `c1 → c2` at 135°):
  - Before: slate `#64748b → #334155`
  - Welcome: orange `#fb923c → #ea580c`
  - Worship: violet `#a78bfa → #7c3aed`
  - Prayer: teal `#2dd4bf → #0d9488`
  - Notices: amber `#fbbf24 → #d97706`
  - Word: blue `#60a5fa → #2563eb`
  - Response: rose `#fb7185 → #e11d48`
  - Giving: green `#4ade80 → #16a34a`
  - Close: indigo `#818cf8 → #4f46e5`
- **Ambient light:** two large radial gradients use the live slide's two main colours behind the whole window. Opacity is 0.14 in light and 0.32 in dark, with a 1.2 s transition when the slide changes. This is where the app gets its colour.
- **Type:**
  - UI: `-apple-system, "SF Pro Text", Figtree, "Segoe UI Variable", system-ui`. Bundle Figtree for Windows.
  - Display: SF Pro Display or Figtree, at weight 700 with -0.02em tracking.
  - Scripture and lyrics: `Newsreader, "New York", "Iowan Old Style", Georgia`.
  - Use tabular numbers for times.
- **Radius:** 16 for the window, 14 for cards and Take, 12 for monitors, 9–10 for controls, and pills fully round.
- **Shadow:** only on what floats (the window, the palette, a card on hover) and the ON AIR glow.

## Rules

1. Colour means something:
   - Red and green are only ever On Air and Next.
   - The accent (colour team) marks selection and the app's actions.
   - Service-part colours appear only on the timeline and its chips.
2. Every state shows its words too (ON AIR, NEXT, "Following the reader", "waiting for Take"), not just colour.
3. One primary action is visible: **Take**. Clear is secondary. Everything else is in ⌘K or a menu.
4. The same thing stays in the same place every Sunday. Nothing floats or rearranges itself.
5. Text sizes: at least 13px for UI, 14px for body text, 52px for scripture in the Now pane, and 11px uppercase with letter spacing for small labels.
6. Click targets are at least 36px tall. Keyboard: Space = Take, Esc = Clear, ⌘K = command, ←/→ = previous/next, number keys pick a verse chip.
7. Light mode is warm paper, not white. The monitors always stay dark, because they show screens.
8. **Wide screens:** extra width goes to the library column and bigger monitors, never to longer lines of reading text (cap at 36ch).
9. Motion is short (150–300 ms) and meaningful: the word highlight, a crossfade on Take, the playhead. Respect `prefers-reduced-motion`.
10. Glass only on the toolbar and the palette.

## Building it into the app

- Put the tokens in `src/index.css` as CSS variables, keeping shadcn's names mapped: `--background` = `--win`, `--card` = `--surface`, `--primary` = `--accent`. Dark should be the default, with a light option.
- Live screen components (replace `LiveWorkspace` panels):
  - `ServiceTimeline`, `ToolbarStatus`, `NowPane` (`ReadingNow` and `SongNow`).
  - `AssistantLane` (Heard plus `SuggestionCard` with `ConfidenceRing`).
  - `ScreensColumn` (`MonitorFrame`, `TakeButton`, `OutputTally`).
  - `CommandPalette` (⌘K).
- Reuse the existing logic: `useLive`, the detection controller callbacks, `OutputContent` and `ScaledStage` for the monitors, `usePreviewStage`, and colour teams for the accent.
- Then restyle the Service, Media, Templates and Settings pages with the same tokens. Those pages are documents, so use the paper and graphite surfaces with section headers, not dashboards.
