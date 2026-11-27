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
5. ✅ PowerPoint import (1.19.7, Add from a file: .pptx as words, PDF as pictures)
6. ⏳ CCLI usage reporting
7. ⏳ Verses on phones (QR code)
8. ⏳ Live captions and translation
9. ✅ Stream Deck (1.19.16, through Bitfocus Companion: `docs/integrations/stream-deck.md`); ⏳ MIDI, OSC and a phone remote
10. ⏳ Planning Center import
11. ✅ 1.15.0 NDI output (see below)
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

## "Do you think 50% should be the yardstick? I have seen right ones at 30%, making me confused too" · "Are the changes aesthetically, design and structurally pleasing and excellent? Can you also push"

- 💬 No yardstick at 50%: the number is how much of the verse's own wording was heard, not the chance it is right, so a right verse paraphrased or half quoted can honestly be 30%. Hiding those would hide right answers.
- ✅ 1.11.0 merged.
- ✅ 1.11.1 The suggestion bar and list say the strength in words ("Strong match" 90%+, "Likely" 60%+, "Possible" 35%+, "Faint match") and why it is offered, in plain words: "most of it quoted", "part of it quoted", "a few of its words said", "the story: Zacchaeus, sycamore", "told in his words, in Isaiah 53 he named", "in today's plan", "Romans was just mentioned", "the AI helper's answer". The ring keeps the number.
- 💬 Design: answered honestly with screenshots (what is strong, and the rough edges still to polish).

## "The input does not give me the computer's microphone, but DeckLink; even on Default I get no signal. And the screen options don't give me the DeckLink as an option to send the app's screens to"

(Two photos from the ProPresenter computer, 2 Nov 2026: Listening shows Default input and Blackmagic DeckLink Duo (1)–(4) (Virtual); Screens lists only "LG FHD — 1920×1080 (this computer's main screen)".)
- 💬 Not a fault in the app. That computer has no microphone of its own: its only sound inputs are the DeckLink's, which carry only the sound inside an SDI cable plugged into that port, so "Default input" (a DeckLink) is silent. And a DeckLink card is a video card, not a display, so macOS doesn't list it; displays appear only when something is plugged into a video output (nothing is on the eGPU's HDMI port yet).
- 💬 Ways forward: listen on the iMac (it has the desk and the APOSTLE channel) and show the screens on the ProPresenter computer over the network; or feed sound into this computer (USB interface, or SDI with embedded sound into a DeckLink input); for SDI out today, an HDMI-to-SDI converter on the eGPU's HDMI port.
- ✅ 1.11.2 Settings → Listening names the device behind "Default input" ("Default input (Blackmagic DeckLink Duo (1) (Virtual))"), and when the input is a video card, or the computer has no microphone at all, says so and lists the three ways to get the preacher's sound.
- ✅ 1.11.2 Settings → Screens, when only the computer's own screen is connected, says so at the top: other displays appear once plugged in, and a DeckLink isn't a display (use an HDMI-to-SDI converter for now).
- ✅ 1.12.0 Native DeckLink SDI output (see the next request).

## "The way we send ProPresenter to the switcher is through the DeckLink, why can't I do the same? I added an SDI line to one of the free SDI ports"

- ✅ 1.12.0 Settings → Screens lists the DeckLink's SDI ports with the displays ("DeckLink Duo (3) — SDI out"). Choose one for the projector, confidence monitor or lower third, and its video format (to match the switcher). It shows whether it is sending, why not if it can't (another app using that port, the port set to input, the wrong format), and "Show test colours" to find it on the switcher. Mac; needs Blackmagic Desktop Video, which ProPresenter already uses.
- ⏳ To be confirmed on the owner's ProPresenter computer with the real card (built and tested here with a pretend card).

## Settings → ProPresenter on the ProPresenter computer: "Connected to ProPresenter 21.4 on Mac-mini", then "TypeError: groups.forEach is not a function" and "No themes found"

(Photo, 2 Nov 2026.)
- ✅ 1.11.3 ProPresenter 21 answers the theme list as an object (system themes and theme groups) where 7.x answered with a list; Voice Verses now reads both, however the themes are nested, so the themes appear and "Create the Voice Verses message" works.

## The "Voice Verses" message made by hand in ProPresenter 21.4 (Verse and Reference tokens, theme chosen), yet Settings → ProPresenter still says it "needs both a {Verse} and a {Reference} token"

(Three photos, 2 Nov 2026.)
- ✅ 1.12.1 The message's tokens are read however ProPresenter reports them: from the list of messages, or from the message itself (ProPresenter 21 may leave them out of the list), with or without braces. If ProPresenter doesn't say at all, "Send a test verse" is offered anyway, with a note to check that it shows. When a token really is missing, the message lists the tokens ProPresenter reports and says how to add one (Add Token, then the tick).

## "I want most features configurable and optional; they shouldn't all be on by default. The connection to ProPresenter and other screens seems so cumbersome: no way to make it simpler? Are you building API first, decoupled modules, microservices if needed?"

(4 Nov 2026.)
- ✅ 1.13.0 **Settings → Features** (first in Settings): every smart feature has its own switch, grouped Scripture, Worship, The service and Safety, each saying what it does. Presets: **Essentials** (follow the reading, a chapter waits for its verse, part countdowns, booth check, warnings; nothing else happens by itself), **Recommended** (a new install), **Everything**. Bold new features (moment autopilot, sermon points) arrive switched off. A verse said outright always works.
- ✅ 1.13.0 **Booth check**: a light on the live top bar, "Ready" or "2 to check". Click it for microphone, speech, each screen and DeckLink port, ProPresenter, Bible and today's service, each with a Fix button that opens the right setting.
- ✅ 1.13.0 **Warnings during the service**: if the microphone goes silent for 20 seconds while listening, or a screen, DeckLink port or ProPresenter stops, a warning appears on the live screen with its Fix button.
- ✅ 1.13.0 **ProPresenter in one click**: "Find and set up ProPresenter" finds it on this computer (no port to type), connects, and creates the "Voice Verses" message with a suitable theme. Typing the address is still there for another computer.
- ✅ 1.13.0 **Screens as tiles**: Settings → Screens shows each display and DeckLink port as a tile, with one click for what it shows, and **Identify screens** puts a big number on every display.
- 💬 Architecture: no microservices. The app must work offline, install as one download and run on older Macs; separate services would add things to install, start and break during a service. Instead: separate modules with clear edges (detection gets plain flags and never reads settings; outputs, DeckLink and ProPresenter are each their own module), and next a **local control API** (1.15.0) so a Stream Deck, phone or another app can drive it. See D26 and D27.
- ✅ 1.16.0 Moment autopilot and sermon points on cue (off by default, Settings → Features): "let us pray" puts the Prayer part in Next; "point number two…" makes a point slide in Next; Take shows them, Undo puts things back. Then the local control API: see the roadmap.

## "Can't the ProPresenter search work if they are on the same network, even if not on the same computer? Is DeckLink and HDMI the only option, can't other churches use other methods? Is that tied in? I am very disappointed with the aesthetics… every part of the app must have that excellence."

(5 Nov 2026, after 1.13.0.)
- ✅ 1.14.0 ProPresenter is searched for on the whole local network too, not only this computer: Bonjour, and every address of the church network on ProPresenter's usual ports (plus the port saved last time), each confirmed by asking it for its version. `propresenter:search`.
- 💬 Ways out today: any display the computer sees (HDMI, DisplayPort, USB‑C, Thunderbolt, adapters such as HDMI‑to‑SDI, AirPlay to an Apple TV), a DeckLink port (SDI), any browser on the network (smart TV, tablet, OBS/vMix browser source), and ProPresenter. All are fed by the one renderer, so a new way is a new destination, not a new screen: NDI next, then Syphon/Spout.
- ✅ 1.14.0 Settings redesigned to the mock-up the owner approved (`docs/design/settings-redesign.html`): a sheet with coloured icons grouped This service / In the booth / This computer and the booth check at the top; every other Settings page (Bible as translation cards, Listening, Logo, Library, Desktop app) in the same look; Screens and outputs as a picture of the room with live previews, each output's destinations, and the ways to connect; ProPresenter with everything found on the network listed; Features with preset cards; the Booth check as a page.

- Owner's choices (5 Nov 2026): build the mock-up as drawn; Recommended leaves Predictive Next and "Singing something new" off until switched on (✅ 1.14.0); NDI output comes straight after.

## NDI output (owner's choice after the Settings redesign, 5 Nov 2026)

- Owner's choices: use the free NDI Runtime rather than bundling NDI's library (bundling would put NDI's SDK terms into Voice Verses' own licence); accept NDI's SDK licence only for testing in the build environment (nothing from the SDK is in the repository).
- ✅ 1.15.0 Each output (Projector, Lower third, Stage monitor) can be sent as an NDI® source, named "COMPUTER (Voice Verses Projector)" and so on, for vMix, OBS, TriCaster, NDI converters and NDI Studio Monitor. The lower third arrives see-through (nothing to key out). Settings → Screens and outputs: "NDI on the network" in the picture of the room, a switch per output with "Sending · n watching", NDI among each output's destinations, the NDI tile in Ways to connect; the booth check and the warnings watch NDI too. Without the NDI Runtime, it says to get NDI Tools (free) from ndi.video/tools.
- ⏳ To confirm in the owner's booth (for example into vMix or the switcher through an NDI converter).

## "Please resolve the next thing, moment… Will all these make the app slow and heavy?"

(5 Nov 2026.)
- ✅ 1.16.0 Moment autopilot and sermon points (see above).
- 💬 Measured in the desktop app (test computer without a graphics chip, so motion costs show high): idle 0.2% of one processor core with still backgrounds, 2% with the projector on, about 25% while listening (the speech engine); memory about 700 MB, 1.3–1.5 GB while listening (the speech model). Features that are switched off don't run; moments and points take about 4 µs a sentence. The real cost is moving backgrounds, drawn by the graphics chip: ✅ 1.16.0 the slide strip and grid and the Settings previews stand still (same picture, no drifting background); Live, Next and the real screens move. (The owner first read this as removing previews: nothing was removed, and Next keeps its motion so it is a true preview.), and the automatic speed guard already stills them on a slow computer.

## "Why are you removing preview? … What animation are you talking about removing? … For these cues, allow users to have a place to set them up or add them, as they might change from time to time. Give them the option to cut out certain scripts from the service and add them as cues"

(5 Nov 2026.)
- 💬 Nothing was removed: every preview stays. Only the drifting background inside small previews stood still. ✅ 1.16.0 Next keeps its motion (a true preview); the slide strip, grid and Settings previews keep a still background.
- ✅ 1.17.0 (as Settings → Cues, in Voice Verses spirit below) Cues set up by the church (first mock-up `docs/design/cues-setup.html`, replaced by `docs/design/spirit.html`): a Cues page in Settings (every moment's phrases, add and switch off, sermon point cues, try a sentence); a part's own cues in the service plan; and "make this a cue" from what was heard, during the service or from the last service's words afterwards.

## "Does the cue idea from transcript even make sense? … Make the cue set-up absolutely easy, intuitive and aesthetically stunning. Cues must first be on preview for approval before going live. It must learn from corrections … before the user becomes confident and allows it to go live directly. The end goal: the app learns from how users use it and can mostly run the whole service on an autopilot called VoiceVerses Spirit"

(5 Nov 2026.)
- 💬 Picking cues from a transcript is a chore, so it is only a fallback. Better: **spirit learns by watching**. The operator's own actions (going to Offering just after the pastor said "as the ushers make their way") show which words matter; spirit asks once to make it a cue.
- 💬 Trust ladder for every cue and kind of action: Learning (only notices) → Ready in Next (the operator Takes) → Hands-free (spirit takes it live, with a short countdown and Stop). Hands-free unlocks per cue only after a run of correct calls, and only when the church allows it. Scripture keeps its own rule (said outright or ≥99%).
- 💬 Corrections teach: Undo or "Not this" asks why in one tap (wrong part, not now, never for this phrase) and spirit doesn't repeat it.
- ✅ Mock-up `docs/design/spirit.html` approved ("Yes, build it"; Hands-free after **10 in a row**; learning **shared through the library folder**). Replaces `docs/design/cues-setup.html`.
- ✅ 1.17.0 Voice Verses spirit: Settings → spirit (how much spirit does, the last service, what it knows) and Settings → Cues ("When the preacher says ___ get ___ ready", words picked from what was said lately, what spirit noticed, every cue's record and trust). Every cue starts at Ready in Next: the operator Takes. "Not this" on Next asks why (wrong part, not now, never for these words) and spirit remembers. Hands-free unlocks per cue after 10 right in a row, only when chosen, with a 3-second countdown and Stop; a correction sends it back to Ready in Next. Learning is shared through the library folder.
- ⏳ 1.18.0 Hands-free polish and spirit's summary after a service. 1.19.0 spirit runs the order of service (a part's time up, a song ended).

## "Also call it Voices spirit (with lower case “s”) not Spirit. I meant Voice Verses spirit" … "Actually call it spirit, with small “s”. This is for the intelligence part of what we are building, not the bible or scriptures. Do not change Spirit in scriptures or bible!!"

(5 Nov 2026.)
- ✅ 1.17.0 The intelligence (the learning autopilot) is called **spirit**, always with a small "s", in the app, its messages and the docs, even at the start of a sentence ("spirit will remember").
- ✅ Scripture is never touched: the Bibles, sample hymns, test sentences and sermon keep "Spirit" exactly as written. Renames must never run over `src/data/`, `src/lib/samples/` or test sentences (see LESSONS).
- Code names (`lib/spirit.ts`, `SpiritOrb`) are not shown to anyone and stay as they are.

## "I want a demo for all features and setup in a way that users will see how to do everything that might need to be done in the app, maybe under something called training, which will show what to click where and steps using the actual interface. What do you think?"

(5 Nov 2026.)
- 💬 Proposed: **Training**, lessons that run on the real interface. A spotlight on the real control, one short step at a time, waiting for the volunteer to do it themselves. Lessons happen in a **practice room** (the sample service, a recorded sermon, the screens shown only on this computer) so nothing reaches the room by mistake. Lessons are grouped by role (First Sunday, Setting up the booth, Songs and slides, Teaching spirit), with progress ticks, and a "Show me" link from any Settings page or warning.
- ⏳ Mock-up first, for the owner's yes.

"I am also worried about the demo, and how users will know what to do." … "So you're using links not a demo showing what to do or click?" … "What of the ProPresenter part?" … "Proceed"

(13 Nov 2026.)
- 💬 Agreed approach, all on the real screens in practice mode (nothing reaches the projector, stream, stage or ProPresenter):
  - **Set up your booth**: Voice Verses finds the sound input (and hears speech on it), the screens, ProPresenter on the network and the church's types of service; the volunteer confirms or changes each, then tries a short demo sermon.
  - **Your first Sunday**: a practice run of a service for a new volunteer.
  - Every lesson in two modes: **Show me** (a spotlight and a moving pointer really do each step while a caption explains) and **Let me try** (the volunteer clicks; the app waits, undoes a wrong click with a hint, and checks the result itself, such as "John 3:16 is on Live").
  - A **Training** page by role with progress per person, "Show me" buttons on Settings pages and warnings, and a picture guide made from any lesson to send to the team.
  - **ProPresenter lesson**: Voice Verses' own steps get the spotlight; ProPresenter's steps are pictured beside it (it runs on another computer) and each is checked through ProPresenter's network connection where possible: connected, the presentation found, linked text proved by writing "Voice Verses test" and reading the slide back, Looks read from ProPresenter then confirmed by eye. Done before the service, because ProPresenter is live.
  - Tried with Billie before it ships.
- ✅ Mock-up `docs/design/training/` (Training page, Show me, Let me try, Set up your booth, the ProPresenter lesson, Show me the fix), approved with the changes below.

"What do you think?" … "Proceed and do not mess up design, functionality or aesthetics"

(13 Nov 2026.) Changes to the mock-up, agreed:
- ✅ Set up your booth opens by itself the first time Voice Verses starts ("Finish later" to skip).
- ✅ One short line per step; the explanation is behind "Why?".
- ✅ The ProPresenter lesson has a red band ("uses ProPresenter for real; do it before the service"); every other lesson the purple practice band.
- ✅ The three ways into ProPresenter look equal until Billie's test; none is marked Recommended.
- ✅ New: **Show me the fix** on every warning during a service: one thing lit up, seconds, back to the service.
- Later: picture guides to share and progress by person.
- Each lesson gets its own automatic test so a change to the screens can't break it unnoticed.
- Build order: Set up your booth on first launch; Your first Sunday (Show me, Let me try); Show me the fix; the ProPresenter lesson after Billie's test; the other lessons; then guides and progress by person.

"Proceed" (build it; 13 Nov 2026):
- ✅ 1.19.0 **Set up your booth** opens by itself the first time Voice Verses starts on a computer (never for a church already using it), and from Settings → Booth check any time. It listens to every input and finds the one with sound (the loudest channel on a desk feed), suggests the projector on a second screen, looks for ProPresenter on this computer and the network ("Yes, that's it" only remembers where it is; it never switches sending on), and keeps the church's types of service (listed first in Services). Each is confirmed or changed.
- ✅ 1.19.0 **Practice mode** (D31): the demo after set-up runs on the real live screen, but nothing reaches the projector, stream, stage, DeckLink, NDI, network screens or ProPresenter, and spirit learns nothing. A violet band says so, with End practice; ending it puts this screen back as it was, so nothing from practice waits in Next. Checked by `tools/e2e/booth-setup.cjs`.
- ⏳ Next: the Training page with Your first Sunday (Show me and Let me try), then Show me the fix on warnings.
- ✅ 1.19.14 More lessons: **Screens and outputs**, **Plan a service from a template** and **Teach spirit a cue**, each with Show me and Let me try, in practice, in the guide's recorded voice, checked by `tools/e2e/lessons.cjs`. Still to come: the ProPresenter lesson (after Billie's test).
- ✅ 1.19.17 Lesson **Songs and slides** (Before Sunday): where songs come from (Media, Add files for SongSelect), a song from the Library slide by slide with Take, Quick edit with the pencil (now always shown on the Live slide), its look, See all slides, and Looks. Show me changes no song.
- ✅ 1.19.11 **Show me the fix** on every warning, the booth check light and the Booth check page: the right Settings page with the one control lit up and one line said aloud, **Do it for me** for the microphone (finds the input with the preacher's sound), a tick when it is fixed and back to the live screen 2 seconds later. Listening carries on; Esc goes back. Checked by `tools/e2e/show-me-the-fix.cjs` (a projector screen unplugged and plugged back in; an input that isn't connected).

"The demo does not look good without an explanatory voice, and a visible mouse arrow or pointer clicking and navigating the screen. It looks confusing and no one can understand what is happening. Also I did not see the training tab, or is it not supposed to be part of it?"

(13 Nov 2026.) The Training tab was not in 1.19.0 (only Set up your booth and practice); that should have been said plainly.
- ✅ 1.19.1 **The guide** (`components/guide/GuideHost.tsx`, `lib/guide.ts`): a pointer that glides to the real control and clicks it, a spotlight on it, and one short line on a card that is also **said aloud** in the computer's own voice (works offline on Mac and Windows; a speaker button turns it off).
- ✅ 1.19.1 **The demo is narrated**: every step says what is happening while the pointer shows where (what is heard, Live, the words lighting up, Next, the suggestion it clicks, the hymn, the leader's cue, the new song). About two minutes.
- ✅ 1.19.1 **Training tab** on every page (and on the live screen's welcome and its menu): Your first Sunday (Show me, Let me try), Watch the demo, When something goes wrong, Set up your booth; the rest shown as coming soon. Show me does every step; Let me try waits, stops and names a wrong click, and checks what the app really did. All in practice. Checked by `tools/e2e/training.cjs`.

## "Did you hear what I said about the goal of spirit running the whole service?" … "Do you think that is the best order?" … "Start please. Also, I want the option, if the user has an AI key, to add it and enhance the experience in a way that the app can learn better, perform more proficiently, and run spirit better. Is that even reasonable??"

(5 Nov 2026.)
- 💬 1.17.0 covers two kinds of move (moments on cue, sermon points). Running the whole service needs: one trust ladder for **every** move (getting the service ready, countdown into the welcome, following songs, next song, moments, moving on when time is up, clearing after a reading, the logo between parts, the end); the order of service as spirit's backbone; learning from every move the operator makes; a "What spirit will do next" strip with one Pause; a score after each service.
- 💬 Order agreed: one real Sunday with 1.17.0 first (spirit learns from real services), the design meanwhile; then spirit for the whole service (1.18.0, 1.19.0); then Training (once the live screen settles). The owner also needs to try DeckLink, NDI and ProPresenter on the real hardware, and to sign the installers.
- 💬 An AI key is reasonable and optional: spirit works fully without it; with Claude, OpenAI, an OpenAI-compatible server or Ollama on the computer (rule 3), spirit understands meaning not only phrases (asked only when unsure, on finished sentences), learns after each service (suggests cues and habits for a yes), prepares before Sunday (plan, songs, sermon notes), and can say why it got something wrong. AI never puts a verse up (rule 1); its ideas climb the same ladder; only written words, the plan and song titles are sent, never sound; offline, spirit carries on.
- ⏳ Mock-up: `docs/design/spirit-whole-service/` (Sunday with spirit running it, everything spirit can learn to do, How Sunday went, Help from AI), waiting for the owner's yes.

## "Proceed, but do you know there are different types of services with different order of service? Also, this AI might include the local LLM like Ollama and the like. Also, I want Voice Verses to be able to make a scheduled API call or update call to our church management app … ingestion of songs from choir, announcements from announcement team, images and media from creative team, so that spirit can add them to the order of each service, and prepare it for the user to approve and make adjustment before the service if needed, with spirit noting adjustment or correction and why so as to ensure that is in place subsequently if the reason serves the instance"

(5 Nov 2026.) The church uses **its own church management app**. Its service types: Sunday services (e.g. Communion Sunday, Thanksgiving Sunday), Midweek, Special events, Life events (weddings, funerals, dedications), Christmas, New Year, Easter, Friday Night Prayers, Prayer and Fasting, Youth Day.
- ✅ 1.18.0 **Service types**: every service has a type (Plan services → Type of service; guessed from the name and day when not chosen); spirit learns each type's order, timings and habits separately (a Friday Night Prayers is not run like a Sunday service). Cues can be for every type or only some.
- ✅ 1.18.0 spirit for every move: Settings → What spirit does (every move on its own ladder; the countdown into the next part and the next song work now, the rest in 1.20.0), "What spirit will do next" under the order of service with Pause (P), and How it went when listening stops (score, the service start to end, corrections with "Just this once", what has earned Hands-free).
- ⏳ 1.21.0 Help from AI includes models on the church's own computers: Ollama, LM Studio, llama.cpp and any OpenAI-compatible server, as well as Claude and OpenAI.
- ⏳ 1.22.0 **The church's app feeds each service**: Voice Verses checks the church app on a schedule (and on demand) for each upcoming service's songs (choir), announcements (announcement team), and pictures and media (creative team). spirit drafts the order of service from them for that service's type; the operator approves or adjusts before the service; spirit notes each adjustment and the reason, and applies it next time when the reason holds (e.g. "announcements go after the offering on Communion Sundays"). Works offline from the last copy.
- ✅ The feed the church's developers build: `docs/integrations/church-app-feed.md` (written now so they can start).

## "The voice detection is very bad!!! The detection of what the speaker is saying is now very bad, other version was way better, what have you done."

(6 Nov 2026.)
- 💬 Measured with the same spoken sermon on 1.15.0 and 1.18.0, with a service loaded and a week of what spirit learned: the words heard were the same, but 1.18.0 gave 28% fewer live results while words were spoken (31 against 43), the window worked 60% harder (11.6% against 7.1%) and was busy almost twice as often. On a busy booth computer (Logic running too) that holds back the sound on its way to the speech engine, which then skips its live results: words show late and verses go up late.
- The causes:
  - The live screen redrew on every sliver of sound (125 times a second).
  - Each redraw read all of spirit's saved learning several times.
  - spirit saved everything after every sentence.
  - spirit's orb kept the window drawing 60 times a second.
- ✅ 1.18.2 Fixed:
  - The meter updates 15 times a second.
  - spirit's strip is worked out only when something changes, from what is already loaded.
  - Sentences heard are saved together every 20 s.
  - The orb is still on the live screen.
  
  Measured again: 44 live results, the window at 4.2% (less than 1.15.0), graphics back to 1.15.0's. `tools/e2e/listening-load.cjs` now checks this for every change.
## "Users should be able to create service templates for more service types, and even use existing service types to create templates. There is also a children Sunday school type."

(5 Nov 2026.)
- ✅ 1.18.3 **Children's Sunday school** is a type of service (and "Sunday school" in a name means it).
- ✅ 1.18.3 A **ready-made order for every type of service** (18): Sunday service, Communion Sunday, Thanksgiving Sunday, Midweek service, Bible study, Friday Night Prayers, Prayer and Fasting, Youth Day, Children's Sunday school, Children's service, Special event, Conference, Christmas, New Year (Crossover), Easter, Wedding, Funeral, Dedication.
- ✅ 1.18.3 **Service templates** in Plan services: New template (any type, the app's or the church's own; start from the ready-made order for that type, from a service or template the church has, with or without its slides, or from nothing), "Make it a template" on any ready-made order, "Use for <day>", Edit, Delete (with Undo). "Save as a template" in the editor asks for the name and type. A template opens in the editor as a template (no date).

## "For the ProPresenter, it sent, but show didn't send it to the screens!!" … "Are you blind?" (screenshots: ProPresenter 21 Messages: "Service Countdown" and "Voice Verses", Voice Verses lit green with its Verse token filled; the audience output shows no verse)

(6 Nov 2026.)
- 💬 **I first misread the screenshot** and told the owner Voice Verses had changed their "Service Countdown" message. It hadn't: the Voice Verses message is its own message, and it was the one showing (green). Service Countdown was only selected in the first picture. Read every screenshot fully before diagnosing.
- So ProPresenter takes the verse and shows the Voice Verses message, but the verse doesn't reach its screens. The cause is between the message and ProPresenter's outputs (the Look's Messages layer per screen, the message's theme, a screen switched off), and not yet known.
- ✅ 1.18.4: **Why isn't it on the screens?** in Settings → ProPresenter (also after Send a test verse). It shows what ProPresenter itself says:
  - the message's text, tokens and their values, and its theme
  - whether its Messages layer is on
  - whether the audience and stage screens are on
  - whether the current Look shows messages on each screen
  
  Each answer comes with what to change. A warning appears when ProPresenter takes a verse but its Messages layer shows nothing.
- ✅ 1.18.4, hardening (not the cause here):
  - The message is addressed by its own ProPresenter id, never by name.
  - A new message is posted without an index.
  - Making the message stops if another message changed.
  
  Checked by `tools/checks/propresenter-trigger.mjs` (in CI).
- ⏳ The owner runs "Why isn't it on the screens?" on 1.18.4 and sends what it says.

## "The message has taken over all the screens … what do I do?" · from the booth operator: "Earlier when I clicked Hide it didn't hide it … even when it came up it was in this tiny box (stage message) … I'll give it its own layout … maybe you can give me a breakdown of everything in there"

(8 Nov 2026, a Sunday.)
- 💬 Steps sent with pictures: Hide in ProPresenter's Messages (or clear only the Messages layer, not the big X), and switch off Send verses in Voice Verses; after the service, a lower-third theme for the Voice Verses message.
- Causes:
  - Every verse that goes live in Voice Verses was sent again, including each next verse while following a reading. So Hide in ProPresenter only lasted until the next verse.
  - Clearing in Voice Verses (Esc), or a song or slide going up, didn't take the verse off ProPresenter; only Logo did.
  - Set-up preferred a "Scripture" theme, which is usually full screen.
  - The stage copy (Also on ProPresenter's stage screens) shows in the Stage Message box of each stage layout, which in the church's layout is small.
- ✅ 1.18.5:
  - **Hide in ProPresenter is respected.** Voice Verses notices it, stops sending, and says so with **Send again**.
  - **Clear (Esc), and a song or slide going up, take the verse off ProPresenter.** That covers the message, and the stage message if Voice Verses sent one. Voice Verses only clears what it put there, so a stage message typed in ProPresenter is never cleared.
  - **Set-up picks a lower-third theme first.**
  
  Checked by `tools/checks/propresenter-trigger.mjs`.
- ✅ A breakdown for the booth of everything Voice Verses does in ProPresenter (shared as a page).

## "I saw someone send into ProPresenter and it came into a slide in a slide deck … why is the message route you are giving me so complex?" … "Our ProPresenter is set up so that when a slide is sent, it goes to our projector, lower third and confidence monitor all at once" … "Linked text seems to be the most flexible and non-disruptive?" … "Before you build, can't you check if people have tested this anywhere?"

(12 Nov 2026.)
- 💬 Three ways for verses to reach ProPresenter, chosen in Settings → ProPresenter:
  - **A slide with linked text** (recommended): Voice Verses writes the verse to a file; a text box on the church's own "Voice Verses" slide is linked to it (ProPresenter 7.6+, Format → Linked Text → File). The team puts the slide up and clears it like any other; each screen keeps its own look.
  - **A slide with Voice Verses' picture (NDI)**, as Pewbeam does: works today with 1.15.0 NDI output, but the same look on every screen.
  - **A message**, kept as the quickest fallback.
- ⏳ Billie's 10-minute test of linked text (speed, a different look per screen, the file in a shared folder from the iMac), then build: the NDI slide setting and guide first, linked text after the test.

## "Is it possible you create a comprehensive document and html/MD with screenshots with step numbers describing how to use all features in the app in a very intuitive and understandable way?"

(17 Nov 2026.)
- ✅ 1.19.2 **The user guide** (`docs/user-guide/`): 42 screenshots of the real app with numbered markers on each control, and numbered steps under each picture, from first set-up to settings, spirit, planning, Training and what the room sees, plus the keyboard and what to do when something goes wrong. As Markdown (`README.md`, on GitHub) and a page to open or share (`index.html`, also published as a private page the owner can share).
- Made by `tools/guide/capture.cjs` (drives the real app and marks the controls) and `tools/guide/build.py` (the words, in `tools/guide/content.py`). Run both again when the app changes so the guide never goes stale.
- ✅ 1.19.2 Found while taking the pictures and fixed: on a smaller screen (1440×900) the welcome text slid up under the order of service; the demo's card covered the suggestion bar.

## "Did you miss out how to edit the detailed looks of slides and other presentation format? Also, I thought connection to ProPresenter and its connection options has a couple of options we agreed on, I see nothing in the app or in the material teaching users to connect in the various ways. Also I still think a number of features are missing. Did you do a thorough check?"

(17 Nov 2026.) No: the guide was written from the main screens, not checked against the spec, and the three ProPresenter ways agreed earlier had not been built.
- ✅ 1.19.3 **ProPresenter's three ways** in Settings → ProPresenter (D32): a slide with linked text (files in a folder, shareable with another computer; Write a test verse; also song words), a slide with Voice Verses' picture over NDI, and the message. Each with its steps in ProPresenter, and checked by the booth check. Checked by `tools/e2e/propresenter-routes.cjs`.
- ✅ The guide checked against every feature in the spec: 17 sections and 68 numbered pictures, with new sections for **designing looks** (the designer, backgrounds, transitions, starter looks, which screen uses what, colour teams and themes, a slide's own look), **screens** (network, NDI, DeckLink, screen shapes, stage layouts) and **ProPresenter's three ways**, plus the library, Move on by time, Not this, the speech engines, test with a recording, the AI assistant, AI slides, import and export, lyrics and the desktop app. The guide ends with **Every feature, and where to find it**; `tools/guide/build.py` stops if a feature in that list has no section.

## "Does the app now have the clicking and voice demo for all features and setup of the app? Also, are the 3 ways we have listed to connect to ProPresenter the only best way we can come up with? Also how do we add the other versions of the Bible …? I also want features that can allow a part of the app to be used by the preacher to prepare for sermons with scriptures, texts, presentations, images with a lot of AI help and suggestions … automatically co-opted into the service depending on which service it is (churches can have multiple services per day) so that the app and service already knows the scriptures that will likely be called, the slides that should be displayed, and presentation that should come up. If it is also done outside the app … accept that in many formats … connect to the CCCGHQ dashboard if used and pull choir lyrics for services, announcement slides, order of service, sermon artifacts etc. Remember the goal is API first because every aspect of the app should be a decoupled module able to be communicated and interacted with to get and send data."

(17 Nov 2026.)
- 💬 **Click-and-voice lessons:** not for every feature yet. In the app: Your first Sunday, When something goes wrong, the narrated demo, and Set up your booth (not narrated). The written guide covers every feature. Proposed: a narrated Show me / Let me try lesson for every section of the guide, each with its own test.
- 💬 **ProPresenter:** more ways exist beyond the three: linked text read over the network (an RSS feed served by Voice Verses, no shared folder), the NDI picture as a Prop instead of a slide (over ProPresenter's slides on chosen screens only), and Voice Verses straight into the switcher with key and fill, without ProPresenter. Proposed for a decision.
- 💬 **More Bibles:** today KJV, ASV, WEB on the computer; ESV and NLT with a free key; API.Bible for licensed translations (NKJV, NIV…); "Your own" only reads Voice Verses' own JSON. Proposed: read the common Bible file formats (OSIS, USFX, USFM, Zefania) and bundle more public-domain translations (e.g. the Berean Standard Bible, and older Bibles in other languages).
- 💬 **Sermon preparation and service packages (API first):** proposed as one plan: a service package per service (scripture expected, slides, presentations, songs, announcements, media, notes); a local API v1 for every module (D27); importers for PowerPoint, Keynote/PDF, Word and text sermon notes, pictures; a connector to the CCCGHQ dashboard (choir lyrics, announcements, order of service, sermon artifacts); a sermon preparation space with optional AI (scriptures, cross-references, points, slides, pictures); and each package placed in the right service of the day, so detection already expects its scriptures (still rule 1: a verse goes up by itself only when said outright or 99% sure). Waiting for the owner's answers on CCCGHQ's API and the order.

## "I want this app to be sitting on the most modern and elegant architecture; the service architecture should be such that when updates are needed or packages are added, it just advertises and other services that need it subscribe… Does this make sense? Also is it okay to give the CCCG Dashboard our documentation or collect their own? Also I want other churches to be able to use this if they are not using the CCCG Dashboard."

(17 Nov 2026.)
- 💬 Yes: proposed as an event-driven design inside the one app (D27 stays: one download, works offline, no separate services to install): every module publishes what it offers and the events it sends on one event bus; others subscribe. The same bus is reachable from outside through the local API (commands and questions over HTTP, live events over WebSocket or SSE, webhooks out), described in OpenAPI and AsyncAPI, versioned, and found on the church network by Bonjour/mDNS. Connectors and importers are add-on packages that register themselves.
- 💬 CCCG Dashboard: both. Give them our open feed and service-package spec (`docs/integrations/`), and collect their API documentation if they already have one, so a CCCG connector can be written either way.
- 💬 Other churches: CCCG is one connector among several. Everything works without it: planning in the app, imports (PowerPoint, PDF, Word, SongSelect), a Planning Center connector, and the open feed any church's own app can implement.
- ✅ **Approved** (17 Nov 2026, "Approved."): the design page (event bus, module registry, local API, service package, pairing with scoped keys, the build order, CCCG both ways). Recorded as D33 and `docs/architecture/README.md`.
- ✅ 1.19.4 **Step 2.1, the bus and the registry:** nine modules register with manifests; what the screens show, Next, listening, what was heard, verses found, suggestions, services, songs and media and the Bible translation are announced as events; ProPresenter now follows the bus instead of being called by the live screen (so it also follows Presenter and the playlist). Nothing changes on screen. Checked by `tools/checks/bus-check.ts` (CI) and `tools/e2e/event-bus.cjs`.
- ✅ 1.19.5 **Step 2.2, the local API v1** ("Start"): Settings → Other apps and devices turns it on; a device pairs once with a six-digit code and gets its own key (see only, or see and control); paired devices show a verse, put one in Next, Take, go forward or back, Clear and show the logo; they follow every event as it happens (Server-Sent Events, WebSocket or signed webhooks); Voice Verses announces itself on the network (Bonjour); removing a device ends its key at once. For developers: `docs/api/README.md`, OpenAPI and AsyncAPI. Checked by `tools/checks/api-check.mjs` (CI) and `tools/e2e/local-api.cjs`.
- ✅ Step 2.3 done: the service package (1.19.6) and Add from a file (1.19.7), below.

## "Please continue with 2.3"

(18 Nov 2026.)
- ✅ 1.19.6 **The service package** (D35, `docs/api/service-package.md`): one document per service (order and lengths, songs with words and credits, the scriptures expected, announcements, pictures, notes). It arrives from another app over the network (an app paired with **Send in services**) or as a file (**Services → Import**), and becomes a service on its day, marked "From …"; sending it again updates that service. The scriptures expected become scripture slides in the sermon: detection finds them more easily (never enough to go up by itself), and loading them puts the first in Next. Songs go into the song library too. Any service goes back out as a package. Checked by `tools/checks/package-check.ts` (CI) and `tools/e2e/service-package.cjs`.
- ✅ Mock-up **Add from a file** (four screens, design canvas) approved: "Build it" (18 Nov 2026).
- ✅ 1.19.7 **Add from a file** (D36): in the service editor, **From a file** (or drop a file on a section) adds a presentation or the sermon notes.
  - **PDF:** each page as a picture, exactly as made, or as words in the church's look. This is also the way in for Keynote and Google Slides.
  - **PowerPoint:** words and pictures in the church's look, with speaker notes for the stage.
  - **Word or text notes:** the scriptures written in them (each with its words; a chapter mentioned in passing starts unticked), the points (each a slide), and the rest for the stage monitor.
  - A review screen lets the operator untick anything first. Older files are refused with how to save them again.
  - Notes now show on the stage monitor under the live slide, which they never did before.
  - Checked by `tools/checks/import-check.ts` (CI) and `tools/e2e/add-from-file.cjs` (a real PDF, PowerPoint and Word file).
- ⏳ Next: step 2.4, connectors (CCCG Dashboard once its documentation is in hand, or it builds to ours; Planning Center).

## "When I publish new releases, the users having previous versions do not get a notification and a place to update from their app."

(18 Nov 2026.) Right: the app checked once, as its window was opening, and the notice was often lost; Windows showed nothing (it only updated on quit); there was no place to check.
- ✅ 1.19.9 **Updates that people see** (`electron/updates.js`):
  - The app looks for a new version when it opens and every 4 hours.
  - **Settings → Desktop app → Updates** shows the version and **Check now**, and the new version appears beside Desktop app in the Settings list, with a message.
  - **Windows:** it downloads by itself, then **Restart to update** (or installs on quit).
  - **Mac** (not yet signed by Apple): **Download** gets the right installer for that Mac (Apple chip or Intel), checks it, then **Open the installer** with the steps.
  - Checked by `tools/e2e/updates.cjs` against a pretend update server.
- ⚠ Copies older than 1.19.9 can't be fixed from here: each needs 1.19.9 (or later) downloaded once by hand. After that, updates show up by themselves.
- ⏳ Signing (Apple Developer account, Windows certificate) would let Macs install updates by themselves too.

## "We are running ProPresenter in parallel on the Mac computer, and all we want is run Voice Verses on that computer too, but select its projector output as the Decimator, as the DeckLink Duo card has only 3 outputs that have been exhausted."

(25 Nov 2026.) Yes, this works with what is built: Settings → Screens and outputs → Projector on the eGPU's HDMI display (extended, 1920×1080), into a Decimator set to the switcher's format, down the balcony SDI cable to the switcher input that was Camera 1.
- ✅ Sound (26 Nov): the ProPresenter computer has its own Focusrite (the iMac got a spare), so Voice Verses listens there: Settings → Listening → the Focusrite, the channel carrying APOSTLE. ProPresenter and Voice Verses can share it.
- The DeckLink Duo's three outputs stay with ProPresenter (projector, lower third, confidence); in Voice Verses choose the eGPU HDMI screen, never a DeckLink port.
- ⚠ ProPresenter must not use the eGPU display.
- ⏳ The owner's team re-patches the switcher input and tests.

## "Also the demo voice is crazy robotic"

(26 Nov 2026.) The guide spoke with the computer's built-in voice (speechSynthesis), which on many computers is an old robotic one.
- A natural voice that works offline (Kokoro or Pocket through sherpa-onnx). The computer's own voice stays as the fallback for a line with no recording.
- Samples (26 Nov): Kokoro (4 voices) and Pocket. "Pocket would have been my pick." Pocket copies a voice from a short recording, so only recordings anyone may use: Kyutai's CC0 voices (donated voices, their own recordings, LibriVox readers) or CC BY with credit (Alba MacKenna). Seven sent; Caro (CC0, LibriVox) was heard word for word by Voice Verses' own recognition.
- "The C-developer voice sounds good, but you said it will add additional 100mb, how slow will that make the app?" Measured: about 600 MB of memory and the processor each time it spoke. "What is the best approach?" Recording every line ahead.
- "Are the commas, full stop and breaks used well." Not quite in the samples: colons muddled the words. Spoken lines now use full stops and commas only, with a pause between sentences.
- "Recorded voice should only come out during training, never when a service is ongoing. There should be a default request to allow audio play when a demo or training is played or selected before users can hear."
- ✅ 1.19.13 (D37): every line of the lessons and the demo recorded ahead in voice C (Kyutai Pocket TTS, CC0 voice "developer-1"), each heard word for word by Voice Verses' own speech recognition before it was kept; 42 sentences, about 0.6 MB; CI fails if a line has no recording.
- ✅ 1.19.13: heard only in a lesson or the demo, after **Hear the guide?** (Play the voice | Words only; Esc is Words only), every time; never while listening to a real microphone; Show me the fix is words only. Checked by `tools/e2e/guide-voice.cjs`.

## "The part of the preview and live is great, but some could want the 3 screens rather than just one live. Is there a way to add a toggle to switch it from 1 live screen to the 3 screens or as many as added? And still look very aesthetically beautiful and awesome."

(26 Nov 2026.)
- ✅ Mock-up (`docs/design/all-screens.html`), approved: "The screen design is great".
- ✅ 1.19.12 **One screen | Every screen**, a switch beside Live. Every screen shows each output that is on (projector, stream lower third, stage monitor), live and in its own shape, with where it goes; one is big and a click makes another big; on a wide monitor they sit like a switcher's multiview. An output on no screen says so, with Choose where it goes. Kept for next time. Checked by `tools/e2e/every-screen.cjs`.

## "I want all my exotic design principles, security, test, architecture principles and others that has gone into this app to be used in all projects in my Claude as the foundation for all my work and app design and development. I also want a comprehensive documentation, maybe an md file that I can download and give other projects and they will lay all the foundation needed and that has been used in this project."

(26 Nov 2026.)
- ✅ `docs/FOUNDATION.md`: every principle in a form any project can use (working with the owner, product, design, writing, accessibility, architecture, security and licensing, testing, documentation, shipping, performance, AI, teaching, lessons), with Voice Verses as worked examples, a short version for places where only a short text fits, and a starter kit (CLAUDE.md, OWNER_REQUESTS, DECISIONS, LESSONS, DESIGN_SYSTEM, CI, skills). Also packaged as a Skill (`foundation`).
- ⚠ A session can't change the owner's Claude settings: the owner adds it (Claude Code: `~/.claude/CLAUDE.md` on each computer; Claude.ai: project knowledge, personal preferences with the short version, or the Skill).
- ~~Keep it current: when a rule here changes or a lesson applies beyond this app, update FOUNDATION.md too.~~ Replaced on 27 Nov 2026: the master copy is the owner's `Foundation` repository; this project keeps a synced copy and never edits it (D38).

## "Give me a file or instruction to give voice verse that will let it know what to do"

(26 Nov 2026, in the `Foundation` repository's `VOICE-VERSES.md`.) Three parts, in order:
- ✅ 1.19.18 Part 1: move onto the master copy. `docs/FOUNDATION.md`, `docs/foundation/design/` (kit, fonts, contrast checker) and `.claude/skills/foundation/` synced from the master (version in `docs/foundation/VERSION`); the old kit removed; CLAUDE.md says never edit it here; Voice Verses keeps its own look (D38).
- ✅ 1.19.19 Part 2: every word readable. Measured on the real pixels on 56 screens (every page, every Settings page, the palette, a dialog, a lesson; 1440 and 2560 wide; the app has one theme, dark, until light mode ships): 3775 of 4020 pieces of text passed before (93.9%), 4020 of 4020 after. Fixed at the colours (Settings' quiet grey, the muted grey, white on the Live badge, nothing faded with opacity). `tools/e2e/contrast.cjs`, CI check 14, `docs/readability.md`.
- ⏳ Part 3: a better look, mock-up first.

## "Add the repository Foundation… Bring it up to date with this project's foundation and design kit" / "Merge it and start the switch"

(26–27 Nov 2026.) ✅ The master already had every rule and every part of the kit from this project; Foundation PR #1 added the lessons since the merge (a platform can choose your licence; a generated file edited by hand; the hidden copy of a control; a scripted click a control ignores; CORS; speech checks). Merged.

## "I do not understand this companion rubbish, and how it even got in to the development discussion we are having"

(27 Nov 2026.) 💬 It came from "Stream Deck and remote control" in the list of what other presentation apps have (above), which Claude picked when told "You decide where it is best to start" because it needed nothing from the owner, without asking whether the booth has a Stream Deck or explaining it first. It is an optional add-on (1.19.16, `tools/companion-module/`) that changes nothing in the app unless a church installs it in Bitfocus Companion. Offered to remove it; ⏳ the owner's call. Lesson recorded: ask whether an add-on matters to the owner before building it.

## "Do you know it is safe to clear to logo first when spirit or any automation is running the service until they are sure the next segment has actually kicked off, as sometimes it might not follow the time schedule accurately. If unsure, actual user/pilot engagement should be requested."

(26 Nov 2026.) Today Move on by time puts the next part's first slide straight on the screens (when picking a slide goes live), and spirit at Hands-free puts the next part live 3 seconds after a countdown or cue, without clearing to the logo first.
- ⏳ Every move the app makes by itself from one part of the service to the next: when not sure the next part has begun (the time is up, a countdown ended, the last slide of a song), the screens go to the logo, the next part waits in Next, and the operator is asked "Has <part> started?" (Show it, Space | Not yet: what was on screen comes back). Sure only when it hears the part begin (its cue, its song's words, its scripture read); only then may a move that earned Hands-free go straight to the screens. The clock alone never puts anything on the screens. Mock-up first.

## Bible files and more free translations (from "What are the items that involves development that can be done right now?", 26 Nov 2026)

- ✅ 1.19.16 **Stream Deck buttons**: a Bitfocus Companion module (attached to each release as voice-verses-companion.tgz) pairs with the code from Settings → Other apps and devices; Take, Clear, Logo, Back, Forward, show a verse or put one in Next, with Take lit green while something waits in Next and Clear lit red while something is on the screens. Companion requires the module's source to be MIT, so that one folder is MIT; the rest of the app is unchanged.
- ✅ 1.19.15 **Add a Bible file**: Settings → Bible → Your own reads OSIS, USFX, Zefania, USFM (a file, or eBible.org's .zip) and JSON on the computer, names it from the file, keeps it in the database (a whole Bible no longer fits the old place), and shows it by its short name on the screens and the live screen's translation switch. Tested on eBible.org's WEB and KJV files.
- ⏳ Several Bibles side by side (more than one of your own), and a list of free translations to add with one click: needs a mock-up of the Bible page first.

## Process

- "Can you push and update the app?" / "I want the current app to be pushed": merge to `main` after CI passes; the owner publishes the release (lowercase `vX.Y.Z` tag). ✅ always
- "Are all of the decisions and steps being added and created as skills, rules, etc. that can be used to recreate this app… without repeating mistakes?" ✅ 1.3.8
- Apple Developer account: recommended (organisation) before signing and notarising. 💬 waiting on the owner
