// Keeps installed copies up to date from this repository's GitHub Releases
// (package.json → build.publish). Never interrupts a service: updates download
// in the background and install when the app quits.
import { app, BrowserWindow } from 'electron';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;
const here = dirname(fileURLToPath(import.meta.url));

/** Written by the release workflow when the Mac build is signed and notarized. */
function isSignedBuild() {
  const file = join(here, 'build-info.json');
  try {
    return existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).signed === true;
  } catch {
    return false;
  }
}

export function initUpdates() {
  if (!app.isPackaged || process.env.VOICE_VERSES_DISABLE_UPDATES) return;

  // macOS only installs updates for signed apps; unsigned builds point people to the download instead
  const canSelfUpdate = process.platform !== 'darwin' || isSignedBuild();
  autoUpdater.autoDownload = canSelfUpdate;
  autoUpdater.autoInstallOnAppQuit = canSelfUpdate;

  autoUpdater.on('update-available', (info) => {
    if (canSelfUpdate) return;
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('app:update-available', {
        version: info.version,
        url: `https://github.com/Towoadeyemi1/voice-verses/releases/tag/v${info.version}`,
      });
    }
  });
  autoUpdater.on('error', (error) => console.warn('Update check failed:', error.message));

  autoUpdater.checkForUpdates().catch(() => {});
}
