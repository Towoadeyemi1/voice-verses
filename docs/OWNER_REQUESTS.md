# Everything the owner has asked for

The owner asked: "please remember everything that I have asked for and said that I wanted". This is that list, in their words where possible, with where each request stands. **Read it before planning any work. Add every new request the moment it is made, and update its status when it ships.** Nothing here may be dropped or reversed without the owner saying so.

Status: ✅ shipped (version) · 🟡 partly · ⏳ not yet · 💬 answered (advice, not code)

## The vision (always applies)

- "Voice Verses must be primary… Propresenter was supposed to be an addition!!" The app replaces ProPresenter; ProPresenter support is optional. ✅ (1.2.0)
- "Scripture is the most important thing… it must do scripture excellently well, including projecting and sending the various outputs through SDI and maybe over network." ✅ core; ⏳ native DeckLink
- "Easier, intuitive, and better aesthetically than ProPresenter with a far cry." "Like an Apple-designed application." "Colourful", not monochrome; "the white colour looks so bad". It must fill the screen. ✅ 1.4.0: design 4 live screen (other pages next)
- "Users should be able to use other models too, such as Claude"; Ollama for people's installed models. ✅ (1.1.0)
- Works on older Macs (Intel) and Windows; internet may be unreliable; "one of the problems I faced was getting to separately install dependencies." ✅ (1.1.0: one installer, offline speech)
- Other churches use it too. ✅ (nothing assumes our hardware)
- "Remember everything that I have asked for." ✅ this file, `CLAUDE.md`, `docs/*`, `.claude/skills/*`

## Listening and scripture

| Request | Status |
| --- | --- |
| Fix the app ("Failed to get ephemeral token: 405"), using the best architecture | ✅ 1.1.0 (offline engine, no Azure) |
| "Can I use the microphone here to send scripture calls?" | ✅ |
| Follow the preacher when they keep reading the next verses through the chapter | ✅ 1.2.1 |
| Pick up scripture quoted without a chapter and verse | ✅ 1.2.1, 1.3.0 (with confidence %) |
| Full chapters and ranges ("John 5:8-13") shown and followed through, not just the first verse | ✅ 1.3.0 |
| Detection works when the app window isn't the current window | ✅ 1.3.0 |
| Detection and display were slow; make them keep up | ✅ 1.3.0 |
| A word-by-word follower on the preview, moving to the next verse at the end of a verse | ✅ 1.3.0 |
| "The tracker might be too slow depending on how fast the preacher is reading"; follow the reader's pace | ✅ 1.3.5 |
| The preacher can say "next" or "next verse" | ✅ 1.3.0 |
| Suggestions show a confidence level; only send by itself at 99–100% | ✅ 1.3.0 |
| A setting: send to the outputs automatically, or wait in preview for the operator | ✅ 1.3.0 (Auto / Ask first) |
| Suggestions have a preview before sending | ✅ 1.3.0 |
| Many Bible versions; "please add the NKJV, NLT and other types" | ✅ 1.3.3 (API.Bible, ESV, NLT) 💬 ProPresenter's purchased Bibles stay in ProPresenter |
| Audio from the DAW (Logic) channel to the display computer; Focusrite outputs | 💬 answered (output 3/4 to the display computer's input) |

## Songs

| Request | Status |
| --- | --- |
| Detect a library song being sung, ask whether to switch to it, then follow the verse the leader is on | ✅ 1.2.x–1.3.0 |
| A Song switch by the transcript, so singing between sermon parts doesn't trigger verses until scripture is said again | ✅ 1.3.0 |
| Detect songs from SongSelect as well as the library; SongSelect wired in | ✅ 1.3.1 (import .txt/.usr) |
| "I have rights to have songs I paid for from SongSelect in my library!" | ✅ always allowed. The copyright rule only covers the public code. |

## Screens and outputs

| Request | Status |
| --- | --- |
| Projector, lower third and confidence monitor outputs, explained simply | ✅ |
| Texts must fit and adjust to the screen | ✅ 1.1.1 |
| Confidence monitor shows the scripture | ✅ 1.2.1 |
| Choose the screen for each output in the app; no dragging; not needing the window open or current | ✅ 1.2.x (Settings → Screens) |
| HDMI-only churches can use the same settings | ✅ |
| SDI via the DeckLink Duo's free outputs, straight from the app | ⏳ needs the ProPresenter computer connected (Remote Control) to test; HDMI-to-SDI converter works now |
| Switching back to ProPresenter on the switcher; confidence TVs | 💬 answered (switcher inputs, network outputs) |
| A 45″ wide screen displays cleanly, in good proportions | ✅ 1.3.7 (screen shapes, detected automatically) |
| "Why do you have laptop and 45″ as an option instead of detecting the screen size?" | ✅ the app detects; design 4 adapts to the window |

## Design and editing

| Request | Status |
| --- | --- |
| A ProPresenter-like layout that fills the screen, with a proper preview of what is going out | ✅ 1.3.0; design 4 in 1.4.0 |
| The order of service scrolls horizontally | ✅ 1.4.0 (timeline) |
| Check the best designs available, analyse them and do better; "think hard" | ✅ research in `DESIGN_SYSTEM.md`; designs 3 and 4 |
| Design 3 "can be better aesthetically… very clean, intuitive and very easy to use" | ✅ design 4, owner said "Proceed"; in the app in 1.4.0 |
| Full formatting for scripture, songs, announcements, media and others: background, video, colour, font, text, position | ✅ 1.3.4 (slide designer) |
| Create themes and templates; text positioned anywhere and saved as templates for each projector and the lower thirds | ✅ 1.3.4, 1.3.6 |
| Colour teams that change monthly, affecting every design in the app, editable | ✅ 1.3.6 |
| Lower-third background (not just green): uploaded media or made in the app, with adjustable width, height, position and full text formatting | ✅ 1.3.4, 1.3.6 (presets) |
| AI-generated slides | ✅ 1.3.2 |
| Duplicate a previous service to edit it faster | ✅ 1.3.1 |
| Header aligned with the body | ✅ 1.3.0 |
| Restyle every other page to match; "totally restyle and revamp the other tabs… the best design, structure, and aesthetics and arrangement" | ✅ 1.4.2: one shell for every page; Services, service editor, Presenter, Media, Looks, Screens and Settings rebuilt |
| "Do you have some template to add under each feature and settings that needs many template options to start with?" | ✅ 1.4.1: 26 starter looks (scripture, songs, announcements, countdowns, lower thirds), 7 more colour teams, 7 ready-made themes, 7 orders of service, 5 stage layouts, 6 countdown quick starts |
| "Why is the take button yellow like that… it doesn't look good at all." | ✅ 1.4.0: quiet graphite Take; the team colour is never used as a big block |

## Features the owner asked for ("do all these things… that will make it better than ProPresenter")

All promised, none built yet. Do them in this order after design 4:

1. ✅ 1.5.0 Slide transitions (dissolve, through black, lift, zoom, push, cut; per look and per slide)
2. ⏳ On-screen messages, and layers (props) that stay up across slides
3. ⏳ Several timers at once
4. ⏳ A stage-display layout editor; the preacher's outline on the stage monitor
5. ⏳ PowerPoint import
6. ⏳ CCLI usage reporting
7. ⏳ Verses on phones (QR code)
8. ⏳ Live captions and translation
9. ⏳ Stream Deck and remote control
10. ⏳ Planning Center import
11. ⏳ NDI output
12. ⏳ Native DeckLink SDI output (see Screens)

## "Is this the best you can do… Is that all a presentation app can have?"

No. The full gap list and the six-phase plan are in [`ROADMAP.md`](ROADMAP.md): beautiful backgrounds and transitions first, then layers, messages, timers and stage layouts, then imports, then phones, captions and sermon recaps, then control and broadcast, then team features. ⏳

## "Is that all the features? …come up with more ingenious features that other presentation apps have not even thought of, but it's a game changer."

💬 Answered with 14 signature features that only an app that listens can do, in [`ROADMAP.md`](ROADMAP.md) → "Signature features". Recommended first, all offline: moment autopilot (prayer, offering, altar call recognised from speech), worship leader voice cues ("one more time", "go to the bridge") and sermon points on cue ("point number two…"). ⏳ waiting on the owner to choose the order

## "Background and transitions" (chosen to build first, over the signature features)

✅ 1.5.0:
- Nine moving backgrounds made by the app in the colour team's colours (aurora, colour flow, lights, light rays, waves, stars, glow, dawn horizon, paper). They work offline with no files and no copyright to check.
- The built-in projector looks are on them, so the app looks rich from the first launch; plain black versions are starter looks.
- Looks → Backgrounds puts one behind everything on the projector in one click.
- Transitions per look and per slide; only the words move when the background stays the same.
- ⏳ Still in Phase 1: light mode and the designer inspector restyle.

## Process

- "Can you push and update the app?" / "I want the current app to be pushed": merge to `main` after CI passes; the owner publishes the release (lowercase `vX.Y.Z` tag). ✅ always
- "Are all of the decisions and steps being added and created as skills, rules, etc. that can be used to recreate this app… without repeating mistakes?" ✅ 1.3.8
- Apple Developer account: recommended (organisation) before signing and notarising. 💬 waiting on the owner
