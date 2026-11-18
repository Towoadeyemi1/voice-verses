/**
 * Bible references as people write them in sermon notes and slides (1.19.7): "John 3:16",
 * "Eph. 2:8-9", "1 Cor 13:4–7", "Ps 23:1-3", "Romans 8:28, 31", "Psalm 23". Written text,
 * not speech, so book names must start with a capital (a lower-case "job 3" or "mark 5" is
 * ordinary English). A chapter alone ("Genesis 6") is often mentioned in passing: it is found,
 * marked `chapterOnly`, and the review screen leaves it unticked.
 */
import { BOOK_ALIASES } from '@/speech/referenceExtraction';

export interface WrittenReference {
  /** "John 3:16", "Ephesians 2:8-9", "Psalms 23" */
  reference: string;
  book: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
  chapterOnly: boolean;
  /** Where it was in the text */
  index: number;
}

// A book: an optional number (1, 2, 3, I, II, III), then a capitalised name, maybe "of Solomon"
const PATTERN = /(?<![\w:])((?:[1-3]|I{1,3})\s*)?([A-Z][a-z]+(?:\s+of\s+[A-Z][a-z]+)?)\.?\s+(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?((?:\s*,\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)*))?(?![\d:])/g;

const ROMAN: Record<string, string> = { I: '1', II: '2', III: '3' };
const SINGLE_CHAPTER = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

function bookFor(number: string | undefined, name: string): string | null {
  const n = number ? (ROMAN[number.trim()] ?? number.trim()) : '';
  const key = `${n ? `${n} ` : ''}${name}`.toLowerCase().replace(/\s+/g, ' ');
  return BOOK_ALIASES[key] ?? BOOK_ALIASES[key.replace(/ /g, '')] ?? null;
}

/** Every reference in the text, in order, each once. */
export function findWrittenReferences(text: string): WrittenReference[] {
  const found: WrittenReference[] = [];
  const seen = new Set<string>();
  const add = (r: WrittenReference) => {
    if (seen.has(r.reference)) return;
    seen.add(r.reference);
    found.push(r);
  };
  const re = new RegExp(PATTERN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [, number, name, chapterText, verseText, endText, more] = m;
    const book = bookFor(number, name);
    if (!book) {
      // Not a book ("Then 1 Cor…"): look again just after this word, so the number can start the next
      re.lastIndex = m.index + m[0].indexOf(name) + name.length;
      continue;
    }
    const chapter = Number(chapterText);
    if (!chapter) continue;
    // "Jude 3": a book of one chapter, so the number is the verse
    if (!verseText && SINGLE_CHAPTER.has(book)) {
      add({ reference: `${book} 1:${chapter}`, book, chapter: 1, verse: chapter, chapterOnly: false, index: m.index });
      continue;
    }
    if (!verseText) {
      add({ reference: `${book} ${chapter}`, book, chapter, chapterOnly: true, index: m.index });
      continue;
    }
    const verse = Number(verseText);
    const endVerse = endText ? Number(endText) : undefined;
    if (!verse || (endVerse !== undefined && endVerse <= verse)) continue;
    add({ reference: `${book} ${chapter}:${verse}${endVerse ? `-${endVerse}` : ''}`, book, chapter, verse, endVerse, chapterOnly: false, index: m.index });
    // "Romans 8:28, 31" and "John 1:1, 14-18": more verses of the same chapter
    for (const extra of (more ?? '').matchAll(/(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/g)) {
      const v = Number(extra[1]);
      const e = extra[2] ? Number(extra[2]) : undefined;
      if (v && (e === undefined || e > v)) add({ reference: `${book} ${chapter}:${v}${e ? `-${e}` : ''}`, book, chapter, verse: v, endVerse: e, chapterOnly: false, index: m.index });
    }
  }
  return found;
}
