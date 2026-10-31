import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { BibleVerse } from '@/types/bible';
import type { Passage } from '@/speech/VerseDetectionController';
import { readingTokens } from '@/speech/readingTracker';
import { BibleParser } from '@/lib/bibleParser';

/**
 * Preaching: the verse being read, large enough to read from across the booth,
 * lit word by word as the reader goes. Above it the verses of the passage (or
 * the chapter) as numbered steps: read, live, next.
 */
export const ReadingPanel = ({
  verse,
  word,
  passage,
  chapter,
  liveVerse,
  nextVerse,
  listening,
  heard,
  why,
  onPickVerse,
  onChapter,
  onEndPassage,
}: {
  verse: BibleVerse | null;
  word: number;
  passage: Passage | null;
  /** The loaded chapter: its verse numbers become the steps when no passage was called */
  chapter: { book: string; chapter: number; count: number } | null;
  liveVerse: BibleVerse | null;
  nextVerse: BibleVerse | null;
  listening: boolean;
  heard: string;
  /** Why this verse is up ("Heard “John 5:8-13”") */
  why?: string;
  onPickVerse: (verse: number) => void;
  onChapter: (direction: 1 | -1) => void;
  onEndPassage: () => void;
}) => {
  const tokens = useMemo(() => (verse ? readingTokens(verse.text) : []), [verse]);
  const inPassage = !!(verse && passage && passage.book === verse.book && passage.chapter === verse.chapter);
  const steps = inPassage
    ? Array.from({ length: passage!.to - passage!.from + 1 }, (_, i) => passage!.from + i)
    : chapter
      ? Array.from({ length: chapter.count }, (_, i) => i + 1)
      : [];
  const stepsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stepsRef.current?.querySelector('[data-live="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [liveVerse]);
  const done = tokens.length > 0 && word >= tokens.length - 1;
  const sameChapter = (v: BibleVerse | null) => !!v && !!verse && v.book === verse.book && v.chapter === verse.chapter;

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-[14px] border border-border bg-card">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Reading</h2>
        {inPassage ? (
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary">
            Passage {passage!.book} {passage!.chapter}:{passage!.from}–{passage!.to}
            <button onClick={onEndPassage} title="Stop following this passage" className="hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </span>
        ) : (
          chapter && (
            <span className="flex items-center gap-1 text-xs font-bold">
              <button className="p-0.5 rounded hover:bg-muted" onClick={() => onChapter(-1)} title="Previous chapter" disabled={chapter.chapter <= 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {chapter.book} {chapter.chapter}
              <button className="p-0.5 rounded hover:bg-muted" onClick={() => onChapter(1)} title="Next chapter">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </span>
          )
        )}
        <span className="ml-auto text-xs text-muted-foreground truncate">
          {!listening
            ? 'Start listening to follow the reader'
            : done
              ? inPassage && verse && verse.verse < passage!.to
                ? 'End of verse · the next one is coming up'
                : 'End of verse · waiting (say “next” or read on)'
              : word >= 0
                ? `${why ? `${why} · ` : ''}following the reader`
                : why ?? 'Waiting for the reading'}
        </span>
      </div>

      {steps.length > 0 && (
        <div ref={stepsRef} className="flex gap-1.5 px-4 pt-3 overflow-x-auto [scrollbar-width:none]">
          {steps.map((n) => {
            const live = sameChapter(liveVerse) && liveVerse!.verse === n;
            const next = sameChapter(nextVerse) && nextVerse!.verse === n;
            const read = sameChapter(liveVerse) && n < liveVerse!.verse;
            return (
              <button
                key={n}
                data-live={live}
                onClick={() => onPickVerse(n)}
                className={`min-w-[38px] h-[30px] px-1.5 rounded-lg border text-[13px] font-bold tabular-nums flex-shrink-0 transition-colors ${
                  live
                    ? 'border-live text-live shadow-[inset_0_-3px_0_hsl(var(--live))]'
                    : next
                      ? 'border-next text-next'
                      : read
                        ? 'border-border text-muted-foreground'
                        : 'border-border bg-muted hover:border-primary/50'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-7 pt-4 pb-3">
        {verse ? (
          <>
            <span className="block text-sm font-bold tracking-[0.04em] text-primary mb-2.5 uppercase">
              {verse.book} {verse.chapter}:{verse.verse} · {BibleParser.getVersion()}
            </span>
            <p className="font-scripture text-[clamp(28px,3vw,46px)] leading-[1.22]">
              {tokens.map((t, i) => (
                <span
                  key={i}
                  className={`transition-colors duration-200 ${
                    i < word
                      ? 'text-foreground'
                      : i === word
                        ? 'text-foreground shadow-[inset_0_-3px_0_hsl(var(--primary))] bg-[linear-gradient(transparent_62%,hsl(var(--primary)/0.15)_62%)]'
                        : 'text-muted-foreground/45'
                  }`}
                >
                  {t.text}{' '}
                </span>
              ))}
            </p>
          </>
        ) : (
          <div className="h-full grid place-items-center text-center text-muted-foreground">
            <div>
              <p className="font-scripture text-3xl text-foreground/80">Scripture appears here as it is preached.</p>
              <p className="text-sm mt-2">Start listening, or press Ctrl+K and type a reference.</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2.5 px-4 py-2.5 border-t border-border text-[13px] text-muted-foreground min-w-0">
        <b className="text-foreground font-semibold">Heard</b>
        <span className="truncate">{heard || (listening ? '…' : 'Not listening')}</span>
      </div>
    </div>
  );
};
