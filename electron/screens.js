// Screens: which display each output (projector, confidence monitor, lower
// third) is shown on, chosen in Settings → Screens. The app opens each output
// full screen on its display whenever it starts, keeps it there, and brings it
// back when a display is unplugged and reconnected; nobody has to open, drag or
// arrange windows. Like ProPresenter's screen configuration.
import { app, BrowserWindow, screen } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { keepAwake } from './outputs.js';

export const OUTPUTS = {
  projection: { route: '/projection', title: 'Voice Verses – Projector', background: '#000000' },
  confidence: { route: '/confidence', title: 'Voice Verses – Confidence monitor', background: '#000000' },
  lowerThird: { route: '/lower-third', title: 'Voice Verses – Lower third', background: '#00FF00' },
};

const configFile = () => join(app.getPath('userData'), 'screens.json');
let config = null; // { projection: displayId | null, ... }
const windows = new Map(); // output → BrowserWindow
let makeWindow = null;
let suspended = false; // while the operator's main window is closed

function loadConfig() {
  if (config) return config;
  try {
    config = JSON.parse(readFileSync(configFile(), 'utf8'));
  } catch {
    config = {};
  }
  return config;
}

/** The displays connected now, described for the operator. */
export function listDisplays() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: d.label || `Display ${i + 1}`,
    width: d.size.width,
    height: d.size.height,
    primary: d.id === primary.id,
  }));
}

export function getConfig() {
  const saved = loadConfig();
  return Object.fromEntries(Object.keys(OUTPUTS).map((output) => [output, saved[output] ?? null]));
}

function close(output) {
  const win = windows.get(output);
  windows.delete(output);
  if (win && !win.isDestroyed()) win.destroy();
}

function place(win, display) {
  const { x, y, width, height } = display.bounds;
  if (process.platform === 'darwin') win.setSimpleFullScreen(false);
  else win.setFullScreen(false);
  win.setBounds({ x, y, width, height });
  // Simple full screen on macOS: fills the display without a separate Space or animation
  if (process.platform === 'darwin') win.setSimpleFullScreen(true);
  else win.setFullScreen(true);
}

function open(output, display) {
  const { route, title, background } = OUTPUTS[output];
  const win = makeWindow(route, {
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    show: false,
    title,
    backgroundColor: background,
    skipTaskbar: true,
  });
  windows.set(output, win);
  win.on('page-title-updated', (event) => event.preventDefault());
  const reason = `screen-${output}`;
  keepAwake(reason, true);
  win.on('closed', () => {
    keepAwake(reason, false);
    if (windows.get(output) === win) windows.delete(output);
  });
  // Esc on an output that covers the operator's own screen turns it off, so nobody is stuck behind it
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && screen.getDisplayMatching(win.getBounds()).id === screen.getPrimaryDisplay().id) {
      event.preventDefault();
      // Not from inside this window's own input event, which closing it would cut short
      setImmediate(() => setConfig({ ...getConfig(), [output]: null }));
    }
  });
  win.once('ready-to-show', () => {
    // The operator keeps working (and typing) in their own window
    const operator = BrowserWindow.getFocusedWindow();
    win.showInactive();
    place(win, display);
    if (operator && !operator.isDestroyed() && BrowserWindow.getFocusedWindow() !== operator) operator.focus();
  });
}

/** Opens, moves or closes each output to match the configuration and the displays connected. */
function apply() {
  if (suspended || !makeWindow) return;
  const displays = screen.getAllDisplays();
  for (const output of Object.keys(OUTPUTS)) {
    const display = displays.find((d) => d.id === loadConfig()[output]);
    const win = windows.get(output);
    if (!display) {
      close(output);
    } else if (!win || win.isDestroyed()) {
      open(output, display);
    } else if (screen.getDisplayMatching(win.getBounds()).id !== display.id) {
      place(win, display);
    }
  }
}

export function setConfig(next) {
  config = Object.fromEntries(
    Object.keys(OUTPUTS).map((output) => {
      const id = next?.[output];
      return [output, typeof id === 'number' && Number.isFinite(id) ? id : null];
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

/**
 * Starts managing the outputs. `createWindow(route, options)` makes an app
 * window showing that route (main.js knows the app's URL and security settings).
 */
export function initScreens(createWindow) {
  makeWindow = createWindow;
  apply();
  screen.on('display-added', apply);
  screen.on('display-removed', apply);
  screen.on('display-metrics-changed', apply);
}

/** Closes every output, e.g. when the operator closes the main window (there would be nothing left to control them). */
export function suspendScreens() {
  suspended = true;
  for (const output of Object.keys(OUTPUTS)) close(output);
}

/** Puts the outputs back on their displays (the main window is open again). */
export function resumeScreens() {
  suspended = false;
  apply();
}
