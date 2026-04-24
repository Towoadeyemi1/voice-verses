# Building Voice Verses Desktop Installers

## Quick Start

Once Node.js is installed and you've extracted the project:

```bash
cd voice-verses-main
npm install
npm run electron:build:mac
```

This creates: `dist-electron/Voice Verses-1.0.0.dmg`

Users can then double-click the .dmg to install like any Mac app!

## What Gets Created

**For Mac:**
- `Voice Verses-1.0.0.dmg` (Intel Macs)
- `Voice Verses-1.0.0-arm64.dmg` (Apple Silicon Macs)

**For Windows (if you build on Mac with Wine or on Windows):**
- `Voice Verses Setup 1.0.0.exe`

## Next Steps After Building

1. **Test the installer** - Double-click the .dmg and install
2. **Launch the app** - It opens like a normal desktop app  
3. **Test Ollama** - Go to Settings → Speech, configure Ollama (localhost:11434), it works!
4. **Upload to GitHub** - Create a new Release and attach the .dmg/.exe files
5. **Update Download tab** - Point users to the GitHub Release page

## Icon Files (Optional but Recommended)

Before building, add proper icons to the `public` folder:
- `icon.icns` for Mac (convert from PNG at https://cloudconvert.com/png-to-icns)
- `icon.ico` for Windows
- Use the existing logo/favicon as the source image

Without these, the app uses a default Electron icon.

## Distribution

Once you have the .dmg file, you can:
1. Create a GitHub Release at https://github.com/Towoadeyemi1/voice-verses/releases/new
2. Upload the .dmg and .exe files as release assets
3. Users download and install like any normal app
4. Update the Settings → Download tab to link to the GitHub Release

##Benefits for Users

✅ Double-click install (no Terminal commands needed)
✅ Shows up in Applications folder  
✅ All features work (Ollama, local speech, everything)
✅ No browser security restrictions
✅ Professional user experience
