/**
 * Predictive Next: the verse the preacher is most likely to go to next, so it
 * is already waiting in Next when they get there. It never goes on screen by
 * itself; Take (or the reference being said) sends it.
 *
 * It weighs, for the books the preacher just hinted at ("Paul says the same
 * thing in Romans"):
 * 1. Verses in today's order of service (the preacher's outline) not yet shown
 * 2. Cross-references of the verse on screen now
 * 3. Cross-references of the verses shown just before it
 */
import { crossReferences, VerseRef } from './crossReferences';

export interface Prediction extends VerseRef {
  /** Why: shown to the operator */
  reason: string;
  score: number;
}

const label = (r: VerseRef) => `${r.book} ${r.chapter}:${r.verse}`;
const same = (a: VerseRef, b: VerseRef) => a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;

export function predictNext({
  books,
  live,
  recent = [],
  outline = [],
  refs = crossReferences,
}: {
  /** Books hinted at, most likely first; empty for any book */
  books: string[];
  /** The verse on screen now */
  live: VerseRef | null;
  /** Verses shown before it, newest first */
  recent?: VerseRef[];
  /** Scripture planned in today's service, in order */
  outline?: VerseRef[];
  refs?: (r: VerseRef) => VerseRef[];
}): Prediction[] {
  const wanted = (r: VerseRef) => !books.length || books.includes(r.book);
  const shown = [live, ...recent].filter(Boolean) as VerseRef[];
  const found: Prediction[] = [];
  const add = (r: VerseRef, score: number, reason: string) => {
    if (!wanted(r) || shown.some((s) => same(s, r))) return;
    const existing = found.find((f) => same(f, r));
    if (existing) {
      existing.score += score;
      return;
    }
    found.push({ ...r, score, reason });
  };

  outline.forEach((r, i) => add(r, 3 - i * 0.05, "In today's service plan"));
  if (live) refs(live).forEach((r, i) => add(r, 2 - i * 0.1, `Cross-reference of ${label(live)}`));
  recent.slice(0, 4).forEach((v, n) => refs(v).forEach((r, i) => add(r, 1.2 - n * 0.2 - i * 0.05, `Cross-reference of ${label(v)}`)));

  return found.sort((a, b) => b.score - a.score).slice(0, 3);
}
