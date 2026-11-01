/**
 * What happens when the operator picks a slide, a verse or a part of the
 * service (by clicking it, or the order of service moving on by itself):
 * - 'next': it waits in Next until Take (Space)
 * - 'live': it goes straight to the screens
 * Separate from how detected verses go up (sendMode.ts): this is the operator's own choice.
 */
export type ClickMode = 'next' | 'live';

const KEY = 'voice-verses-click-mode';

export function loadClickMode(): ClickMode {
  try {
    return localStorage.getItem(KEY) === 'live' ? 'live' : 'next';
  } catch {
    return 'next';
  }
}

export function saveClickMode(mode: ClickMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Not remembered; still applies now
  }
}

/** The order of service moves on by itself when each part's planned time is up. */
const AUTO_KEY = 'voice-verses-auto-advance';

export function loadAutoAdvance(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveAutoAdvance(on: boolean): void {
  try {
    localStorage.setItem(AUTO_KEY, on ? 'on' : 'off');
  } catch {
    // Not remembered; still applies now
  }
}
