import { isDesktop } from '@/lib/desktop';

/**
 * Which main screen the app opens on:
 * - 'screens' (default): the full Voice Verses app, with its own projection,
 *   confidence monitor and lower third, and service planning. Sending verses
 *   to ProPresenter as well is an option in Settings → ProPresenter.
 * - 'propresenter': an optional, stripped-down companion screen for an operator
 *   whose only job is sending verses to ProPresenter (desktop app only).
 */
export type AppMode = 'propresenter' | 'screens';

const KEY = 'voice-verses-mode';

export function loadAppMode(): AppMode {
  return isDesktop && localStorage.getItem(KEY) === 'propresenter' ? 'propresenter' : 'screens';
}

export function saveAppMode(mode: AppMode): void {
  localStorage.setItem(KEY, mode);
  window.dispatchEvent(new Event('app-mode-changed'));
}
