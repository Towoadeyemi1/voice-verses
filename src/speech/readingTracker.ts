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
 * Moves forward only: each heard word is looked for a few words ahead of the
 * last one matched. A word that is not the very next one must be followed by
 * the next heard word too, so a common word ("the") later in the verse does
 * not make it jump.
 */
export function readingPosition(tokens: ReadingToken[], heard: string[]): number {
  const words = tokens.map((t, i) => ({ stem: t.stem, i })).filter((t) => t.stem);
  let at = -1; // index into `words`
  for (let h = 0; h < heard.length; h++) {
    for (let j = at + 1; j <= Math.min(words.length - 1, at + 5); j++) {
      if (words[j].stem !== heard[h]) continue;
      const immediate = j === at + 1;
      const confirmed = words[j + 1] && heard[h + 1] === words[j + 1].stem;
      if (immediate || confirmed) {
        at = j;
        break;
      }
    }
  }
  return at < 0 ? -1 : words[at].i;
}

/** The index of the last word to read (for "the reader has reached the end"). */
export function lastWordIndex(tokens: ReadingToken[]): number {
  for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].stem) return i;
  return -1;
}
