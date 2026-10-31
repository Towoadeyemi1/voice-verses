import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BibleVerse } from '@/types/bible';
import type { Passage } from '@/speech/VerseDetectionController';
import { readingTokens } from '@/speech/readingTracker';
import { usePacedWord } from '@/hooks/use-paced-word';

/**
 * The verse being read, word by word: words already read are lit, so the
 * operator sees where the reader is and what happens at the end of the verse.
 */
export const ReadingFollower = ({
  verse,
  word,
  passage,
  listening,
  onStep,
  onEndPassage,
  transcript,
}: {
  verse: BibleVerse | null;
  word: number;
  passage: Passage | null;
  listening: boolean;
  onStep: (direction: 1 | -1) => void;
  onEndPassage: () => void;
  /** What the speech engine heard last */
  transcript?: string;
}) => {
  const tokens = useMemo(() => (verse ? readingTokens(verse.text) : []), [verse]);
  // Carried on at the reader's pace between the speech engine's results
  const shown = usePacedWord(word, verse ? `${verse.book}${verse.chapter}:${verse.verse}` : undefined, tokens.length - 1);
  const inPassage = verse && passage && passage.book === verse.book && passage.chapter === verse.chapter;
  const done = tokens.length > 0 && word >= tokens.length - 1;
  const atEnd = inPassage && verse ? verse.verse >= passage.to : true;

  return (
    <div className="h-full flex flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reading</span>
        {verse ? (
          <span className="text-sm font-semibold whitespace-nowrap">
            {verse.book} {verse.chapter}:{verse.verse}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">No verse</span>
        )}
        {inPassage && (
          <span className="text-xs text-muted-foreground whitespace-nowrap truncate">
            · passage {passage.book} {passage.chapter}:{passage.from}–{passage.to} ({verse!.verse - passage.from + 1} of {passage.to - passage.from + 1})
            <button className="ml-1 align-middle text-muted-foreground hover:text-foreground" onClick={onEndPassage} title="Stop following this passage">
              <X className="inline w-3 h-3" />
            </button>
          </span>
        )}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground hidden 2xl:inline whitespace-nowrap">
          {!listening
            ? 'Start listening to follow the reading'
            : done
              ? atEnd
                ? 'End of verse — waiting (say “next” or read on)'
                : 'End of verse — moving to the next'
              : word >= 0
                ? 'Following the reader'
                : 'Waiting for the reading'}
        </span>
        <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => onStep(-1)} disabled={!verse} title="Previous verse (←)">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => onStep(1)} disabled={!verse} title="Next verse (→)">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-lg leading-relaxed">
        {tokens.map((t, i) => (
          <span
            key={i}
            className={`transition-colors duration-200 ${i <= shown ? 'text-foreground' : 'text-muted-foreground/50'} ${i === shown ? 'bg-primary/30 rounded px-0.5' : ''}`}
          >
            {t.text}{' '}
          </span>
        ))}
      </div>
      {transcript !== undefined && (
        <div className="px-3 py-1.5 border-t border-border text-xs font-mono text-muted-foreground truncate" title={transcript}>
          <span className="uppercase tracking-wide not-italic font-sans font-semibold mr-2">Heard</span>
          {transcript || '—'}
        </div>
      )}
    </div>
  );
};
