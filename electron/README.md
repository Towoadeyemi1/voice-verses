# Voice Verses - Electron Desktop App

This directory contains the Electron configuration for packaging Voice Verses as a native desktop application.

## Building Installers

### Prerequisites
- Node.js 18+ installed
- For Mac builds: macOS with Xcode Command Line Tools
- For Windows builds: Windows or Mac/Linux with Wine

### Build Commands

**Build for current platform:**
```bash
npm run electron:build
```

**Build for Mac only (.dmg):**
```bash
npm run electron:build:mac
```

**Build for Windows only (.exe):**
```bash
npm run electron:build:win
```

**Build for both Mac and Windows:**
```bash
npm run electron:build:all
```

### Output

Installers will be created in the `dist-electron` directory:
- **Mac**: `Voice Verses-1.0.0.dmg` and `Voice Verses-1.0.0-arm64.dmg`
- **Windows**: `Voice Verses Setup 1.0.0.exe`

### Development

To run the Electron app in development mode:
```bash
npm run electron:dev
```

This starts both Vite dev server and Electron, with hot reload enabled.

## Icon Requirements

For proper packaging, you need icon files in the `public` directory:
- **Mac**: `icon.icns` (512x512 or 1024x1024)
- **Windows**: `icon.ico` (256x256)  
- **Linux**: `icon.png` (512x512)

You can generate these from a single PNG using tools like:
- https://cloudconvert.com/png-to-icns
- https://cloudconvert.com/png-to-ico

## Code Signing (Optional but Recommended)

### Mac
Requires Apple Developer account ($99/year):
1. Get a Developer ID Application certificate
2. Add to `package.json` build config:
```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)"
}
```

### Windows  
Requires a code signing certificate:
1. Purchase certificate from a trusted CA
2. Configure in electron-builder

## Distribution

Once built, you can:
1. Upload installers to GitHub Releases
2. Host on your own server
3. Submit to app stores (Mac App Store, Microsoft Store)

##Notes
- Users can now install Voice Verses like any normal app
- All speech modes work, including Local (Offline) and Local AI (Ollama)
- No browser security restrictions on localhost connections
