# Building and releasing the desktop app

## Releasing (recommended)

Releases are built by GitHub Actions (`.github/workflows/build-electron.yml`):

```bash
git tag v1.2.0
git push origin v1.2.0
```

This builds, on GitHub's Mac and Windows machines:

| File | For |
| --- | --- |
| `Voice-Verses-mac-arm64.dmg` | Macs with an Apple chip (M1 and later) |
| `Voice-Verses-mac-x64.dmg` | Intel Macs |
| `Voice-Verses-Setup-win-x64.exe` | Windows 10 and later |

and publishes them as a GitHub Release, together with the `latest*.yml` files the
installed apps use to update themselves. The website's download buttons
(`src/lib/releases.ts`) always point at the latest release, so nothing needs
changing on the site.

Each installer includes everything: the app, the speech engine and the speech
model (about 700 MB in total). Nothing else needs installing.

## Code signing (optional, recommended before sharing widely)

Without signing, macOS asks people to approve the app in System Settings →
Privacy & Security the first time, Windows shows a SmartScreen warning, and Mac
copies show an "update available" notice instead of updating themselves.

To sign, add these repository secrets (Settings → Secrets and variables → Actions);
the workflow uses them automatically when present:

| Secret | What it is |
| --- | --- |
| `MAC_CERTIFICATE_P12_BASE64` | "Developer ID Application" certificate exported as .p12, base64-encoded |
| `MAC_CERTIFICATE_PASSWORD` | Password of that .p12 |
| `APPLE_ID` | Apple ID of the developer account (for notarization) |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for that Apple ID (appleid.apple.com) |
| `APPLE_TEAM_ID` | Team ID from the Apple Developer account |
| `WIN_CERTIFICATE_P12_BASE64` | Windows code-signing certificate as .p12, base64-encoded |
| `WIN_CERTIFICATE_PASSWORD` | Password of that .p12 |

## Building on your own computer

Needs Node.js 22.

```bash
npm install --legacy-peer-deps
npm run electron:build:mac     # or electron:build:win on Windows
```

`npm run models` (run automatically by the build scripts) downloads the speech
model into `resources/models` the first time (about 480 MB).

For development: `npm run electron:dev` runs the app against the Vite dev
server; `npm run electron:preview` runs the built app without packaging.
