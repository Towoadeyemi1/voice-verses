/**
 * Follows a verse word by word as it is read aloud, so the operator sees how
 * far the reader has got and the next verse can come up as this one ends.
 */
import { plainVerseText } from '@/lib/verseText';
import { stem } from './scriptureMatcher';

export interface ReadingToken {
  /** The word as shown (with its punctuation) */
  text: string;
  /** Its common form for matching; empty for punctuation on its own */
  stem: string;
}

/** A verse's words for the follower; the screen shows `text`, matching uses `stem`. */
export function readingTokens(verseText: string): ReadingToken[] {
  return plainVerseText(verseText)
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, stem: stem(text.replace(/[^A-Za-z']/g, '')) }));
}

/**
 * The last word of the verse that has been read (index into the tokens), or -1.
 * Moves forward only, and keeps up with a fast reader:
 * - the very next word moves it on by one;
 * - a word further ahead (anywhere in the rest of the verse, so a fast reader
 *   who said many words between two recognitions is still found) counts only
 *   when a neighbouring word agrees: the next word heard is the next word of
 *   the verse, or the word heard before it is the word before it in the verse.
 *   So a common word ("the") later in the verse does not make it jump, and the
 *   last word heard so far is not held back waiting for the one after it.
 * - A misheard word is skipped; the words after it find the place again.
 */
export function readingPosition(tokens: ReadingToken[], heard: string[]): number {
  const words = tokens.map((t, i) => ({ stem: t.stem, i })).filter((t) => t.stem);
  let at = -1; // index into `words`
  for (let h = 0; h < heard.length; h++) {
    const word = heard[h];
    if (words[at + 1]?.stem === word) {
      at += 1;
      continue;
    }
    for (let j = at + 2; j < words.length; j++) {
      if (words[j].stem !== word) continue;
      const nextAgrees = heard[h + 1] !== undefined && words[j + 1]?.stem === heard[h + 1];
      const previousAgrees = h > 0 && j - 1 > at && words[j - 1].stem === heard[h - 1];
      if (nextAgrees || previousAgrees) {
        at = j;
        break;
      }
    }
  }
  return at < 0 ? -1 : words[at].i;
}

/**
 * Between recognitions the speech engine is silent for up to a second; a
 * reader keeps going. Given when each word was reached, how many words ahead
 * the reader probably is now: their recent pace times the time since the last
 * word heard, never more than `maxAhead` words (the next recognition corrects it).
 */
export function wordsAhead(history: { word: number; at: number }[], now: number, maxAhead = 3): number {
  const recent = history.filter((h) => now - h.at < 6000);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const seconds = (last.at - first.at) / 1000;
  if (seconds < 0.5 || last.word <= first.word) return 0;
  const pace = (last.word - first.word) / seconds; // words per second
  const since = (now - last.at) / 1000;
  if (since > 2.5) return 0; // stopped reading (preaching about it): don't run ahead
  return Math.max(0, Math.min(maxAhead, Math.floor(pace * since)));
}

/** The index of the last word to read (for "the reader has reached the end"). */
export function lastWordIndex(tokens: ReadingToken[]): number {
  for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].stem) return i;
  return -1;
}
