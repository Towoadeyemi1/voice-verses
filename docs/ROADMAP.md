# Roadmap: from good to the best church presentation app

The owner asked: "Is this the best you can do feature wise and design and aesthetic and function? Is that all a presentation app can have?"

**The honest answer is no.** Voice Verses already beats ProPresenter on scripture: it listens, follows the reader and finds quotes. Its live screen is calmer and easier. But a full presentation app does much more, and several design basics are still plain.

This file is the plan. `OWNER_REQUESTS.md` tracks what has shipped.

## Where it falls short today

**Looks and first impression**
- The built-in looks are plain black, so previews and thumbnails look empty. A new church sees a dark, bare app.
- There are no motion backgrounds and no transitions. Slides cut hard.
- There is no light mode.
- The slide designer's inspector and a few dialogs (lyrics editor, slide settings, countdown) still use the older style.

**What ProPresenter and EasyWorship have that we don't**

| Area | Missing |
| --- | --- |
| Layers | Separate layers for media, slide, announcements, props (lower logos, bugs) and messages, each cleared on its own or in clear groups |
| Transitions | Dissolve, fade-through-black, push and zoom for slides and media, with a duration, per look or per slide |
| Media | Transport controls (scrub, loop, jump to end), audio playlists, a media playlist for the walk-in loop, live camera inputs, masks |
| Timers | Several at once (service clock, sermon, segment), counting up or down, shown anywhere |
| Messages | Messages over any slide ("Parent of child 42 to the nursery", "Car with plate … lights on"), with fields |
| Stage | A layout editor for stage screens: current and next slide, clock, timers, notes, messages, the preacher's outline, with layouts per screen |
| Slides | A reflow editor (all of a song's text in one box, split by blank lines), automatic splitting of long verses, scripture as one slide or verse by verse, slide timers, and looping announcements |
| Import | PowerPoint and Keynote (as pictures or text), PDF, ProPresenter and EasyWorship files, OpenLyrics |
| Integrations | Planning Center Services, Stream Deck, MIDI and OSC, a phone or tablet remote, NDI in and out, built-in recording and streaming (RTMP) |
| SDI | DeckLink output with key and fill (a transparent lower third straight into the switcher) |
| Reliability | Undo everywhere, autosave and crash recovery, a show-day check ("all screens connected, mic working, service ready") |
| Team | Several operators, roles, and shared libraries across campuses |

## What only Voice Verses can do (because it listens)

These are what would make it the best, not just equal.

1. **Live captions and translation**: what the preacher says, captioned on the stream and on phones, and translated into other languages live. Useful for multilingual churches and the hard of hearing.
2. **The congregation's phones**: scan a QR code to follow the service: the verse on screen (in their own translation), the song words in large print, sermon notes, and give/connect links. It works offline on the church Wi-Fi.
3. **Sermon recap, written for you**: after the service, a summary, every verse used, key quotes with timestamps, social-media clips, show notes for the podcast, and a searchable archive of every sermon.
4. **Voice commands for the operator**: "show the logo", "clear", "next song", "countdown five minutes".
5. **Autopilot for small churches with no operator**: it follows songs and scripture by itself and asks only when unsure.
6. **AI design help**: "make this look like Easter" or "a calm background for this hymn". It picks or generates backgrounds and looks in the colour team.
7. **CCLI reporting done for you**: songs shown are counted automatically and the report is ready to submit.
8. **The preacher's outline, live**: sermon notes on the stage monitor that move along as they preach, and points shown on screen when they are reached.
9. **Accessibility**: large print on phones, high-contrast stage layouts, and screen-reader support for operators.

## Plan (each phase ships as releases; record each in OWNER_REQUESTS.md)

**Phase 1: make it beautiful and smooth (1.5.x)**
- Built-in motion and still backgrounds, generated in the app so they work offline with no copyright issues: soft gradients, light rays, bokeh, aurora and paper textures in the colour team's colours.
- Built-in looks rebuilt on them, so the app looks rich from the first launch.
- Transitions: dissolve, through black, push and zoom, with a duration, per look and per slide.
- Restyle the remaining dialogs and the designer inspector, and add a light mode.

**Phase 2: layers, messages, timers, stage (1.6.x)**
- Layers: slide, media, announcements, props and messages, with clear groups.
- Messages and props over any slide.
- Several timers at once, counting up or down.
- A stage layout editor, including the preacher's outline and notes.

**Phase 3: content in and out (1.7.x)**
- Import from PowerPoint, Keynote and PDF, ProPresenter and EasyWorship files, and OpenLyrics.
- A reflow editor, automatic splitting of long verses, and looping announcements and walk-in media.
- Media transport controls and audio playlists.

**Phase 4: the congregation and the world (1.8.x)**
- Phones by QR code.
- Live captions and translation.
- Sermon recap and archive.
- CCLI reporting.

**Phase 5: control and broadcast (1.9.x)**
- Stream Deck, MIDI and OSC, and a phone remote.
- NDI in and out, and recording and streaming.
- DeckLink key and fill, which needs the owner's computer through Remote Control.
- Planning Center.

**Phase 6: team and trust (2.0)**
- Undo everywhere, autosave and crash recovery, and the show-day check.
- Several operators and roles, and multi-campus libraries.
