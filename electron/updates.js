// Keeps installed copies up to date from this repository's GitHub Releases (package.json →
// build.publish), and tells the operator (1.19.9). Never interrupts a service: nothing restarts
// or opens by itself; the operator chooses when.
//
// - Checks when the app opens, then every 4 hours (a booth computer stays on for days), and
//   when the operator presses Check now (Settings → Desktop app → Updates).
// - Windows (and a signed Mac): the update downloads in the background; then "Restart to
//   update" installs it, or it installs the next time Voice Verses is quit.
// - An unsigned Mac can't install updates by itself (macOS refuses), so the right installer
//   for this Mac (Apple chip or Intel) is downloaded to the Downloads folder, checked against
//   the release's SHA-512, and opened when the operator chooses "Open the installer".
//
// The state lives here and the window asks for it when it opens, so an answer that arrives
// before the window is ready isn't lost (the 1.19.8 bug: a message sent once, at start).
import { app, BrowserWindow, shell } from 'electron';
import { createHash } from 'crypto';
import { createWriteStream, existsSync, readFileSync } from 'fs';
import { rename, rm, stat } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;
const here = dirname(fileURLToPath(import.meta.url));
const RELEASES = 'https://github.com/Towoadeyemi1/voice-verses/releases';
const EVERY = 4 * 60 * 60 * 1000;
// For tools/e2e/updates.cjs only: a local feed (latest-*.yml and the installers) and the Mac path
const TEST_FEED = process.env.VOICE_VERSES_UPDATE_FEED;
const TEST_MODE = process.env.VOICE_VERSES_UPDATE_MODE;

/** Written by the release workflow when the Mac build is signed and notarized. */
function isSignedBuild() {
  const file = join(here, 'build-info.json');
  try {
    return existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).signed === true;
  } catch {
    return false;
  }
}

let canSelfUpdate = false;
let state = { status: 'unsupported', current: app.getVersion() };
let info = null; // the latest release's update info (version, files with sha512)
let downloading = null;

function set(next) {
  state = { ...state, ...next, current: app.getVersion(), how: canSelfUpdate ? 'restart' : 'installer' };
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('app:update-state', state);
  }
}

export const updateState = () => state;

/** Looks for a newer version now. */
export async function checkForUpdates() {
  if (state.status === 'unsupported' || state.status === 'checking' || state.status === 'downloading') return state;
  set({ status: 'checking', error: undefined });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    set({ status: 'error', error: friendly(error) });
  }
  return state;
}

const friendly = (error) => {
  const text = String(error?.message ?? error);
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|net::ERR_INTERNET_DISCONNECTED|net::ERR_NAME_NOT_RESOLVED|getaddrinfo/i.test(text)) return 'No internet connection. Voice Verses will look again later.';
  return 'Couldn’t check for updates. Voice Verses will look again later.';
};

/** The installer for this Mac in the release: its name and SHA-512 (base64), if listed. */
function macInstaller() {
  const name = `Voice-Verses-mac-${process.arch === 'arm64' ? 'arm64' : 'x64'}.dmg`;
  const listed = (info?.files ?? []).find((f) => f.url === name || f.url?.endsWith(`/${name}`));
  return { name, sha512: listed?.sha512 };
}

/** Unsigned Mac: downloads this Mac's installer to Downloads, checked against the release. */
export async function downloadInstaller() {
  if (canSelfUpdate || !info || downloading) return state;
  const { name, sha512 } = macInstaller();
  const target = join(app.getPath('downloads'), name.replace('.dmg', `-${info.version}.dmg`));
  const partial = `${target}.download`;
  downloading = (async () => {
    set({ status: 'downloading', percent: 0, error: undefined });
    try {
      const res = await fetch(TEST_FEED ? `${TEST_FEED}/${name}` : `${RELEASES}/download/v${info.version}/${name}`, { redirect: 'follow' });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get('content-length')) || 0;
      const hash = createHash('sha512');
      const out = createWriteStream(partial);
      let done = 0;
      let shown = -1;
      for await (const chunk of res.body) {
        hash.update(chunk);
        done += chunk.length;
        if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
        const percent = total ? Math.floor((done / total) * 100) : 0;
        if (percent !== shown) {
          shown = percent;
          set({ percent });
        }
      }
      await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
      if (sha512 && hash.digest('base64') !== sha512) {
        await rm(partial, { force: true });
        throw new Error('checksum');
      }
      await rename(partial, target);
      set({ status: 'downloaded', file: target, percent: 100 });
    } catch (error) {
      await rm(partial, { force: true }).catch(() => {});
      set({ status: 'available', error: String(error?.message) === 'checksum' ? 'The download didn’t match the release, so it was deleted. Try again.' : 'The download stopped. Check the internet connection and try again.' });
    } finally {
      downloading = null;
    }
  })();
  return state;
}

/** Restart to update (Windows, signed Mac), or open the downloaded installer (unsigned Mac). */
export async function installUpdate() {
  if (state.status === 'ready' && canSelfUpdate) {
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return true;
  }
  if (state.status === 'downloaded' && state.file) {
    const exists = await stat(state.file).then(() => true, () => false);
    if (!exists) {
      set({ status: 'available', file: undefined, error: 'The installer was moved or deleted. Download it again.' });
      return false;
    }
    const error = await shell.openPath(state.file);
    return !error;
  }
  return false;
}

export function initUpdates() {
  if ((!app.isPackaged && !TEST_FEED) || process.env.VOICE_VERSES_DISABLE_UPDATES) return;
  if (TEST_FEED) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.setFeedURL({ provider: 'generic', url: TEST_FEED });
  }

  // macOS only installs updates for signed apps; unsigned builds download the installer instead
  canSelfUpdate = TEST_MODE ? TEST_MODE === 'restart' : process.platform !== 'darwin' || isSignedBuild();
  autoUpdater.autoDownload = canSelfUpdate;
  autoUpdater.autoInstallOnAppQuit = canSelfUpdate;
  set({ status: 'idle' });

  autoUpdater.on('update-available', (next) => {
    info = next;
    set({ status: canSelfUpdate ? 'downloading' : 'available', version: next.version, percent: 0, checkedAt: Date.now(), page: `${RELEASES}/tag/v${next.version}` });
  });
  autoUpdater.on('update-not-available', () => set({ status: 'latest', version: undefined, checkedAt: Date.now() }));
  autoUpdater.on('download-progress', (p) => set({ status: 'downloading', percent: Math.floor(p.percent ?? 0) }));
  autoUpdater.on('update-downloaded', (next) => set({ status: 'ready', version: next.version, percent: 100 }));
  autoUpdater.on('error', (error) => {
    console.warn('Update check failed:', error?.message);
    // A download that failed after the check: say so, keep what was found
    set(state.version ? { status: canSelfUpdate ? 'available' : state.status, error: friendly(error) } : { status: 'error', error: friendly(error) });
  });

  void checkForUpdates();
  // Booth computers stay on for days: look again every 4 hours (main-process timers aren't throttled)
  setInterval(() => {
    if (!['downloading', 'ready', 'downloaded'].includes(state.status)) void checkForUpdates();
  }, EVERY).unref?.();
}
