# The Foundation

How every app is designed, built, secured, tested, shipped and documented. It is drawn from Voice Verses (a church presentation app built over 19 releases), where each rule here was either asked for by the owner or learned from a mistake.

Give this file to any project, any person and any AI assistant. It is the starting point; a project adds its own specifics on top and never quietly drops a rule here. Where a project must break a rule, it writes down why (see [Decisions](#9-documentation-that-runs-the-project)).

**Keeping it complete:** checked line by line on 26 Nov 2026 against every source in Voice Verses (the hard rules in `CLAUDE.md`, `DESIGN_SYSTEM.md`, all 37 decisions, `LESSONS.md` and the skills). When a decision, lesson or rule there applies beyond that app, it is added here in the same change.

Examples from Voice Verses are marked **In Voice Verses:**. They show what a rule looked like in practice; the rule itself applies everywhere.

---

## Contents

0. [How to use this file](#0-how-to-use-this-file)
1. [Working with the owner](#1-working-with-the-owner)
2. [Product principles](#2-product-principles)
3. [Design principles](#3-design-principles)
4. [Writing what people read](#4-writing-what-people-read)
5. [Accessibility](#5-accessibility)
6. [Architecture](#6-architecture)
7. [Security, privacy and licensing](#7-security-privacy-and-licensing)
8. [Testing and quality](#8-testing-and-quality)
9. [Documentation that runs the project](#9-documentation-that-runs-the-project)
10. [Shipping and releases](#10-shipping-and-releases)
11. [Performance and reliability](#11-performance-and-reliability)
12. [AI features](#12-ai-features)
13. [Teaching people to use it](#13-teaching-people-to-use-it)
14. [Lessons that apply everywhere](#14-lessons-that-apply-everywhere)
15. [Starter kit: files to copy into a new project](#15-starter-kit-files-to-copy-into-a-new-project)
16. [Reference: the Voice Verses design tokens](#16-reference-the-voice-verses-design-tokens)

---

## 0. How to use this file

**In a new project (any assistant, any person):**
1. Copy this file into the project as `docs/FOUNDATION.md`.
2. Create the files in [section 15](#15-starter-kit-files-to-copy-into-a-new-project): `CLAUDE.md` (or the assistant's instructions file), `docs/OWNER_REQUESTS.md`, `docs/DECISIONS.md`, `docs/LESSONS.md`, `docs/DESIGN_SYSTEM.md`, `docs/PRODUCT_SPEC.md`, the CI checks and the skills.
3. Tell the assistant at the start: "Read `docs/FOUNDATION.md` and follow it."

**For every project in Claude:**
- **Claude Code (on your own computer):** put this file at `~/.claude/CLAUDE.md`. Claude Code reads that file in every project on that computer. A project's own `CLAUDE.md` adds to it.
- **Claude.ai Projects:** add this file to the project's knowledge, and put "Follow FOUNDATION.md for all design, architecture, security, testing and shipping" in the project's instructions.
- **Claude.ai for every chat:** paste the [short version](#the-short-version) into Settings → Profile → personal preferences. If your plan has Skills, upload this file as a skill (a folder with `SKILL.md`; see [section 15](#a-skill-that-carries-this-file)).

### The short version

Paste this where only a short text fits:

```
Follow my Foundation (FOUNDATION.md) in all work. In short:
- Owner: record every request word for word with its status; mock-up first for any new screen and wait for my yes; recommend one option, don't list many; say plainly what is done, tested and not.
- Design: Apple-grade, colourful never monochrome, never stark white (warm graphite / warm paper), fill every screen, colour always means something and is paired with words, one obvious primary action, things stay in the same place, structure from space and light (no boxes in boxes, few borders), show a picture of the real thing, one sign for everything automation did, research the best tools first, both themes and every size checked by screenshot.
- Words: plain, active, from the user's side; say exactly what a control does; no jargon.
- Accessibility: targets ≥36px, key text ≥13px, keyboard for the main actions, reduced motion respected.
- Product: core works offline, one download with nothing else to install, no vendor lock-in, the next step always prepared so the person only confirms, every smart feature optional with presets (bold ones off), what the app finds or imports reviewed by a person before it is added, outputs placed by the app (no dragging windows), trust earned per behaviour and per situation with one-tap corrections, never confidently wrong (act alone only when certain, otherwise suggest with how sure and why), automation that isn't sure goes to a safe neutral screen and asks the operator (a timer or schedule is never proof), a safe practice mode.
- Architecture: one app of separate modules on an event bus (versioned CloudEvents, publish once where it happens), one renderer for every view of the same thing, a local API with pairing and scoped keys, no servers of our own unless needed, decisions written down.
- Security: keys in the OS keychain, added server-side only for their host, never in a web build; sandboxed, isolated renderers; every IPC/API call checks who sent it; signed webhooks; no secrets, sound or pictures in events; no copyrighted content in public repos; never get around bot checks or paywalls.
- Tests: the real app end to end (fake hardware, mocks), look at the screenshots, a failing test is a bug not noise, measure before guessing, run every test not just the new one, generated assets checked by machine.
- Shipping: branch, checks, version bump per change, PR, merge after CI, never force-push, owner publishes releases, update the spec, decisions, lessons and requests with every change.
```

---

## 1. Working with the owner

The owner decides what the product is. The assistant's job is to make it excellent and to be trustworthy about what was done.

1. **Record every request the moment it is made, in the owner's own words,** in `docs/OWNER_REQUESTS.md`, with its status: ✅ done (with version), ⏳ in progress or planned, 💬 waiting on the owner, ⚠ can't be done here (and why). Quote them exactly. Read this file first in every session.
2. **Mock-up first for anything new that people will see.** A new page, a new section, even a small one. Show a realistic working state with real content (never lorem ipsum, never an empty shell), both themes, and the real window sizes. Wait for the owner's yes before building. **In Voice Verses:** three Settings pages were built straight into an old panel without a mock-up; the owner wrote "I am very disappointed with the aesthetics… Every part of the app must have that excellence." From then on, every new page got a mock-up first.
3. **Recommend; don't survey.** When there is a choice, give the best option and why, in a few lines. Offer alternatives only when they are genuinely close, and say what each costs. Use a small table when comparing.
4. **Ask only what is the owner's to decide** (taste, money, their accounts, their hardware, anything that reaches their users). Decide the rest from the code, the docs and sensible defaults, and say what you chose.
5. **Say plainly what is done, what was tested and what wasn't.** "Built and tested in the real app" is different from "built". If something failed, say so with the failure. If you can't tell from a screenshot, say "I can't tell from this; here is how we find out." A wrong diagnosis costs more trust than an honest "not sure".
6. **Explain in the owner's terms, not the code's.** Lead with what changes for them and their users. Keep internal names (files, functions, events) out of messages unless asked.
7. **Measure what matters before answering questions about cost.** **In Voice Verses:** asked "how slow will a 100 MB voice model make the app?", the answer was measured (600 MB of memory, half a second per second of speech), which led to a better design (recording the lines ahead: 0.6 MB, nothing at run time).
8. **Act on the owner's standing instructions** (for example "merge once CI passes") without asking again each time, and record them.
9. **When the owner gives design feedback,** quote it into `LESSONS.md`, change the design rules if a rule changes, and show a new mock-up before rebuilding.

---

## 2. Product principles

1. **One obvious way to do the main job.** A screen has one primary action; everything else is secondary, in a menu or in the command palette (⌘K). No modes to switch between for the core task.
   - **Prepare the next step so the only decision is yes or no.** The app always fills "next" with its best guess, so the person's job is to confirm it (Take) or change it. **In Voice Verses:** Next is always filled, so the operator's only decision is Take or not.
2. **The core works offline.** Internet is optional: cloud features add to the app, never hold it up. Bundle what the core needs (models, data, fonts).
3. **One download, nothing else to install.** No separate runtimes, servers or helper apps for the core. Optional extras that need a third-party runtime say plainly where to get it, and everything else keeps working without it.
4. **It runs on the hardware people actually have:** older machines, both chip types, every desktop OS you support. Test on the slowest target that matters.
5. **No vendor lock-in.** Any provider for a service that has alternatives (AI, speech, sync), each optional, with a local option where one exists.
6. **Never be confidently wrong.** When the app acts by itself, it must be certain. Below certainty, it *suggests*, shows how sure it is in words ("Strong match", "Likely") and why, and lets a person decide. **In Voice Verses:** a verse goes on screen by itself only when it was said outright or matched at 99% or more; anything less is a suggestion with a preview.
7. **Every smart feature is optional.** Give a switch per feature and presets (Essentials, Recommended, Everything). A new install gets the recommended set; features that act on their own in new ways start off. The engine receives plain flags and never reads settings itself (which also keeps it testable).
8. **Trust is earned, per behaviour.** An automatic behaviour starts by preparing (waiting for a person to confirm), and can be promoted to act by itself only after a streak of being right, and only when the owner chooses. Any correction sends it back. One tap pauses all automation (and pausing keeps what was learned).
   - **Learn each situation separately.** Habits from one context must not leak into another (**In Voice Verses:** each type of service, from Sunday services to funerals, has its own order and is learned separately).
   - **Corrections are one tap, in the user's words** ("Wrong part", "Not now", "Never for these words"), and **"Just this once"** undoes a one-off correction exactly, so one mistake never undoes weeks of learning.
   - **Learn by watching first:** the person's own actions are better labels than anything they would have to type or read.
9. **A safe place to learn.** A practice mode in which the real screens work but nothing reaches the outside world (other screens, other apps, analytics, learning). Its state lives in one place and is never saved, so a crash can't leave it on. Ending it puts everything back as it was.
10. **The app opens full, never blank.** First run shows a working sample (clearly marked, removable) and a guided set-up that finds what it can by itself and asks the person to confirm each thing.
    - **What the app finds or imports, a person reviews before it is added.** It shows what it found, with the doubtful items left unticked (**In Voice Verses:** a chapter mentioned in passing starts unticked when sermon notes are imported), and the person confirms. A tool that guesses is never allowed to fill the library or the screens by itself.
11. **When automation isn't sure, it goes to a safe neutral state and asks.** A schedule, a timer or a learned habit is not proof that the next thing has started. Until the app has evidence (it heard or saw the next thing begin), it shows something neutral (the logo, a holding screen), gets the next thing ready, and asks the operator ("Has Prayer started?" Show it | Not yet). "Not yet" puts back what was there. Only evidence, never the clock alone, lets an automatic step act by itself. **In Voice Verses:** the owner's rule for spirit and Move on by time.
12. **Things that reach the outside world are deliberate.** Sound, screens, messages, webhooks: never by surprise. Ask before playing sound, keep outputs from stealing focus, and never act on another app's output when its operator took it down.
    - **The app places its outputs; nobody drags windows.** Settings assigns each output to a display (or a video card, a network stream); the app opens it there, full screen, without taking focus, and puts it back by itself when the display is reconnected. **In Voice Verses:** hard rule 6, after the owner asked "Can't it be selected in the app?"
13. **The user's own content is theirs.** Make it easy to import and keep what they're licensed to use, and credit it properly (title, authors, copyright, licence numbers).
14. **Two choices that look alike stay separate settings.** One switch must not quietly decide two things people think of separately (**In Voice Verses:** "what picking a slide does" and "what a verse heard does" are two settings).
15. **When there are several equal ways to do something, show them as equal and let the user choose.** Don't mark one "Recommended" until it has been tested in their setting; say what each needs and costs. **In Voice Verses:** the three ways into ProPresenter are shown as equal until they have been tried in the owner's booth.
16. **Name the real thing.** Show which real device "Default" is, say when an input belongs to a video card and will be silent, and say why a choice is unavailable instead of hiding it.

---

## 3. Design principles

The bar: **like an app Apple designed, and far easier than the established tool it replaces.** Colourful but meaningful. Calm, warm, and filling every screen.

### 3.1 The look

1. **Colourful, never monochrome. Never stark white.** Light mode is warm paper; dark mode is warm graphite (greys with a slight warm or violet bias, never cold blue-grey). No pure `#fff` page backgrounds, ever. No large full-width white buttons.
2. **Colour always means something.** Reserve colours for meanings and never reuse them for decoration. **In Voice Verses:** red is only ON AIR, green is only NEXT; the team (brand) colour is for selection and the app's actions; category colours appear only on the timeline.
3. **Every state shows its words too,** not only its colour ("ON AIR", "waiting for Take", "Needs a look"). Nobody should need colour vision to use the app.
4. **The brand colour is for small accents and tints, never big solid areas next to meaning colours.** **In Voice Verses:** a big gold Take button between red and green frames read as a traffic light; the owner rejected it. Large controls became quiet raised graphite.
5. **Ambient colour from the content.** The app's colour can come from what it shows (soft radial gradients of the current content's colours behind the window, low opacity, slow transitions) rather than from chrome.
6. **Structure comes from space and light,** not lines. Few borders; no boxes inside boxes; group related things on one soft surface with hairlines that start after the icon.
7. **Glass (translucency) only where content scrolls under it** (a toolbar, a command palette). Reading surfaces are solid.
8. **Shadows only on what floats** (the window, a palette, a card being dragged) and on purposeful glows (the ON AIR frame).
9. **Type:** the system UI font (SF Pro on Mac, a bundled fallback such as Figtree for Windows), a display weight of 700 with slight negative tracking for titles, a good serif for long reading text, tabular numbers for times. A clear scale, kept to.
10. **Radii are a small consistent set** (for example 16 window, 14 cards, 12 previews, 9–10 controls, pills fully round).
11. **Automation has one consistent sign.** Everything the automation did or suggests carries the same small mark (**In Voice Verses:** spirit's warm breathing orb), never the meaning colours, so people always know what the app did by itself.
12. **Practice looks different from the real thing:** a band with its words along the edge of the screen and a way out ("End practice"); a lesson that does affect the real world gets a red band instead.

### 3.2 Layout

1. **Fill every screen,** from a 1280×800 laptop to a 3440×1440 ultrawide. Extra width goes to content (bigger previews, a side library column), never to longer lines of reading text (cap reading lines at about 36 characters for display text, 65 for body).
2. **The same thing stays in the same place,** every time. Nothing floats or rearranges itself. Fixed regions; panels are shown or hidden, never free-floating.
3. **The layout follows the real window by itself.** No "laptop / desktop" switches in the UI or in mock-ups.
4. **Show a picture of the real thing** at the top of a settings page when there is one: the room of screens with live previews, the connected device's status card. People recognise pictures faster than read sentences.
5. **Settings pages are documents, not dashboards:** grouped rows (icon square, bold title, one plain sentence, the control on the right). Switches in the brand colour when on. Two to four choices are a segmented control; choices that need a sentence each are cards with a ring when chosen.
6. **Buttons:** quiet fill by default; a soft tint for a row's main action; a solid brand colour only for the one confirming action in a small form.
7. **Status:** a grey tick when fine; amber with words when it needs a look. Meaning colours stay reserved.
8. **Previews must be the real thing,** drawn by the same renderer as the output and in the output's shape (see [6.2](#62-one-renderer-for-every-view-of-the-same-thing)).
9. **The header lines up with the body:** one container width or padding for both.

### 3.3 Motion

1. Short and meaningful: 150–300 ms for UI (a highlight, a crossfade on the main action, a playhead).
2. **Respect reduced motion everywhere.** Anything animated has a still version.
3. **Small thumbnails stand still;** the main previews move so the operator sees what the audience sees.
4. **A CSS animation that never stops keeps the window repainting 60 times a second.** On busy screens, keep decorative marks still.

### 3.4 Design process

1. **Research first** for a new area: what the best tools in the field do, and what their users and reviewers say goes wrong. Write the findings as a table (source, finding, the rule it gives us) in `DESIGN_SYSTEM.md`. **In Voice Verses:** ProPresenter's seven Clear buttons became one Clear; broadcast switchers' red program and green preview became the full red and green frames with words.
2. Read `DESIGN_SYSTEM.md`, then make an HTML mock-up in `docs/design/` with realistic content, both themes, laptop and wide sizes, interactive where it matters. Publish it for the owner and wait for approval.
3. Build to the mock-up. Screenshot the built thing in dark, light, at 1440 wide and at 3440 wide, and compare side by side.
4. Run the design checklist before every UI PR:
   - Tokens only (warm graphite / warm paper); no pure white, no cold grey.
   - Meaning colours only for their meaning, each with its word.
   - One primary action obvious; the rest secondary or in ⌘K.
   - Structure from spacing and light; no boxes inside boxes; few borders.
   - Text ≥13px for UI; reading lines capped; tabular numbers for times.
   - Targets ≥36px; keyboard shortcuts work; focus visible; reduced motion respected.
   - Fills 1280×800 and 3440×1440.
   - Previews use the real renderer in the output's shape.
   - Header aligned with the body.
   - Words plain, active, from the user's side.
5. Name CSS classes specifically. A class shared by layout and content (`.now` for both a pane and a timeline segment) silently breaks layout. Give app grids `grid-template-columns: minmax(0, 1fr)` and text-holding grid children `min-width: 0`, so a long item can't widen the page. Exclude overlay layers from blanket rules like `.app > * { position: relative }`.

---

## 4. Writing what people read

Write from the user's side of the screen. The people using it may be volunteers under time pressure with little training.

1. **Plain words, active voice, short sentences.** "Take puts it on every screen." Not "Content will be transmitted to all configured outputs."
2. **Say exactly what a control does.** "Show me the fix", "Choose where it goes", "Words only", "Play the voice". A button's label is a verb phrase of what happens.
3. **No jargon:** no "IPC", "template assignment", "ephemeral", "payload", "sync conflict". Name things by what people recognise.
4. **Errors say what went wrong and what to do,** without apology: "“Scarlett 4i4 USB” is not connected, so the computer’s default input will be used." Then a button that fixes it.
5. **Numbers that sound like probabilities must be probabilities.** **In Voice Verses:** "30% sure" confused the owner when the verse was right; it measured how much wording was heard. It now says the strength in words ("Likely") and why.
6. **Explain each rule the way it protects the user, not the way it restricts them.** **In Voice Verses:** "no copyrighted lyrics in the repository" alarmed the owner until it was said clearly that their own licensed songs are fully supported in the app.
7. **Spoken text uses full stops and commas only** (colons, dashes and brackets muddle a synthetic voice). The on-screen text keeps its punctuation.

---

## 5. Accessibility

1. Hit targets at least 36px tall.
2. Key text never smaller than 13px; body 14px; small uppercase labels with letter spacing.
3. Never colour alone: every state has words.
4. The main actions have keys (for example Space = the primary action, Esc = clear or back, ⌘K = search everything, arrows = previous and next). Keys never fire while typing in a field.
5. Focus is always visible. Dialogs trap focus, close with Esc, and return focus.
6. Reduced motion is respected everywhere; nothing important depends on animation.
7. Sound never plays without the person choosing it, and words always appear alongside anything spoken.

---

## 6. Architecture

### 6.1 One app of separate modules (a modular monolith), not microservices

- Ship **one app, one download, working offline.** Separate processes and services mean more to install, start, update and fail, especially on older machines.
- Inside, each part is a **module** with narrow edges. A module **advertises** what it does and the events it sends in a **manifest** kept by a **module registry**, and **subscribes** to what it needs through one **event bus**. A publisher never knows who listens. Adding a feature, connector or importer means registering one more module; nothing else changes.
- **Event rules:**
  - Envelopes are **CloudEvents 1.0**; types are versioned (`org.<app>.<name>.v1`). A breaking change gets a new name beside the old one, never an edit; adding an optional field isn't breaking.
  - **Publish where the thing happens, once** (for example, what the screens show is announced by the one function every screen goes through), so every caller is covered without remembering.
  - A subscriber that throws never stops the publisher or other subscribers.
  - Other windows receive events through a `BroadcastChannel`; a module that acts on the outside world acts only in the window that published.
  - **Never put secrets, sound or pictures in an event.** Plain values only.
  - Events made in practice mode are marked and reach only subscribers that ask; anything acting on the outside world never asks.
- **Heavy work runs off the UI thread** (a worker or utility process): speech recognition, rendering for other outputs, file conversion.
- Engines take **plain inputs and callbacks** (and feature flags) and never read settings or the DOM themselves. That keeps them pure, fast and testable in Node.

### 6.2 One renderer for every view of the same thing

Everything that shows the same content (the output itself, operator previews, thumbnails, the designer, network viewers, video-card outputs, NDI) draws through **one renderer** on a stage of fixed height, scaled to fit, with width set by the output's shape. Text is fitted, never sized in fixed pixels without fitting. **What the operator sees is what the audience sees.**

### 6.3 A local API, API-first

- Other software reaches every module through a **local HTTP API** inside the app (off by default), on the local network, without the internet:
  - Pairing with a short one-time code shown in the app (single use, short expiry, few tries), giving each device its own random key. **Store only a hash of the key.** Show the key once.
  - **Scoped keys** (`read`, `control`, `write`), chosen by the operator at pairing. A device can be removed at once; its streams and webhooks stop.
  - Commands go to the module that owns them; refused in practice mode.
  - Events: the bus's CloudEvents unchanged, over Server-Sent Events, WebSocket (with a filter like `live.*`) and **HMAC-signed webhooks** (`sha256=` of the body with a per-webhook secret; receivers compare with a timing-safe compare).
  - Described in **OpenAPI** (requests) and **AsyncAPI** (events), discoverable by **Bonjour/mDNS**.
- Exchange formats are **one validated document** (a schema with zod or similar) used by the API, by file import and by the app itself.

### 6.4 No servers of our own unless they are truly needed

- Keys live on the user's machine; shared data is a **folder of JSON files** (one file per item, tombstones for deletes, conflicts resolved by content not timestamps) that any cloud drive syncs.
- Never depend on a token server or a hosted function you might stop paying for. **In Voice Verses:** the first version called an AI through a hosted token server; when it was shut down, the app broke ("405 Not Allowed").

### 6.5 State

- Settings that every window must see live in shared storage (for example `localStorage` with change events, plus a `BroadcastChannel` for the same window). Large data lives in IndexedDB. Never parse large saved state in a render or hot path; load once, batch writes.
- A state that must never be left on by a crash (practice mode) is **never saved**.
- Anything copied from a template gets **new ids**, so two copies can't be confused.

### 6.6 Decisions are written down

Every significant choice goes in `docs/DECISIONS.md` as **Context → Decision → Why**, numbered, newest at the end. Reverse a decision only with a new reason, written there.

---

## 7. Security, privacy and licensing

### 7.1 Secrets

1. Keys are kept in the **operating system's secure storage** (Electron `safeStorage`, Keychain, Credential Manager).
2. Keys are **added to requests in the trusted process only, and only for that provider's host** (for example a `secrets:fetch` call that attaches the key to requests to `api.anthropic.com` and nowhere else).
3. **Never ship a key in a web build.** The web version uses no keys or asks the user for their own at run time, stored only in memory.
4. No token servers. No keys in logs, events, analytics or error reports.
5. Never send the user's personal details to an outside service without explicit permission.

### 7.2 Desktop app hardening (Electron)

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`.
- A preload bridge exposes a small, typed API (`window.<app>`); nothing else.
- **Every IPC handler checks the sender** (the frame's URL is the app's own) before doing anything.
- `setWindowOpenHandler` and `will-navigate` keep windows on the app's own pages; outside links open in the browser.
- Output windows never take focus (`showInactive`).

### 7.3 Network and API

- Off by default; pairing as in [6.3](#63-a-local-api-api-first); keys hashed; scopes enforced on every call (401 not paired, 403 not allowed).
- Webhooks signed with HMAC-SHA256; receivers verify with a timing-safe compare.
- Network viewers are read-only and separate from the control API.

### 7.4 Licensing and copyright

1. **A public repository contains no copyrighted content:** no song lyrics, no licensed book or Bible text, no copyrighted images, not even in tests, mock-ups or placeholders. Use public-domain material (KJV/WEB/ASV, public-domain hymns) or words written for the test. Titles are fine.
2. **The user's licensed content is theirs to use in the app.** Make importing it easy and credit it properly.
3. **Licensed content fetched at run time is not stored** when its terms say so (keep it in memory only).
4. **Check every third-party licence before bundling.** If redistribution would push terms onto your licence, use the component the user already has installed instead (**In Voice Verses:** NDI through the computer's NDI Runtime, loaded at run time, not bundled; its trademark notice shown wherever it appears).
5. **Generated assets need clean inputs:** a cloned voice only from a recording you may use (CC0 or CC BY with credit), and credit the models and sources in the app.
6. **Never get around a bot check, paywall or proxy block.** Ask the owner for the file instead.

---

## 8. Testing and quality

### 8.1 The definition of done

A change is done when it has been **seen working in the real app**, not when it compiles.

1. **End-to-end tests drive the real app** (for desktop: Playwright with Electron, under Xvfb on Linux), through the same path a person takes: click Search, type, press Return, press Take. Don't poke internal state to set up what you then claim to test.
2. **Fake the hardware, don't skip it:** a pretend second display, a fake microphone playing a recorded or synthesised sermon, a pretend video card, a mock AI server. Each fake lives in a shared test library (`lib.cjs`: `launch`, `plugInSecondDisplay`, `seedMedia`, `check`, `done`).
3. **Look at the screenshots** the tests save, every time, at laptop size and wide, in both themes. Many layout faults only show in a picture (a card covering what it explains, a label wrapping, a light on the wrong control).
4. **Test the rules, not only the happy path:** the safety rule (nothing plays before permission; nothing reaches the room in practice; nothing goes up below 99%), leaving early (Esc, going elsewhere), and failure (unplugged, not connected, no permission).
5. **Each feature gets its own test file** in `tools/e2e/`, named after the feature, printing PASS/FAIL lines.

### 8.2 Checks that run on every change (CI)

- Type check, both builds (each with its own base path and service-worker rules), lint with **no new errors** (record the count of old ones and never let it rise), syntax check of main-process files.
- **Domain checks as unit tests in Node:** the detection engine against a corpus of cases (written *before* changing detection: the new behaviour and its nearest neighbours that it could break), the event bus and registry, API contracts, parsers against saved responses, licence-name and download-name consistency, every guide line having its recording.
- Native modules compile.
- **Evaluate engines on real data** (clean and noisy audio, slow hardware profile) and keep the numbers in a doc, so a change can be compared.

### 8.3 Habits

1. **Run every end-to-end test before a PR, not just the new one.** Other tests catch side effects (**In Voice Verses:** the features test caught Settings closing under the volunteer after a fix had succeeded).
2. **A failing test on `main` is a bug to trace, not background noise.** Two failing checks were called "pre-existing" for weeks; they were a real bug (the demo showed features the church had switched off).
3. **Measure before guessing.** When something gets slower, run the same input through the old and new builds and compare. Then change one thing.
4. **Run the domain checks after every merge from `main`.** A merge once dropped a closing brace in a test file.
5. **Build from `main` before opening a PR**; a component once used a prop that existed only on an unmerged branch.
6. **Check machine-generated assets by machine.** **In Voice Verses:** every recorded guide line was checked by the app's own speech recognition, word for word, with a length check, and re-recorded until it passed.
7. **After any scripted edit, check `git diff --stat`.** A script once truncated a file.
8. **Selectors in tests use exact roles and names,** and are scoped (a second "Start listening" button broke tests that clicked by name).
9. **A CI failure gets one re-run only if it died before any test ran** (network drop while installing). Otherwise find the root cause; "flaky" is not a cause. Never skip, disable or quarantine a test to get green.

---

## 9. Documentation that runs the project

The docs are the project's memory. Anyone (a person or an assistant) must be able to rebuild the app from them without repeating a mistake.

| File | Holds | Updated |
| --- | --- | --- |
| `CLAUDE.md` (or the assistant's instructions) | Who uses it and where, the stack, the commands, the hard rules, where things are saved, the open work | Every change (the open-work list) |
| `docs/OWNER_REQUESTS.md` | Every request in the owner's words, with status and version | The moment a request is made, and when it ships |
| `docs/PRODUCT_SPEC.md` | What the app does: every feature, number, threshold, saved key and file name. The source of truth to rebuild it | Every behaviour change |
| `docs/DECISIONS.md` | Context → Decision → Why, numbered | Every significant choice |
| `docs/LESSONS.md` | Mistakes made and how they were fixed, grouped by area. Checked before debugging | Every bug found and every owner correction |
| `docs/DESIGN_SYSTEM.md` | Tokens, layout, rules, approved mock-ups and the parts that implement them | Every design approval |
| `docs/ROADMAP.md` | What is missing and the order to build it | When priorities change |
| `docs/REBUILD.md` | The order to build it from nothing, with a check after each stage | When a stage is added |
| `docs/architecture/` | How modules talk; required reading for any new module or connector | Architecture changes |
| `docs/api/` | The API and exchange formats for other developers | API changes |
| `docs/design/` | Approved mock-ups (HTML), kept as the record | Each approval |
| `docs/user-guide/` | How to use every feature, with numbered screenshots, generated by a script from the real app | When the UI changes |
| `.claude/skills/*` | Step-by-step procedures: shipping a change, testing end to end, releasing, design review, changing a sensitive engine, rebuilding | When a procedure changes |

- **The spec holds every number** (thresholds, sizes, timings, keys, file names). They were tuned against real use: a rebuild copies them exactly, stage by stage (`REBUILD.md`), with a check after each stage that must pass before the next.
- The user guide keeps a **FEATURES list** (each feature → its section) so nothing is left undocumented, and its screenshots are taken by a capture script that drives the real app with numbered markers.
- Write docs in the same plain style as the UI.

---

## 10. Shipping and releases

### 10.1 Every change

1. **Branch** from the latest `main`: `feature/<name>` or `fix/<name>`. If the branch's PR already merged, start it again from `main`.
2. **Read first:** the spec, the lessons and, for UI, the design system.
3. **Build it focused.** No unasked-for refactors in the same change.
4. **Run the checks:** type check, both builds, domain checks, lint (no new errors), and the end-to-end tests (all of them).
5. **Bump the version** (patch per shipped change; minor for a big redesign or a new area).
6. **Commit** with a subject saying what users get, a body saying what and why, and the attribution lines your tools require. **Never put a model name in commits or PRs.**
7. **Push** with retries on network errors. **Never force-push;** if history must change, make a new branch.
8. **Open a PR** with "What" (behaviour, in bullets) and "Testing" (what was run and seen, including screenshots checked).
9. **Wait for CI,** fix any failure at its root, then **merge with a merge commit** (if the owner has asked for finished work to be merged).
10. **Update the docs** (spec, decisions, lessons, owner requests, user guide, open work) in the same change.
11. **Tell the owner** in plain words what changed and what they need to do (for example publish a release).

### 10.2 Releases

- **The owner publishes releases** (a human approves every public release). A release is a tag on `main` (lowercase `vX.Y.Z`; a capital `V` didn't trigger the build), whose version the build writes into the app.
- CI builds every installer (Mac Apple chip and Intel, Windows) with everything bundled, and attaches them. Check the asset names after each release.
- **Pin CI images by name** (`macos-15`, not `macos-latest`, which once never got a runner).
- **Updates people see:** the app checks at start and on a timer (machines stay on for days), keeps the state in the trusted process so any window can ask, and shows a visible place with **Check now** and the right next step for each platform (restart to update; or download and open the installer where auto-install isn't possible).
- Sign and notarise installers when the owner has the accounts; until then, say plainly what unsigned means for users.

---

## 11. Performance and reliability

1. **The hot path stays light.** Anything that keeps the UI thread busy delays the real-time work (audio, detection). Never redraw per audio frame (throttle meters to about 15 a second); compute derived values with memoisation; never parse or save large state in a render; batch writes.
2. **Background windows must keep working** where the app is real-time: turn off the browser's background throttling and keep the system from sleeping while working. Don't add timers or animations that the browser throttles in a hidden window.
3. **Real-time engines are lag-aware:** if results arrive late, skip the stale partial ones and adapt the interval to how long each takes.
4. **Run heavy work in a worker or utility process,** started on demand; if it dies, say so plainly and let the next start make a fresh one.
5. **Older hardware is the target.** Measure on it (or a slow profile).
6. **Recover by itself:** a screen unplugged and plugged back in returns to its output; a device that comes back with a new id is found again by its saved name.
7. **Two things driving one output notice each other:** before resending, check whether what you sent is still showing; if someone else took it down, stop and offer to send again.
8. **Read other apps' APIs by what they contain, not by one version's shape.** A new version turned a list into an object and broke a feature.

---

## 12. AI features

1. **AI suggests; it never acts alone on what matters,** and every answer is verified against the source of truth before it is shown (**In Voice Verses:** every AI-suggested verse is checked against the Bible text).
2. **Any provider:** Claude, OpenAI, local models (Ollama, LM Studio) and OpenAI-compatible servers, behind one provider layer. All optional.
3. **Keys as in [7.1](#71-secrets).** Local models make it work offline.
4. **Prefer making things ahead over making them at run time** when the output is fixed (recorded guide lines instead of a speech model in the app), and check them by machine before shipping.
5. **Default to the latest, most capable models** when building AI features, and keep the model choice in one place.

---

## 13. Teaching people to use it

1. **A guide inside the app:** a pointer that glides to the real control, a spotlight on it, one short line on a card beside it (never over it), with "Why?" for the reason. **Show me** does each step; **Let me try** waits and checks what the app really did; a wrong click is named kindly, never a telling-off.
2. **Lessons run in practice mode** ([2.9](#2-product-principles)), each with its own automatic test so a change to the screens can't break it unnoticed.
3. **Show me the fix:** every warning opens the right page with the one control lit up, says what to change in one line, offers "Do it for me" where the app can, and goes back by itself once the problem clears (unless the person has moved on).
4. **A booth or device check:** a status light ("Ready" or "n to check", never meaning colours) and a page listing every check with its fix.
5. **Sound:** a natural, recorded voice; asked for every time ("Hear the guide?" Play the voice | Words only); never during live use. Words always on the card.
6. **A generated user guide** with numbered screenshots of the real app.

---

## 14. Lessons that apply everywhere

These came from real mistakes. Check them before debugging anything similar.

**Building and tooling**
- A desktop build and a web build differ (relative vs absolute base paths, service worker on or off). Building one over the other breaks the app silently: build the one you test last.
- `pkill -f <name>` can kill your own shell (its command line matches). Kill by exact name or PID.
- After a styling change, check that config files and fonts are in the commit.
- Ignore build folders on `main` before anyone runs `git add -A` on a branch.
- Write very large generated files in several smaller pieces.

**UI**
- A shared class name between layout and content breaks layout; name classes specifically.
- Grids need `minmax(0, 1fr)` and `min-width: 0` on text children, or long content widens the page.
- `useEffect(() => el.scrollIntoView())` returned a Promise as the cleanup and crashed: always use braces in effects.
- A UI library's `--accent` may be a hover surface, not the brand colour: map only the primary colour to the brand.
- A selected style must win over a "today" style, or the date disappears.
- Lighting up a control after a smooth scroll: wait for the scroll to finish first, then follow the element as it moves.
- Text fitting: compare `offsetHeight <= clientHeight + 1`, not `scrollHeight` (glyph overhang).
- `color-mix()` doesn't work inside SVG data URIs and in older Safari; compute colours in code.
- Blending two opposite colours halfway gives grey; blend towards the background instead.
- Two opaque layers at 50% let black through in a dissolve: hold the leaving layer at full opacity under the new one.

**Desktop (Electron)**
- Output windows: create hidden, place, then `showInactive()`, so they never steal focus.
- Destroying a window inside its own input event hangs: defer it.
- Closing the main window must suspend the outputs and resume them on reopen.
- Background throttling stops real-time work: turn it off and block sleep.
- An unsigned Mac app gets a new signature with every version, so the OS may silently refuse the microphone after an update; detect it, say so plainly and open the right settings pane.
- A saved device can come back with a new id: save its name and find it by name.
- Storage events don't fire in the window that made the change: also post on a `BroadcastChannel`.

**Process**
- Tag pushes and force-pushes may be blocked for assistants: the owner releases; make new branches instead.
- If CI doesn't start, check billing before the code.
- Tell users which installer fits their machine (Apple chip vs Intel), and detect it on the download page.
- A field the UI can fill isn't a feature until something shows it: trace every saved field to where it is used.
- When a pattern match turns out wrong, resume just after the word, not after the whole match.
- A find-and-replace of a common word can change content data (it once changed "Spirit" in the Bibles): limit renames to the files that name the feature and check the diff.
- Read the whole screenshot before diagnosing.

**Sound and speech**
- Speech recognition misses a word that starts with no lead-in: pad audio with half a second of quiet before checking it.
- A cloned voice mumbles as it starts: begin each take with a throwaway word and cut at the pause after it.
- Speech recognition writes numbers as words: compare numbers as numbers.

---

## 15. Starter kit: files to copy into a new project

### `CLAUDE.md` (the assistant's instructions)

```markdown
# <App name>: rules for working on this app

<One paragraph: what it is, who it's for, what it replaces, the ambition.>

Follow `docs/FOUNDATION.md` in everything. Read these before changing anything:

| Read | When |
| --- | --- |
| `docs/OWNER_REQUESTS.md` | Everything the owner asked for and its status. Read first; add new requests at once. |
| `docs/PRODUCT_SPEC.md` | What the app does; the source of truth for rebuilding it. |
| `docs/DECISIONS.md` | Why it is built this way. |
| `docs/LESSONS.md` | Mistakes already made. Check before debugging. |
| `docs/DESIGN_SYSTEM.md` | How it must look and read. Required for UI work. |
| `docs/architecture/` | How modules talk. Required for any new module. |
| `.claude/skills/*` | Procedures: shipping, testing, releasing, design review. |

## The people and the setting
- Who uses it, where, under what pressure, with what training.
- Their hardware (oldest machine that must work), their network, their accounts.

## Stack and layout
- <framework, language, UI kit, build, desktop shell>
- Folders: core (bus, events, registry), modules, engines, lib, components, pages, tools/e2e, tools/checks.

## Commands
<install, type check, builds, run, lint (with the count of old errors), domain checks, e2e>

## Hard rules
1. <The product's first principle, e.g. never confidently wrong, with the threshold.>
2. Offline core.
3. No vendor lock-in.
4. Keys stay out of the web build.
5. One renderer for every view of the same thing.
6. <Domain rules.>
7. Copyright: nothing copyrighted in the repository; the user's licensed content fully supported in the app.
8. Accessibility: meaning colours with words, targets ≥36px, text ≥13px, keyboard for the main actions.
9. UI text from the user's side: plain, active, exact.

## Shipping a change
Follow the `steward` skill: branch, checks, version bump, PR, CI, merge commit. Never force-push; the owner publishes releases.

## Where things are saved
<settings keys, databases, files>

## Open work (keep current)
- <version>: <what shipped>. Next: <what is next>.
```

### `docs/OWNER_REQUESTS.md`

```markdown
# Owner requests

Every request in the owner's words, with its status. ✅ done · ⏳ planned or in progress · 💬 waiting on the owner · ⚠ can't be done here

## "<the request, quoted exactly>"

(<date>.) <What it means, in a sentence or two.>
- ✅ <version>: <what shipped, where, how it was checked>
- ⏳ <what remains>
```

### `docs/DECISIONS.md`

```markdown
# Decisions

Each entry records what was decided and why. Add new ones at the end. Reverse a decision only with a new reason, written here.

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

### `docs/DESIGN_SYSTEM.md` (skeleton)

```markdown
# Design system

## What the owner asked for (non-negotiable)
## Research behind it (sources, findings, rules they gave)
## Layout of the main screen
## Tokens (light: warm paper; dark: warm graphite; meaning colours; brand accent; type; radius; shadow)
## Rules (numbered; see FOUNDATION §3)
## Each approved page or part: its mock-up and the components that implement it
```

### CI checks (GitHub Actions, outline)

```yaml
name: QA Checks
on: { push: { branches: [main] }, pull_request: { branches: [main] } }
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci                                   # or install
      - name: "CHECK 1: Type check"
        run: npx tsc --noEmit
      - name: "CHECK 2: Builds (each with its own base path and rules)"
        run: <web build> && <desktop build> && <assert asset paths and service worker rules>
      - name: "CHECK 3: Domain checks"
        run: <bundle and run tools/checks/*.ts and the engine corpus>
      - name: "CHECK 4: Lint, no new errors"
        run: <eslint, compare the error count with the recorded number>
```

### Skill: shipping a change (`.claude/skills/steward/SKILL.md`)

```markdown
---
name: steward
description: How changes are made, checked, committed, reviewed and merged. Use for every code change and when handling PR or CI events.
---
1. Branch from the latest main (feature/ or fix/).
2. Read the spec, the lessons and (for UI) the design system.
3. Build it focused; plain words in the UI.
4. Checks: type check, builds, domain checks, lint (no new errors), every e2e test; look at the screenshots.
5. Bump the version (patch per change).
6. Commit: what users get, then what and why; the attribution lines; no model names.
7. Push with retries; never force-push.
8. PR: What / Testing.
9. CI green; fix failures at the root; merge with a merge commit.
10. Update OWNER_REQUESTS, DECISIONS, LESSONS, PRODUCT_SPEC, the user guide and the open work.
11. Tell the owner in plain words; the owner publishes releases.
Never: push tags, skip tests, ship a key in a web build, put copyrighted content in the repo, get around bot checks.
```

### Skill: design review (`.claude/skills/design-review/SKILL.md`)

```markdown
---
name: design-review
description: Check any UI change against the design system before it ships, and how to propose new designs. Use for any change to components, pages or CSS, or when the owner gives design feedback.
---
Before building: read DESIGN_SYSTEM.md. New screens or big changes: an HTML mock-up in docs/design/ with real content, both themes and real window sizes, shown to the owner; wait for yes.
Checklist (screenshot dark, light, 1440 wide, 3440 wide): <FOUNDATION §3.4 checklist>.
When the owner gives feedback: quote it into LESSONS.md, change DESIGN_SYSTEM.md if a rule changes, and show a new mock-up before rebuilding.
```

### Skill: end-to-end testing (`.claude/skills/e2e/SKILL.md`)

```markdown
---
name: e2e
description: Test the real app end to end (Playwright; Electron under Xvfb), with fake hardware and mock services. Use after any change people can see, before a PR.
---
1. Build for the target being tested (last, so another build doesn't overwrite it).
2. Run every test in tools/e2e/; each prints PASS/FAIL and exits non-zero on failure.
3. For the feature: write tools/e2e/<feature>.cjs with the shared helpers (launch, fake display, fake mic, seed data, check, done). Drive it the way a person does.
4. Read the screenshots it saves before calling it done.
5. Selectors: exact roles and names, scoped.
```

### A skill that carries this file

To give Claude this whole foundation everywhere (where Skills are available), make a folder named `foundation` containing:

- `SKILL.md`:

  ```markdown
  ---
  name: foundation
  description: The owner's foundation for designing, building, securing, testing, shipping and documenting any app or feature (design principles, architecture, security, tests, process). Use at the start of any app, product, UI, architecture, coding or documentation work.
  ---
  Read FOUNDATION.md in this folder and follow it. Start with section 0's short version; read the full section for the area you are working in (design §3, writing §4, architecture §6, security §7, testing §8, docs §9, shipping §10).
  ```
- `FOUNDATION.md`: this file.

Zip the folder and upload it in Claude's settings under Skills.

---

## 16. Reference: the Voice Verses design tokens

A worked example of [section 3](#3-design-principles), to start from and adapt.

```css
/* Light ("warm paper") */
--page: #efebe5; --win: #f7f4ef; --surface: #ffffff; --sunken: #ebe6de;
--ink: #1d1b20; --ink-2: #5d5862; --ink-3: #96909b; --line: rgba(40,30,50,.08);
--glass: rgba(250,247,242,.72);

/* Dark ("warm graphite"), the default for a dark room */
--page: #0e0d10; --win: #161518; --surface: #1f1d22; --sunken: #121114;
--ink: #f4f1f6; --ink-2: #b2abb7; --ink-3: #78727e; --line: rgba(255,245,255,.07);
--glass: rgba(30,28,34,.7);

/* Meaning (both themes): reserved, always with words */
--air: #ff3b30 (light) / #ff453a (dark);    /* ON AIR */
--next: #1fb954 (light) / #30d158 (dark);   /* NEXT */
--accent: the brand / team colour; --accent-soft: the same at about 16% alpha
```

- **Category colours** (gradients at 135°, only on the timeline and its chips): slate `#64748b → #334155`, orange `#fb923c → #ea580c`, violet `#a78bfa → #7c3aed`, teal `#2dd4bf → #0d9488`, amber `#fbbf24 → #d97706`, blue `#60a5fa → #2563eb`, rose `#fb7185 → #e11d48`, green `#4ade80 → #16a34a`, indigo `#818cf8 → #4f46e5`.
- **Ambient light:** two large radial gradients of the current content's main colours behind the window; opacity 0.14 light, 0.32 dark; 1.2 s transition.
- **Type:** UI `-apple-system, "SF Pro Text", Figtree, "Segoe UI Variable", system-ui`; display SF Pro Display or Figtree 700, −0.02em; reading text `Newsreader, "New York", "Iowan Old Style", Georgia`; tabular numbers for times.
- **Sizes:** UI ≥13px, body 14px, small labels 11px uppercase with letter spacing; reading text large (52px on the main screen) and capped at 36 characters a line.
- **Radius:** 16 window, 14 cards and the main button, 12 previews, 9–10 controls, pills round.
- **Shadow:** only on what floats, and the ON AIR glow.
- **Main action button:** quiet raised graphite (a subtle top-to-bottom gradient, inset highlight, soft drop shadow) with a small coloured icon; never a large slab of the brand colour next to meaning colours.
- **Practice band:** a violet striped band along the bottom with its words and "End practice".
- **Automation sign:** one small warm orb (gold to rose) that breathes slowly (still with reduced motion), marking everything the automation did or suggests; never red or green.
