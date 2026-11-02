// Outputs sent straight out of a Blackmagic DeckLink card's SDI ports (like
// ProPresenter), chosen in Settings → Screens. Each output is drawn in a hidden
// (offscreen) window at the port's size; every changed frame goes to the card
// through the native addon (native/decklink), which keeps sending the last frame
// until the next. macOS for now; needs Blackmagic Desktop Video installed.
import { app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { OUTPUTS } from './screens.js';
import { keepAwake } from './outputs.js';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

/** Video formats, as the switcher calls them; frame rate is how often a new picture is drawn. */
export const MODES = {
  '1080i5994': { label: '1080i 59.94', fps: 30, width: 1920, height: 1080 },
  '1080i50': { label: '1080i 50', fps: 25, width: 1920, height: 1080 },
  '1080p2997': { label: '1080p 29.97', fps: 30, width: 1920, height: 1080 },
  '1080p30': { label: '1080p 30', fps: 30, width: 1920, height: 1080 },
  '1080p25': { label: '1080p 25', fps: 25, width: 1920, height: 1080 },
  '1080p5994': { label: '1080p 59.94', fps: 60, width: 1920, height: 1080 },
  '1080p50': { label: '1080p 50', fps: 50, width: 1920, height: 1080 },
  '1080p60': { label: '1080p 60', fps: 60, width: 1920, height: 1080 },
  '720p5994': { label: '720p 59.94', fps: 60, width: 1280, height: 720 },
  '720p50': { label: '720p 50', fps: 50, width: 1280, height: 720 },
};
export const DEFAULT_MODE = '1080i5994';

const MESSAGES = {
  drivers: 'Blackmagic Desktop Video is not installed on this computer.',
  missing: 'That DeckLink port is not connected now.',
  'input-only': "This DeckLink port can't send video. In Blackmagic Desktop Video Setup, set its connector to output.",
  format: "This port can't send that video format. Choose the format your switcher uses.",
  busy: 'Another app (ProPresenter?) is using this DeckLink port. Choose a free port.',
  enable: 'The DeckLink port would not start. In Blackmagic Desktop Video Setup, check that its connector is set to output.',
  memory: 'Not enough memory for the DeckLink port.',
};

let addon;
/** The native addon for this computer, or null (not built for this system, or it failed to load). */
function loadAddon() {
  if (addon !== undefined) return addon;
  addon = null;
  // Tests only: a pretend card with two ports, which counts the frames it is given (tools/e2e/decklink.cjs)
  if (process.env.VOICE_VERSES_DECKLINK_MOCK === '1') {
    addon = mockAddon();
    return addon;
  }
  const candidates = [
    join(__dirname, '../native/decklink/prebuilt', `${process.platform}-${process.arch}`, 'decklink.node'),
    join(__dirname, '../native/decklink/build/Release/decklink.node'),
  ].map((p) => p.replace(`app.asar${process.platform === 'win32' ? '\\' : '/'}`, `app.asar.unpacked${process.platform === 'win32' ? '\\' : '/'}`));
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      addon = require(file);
      break;
    } catch (error) {
      console.warn('DeckLink output unavailable:', error.message);
    }
  }
  return addon;
}

const configFile = () => join(app.getPath('userData'), 'decklink.json');
let config = null; // { projection: { device, mode } | null, ... }
const running = new Map(); // output → { handle, device, mode, win, frames, since, error }
const statuses = new Map(); // output → last error, for a port that would not start
let makeWindow = null;
let suspended = false;

function loadConfig() {
  if (config) return config;
  try {
    config = JSON.parse(readFileSync(configFile(), 'utf8'));
  } catch {
    config = {};
  }
  return config;
}

/** Whether DeckLink output can work here, and the ports: { available, reason, devices: [{ name, canOutput }] }. */
export function listDevices() {
  const native = loadAddon();
  if (!native) return { available: false, reason: process.platform === 'darwin' ? 'not-built' : 'platform', devices: [] };
  let list = null;
  try {
    list = native.list();
  } catch {
    list = null;
  }
  if (!list) return { available: false, reason: 'drivers', devices: [] };
  return { available: true, devices: list.map((d) => ({ name: d.name, canOutput: d.canOutput })) };
}

export function getConfig() {
  const saved = loadConfig();
  return Object.fromEntries(
    Object.keys(OUTPUTS).map((output) => {
      const c = saved[output];
      return [output, c && typeof c.device === 'string' ? { device: c.device, mode: MODES[c.mode] ? c.mode : DEFAULT_MODE } : null];
    }),
  );
}

/** What each output on a DeckLink port is doing now, for Settings → Screens. */
export function getStatus() {
  const now = Date.now();
  return Object.fromEntries(
    Object.keys(OUTPUTS).map((output) => {
      const r = running.get(output);
      if (r) {
        const seconds = Math.max(1, (now - r.since) / 1000);
        return [output, { state: 'sending', device: r.device, mode: r.mode, framesPerSecond: Math.round(r.frames / seconds) }];
      }
      const error = statuses.get(output);
      return [output, error ? { state: 'error', message: error } : { state: 'off' }];
    }),
  );
}

export function setConfig(next) {
  config = Object.fromEntries(
    Object.keys(OUTPUTS).map((output) => {
      const c = next?.[output];
      return [output, c && typeof c.device === 'string' && c.device ? { device: c.device, mode: MODES[c.mode] ? c.mode : DEFAULT_MODE } : null];
    }),
  );
  try {
    writeFileSync(configFile(), JSON.stringify(config, null, 2));
  } catch {
    // Still applied for this session
  }
  apply();
  return getConfig();
}

function stop(output) {
  const r = running.get(output);
  running.delete(output);
  if (!r) return;
  try {
    addon?.close(r.handle);
  } catch {
    // Already gone
  }
  if (r.win && !r.win.isDestroyed()) r.win.destroy();
  keepAwake(`decklink-${output}`, false);
}

function start(output, wanted) {
  const native = loadAddon();
  statuses.delete(output);
  if (!native) {
    statuses.set(output, 'Sending to a DeckLink port needs the Mac version of Voice Verses.');
    return;
  }
  const list = native.list();
  if (!list) {
    statuses.set(output, MESSAGES.drivers);
    return;
  }
  const index = list.findIndex((d) => d.name === wanted.device);
  if (index < 0) {
    statuses.set(output, MESSAGES.missing);
    return;
  }
  const opened = native.open(index, wanted.mode);
  if (!opened || opened.error) {
    statuses.set(output, MESSAGES[opened?.error] ?? opened?.message ?? 'The DeckLink port would not start.');
    return;
  }
  const mode = MODES[wanted.mode];
  const { route, title, background } = OUTPUTS[output];
  const win = makeWindow(route, {
    show: false,
    width: mode.width,
    height: mode.height,
    useContentSize: true,
    frame: false,
    title,
    backgroundColor: background,
    webPreferences: { offscreen: true },
  });
  const r = { handle: opened.handle, device: wanted.device, mode: wanted.mode, win, frames: 0, since: Date.now(), test: 0 };
  running.set(output, r);
  keepAwake(`decklink-${output}`, true);
  win.webContents.setFrameRate(mode.fps);
  win.webContents.on('paint', (_event, _dirty, image) => {
    if (running.get(output) !== r || Date.now() < r.test) return;
    let frame = image;
    const size = frame.getSize();
    if (size.width !== mode.width || size.height !== mode.height) frame = frame.resize({ width: mode.width, height: mode.height });
    const sent = native.display(r.handle, frame.toBitmap(), mode.width, mode.height);
    if (sent === true) r.frames++;
  });
  win.on('closed', () => {
    if (running.get(output) === r) stop(output);
  });
}

/** Opens, changes or closes each output's DeckLink port to match the configuration. */
function apply() {
  if (suspended || !makeWindow) return;
  const wanted = getConfig();
  for (const output of Object.keys(OUTPUTS)) {
    const w = wanted[output];
    const r = running.get(output);
    if (!w) {
      stop(output);
      statuses.delete(output);
    } else if (!r || r.device !== w.device || r.mode !== w.mode) {
      stop(output);
      start(output, w);
    }
  }
}

/** Colour bars on an output's DeckLink port for a few seconds, to find it on the switcher. */
export function showTestPattern(output, seconds = 8) {
  const r = running.get(output);
  const native = loadAddon();
  if (!r || !native) return false;
  const { width, height } = MODES[r.mode];
  const bars = [
    [192, 192, 192], [192, 192, 0], [0, 192, 192], [0, 192, 0], [192, 0, 192], [192, 0, 0], [0, 0, 192],
  ];
  const buffer = Buffer.alloc(width * height * 4);
  for (let x = 0; x < width; x++) {
    const [red, green, blue] = bars[Math.min(bars.length - 1, Math.floor((x * bars.length) / width))];
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      buffer[i] = blue;
      buffer[i + 1] = green;
      buffer[i + 2] = red;
      buffer[i + 3] = 255;
    }
  }
  r.test = Date.now() + seconds * 1000;
  native.display(r.handle, buffer, width, height);
  // Then the output again
  setTimeout(() => {
    if (running.get(output) === r && !r.win.isDestroyed()) r.win.webContents.invalidate();
  }, seconds * 1000 + 50);
  return true;
}

export function initDeckLink(createWindow) {
  makeWindow = createWindow;
  apply();
}

/** The main window closed: stop sending (there would be nothing left to control the outputs). */
export function suspendDeckLink() {
  suspended = true;
  for (const output of Object.keys(OUTPUTS)) stop(output);
}

export function resumeDeckLink() {
  suspended = false;
  apply();
}

app.on('will-quit', () => {
  for (const output of Object.keys(OUTPUTS)) stop(output);
});

/** A pretend DeckLink card for end-to-end tests: two output ports; remembers the last frame's size and average colour. */
function mockAddon() {
  const sizes = { '1080i5994': [1920, 1080], '720p5994': [1280, 720] };
  const open = new Map();
  const seen = (globalThis.__decklinkMock = { frames: 0, byPort: {}, opened: [], closed: 0 });
  return {
    list: () => [
      { index: 0, name: 'DeckLink Duo (1)', canOutput: true },
      { index: 1, name: 'DeckLink Duo (2)', canOutput: true },
    ],
    open: (index, mode) => {
      const [width, height] = sizes[mode] ?? [1920, 1080];
      const handle = open.size + 1;
      open.set(handle, { index, width, height });
      seen.opened.push({ index, mode });
      return { handle, width, height };
    },
    display: (handle, buffer, width, height) => {
      const o = open.get(handle);
      if (!o) return 'closed';
      if (width !== o.width || height !== o.height) return 'size';
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < buffer.length; i += 4 * 997) {
        b += buffer[i];
        g += buffer[i + 1];
        r += buffer[i + 2];
        n++;
      }
      seen.frames++;
      const port = (seen.byPort[o.index] ??= { frames: 0 });
      Object.assign(port, { frames: port.frames + 1, width, height, r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) });
      return true;
    },
    close: (handle) => {
      if (open.delete(handle)) seen.closed++;
    },
  };
}
