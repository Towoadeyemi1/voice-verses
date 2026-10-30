import { isDesktop } from '@/lib/desktop';

/**
 * How a church shows scripture:
 * - 'propresenter': ProPresenter runs the screens; Voice Verses only listens and
 *   sends verses to it, on one simple screen.
 * - 'screens': Voice Verses runs its own projection, confidence monitor and
 *   lower third, with service planning.
 * null until chosen (desktop app only; the website can't reach ProPresenter).
 */
export type AppMode = 'propresenter' | 'screens';

const KEY = 'voice-verses-mode';

export function loadAppMode(): AppMode | null {
  if (!isDesktop) return 'screens';
  const saved = localStorage.getItem(KEY);
  return saved === 'propresenter' || saved === 'screens' ? saved : null;
}

export function saveAppMode(mode: AppMode): void {
  localStorage.setItem(KEY, mode);
  window.dispatchEvent(new Event('app-mode-changed'));
}
