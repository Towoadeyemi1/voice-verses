/**
 * Recognises songs from the church's song library by their words, and follows
 * a song as it is sung: which slide (verse, chorus, bridge...) the worship
 * leader is on.
 *
 * Sung words come through speech recognition less cleanly than spoken ones, so
 * matching is against the few songs the church actually has, by runs of two
 * and three words, rather than trying to understand the singing.
 */
import { words } from './scriptureMatcher';

export interface LibrarySong {
  id: string;
  title: string;
  lyrics: string;
}

export interface SongMatch {
  song: LibrarySong;
  /** A short piece of the lyrics that matched, to show the operator */
  heard: string;
}

const pairs = (w: string[]) => {
  const out = new Set<string>();
  for (let i = 0; i + 1 < w.length; i++) out.add(`${w[i]} ${w[i + 1]}`);
  return out;
};
const triples = (w: string[]) => {
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return out;
};

interface Indexed {
  pairs: Set<string>;
  triples: Set<string>;
}

const index = (text: string): Indexed => {
  const w = words(text);
  return { pairs: pairs(w), triples: triples(w) };
};

/** How well these words match a piece of lyrics: runs of three count double. */
function score(target: Indexed, heard: string[]): number {
  let s = 0;
  for (const t of triples(heard)) if (target.triples.has(t)) s += 2;
  for (const p of pairs(heard)) if (target.pairs.has(p)) s += 1;
  return s;
}

export class LyricsMatcher {
  private songs: { song: LibrarySong; lines: string[]; all: Indexed }[] = [];
  private slideCache: { key: string; slides: Indexed[] } | null = null;

  setLibrary(songs: LibrarySong[]): void {
    this.songs = songs
      .filter((s) => s.lyrics?.trim())
      .map((song) => ({
        song,
        lines: song.lyrics.split('\n').map((l) => l.trim()).filter(Boolean),
        all: index(song.lyrics),
      }));
  }

  get size(): number {
    return this.songs.length;
  }

  /**
   * The library song these words come from, when one clearly matches: several
   * runs of three words in a row from it, and well ahead of any other song.
   */
  identify(heard: string[], excludeTitle?: string): SongMatch | null {
    const recent = heard.slice(-16);
    if (recent.length < 5) return null;
    const ranked = this.songs
      .filter((s) => s.song.title !== excludeTitle)
      .map((s) => ({ s, triples: [...triples(recent)].filter((t) => s.all.triples.has(t)).length, score: score(s.all, recent) }))
      .filter((r) => r.triples > 0)
      .sort((a, b) => b.score - a.score);
    const [best, second] = ranked;
    if (!best || best.triples < 3 || best.score < 9) return null;
    if (second && second.score > best.score * 0.6) return null;
    // The line that was sung, for the operator to recognise
    const line = best.s.lines.map((l) => ({ l, s: score(index(l), recent) })).sort((a, b) => b.s - a.s)[0]?.l ?? '';
    return { song: best.s.song, heard: line };
  }

  /**
   * While a song is on screen: the slide being sung now, or null to stay.
   * `slides` are the slides' text in order (the arrangement, with repeats).
   */
  follow(slides: string[], current: number, heard: string[]): number | null {
    const recent = heard.slice(-10);
    if (recent.length < 3 || !slides.length) return null;
    const key = slides.join('\u0000');
    if (this.slideCache?.key !== key) this.slideCache = { key, slides: slides.map(index) };
    const indexed = this.slideCache.slides;
    const scores = indexed.map((s) => score(s, recent));
    const stay = scores[current] ?? 0;
    let best = -1;
    for (let i = 0; i < scores.length; i++) {
      if (best < 0 || scores[i] > scores[best]) best = i;
    }
    if (best < 0 || scores[best] < 4 || scores[best] < stay + 2) return null;
    const text = slides[best];
    if (text === slides[current]) return null;
    // A chorus sung again appears more than once: take the next one after the current slide
    const same = slides.map((t, i) => (t === text ? i : -1)).filter((i) => i >= 0);
    return same.find((i) => i > current) ?? same[0];
  }
}
