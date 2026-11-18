import re
# The user guide's words. build.py turns them into docs/user-guide/README.md and index.html.
# Each figure's numbered steps match the numbered markers in its picture (tools/guide/capture.cjs).
# Plain words, from the volunteer's side of the screen. "spirit" always has a small s.

TITLE = "Voice Verses Guide"
SUBTITLE = "How to use every part of Voice Verses, step by step. The numbers in each picture match the numbered steps under it."
VERSION = "1.19.3"

SECTIONS = [
    {
        "id": "start",
        "title": "Before you start",
        "intro": "Voice Verses listens to the preacher and puts the right Bible verse on your screens by itself. It also runs songs, slides, pictures, videos, countdowns and the order of service.",
        "points": [
            "Use the **desktop app** in church (Mac or Windows). It is one download: listening, the Bibles (KJV, WEB, ASV) and the screens all work without the internet.",
            "**Red always means Live** (what the room sees now). **Green always means Next** (what goes up when you press Take).",
            "Not sure? Nothing you try in **Training** reaches the room. See [Training](#training).",
        ],
    },
    {
        "id": "setup",
        "title": "1. Set up your booth (the first time)",
        "intro": "The first time Voice Verses opens on a computer, it looks for your microphone, screens and ProPresenter, and asks you to check each one. It takes about five minutes.",
        "figures": [
            {
                "img": "setup-1-found",
                "caption": "Set up your booth: what Voice Verses found",
                "steps": [
                    "**The preacher’s microphone.** Voice Verses listens to every input and picks the one with sound. Ask someone to speak into the pulpit microphone; the bar moves.",
                    "Press **Looks right** if it found the right one. Press **Listen again** to look again, or **Change** to pick the input and the desk channel yourself (for example the channel called APOSTLE).",
                    "**Screens.** Each output (projector, stream lower third, stage) shows the number of the screen it goes to. Press **Identify screens** to put a big number on every screen in the room, then **Looks right**.",
                    "**ProPresenter.** If you use it, Voice Verses finds it on this computer or the network: press **Yes, that’s it**. This only remembers where it is; it does not start sending anything. If you don’t use ProPresenter, press **We don’t use ProPresenter**.",
                    "**Your services.** Tick the services your church holds (Sunday service, Midweek, Friday Night Prayers…). Each one gets a ready-made order of service. Press **Looks right**.",
                    "**Try the demo** plays a two-minute practice sermon, explained step by step. Nothing reaches the room.",
                    "**Finish later** closes it. You can open it again any time from Settings → Booth check → **Set up your booth**.",
                ],
            },
            {
                "img": "setup-2-confirmed",
                "caption": "All four confirmed",
                "steps": ["**Try the demo** to see Voice Verses at work.", "**Done** takes you to the live screen."],
            },
        ],
    },
    {
        "id": "live",
        "title": "2. The live screen at a glance",
        "intro": "Everything for the service happens on this one screen. It is the same every Sunday.",
        "figures": [
            {
                "img": "live-1-tour",
                "caption": "The live screen",
                "steps": [
                    "**The service.** Click its name for the other pages (Plan services, Media, Looks, Screens, Training, Settings).",
                    "**Start listening.** Voice Verses starts hearing the preacher. While it listens, a level meter moves and **Mute** stops it hearing for a moment.",
                    "**Auto / Ask first.** *Auto*: a verse the preacher says outright goes straight up. *Ask first*: it waits in Next until you press Take.",
                    "**Booth check.** *Ready* (grey tick) or *n to check* (amber). Click it to see what needs a look.",
                    "**Search** (⌘K on a Mac, Ctrl+K on Windows): a verse, a song, a part of the service or an action.",
                    "**Settings** (the gear).",
                    "**The order of service.** Each part is as wide as its time. Click a part to load it.",
                    "**spirit** shows what it will get ready next. **Pause** (or the P key) stops it doing anything by itself.",
                    "**When I pick a slide:** *Goes live* shows it at once; *Waits in Next* (the usual choice) puts it in Next first.",
                    "**Live** (red): what the room sees now.",
                    "**Take** (Space bar): puts Next on the screens.",
                    "**Next** (green): what goes up when you press Take.",
                ],
            },
            {
                "img": "live-2-welcome",
                "caption": "Before anything is on the screens",
                "steps": [
                    "**Start listening** when the service begins.",
                    "**Watch the demo**: a two-minute sermon and hymn, explained aloud with a pointer.",
                    "**Find a verse, song or item** opens Search.",
                    "**Training**: short lessons on these real screens.",
                    "**Today’s order**: click any part to load its slides.",
                    "**Show a verse**: quick buttons for well-known verses.",
                ],
            },
        ],
    },
    {
        "id": "demo",
        "title": "3. Watch the demo",
        "intro": "The demo plays a short sermon and a hymn through the real listening engine. A voice says what is happening, and a pointer shows where.",
        "figures": [
            {
                "img": "demo-1-heard",
                "caption": "The demo explains each step",
                "steps": [
                    "**The card** says what is happening; the same words are spoken. The speaker button turns the voice off.",
                    "**Stop the demo** ends it at any time.",
                ],
            },
            {
                "img": "demo-2-reading",
                "caption": "Following the reading",
                "steps": [
                    "**The verse being read**, large, with the word being read underlined.",
                    "**Heard**: the last words Voice Verses heard.",
                    "**Live**: the verse went up because the preacher said “John chapter 3 verse 16”.",
                    "**Next**: the following verse is ready, in case the preacher reads on. It goes up when this verse ends.",
                ],
            },
        ],
    },
    {
        "id": "verse",
        "title": "4. Put a verse on the screens yourself",
        "intro": "Three steps: find it, check it in Next, press Take.",
        "figures": [
            {
                "img": "verse-1-search",
                "caption": "Search",
                "steps": [
                    "Press **⌘K** (Ctrl+K on Windows), or click the magnifying glass. Type the verse: *John 3:16*, *Psalm 23*, *Romans 8:28-39*.",
                    "Press **Return**, or click **Show John 3:16**.",
                ],
            },
            {
                "img": "verse-2-next",
                "caption": "The verse waits in Next",
                "steps": [
                    "**Next** shows exactly how it will look on the projector.",
                    "Press **Take** (or the Space bar) to put it on the screens.",
                    "**When I pick a slide** decides whether picking goes straight to the screens (*Goes live*) or waits in Next (*Waits in Next*).",
                    "The verse also shows large here, with the rest of the chapter underneath to pick from.",
                ],
            },
            {
                "img": "verse-3-live",
                "caption": "On the screens",
                "steps": [
                    "**Live** (red) now shows John 3:16, and so does the room.",
                    "**Clear** (Esc) takes the words off the screens.",
                    "**Logo** shows the church logo on every screen.",
                    "**KJV ▾** changes the translation of everything on screen and in Next.",
                ],
            },
        ],
        "points": ["Press **→** for the next verse and **←** for the one before."],
    },
    {
        "id": "listening",
        "title": "5. Let it listen",
        "intro": "Press Start listening and the preacher does the work.",
        "points": [
            "**Said outright** (“John 3:16”, “John chapter 3 verse 16”, “Romans 8 from verse 28”): in *Auto* it goes straight up; in *Ask first* it waits in Next.",
            "**Read aloud**: each verse goes up as the reader gets to it, and the next one waits in Next.",
            "**Named without a verse** (“turn to Isaiah 53”): the chapter loads and waits until the preacher reads or names a verse.",
            "**Quoted or told in their own words**: offered as a **suggestion**. It never goes up by itself unless it is word for word (99% sure).",
            "**During songs**, press **♪ Song** so verses stay off the screen unless a reference is said outright.",
        ],
        "figures": [
            {
                "img": "demo-3-suggestion",
                "caption": "A suggestion",
                "steps": [
                    "**The ring** shows how much of the verse’s wording was heard.",
                    "**Why** it was suggested, in plain words (most of it quoted, in today’s plan, the book was mentioned…).",
                    "**Show now** puts it straight on the screens.",
                    "**Use** puts it in Next, to check first. The × dismisses it. Click the bar to see every suggestion of the last few minutes.",
                ],
            }
        ],
    },
    {
        "id": "songs",
        "title": "6. Songs and slides",
        "intro": "Songs, announcements and pictures come from the order of service.",
        "figures": [
            {
                "img": "song-1-strip",
                "caption": "Load a part of the service",
                "steps": [
                    "Click the part in the **order of service** (here, the hymn *Holy, Holy, Holy*).",
                    "Its **slides** appear along the bottom. Click one to pick it; double-click to show it at once.",
                    "The first slide waits in **Next**.",
                    "Press **Take** (Space) to show it, then Space again for each slide.",
                    "**See all slides** shows them as a grid.",
                ],
            },
            {
                "img": "song-2-live",
                "caption": "A song on the screens",
                "steps": [
                    "**Live · V1.1**: the slide on the screens, framed red.",
                    "**Next · V1.2**: the slide that comes next, framed green.",
                    "**The pencil** (Quick edit) fixes a word or changes the look, even during the service.",
                    "**♪ Song**: while the church sings, the words follow the singers, and verses stay off the screen.",
                ],
            },
            {
                "img": "song-3-quick-edit",
                "caption": "Quick edit",
                "steps": ["Change the section name, the words or the **look**, and see how the room will see it. Press **Save**. For the full designer, press **Open the full designer**."],
            },
            {
                "img": "song-4-grid",
                "caption": "Every slide as a grid",
                "steps": ["**Show the words large** goes back to the normal view."],
            },
        ],
        "points": [
            "The worship leader can call parts of the song out loud: “Verse two!”, “Back to the chorus”. Voice Verses goes there.",
            "New words that are in no song are offered as a new song, and kept as a draft afterwards.",
        ],
    },
    {
        "id": "countdowns",
        "title": "7. Countdowns and alerts",
        "intro": "Both buttons are at the top of the live screen and every other page.",
        "figures": [
            {
                "img": "tools-1-countdown",
                "caption": "Countdown",
                "steps": [
                    "**Quick start**: before the service, until the service starts, a sermon timer (stage only), and more.",
                    "**Length of time** (5 minutes) or **Until a time** (10:00).",
                    "**Message** above the numbers, such as “Service begins in”.",
                    "**Show it on**: all screens, the projector, the stage monitor or the stream; full screen or small in the corner.",
                    "**Turn yellow with** 1 minute left; **Blink** when yellow and red. It turns red at zero, and the stage shows how far over it is.",
                    "**Start**. Several countdowns can run at once, each on its own screens.",
                ],
            },
            {
                "img": "tools-2-alert",
                "caption": "Alert: a message over whatever is on screen",
                "steps": [
                    "**For the room**: nursery, children’s church, car lights, move a car, seats at the front.",
                    "**For the stage only**: five minutes, please wrap up, speak up, microphone.",
                    "Type the **child number** or number plate (or write any message).",
                    "**Show it on**: which screens.",
                    "**Hide it**: until you clear it, or after 15 seconds to 2 minutes.",
                    "**Amber** and **Blink** make it stand out. The preview shows how the projector will look; the button under it shows the alert. While one is up, the Alert button turns amber with an × to clear it.",
                ],
            },
        ],
    },
    {
        "id": "booth-check",
        "title": "8. Is everything ready?",
        "intro": "The booth check looks at the microphone, the screens, ProPresenter, the Bible and today’s service every minute.",
        "figures": [
            {
                "img": "tools-3-booth-check",
                "caption": "The booth check light",
                "steps": [
                    "**Ready** (grey tick) or **n to check** (amber). Click it.",
                    "Each check, with a button that takes you straight to the fix.",
                ],
            },
            {
                "img": "settings-1-booth",
                "caption": "Settings → Booth check",
                "steps": ["The **booth check** at the top of Settings.", "**Set up your booth** finds everything again."],
            },
        ],
        "points": ["During the service, a problem (a screen unplugged, no sound for 20 seconds) shows as an amber warning under the top bar, with its fix button."],
    },
    {
        "id": "settings",
        "title": "9. Settings, page by page",
        "intro": "Open Settings with the gear. Everything saves as you change it; there is no Save button to forget.",
        "figures": [
            {
                "img": "settings-2-features",
                "caption": "Features: what Voice Verses does by itself",
                "steps": [
                    "**Features** in the sidebar.",
                    "Choose **Essentials**, **Recommended** or **Everything**.",
                    "Or switch each feature on or off. A verse said outright always goes up, whatever is off.",
                ],
            },
            {
                "img": "settings-3-listening",
                "caption": "Listening: the microphone",
                "steps": [
                    "**Listening** in the sidebar.",
                    "**Input**: the microphone or the sound desk’s USB feed.",
                    "**Sound check**: speak and the bar moves. If the desk sends many channels, click the preacher’s channel (its meter moves when they speak).",
                ],
            },
            {
                "img": "settings-4-screens",
                "caption": "Screens and outputs",
                "steps": [
                    "**Screens and outputs** in the sidebar.",
                    "**Click a screen** in the picture of the room.",
                    "Choose what it **shows**: Projector, Lower third, Stage monitor or Nothing. It opens there by itself, every time.",
                    "**Identify screens** puts a big number on every screen.",
                ],
            },
            {
                "img": "settings-5-propresenter",
                "caption": "ProPresenter (optional)",
                "steps": [
                    "**ProPresenter** in the sidebar.",
                    "**ProPresenter on your network**: press **Connect** beside yours. The **Send verses** switch at the top turns sending on or off.",
                    "**What ProPresenter shows**: its look, also on its stage screens, **Send a test verse**, **Clear it** and **Why isn’t it on the screens?**",
                    "**Not in the list?** Three steps to switch on ProPresenter’s network setting, or type its address yourself.",
                ],
            },
            {
                "img": "settings-6-bible",
                "caption": "Bible translations",
                "steps": [
                    "**Bible** in the sidebar.",
                    "**On this computer**: KJV, ASV, WEB, or your own. Always works, no internet needed.",
                    "**Over the internet**: ESV, NLT and API.Bible translations (NKJV, NIV, CSB…), each with a free key from its publisher.",
                ],
            },
            {"img": "settings-7-songs", "caption": "Songs and CCLI", "steps": ["**Songs and CCLI** in the sidebar.", "Your **CCLI licence number**, shown small on each song’s first slide with its writers and copyright."]},
            {"img": "settings-8-logo", "caption": "Logo", "steps": ["**Logo** in the sidebar. **Choose a picture**; a transparent PNG looks best. The Logo button shows it on every screen."]},
            {"img": "settings-9-library", "caption": "Library and backup", "steps": ["**Library and backup** in the sidebar. **Choose folder** inside iCloud Drive, Dropbox, OneDrive or Google Drive to back up your services and share them between computers."]},
        ],
    },
    {
        "id": "spirit",
        "title": "10. spirit: let it run the service",
        "intro": "spirit learns how your church runs its service, gets the next thing ready, and earns your trust one move at a time. It never puts a verse up that wasn’t said.",
        "figures": [
            {
                "img": "settings-10-spirit",
                "caption": "How spirit runs",
                "steps": [
                    "**How spirit runs** in the sidebar.",
                    "**How much spirit does**: *Off*; *Ready in Next* (it gets things ready and you press Take); *Hands-free* (only for moves that have been right 10 times in a row).",
                    "**Your last service**: what spirit got right, what you chose, what you corrected.",
                    "**What spirit knows**.",
                ],
            },
            {
                "img": "settings-11-moves",
                "caption": "What spirit does",
                "steps": ["**What spirit does** in the sidebar.", "**Spoken cues**: moments and sermon points.", "**Before and after the service**: the countdown into the next part, and more coming soon.", "**Songs**: the next song when one ends."],
            },
            {
                "img": "settings-12-cues",
                "caption": "Cues: teach spirit your church’s words",
                "steps": [
                    "**Cues** in the sidebar. At the top, fill in the sentence: *When the preacher says* “as the ushers make their way” *get* Offering *ready*, then press **Teach spirit**.",
                    "**Prayer**: the phrases spirit already knows for prayer (“let us pray”, “bow your heads”…).",
                    "**Giving**: “tithes and offerings”, “receive the offering”…",
                    "**Welcome**, and below it every other moment of the service, each with its phrases.",
                ],
            },
        ],
        "points": [
            "spirit also learns by watching: when the same words keep coming before the same part, it suggests them as a new cue.",
            "If spirit gets something wrong, press **Not this** beside Next and say why (wrong part, not now, never for these words). It remembers.",
            "**Pause** (P) on the live screen hands everything back to you at once.",
            "When listening stops, **How it went** shows spirit’s score, with **Just this once** to undo a correction.",
        ],
    },
    {
        "id": "planning",
        "title": "11. Plan your services",
        "intro": "Open **Services** from the page bar (or the service name on the live screen).",
        "figures": [
            {"img": "pages-1-services", "caption": "Services", "steps": ["The **page bar**: Live, Services, Media, Looks, Screens, Training, Settings. Pick a day in the calendar; its services show with **Edit** and **Present**. **New service** is at the top right."]},
            {
                "img": "pages-2-templates",
                "caption": "Templates and ready-made orders",
                "steps": [
                    "**New template**: your own order of service for a type of service, from a ready-made order, a service you have, or nothing.",
                    "**Ready-made orders**: one for every type of service. **Use for** the chosen day, or **Make it a template**.",
                ],
            },
            {
                "img": "pages-3-builder",
                "caption": "The service editor",
                "steps": [
                    "**Type of service** (Sunday service, Communion Sunday, Friday Night Prayers…). spirit learns each type separately.",
                    "**Save as a template** keeps this service as a starting point for next time.",
                ],
            },
        ],
        "points": [
            "Add parts with the tiles on the left: **Scripture**, **Song**, **Announcement**, **Picture**, **Video**, **Countdown**. Drag to reorder.",
            "**Copy for next Sunday** (on the Services page) makes a fresh copy of a service.",
            "**Present** opens the service as a list of slides, with Live and Next beside it.",
        ],
    },
    {
        "id": "pages",
        "title": "12. Media, Looks, Screens and Presenter",
        "figures": [
            {"img": "pages-4-media", "plain": True, "caption": "Media", "steps": ["Pictures, videos and songs. **Add files** takes pictures, videos and SongSelect song files (.usr or .txt) with their writers, copyright and CCLI number. Songs here are recognised when the church sings them."]},
            {"img": "pages-5-looks", "caption": "Looks", "steps": ["Three tabs: **Design a look** (the designer), **Which screen uses what**, and **Colour teams and themes**. **Backgrounds** has moving backgrounds and 40 samples; **Starter looks** has ready-made designs."]},
            {"img": "pages-6-screens", "plain": True, "caption": "Screens", "steps": ["**Right now**: what each screen shows. Below it, the same settings as Settings → Screens and outputs."]},
            {"img": "pages-7-presenter", "plain": True, "caption": "Presenter", "steps": ["Every slide of the service by section. Click one to show it; **Start presenting** and **Clear to Logo** at the top."]},
        ],
    },
    {
        "id": "training",
        "title": "13. Training",
        "intro": "Short lessons on the real screens, in practice: nothing reaches the projector, the stream, the stage or ProPresenter.",
        "figures": [
            {
                "img": "training-1-page",
                "caption": "Training",
                "steps": [
                    "**Training** in the page bar (or the Training button on the live screen).",
                    "**Show me**: Voice Verses does each step, with a pointer and a voice.",
                    "**Let me try**: you do each step; it waits and checks.",
                    "**Watch**: the demo, explained aloud.",
                ],
            },
            {
                "img": "training-2-show-me",
                "caption": "Show me",
                "steps": [
                    "**The step**, on a card beside the control. **Back**, **Pause**, and **Let me try this step**.",
                    "**The speaker** turns the voice on or off. The × (or Esc) leaves the lesson.",
                    "**End practice** on the violet band stops the lesson.",
                ],
            },
            {
                "img": "training-3-let-me-try",
                "caption": "Let me try",
                "steps": ["**The lit control** is the one to click.", "Click somewhere else and it says what you clicked, and nothing changes. After two tries it offers **Show me this step**."],
            },
        ],
    },
    {
        "id": "room",
        "title": "14. What the room sees",
        "figures": [
            {"img": "outputs-1-projector", "plain": True, "caption": "The projector", "steps": ["Scripture, songs and slides in their look, with countdowns and alerts on top."]},
            {"img": "outputs-2-stage", "plain": True, "caption": "The stage monitor", "steps": ["The current verse or slide, what is coming next, the clock and any stage countdown or alert."]},
            {"img": "outputs-3-lower-third", "plain": True, "caption": "The stream lower third", "steps": ["The verse on a green key colour for the stream switcher. Over NDI it goes see-through."]},
        ],
    },
]

KEYS = [
    ("Space or Return", "Take: put Next on the screens"),
    ("Esc", "Clear the words off the screens"),
    ("→ and ←", "Next or previous verse or slide"),
    ("⌘K (Mac), Ctrl+K (Windows)", "Search"),
    ("P", "Pause or resume spirit"),
    ("Double-click a slide", "Show it now"),
]

TROUBLE = [
    ("Nothing happens when the preacher speaks", "Look at the booth check light. In Settings → Listening, check the input and speak: the bar must move. With a desk feed, click the preacher’s channel."),
    ("A screen is black or on the wrong display", "Settings → Screens and outputs → Identify screens, then click the screen and choose what it shows."),
    ("A wrong verse was suggested", "Press × on the suggestion. Suggestions never go up by themselves. Switch to Ask first if you want every verse to wait in Next."),
    ("spirit got the wrong part ready", "Press Not this beside Next and say why. Press P to pause spirit."),
    ("ProPresenter’s message covers its screens", "In ProPresenter, Hide the “Voice Verses” message; Voice Verses stops sending until you choose Send again. To stop for good: Settings → ProPresenter → Send verses off."),
    ("Something went up by mistake", "Press Esc to clear, or the Logo button."),
    ("You want to practise", "Training → Your first Sunday → Let me try. Nothing reaches the room."),
]

# ---- Added after the owner's check (1.19.3): every feature, with ProPresenter's three ways and designing looks ----

def _sec(sid):
    return next(s for s in SECTIONS if s["id"] == sid)


def _drop(sid, img):
    sec = _sec(sid)
    sec["figures"] = [f for f in sec["figures"] if f["img"] != img]


def _insert_after(sid, section):
    SECTIONS.insert(SECTIONS.index(_sec(sid)) + 1, section)


_sec("live")["figures"] += [
    {
        "img": "live-3-more",
        "caption": "The library, moving on by time, and spirit",
        "steps": [
            "**Library** (top left): the Bible, your songs and your services, to pick from during the service.",
            "**Move on by time**: when a part’s time is up, the next part loads by itself (into Next, or on screen if picking a slide goes live). The sermon, a verse on screen and a song being sung never move on by themselves.",
            "**Pause** (or the P key): spirit stops getting things ready by itself until you press it again.",
        ],
    },
    {
        "img": "live-4-library",
        "caption": "The library",
        "steps": ["Three tabs: **Bible** (type a reference; *History* shows what was on screen), **Songs** (your song library) and **Service** (today’s services, coming up and earlier, each part with its slides). Click anything to pick it."],
    },
]
_sec("live")["points"] = [
    "**Several services on the same day** sit side by side before the order of service; one click switches between them.",
    "The window can be any size: on a wide monitor the library stays open as a column on the left.",
]

_sec("spirit")["figures"].insert(0, {
    "img": "live-5-not-this",
    "caption": "When spirit gets something wrong",
    "steps": [
        "spirit put **Blessed Assurance** in Next because the last slide of the song before it went up. Next says why.",
        "**Not this** tells spirit it was wrong.",
        "Say why in one tap: **Wrong part**, **Not now** or **Never for these words**. spirit remembers.",
    ],
})

LOOKS = {
    "id": "looks",
    "title": "Design how things look",
    "intro": "A **look** is the design for one kind of thing on one screen: scripture on the projector, songs on the stream, and so on. Change a look and every slide that uses it changes, on the screens straight away. Open **Looks** from the page bar.",
    "figures": [
        {
            "img": "pages-5-looks",
            "caption": "Looks",
            "steps": [
                "Three tabs: **Design a look**, **Which screen uses what**, and **Colour teams and themes**. Click a look in the row to design it.",
                "**Backgrounds**: moving backgrounds made by the app, and 40 ready-made samples.",
                "**Starter looks**: ready-made designs to add and change.",
                "**New look** starts one from nothing.",
            ],
        },
        {
            "img": "looks-1-designer",
            "caption": "The designer",
            "steps": [
                "**On this slide**: click the part to change (Background, Main text, Reference / title, Logo, Transition). **Text**, **Shape** and **Picture** at the bottom add your own layers.",
                "Try it with a **short verse**, a **long verse**, a **song** or an **announcement**, so it works for all of them.",
                "**Undo** and **Redo** (⌘Z and ⇧⌘Z).",
                "**Duplicate** makes a copy to change. **Reset** puts a built-in look back as it came.",
            ],
        },
        {
            "img": "looks-2-background",
            "caption": "Change the background",
            "steps": [
                "Click **Background**.",
                "Choose **Colour**, **Gradient**, **Moving**, **Picture** or **Video**. Moving backgrounds are drawn by the app in your team’s colours, with a speed (0 is still). A picture or video can be dimmed and blurred so the words stay readable.",
            ],
        },
        {
            "img": "looks-3-backgrounds",
            "caption": "Backgrounds",
            "steps": ["**In your colours** (they follow your colour team) or **Samples (40)**. Pick one, choose what it goes behind on the projector (**Scripture**, **Songs**, **Announcements**, **Countdowns**), then press **Use**."],
        },
        {
            "img": "looks-4-starters",
            "caption": "Starter looks",
            "steps": ["Tabs for Scripture, Songs, Announcements, Countdowns and Lower thirds. **Add** copies one into your looks; **Use on projector** puts it to work straight away."],
        },
        {
            "img": "looks-5-assign",
            "caption": "Which screen uses what",
            "steps": ["For each screen (the projector, the lower third for the stream, the stage), choose the look for **Scripture**, **Songs**, **Announcements** and **Countdowns**."],
        },
        {
            "img": "looks-6-teams",
            "caption": "Colour teams and themes",
            "steps": ["**Colour team**: five colours every look can use. Change the team and every look changes with it. **Change with the month** picks the team for the season (Advent purple in December, Easter in April). **More colour teams** adds Christmas, Lent, Youth and others; **New team** makes your own. **Themes** set every look and a colour team in one click (**Use this theme**)."],
        },
        {
            "img": "pages-3b-slide-menu",
            "caption": "One slide, its own look",
            "steps": ["In the service editor, open a slide’s **⋮** menu and choose **Design…**"],
        },
        {
            "img": "pages-3c-slide-design",
            "caption": "Designing one slide",
            "steps": ["The same designer, for this slide. At the bottom, choose where it applies: **This slide**, or every slide of that kind (for example **Every announcements slide**)."],
        },
    ],
    "points": [
        "**Move and resize**: drag the text box to move it, and its corners to resize it. Pink guide lines show when things line up.",
        "**The text panel** on the right: font, largest size (long verses shrink to fit), bold, italic, underline and highlight, colours (the team’s colours or any), alignment, up or down, line and letter spacing, shadow and outline, a box behind the text, and where it sits.",
        "**Single words**: select words in the text and use the bold, italic, underline, highlight or colour buttons.",
        "**Transitions**: click *Transition* in the list: dissolve, through black, lift, zoom, push or cut, from 0.2 to 3 seconds. A slide in a service can have its own.",
        "**During the service**: Quick edit (the pencil on a slide, or Edit above Live) changes a slide’s words or look on the spot.",
        "Slow computer? Settings → Screens and outputs → *Moving backgrounds on this computer* can keep them still.",
    ],
}
_insert_after("booth-check", LOOKS)

SCREENS = {
    "id": "screens",
    "title": "Screens: projector, stream and stage",
    "intro": "Voice Verses puts each output on its screen by itself, every time. Open Settings → **Screens and outputs** (or the **Screens** page).",
    "figures": [
        next(f for f in _sec("settings")["figures"] if f["img"] == "settings-4-screens"),
        {
            "img": "settings-4b-network",
            "caption": "Screens on the network",
            "steps": ["Click **On the network** in the picture of the room and switch **Share** on. Any browser on the church network can then show an output: a smart TV, a tablet on stage, another computer, or OBS and vMix as a browser source. The addresses it shows can be copied; the port is 47100."],
        },
        {
            "img": "settings-4c-ndi",
            "caption": "NDI® on the network",
            "steps": ["Click **NDI on the network**. Each output can be an NDI source for vMix, OBS, TriCaster, NDI converters and ProPresenter; the lower third goes see-through. It needs the free **NDI Runtime** on this computer (NDI Tools, from ndi.video/tools)."],
        },
        {
            "img": "settings-4d-outputs",
            "caption": "Each output, and where it goes",
            "steps": ["Every output with its picture, where it is shown, its **screen shape** (match the screen, 16:9, 16:10, 4:3, ultrawide or your own size) and **Send it somewhere else too**: one output can go to a screen and a DeckLink port and the network at once."],
        },
        {
            "img": "settings-4e-ways",
            "caption": "Ways to connect a screen",
            "steps": ["**Ways to connect a screen**: a display cable (HDMI, DisplayPort, USB‑C, AirPlay), **Blackmagic DeckLink** (SDI straight into the switcher; choose the video format your switcher uses and press *Show test colours*), the network, ProPresenter and NDI. Each says whether it is ready."],
        },
        {
            "img": "outputs-2b-stage-settings",
            "caption": "The stage monitor’s own settings",
            "steps": ["On the stage monitor, move the mouse and click the gear. **Start from a layout** (Classic, Large words, Preacher, Singers or High contrast), then change colours and sizes."],
        },
    ],
    "points": [
        "Esc on an output that sits on your own screen turns it off.",
        "If a screen is unplugged, its output comes back by itself when it is plugged in again, and the booth check says so meanwhile.",
        "An HDMI-to-SDI converter on a spare video output works too, like any other screen.",
    ],
}
_drop("settings", "settings-4-screens")
_insert_after("looks", SCREENS)

PROPRESENTER = {
    "id": "propresenter",
    "title": "ProPresenter: three ways to connect",
    "intro": "ProPresenter is optional: Voice Verses’ own screens keep working whichever way you choose, and nothing is sent while you practise. Open Settings → **ProPresenter** and choose how the words get there.",
    "figures": [
        {
            "img": "pp-1-linked",
            "caption": "Way 1: a slide with linked text (recommended for most churches)",
            "steps": [
                "Choose **A slide with linked text**. Your team keeps control: they put the slide up and take it down, and each screen keeps its own look.",
                "**Send the words to ProPresenter**: on for the service.",
                "**Also song words**: song slides go there too, if you want.",
                "**The folder** where Voice Verses writes the words. **Show the files** opens it. If ProPresenter is on another computer, press **Choose another folder** and pick a folder both computers can see (a shared folder, or a Dropbox, iCloud or OneDrive folder).",
                "**Write a test verse** writes John 3:16 now (even with sending off), so you can link the text box and see it. **Clear it** empties it.",
            ],
        },
        {
            "img": "pp-2-linked-steps",
            "caption": "Way 1, in ProPresenter (once)",
            "steps": ["The page lists the six steps: **make a slide** called “Voice Verses” with a text box; select the text box → **Format → Linked Text → File** → choose **verse.txt** (or *verse-and-reference.txt*; a second box can show *reference.txt*); press **Write a test verse** here and the box shows John 3:16; give it the look you want on each screen; in the service, **put the slide up** when the reading starts, and its words follow Voice Verses."],
        },
        {
            "img": "pp-3-ndi",
            "caption": "Way 2: a slide with Voice Verses’ picture",
            "steps": [
                "Choose **A slide with Voice Verses’ picture**. ProPresenter shows exactly what Voice Verses draws: verses, songs, slides and countdowns, with the same look on every screen.",
                "Switch on **Send the projector over NDI**. This computer needs the free NDI Runtime (NDI Tools, from ndi.video/tools).",
                "In ProPresenter, once: **Settings → Inputs**, add an NDI input and choose “… (Voice Verses Projector)”; then make a slide whose background is that input, and put it up when the reading starts.",
            ],
        },
        {
            "img": "pp-4-message",
            "caption": "Way 3: a message over everything",
            "steps": [
                "Choose **A message over everything**. It is the quickest to set up, but the message shows over every screen whose Look has Messages on.",
                "Switch **Send verses** on. Under it, **ProPresenter on your network** lists every ProPresenter found; press **Connect** beside yours. Voice Verses makes the “Voice Verses” message with a lower-third theme.",
            ],
        },
        {
            "img": "pp-5-message-more",
            "caption": "Way 3: what ProPresenter shows",
            "steps": [
                "**Also on ProPresenter’s stage screens** sends a stage message as well.",
                "**Send a test verse**, then **Clear it**.",
                "**Why isn’t it on the screens?** lists what ProPresenter says (the message, its layers and the Look on each screen) and what to change.",
            ],
        },
    ],
    "points": [
        "**Which way?** Linked text if your team runs ProPresenter and wants its own looks and control. The NDI picture if you want Voice Verses’ look (and songs and slides) inside ProPresenter. The message only for a quick start.",
        "**Clear** (Esc), the **Logo**, or a song or slide going up takes Voice Verses’ verse off ProPresenter (linked text: the files are emptied).",
        "With the message: if someone presses **Hide** in ProPresenter, Voice Verses stops sending and offers **Send again**.",
        "**ProPresenter not found?** In ProPresenter: Settings → Network → Enable Network, on the same network. Or type its address (Not in the list? → Type the address yourself).",
        "The booth check checks the way you chose: the folder, the NDI picture, or the message.",
    ],
}
_drop("settings", "settings-5-propresenter")
_insert_after("screens", PROPRESENTER)

DEVICES = {
    "id": "devices",
    "title": "Other apps and devices",
    "intro": "A Stream Deck, a phone, or your church’s own apps (a dashboard, Planning Center, a captioning tool) can use Voice Verses over the church network. Each one is paired once, with a code shown on this computer, so only devices someone in the booth paired can use it. It needs the desktop app, and it works without the internet.",
    "figures": [
        {
            "img": "devices-1-on",
            "caption": "Turn it on",
            "steps": [
                "Settings → **Other apps and devices**: switch it on. Switch it off and no other app can use Voice Verses (the network screens have their own switch).",
                "**The address** other apps use. Most find Voice Verses on the network by themselves.",
                "**Control the screens**: on, the device you pair next can show verses, Take, go forward or back, Clear and show the logo. Off, it can only see what’s on and follow what happens.",
                "**Send in services**: on for an app that plans your services (the CCCG Dashboard, Planning Center, your church’s own app). It can send a whole service for any day: the order, songs with their credits, the scriptures expected and announcements.",
                "**Show a pairing code**.",
            ],
        },
        {
            "img": "devices-2-code",
            "caption": "Pair a device",
            "steps": [
                "Type these six digits in the other app. The code works once, for five minutes.",
                "**Stop** if you change your mind.",
            ],
        },
        {
            "img": "devices-3-paired",
            "caption": "What is paired",
            "steps": [
                "Each paired device, what it may do, and when it last used Voice Verses. Places it sends events to are listed under it, with **Stop sending**.",
                "**Remove** ends that device’s access at once. To pair it again, show a new code.",
            ],
        },
    ],
    "points": [
        "A remote **Take** does exactly what the Take button does. While you practise in Training, other apps can’t change the screens.",
        "A service sent in appears in **Services** on its day, marked **From** and the app’s name, and you see a message when it arrives. Sending it again updates it. Its scriptures expected are in the sermon, so detection finds them more easily, and loading them puts the first verse in Next.",
        "A service saved as a file by another app (a **service package**, .json) imports with **Services → Import**.",
        "For the people who make the apps: the page links to **the guide for developers** (the API, its events, webhooks and the service package).",
    ],
}
_insert_after("propresenter", DEVICES)

_settings = _sec("settings")["figures"]
_settings.insert([f["img"] for f in _settings].index("settings-3-listening") + 1, {
    "img": "settings-3b-engine",
    "caption": "Listening: how speech is heard",
    "steps": ["**How speech is heard**: *On this computer* (recommended: offline and private), *The browser* (the web version only) or *OpenAI* (over the internet, with your own key)."],
})
_settings.insert([f["img"] for f in _settings].index("settings-3b-engine") + 1, {
    "img": "settings-3c-ai",
    "plain": True,
    "caption": "Listening: test a recording, and the AI assistant",
    "steps": ["**Test with a recording**: choose a recorded service (MP3, M4A or WAV) and see every verse Voice Verses would have shown. **AI verse assistant** (optional): with Claude, OpenAI, Ollama or LM Studio on your own computer, or another compatible server, it also recognises verses quoted or described instead of named. Keys are kept in the computer’s own keychain, never in the web version."],
})
_settings.append({
    "img": "settings-9b-desktop",
    "caption": "Desktop app",
    "steps": ["**Desktop app** in the sidebar. **Updates** at the top: the version on this computer and whether a newer one is out. Voice Verses looks when it opens and every 4 hours; **Check now** looks at once. On Windows it downloads by itself, then **Restart to update** (or it installs when you quit). On a Mac, **Download** puts the new installer in Downloads, then **Open the installer**: quit Voice Verses, drag it to Applications and choose Replace. A new version also shows beside Desktop app in this list, with a message. Below: downloads for Mac (Apple chip or Intel) and Windows, each one installer with everything, the offline speech engine included."],
})

_planning = _sec("planning")
_planning["figures"][0] = {
    "img": "pages-1-services",
    "caption": "Services",
    "steps": [
        "The **page bar**: Live, Services, Media, Looks, Screens, Training, Settings. Pick a day in the calendar; its services show under it.",
        "**New service**.",
        "**Import** a service saved to a file (from another computer or church).",
        "**Copy for next Sunday** makes a fresh copy.",
        "**Save to a file**, to send or keep.",
        "**Present** opens it to run; **Edit** opens the editor.",
    ],
}
_planning["figures"][2] = {
    "img": "pages-3-builder",
    "caption": "The service editor",
    "steps": [
        "**Type of service** (Sunday service, Communion Sunday, Friday Night Prayers…). spirit learns each type separately.",
        "**Save as a template** keeps this service as a starting point for next time.",
        "**Present** runs it.",
        "**Save**.",
    ],
}
_planning["figures"] += [
    {
        "img": "pages-3d-add",
        "caption": "Add to a part",
        "steps": [
            "Click a part in the order, then **Add to “…”**: Scripture, Song, Announcement, Picture, Video or Blank. Drag parts and slides to reorder; each part has a timer for the timeline.",
            "**Make with AI** turns the bulletin or sermon notes into slides.",
            "**From a file** adds a presentation or the sermon notes to the section (or drop the file on a section).",
        ],
    },
    {
        "img": "pages-3f-from-file",
        "caption": "Add from a file: a presentation or the sermon notes",
        "steps": [
            "**Scriptures** written in the notes, each with its first words. They go in as scripture slides, so listening finds them more easily (a verse still goes up by itself only when it is said outright), and loading them puts the first in Next.",
            "A chapter alone (“like Noah in Genesis 6”) is often mentioned in passing, so it starts unticked. Tick it if it is read.",
            "**Points**: the headings and numbered lines. Each becomes a slide.",
            "**The rest of the notes** go to the stage monitor during the sermon, for the preacher. Never to the projector or the stream.",
            "**Add** puts them in the section as parts. Then **Save** the service.",
        ],
    },
    {
        "img": "pages-3e-ai-slides",
        "caption": "Make slides with AI (optional)",
        "steps": ["**Announcements from a bulletin** or **Sermon points from notes**: paste the words, press **Write the slides**, check them, then **Add slides to this item**. It needs an AI provider (Settings → Listening → AI verse assistant); it keeps your dates, times and places as written."],
    },
]
_planning["points"] = [
    "A part can have its own **countdown** that starts with its first slide (the Countdown before the service does this).",
    "**Remove samples** takes away the sample services and songs the app came with.",
    "**From a file**, a presentation: a **PDF** comes in as pictures, exactly as made (Keynote and Google Slides: save as PDF), or as words in your church’s look. A **PowerPoint** (.pptx) comes in as words and pictures in your look, with its speaker notes for the stage; for an exact copy, save it as PDF first. Untick any pages you don’t want. Scriptures written on the slides go in too.",
    "**Notes on the stage monitor**: a slide’s own notes, or its part’s, show on the stage monitor under the slide while it is up (the notes button on a part or slide). Never on the projector or the stream.",
]

_pages = _sec("pages")
_pages["title"] = "Media, the Screens page and Presenter"
_pages["figures"] = [
    {
        "img": "pages-4-media",
        "caption": "Media",
        "steps": [
            "**Add files**: pictures, videos, and SongSelect songs (.usr or .txt), kept with their writers, copyright and CCLI number.",
            "Show **Everything**, **Pictures**, **Videos** or **Songs**, or search by name.",
            "**Lyrics** opens a song’s words.",
        ],
    },
    {
        "img": "pages-4b-lyrics",
        "caption": "A song’s words",
        "steps": ["Start each section with its name (Verse 1, Chorus, Bridge) and leave a blank line between sections. **Save lyrics**. Songs in your library are recognised when the church sings them."],
    },
] + [f for f in _pages["figures"] if f["img"] in ("pages-6-screens", "pages-7-presenter")]

# Settings section now covers only what isn't elsewhere
_sec("settings")["intro"] = "Open Settings with the gear. Everything saves as you change it; there is no Save button to forget. Screens and ProPresenter have their own sections above."

# Section titles are numbered by build.py
for _s in SECTIONS:
    _s["title"] = re.sub(r"^\d+\.\s*", "", _s["title"])


# ---- Every feature, and where the guide teaches it (build.py checks each section exists) ----

FEATURES = [
    ("Set up your booth on a new computer; open again from Booth check", "setup"),
    ("The live screen: Live, Next, Take, Clear, Logo", "live"),
    ("When I pick a slide: Goes live / Waits in Next", "live"),
    ("Auto / Ask first", "live"),
    ("Library: Bible, songs, services; History", "live"),
    ("Several services on one day", "live"),
    ("Move on by time", "live"),
    ("The narrated demo", "demo"),
    ("Search (⌘K) for verses, songs, parts and actions", "verse"),
    ("Translation switch (KJV ▾) on the live screen", "verse"),
    ("Next and previous verse with the arrow keys", "verse"),
    ("Listening: verses said outright, read aloud, ranges, a chapter waiting for its verse", "listening"),
    ("Suggestions for quotes and stories, with how sure and why; all suggestions", "listening"),
    ("Song mode (♪ Song)", "songs"),
    ("Songs follow the singers; worship leader’s cues; new singing captured", "songs"),
    ("Slide strip, grid, double-click to show", "songs"),
    ("Quick edit during the service", "songs"),
    ("Countdowns (several, per screen, yellow and red, blink)", "countdowns"),
    ("Alerts (nursery, car, stage notes)", "countdowns"),
    ("Booth check and warnings during the service", "booth-check"),
    ("Looks: the designer (text, layers, shapes, pictures, undo)", "looks"),
    ("Backgrounds: colour, gradient, moving, picture, video; the gallery and samples", "looks"),
    ("Transitions", "looks"),
    ("Starter looks", "looks"),
    ("Which screen uses what", "looks"),
    ("Colour teams, change with the month, themes", "looks"),
    ("A slide’s own look", "looks"),
    ("Formatting single words", "looks"),
    ("Screens and outputs: each output on its display; Identify screens", "screens"),
    ("Screen shapes and ultrawide", "screens"),
    ("Screens on the network (browsers, smart TVs, OBS, vMix)", "screens"),
    ("NDI® output", "screens"),
    ("Blackmagic DeckLink SDI output", "screens"),
    ("Stage monitor layouts and settings", "screens"),
    ("Moving backgrounds on a slow computer", "looks"),
    ("ProPresenter: a slide with linked text", "propresenter"),
    ("ProPresenter: a slide with Voice Verses’ NDI picture", "propresenter"),
    ("ProPresenter: the message; stage message; Why isn’t it on the screens?", "propresenter"),
    ("ProPresenter found on the network; type the address", "propresenter"),
    ("Other apps and devices: pairing, control, the API for developers", "devices"),
    ("Services sent in by other apps, or imported as a package file", "devices"),
    ("Features and presets", "settings"),
    ("Microphone, desk channel and sound check", "settings"),
    ("Speech engines: on this computer, browser, OpenAI", "settings"),
    ("Test with a recording", "settings"),
    ("AI verse assistant (Claude, OpenAI, Ollama, LM Studio, compatible)", "settings"),
    ("Bible translations: KJV, ASV, WEB, your own; ESV, NLT, API.Bible", "settings"),
    ("CCLI licence number", "settings"),
    ("Church logo", "settings"),
    ("Library folder and backup across computers", "settings"),
    ("Desktop app downloads and updates (Check now, Restart to update, Open the installer)", "settings"),
    ("spirit: how much it does, what it does, cues, Not this, Pause, How it went", "spirit"),
    ("Moments on cue and sermon points", "spirit"),
    ("Services: calendar, new, import, save to a file, copy for next Sunday", "planning"),
    ("Service templates, ready-made orders, types of service", "planning"),
    ("The service editor: parts, slides, timers, reorder", "planning"),
    ("Make slides with AI", "planning"),
    ("Add from a file: PDF, PowerPoint, Word or text sermon notes", "planning"),
    ("Notes on the stage monitor (a slide’s or its part’s)", "planning"),
    ("Media: pictures, videos, SongSelect import, lyrics", "pages"),
    ("Presenter", "pages"),
    ("Training: Show me, Let me try, practice", "training"),
    ("What the projector, stage and stream show", "room"),
    ("Keyboard", "keyboard"),
    ("When something goes wrong", "trouble"),
]

TROUBLE = [
    (k, "Choose A slide with linked text in Settings → ProPresenter: your team then puts the verse slide up and takes it down. For now, Hide the message in ProPresenter: Voice Verses stops sending until you choose Send again.")
    if k.startswith("ProPresenter’s message") else (k, v)
    for k, v in TROUBLE
]
