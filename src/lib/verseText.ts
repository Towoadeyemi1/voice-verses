/**
 * The KJV marks words the translators supplied with braces, e.g. "according to
 * {his} purpose". Printed Bibles show them in italics; on screen the braces
 * must never appear.
 */
export interface VerseTextPart {
  text: string;
  italic: boolean;
}

const SUPPLIED_WORDS = /\{([^{}]*)\}/g;

/** Splits verse text into plain and italic (supplied-word) parts. */
export function verseTextParts(text: string): VerseTextPart[] {
  const parts: VerseTextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(SUPPLIED_WORDS)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), italic: false });
    if (match[1]) parts.push({ text: match[1], italic: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), italic: false });
  return parts;
}

/** Verse text without markup, for places that can't show italics. */
export function plainVerseText(text: string): string {
  return text.replace(SUPPLIED_WORDS, '$1');
}

export function verseReference(verse: { book: string; chapter: number; verse: number }): string {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}
