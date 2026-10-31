/**
 * Finds Bible verses from the words themselves, offline: when a preacher reads
 * on through a passage, and when they quote a verse without naming it.
 *
 * Every verse of the KJV and the WEB (older and modern wording) is indexed by
 * its runs of three words ("trigrams"). Words are reduced to a common form
 * first, so "believeth"/"believes"/"believe", "thee"/"you" and "hath"/"has"
 * match each other, as speech recognisers often write the modern form of what
 * was read from the KJV.
 */
import { plainVerseText } from '@/lib/verseText';

export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

export interface BibleSource {
  name: string;
  chapters: string[][];
}

const SAME_WORD: Record<string, string> = {
  thee: 'you', thou: 'you', ye: 'you', you: 'you',
  thy: 'your', thine: 'your', your: 'your', yours: 'your',
  hath: 'has', has: 'has', have: 'has', hast: 'has',
  doth: 'does', does: 'does', do: 'does', dost: 'does',
  saith: 'says', says: 'says', said: 'says', say: 'says',
  unto: 'to', art: 'are', shalt: 'shall', wilt: 'will', canst: 'can',
};

/** A word in its common form: lower case, no punctuation, archaic endings and spellings evened out. */
export function stem(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (SAME_WORD[w]) return SAME_WORD[w];
  if (w.length > 5) return w.replace(/(eth|est|ing|ed|es|s|e)$/, '');
  if (w.length > 3) return w.replace(/(s|e)$/, '');
  return w;
}

export function words(text: string): string[] {
  return plainVerseText(text)
    .replace(/\[[^\]]*\]/g, ' ') // psalm titles such as "[A Psalm of David.]"
    .split(/[^A-Za-z']+/)
    .map(stem)
    .filter(Boolean);
}

// 32-bit FNV-1a hash of three words
function trigramHash(a: string, b: string, c: string): number {
  let h = 0x811c9dc5;
  const s = `${a} ${b} ${c}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function trigrams(stems: string[]): number[] {
  const out = new Set<number>();
  for (let i = 0; i + 2 < stems.length; i++) out.add(trigramHash(stems[i], stems[i + 1], stems[i + 2]));
  return [...out];
}

/** Trigrams that appear in more verses than this are too common to identify anything ("and it came") */
const MAX_COMMON = 120;

export class ScriptureIndex {
  private refs: VerseRef[] = [];
  private refIds = new Map<string, number>();
  /** Per verse: its trigrams in each translation (for read-along comparisons) */
  private verseTrigrams: Set<number>[] = [];
  /** Per verse: how many runs of three words it has (in the translation with the most) */
  private verseSize: number[] = [];
  // Inverted index in sorted arrays: keys[i] occurs in postings[offsets[i]..offsets[i+1])
  private keys = new Uint32Array(0);
  private offsets = new Uint32Array(0);
  private postings = new Uint32Array(0);

  /** Builds the index from one or more translations with the same book order. Yields to the page between books. */
  static async build(translations: BibleSource[][]): Promise<ScriptureIndex> {
    const index = new ScriptureIndex();
    const pairs: number[] = [];
    const names = translations[0].map((b) => b.name);
    for (const books of translations) {
      for (let b = 0; b < books.length && b < names.length; b++) {
        books[b].chapters.forEach((verses, c) =>
          verses.forEach((text, v) => {
            if (!text) return;
            const id = index.refId({ book: names[b], chapter: c + 1, verse: v + 1 });
            const verseHashes = trigrams(words(text));
            index.verseSize[id] = Math.max(index.verseSize[id] ?? 0, verseHashes.length);
            for (const hash of verseHashes) {
              index.verseTrigrams[id].add(hash);
              pairs.push(hash * 65536 + id); // hash and verse in one sortable number
            }
          }),
        );
        if (b % 8 === 7) await new Promise((r) => setTimeout(r));
      }
    }
    const sorted = Float64Array.from(pairs).sort();
    const keys: number[] = [];
    const offsets: number[] = [];
    const postings = new Uint32Array(sorted.length);
    let n = 0;
    let lastHash = -1;
    let lastId = -1;
    for (const pair of sorted) {
      const hash = Math.floor(pair / 65536);
      const id = pair - hash * 65536;
      if (hash !== lastHash) {
        keys.push(hash);
        offsets.push(n);
        lastHash = hash;
        lastId = -1;
      }
      if (id !== lastId) postings[n++] = id; // the same verse twice (two translations) counts once
      lastId = id;
    }
    offsets.push(n);
    index.keys = Uint32Array.from(keys);
    index.offsets = Uint32Array.from(offsets);
    index.postings = postings.slice(0, n);
    return index;
  }

  private refId(ref: VerseRef): number {
    const key = `${ref.book}|${ref.chapter}|${ref.verse}`;
    let id = this.refIds.get(key);
    if (id === undefined) {
      id = this.refs.length;
      this.refs.push(ref);
      this.refIds.set(key, id);
      this.verseTrigrams.push(new Set());
    }
    return id;
  }

  private versesWith(hash: number): Uint32Array {
    let lo = 0;
    let hi = this.keys.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.keys[mid] === hash) return this.postings.subarray(this.offsets[mid], this.offsets[mid + 1]);
      if (this.keys[mid] < hash) lo = mid + 1;
      else hi = mid - 1;
    }
    return new Uint32Array(0);
  }

  /**
   * The verses these words may be quoting, best first, each with a confidence
   * from 0 to 1: how much of the verse was said word for word, and how far
   * ahead of any other verse it is. 0.99 and above means the whole verse was
   * quoted and nothing else matches (safe to show without asking).
   */
  findQuotes(
    spoken: string[],
    onScreen?: VerseRef | null,
    limit = 3,
    /** A longer stretch of what was said, to measure how much of a long verse was quoted */
    context: string[] = spoken,
  ): { ref: VerseRef; confidence: number }[] {
    const ranked = this.rankQuotes(spoken, onScreen);
    const [best] = ranked;
    if (!best || best.hits < 3 || best.score < 18) return [];
    const said = trigrams(context);
    return ranked
      .slice(0, limit)
      .filter((c, i) => i === 0 || (c.hits >= 3 && c.score >= best.score * 0.5))
      .map((c) => {
        // Rivals are other verses that match several runs of words, not one shared phrase
        const rival = Math.max(0, ...ranked.filter((o) => o !== c && o.hits >= 3).map((o) => o.score));
        // Every run of three words of the verse that was said, common phrases included
        const verse = this.verseTrigrams[c.id];
        const matched = said.filter((h) => verse.has(h)).length;
        const coverage = Math.min(1, matched / Math.max(1, this.verseSize[c.id] ?? matched));
        const distinct = Math.max(0, 1 - rival / c.score);
        return { ref: this.refs[c.id], confidence: Math.round(coverage * (0.75 + 0.25 * distinct) * 100) / 100 };
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  private rankQuotes(spoken: string[], onScreen?: VerseRef | null): { id: number; score: number; hits: number }[] {
    const scores = new Map<number, { score: number; hits: number }>();
    // The verse already on screen is not a rival (its words are often still in what was heard)
    const skip = onScreen ? this.refIds.get(`${onScreen.book}|${onScreen.chapter}|${onScreen.verse}`) : undefined;
    const total = this.refs.length;
    for (const hash of trigrams(spoken)) {
      const verses = this.versesWith(hash);
      if (!verses.length || verses.length > MAX_COMMON) continue;
      const weight = Math.log(total / verses.length);
      for (const id of verses) {
        if (id === skip) continue;
        const s = scores.get(id) ?? { score: 0, hits: 0 };
        s.score += weight;
        s.hits++;
        scores.set(id, s);
      }
    }
    // Ties go to the earlier verse in the Bible (lower id)
    return [...scores.entries()]
      .sort((a, b) => b[1].score - a[1].score || a[0] - b[0])
      .slice(0, 6)
      .map(([id, s]) => ({ id, ...s }));
  }

  /** How many runs of three of these words come from this verse (reading it aloud scores 2 or more). */
  wordsFrom(ref: VerseRef, recent: string[]): number {
    const id = this.refIds.get(`${ref.book}|${ref.chapter}|${ref.verse}`);
    if (id === undefined) return 0;
    const verse = this.verseTrigrams[id];
    return trigrams(recent).filter((h) => verse.has(h)).length;
  }

  /**
   * While a passage is read aloud: the verse after `current` (up to a few
   * ahead, same chapter) that the latest words belong to, or null to stay.
   */
  followReading(current: VerseRef, recent: string[], lookAhead = 4): VerseRef | null {
    const spoken = trigrams(recent);
    if (spoken.length < 2) return null;
    const hitsIn = (ref: VerseRef) => {
      const id = this.refIds.get(`${ref.book}|${ref.chapter}|${ref.verse}`);
      if (id === undefined) return -1;
      const verse = this.verseTrigrams[id];
      return spoken.filter((h) => verse.has(h)).length;
    };
    const stay = hitsIn(current);
    let best: VerseRef | null = null;
    let bestHits = 0;
    for (let ahead = 1; ahead <= lookAhead; ahead++) {
      const next = { ...current, verse: current.verse + ahead };
      const hits = hitsIn(next);
      if (hits < 0) break; // end of the chapter
      if (hits > bestHits) {
        best = next;
        bestHits = hits;
      }
    }
    // Two runs of three words from the next verse, and more of it than of the verse on screen
    return best && bestHits >= 2 && bestHits > stay ? best : null;
  }
}
