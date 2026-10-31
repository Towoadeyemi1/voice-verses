/**
 * Following a preacher who reads a passage aloud: once a verse is on screen,
 * hearing the words of the next verse moves the screen on.
 *
 * Neighbouring verses share many words, so the next verse must match clearly,
 * and better than the verse already shown (the preacher may still be on it).
 */
const COMMON = new Set(
  'that this with from have shall unto they them their there were which will what when your said into upon also then than been hath doth thou thee thy'.split(' '),
);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[{}]/g, '')
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Distinctive words near the start of a verse: what someone reading it begins with. */
const keyWords = (verseText: string) => [...new Set(words(verseText).filter((w) => w.length >= 4 && !COMMON.has(w)))].slice(0, 12);

/** How many of the verse's key words were heard, and out of how many. */
export function readingMatch(heard: string, verseText: string): { matched: number; total: number } {
  const spoken = new Set(words(heard));
  const key = keyWords(verseText);
  return { matched: key.filter((w) => spoken.has(w)).length, total: key.length };
}

/** True when the speech is the next verse being read, rather than the current one or commentary. */
export function isReadingNextVerse(heard: string, currentText: string, nextText: string): boolean {
  const next = readingMatch(heard, nextText);
  if (next.total === 0 || next.matched < Math.min(4, next.total) || next.matched / next.total < 0.5) return false;
  const current = readingMatch(heard, currentText);
  return next.matched / next.total > current.matched / Math.max(1, current.total);
}
