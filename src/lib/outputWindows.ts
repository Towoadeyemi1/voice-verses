import { appUrl } from './appUrl';
import { desktop, ScreenOutput } from './desktop';

const WINDOWS: { output: ScreenOutput; route: string; features: string }[] = [
  { output: 'projection', route: '/projection', features: 'width=1920,height=1080' },
  { output: 'confidence', route: '/confidence', features: 'width=1280,height=720' },
  { output: 'lowerThird', route: '/lower-third', features: 'width=1280,height=720' },
];

/**
 * Opens the output windows, except those the desktop app already shows on a
 * screen chosen in Settings → Screens. Returns how many windows it opened.
 */
export async function openOutputWindows(): Promise<number> {
  const assigned = desktop ? await desktop.screens.get().catch(() => null) : null;
  const toOpen = WINDOWS.filter(({ output }) => assigned?.[output] == null);
  for (const { route, features } of toOpen) window.open(appUrl(route), '_blank', features);
  return toOpen.length;
}
