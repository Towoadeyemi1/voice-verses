/**
 * Keeps moving backgrounds from ever making the screens stutter.
 *
 * Each computer has its own choice (Settings → Screens):
 * - Automatic (default): backgrounds move, but the first time an output shows
 *   one, it measures how smoothly the screen is drawn. If this computer can't
 *   keep up (under 40 frames a second), moving backgrounds stand still on
 *   every screen from then on, and Settings says so with a "Try again" button.
 * - Always move, or Keep still.
 *
 * localStorage belongs to this computer only, so a fast computer and a slow
 * one in the same church each decide for themselves.
 */

export type MotionMode = 'auto' | 'full' | 'still';

const MODE_KEY = 'voice-verses-motion';
const SLOW_KEY = 'voice-verses-motion-slow';
export const MOTION_CHANGED = 'voice-verses-motion-changed';

/** Smooth enough for slow backgrounds; below this they stand still (in Automatic). */
export const MIN_SMOOTH_FPS = 40;

export function motionMode(): MotionMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'full' || v === 'still' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/** When this computer was found too slow (and how smooth it was), or null. */
export function slowFinding(): { at: string; fps: number } | null {
  try {
    const v = localStorage.getItem(SLOW_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

const notify = () => window.dispatchEvent(new Event(MOTION_CHANGED));

export function setMotionMode(mode: MotionMode): void {
  localStorage.setItem(MODE_KEY, mode);
  notify();
}

/** Forget that this computer was too slow, so backgrounds move and are measured again. */
export function clearSlowFinding(): void {
  localStorage.removeItem(SLOW_KEY);
  probed = false;
  notify();
}

/** Whether moving backgrounds should move on this computer right now. */
export function motionAllowed(): boolean {
  const mode = motionMode();
  if (mode === 'still') return false;
  if (mode === 'full') return true;
  return !slowFinding();
}

let probed = false;

/**
 * Measures how smoothly this window draws while a background moves (once per
 * window). Gives up quietly if the window is hidden or covered meanwhile, so
 * a background window is never mistaken for a slow computer.
 */
export function probeSmoothness(): void {
  if (probed || motionMode() !== 'auto' || slowFinding() || typeof requestAnimationFrame === 'undefined') return;
  probed = true;
  const WARM_UP = 1500;
  const MEASURE = 3000;
  const start = performance.now();
  let first = 0;
  let frames = 0;
  let last = start;
  const tick = (now: number) => {
    if (document.hidden || now - last > 500) return; // hidden or paused: not a fair test
    last = now;
    if (now - start < WARM_UP) return void requestAnimationFrame(tick);
    if (!first) first = now;
    frames++;
    if (now - first < MEASURE) return void requestAnimationFrame(tick);
    const fps = (frames * 1000) / (now - first);
    if (fps < MIN_SMOOTH_FPS) {
      localStorage.setItem(SLOW_KEY, JSON.stringify({ at: new Date().toISOString(), fps: Math.round(fps) }));
      notify();
    }
  };
  requestAnimationFrame(tick);
}
