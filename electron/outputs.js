// Output windows (projection, confidence monitor, lower third) and keeping the
// computer awake during a service.
//
// Each output window reopens on the screen, at the size, and in the fullscreen
// state it was left in. The first time, the projection goes fullscreen on the
// first external screen if there is one, so on a booth computer with a
// projector attached it lands in the right place without dragging.
import { app, powerSaveBlocker, screen } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const OUTPUT_ROUTE = /#\/(projection|confidence|lower-third)\b/;
const placementsFile = () => join(app.getPath('userData'), 'output-windows.json');

let placements = null;

function loadPlacements() {
  if (placements) return placements;
  try {
    placements = JSON.parse(readFileSync(placementsFile(), 'utf8'));
  } catch {
    placements = {};
  }
  return placements;
}

function savePlacements() {
  try {
    writeFileSync(placementsFile(), JSON.stringify(placements, null, 2));
  } catch {
    // Not worth interrupting a service over; the window just won't be remembered
  }
}

/** Keeps the display (and so the projector) from sleeping while any reason is active. */
const awakeReasons = new Set();
let blockerId = null;

export function keepAwake(reason, on) {
  if (on) awakeReasons.add(reason);
  else awakeReasons.delete(reason);
  if (awakeReasons.size > 0 && blockerId === null) {
    blockerId = powerSaveBlocker.start('prevent-display-sleep');
  } else if (awakeReasons.size === 0 && blockerId !== null) {
    powerSaveBlocker.stop(blockerId);
    blockerId = null;
  }
}

function clampTo(bounds, area) {
  const width = Math.min(bounds.width, area.width);
  const height = Math.min(bounds.height, area.height);
  return {
    width,
    height,
    x: Math.min(Math.max(bounds.x, area.x), area.x + area.width - width),
    y: Math.min(Math.max(bounds.y, area.y), area.y + area.height - height),
  };
}

const outputRoute = (url) => OUTPUT_ROUTE.exec(url)?.[1];

/**
 * Window options for an output window: where it opens. Given when the window is
 * created so they take precedence over the size the page asked for.
 */
export function outputWindowOptions(url) {
  const route = outputRoute(url);
  if (!route) return {};
  const options = { backgroundColor: route === 'lower-third' ? '#00FF00' : '#000000' };

  const saved = loadPlacements()[route];
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  let display = saved && displays.find((d) => d.id === saved.displayId);
  let fullscreen = saved?.fullscreen ?? false;
  if (!display && route === 'projection') {
    display = displays.find((d) => d.id !== primary.id);
    fullscreen = Boolean(display);
  }
  if (display) {
    const bounds = saved?.displayId === display.id && saved.bounds ? saved.bounds : display.workArea;
    Object.assign(options, clampTo(bounds, display.workArea), { fullscreen });
  }
  return options;
}

/** Keeps the screens awake while an output window is open, and remembers where the operator puts it. */
export function trackOutputWindow(win, url) {
  const route = outputRoute(url);
  if (!route) return;

  const reason = `output-${win.id}`;
  keepAwake(reason, true);
  win.on('closed', () => keepAwake(reason, false));

  const remember = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getNormalBounds();
    loadPlacements()[route] = {
      displayId: screen.getDisplayMatching(bounds).id,
      bounds,
      fullscreen: win.isFullScreen(),
    };
    savePlacements();
  };
  for (const event of ['moved', 'resized', 'enter-full-screen', 'leave-full-screen', 'close']) {
    win.on(event, remember);
  }
}
