// NDI® output: each output (projector, lower third, stage monitor) can be sent
// over the network as an NDI source, for vMix, OBS, TriCaster, NDI converters
// and anything else that receives NDI. Chosen in Settings → Screens and outputs.
//
// NDI® is a registered trademark of Vizrt NDI AB (https://ndi.video/).
//
// Voice Verses doesn't ship NDI's library (its licence keeps it with NDI): it
// uses the free NDI Runtime when the computer has it (NDI Tools, vMix and OBS's
// NDI plugin install it), through a small foreign-function binding (koffi), so
// nothing is compiled. Each output is drawn in a hidden (offscreen) window,
// exactly like a DeckLink port (rule 5: one renderer), and each changed frame is
// sent; the last frame is sent again every second so receivers never time out.
// The lower third is see-through over NDI: no green to key out.
import { app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { hostname } from 'os';
import { OUTPUTS } from './screens.js';
import { keepAwake } from './outputs.js';
import { BGRA, BGRX, PROGRESSIVE, runtimeCandidates, TIMECODE_SYNTHESIZE, unpremultiply } from './ndiFrames.js';

const require = createRequire(import.meta.url);

/** The source names receivers list, e.g. "MEDIA-MAC (Voice Verses Projector)" */
export const SOURCE_NAMES = { projection: 'Voice Verses Projector', lowerThird: 'Voice Verses Lower third', confidence: 'Voice Verses Stage' };
const SIZE = { width: 1920, height: 1080 };
const FPS = 30;
const REPEAT_MS = 1000;

// ---- The NDI Runtime ----------------------------------------------------------------------

let ndi; // undefined: not tried; null: not available; else the bound functions
let ndiError = null;

/** The NDI functions, or null when the NDI Runtime isn't on this computer. */
function loadNdi() {
  if (ndi !== undefined) return ndi;
  ndi = null;
  let koffi;
  try {
    koffi = require('koffi');
  } catch (error) {
    ndiError = 'NDI output is not available in this copy of Voice Verses.';
    console.warn('koffi unavailable:', error.message);
    return ndi;
  }
  const file = runtimeCandidates().find((f) => existsSync(f));
  if (!file) {
    ndiError = 'runtime';
    return ndi;
  }
  try {
    const lib = koffi.load(file);
    // Layouts from NDI's public documentation (Processing.NDI.structs.h / Send.h)
    // NDI may keep the name it is given, so it is passed as a buffer that lives as long as the sender
    const SendCreate = koffi.struct('VV_NDIlib_send_create_t', { p_ndi_name: 'void *', p_groups: 'void *', clock_video: 'bool', clock_audio: 'bool' });
    const VideoFrame = koffi.struct('VV_NDIlib_video_frame_v2_t', {
      xres: 'int',
      yres: 'int',
      FourCC: 'uint32_t',
      frame_rate_N: 'int',
      frame_rate_D: 'int',
      picture_aspect_ratio: 'float',
      frame_format_type: 'int',
      timecode: 'int64_t',
      p_data: 'void *',
      line_stride_in_bytes: 'int',
      p_metadata: 'const char *',
      timestamp: 'int64_t',
    });
    ndi = {
      koffi,
      VideoFrame,
      initialize: lib.func('bool NDIlib_initialize()'),
      version: lib.func('const char * NDIlib_version()'),
      sendCreate: lib.func('void * NDIlib_send_create(const VV_NDIlib_send_create_t *)'),
      sendVideo: lib.func('void NDIlib_send_send_video_v2(void *, const VV_NDIlib_video_frame_v2_t *)'),
      connections: lib.func('int NDIlib_send_get_no_connections(void *, uint32_t)'),
      sendDestroy: lib.func('void NDIlib_send_destroy(void *)'),
      SendCreate,
    };
    if (!ndi.initialize()) {
      ndiError = 'This computer’s processor can’t run NDI.';
      ndi = null;
    }
  } catch (error) {
    console.warn('NDI Runtime could not be loaded:', error.message);
    ndiError = 'The NDI Runtime on this computer could not be loaded. Reinstall it from ndi.video.';
    ndi = null;
  }
  return ndi;
}

// ---- Configuration and the running senders --------------------------------------------------

const configFile = () => join(app.getPath('userData'), 'ndi.json');
let config = null; // { projection: true, lowerThird: false, confidence: false }
const running = new Map(); // output → { sender, win, frames, since, last, timer, alpha }
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

export function getConfig() {
  const saved = loadConfig();
  return Object.fromEntries(Object.keys(OUTPUTS).map((o) => [o, saved[o] === true]));
}

export function setConfig(next) {
  config = Object.fromEntries(Object.keys(OUTPUTS).map((o) => [o, next?.[o] === true]));
  try {
    writeFileSync(configFile(), JSON.stringify(config, null, 2));
  } catch {
    // Still applied for this session
  }
  apply();
  return getConfig();
}

/** Whether NDI can be sent from here: { available, reason, version, names, machine } */
export function getAvailability() {
  const lib = loadNdi();
  return lib
    ? { available: true, version: String(lib.version() ?? ''), names: SOURCE_NAMES, machine: hostname().toUpperCase() }
    : { available: false, reason: ndiError === 'runtime' ? 'runtime' : 'error', message: ndiError === 'runtime' ? null : ndiError, names: SOURCE_NAMES, machine: hostname().toUpperCase() };
}

/** What each output is doing over NDI, for Settings: sending (with receivers watching and pictures a second) or off. */
export function getStatus() {
  const now = Date.now();
  return Object.fromEntries(
    Object.keys(OUTPUTS).map((o) => {
      const r = running.get(o);
      if (!r) return [o, { state: 'off' }];
      let receivers = 0;
      try {
        receivers = ndi.connections(r.sender, 0);
      } catch {
        receivers = 0;
      }
      const seconds = Math.max(1, (now - r.since) / 1000);
      return [o, { state: 'sending', name: SOURCE_NAMES[o], receivers, framesPerSecond: Math.round(r.frames / seconds), seeThrough: r.alpha }];
    }),
  );
}

function stop(output) {
  const r = running.get(output);
  running.delete(output);
  if (!r) return;
  clearInterval(r.timer);
  // A frame still being sent is finished first; the sender is closed after it
  r.stopped = true;
  if (!r.busy) {
    try {
      ndi?.sendDestroy(r.sender);
    } catch {
      // Already gone
    }
  }
  if (r.win && !r.win.isDestroyed()) r.win.destroy();
  keepAwake(`ndi-${output}`, false);
}

/**
 * Sends the latest frame on NDI's own thread (koffi's async call), so compressing
 * it never holds up the app. One send at a time per output; a newer frame that
 * arrives meanwhile replaces any waiting one.
 */
function send(r) {
  if (!r.last) return;
  if (r.busy) {
    r.pending = true;
    return;
  }
  r.busy = true;
  r.pending = false;
  const data = r.last;
  const frame = {
    xres: SIZE.width,
    yres: SIZE.height,
    FourCC: r.alpha ? BGRA : BGRX,
    frame_rate_N: FPS * 1000,
    frame_rate_D: 1000,
    picture_aspect_ratio: SIZE.width / SIZE.height,
    frame_format_type: PROGRESSIVE,
    timecode: TIMECODE_SYNTHESIZE,
    p_data: data,
    line_stride_in_bytes: SIZE.width * 4,
    p_metadata: null,
    timestamp: 0n,
  };
  ndi.sendVideo.async(r.sender, frame, (error) => {
    r.busy = false;
    if (error) console.warn('NDI send failed:', error.message);
    else r.frames++;
    if (r.stopped) return ndi.sendDestroy(r.sender);
    if (r.pending) send(r);
  });
}

function start(output) {
  const lib = loadNdi();
  if (!lib) return;
  const name = Buffer.from(`${SOURCE_NAMES[output]}\0`, 'utf8');
  const sender = lib.sendCreate({ p_ndi_name: name, p_groups: null, clock_video: false, clock_audio: false });
  if (!sender) return;
  const { route, title } = OUTPUTS[output];
  // The lower third goes see-through, so receivers need no keying
  const alpha = output === 'lowerThird';
  const win = makeWindow(alpha ? `${route}?transparent=1` : route, {
    show: false,
    width: SIZE.width,
    height: SIZE.height,
    useContentSize: true,
    frame: false,
    transparent: alpha,
    title: `${title} (NDI)`,
    backgroundColor: alpha ? '#00000000' : OUTPUTS[output].background,
    webPreferences: { offscreen: true },
  });
  const r = { sender, name, win, frames: 0, since: Date.now(), last: null, alpha, timer: null, busy: false, pending: false, stopped: false };
  running.set(output, r);
  keepAwake(`ndi-${output}`, true);
  win.webContents.setFrameRate(FPS);
  win.webContents.on('paint', (_event, _dirty, image) => {
    if (running.get(output) !== r) return;
    let frame = image;
    const size = frame.getSize();
    if (size.width !== SIZE.width || size.height !== SIZE.height) frame = frame.resize({ width: SIZE.width, height: SIZE.height });
    const bitmap = Buffer.from(frame.toBitmap());
    r.last = alpha ? unpremultiply(bitmap) : bitmap;
    send(r);
  });
  // Receivers keep the picture even when nothing changes
  r.timer = setInterval(() => running.get(output) === r && send(r), REPEAT_MS);
  win.on('closed', () => {
    if (running.get(output) === r) stop(output);
  });
}

/** Starts or stops each output's NDI source to match the settings. */
function apply() {
  if (suspended || !makeWindow) return;
  const wanted = getConfig();
  for (const output of Object.keys(OUTPUTS)) {
    if (!wanted[output]) stop(output);
    else if (!running.has(output)) start(output);
  }
}

export function initNdi(createWindow) {
  makeWindow = createWindow;
  apply();
}

/** The main window closed: stop sending (nothing would be left to control the outputs). */
export function suspendNdi() {
  suspended = true;
  for (const output of Object.keys(OUTPUTS)) stop(output);
}

export function resumeNdi() {
  suspended = false;
  apply();
}

app.on('will-quit', () => {
  for (const output of Object.keys(OUTPUTS)) stop(output);
});
