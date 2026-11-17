# The user guide's words. build.py turns them into docs/user-guide/README.md and index.html.
# Each figure's numbered steps match the numbered markers in its picture (tools/guide/capture.cjs).
# Plain words, from the volunteer's side of the screen. "spirit" always has a small s.

TITLE = "Voice Verses Guide"
SUBTITLE = "How to use every part of Voice Verses, step by step. The numbers in each picture match the numbered steps under it."
VERSION = "1.19.1"

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
