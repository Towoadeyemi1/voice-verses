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

// 32-bit FNV-1a hash of one word
function wordHash(w: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < w.length; i++) {
    h ^= w.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Modern words a preacher uses for what the KJV and WEB say otherwise
 * ("the giant" for Goliath, "boat" for ship), as the form the Bible uses.
 * Applied to what is heard only.
 */
const STORY_WORDS: Record<string, string[]> = {
  boat: ['ship', 'boat'], waves: ['wave', 'sea'], lake: ['sea'], giant: ['philistine', 'goliath'], sling: ['sling'],
  short: ['stature', 'little'], crowd: ['press', 'multitude', 'crowd'], tree: ['tree', 'sycamore'], fish: ['fish', 'fishe'],
  lions: ['lion'], den: ['den'], parted: ['divide', 'divided'], split: ['divide'], dry: ['dry'],
  coat: ['coat'], colors: ['colour'], colours: ['colour'], brothers: ['brethren', 'brother'],
  tomb: ['tomb', 'sepulchre', 'grave', 'cave'], stinks: ['stink'], dead: ['dead'],
  killed: ['slew', 'smote', 'kill'], hit: ['smote', 'struck'], threw: ['cast'], thrown: ['cast'],
  sheep: ['sheep'], lost: ['lost'], son: ['son'], prodigal: ['younger', 'substance', 'riotous'],
  fleece: ['fleece'], dew: ['dew'], wine: ['wine'], water: ['water'], wedding: ['marriage', 'wedding'],
  blind: ['blind'], mud: ['clay'], spit: ['spat', 'spittle'], rooftop: ['roof'], roof: ['roof'],
  ark: ['ark'], flood: ['flood'], rainbow: ['bow'], ladder: ['ladder'], wrestled: ['wrestle'],
  burning: ['burn', 'burning'], bush: ['bush'], furnace: ['furnace'], fourth: ['fourth'],
  walls: ['wall'], marched: ['compass', 'compassed'], trumpets: ['trumpet'], shouted: ['shout'],
  strength: ['strength'], hair: ['hair', 'locks'], pillars: ['pillar'],
};

/** A word's form for the story search: its stem without a final "e", so "love", "loves" and "loved" are one word. */
const storyStem = (w: string) => (w.length > 3 ? w.replace(/e$/, '') : w);

/** Words heard, for the story search: the Bible's own words added for modern ones. */
function storyWords(spoken: string[]): string[] {
  const out = new Set<string>();
  for (const w of spoken) {
    out.add(storyStem(w));
    for (const alt of STORY_WORDS[w] ?? STORY_WORDS[`${w}s`] ?? []) out.add(storyStem(stem(alt)));
  }
  return [...out];
}

/** A telling word: in fewer verses than this (a name, a place, "sycamore", "fleece") */
const STORY_DISTINCT = 300;
/** A very telling word: in only a few verses ("Goliath", "sling", "Zacchaeus") */
const STORY_RARE = 40;

/** Words in more verses than this say nothing about which story it is ("said", "God", "came") */
const MAX_STORY_COMMON = 1200;

/**
 * How sure a story match can ever be. A story told in the preacher's own
 * words is always offered for the operator to check, never shown by itself
 * (only a verse said word for word reaches AUTO_SHOW_CONFIDENCE).
 */
export const STORY_MAX_CONFIDENCE = 0.9;

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
  // The same for single words (the story search): word hash → verses that use it
  private wordKeys = new Uint32Array(0);
  private wordOffsets = new Uint32Array(0);
  private wordPostings = new Uint32Array(0);
  /** Per verse: how many different words it has (in the translation with the most) */
  private verseWords: number[] = [];
  private averageWords = 1;

  /** Builds the index from one or more translations with the same book order. Yields to the page between books. */
  static async build(translations: BibleSource[][]): Promise<ScriptureIndex> {
    const index = new ScriptureIndex();
    const pairs: number[] = [];
    const wordPairs: number[] = [];
    const names = translations[0].map((b) => b.name);
    for (const books of translations) {
      for (let b = 0; b < books.length && b < names.length; b++) {
        books[b].chapters.forEach((verses, c) =>
          verses.forEach((text, v) => {
            if (!text) return;
            const id = index.refId({ book: names[b], chapter: c + 1, verse: v + 1 });
            const stems = words(text);
            const verseHashes = trigrams(stems);
            const unique = [...new Set(stems.filter((w) => w.length >= 3).map(storyStem))];
            index.verseWords[id] = Math.max(index.verseWords[id] ?? 0, unique.length);
            for (const w of unique) wordPairs.push(wordHash(w) * 65536 + id);
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
    [index.keys, index.offsets, index.postings] = packPostings(pairs);
    [index.wordKeys, index.wordOffsets, index.wordPostings] = packPostings(wordPairs);
    const counted = index.verseWords.filter(Boolean);
    index.averageWords = counted.reduce((a, b) => a + b, 0) / Math.max(1, counted.length);
    return index;
  }

  private chapterOf(id: number): string {
    const r = this.refs[id];
    return `${r.book}|${r.chapter}`;
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
    return lookup(this.keys, this.offsets, this.postings, hash);
  }

  /**
   * A Bible story told in the preacher's own words ("Zacchaeus was too short
   * to see, so he climbed a tree"): the verses that share the most telling
   * words with what was said, best first. Rare words count most, so names
   * and places (Zacchaeus, sycamore, Jericho) carry a story; a verse is helped
   * by its neighbours, because a story is told across several verses.
   * Confidence never reaches STORY_MAX_CONFIDENCE: it is always a suggestion.
   */
  findStory(spoken: string[], onScreen?: VerseRef | null, limit = 2, { eager = false } = {}): { ref: VerseRef; confidence: number }[] {
    const total = this.refs.length;
    const skip = onScreen ? this.refIds.get(`${onScreen.book}|${onScreen.chapter}|${onScreen.verse}`) : undefined;
    const raw = new Map<number, { score: number; hits: number; rare: number; telling: number; veryRare: number }>();
    const chapters = new Map<string, { telling: Set<string>; veryRare: Set<string> }>();
    for (const w of storyWords(spoken.filter((x) => x.length >= 3))) {
      const verses = lookup(this.wordKeys, this.wordOffsets, this.wordPostings, wordHash(w));
      if (!verses.length || verses.length > MAX_STORY_COMMON) continue;
      const weight = Math.log(total / verses.length);
      for (const id of verses) {
        if (verses.length <= STORY_DISTINCT) {
          // The telling words said that the whole chapter has (Goliath early in 1 Samuel 17, the sling at the end)
          const key = this.chapterOf(id);
          const said = chapters.get(key) ?? { telling: new Set<string>(), veryRare: new Set<string>() };
          said.telling.add(w);
          if (verses.length <= STORY_RARE) said.veryRare.add(w);
          chapters.set(key, said);
        }
        const s = raw.get(id) ?? { score: 0, hits: 0, rare: 0, telling: 0, veryRare: 0 };
        s.score += weight;
        s.hits++;
        if (verses.length <= STORY_DISTINCT) s.telling++;
        if (verses.length <= STORY_RARE) s.veryRare++;
        s.rare = Math.max(s.rare, weight);
        raw.set(id, s);
      }
    }
    // Long verses share more words by chance: weigh by length (as BM25 does, gently)
    const norm = (id: number) => {
      const s = raw.get(id);
      return s ? s.score / (0.6 + (0.4 * (this.verseWords[id] ?? this.averageWords)) / this.averageWords) : 0;
    };
    const sameChapter = (a: number, b: number) => {
      const x = this.refs[a];
      const y = this.refs[b];
      return !!x && !!y && x.book === y.book && x.chapter === y.chapter;
    };
    const ranked: { id: number; score: number; hits: number; rare: number; telling: number; veryRare: number }[] = [];
    for (const [id, s] of raw) {
      // Three telling words of the story, or two very rare ones ("Goliath" and "sling"); fewer when the preacher asked for help finding it
      const chapter = chapters.get(this.chapterOf(id));
      const enough = eager
        ? s.telling >= 2 || s.veryRare >= 1
        : s.telling >= 3 || s.veryRare >= 2 || (s.telling >= 2 && !!chapter && chapter.telling.size >= 3 && chapter.veryRare.size >= 2);
      if (id === skip || !enough) continue;
      // The story around it: its neighbours' words count a little
      let around = 0;
      for (const n of [id - 2, id - 1, id + 1, id + 2]) if (sameChapter(id, n)) around += norm(n) * (Math.abs(n - id) === 1 ? 0.35 : 0.15);
      ranked.push({ id, score: norm(id) + around, hits: s.hits, rare: s.rare, telling: s.telling, veryRare: s.veryRare });
    }
    ranked.sort((a, b) => b.score - a.score || a.id - b.id);
    // One verse per story: drop others from the same few verses
    const picked: typeof ranked = [];
    for (const c of ranked) {
      if (picked.some((p) => sameChapter(p.id, c.id) && Math.abs(p.id - c.id) <= 3)) continue;
      picked.push(c);
      if (picked.length > limit + 2) break;
    }
    const [best] = picked;
    // A name or other rare word (in under ~150 verses), and enough telling words together
    const rareEnough = Math.log(total / 150);
    if (!best || best.rare < rareEnough || best.score < (eager ? 11 : 14)) return [];
    const rival = picked[1]?.score ?? 0;
    const distinct = Math.max(0, 1 - rival / best.score);
    return picked
      .slice(0, limit)
      .filter((c, i) => i === 0 || c.score >= best.score * 0.8)
      .map((c) => {
        // Surer with more telling words; standing alone only counts fully with three of them (two rare words can meet by chance)
        const strength = Math.min(1, c.score / 40);
        const alone = c === best ? distinct * (c.telling >= 3 ? 1 : 0.3) : 0;
        const confidence = Math.min(STORY_MAX_CONFIDENCE, 0.3 + 0.35 * strength + 0.2 * alone);
        return { ref: this.refs[c.id], confidence: Math.round(confidence * 100) / 100 };
      });
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

/** Packs (key × 65536 + verse) numbers into sorted keys and postings, each verse once per key. */
function packPostings(pairs: number[]): [Uint32Array, Uint32Array, Uint32Array] {
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
  return [Uint32Array.from(keys), Uint32Array.from(offsets), postings.slice(0, n)];
}

function lookup(keys: Uint32Array, offsets: Uint32Array, postings: Uint32Array, hash: number): Uint32Array {
  let lo = 0;
  let hi = keys.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid] === hash) return postings.subarray(offsets[mid], offsets[mid + 1]);
    if (keys[mid] < hash) lo = mid + 1;
    else hi = mid - 1;
  }
  return new Uint32Array(0);
}
