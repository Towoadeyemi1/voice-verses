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

## "Can you add many great sample backgrounds… is the app going to be slow and freezing? Or you are going to make it fast?"

✅ 1.5.1:
- 17 background styles (new: cross of light, clouds, snow, fireflies, ripples, sunburst, light streaks, sheen) and 40 named samples in their own colours (Worship, Scripture and prayer, Seasons, Celebration, Calm).
- They're chosen from Looks → Backgrounds, or "All backgrounds and samples" in the designer.
- Speed: measured. Listening runs on its own and is never slowed by backgrounds. Each computer checks itself and keeps backgrounds still if it can't move them smoothly; Settings → Screens can choose Automatic, Always move or Keep still.

## "First update the app, then build: worship leader voice cues, spontaneous worship captured, Predictive Next"

- ✅ 1.5.0 merged (the owner publishes the `v1.5.0` release).
- ✅ 1.5.1 merged.
- ✅ 1.6.0 Worship leader voice cues ("one more time", "go to the bridge", "back to the chorus", "verse two", "from the top").
- ✅ 1.6.0 Spontaneous worship: offered as "Singing something new", shown live as it is sung once the operator chooses, and saved as a draft song.
- ✅ 1.6.0 Predictive Next: "Paul says the same thing in Romans" puts the likely Romans verse in Next, from today's plan and cross-references. It never goes up by itself.

## "It should come with full sample services… the landing page of the app is just blank, why? It looks like nothing is happening. Most of the dropdown options are hidden when clicked."

(Said with a photo of the live screen in Safari, 1 Nov 2026.)
- ✅ 1.7.0 Sample services added the first time the app opens: Sunday Celebration (today), Christmas Carols by Candlelight and Midweek Bible Study, with 9 public-domain hymns and carols, KJV readings, a sermon with its outline, and notices. They are marked Sample, never chosen over the church's own services, and removed or added again in one click on the Services page.
- ✅ 1.7.0 The live screen never opens blank: "Sunday Celebration is ready", a picture of every part, Start listening, a 1-minute demo through the real listening engine, quick verses, and the first slide already waiting in Next.
- ✅ 1.7.0 "Choose a service dropdown seems to drop inside instead of outside": the Library's Service tab is now a list of services (no dropdown).
- ✅ 1.6.1 Dropdowns and pop-up windows always on top and fully visible: menus fit the window, and tall windows scroll instead of being cut off (Safari included).

## "I cannot get sound signal saved or working in the new version, also channel selection does not seem to be working"

✅ 1.6.1:
- The app now checks whether the computer lets it use the microphone. If not, it says so and opens the right privacy settings in one click. Unsigned updates can look like a new app to macOS, which then refuses the microphone without asking.
- Settings → Listening starts a sound check by itself: one bar for what Voice Verses hears, plus a meter for every channel. The input is remembered by name as well as its id, so it is found again after an update or replugging.
- Starting to listen with no sound for 10 seconds now shows a warning with a button to the Listening settings.
- If the desk's channels don't all reach the computer (only 2 shown), Settings explains how to route the preacher's channel.

## "What [about] putting alerts and countdown on the screens?"

- 💬 Countdowns were already on every screen: the projector (full screen, or small in the corner), the stage monitor (amber near the end, red when over) and the stream lower third.
- ✅ 1.8.0 Alerts: an Alert button beside Countdown (live screen, every page, Presenter) puts a message over whatever is on screen without changing it.
  - For the room: nursery and children's church (with the child's number), car lights and moving a car (with the number plate), seats at the front, or any words typed.
  - For the stage only: "Five minutes", "Please wrap up", "A little louder, please", "Your microphone is off".
  - Choose the projector, stream and stage monitor; bottom or top; normal or amber; hide after 15 s to 2 min, or stay until cleared. A preview shows how the projector will look, and the Live monitor shows it too.

## "The alerts and countdown should have the option to add it to individual screens or all, or different alerts and countdown for each screen. Some alerts also have ability to blink yellow when close and red when done"

- ✅ 1.8.0 Several countdowns and alerts at once, each on the screens chosen (All screens, or any of projector, stage monitor, stream). A new one takes only its screens, so each screen can show its own: the room counts down to the start while the stage times the sermon. The panels list what is running, each with its own Stop or Clear.
- ✅ 1.8.0 Countdowns turn yellow when close (30 s, 1, 2 or 5 min left, as chosen) and red when done, blinking if chosen (on by default), on the projector, stage monitor, stream and the Countdown button. Alerts can blink too.
- 💬 Also asked: "How else can we make this way better and excellent features wise, aesthetically, and intuitive" (answered with a prioritised list).
- ✅ 1.8.0 merged and released by the owner (v1.8.0).

## "Here is ProPresenter. Do you think our own design is more aesthetic, exceptional, intuitive and excellent?"

- 💬 Answered honestly: calmer and clearer (one status, Live and Next framed like a switcher, the words large, listening built in), but ProPresenter showed every slide of a section at once and Voice Verses did not. Fixed in 1.9.0 (below).

## "Why can't we see the slides or rest of the slides or content below… Do you think it should spread horizontally?"

- ✅ 1.9.0 Every slide of what is loaded (a song, a service part, a chapter's verses) along the bottom of the middle, spreading horizontally, as small pictures drawn exactly as the room will see them. Live is framed red and Next green, each with its word. Click picks a slide, double-click shows it now, and the pencil opens Quick edit.
- ✅ 1.9.0 "See all slides" turns the middle into a grid of every slide (like ProPresenter), and "Show the words large" goes back.

## "Can we only have suggestions that are at least 50%…" then "actually can you leave it, don't adjust it to 50%, because sometimes it's less than 50%"

- 💬 Left as it is, as asked. A 30% suggestion can still be the right verse; suggestions never go on screen by themselves.

## "What if there are more than 1 service on Sunday, can we see multiple services listed?"

- ✅ 1.9.0 When there are several services today, they sit side by side before the order of service (9:00 First service · 11:00 Second service). The one under way is chosen by the clock, and one click switches (nothing goes on screen when switching).
- ✅ 1.9.0 The Library's Service tab lists services under Today, Coming up, Earlier and Samples, each with its date, time and number of parts. The one on the timeline is marked.

## "Can order of service be timed and self move and display the next section in the slides section?"

- ✅ 1.9.0 "Move on by time" beside the order of service. While on, the part on screen shows its time left on the timeline. When its planned time is up, the next part loads into the slides strip, with its first slide in Next (or on screen, if picking a slide goes live). The sermon, a verse on screen and a song being captured never move on by themselves.

## "I don't see anywhere to switch scripture versions without going into Settings"

- ✅ 1.9.0 A translation switch ("KJV ▾") beside the passage on the live screen and in the Library's Bible tab: KJV, ASV and WEB always, plus ESV, NLT and API.Bible translations once set up. The verse on screen, Next and the chapter change at once. "More translations" opens Settings → Bible.

## "Can slides or any item be quickly edited from the preview area? Where users can click and have a quick edit on the go"

- ✅ 1.9.0 Quick edit: Edit on the Live and Next pictures, and a pencil on every slide in the strip. Change the words, title, section name or look, with a picture of how the room will see it. It is saved to the service, and the screens update at once if it is showing. (A song from the library changes for this time only; scripture keeps the Bible's words.)

## "The countdown section of your template has no countdown, why, and is that possible?"

- ✅ 1.9.0 A part with its own countdown (the sample's "Countdown" before the service) now starts it when its slide goes on the live screen ("We begin in 4:59"), and stops it when the service moves to another part. Next shows the countdown it will start, and the strip says "Countdown 5:00 · starts with the first slide", then "running".

## "Sometimes all the slides could be pictures. Does the app and service settings allow that?"

- 💬 Yes: Services → Pictures adds many pictures at once, one slide each, full screen. A whole service can be pictures (an exported PowerPoint, for example).
- ✅ 1.9.0 The pictures now keep the order of their file names (Slide1, Slide2 … Slide10), whatever order they were picked in, and show as pictures in the slides strip.

## "Also on top of the area where the live display is should have something that could allow users to change the settings so that sent items go straight instead of staying at preview first"

- ✅ 1.9.0 Above Live: "When I pick a slide: Goes live | Waits in Next". It applies to slides in the strip, verses, songs, parts of the service and the order of service moving on by time, and it is remembered. (Verses found by listening still follow Auto / Ask first in the top bar.)

## "For the list section on the right, can it be made more aesthetically pleasing and more organised"

- ✅ 1.9.0 The Library's service list is grouped (Today, Coming up, Earlier, Samples) with a date tile, time and number of parts. Inside a service, each section has its colour from the timeline, and each part shows its slides and minutes, with the loaded part marked.

## "When he quotes or paraphrases scripture, sometimes he even says help me find it, but it takes too long to find it and suggest it. He mentions names of the Bible characters and paraphrases what happens, but it still didn't catch it fast enough"

- 💬 Also asked: "If the preacher mentions or calls for the particular chapter and verse, you can send it directly to Live, is that what is happening?" Yes: in Auto, a reference said outright goes live at once and the reading is followed; quotes go up by themselves only at 99%+, and Ask first holds everything in Next.
- ✅ 1.10.0 Stories told in his own words are found offline from their names and telling words ("Zacchaeus… climbed a sycamore tree", "a sling and a stone… Goliath", "the walls of Jericho fell"), and offered while he is still speaking (every 0.6 s), not after the sentence ends. They are offered, never shown by themselves.
- ✅ 1.10.0 "Help me find it" (also "somebody find it", "what verse is that", "look it up") searches everything he said since the screen last changed, at once and more widely, asks the AI helper (if on) about the last few sentences together, and tells the operator it heard the request.
- ✅ 1.10.0 The AI helper (optional) also wakes on Bible names, and a short sentence is asked about with the one before it.

## "For the suggestions area, users should be able to click and it will display the available suggestions by recency, like an overlay… or is there a better way?" · "Somewhere in Isaiah 53… what will let the app know which actual verse? Else the app is always pushing verse 1 to live, which is wrong" · "A lot of false suggestions push the right ones way below. How can we make suggestions more accurate?" · "Is the response time faster? It needs to be faster" · "Can you merge and push the update and build"

- ✅ 1.10.0 merged and the desktop build started (the owner publishes the `v1.10.0` release).
- ✅ 1.11.0 Clicking the suggestion bar (or "All n") opens every suggestion of the last 3 minutes, newest first, each with how sure, how long ago, Show now, Use and dismiss, plus "Clear them all". The bar itself shows the surest suggestion of the last 20 seconds, not simply the newest, so a faint late guess doesn't hide a good one.
- ✅ 1.11.0 A chapter named without a verse ("somewhere in Isaiah 53", "turn to Psalm 23") no longer pushes verse 1. The chapter fills the middle with all its verses, verse 1 waits in Next, and the status says "which verse?". The verse goes up when it is read or quoted, or named ("verse 5"); one paraphrased is offered first.
- ✅ 1.11.0 Fewer false suggestions: context makes a verse surer (the chapter called or being read, today's planned scripture, a book just mentioned); only the best and those nearly as good are offered; guesses under 20% are not offered; a later, longer hearing of the same sentence replaces that sentence's earlier guesses.
- ✅ 1.11.0 Faster: the speech engine reports what it has heard every half second instead of every second (still under about a third of the computer's time), and the quote and story searches look every 0.45 s while the preacher speaks.

## Process

- "Can you push and update the app?" / "I want the current app to be pushed": merge to `main` after CI passes; the owner publishes the release (lowercase `vX.Y.Z` tag). ✅ always
- "Are all of the decisions and steps being added and created as skills, rules, etc. that can be used to recreate this app… without repeating mistakes?" ✅ 1.3.8
- Apple Developer account: recommended (organisation) before signing and notarising. 💬 waiting on the owner
