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

## Signature features: things no presentation app does yet

The owner asked: "You cannot think deeply and come up with more ingenious features that other presentation apps have not even thought of, but it's a game changer?"

Every other presentation app is a remote control: it does only what the operator presses. Voice Verses hears the room. That changes the question from "what can the operator do?" to "what can the app understand and get ready before anyone presses anything?" None of the presentation apps we know of (ProPresenter, EasyWorship, MediaShout, FreeShow, OpenLP, Proclaim) does any of the following, because none of them listens.

The rule from `CLAUDE.md` still holds for all of them: **never act confidently on a guess.** Anything below 99% sure becomes a suggestion the operator takes with one key.

### A. The service runs itself, and the operator stays in charge

1. **Moment autopilot.** The app recognises moments from what is said: "let us pray", "would you please stand", "turn to your neighbour", "as the ushers come forward" (offering), "every head bowed, every eye closed" (altar call), "a few announcements". It moves the order of service to that part and switches to the right look, for example a calm, dim look for prayer, the giving details for the offering and a quiet background for the altar call. *Offline: a phrase list plus the timeline.* **Build first.**
2. **Worship leader voice cues.** "One more time", "sing that again", "go to the bridge", "back to the chorus", "everybody sing", "last time": the slides jump or repeat by themselves, so the operator is never a line behind. *Offline: the song follower already knows the sections.* **Build first.**
3. **Spontaneous worship, captured.** When the leader sings something that isn't in the library, the app writes the words as lyric slides on the fly and saves them as a draft song for next week. *Offline: on-device speech.*
4. **Predictive Next.** The verse most likely to come next is already waiting in Next before it is said: from the pastor's outline, the passage being read, and cross-references (the public-domain Treasury of Scripture Knowledge). When the preacher says "and Paul says the same thing in Romans…", Romans 8:28 is already one key away. *Offline.*
5. **Second service on autopilot.** The app remembers what was shown in the first service and when. In the second service it has every cue armed and follows the same preacher with much more confidence. *Offline.*
6. **A safety net that never sleeps (Guardian).**
   - It warns when the microphone goes silent or a screen is unplugged, and moves the output to another screen.
   - If the operator is called away, it can take over the obvious moves (next verse, next line) until they are back.
   - A readability guard catches text that is too small, too long or too low in contrast for the room, and fixes it before it goes out.
   *Offline.*

### B. The sermon comes alive on screen

7. **Sermon points on cue.** "Point number two…", "write this down…", "say this with me…": the app makes a styled point or quote slide from the preacher's own words, in the current colour team, ready to take. *Offline, with optional AI for tidier wording.* **Build first.**
8. **Bible atlas, people and word studies on cue.**
   - A place is mentioned (the pool of Bethesda, Capernaum, the road to Emmaus): a map appears in Next.
   - "The Greek word *agape*…": a word card with the original word, its meaning and where else it appears (Strong's, public domain).
   - A person (Abraham, David, Ruth): a family tree or timeline card.
   *Offline datasets that are free to bundle.*
9. **The preacher's pace coach.** The stage monitor shows where the preacher is in their outline, worked out from what they have said, and the time they will probably finish ("Point 3 of 4 · on track to finish 12:14"). Nobody has to wave from the back. *Offline.*
10. **Interpreted services.** For a preacher and an interpreter taking turns in two languages: the app follows both, shows the verse side by side in both languages, never shows it twice, and does the same for song words. *Offline for the languages the speech engine knows.*

### C. Beyond the walls

11. **Everyone's own Bible, on their phone.** Each person scans a QR code once and sees the verse in their own translation and language, in large print if they want it. They can highlight it and keep it in "My service notes", then get the recap afterwards. *Works on the church Wi-Fi with no internet.*
12. **Overlays timed to the stream.** Online viewers see the verse arrive with the preacher's words, not 20 seconds early, because the overlay is delayed to match the stream. Several campuses can follow one preacher's verses live.
13. **The black box.** A record of everything shown, when and why (said outright, followed, suggested and taken), which also feeds the CCLI report, the sermon recap and a "what went wrong at 11:42?" review.

### D. Training and trust

14. **A flight simulator for volunteers.** Play a recorded sermon or worship set and practise running it. The app scores how quickly and accurately each cue was taken and shows what it would have done. New volunteers can train at home on Tuesday instead of learning live on Sunday. *Offline.*

### What to build first

The three marked **Build first** (moment autopilot, worship voice cues and sermon points on cue) use the listening that already exists, work fully offline, and are what a volunteer would notice in the first five minutes of a service. They can ship together as one release, before or alongside Phase 1 below.

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
