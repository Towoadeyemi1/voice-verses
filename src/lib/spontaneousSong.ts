/**
 * Spontaneous worship: a song the leader sings that isn't in the library.
 * While it is captured, each sung line goes up on screen two lines at a time;
 * afterwards it is kept as a draft song for next week, with the lines sung
 * over and over gathered into a chorus.
 */
import type { LyricsSlide } from '@/types/service';

const FILLER = /^(?:(?:oh|ooh|oo|ah|yeah|hey|whoa|woah|mm+|hmm+|la|na|come on|sing|church|everybody)\b[\s,!.]*)+$/i;

/** A sung line as it should look on screen: tidy spacing, a capital first letter, no fillers on their own. */
export function tidyLine(text: string): string | null {
  const line = text.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim().replace(/[.]+$/, '');
  const words = line.split(' ').filter((w) => /[a-z]/i.test(w));
  if (words.length < 3 || FILLER.test(line)) return null;
  return line.charAt(0).toUpperCase() + line.slice(1);
}

const sameWords = (a: string, b: string) => a.toLowerCase().replace(/[^a-z ]/g, '') === b.toLowerCase().replace(/[^a-z ]/g, '');

/** Adds a line unless it repeats the one just sung (a held note heard twice). */
export function addLine(lines: string[], text: string): string[] {
  const line = tidyLine(text);
  if (!line) return lines;
  if (lines.length && sameWords(lines[lines.length - 1], line)) return lines;
  return [...lines, line];
}

/** The slide showing the newest lines: lines are paired, so the slide changes every second line. */
export function captureSlide(lines: string[], title: string, captureId: string): LyricsSlide | null {
  if (!lines.length) return null;
  const pair = Math.floor((lines.length - 1) / 2);
  return {
    id: `${captureId}-${pair}`,
    type: 'lyrics',
    title,
    songTitle: title,
    slideNumber: pair + 1,
    totalSlides: pair + 1,
    content: lines.slice(pair * 2, pair * 2 + 2).join('\n'),
    sectionLabel: 'Sung live',
  };
}

/**
 * The draft song's words: lines sung three or more times become the chorus;
 * the rest, in the order first sung, become verses of four lines.
 */
export function draftLyrics(lines: string[]): { lyrics: string; arrangement: string[] } {
  const key = (l: string) => l.toLowerCase().replace(/[^a-z ]/g, '');
  const counts = new Map<string, number>();
  lines.forEach((l) => counts.set(key(l), (counts.get(key(l)) ?? 0) + 1));
  const seen = new Set<string>();
  const unique = lines.filter((l) => !seen.has(key(l)) && seen.add(key(l)));
  const chorus = unique.filter((l) => (counts.get(key(l)) ?? 0) >= 3);
  const rest = unique.filter((l) => (counts.get(key(l)) ?? 0) < 3);

  const sections: [string, string[]][] = [];
  for (let i = 0; i < rest.length; i += 4) sections.push([`Verse ${sections.length + 1}`, rest.slice(i, i + 4)]);
  const arrangement: string[] = [];
  if (chorus.length) {
    // The chorus after every verse, as it was sung
    if (!sections.length) arrangement.push('Chorus');
    sections.forEach(([label]) => arrangement.push(label, 'Chorus'));
  } else {
    sections.forEach(([label]) => arrangement.push(label));
  }
  const all = chorus.length ? [...sections, ['Chorus', chorus] as [string, string[]]] : sections;
  return { lyrics: all.map(([label, body]) => `${label}\n${body.join('\n')}`).join('\n\n'), arrangement };
}

/** A title for the draft: its most-sung line, shortened. */
export function draftTitle(lines: string[]): string {
  const counts = new Map<string, number>();
  lines.forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1));
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'New song';
  const words = best.split(' ');
  return words.length > 7 ? `${words.slice(0, 7).join(' ')}…` : best;
}
