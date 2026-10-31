---
name: release
description: How a Voice Verses version reaches users (GitHub release by the owner, lowercase v tag, the build-electron workflow, checking the installers, auto-update). Use when the owner asks to release, publish, or "update the app", or asks why a release didn't appear.
---

# Releasing

Claude sessions can't push tags (blocked), so the owner publishes:

1. Make sure everything to ship is merged to `main` and `qa` passed. `package.json` holds the version, for example 1.3.7.
2. Ask the owner to open **GitHub → Releases → Draft a new release**, create the tag **`v1.3.7`** on `main`, add notes, and click **Publish**.
   - The tag must start with a lowercase `v`: `V1.3.7` does not trigger the build.
   - The workflow writes the tag's version into the app, so the tag decides the version users see.
3. `.github/workflows/build-electron.yml` then builds:
   - Mac Apple chip and Intel (DMG and zip).
   - Windows (NSIS exe).
   - The speech models and native modules are included, and the files are attached to the release.
4. **Check it:** list the release assets and check that these names exist: `Voice-Verses-mac-arm64.dmg`, `Voice-Verses-mac-x64.dmg`, `Voice-Verses-Setup-win-x64.exe`, and `latest*.yml`.
   - If a run failed, read its job logs. A run that never starts usually means Actions billing; ask the owner to check their payment method.
5. The website deploys from `main` by itself (`deploy-pages.yml`).
6. **Tell the owner:**
   - Installed apps update on next quit. An unsigned Mac build shows an update notice with a download link instead.
   - Intel Macs need the `x64` build; the download page picks it automatically.

Signing and notarising need the owner's Apple Developer account (organisation enrolment recommended) and a Windows certificate. The secrets are optional in the workflow.
