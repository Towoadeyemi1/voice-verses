import { useEffect, useState } from 'react';
import { Music, X } from 'lucide-react';
import { plainVerseText } from '@/lib/verseText';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';

/** Something the app thinks may be meant: a verse quoted without its reference, or a library song being sung. */
export type LiveSuggestion =
  | { id: string; kind: 'verse'; verse: BibleVerse; byAi: boolean; score: number; heard?: string }
  | { id: string; kind: 'song'; songId: string; title: string; heard: string; preview?: Slide };

const Ring = ({ value }: { value: number }) => {
  const r = 19;
  const c = 2 * Math.PI * r;
  const color = value >= 0.9 ? 'hsl(var(--next))' : value >= 0.6 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
  return (
    <div className="relative w-11 h-11 flex-shrink-0" aria-label={`${Math.round(value * 100)}% sure`}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />
      </svg>
      <b className="absolute inset-0 grid place-items-center text-[12.5px]">{Math.round(value * 100)}</b>
    </div>
  );
};

/**
 * One suggestion at a time: the best guess for what was quoted (or the song
 * being sung), how sure it is, and what to do with it. "Use" puts it in Next;
 * Take sends it. Others wait behind "more".
 */
export const SuggestionBar = ({
  suggestions,
  inNextId,
  onUse,
  onShowNow,
  onDismiss,
}: {
  suggestions: LiveSuggestion[];
  /** The suggestion now waiting in Next */
  inNextId?: string;
  onUse: (s: LiveSuggestion) => void;
  onShowNow: (s: LiveSuggestion) => void;
  onDismiss: (s: LiveSuggestion) => void;
}) => {
  const [index, setIndex] = useState(0);
  // A new suggestion comes to the front
  const newest = suggestions[0]?.id;
  useEffect(() => setIndex(0), [newest]);
  if (!suggestions.length) return null;
  const s = suggestions[Math.min(index, suggestions.length - 1)];
  const more = suggestions.length - 1;

  return (
    <div data-suggestion className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 p-3 pl-3.5 rounded-[18px] bg-card shadow-[0_1px_1px_rgba(0,0,0,.3),0_12px_36px_rgba(0,0,0,.35)] animate-fade-in">
      {s.kind === 'verse' ? (
        <Ring value={s.score} />
      ) : (
        <div className="w-11 h-11 rounded-full bg-primary/15 grid place-items-center text-primary"><Music className="w-5 h-5" /></div>
      )}
      <div className="min-w-0">
        <p className="m-0 text-[15px] font-semibold truncate">
          {s.kind === 'verse' ? (
            <>
              {s.byAi ? 'AI suggests' : 'Sounds like'} {s.verse.book} {s.verse.chapter}:{s.verse.verse}
              <span className="ml-1.5 text-[13px] font-medium text-muted-foreground">{Math.round(s.score * 100)}% sure</span>
            </>
          ) : (
            <>
              They are singing {s.title}
              <span className="ml-1.5 text-[13px] font-medium text-muted-foreground">from your library</span>
            </>
          )}
        </p>
        <p className="m-0 mt-0.5 font-scripture text-[15px] text-muted-foreground truncate">
          {s.kind === 'verse' ? plainVerseText(s.verse.text) : `“${s.heard}”`}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {more > 0 && (
          <button type="button" className="h-9 px-3 rounded-xl bg-muted/70 text-sm font-semibold hover:bg-muted" onClick={() => setIndex((index + 1) % suggestions.length)}>
            {more} more
          </button>
        )}
        <button type="button" className="h-9 px-3 rounded-xl bg-muted/70 text-sm font-semibold hover:bg-muted" onClick={() => onShowNow(s)} title="Put it on the screens now">
          Show now
        </button>
        <button type="button" className="h-9 px-3.5 rounded-xl bg-primary/20 text-sm font-semibold hover:bg-primary/30" onClick={() => onUse(s)} title="Put it in Next; Take sends it">
          {inNextId === s.id ? 'In Next ✓' : s.kind === 'song' ? 'Switch to it' : 'Use'}
        </button>
        <button type="button" className="w-9 h-9 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onDismiss(s)} title="Not this" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
