import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Passage } from '@/speech/VerseDetectionController';
import { BibleVerse } from '@/types/bible';

/** Steps through the passage being read (or on through the chapter), and shows where in it the screen is. */
export const PassageBar = ({
  verse,
  passage,
  onStep,
  onEnd,
}: {
  verse: BibleVerse;
  passage: Passage | null;
  onStep: (direction: 1 | -1) => void;
  onEnd: () => void;
}) => {
  const inPassage = passage && passage.book === verse.book && passage.chapter === verse.chapter;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <Button variant="outline" size="sm" className="h-8" onClick={() => onStep(-1)} disabled={verse.verse <= 1} title="Previous verse">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="flex-1 min-w-0 text-center text-xs sm:text-sm">
        {inPassage ? (
          <>
            <span className="font-semibold">
              {passage.book} {passage.chapter}:{passage.from}–{passage.to}
            </span>
            <span className="text-muted-foreground">
              {' '}· verse {verse.verse} ({verse.verse - passage.from + 1} of {passage.to - passage.from + 1}) · follows the reading
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Previous / next verse</span>
        )}
      </div>
      {inPassage && (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEnd} title="Stop following this passage">
          <X className="w-4 h-4" />
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-8" onClick={() => onStep(1)} title="Next verse">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};
