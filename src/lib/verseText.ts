/**
 * The KJV text uses braces for two things: words the translators supplied,
 * e.g. "according to {his} purpose", which printed Bibles show in italics; and
 * margin notes, e.g. "{lamb: or, kid}" or "{by: Heb. by the hand of}", which
 * never belong on screen. Braces themselves must never appear.
 */
export interface VerseTextPart {
  text: string;
  italic: boolean;
}

const BRACES = /\s*\{([^{}]*)\}/g;

/** A margin note ("word: or, other", "word: Heb. ...", "place; or, ...") rather than supplied words. */
const isMarginNote = (inside: string) => inside.includes(':') || /;\s*or,/.test(inside) || /^\s*(or,|Heb\.|Gr\.|Chald\.)/.test(inside);

/** Splits verse text into plain and italic (supplied-word) parts. */
export function verseTextParts(text: string): VerseTextPart[] {
  const parts: VerseTextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(BRACES)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), italic: false });
    if (!isMarginNote(match[1]) && match[1]) {
      // Keep the space before supplied words; notes go with theirs
      const space = match[0].slice(0, match[0].indexOf('{'));
      if (space) parts.push({ text: space, italic: false });
      parts.push({ text: match[1], italic: true });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), italic: false });
  return parts;
}

/** Verse text without markup or notes, for places that can't show italics. */
export function plainVerseText(text: string): string {
  return verseTextParts(text)
    .map((p) => p.text)
    .join('');
}

export function verseReference(verse: { book: string; chapter: number; verse: number }): string {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}
