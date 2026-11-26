/** What Live shows on the live screen: the projector, or every output that is on (1.19.12, approved mock-up docs/design/all-screens.html) */
export type LiveView = 'one' | 'all';
const VIEW_KEY = 'voice-verses-live-view';
/** Which output is the big one with Every screen */
export const BIG_KEY = 'voice-verses-live-view-big';

export function loadLiveView(): LiveView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'all' ? 'all' : 'one';
  } catch {
    return 'one';
  }
}

export function saveLiveView(view: LiveView): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Kept for this session only
  }
}
