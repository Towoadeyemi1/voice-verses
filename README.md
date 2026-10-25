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

- **Web app** (`npm run build`): static site, deployed to GitHub Pages by
  `.github/workflows/deploy-pages.yml`. Uses hash routes (`/voice-verses/#/presenter`)
  so popups and refreshes work on a sub-path.
- **Desktop app** (`npm run electron:build`): the same UI in Electron. The
  recommended way to run it in a church booth: works offline with the local
  speech engine, and keeps the OpenAI key encrypted in the OS keychain.
  `npm run electron:preview` runs the built app without packaging.
- **Azure Functions** (`azure-functions/`, optional): server-side OpenAI token
  minting, help assistant and blob sync. See `AZURE_DEPLOYMENT.md`.

### Speech engines

Transcription is pluggable (`src/speech/providers`); verse detection is always
done centrally by `VerseDetectionController`.

| Engine | Needs | Notes |
| --- | --- | --- |
| Browser (Web Speech) | Chrome/Edge/Safari | Default on the web. Free; not available in the desktop app |
| Local | `speech-service` installed | Offline and private |
| OpenAI | An OpenAI API key or a token server | Most accurate; uses `gpt-4o-transcribe` |
| Local AI | Ollama / LM Studio | Browser speech + local LLM for verse matching |

The OpenAI engine gets its short-lived session token from, in order: the token
server in `VITE_REALTIME_TOKEN_URL`; the desktop app's main process; or the
user's own key stored in the browser.

### Build-time configuration

| Variable | Purpose |
| --- | --- |
| `VITE_BASE_PATH` | Sub-path the web app is served from (`/voice-verses/` on GitHub Pages) |
| `VITE_REALTIME_TOKEN_URL` | Optional OpenAI token server; when unset, users enter their own key |
| `VITE_HELP_ASSISTANT_URL` | Optional help assistant backend; when unset, the assistant is hidden |

## How can I deploy this project?

This project can be deployed to any static hosting service that supports Vite applications.

Build the project with `npm run build` and deploy the `dist` folder to your hosting provider.
