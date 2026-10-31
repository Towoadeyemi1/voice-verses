---
name: design-review
description: Check any Voice Verses UI change against the design system (design 3) before it ships, and how to propose new designs to the owner. Use for any change to components, pages, CSS, or when the owner gives design feedback.
---

# Design review

The owner has rejected two designs. Their bar: like an Apple-designed app, far easier than ProPresenter, colourful but meaningful, never stark white, filling every screen.

## Before building UI

- Read `docs/DESIGN_SYSTEM.md` and open `docs/design/live-redesign-v3.html` (screenshot it with Playwright if needed).
- **New screens or big changes:** make an HTML mock-up in `docs/design/`, publish it as an artifact, and get the owner's yes before building. Show a realistic working state with real content (KJV or public-domain hymns), never an empty shell.

## Checklist (screenshot dark, light, 1440 wide, 3440 wide)

- [ ] Uses the tokens: warm graphite in dark, warm paper in light. No pure `#fff` page backgrounds and no cold blue-grey.
- [ ] Red only for ON AIR, green only for NEXT, each with its word. The colour-team accent is used for selection and actions.
- [ ] One primary action is obvious (Take). Clear is secondary. Everything else is in ⌘K or menus.
- [ ] Structure comes from spacing and light, with no boxes inside boxes and as few borders as possible.
- [ ] Text: UI at least 13px, scripture serif, tabular numbers for times, reading lines capped at about 36ch.
- [ ] Hit targets at least 36px. Space, Esc and ⌘K work. Focus is visible. Reduced motion is respected.
- [ ] Fills the window at 1280×800 and 3440×1440. Extra width goes to the library and the monitors.
- [ ] The order of service scrolls sideways and the current part is visible.
- [ ] Previews use the real renderer (`ScaledStage` + `OutputContent`) in the output's shape.
- [ ] The header lines up with the body.
- [ ] Words are plain, active and from the volunteer's side ("Take next", "waiting for Take", "Following the reader").

## When the owner gives feedback

Quote their words into `docs/LESSONS.md` (Design), change `DESIGN_SYSTEM.md` if a rule changes, and show a new mock-up before rebuilding.
