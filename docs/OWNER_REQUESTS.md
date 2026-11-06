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

## "Did you hear what I said about the goal of spirit running the whole service?" … "Do you think that is the best order?" … "Start please. Also, I want the option, if the user has an AI key, to add it and enhance the experience in a way that the app can learn better, perform more proficiently, and run spirit better. Is that even reasonable??"

(5 Nov 2026.)
- 💬 1.17.0 covers two kinds of move (moments on cue, sermon points). Running the whole service needs: one trust ladder for **every** move (getting the service ready, countdown into the welcome, following songs, next song, moments, moving on when time is up, clearing after a reading, the logo between parts, the end); the order of service as spirit's backbone; learning from every move the operator makes; a "What spirit will do next" strip with one Pause; a score after each service.
- 💬 Order agreed: one real Sunday with 1.17.0 first (spirit learns from real services), the design meanwhile; then spirit for the whole service (1.18.0, 1.19.0); then Training (once the live screen settles). The owner also needs to try DeckLink, NDI and ProPresenter on the real hardware, and to sign the installers.
- 💬 An AI key is reasonable and optional: spirit works fully without it; with Claude, OpenAI, an OpenAI-compatible server or Ollama on the computer (rule 3), spirit understands meaning not only phrases (asked only when unsure, on finished sentences), learns after each service (suggests cues and habits for a yes), prepares before Sunday (plan, songs, sermon notes), and can say why it got something wrong. AI never puts a verse up (rule 1); its ideas climb the same ladder; only written words, the plan and song titles are sent, never sound; offline, spirit carries on.
- ⏳ Mock-up: `docs/design/spirit-whole-service/` (Sunday with spirit running it, everything spirit can learn to do, How Sunday went, Help from AI), waiting for the owner's yes.

## "Proceed, but do you know there are different types of services with different order of service? Also, this AI might include the local LLM like Ollama and the like. Also, I want Voice Verses to be able to make a scheduled API call or update call to our church management app … ingestion of songs from choir, announcements from announcement team, images and media from creative team, so that spirit can add them to the order of each service, and prepare it for the user to approve and make adjustment before the service if needed, with spirit noting adjustment or correction and why so as to ensure that is in place subsequently if the reason serves the instance"

(5 Nov 2026.) The church uses **its own church management app**. Its service types: Sunday services (e.g. Communion Sunday, Thanksgiving Sunday), Midweek, Special events, Life events (weddings, funerals, dedications), Christmas, New Year, Easter, Friday Night Prayers, Prayer and Fasting, Youth Day.
- ✅ 1.18.0 **Service types**: every service has a type (Plan services → Type of service; guessed from the name and day when not chosen); spirit learns each type's order, timings and habits separately (a Friday Night Prayers is not run like a Sunday service). Cues can be for every type or only some.
- ✅ 1.18.0 spirit for every move: Settings → What spirit does (every move on its own ladder; the countdown into the next part and the next song work now, the rest in 1.19.0), "What spirit will do next" under the order of service with Pause (P), and How it went when listening stops (score, the service start to end, corrections with "Just this once", what has earned Hands-free).
- ⏳ 1.20.0 Help from AI includes models on the church's own computers: Ollama, LM Studio, llama.cpp and any OpenAI-compatible server, as well as Claude and OpenAI.
- ⏳ 1.21.0 **The church's app feeds each service**: Voice Verses checks the church app on a schedule (and on demand) for each upcoming service's songs (choir), announcements (announcement team), and pictures and media (creative team). spirit drafts the order of service from them for that service's type; the operator approves or adjusts before the service; spirit notes each adjustment and the reason, and applies it next time when the reason holds (e.g. "announcements go after the offering on Communion Sundays"). Works offline from the last copy.
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

## "For the ProPresenter, it sent, but show didn't send it to the screens!!" (screenshots: ProPresenter's Messages, the message "Service Countdown" with Verse and Reference tokens, Verse filled, Reference empty)

(6 Nov 2026.)
- 💬 Cause, most likely:
  - Voice Verses made its message by posting `id: { uuid: '', index: 0 }`, and sent each verse to the message's name.
  - On the owner's ProPresenter 21, that changed message 0, the church's **"Service Countdown"**, and the verses went into it.
  - So no "Voice Verses" message showed, and the countdown message was altered.
  - **The owner should put Service Countdown back** (take out the Verse and Reference tokens and put back its countdown).
- ✅ 1.18.4:
  - The message is always addressed by its own ProPresenter id, found by its exact name.
  - A new message is posted with only its name.
  - If ProPresenter changes another message instead, Voice Verses says which one and stops.
  - After each verse, Voice Verses asks ProPresenter whether its Messages layer is showing, and says so plainly if it isn't (and with the test verse).
  
  Checked by `tools/checks/propresenter-trigger.mjs` (in CI).

## Process

- "Can you push and update the app?" / "I want the current app to be pushed": merge to `main` after CI passes; the owner publishes the release (lowercase `vX.Y.Z` tag). ✅ always
- "Are all of the decisions and steps being added and created as skills, rules, etc. that can be used to recreate this app… without repeating mistakes?" ✅ 1.3.8
- Apple Developer account: recommended (organisation) before signing and notarising. 💬 waiting on the owner
