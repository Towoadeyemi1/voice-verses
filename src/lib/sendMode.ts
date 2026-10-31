/**
 * How detected scripture reaches the screens:
 * - 'auto': straight to the screens (references said aloud, the reading followed,
 *   and quotes only when 99%+ sure)
 * - 'preview': into Preview; the operator checks it and presses Send
 */
export type SendMode = 'auto' | 'preview';

const KEY = 'voice-verses-send-mode';

export function loadSendMode(): SendMode {
  try {
    return localStorage.getItem(KEY) === 'preview' ? 'preview' : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveSendMode(mode: SendMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Not remembered; still applies now
  }
}
