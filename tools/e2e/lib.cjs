/**
 * Helpers for driving the desktop app in tests (Playwright's Electron support).
 * Build the renderer first:  ELECTRON_BUILD=true npx vite build
 * Run on Linux under Xvfb:   xvfb-run -a -s "-screen 0 3840x1600x24" node tools/e2e/<script>.cjs
 */
const { _electron: electron } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = process.env.E2E_OUT || path.join(os.tmpdir(), 'vv-e2e');
fs.mkdirSync(OUT, { recursive: true });

/**
 * Starts the app with a fresh profile. `audio` is a WAV file the fake
 * microphone plays (see make-sermon-audio.py); it is played once.
 */
async function launch(name, { audio } = {}) {
  const profile = path.join(OUT, `profile-${name}`);
  fs.rmSync(profile, { recursive: true, force: true });
  const args = ['--no-sandbox', `--user-data-dir=${profile}`];
  if (audio) args.push('--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${audio}%noloop`);
  const app = await electron.launch({ executablePath: require(path.join(ROOT, 'node_modules/electron')), args: [...args, ROOT], env: { ...process.env, ELECTRON_LOAD_DIST: '1' } });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => { if (m.type() === 'error' && !/audio devices|favicon/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await win.waitForTimeout(2000);
  return { app, win, errors };
}

const setBounds = (app, width, height) =>
  app.evaluate(({ BrowserWindow }, b) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, ...b }), { width, height });

/** Xvfb has one display: pretend a second one (an HDMI-to-SDI converter) is plugged in to the right. */
const plugInSecondDisplay = (app) =>
  app.evaluate(({ screen }) => {
    const main = screen.getPrimaryDisplay();
    const second = { ...main, id: 4242, label: 'HDMI-SDI', bounds: { x: 1440, y: 0, width: 1920, height: 1080 }, workArea: { x: 1440, y: 0, width: 1920, height: 1080 }, size: { width: 1920, height: 1080 }, workAreaSize: { width: 1920, height: 1080 } };
    const first = { ...main, bounds: { x: 0, y: 0, width: 1440, height: 1080 }, size: { width: 1440, height: 1080 } };
    screen.getAllDisplays = () => [first, second];
    screen.getPrimaryDisplay = () => first;
    screen.getDisplayMatching = (r) => (r.x + r.width / 2 >= 1440 ? second : first);
    screen.emit('display-added', {}, second);
  });

/** Puts a verse on every screen without speech (as if the operator sent it). */
const showVerse = (win, verse) =>
  win.evaluate((v) => localStorage.setItem('voice-verses-live', JSON.stringify({ type: 'VERSE_UPDATE', data: { verse: v } })), verse);

/** Adds items to the IndexedDB media store (songs, pictures). Creates the stores on a fresh profile. */
const seedMedia = (win, items) =>
  win.evaluate((items) => new Promise((res, rej) => {
    const r = indexedDB.open('cornerstone-bible-db', 2);
    r.onupgradeneeded = () => {
      for (const n of ['services', 'media']) r.result.createObjectStore(n, { keyPath: 'id' });
      for (const n of ['settings', 'state', 'files']) r.result.createObjectStore(n);
    };
    r.onsuccess = () => {
      const tx = r.result.transaction('media', 'readwrite');
      for (const item of items) tx.objectStore('media').put({ createdAt: new Date(), ...item });
      tx.oncomplete = () => { r.result.close(); res(); };
      tx.onerror = () => rej(new Error('seed failed'));
    };
    r.onerror = () => rej(new Error('open failed'));
  }), items);

/** The stage canvas inside an output page: its CSS size, e.g. "3840px x 1080px". */
const stageSize = (page) =>
  page.evaluate(() => {
    const t = [...document.querySelectorAll('div')].find((d) => d.style.width && d.style.height === '1080px');
    return t ? `${t.style.width} x ${t.style.height}` : 'none';
  });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const done = () => { console.log(failures ? `\n${failures} failed` : '\nall passed'); process.exit(failures ? 1 : 0); };

module.exports = { ROOT, OUT, launch, setBounds, plugInSecondDisplay, showVerse, seedMedia, stageSize, check, done };
