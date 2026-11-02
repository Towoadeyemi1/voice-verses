/** Video formats a DeckLink port can send (the same keys as electron/decklink.js), as switchers name them. */
export const DECKLINK_MODES: { key: string; label: string }[] = [
  { key: '1080i5994', label: '1080i 59.94' },
  { key: '1080i50', label: '1080i 50' },
  { key: '1080p2997', label: '1080p 29.97' },
  { key: '1080p30', label: '1080p 30' },
  { key: '1080p25', label: '1080p 25' },
  { key: '1080p5994', label: '1080p 59.94' },
  { key: '1080p50', label: '1080p 50' },
  { key: '1080p60', label: '1080p 60' },
  { key: '720p5994', label: '720p 59.94' },
  { key: '720p50', label: '720p 50' },
];
export const DEFAULT_DECKLINK_MODE = '1080i5994';
export const decklinkModeLabel = (key: string) => DECKLINK_MODES.find((m) => m.key === key)?.label ?? key;
