# Cornerstone Bible

## Project info

Voice-activated Scripture Projection System

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE.**

Clone this repository and work locally using your preferred IDE.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Architecture

- **Desktop app** (`BUILD_GUIDE.md`): the main way to run Voice Verses in a church. One
  installer per platform includes the speech model; it updates itself from GitHub Releases.
  Works offline, keeps API keys encrypted with the OS keychain, and saves the library to a
  folder. `npm run electron:preview` runs the built app without packaging.
- **Web app** (`npm run build`): the same UI as a static site on GitHub Pages
  (`.github/workflows/deploy-pages.yml`), using hash routes (`/voice-verses/#/presenter`).
  There is no server: keys a user enters stay in their browser.

### Hearing: speech engines

Speech-to-text is pluggable (`src/speech/providers`).

| Engine | Needs | Notes |
| --- | --- | --- |
| Built-in | Desktop app | Default on desktop. Offline, free, private: NVIDIA Parakeet + Silero VAD via sherpa-onnx, in a background process (`electron/speech`) |
| Browser (Web Speech) | Chrome/Edge | Default on the web. Free; audio goes to the browser maker |
| OpenAI | An OpenAI API key | Cloud transcription with `gpt-4o-transcribe` |

How the built-in engine was chosen, and how to re-run the comparison:
[`docs/speech-engine-evaluation.md`](docs/speech-engine-evaluation.md). Settings →
Speech → **Test with a recording** runs it on any recorded service.

### Understanding: verse detection

`VerseDetectionController` turns transcripts into verses. Named references ("John 3:16",
"Romans chapter 8 verse 28") are matched by rules, instantly and offline.

The optional **AI verse assistant** (`src/ai`, Settings → Speech) handles passages that are
quoted or described instead of named. It works with any speech engine and any of:
Claude (Anthropic API key), OpenAI (API key), Ollama, or another local OpenAI-compatible
server (LM Studio, Jan, llama.cpp). Answers are checked against the Bible text, and by
default appear as a suggestion the operator confirms. The in-app help assistant uses the
same provider.

### Showing it: outputs and ProPresenter

Voice Verses has its own projection, confidence monitor and green-screen lower third
windows. They all follow one shared "what is live" record (`src/lib/syncService.ts`), so a
window opened or reloaded mid-service shows what is on screen at once. Text shrinks to
fit, and the KJV's supplied words show in italics. The desktop app (`electron/outputs.js`)
remembers which screen each window goes on and keeps the computer awake during a service.

Voice Verses runs the screens itself. Churches that also have **ProPresenter** (7.9 or
later) can send each verse there too, Settings → ProPresenter, or open an optional
companion screen (`src/pages/ProPresenterLive.tsx`) for an operator who only sends verses
to ProPresenter. The microphone can be one channel of a multichannel desk feed
(`src/speech/audioInput.ts`).

The ProPresenter connection lives in `electron/propresenter.js`. ProPresenter's API has no Bible
endpoint, so verses go through a ProPresenter message named "Voice Verses" with `{Verse}`
and `{Reference}` tokens; ProPresenter's own theme and Looks decide how and where it shows.
`node tools/propresenter-check.mjs` tests the client against a stand-in ProPresenter.

### Templates, countdowns, media and songs

- **Templates** (`src/lib/templates.ts`, Templates page): the look of scripture, songs,
  announcements and countdowns per output; drawn by `TemplateRenderer`, which every output
  and preview uses.
- **Countdowns** (`src/lib/countdown.ts`): minutes or until a time of day; outputs compute
  the time from the end time, so all screens agree.
- **Videos** (`src/lib/mediaFiles.ts`): stored as files in IndexedDB on this computer;
  template backgrounds and video slides.
- **Songs** (`src/lib/songs.ts`): sections written once, arrangements, CCLI credits.
- **Network outputs** (`electron/network.js`, `src/lib/networkPublisher.ts`): the desktop
  app serves the outputs to browsers on the LAN, with live updates over Server-Sent Events.

### Storage

Services and media are saved on the computer (IndexedDB). Optionally, Settings → Storage
keeps a copy in a **library folder** (`src/lib/library`): one JSON file per item, synced
both ways. Choosing a folder inside iCloud Drive, Dropbox, OneDrive or Google Drive shares
the library between computers; if the same service is edited on two computers at once,
both versions are kept. Single services can also be exported to a `.voiceverses.json` file
and imported elsewhere.

### Build-time configuration

| Variable | Purpose |
| --- | --- |
| `VITE_BASE_PATH` | Sub-path the web app is served from (`/voice-verses/` on GitHub Pages) |

## How can I deploy this project?

This project can be deployed to any static hosting service that supports Vite applications.

Build the project with `npm run build` and deploy the `dist` folder to your hosting provider.

## Working on Voice Verses

Start with [`CLAUDE.md`](CLAUDE.md), which holds the rules and a map of the code. Then read:

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md): everything the app does.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): why it is built this way.
- [`docs/LESSONS.md`](docs/LESSONS.md): mistakes not to repeat.
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md): how it must look.
- [`docs/REBUILD.md`](docs/REBUILD.md): how to build it again from nothing.

Step-by-step procedures for testing, shipping, releasing, detection work and design review are in `.claude/skills/`. The desktop end-to-end checks are in [`tools/e2e/`](tools/e2e/README.md).
