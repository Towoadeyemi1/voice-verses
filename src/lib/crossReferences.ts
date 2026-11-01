/**
 * Cross-references between verses (OpenBible.info, CC BY: see
 * src/data/CROSS-REFERENCES.md), bundled so they work offline. Loaded the
 * first time they are needed.
 */
import { BIBLE_BOOKS } from '@/speech/scriptureHints';

export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

let data: Record<string, string[]> | null = null;
let loading: Promise<void> | null = null;

const keyOf = (r: VerseRef) => {
  const book = BIBLE_BOOKS.indexOf(r.book);
  return book < 0 ? null : (book * 1_000_000 + r.chapter * 1000 + r.verse).toString(16);
};
const refOf = (hex: string): VerseRef => {
  const n = parseInt(hex, 16);
  return { book: BIBLE_BOOKS[Math.floor(n / 1_000_000)], chapter: Math.floor((n % 1_000_000) / 1000), verse: n % 1000 };
};

/** Loads the cross-references (once). */
export function loadCrossReferences(): Promise<void> {
  if (data) return Promise.resolve();
  loading ??= import('@/data/cross-references.json').then((m) => {
    data = m.default as Record<string, string[]>;
  });
  return loading;
}

/** The verses this one is most often cross-referenced to, most votes first (none until loaded). */
export function crossReferences(r: VerseRef): VerseRef[] {
  const key = keyOf(r);
  return (key && data?.[key]?.map(refOf)) || [];
}

/** For tests and tools: use this data instead of loading the bundled file. */
export function setCrossReferenceData(d: Record<string, string[]>): void {
  data = d;
}
