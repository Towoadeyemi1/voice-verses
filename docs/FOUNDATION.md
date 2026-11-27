# The Foundation

How every app is designed, built, secured, tested, shipped and documented.

It is drawn from two products built for the same owner:
- **Provilion**: an online service run for real businesses. Seven apps, about
  300 database changes, about 60 server functions, an AI voice agent, billing,
  texting and email.
- **Voice Verses**: a desktop presentation app for churches, built over 19
  releases.

Almost every rule here exists because the bug it prevents **actually
shipped**, or because the owner asked for it. Rules that came from an
incident say what happened, so the reason outlives the person who learned it.
Examples are marked **In Provilion:** or **In Voice Verses:**. They show what a
rule looked like in practice; the rule itself applies everywhere.

It is written for two readers: the owner (what to expect and ask for) and
Claude or any other assistant (how to work). Give it to any new project as the
foundation layer. Put the project's specifics (its product, names, commands)
in that project's own `CLAUDE.md`, on top of this.

---

## Contents

0. [How to use this file](#0-how-to-use-this-file)
1. [Working with the owner](#1-working-with-the-owner)
2. [Product principles](#2-product-principles)
3. [Design](#3-design)
4. [Writing what people read](#4-writing-what-people-read)
5. [Accessibility](#5-accessibility)
6. [Architecture](#6-architecture)
7. [Security, privacy and licensing](#7-security-privacy-and-licensing)
8. [AI, voice and messaging features](#8-ai-voice-and-messaging-features)
9. [Data and schema discipline](#9-data-and-schema-discipline)
10. [Testing and verification](#10-testing-and-verification)
11. [Documentation that runs the project](#11-documentation-that-runs-the-project)
12. [Shipping and releases](#12-shipping-and-releases)
13. [Performance and reliability](#13-performance-and-reliability)
14. [Teaching people to use it](#14-teaching-people-to-use-it)
15. [Failure modes and lessons](#15-failure-modes-and-lessons)
16. [Checklists](#16-checklists)
17. [Starter kit and templates](#17-starter-kit-and-templates)
18. [Moving an existing app onto the standard platform](#18-moving-an-existing-app-onto-the-standard-platform)

---

## 0. How to use this file

### One foundation, one copy
These rules live in this file only. A project never restates them. Its own
`CLAUDE.md` says what is specific to it and imports this file. When a rule
changes, it changes here and every project picks it up. Copies that drift are
how inconsistency starts (failure mode 3).

The foundation is one folder:

| File | What |
|---|---|
| `FOUNDATION.md` | This file: every rule |
| `PREFERENCES.md` | The short version, for where only a short text fits |
| `MIGRATE-OFF-SERVER.md` | A worked example of moving an app off its own server (§18) |
| `VOICE-VERSES.md` | For the Voice Verses agent: move onto this master copy, the readability work (§5), then visible cards and every state (§3), mock-up first |
| `README.md`, `build-skill.sh`, `sync-into-project.sh` | What each file is; rebuilding the skill; copying the foundation into a project |
| `design/foundation.css` | The design kit: every colour, size and part, both themes (§3.6) |
| `design/reference.html` | Every part as it should look. Open it beside your build |
| `design/fonts/` | The two bundled fonts and their open licences |
| `design/check-contrast.cjs` | Measures every piece of text against the real pixels behind it (§5) |

### Making it the standard everywhere

| Where | How |
|---|---|
| **The whole organisation** (Claude Team or Enterprise) | An owner uploads `foundation-skill.zip` at **Organization settings → Plugins & skills → Add → Upload a skill**. It is on for every member at once, in chats and in Claude Code on the web. Members can switch it off but not delete it. (The organisation's Policy tab must allow Skills and code execution.) |
| **Just you, in claude.ai** | **claude.ai/customize/skills** (Customize → Skills) → **+** → Create skill → **Upload a skill**, with `foundation-skill.zip`. If Customize or Skills is missing, turn on **Settings → Capabilities → Code execution and file creation** first. Skills on your account also load in Claude Code on the web. **Keep exactly one skill named `foundation`**: delete any older one before uploading, or you can't tell which is in use. |
| **Every chat, briefly** | **Settings → Your Claude → Instructions**: paste `PREFERENCES.md`. It applies to every conversation. Project instructions apply only inside that project. |
| **A claude.ai Project** | Add `FOUNDATION.md` to the project's knowledge, and put "Follow FOUNDATION.md in all work" in its instructions. |
| **Every code repository** | Copy this file to `docs/FOUNDATION.md` and the kit to `docs/foundation/design/`. The repo's `CLAUDE.md` starts with the line `@docs/FOUNDATION.md` (Claude Code imports it), then only what is specific to the project (§17). Commit the skill to `.claude/skills/foundation/` too, so cloud sessions have it even without the account skill. |
| **Claude Code on your own computer** | `~/.claude/CLAUDE.md` containing `@/path/to/FOUNDATION.md`, or the skill folder in `~/.claude/skills/foundation/`. Both apply to every project on that computer, but not in cloud sessions. |

**Keeping the one copy in step:** the master lives in one repository, the
owner's private `foundation` repository (its `README.md` lists every file).
Projects copy it in with `sync-into-project.sh`, which stamps the version, and
never edit their copy. Changing a rule means changing the master, running
`build-skill.sh`, re-uploading the skill and re-syncing the projects.

**Overrides:** a project may break a rule only explicitly, by name, with the
reason written in its `DECISIONS.md`. Silence never overrides.

### Two shapes of app
Most rules apply to every app. Where the right answer depends on what the app
is, this file says which shape a rule is for:

| Shape | What it is | Example |
|---|---|---|
| **Online service** | Many people or businesses share it over the internet; data lives centrally | Provilion, Jobchuck |
| **Desktop or offline app** | One download; works without the internet; data lives on the person's machine | Voice Verses |

A project names its shape in its `CLAUDE.md`. Neither shape runs a server of
its own (§6).

### The owner's choices when the two were merged (26 Nov 2026)
- **Look:** one design kit for every new app. **Light is Provilion's bright
  look** (clean white cards with a visible brand-tinted edge on a softly tinted
  page, a vivid brand gradient for the one bold thing per screen); **dark is
  Voice Verses' warm graphite.** Each app adds its own brand colour.
- **Provilion keeps its own design, unchanged** ("Honestly for provilion I do
  not want the design we have done to change"). Its design system
  (`.claude/skills/provilion-design`) is a standing override of §3, and a test
  fails if any Provilion app loads this kit. Voice Verses keeps its own look
  too; the kit is for new apps and redesigns.
- **Mock-ups:** a mock-up and the owner's yes before building a brand-new app
  or a major redesign. Features inside an existing design are designed and
  verified by the assistant, then shown built.
- **Servers:** chosen by shape. A desktop app has no online backend at all. An
  online service uses managed services.
- **Shipping:** chosen by shape. An online service goes to staging first, then
  production on the owner's word. A desktop app goes through a code review and
  merge, and the owner publishes each release. Real users never get a change
  without the owner's go-ahead.
- **Fonts:** the app carries its own fonts; never loaded from a font CDN.
- **One skill:** one `foundation` skill replaces both earlier ones.

---

## 1. Working with the owner

The owner decides what the product is. The assistant's job is to make it
excellent and to be trustworthy about what was done. These rules sit above
every technical rule.

### Decisions and communication
1. **Plain language.** The owner is not a developer. Lead with what changes for
   them and their users. Keep file, function and event names out of messages
   unless asked. No jargon without a one-line meaning.
2. **Recommend; don't survey.** Give the best option and why, in a few lines.
   Offer alternatives only when they are genuinely close, and say what each
   costs. Use a small table when comparing.
3. **Ask only what is the owner's to decide**: taste, money, their accounts,
   their hardware, anything that reaches real people, anything irreversible.
   Decide the rest from the code, the docs and sensible defaults, and say what
   you chose. **When told "you decide", decide, say why, and proceed.**
4. **Say what was verified and what was not.** "Deployed" is not "tested".
   "Built and tested in the real app" is different from "built". Every report
   ends with what was proved, what wasn't, and what was cleaned up.
5. **Report failures plainly**, with the evidence, including your own mistakes.
   If you can't tell (from a screenshot, a log), say "I can't tell from this;
   here is how we find out". A wrong diagnosis costs more trust than an honest
   "not sure".
6. **Short status updates while working; a plain summary at the end.**
7. **Measure before answering questions about cost or speed.** **In Voice
   Verses:** asked how slow a 100 MB voice model would make the app, the answer
   was measured (600 MB of memory, half a second per second of speech), which
   led to a better design (recording the lines ahead: 0.6 MB, nothing at run
   time).
8. **Act on the owner's standing instructions** (for example "merge once CI
   passes") without asking each time, and record them.

### Requests and design feedback
9. **Record every request the moment it is made, in the owner's exact words,**
   in `docs/OWNER_REQUESTS.md`, with its status: ✅ done (with version or
   date), ⏳ planned or in progress, 💬 waiting on the owner, ⚠ can't be done
   here (and why). Read it first in every session.
10. **The owner's words are the spec.** Quote them (with the date) in code
    comments and commits where a behaviour came from a request. It stops
    "tidy-ups" from undoing deliberate decisions.
11. **Mock-up first for a brand-new app or a major redesign.** Show a realistic
    working state with real content (never lorem ipsum or an empty shell), both
    themes, phone and desktop sizes. Wait for the owner's yes. A feature inside
    an existing design is designed and verified by the assistant and shown
    built. **In Voice Verses:** three settings pages built straight into an old
    panel without a mock-up drew "I am very disappointed with the aesthetics…
    Every part of the app must have that excellence."
12. **When the owner gives design feedback,** quote it into `LESSONS.md`,
    change the design rules here if a rule changes, and (for big changes) show
    a new mock-up before rebuilding.

### Safety with real people and real money
13. **Real users get a change only on the owner's word** (§12): staging first
    for an online service; the owner publishes desktop releases.
14. **Never change a setting that affects real people without asking.** That
    includes switching off a customer's calls, giving extra quota, or editing a
    real person's record. **In Provilion:** one unasked "tidy-up" cost real
    test partners their scheduled calls.
15. **No real texts, calls or emails to real people** unless the owner approved
    that person. Test data uses fictional numbers (e.g. 555-01xx) and addresses
    that can't receive mail; email in tests is intercepted.
16. **Never delete accounts or records you did not create.** Demo resets spare
    anything that might be a real person.
17. **Clean up every fixture** (rows, files, logins, counters, notifications)
    and say so in the commit.
18. **Never print secrets** (API keys, service keys, tokens, signing secrets),
    even partially. Never disable TLS or bypass a proxy to make something work.
19. **No production DNS, billing or payment changes without the owner's go.**
20. **Never send the user's personal details to an outside service** without
    explicit permission.

### Work hygiene
21. **Commit and push each step.** The remote is the source of truth.
22. **Every commit says what changed, why, what was verified, what wasn't, what
    was cleaned up**, and the cost arithmetic if it can spend money. Never a
    model name in commits or PRs.
23. **Don't edit the repo while a long test run that copies it is running.**
24. **Schedule a follow-up for anything that has to happen later** (a re-test
    when a quota frees up, checking how a scheduled event went), rather than
    hoping to remember.

---

## 2. Product principles

### For every app
1. **One obvious way to do the main job.** A screen has one primary action;
   everything else is secondary, in a menu or in the command palette (⌘K).
   - **Prepare the next step so the only decision is yes or no.** The app
     fills "next" with its best guess; the person confirms or changes it.
2. **One source of truth for anything typed once and shown many times.**
   Prices, plan limits, trial length, setup steps, feature descriptions, which
   functions are public: each lives in exactly one file, and every surface
   reads it (through a compiled copy if needed). A test fails on a second
   copy. **In Provilion:** changing a price used to mean five copies and 18
   languages.
3. **Never be confidently wrong.** When the app acts by itself, it must be
   certain. Below certainty it *suggests*, says how sure it is in words
   ("Strong match", "Likely") and why, and lets a person decide. **In Voice
   Verses:** a verse goes on screen by itself only when said outright or
   matched at 99% or more.
4. **Every smart feature is optional.** A switch per feature and presets
   (Essentials, Recommended, Everything). New installs get the recommended
   set; features that act on their own in new ways start off. The engine gets
   plain flags and never reads settings itself (which keeps it testable).
5. **Trust is earned, per behaviour and per situation.** An automatic behaviour
   starts by preparing and waiting for a person, and is promoted to act alone
   only after a streak of being right, and only when the owner chooses. Any
   correction sends it back. One tap pauses all automation (keeping what it
   learned).
   - Learn each situation separately; habits from one context must not leak
     into another.
   - Corrections are one tap, in the user's words ("Wrong part", "Not now",
     "Never for these words"); "Just this once" undoes a one-off exactly.
   - Learn by watching first: what people do is a better label than anything
     they would have to type.
6. **When automation isn't sure, it goes to a safe neutral state and asks.** A
   schedule, a timer or a habit is not proof the next thing has started. Until
   there is evidence, show something neutral, get the next thing ready, and
   ask ("Has Prayer started?" Show it | Not yet).
7. **Things that reach the outside world are deliberate.** Sound, screens,
   messages, webhooks: never by surprise.
8. **What the app finds or imports, a person reviews before it is added.**
   Doubtful items start unticked. A tool that guesses never fills the library
   by itself.
9. **The app opens full, never blank.** First run shows a working sample
   (clearly marked, removable) and a guided setup that finds what it can and
   asks the person to confirm each thing.
10. **A safe place to learn.** A practice mode where the real screens work but
    nothing reaches the outside world. Its state is never saved, so a crash
    can't leave it on.
11. **The in-app assistant is part of the product.** A feature is not shipped
    until the assistant can explain it, in the same change. **In Provilion:**
    twice a feature went live with the assistant saying it didn't exist, and
    once coaching the exact behaviour a customer had complained about.
12. **Anything an owner has to set up is one entry in a setup registry.** The
    checklist, its order, the assistant's copy and the "is it done?" checks
    all derive from that entry.
13. **A limit shown to a user is derived from what enforces it**, never
    restated. **Hide meaningless limits:** if a limit exists only to protect
    costs and normal use never meets it, don't show a meter or sell top-ups of
    an abstract unit. When it is hit, pause only the background work with a
    calm, plain message.
14. **Two choices that look alike stay separate settings,** and **several
    equal ways to do something are shown as equal** until one is proven in the
    user's setting.
15. **Name the real thing.** Show which device "Default" is; say why a choice
    is unavailable instead of hiding it. Deep links land on the exact thing,
    scrolled into view.
16. **Required vs optional is truthful.** If an action is meaningless without a
    field, the field is required, and the app says so.
17. **The user's own content is theirs:** easy to import and export, and
    credited properly (title, authors, copyright, licence numbers).
18. **Behaviour is never words.** Use what people do (time spent, visits,
    saves) to improve what you offer them. Never tell them you watched them.

### Online service
19. **Consent and contact rules are product features:**
    - opt-outs honoured instantly ("STOP" or "don't call me" means no calls,
      not goodbye);
    - calls and texts only in the recipient's own hours and time zone;
    - consent recorded with how and when it was given.
20. **A mobile-first app still opens properly on a laptop**, and an office app
    still works on a phone.

### Desktop or offline app
21. **The core works offline.** Internet adds to the app and never holds it
    up. Bundle what the core needs (models, data, fonts).
22. **One download, nothing else to install.** Optional extras that need a
    third-party runtime say plainly where to get it.
23. **It runs on the hardware people actually have:** older machines, both
    chip types, every desktop system supported. Test on the slowest target
    that matters.
24. **No vendor lock-in.** Any provider for a service that has alternatives
    (AI, speech, sync), each optional, with a local option where one exists.
25. **The app places its outputs; nobody drags windows.** Settings assigns
    each output to a display; the app opens it there without taking focus,
    and puts it back when the display returns.

---

## 3. Design

The bar: **like an app Apple designed, and far easier than the tool it
replaces.** Colourful but meaningful. Calm, warm, clearly laid out, filling
every screen from a 390px phone to a 3440px ultrawide.

### 3.1 Apple's principles, on every screen
1. **Clarity.** Content first. Bold, tightly tracked display type for headings
   and numbers; quiet body text. One obvious focal point.
2. **Deference.** The interface serves the content: restrained chrome,
   generous space, colour as a purposeful accent.
3. **Depth.** Layering and elevation show hierarchy; motion is short, physical
   and respects reduced motion.
4. **Real information.** Cards carry real data (amounts, names, counts), never
   bare icons or filler. Marketing pages show the actual product.
5. **Precision.** One spacing scale, aligned grids, one small set of radii.
   Nothing roughly placed.
6. **Numbers are a feature.** Key figures get big, confident type.
7. **Do the proper version, not the lazy one.** Verify in a real browser
   before calling it done.

### 3.2 The look
1. **Colourful, never monochrome, never flat.** Light is bright and clean
   (Provilion's look): white cards with a visible brand-tinted edge on a page
   softly tinted with the brand, and colour in the content, the status and the
   one bold thing. Dark is warm graphite (greys with a slight warm or violet
   bias). Never a plain white page with grey hairlines; no large full-width
   white buttons. Both themes are first-class and follow the device by default
   (an app used in a dark room may default to dark).
2. **Colour always means something** and is never reused for decoration. One
   fixed map from state to colour, used everywhere. **In Voice Verses:** red is
   only ON AIR, green only NEXT.
3. **Every state shows its words too** ("ON AIR", "Needs a look", "Paid").
   Nobody needs colour vision to use the app.
4. **The brand colour is for accents, tints and the one bold thing,** never
   big solid areas beside meaning colours. **In Voice Verses:** a big gold
   button between red and green frames read as a traffic light.
5. **Ambient colour from the content.** Soft, low-opacity gradients of what is
   on screen, rather than coloured chrome.
6. **Cards never ghost.** Anything that holds content has a visible
   brand-tinted edge (1.5px) and a soft layered shadow, stronger in the dark.
   Never a faint grey hairline on near-white. **In Provilion:** faint cards
   vanished into the page on real screens. *(The owner's choice, 26 Nov 2026.)*
7. **Inside a card, structure comes from space and light:** no borders, no
   boxes inside boxes; related rows on one surface with hairlines that start
   after the icon.
8. **Glass only where content scrolls under it** (a toolbar, a command
   palette). A sticky translucent bar that ghosts content badly is made solid.
9. **One bold thing per screen.** One vivid focal block (the hero, or the
   primary button in a sheet). Lists are plain. Never say the same thing twice
   on a screen; corrections live behind "More actions".
10. **Navigation is never white-on-white or black.** The current place is
    clearly tinted; a floating phone nav gets a solid, saturated fill (the one
    place besides the focal block where colour may fill a larger area).
11. **Automation has one consistent sign.** Everything the app did or suggests
    by itself carries the same small mark, never the meaning colours.
12. **Practice looks different from the real thing:** a striped band with its
    words and a way out.

### 3.3 Less text
- **Busy screens show one line, at most about 12 words, with the rest one tap
  away** ("How it works" in a native `<details>`). A static test enforces it.
- No eyebrows, no instructions on how to use the page, no restating the
  obvious. Long running text is clamped to a line and expands when opened.

### 3.4 Layout
1. **Fill every screen.** Extra width goes to content (bigger previews, a side
   column), never to longer lines of reading text (about 65 characters for
   body, 36 for display text).
2. **The same thing stays in the same place.** Fixed regions; panels shown or
   hidden, never free-floating. The layout follows the real window by itself.
3. **Phone shells** use safe-area insets and `100dvh`; on desktop, content is
   constrained and centred.
4. **Show a picture of the real thing** at the top of a settings page when
   there is one (the connected device, the room of screens).
5. **Settings pages are documents, not dashboards:** grouped rows (icon square,
   bold title, one plain sentence, the control on the right). Two to four
   choices are a segmented control; choices that need a sentence are cards.
6. **Buttons:** quiet fill by default; a soft brand tint for a row's main
   action; solid brand only for the one confirming action in a small form.
7. **Nothing floats over a form.** A Save that must always be reachable is
   pinned at the top, plus one in the flow at the end.
8. **Text never clips.** Figures size to their tile; scroll strips fade at the
   overflowing edge.
9. **After login, land on Home.** Lists get search and paging once they grow.
10. **No native `prompt()` or `confirm()`** for anything that matters. Use
    in-app dialogs with roomy inputs. Dialogs trap focus, close with Esc and
    return focus.
11. **The header lines up with the body** (one container width for both).
12. **Previews are the real thing,** drawn by the same renderer as the output
    (§6).
13. **Every new string in every supported language** in the same change, with
    placeholders for numbers and names.

### 3.5 Design process
1. **Research first** for a new area: what the best tools do and what their
   users complain about. Write it as a table (source, finding, the rule it
   gives) in the project's `DESIGN_SYSTEM.md`.
2. **For a new app or a major redesign:** an HTML mock-up in `docs/design/`
   with real content, both themes, phone and desktop sizes. Wait for the
   owner's yes (§1.11).
3. **Build to the kit** (§3.6), then **screenshot the built thing** at 390px
   and desktop (and wide, for a desktop app), light and dark, logged in with
   real data. Look at every screenshot.
4. **Measure, don't eyeball** (§10.4).
5. Run the new-screen checklist (§16).

### 3.6 The design kit: exact values
The principles say *what*; the kit says exactly *how*:
- **`design/foundation.css`**: every token and component, both themes, plain
  CSS that works in any web app, Electron or framework. Use its `f-` classes,
  or copy the values into your own system.
- **`design/reference.html`**: every part as it should look. Open it beside
  your build, at phone and desktop width, in both themes.
- **The tables below**: for building it natively (SwiftUI, Compose, Flutter).

#### Colour
| Token | Dark ("warm graphite") | Light (Provilion's bright look) | Use |
|---|---|---|---|
| page | `#0e0d10` | `oklch(0.955 0.007 240)` plus a soft brand-tinted backdrop | Behind everything |
| sunken | `#121114` | `oklch(0.945 0.008 240)` | Sidebars, wells |
| win | `#161518` | `oklch(0.968 0.006 240)` | The window |
| surface | `#1f1d22` | white | Cards and grouped lists (white as a card with its edge, never as the page) |
| raised | `#26232a` | white | Hover, the chosen segment, floating cards |
| ink / ink-2 / ink-3 | `#f4f1f6` / `#b2abb7` / `#9d97a3` | `oklch(0.24 0.02 255)` / `oklch(0.47 0.02 255)` / `oklch(0.52 0.018 255)` | Text: main, secondary, captions. Three levels only; each passes 4.5:1 on every surface |
| line | `rgba(255,245,255,.07)` | `oklch(0.906 0.008 255)` | Hairlines inside cards |
| fill / fill-2 | `rgba(255,245,255,.05)` / `.09` | `oklch(0.42 0.03 255 / .05)` / `.08` | Quiet controls, hovers, tracks |
| edge | brand at 22% | brand mixed 18% into the line colour (in oklab) | **The visible 1.5px edge on every card** |
| glass | `rgba(30,28,34,.72)` + blur 20px | `oklch(0.985 0.005 240 / .8)` | Toolbar and command palette only |
| accent (brand) | default gold `#f0b44a`, soft at 16% | default Provilion teal `oklch(0.60 0.12 212)`, strong `oklch(0.52 0.13 214)`, soft at 12% | Selection, the app's own actions, switches when on. Each app sets its own |
| bold gradient | gold `oklch(0.82 0.14 78)` → orange `oklch(0.70 0.17 45)`, with **dark** words (`#241505`) | teal `oklch(0.55 0.14 212)` → blue `oklch(0.47 0.18 258)`, with white words | The one bold thing: the hero, the floating phone nav. From the brand, turning a little toward a neighbour (teal toward blue, amber toward orange). Its lightness is set by the words on it: white words need a gradient dark enough for 4.5:1 at its lightest point; a light gradient takes dark words |
| text tokens | `accent-text`, `warn-text`, `live-text #ff7a70`, `next-text #4cd97b` | `accent-text oklch(0.45 0.12 216)`, `warn-text oklch(0.47 0.11 60)`, `live-text oklch(0.50 0.19 26)`, `next-text oklch(0.44 0.13 146)` | Words in a colour use its `-text` token, never the fill colour: a bright fill is too light to read as text |
| live / danger | `#ff453a` | `oklch(0.58 0.19 25)` | Live, destructive, overdue; always with the word |
| next / good | `#30d158` | `oklch(0.56 0.15 145)` | Ready, done, paid; always with the word |
| warn | `#f5a524`, soft at 14% | `oklch(0.72 0.15 68)`, text `oklch(0.50 0.12 62)` | "Needs a look"; never red or green |

- In the dark, the greys lean slightly warm or violet (hue about 260–280°,
  saturation 6–14%). In the light, the neutrals are cool and nearly
  colourless (chroma about 0.01), so the saturated brand, status and bold
  gradient stand out against them.
- **The light page backdrop:** two soft radial tints of the brand at the top
  corners over the page colour, fixed while scrolling, so white cards separate
  from the page.
- **Icon squares and categories** are two-colour gradients at 135°: gold
  `#fbbf24→#d97706`, blue `#60a5fa→#2563eb`, violet `#a78bfa→#7c3aed`, teal
  `#2dd4bf→#0d9488`, indigo `#818cf8→#4f46e5`, orange `#fb923c→#ea580c`, rose
  `#fb7185→#e11d48`, green `#4ade80→#16a34a`, slate `#94a3b8→#475569`, pink
  `#f472b6→#db2777`. The automation's sign: `#f0b44a→#f472b6→#8b5cf6`.
- **Ambient light:** two large radial gradients of the content's two main
  colours behind the window, opacity 0.28 dark / 0.12 light, a 1.2 s
  transition.
- **Mixing colours:** mix in `srgb` or `oklab`, or towards `transparent` or
  the background. Never in a polar space (oklch, lch, hsl) with white or grey:
  the hue swings (amber and white became pink). Never blend two opposite
  colours halfway (that gives grey). `color-mix()` fails inside SVG data URIs
  and older Safari: compute those colours in code.

#### Type
| Role | Face | Size / weight / tracking |
|---|---|---|
| UI | **Figtree** (bundled); SF Pro in Safari on Apple devices | 14px / 1.45 body; 13.5px controls; 13px descriptions |
| Display (headings, numbers) | Figtree / SF Pro Display | 700, −0.02em: page title 22–24px, hero 30px, card title 16–20px, key figures 28–40px |
| Reading (long text, quotes, lyrics) | **Newsreader** (bundled), then New York, Iowan Old Style, Georgia | Large, line height 1.28–1.3, capped at about 30–36 characters on a main screen |
| Row title | UI | 14.5px, 600 |
| Section title | UI | 15px, 650 |
| Small label | UI | 11px, 700, uppercase, +0.08em |
| Caption | UI | 12.5–13px, ink-3 |
| Numbers | any | `font-variant-numeric: tabular-nums` for times, money and counts |
| Codes and addresses | `ui-monospace, "SF Mono", Menlo` | 13px, 600 |

- **Fonts are carried with the app**, never loaded from a font CDN: faster,
  offline, and no visitor details sent to a third party. Figtree and
  Newsreader are under the SIL Open Font License; keep their licence files
  with them.
- **Never put `-apple-system` or `BlinkMacSystemFont` first in a font stack.**
  Chrome treats both as the system font on every platform, so the bundled font
  is never used (measured on 26 Nov 2026). The kit gives SF to Safari only,
  through `@supports (font: -apple-system-body)`.
- Never below 13px for anything a person must read; 11px only for uppercase
  labels. Headings use `text-wrap: balance`.

#### Space, radius, depth, motion
- **Spacing** (px): 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 30, 40. Page
  padding 28px on desktop, 16px on a phone; section gap 30px; inside a section
  10px; a row 12 × 16px with a 14px gap; a card 16–20px.
- **Radius:** window 16, cards and lists 14 (hero and choice cards 16, dialogs
  18), previews 12–14, controls 10, segments 8, pills round.
- **Depth:** cards get the edge and a soft card shadow; what floats (dialogs,
  palettes, menus) gets the stronger float shadow. Raised buttons get an inset
  top highlight.
- **Motion:** 150 ms (hover, press), 200 ms (switches, segments), 300 ms
  (progress, crossfades), `cubic-bezier(.4, 0, .2, 1)`. Press = `scale(.985)`.
  Everything is still with reduced motion. Small thumbnails stand still; the
  main previews move. A decorative animation that never stops keeps the screen
  repainting 60 times a second: keep busy screens still.
- **Focus:** a 2px outline in the accent, 2px from the control.

#### Components (the kit has the exact CSS)
| Part | Recipe |
|---|---|
| **App shell** | A full-window grid (`100dvh`, `grid-template-columns: minmax(0, 1fr)`), ambient light behind, a 64px glass toolbar in three columns (who / one status capsule / clock and actions) |
| **Sidebar** | Sunken background; groups with small uppercase labels; 40px rows with a 28px icon square; the current page tinted with the accent, weight 650; counts as small pills |
| **Icon square** | 28px (radius 8), white 16px glyph on a gradient; 40px (radius 11) for a large one |
| **Card / panel** | Surface, radius 14, padding 16–18px, the 1.5px edge and the card shadow |
| **Grouped rows** | One card holds the rows; each row at least 60px tall: icon, bold title, one plain sentence, the control on the right. Hairlines start after the icon. On a phone a long control drops below the text. A row needing attention fades in a warn tint from the left |
| **Bold hero** | The one bold thing on a home screen: radius 24–26, the bold gradient with a white radial highlight and a translucent decorative circle, white text, up to three key figures in translucent tiles |
| **Floating phone nav** | A floating pill above the safe area, filled with the bold gradient (never white, never black), a bright hairline and a coloured shadow; the current tab a white pill with brand text; phones only |
| **Settings hero** | The top of a settings page: a picture of the real thing or a 64px gradient glyph, a 20px title, one line, the main action; a soft accent light from the top-left |
| **Key figure tile** | A card with a small label, the number in display type (tabular), one line of meaning, "How it works" behind a tap |
| **Buttons** | 36px tall, radius 10, 13.5/600. Quiet (fill-2) by default; soft (accent tint) for a row's fix; primary (solid accent) only for the one confirming action; ghost for "Not now"; link in the accent. Never a full-width white button |
| **Main action** | 56px, radius 16, 17px/600 display, its key shown. Dark: raised graphite with an inset highlight and a small icon in the meaning colour. Light: the brand gradient (accent to accent-strong) with white text and a coloured shadow |
| **Switch** | 46 × 28 track (fill-2 off, accent on), 22px white knob, 200 ms |
| **Segmented control** | A fill track with 3px padding; 32px segments; the chosen one raised |
| **Choice cards** | For choices that need a sentence: cards, radius 16; chosen = a 2px inset accent ring, a soft accent light, a tick |
| **Status** | A grey tick when fine; amber with words when it needs a look; pills (12/700) with words; a progress ring with the number inside and the strength in words beside it |
| **Live / Next monitors** | Always dark inside, in the output's real shape; Live a 2px red frame and glow, Next a 2px green frame; a label row with dot, word and detail |
| **Command palette** | Glass (blur 30px), radius 18, a 58px input at 18px, results as 12px-radius rows |
| **Dialog or guide card** | Solid raised surface, radius 18, the float shadow; a kicker pill; one line at 19/700; actions bottom right. Placed beside what it is about, never over it |
| **Practice band** | Fixed along the bottom: violet diagonal stripes with white words and a way out; red stripes when it does touch the real world |
| **Loading** | A skeleton in the shape of what is coming (`aria-busy` plus a hidden "Loading…"), never a lone spinner on a whole page; the shimmer stops with reduced motion |
| **Empty** | What will be here, in one line, and the one action that fills it ("No clients yet", Add a client) |
| **A problem** | What went wrong in plain words, what to do, and a button that does it ("Couldn't load your clients", Try again); amber when it needs a look, red when something failed |
| **A field that's wrong** | The label always shown; the error in words under the field, linked with `aria-describedby`, and a red ring, never colour alone |
| **Long content** | Names on one line with an ellipsis and the whole text in `title`; descriptions at most two lines; long words break |
| **Many rows** | Search above, "1–50 of 212" and Previous / Next below |
| **Done, with a way back** | A short dark note that says what happened, with Undo |
| **Automation's sign** | An 18px orb in the automation gradient that breathes slowly; still with reduced motion and on busy live screens |

#### Putting it into an app
- **Plain CSS or any framework:** include `foundation.css` (with `fonts/`
  beside it), wrap the app in `class="f-root"` (and `f-app` for a full-window
  app), and set `--f-accent`, `--f-accent-ink`, `--f-accent-soft` and
  `--f-edge` to the brand. The theme follows the device; `data-theme="light"`
  or `"dark"` on `<html>` forces one.
- **Tailwind + shadcn/ui:** map shadcn's variables to these: `--background` =
  win, `--card` = surface, `--popover` = raised, `--muted` = fill, `--border` =
  edge for cards and line elsewhere, `--primary` = accent, `--ring` = accent.
  **Keep shadcn's `--accent` as a quiet hover surface, not the brand:** setting
  it to the brand turned every menu item yellow. Add live, next and warn as
  extra colours. Scope overrides so older parts don't leak into new ones.
- **Native:** use the tables above as the theme, with the bundled fonts.
- **Check it:** open `reference.html` beside your screen in both themes, at
  390px and desktop width.

### 3.7 CSS footguns (each one shipped)
- **Never `align-items: center` with `overflow: hidden` on a full-height
  box.** A form taller than the window becomes unreachable. **In Provilion:**
  a sign-up nobody with a short screen could finish, in three apps.
- **Grids need `minmax(0, 1fr)` and `min-width: 0` on text children,** and a
  horizontal scroll strip inside flex needs `min-width: 0` on it and every
  flex ancestor, or long content widens the page and clips both sides.
- **Tailwind v4: un-layered classes beat utilities.** A `.container { padding:
  0 24px }` shorthand silently zeroes every `py-*`. Use longhands.
- **Name classes specifically.** A class shared by layout and content (`.now`
  for a pane and a timeline segment) silently breaks layout. Exclude overlay
  layers from blanket rules like `.app > * { position: relative }`.
- **Anchored sections need `scroll-margin-top`** under a sticky header.
- **A selected style must win over a "today" style**, or the date disappears.
- **Light up a control after a smooth scroll only once the scroll ends**, then
  follow the element as it moves.
- **Fitting text:** compare `offsetHeight <= clientHeight + 1`, not
  `scrollHeight` (glyph overhang).
- **A dissolve between two opaque layers at 50% lets black through:** hold the
  leaving layer at full opacity under the new one.
- **`useEffect(() => el.scrollIntoView())` returned a value as the cleanup and
  crashed:** always use braces in effects.

---

## 4. Writing what people read

Write from the user's side of the screen. The people using it may be busy,
under time pressure, and new to it.

1. **Plain words, active voice, short sentences.** "Take puts it on every
   screen", not "Content will be transmitted to all configured outputs".
2. **Say exactly what a control does.** A button's label is a verb phrase of
   what happens: "Choose where it goes", "Call now", "Show me the fix".
3. **No jargon:** no "IPC", "payload", "sync conflict", "tenant". Name things
   by what people recognise.
4. **Errors are human sentences that say what to do,** without apology, then a
   button that fixes it. Map raw database or network errors to plain words;
   pass already-human messages through; never show table names, constraints
   or stack traces.
5. **Numbers that sound like probabilities must be probabilities.** **In Voice
   Verses:** "30% sure" measured how much wording was heard, not how sure the
   app was; it now says the strength in words and why.
6. **Explain a rule by how it protects the user,** not how it restricts them.
7. **Spoken text uses full stops and commas only** (colons, dashes and
   brackets muddle a synthetic voice). **Texts use plain characters only:** one
   long dash can triple an SMS's billable parts.

---

## 5. Accessibility

1. Hit targets at least 36px tall (44px for the main touch targets on a
   phone).
2. Text a person must read never below 13px; body 14px; small uppercase labels
   with letter spacing.
3. Never colour alone: every state has words.
4. The main actions have keys (Space = the primary action, Esc = back or
   clear, ⌘K = search everything, arrows = previous and next). Keys never fire
   while typing in a field.
5. Focus is always visible. Dialogs trap focus, close with Esc and return
   focus.
6. Reduced motion is respected everywhere; nothing important depends on
   animation.
7. Sound never plays without the person choosing it, and words always appear
   alongside anything spoken.
8. **Every piece of text meets 4.5:1 contrast (3:1 for large text: 24px, or
   18.66px bold), measured on the rendered pixels behind it, in both themes,
   at phone and desktop width.** `design/check-contrast.cjs` does this for any
   page; the kit's reference page passes every piece of text. Measuring the
   tokens is not enough: gradients, tints and translucent layers change what
   is behind the words. **Measured 26 Nov 2026:** white on the dark hero's gold
   measured 1.9:1, white labels on the light hero's teal 2.8:1, and grey
   captions 3.1–3.6:1 in all three designs, though every token looked fine.
   Disabled controls are exempt, but past or secondary information is not.

---
## 6. Architecture

### 6.1 For every app
- **No server of our own to patch, back up, monitor or upgrade.** A
  self-hosted box (a VPS with Coolify, Docker or Traefik) is never the
  default, whatever the old habit. What replaces it depends on the shape
  (§6.2, §6.3).
- **One app of separate modules, not microservices.** Each part has narrow
  edges and talks to the others through one place (an event bus for a
  desktop app; the database, its policies and named functions for an online
  service). Adding a feature, connector or importer means registering one more
  module; nothing else changes.
- **Engines take plain inputs and flags** and never read settings, the DOM or
  the database themselves. That keeps them pure, fast and testable.
- **Registries are data.** Plans, setup steps, feature descriptions and public
  functions are each one file, compiled for other runtimes if needed, with a
  test that fails when the compiled copy drifts.
- **One renderer for every view of the same thing.** The output, its
  previews, thumbnails and any viewer draw through one renderer in the
  output's real shape, so what the operator sees is what the audience sees.
- **One validated document per exchange format** (a schema, e.g. with zod),
  used by the API, by import and by the app itself.
- **Decisions are written down** (§11): context, decision, why.
- **Cost is architecture.** Anything that spends money per use (AI calls,
  AI minutes, texts) has a per-customer daily budget, a platform-wide ceiling,
  counters that fail closed, and the arithmetic in the commit.

### 6.2 Online service: the standard platform
| Layer | Choice | Why |
|---|---|---|
| Database, logins, files | Managed Postgres with row-level security (Supabase) | One database; each business isolated by `tenant_id`, enforced where the data lives |
| Privileged logic | Serverless Edge Functions | Secrets stay on the server; the service role is used only here |
| Front ends | React + Vite, one app per audience | Each audience (owner, worker, customer, guest link, marketing, operator) gets an app built for it |
| Hosting | Static hosting with a CDN (Cloudflare Pages) | Cheap, fast, automatic TLS, branded subdomains |
| Payments | Stripe Checkout and webhooks | Card handling stays with Stripe |
| Texting, email, voice | Twilio, Resend (or the user's connected Gmail/Outlook), a voice-agent platform | Deliverability; the user's own address |

What a server usually holds, and where it goes instead:

| A server usually holds | On the standard platform |
|---|---|
| Deploy tool, reverse proxy, TLS (Coolify, Traefik, Nginx) | GitHub and deploy scripts with `--env`; Cloudflare Pages |
| Web front-end container | Static React + Vite on Cloudflare Pages |
| API container | Postgres with RLS and its automatic REST API for reads and writes; Edge Functions for privileged logic |
| Postgres / PostGIS container | Managed Postgres with the extensions enabled |
| Redis | Logins by the auth service; rate limits by counter rows; queues by a jobs table worked by `pg_cron`; caching rarely needed (serverless Redis only if truly needed) |
| Cron and workers | `pg_cron` calling an Edge Function with a cron secret |
| Object storage | Supabase Storage with policies, or Cloudflare R2 |
| Workflow tool (n8n etc.) | Edge Functions (one less public login page on the internet) |

**A server is right only for what serverless can't do:** a process longer
than the function time limit, a persistent socket server you write yourself,
heavy CPU, or a binary that must run. Even then, run only that piece in a
small managed container (e.g. Fly.io or Cloud Run), with the reason written
down. Never the whole app.

**The standard layout:**
| Path | What |
|---|---|
| `packages/<app>/` | One front end per audience |
| `packages/shared/` | The single sources: plans and prices, public functions, setup registry, assistant knowledge, migration ledger, audit ledger |
| `supabase/functions/<name>/` and `_shared/` | Edge Functions and their shared code |
| `sql/NNN-name.sql` | Numbered, append-only migrations |
| `tests/ui/` | Static checks, screen suites, the mutation suite (`guards-bite`) |
| `tests/api/` | Live suites: policies, isolation matrix, offboarding |
| `packages/scripts/` | Deploy scripts (functions, apps, migrations), each refusing to run without `--env` |
| `docs/` | `FOUNDATION.md` (a copy, never edited), the project's records (§11), the deploy runbook, costs, releases |

**Structural rules:**
- **Shared by row, not by deployment.** Every customer table has `tenant_id`,
  and RLS decides who sees it.
- **Two full environments, staging and production.** Deploy scripts refuse to
  run without `--env staging|production`. An app is deployed only if its build
  talks to that environment's database (checked by a test). Never deploy with
  a raw platform command.
- **Build-time variables are baked in.** A front-end build without its public
  variables makes a bundle that throws before rendering: a blank page, not a
  build error. Guard it with a pre-build check.
- **Shared server code lives in `_shared/`.** When it changes, find and
  redeploy every function that imports it (a script that walks the imports).
- **Caching:** the HTML shell, service worker and manifest `no-cache`;
  content-hashed assets `max-age=31536000, immutable`; a missing asset must
  404, never fall through to the app shell with a 200. Check that the host
  actually honours each rule.
- **Service worker:** HTML network-first, hashed assets cache-first. Bump the
  cache name when the strategy changes.

### 6.3 Desktop or offline app
- **One app, one download, working offline.** Separate processes and services
  mean more to install, start, update and fail, especially on older machines.
- **Modules on an event bus.** A module advertises what it does and the events
  it sends in a manifest kept by a module registry, and subscribes through one
  bus. A publisher never knows who listens.
- **Event rules:**
  - envelopes are CloudEvents 1.0; types are versioned
    (`org.<app>.<name>.v1`); a breaking change gets a new name beside the old
    one; an optional field isn't breaking;
  - **publish where the thing happens, once**, so every caller is covered
    without remembering;
  - a subscriber that throws never stops the publisher or other subscribers;
  - other windows receive events through a `BroadcastChannel`; a module that
    acts on the outside world acts only in the window that published;
  - **never secrets, sound or pictures in an event**, plain values only;
  - events made in practice mode are marked and reach only subscribers that
    ask; anything acting on the outside world never asks.
- **Heavy work runs off the UI thread** (a worker or utility process).
- **A local API, off by default:** pairing with a short one-time code (single
  use, short expiry, few tries) giving each device its own random key, stored
  only as a hash and shown once; scoped keys (`read`, `control`, `write`);
  events over Server-Sent Events, WebSocket and HMAC-signed webhooks;
  described in OpenAPI and AsyncAPI; discoverable by mDNS.
- **No backend at all.** Keys live on the user's machine; shared data is a
  folder of JSON files (one per item, tombstones for deletes, conflicts
  resolved by content, not timestamps) that any cloud drive syncs. Never
  depend on a token server or a hosted function you might stop paying for.
  **In Voice Verses:** the first version called an AI through a hosted token
  server; when it was shut down, the app broke.
- **State:** settings every window must see live in shared storage with change
  events (plus a `BroadcastChannel`, since storage events don't fire in the
  window that made the change); large data in IndexedDB; never parse large
  saved state in a render; batch writes. A state that must never survive a
  crash (practice mode) is never saved. Anything copied from a template gets
  new ids.

---

## 7. Security, privacy and licensing

**Security is enforced where the data is, not in the screen.** A check in the
UI is a hint. Ask of every gate: *what happens if someone skips the UI and
calls it directly with a valid login?*

### 7.1 For every app
- **Secrets never ship in anything sent to a browser** and never appear in
  logs, events, analytics or error reports. Grep the built bundle for keys. If
  a key ever appears on screen, rotate it.
- **A key is attached only for its own host,** by trusted code (a server
  function, or the desktop app's main process), never by the page.
- **Never trust client-supplied amounts, ids or enums.** Derive, validate and
  clamp.
- **Webhooks and callbacks** are verified by a secret or HMAC signature
  compared in constant time, and **fail closed** when the secret is unset.
- **Rate limits and caps fail closed** (an error counts as over the limit).
- **Sanitise everything that reaches a prompt, a message or a page:** strip
  control and bidi characters, strip links where links aren't expected, clip
  lengths, escape tag delimiters.
- **Anything that decides who sees or does what is attacked before it is
  trusted** (§7.2's ledger for an online service; a red-team pass for any
  app). **Red team finds; blue team proves and fixes.** A finding is resolved
  only when the exact hostile repro is shown to fail. **Enumerate the class,
  not the instance:** when you find one hole, find every member of its class.
- **Severity:** Critical (another customer's data, login bypass, secret
  exposure, money) and High block release; Medium and Low are fixed or
  accepted with a written reason.

### 7.2 Online service
**Customer isolation**
- **Every table gets RLS the moment it is created**, with the full policy set:
  tenant isolation; staff-only or customer-reachable; a hard block for roles
  that must never touch it; permission gates for writes and sensitive reads.
- **RLS on with no policy** is the safest state for platform-only tables
  (tokens, PIN hashes, call sessions). Revoke grants from client roles too.
- **Confidential data gets its own office-only table,** never extra columns on
  a table customers or workers can read.
- **Upsert conflict targets are tenant-scoped,** or the id is validated as the
  caller's before writing.
- **Prove isolation for the whole estate, not the table you touched.** An
  isolation matrix forges a real row into every RLS table and asks five real
  sessions to read it (this business's office, its workers, its customers,
  another business, a stranger), checks two users inside one business see only
  their own, reports BLOCKED / EXPOSED / UNPROVEN with the unproven count (a
  zero from an empty table is not evidence), and classifies every allowlisted
  table, so "add it to the allowlist" can't be how findings disappear.
- **Never judge coverage by reading policies.** Ask the database what happens.

**RLS is one boundary, not the boundary**
- **A SECURITY DEFINER function bypasses every policy.** A session-level gate
  (e.g. "this person was offboarded") belongs in ONE named predicate every
  such function calls, and a query over the function catalogue proves it.
  Exemptions are listed with reasons. **In Provilion:** a fix shut a removed
  worker out of every table and left a definer function open, so they could
  read nothing and still push jobs back into the pool.
- **Every RLS table carries the offboarding guard** (a restrictive policy),
  so a test can prove it everywhere.

**A genuine login is not a permitted caller**
- A token signed by your auth server proves who someone is, not that they may
  call this function. Customer and worker tokens are genuine too.
- **Every login-required function calls one gate first,** before reading the
  request. It refuses customer and worker tokens and removed members, and
  checks the named permission (the service role bypasses RLS, so policies
  never reach server functions).
- **Take the business, the person and their role from the verified token,
  never from the request body.** Scope every service-role query by
  `tenant_id`; another business's id must match zero rows.
- **Which functions are public is declared in one file.** It drives the
  deploy flag and the audit gate, and a live test holds production to it.
  **In Provilion:** a function written public and deployed private silently
  dropped owner alerts for two months.
- **CORS preflight must allow every header the client library sends**, or the
  browser silently refuses the call while curl works.

**Audit columns are not fields**
- If a trigger exists to **record** something (who accepted, when), no client
  may write that column: reject the write, don't ignore it. Never let the
  guard read a client-supplied value of the column it protects. **In
  Provilion:** a worker made a job say "the office accepted it", backdated
  seven years, because the trigger only stamped an empty value.

**Identity beyond passwords**
- **Caller ID and an email's "from" are claims, not identity.** A phone number
  opens nothing by itself: add a second factor (a 6-digit PIN checked by the
  server, easy ones refused), limit tries per call, lock after N wrong a day,
  unlock only by the owner in the app, and notify the office.
- **OAuth connections:** a signed, expiring, single-use state; the callback
  only parks the result under a fresh code that goes only to the browser that
  signed in; the same signed-in user confirms it in the app; tokens sealed
  with AES-GCM using the member id as associated data; the narrowest scopes,
  recording what was **granted**; a connection is marked lost only when the
  provider says access is gone; never revoke when the same account reconnects
  (revoking a Google token cancels the whole grant).
- **Deactivating a member deletes their tokens, PINs and open sessions in the
  same statement** (a trigger).

**The audit ledger:** a migration touching a policy, trigger, SECURITY DEFINER
or grant fails the build until the ledger records a pass covering it, listing
what was actually tried.

### 7.3 Desktop or offline app
- **Keys in the operating system's secure storage** (Electron `safeStorage`,
  Keychain, Credential Manager), added to requests only in the trusted process
  and only for that provider's host. A web build uses no keys, or asks for the
  user's own at run time and keeps it only in memory.
- **Electron hardening:** `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false`, `webSecurity: true`; a preload bridge exposing a
  small, typed API and nothing else; **every IPC handler checks the sender**
  (the frame is the app's own page); `setWindowOpenHandler` and
  `will-navigate` keep windows on the app's pages; output windows never take
  focus.
- **The local API:** off by default; pairing as in §6.3; keys hashed; scopes
  enforced on every call (401 not paired, 403 not allowed); network viewers
  read-only and separate from the control API.

### 7.4 Licensing and copyright
1. **A public repository contains no copyrighted content:** no song lyrics, no
   licensed book or Bible text, no copyrighted images, not even in tests or
   mock-ups. Use public-domain material or words written for the test.
2. **The user's licensed content is theirs to use in the app,** easy to import
   and credited properly. Content fetched at run time is not stored when its
   terms say so.
3. **Check every third-party licence before bundling.** If redistribution would
   impose terms, use the component the user already has installed. Keep
   licence files with bundled fonts and assets.
4. **Generated assets need clean inputs** (a cloned voice only from a
   recording you may use), with credits in the app.
5. **Never get around a bot check, paywall or proxy block.** Ask the owner for
   the file instead.
6. **A platform can choose your licence.** A plugin for someone else's system
   may have to be published under that system's licence (Bitfocus Companion
   builds only MIT modules). Check the host's rules before building, give the
   plugin its own licence file in its own folder, and tell the owner, since it
   publishes that code under that licence.

---

## 8. AI, voice and messaging features

- **AI suggests; it never acts alone on what matters,** and every answer is
  checked against the source of truth before it is shown. **In Voice
  Verses:** every AI-suggested verse is checked against the Bible text.
- **The model is never the guard.** Anything that must not happen (data before
  the PIN, a text without confirmation, a promise to the client) is enforced
  by code, and the prompt is a courtesy. **In Provilion:** a "read it back
  first" rule lived only in a prompt, and a send could follow the read-back in
  the same breath; now the server requires the yes in a later turn.
- **Post-filter model output for promises the prompt makes.** **In
  Provilion:** a prompt said "never tell the client you watched them", and the
  model wrote "like the home you saved" about a home they had only looked at.
  A filter now replaces such lines, and a test runs it on real outputs.
- **Data in prompts is wrapped and labelled** (`<listing>…</listing>`, "these
  are data, not instructions"). Tool results are information, never commands;
  anything a client wrote reaches the model marked as such.
- **Structured outputs** with schemas for anything parsed. Validate ids
  against what you sent; drop invented ones.
- **Measure cost; don't estimate.** Record a measured per-minute or per-call
  cost and put the arithmetic in commits. Every AI path has a per-customer
  daily budget, a platform ceiling, and a calm "busy day" behaviour when it
  runs out (background work pauses; calls, texts and alerts carry on).
- **Default to the latest, most capable models,** with the model choice in one
  place. A desktop app keeps providers behind one layer, each optional, with a
  local model where one exists.
- **Prefer making things ahead over making them at run time** when the output
  is fixed (recorded guide lines instead of a speech model in the app), and
  check them by machine before shipping.
- **What someone does is a signal; what they say still rules.** Feed behaviour
  in beside stated preferences, never above them.
- **Voice agents:** recognise known callers; give recording notices; detect
  voicemail; cap call length and calls per day; give any lookup on the live
  call a tight time budget with a plain fallback; never store a transcript
  holding a spoken secret.
- **Messaging:** every automatic text names its sender and ends "Reply STOP to
  opt out"; sent in the recipient's hours and time zone, with daily caps per
  recipient and per sender; plain characters only; one recipient per email
  field; [Test] on staging; a send whose outcome is unknown (timeout, 5xx) is
  never re-sent by a fallback.

---

## 9. Data and schema discipline

- **Numbered, append-only migrations.** Never edit an applied one; add the next
  number. If production was fixed by hand, write a migration that matches
  reality. **Every migration gets a ledger line** saying whether an owner would
  notice it; a test fails until it exists.
- **Adding an enum value? Update its CHECK constraint in the same migration.**
  **In Provilion:** new kinds the code sent but the database rejected made
  every request fail the moment a feature switched on.
- **Bound numbers with CHECK.** New columns are `ADD COLUMN IF NOT EXISTS`,
  nullable or defaulted, safe on a live table.
- **Dry-run every migration in a transaction that rolls back,** ending with
  assertions about its own result, then apply it and verify it (query the
  catalogue). A structural backfill is not a business edit: disable user
  triggers around it, inside the transaction.
- **A dry-run that creates a function hasn't tested it.** Call it in the same
  rolled-back transaction with data that makes it return a row.
- **A backfill is for the past.** If new rows need the same thing, use a
  trigger on the parent. New customers are seeded with what the schema
  assumes.
- **Erasure must reach every table** (list them from the catalogue, not from
  memory).
- **Every sensitive or reversible change writes an append-only audit log:**
  who, when, what, why.
- **Money:** reports show money out as well as money in; figures are computed,
  not stored, so they reconcile; every number drills down to its rows; a
  dispute freezes both the invoice and the related payout.
- **A query ordering by a column that doesn't exist** returns nothing, and the
  feature looks empty. Run the real query.
- **Desktop data:** load large saved state once; never in a render or hot path.
  A device that comes back with a new id is found again by its saved name.

---

## 10. Testing and verification

### 10.1 The definition of done
A change is done when it has been **seen working in the real app**, not when
it compiles or reads correctly.

- **Test the path; don't read it.** Bugs survive review and die the moment
  something runs them end to end. Reading code finds what you expected to
  find.
- **Drive the real app the way a person does:** click, type, press Return. For
  a desktop app: Playwright with Electron (under Xvfb on Linux). Don't poke
  internal state to set up what you then claim to test.
- **A fixture is not the product.** Stubbed suites prove screens; API suites
  prove policies; neither proves the app. A refused query comes back as an
  empty result, so a broken page and an empty page look identical. Keep at
  least one sweep that opens every page of every app against the real
  (staging) system with real logins, intercepts nothing, and fails on any
  refused request, any console error, and any page that made no request.
- **Fake the hardware, don't skip it:** a pretend second display, a fake
  microphone playing a recording, a mock AI server, in a shared test library.
- **"It rendered" is not "it worked".** A page that exists to show data must
  name that data in its assertion. **In Provilion:** a sweep reported 38
  healthy pages with one of them showing "Link not valid".
- **Test the rules, not only the happy path:** the safety rule (nothing plays
  before permission; nothing reaches the room in practice; nothing acts below
  certainty), leaving early, and failure (unplugged, offline, no permission).

### 10.2 Every test can fail
- **A guard nobody has watched fail is a comment.** Every guard gets an entry
  in a mutation suite (`guards-bite`) that breaks the guarded thing on a copy
  of the repo and fails if the guard doesn't notice. Prove each entry bites
  before committing. A suite too expensive to mutate carries canaries that
  fail it on every run, and says where.
- **Positive controls.** Assert what should succeed beside what should fail.
  **In Provilion:** a "can't edit another branch" test passed because the
  fixture could edit nothing at all.
- **Scope each assertion to the element under test** (the dialog, not the page
  behind it), and assert the element exists at all.
- **Selectors use exact roles and names, scoped.** A second "Start listening"
  button broke tests that clicked by name.
- **Write the domain cases before changing an engine:** the new behaviour and
  its nearest neighbours that it could break. Evaluate engines on real data and
  keep the numbers in a doc.

### 10.3 Habits
- **Run every test before calling it done, not just the new one.** Other tests
  catch side effects.
- **A failing test is a bug to trace, not background noise.** **In Voice
  Verses:** two checks called "pre-existing" for weeks were a real bug.
- **A CI failure gets one re-run only if it died before any test ran.**
  Otherwise find the root cause; "flaky" is not a cause. Never skip, disable or
  quarantine a test to get green.
- **Measure before guessing.** When something gets slower, run the same input
  through the old and new builds; change one thing at a time.
- **When a runtime error names a component, that is a hypothesis.** Add a
  self-test mode that says which step fails before rewriting anything.
- **When the platform hides the real path** (a webhook secret you don't hold),
  run the real server code locally against the real staging database, with
  fixtures you clean up.
- **Compare what is deployed with what is written:** config (public or
  private, secrets present, schedules) checked against the source by a test
  that talks to the live platform.
- **After any scripted edit, check `git diff --stat`.** A script once
  truncated a file. Run the checks again after every merge from `main`.
- **Check machine-made assets by machine.** **In Voice Verses:** every
  recorded guide line was checked word for word by the app's own speech
  recognition.

### 10.4 Screens
- **Measure, don't eyeball:** gaps with `getBoundingClientRect()`, rendered
  colours read from the screen (not the variables), widths against the
  viewport (no horizontal page scroll), which fonts actually loaded.
- **Screenshot at the user's device size** (a 390px phone) **and desktop** (and
  wide, for a desktop app), **in light and dark, logged in with real data.**
  Look at every screenshot, the whole of it, before diagnosing.
- **Fail on console errors**, except a deliberately expected one, named.

### 10.5 Layers to keep
| Layer | Speed | What it proves |
|---|---|---|
| Static source checks | milliseconds | Single sources, gates present, ledgers complete, wording rules, registries in sync |
| Domain and engine checks | seconds | Engines, parsers and contracts against a corpus of cases |
| Mutation suite (`guards-bite`) | minutes | Every guard fails when its rule is broken |
| Isolation matrix (online) | minutes, live | No table exposed to the wrong session, across the whole estate |
| API suites (online) | minutes, live, safe on production | Policies; public functions stop at their gate; transactions roll back; no test rows left |
| Screen suites | minutes | Every route renders; layout and dialog geometry measured |
| Live sweeps / end-to-end | minutes, real system | Every page of every app, nothing stubbed, data named; a multi-party flow start to finish |

---
## 11. Documentation that runs the project

The docs are the project's memory. Anyone (a person or an assistant) must be
able to rebuild the app from them without repeating a mistake. Write them in
the same plain style as the app.

| File | Holds | Updated |
|---|---|---|
| `CLAUDE.md` | `@docs/FOUNDATION.md`, then: the product, who uses it, its shape, where the single sources live, commands, overrides, open work | Every change (the open work) |
| `docs/OWNER_REQUESTS.md` | Every request in the owner's words, with status and version | The moment a request is made, and when it ships |
| `docs/PRODUCT_SPEC.md` | What the app does: every feature, number, threshold, saved key and file name. The source of truth to rebuild it | Every behaviour change |
| `docs/DECISIONS.md` | Context → Decision → Why, numbered; overrides of this foundation | Every significant choice |
| `docs/LESSONS.md` | Mistakes made and how they were fixed, by area; the owner's design feedback quoted. Checked before debugging | Every bug found and every owner correction |
| `docs/DESIGN_SYSTEM.md` | The brand on top of the kit, research, approved mock-ups and the parts that implement them | Every design approval |
| `docs/ROADMAP.md` and `docs/REBUILD.md` | What is missing and the order to build it; how to build it from nothing, with a check after each stage | When priorities or stages change |
| `docs/design/` | Approved mock-ups (HTML), kept as the record | Each approval |
| `docs/user-guide/` | How to use every feature, with numbered screenshots taken by a script from the real app, and a features list so nothing is undocumented | When the screens change |
| Online service: ledgers in `packages/shared/` | Migration ledger, audit ledger, setup registry, assistant knowledge | In the same change as the code |
| Online service: `docs/deploy-runbook.md`, `docs/infrastructure.md`, `docs/releases.md` | How to deploy; what it costs and why; every release with the owner's words | When they change |
| `.claude/skills/*` | Procedures: shipping a change, testing end to end, design review | When a procedure changes |

- **The spec holds every number** (thresholds, sizes, timings, keys), tuned
  against real use; a rebuild copies them exactly.
- **A field the UI can fill isn't a feature until something shows it.** Trace
  every saved field to where it is used.

---

## 12. Shipping and releases

### 12.1 Every change, whatever the shape
1. **Read first:** the owner's requests, the spec, the lessons and, for any
   screen, the design system.
2. **Build it focused.** No unasked-for refactors in the same change.
3. **Ship it complete, in one change:**
   - the code;
   - tests that **run** the new behaviour, and guards with proven bite entries;
   - the migration and its ledger line, plus an audit entry if it touches
     policies, triggers, SECURITY DEFINER or grants (online service);
   - the in-app assistant's knowledge, and the setup registry entry if the
     owner has to set something up;
   - every new string in every language;
   - the docs (§11): spec, decisions, lessons, requests, user guide, open work.
4. **Run every check,** not just the new one; look at the screenshots.
5. **Commit** (template in §17) and **push** with retries on network errors.
   **Never force-push;** if history must change, make a new branch.
6. **Tell the owner** in plain words what changed and what they need to do.

### 12.2 Online service: staging, then production on the owner's word
- Every change goes to staging first: a full second copy with its own
  database, functions and apps, payments in test mode, no real texting number,
  and real email marked [Test].
- The owner tries it. Only then does it go to production, and the deploy
  records the owner's go-ahead in their own words (`docs/releases.md`).
- After deploying: every domain serves its page, a missing asset 404s, the
  live sweeps pass, and the API suite passes against production (it only rolls
  back and stops at gates).
- No pull request unless the owner asks; work on the agreed branch.

### 12.3 Desktop app: review, merge, the owner publishes
- Branch from the latest `main` (`feature/<name>` or `fix/<name>`); if the
  branch's PR already merged, start it again from `main`. Build from `main`
  before opening a PR.
- **Bump the version** per shipped change (patch; minor for a big redesign or
  new area).
- **Open a PR** with "What" (behaviour, in bullets) and "Testing" (what was run
  and seen, including the screenshots checked). Wait for CI, fix failures at
  the root, then merge with a merge commit when the owner has asked for
  finished work to be merged.
- **The owner publishes releases.** A release is a lowercase `vX.Y.Z` tag on
  `main`; CI builds every installer with everything bundled. Check the asset
  names after each release. Pin CI images by name (`macos-15`, not
  `macos-latest`).
- **Updates people can see:** check at start and on a timer, a visible place
  with **Check now**, and the right next step for each platform.
- Sign and notarise installers once the owner has the accounts; until then,
  say plainly what unsigned means for users.

### 12.4 The phases of a new app, each with a gate
0. **Platforms:** every credential proved to work before code. *Gate:*
   connectivity checks green.
1. **Spec:** who uses it, the shape, entities and fields (the field names ARE
   the schema), screens, roles, integrations, brand. *Gate:* confirmed by the
   owner.
2. **Mock-up** of the main screens (§1.11). *Gate:* the owner's yes.
3. **Backend or core:** for an online service, schema, full RLS, Edge
   Functions, seed data; for a desktop app, the core modules and engines.
   *Gate:* isolation proved (online) or the domain checks green (desktop); the
   critical path proved with a real request.
4. **Front ends** built to the kit. *Gate:* verified in a real browser at
   phone and desktop size, light and dark.
5. **Integrations:** voice, billing, messaging. *Gate:* a test call, a test
   card, webhooks returning 200.
6. **Verify, red/blue, release** (§12.2 or §12.3). *Gate:* no open Critical
   or High; every live URL or installer serves the right app.

---

## 13. Performance and reliability

1. **The hot path stays light.** Never redraw per audio frame (throttle meters
   to about 15 a second); memoise derived values; never parse or save large
   state in a render; batch writes.
2. **Older hardware is the target.** Measure on it, or on a slow profile.
3. **Heavy work runs in a worker,** started on demand; if it dies, say so
   plainly and let the next start make a fresh one.
4. **Real-time engines are lag-aware:** skip stale partial results; adapt the
   interval to how long each takes.
5. **Background windows keep working** where the app is real-time: turn off
   background throttling and keep the system awake while working.
6. **Recover by itself:** a screen unplugged and plugged back returns to its
   output; a device back with a new id is found by its saved name.
7. **Two things driving one output notice each other:** before resending,
   check that what you sent is still showing; if someone else took it down,
   stop and offer to send again.
8. **Read other apps' APIs by what they contain, not by one version's shape.**
   A new version turned a list into an object and broke a feature.
9. **Any lookup on a live call or a page load has a time budget** and a plain
   fallback.

---

## 14. Teaching people to use it

1. **A guide inside the app:** a pointer that glides to the real control, a
   spotlight on it, one short line on a card beside it (never over it), with
   "Why?" for the reason. **Show me** does each step; **Let me try** waits and
   checks what the app really did. A wrong click is named kindly.
2. **Lessons run in practice mode,** each with its own automatic test.
3. **Show me the fix:** every warning opens the right page with the one
   control lit up, says what to change in one line, offers "Do it for me"
   where it can, and goes back by itself once the problem clears.
4. **A readiness check:** a status ("Ready" or "2 to check", never the meaning
   colours) and a page listing every check with its fix.
5. **Sound:** a natural recorded voice, asked for every time ("Hear the
   guide?" Play the voice | Words only), never during live use; words always
   on the card.
6. **The in-app assistant knows every feature** (§2.11) and a generated user
   guide has numbered screenshots of the real app.

---

## 15. Failure modes and lessons

### 15.1 The failure modes catalogue
Classes of bug that shipped because the source read as correct. Each line is
the rule; the incident is why.

1. **Centred and clipped.** `align-items: center` + `overflow: hidden` on a
   full-height box hides a tall form. Let it scroll.
2. **Polar `color-mix`.** Mixing in oklch or hsl with white shifts the hue.
   Use oklab, srgb or transparent.
3. **A second copy of a single source of truth.** Guard by **shape**, not by
   name: a guard looking for `PATHS` never saw the copy called `P`.
4. **A UI constant that contradicts the server.** Derive shown limits from
   what enforces them.
5. **A new table without RLS.** Ask the catalogue for tables without it; fail
   the build.
6. **An erasure that misses tables.** Generate the list from the catalogue.
7. **A scope that misses a query.** Every query path gets the same scope,
   proved per table.
8. **A new customer not seeded with what the schema assumes.** Use a trigger,
   not a line in each sign-up path.
9. **Tests that pass without testing anything.** No positive control, wrong
   scope, a blind matcher. Prove every test can fail.
10. **A migration's side effects.** Dry-run in a rolled-back transaction with
    assertions; disable user triggers for structural backfills.
11. **A platform feature silently ignored.** A host dropped a 404 rule without
    warning, and a blank page was cached for a year at the edge. Verify the
    platform honours each rule.
12. **A function only checked when it returns a row.** Call new functions with
    data that returns rows.
13. **A runtime error that names the wrong component.** Add a self-test mode
    that names the failing step before rewriting anything.
14. **A list written twice.** One list, derived everywhere.
15. **A trigger that reads the value it is meant to set.** Audit columns are
    not client-writable; reject, don't ignore.
16. **Coverage that never touches the real thing.** Run the real client
    against the real system, nothing intercepted, and fail on any refusal it
    swallows.
17. **A request the browser refuses to send.** CORS preflight must allow every
    header the client library adds. curl will lie to you.
18. **A check whose floor an error page clears.** Assert the page shows the
    data it exists to show.
19. **The sentence that names the hole, in the patch that leaves it open.** If
    you write "X bypasses this", close X, and every other member of its class.
20. **What's deployed was never compared with what's written.** Test live
    config against the source.
21. **The model as the gate.** Read-backs, PINs and "never mention" rules in a
    prompt are courtesies; enforce them in code.
22. **Shared code changed but not redeployed.** Walk the imports and redeploy
    every function that uses a changed shared file.
23. **A demo reset that touches real people.** Resets spare anything that
    might be real, and never change account-level settings.
24. **Reconnecting the same OAuth account revokes the new token.** Revoke only
    when the account changes.
25. **A query ordering by a column that doesn't exist** returns nothing, and
    the feature looks empty. Run the real query.
26. **A bundled font that is never used.** `-apple-system` or
    `BlinkMacSystemFont` first in a stack means Chrome uses the system font on
    every platform. Check which fonts actually loaded.
27. **Two builds overwriting each other.** A desktop build and a web build
    differ (base paths, service worker). Build the one you test last.
28. **Contrast judged from the tokens.** Every colour looked fine on its own,
    and the words on the gradient hero measured 1.9:1. Measure the rendered
    pixels behind each piece of text.
29. **A generated file edited by hand.** A guide built from a source file
    dropped a note typed into its output at the next rebuild. Edit the source;
    say at the top of a generated file what it is built from.
30. **The hidden copy of a control.** A wide-screen column kept in the page,
    hidden, on smaller windows: a check that took the first match found the
    invisible copy and acted on it. Guides, tests and checks pick the visible
    element.
31. **A scripted click a control ignores.** Some components act on the press,
    not the click (Radix tabs switch on `mousedown`), so a guide's `click()`
    did nothing. Anything that clicks for the user sends the press too, and is
    tested doing it.

### 15.2 Lessons that apply everywhere
**Building and tooling**
- `pkill -f <name>` can kill your own shell (its command line matches). Kill by
  exact name or process id.
- After a styling change, check that config files and fonts are in the commit.
- Ignore build folders on `main` before anyone runs `git add -A`.
- Write very large generated files in smaller pieces.
- A find-and-replace of a common word can change content data (it once
  changed "Spirit" in the Bibles). Limit renames to the files that name the
  feature and read the diff.
- When a pattern match turns out wrong, resume just after the word, not after
  the whole match.

**Process**
- Tag pushes and force-pushes may be blocked for assistants: the owner
  releases; make new branches instead.
- If CI doesn't start, check billing before the code.
- Tell users which installer fits their machine, and detect it on the download
  page.

**Desktop (Electron)**
- Output windows: create hidden, place, then `showInactive()`, so they never
  steal focus.
- Destroying a window inside its own input event hangs: defer it.
- Closing the main window suspends the outputs and resumes them on reopen.
- An unsigned Mac app gets a new signature with every version, so the system
  may silently refuse the microphone after an update: detect it, say so
  plainly, and open the right settings pane.
- A public site that sends no CORS headers can't be fetched from the page;
  fetch it in the trusted process.

**Sound and speech**
- Speech recognition misses a word that starts with no lead-in: pad audio with
  half a second of quiet before checking it.
- A cloned voice mumbles as it starts: begin each take with a throwaway word
  and cut at the pause after it.
- Speech recognition writes numbers as words: compare numbers as numbers.
- It also splits names ("SongSelect" heard as "Song Select"): treat known
  names as one word before comparing.
- A line that fails the check after every take gets reworded, not accepted:
  "a song's" kept coming out as "the song's", and "slides shows" ran together.

---

## 16. Checklists

### New table (online service)
- [ ] RLS enabled in the same migration
- [ ] Full policy set (isolation, staff vs customer, role blocks, permission
      gates), or no policy at all for platform-only tables, plus grants revoked
- [ ] The offboarding guard (restrictive)
- [ ] CHECK constraints on enums and numbers; tenant-scoped unique keys
- [ ] Added to the isolation matrix's seeding; BLOCKED for the wrong sessions,
      with a positive control
- [ ] Erasure covers it; new customers seeded if the schema assumes rows
- [ ] Migration ledger line; audit entry if it touched a policy, trigger,
      definer or grant

### New server function (online service)
- [ ] Login-required: calls the one gate first, with its permission
- [ ] Public: listed in the public-functions file with the reason, a
      constant-time secret or signature, and it fails closed
- [ ] Business, person and role from the token, never the body
- [ ] Every service-role query scoped; ids validated as the caller's
- [ ] Inputs clamped; errors human and sanitised
- [ ] Rate limits and cost caps that fail closed
- [ ] CORS allows the client library's headers
- [ ] Redeployed along with every function sharing changed code

### New module or connector (desktop app)
- [ ] Registered with a manifest; subscribes through the bus
- [ ] Events versioned; published once where the thing happens; no secrets,
      sound or pictures in them
- [ ] Refused or marked in practice mode
- [ ] IPC handlers check the sender; keys only in the trusted process

### New feature
- [ ] The owner's words recorded in `OWNER_REQUESTS.md` and quoted where the
      behaviour came from them
- [ ] Single sources used; nothing typed twice
- [ ] The assistant knows it; the setup registry entry if needed
- [ ] Every string in every language
- [ ] Tests that run it; guards with proven bite entries
- [ ] Checked live at device size; fixtures cleaned
- [ ] Docs updated; the commit says verified and not verified, plus the cost
      arithmetic

### New screen
- [ ] Built from the kit's tokens: Provilion's bright light, warm graphite
      dark; never a plain white page with grey hairlines
- [ ] Cards have the visible edge; no boxes inside boxes
- [ ] One bold thing; one primary action; lists plain
- [ ] Meaning colours only for their meaning, each with its word
- [ ] One line of text, the rest behind "How it works"
- [ ] Text at least 13px; targets at least 36px; focus visible; keys for the
      main actions; reduced motion respected
- [ ] `check-contrast.cjs` passes in light and dark, at 390px and desktop
- [ ] Loading, empty, problem, field error and long content all designed
- [ ] Nothing floats over forms; nothing clips; no horizontal scroll
- [ ] Measured at 390px and desktop (and wide for a desktop app), light and
      dark, with real data, and the bundled fonts loaded
- [ ] No console errors, no refused requests, real data named in the assertion

### Before calling anything done
- [ ] It was run, not read
- [ ] Each new test seen to fail and then pass; every test run
- [ ] The adversarial pass done if it decides who sees or does what
- [ ] Not in front of real users without the owner's word
- [ ] Committed and pushed, with the full account

---

## 17. Starter kit and templates

### `CLAUDE.md` (on top of this file)
```markdown
@docs/FOUNDATION.md

# <Product>

<One paragraph: what it is, who it's for, where and under what pressure they
use it, what it replaces. Shape: online service | desktop or offline app.>

The foundation above applies unless overridden here by name, with the reason
in docs/DECISIONS.md. Don't restate its rules here; only what is specific to
this product.

## Read before changing anything
| Read | When |
|---|---|
| `docs/OWNER_REQUESTS.md` | Always first; add new requests at once |
| `docs/PRODUCT_SPEC.md` | Any behaviour change |
| `docs/LESSONS.md` | Before debugging |
| `docs/DESIGN_SYSTEM.md` | Any screen |

## Where things live
| What | Where |
|---|---|
| Prices, plan limits, trial length (the only copy) | <path> |
| Which functions are public (the only copy) | <path> |
| Setup steps (one entry each) | <path> |
| Assistant knowledge | <path> |
| Migrations / migration ledger / audit ledger | <paths> |
| Design kit and brand | `docs/foundation/design/`, `docs/DESIGN_SYSTEM.md` |

## Commands
<static checks, tests, live sweeps, guards, deploy --env staging|production
(online) or builds, e2e, release (desktop)>

## Overrides
<none, or each overridden rule by name, pointing to its decision>

## Open work (keep current)
- <date or version>: <what shipped>. Next: <what is next>.
```

### `docs/OWNER_REQUESTS.md`
```markdown
# Owner requests

Every request in the owner's words, with its status.
✅ done · ⏳ planned or in progress · 💬 waiting on the owner · ⚠ can't be done here

## "<the request, quoted exactly>"
(<date>.) <What it means, in a sentence or two.>
- ✅ <version or date>: <what shipped, where, how it was checked>
- ⏳ <what remains>
```

### `docs/DECISIONS.md`
```markdown
# Decisions

Each entry records what was decided and why. New ones at the end. Reverse a
decision only with a new reason, written here.

### D1. <Title>
- **Context:** <what prompted it, with the owner's words if any>
- **Decision:** <what was chosen, concretely>
- **Why:** <the reasons, and what was rejected>
```

### `docs/LESSONS.md`
```markdown
# Lessons

Mistakes made and how they were fixed. Check here before debugging.

## <Area>
- **<What went wrong, as it looked>.** <The cause.> <The fix and the rule to keep.>
```

### `docs/DESIGN_SYSTEM.md`
```markdown
# Design system

Built on the foundation kit (docs/foundation/design/). This file holds only
what is specific to this product.

## What the owner asked for (quoted)
## The brand (accent, accent-ink, accent-soft, edge; logo)
## Research behind it (source, finding, the rule it gives)
## Layout of the main screens
## Each approved page or part: its mock-up and the components that implement it
```

### Commit message
```text
<What changed, in the owner's terms>

<Why: the owner's words and date, or the incident.>

<What it does, briefly, including limits and how it fails.>

Cost: <per use> x <bound> = <worst case per customer per day>; <typical>.

Verified: <what ran, where, with what result>.
Not verified: <what and why>.
Cleaned up: <fixtures removed>.
<Not on production. | Released as vX.Y.Z by the owner.>
```

### Audit ledger entry (online service)
```js
{
  date: 'YYYY-MM-DD',
  through: <highest migration covered>,
  by: '<who: an independent red-team pass or the author>, <findings by severity>, <re-proved where>',
  functions: ['<every function the change touches>'],
  tried: [
    '<each attack actually attempted, and what happened>',
    'RED-TEAM M1: <finding>. Fixed: <how>, proved by <repro>',
  ],
}
```

### Migration header (online service)
```sql
-- NNN: <what an owner would notice, or "nothing an owner sees">
-- (the owner, YYYY-MM-DD: "<their words>").
--
-- Why, what it enforces, who can read or write it, how it fails.
-- Anything SECURITY DEFINER: why, and exactly which rows it touches.
begin;
-- ...
commit;
```

### CI checks (outline)
```yaml
name: Checks
on: { push: { branches: [main] }, pull_request: { branches: [main] } }
jobs:
  checks:
    runs-on: ubuntu-24.04            # pinned by name, never -latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Static checks (single sources, gates, ledgers, wording)
        run: npm run test:static
      - name: Type check and builds (each with its own base path)
        run: <tsc --noEmit> && <each build> && <assert asset paths>
      - name: Domain and engine checks
        run: <unit checks against the corpus>
      - name: Lint, no new errors
        run: <eslint, compared with the recorded count>
```

### Starter skills (`.claude/skills/`)
```markdown
---
name: ship
description: How a change is made, checked, committed and released in this project. Use for every code change and when handling PR or CI events.
---
1. Read OWNER_REQUESTS, the spec, the lessons and (for screens) the design system.
2. Build it focused; plain words on screen.
3. Ship it complete (FOUNDATION §12.1): tests that run it, guards with bite
   entries, ledgers, the assistant's knowledge, translations, docs.
4. Run every check; look at the screenshots at 390px and desktop, light and dark.
5. Commit with the template (verified / not verified / cleaned up / cost); push
   with retries; never force-push.
6. Online service: staging, then production only on the owner's word, recorded.
   Desktop app: version bump, PR (What / Testing), CI green, merge; the owner
   publishes the release.
7. Tell the owner in plain words.
```

```markdown
---
name: design-review
description: Check any screen change against the foundation kit and this product's design system before it ships. Use for any change to components, pages or CSS, or when the owner gives design feedback.
---
Read DESIGN_SYSTEM.md. A new app or a major redesign: an HTML mock-up in
docs/design/ with real content, both themes, phone and desktop, and the owner's
yes before building. Then the "New screen" checklist (FOUNDATION §16), with
screenshots at 390px and desktop in light and dark. Owner feedback: quote it
into LESSONS.md and change the rules if a rule changes.
```

```markdown
---
name: e2e
description: Test the real app end to end, nothing stubbed (online service: the staging system; desktop: Playwright with Electron, fake hardware). Use after any change people can see.
---
1. Build the target being tested last.
2. Run every end-to-end test; each prints PASS/FAIL and exits non-zero on failure.
3. For a new feature, add a test named after it, driven the way a person does it,
   asserting the data the page exists to show.
4. Read the screenshots before calling it done.
5. Clean up every fixture and say so.
```

### The skill that carries this file
The `foundation` skill is a folder:
- `SKILL.md`: the short version and where to read more;
- `references/FOUNDATION.md`: this file;
- `references/MIGRATE-OFF-SERVER.md`;
- `design/foundation.css`, `design/reference.html`, `design/fonts/`.

Zip the folder (`foundation-skill.zip`) and upload it as in §0. Keep exactly
one skill named `foundation`.

---

## 18. Moving an existing app onto the standard platform

When an online service already runs on its own server, it moves over in
phases, each with a gate. The worked example is `MIGRATE-OFF-SERVER.md`
(Jobchuck).

0. **Discover, read only.** Write down every container, the database (schema,
   extensions, sizes, users and their password hash type), what Redis is used
   for, cron and workers, files, integrations, domains and DNS. Never conclude
   a server is idle from what you couldn't see.
1. **Plan.** Map every endpoint, job and Redis use to its new home; name
   anything that must stay on a small container, and why; describe the data
   and user move, the switch-over and the rollback; do the cost arithmetic.
   The owner approves it.
2. **Staging copy.** Build the full stack with RLS and the isolation matrix
   from day one, load a copy of the data, and test it live. The owner tries
   it.
3. **Data, files and users.** Dump and restore; compare row counts and sample
   queries; copy the files and compare counts and bytes; import password
   hashes where supported, otherwise send a "set your password" email.
4. **Switch over, on the owner's word.** Write freeze, final copy of what
   changed, DNS switch, webhooks updated, live sweeps. The rollback to the old
   server has been rehearsed.
5. **Retire the old server, on the owner's word,** after at least two weeks
   read-only and a final backup. Check what else lives on the box first.
