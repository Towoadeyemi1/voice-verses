import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { X } from 'lucide-react';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { plainVerseText } from '@/lib/verseText';
import { ScaledStage } from '../ScaledStage';
import { OutputContent } from '../OutputContent';

export type LiveSuggestion =
  | { id: string; kind: 'verse'; verse: BibleVerse; byAi: boolean; score: number; heard?: string }
  | { id: string; kind: 'song'; songId: string; title: string; heard: string; preview?: Slide };

const ringColour = (score: number) => (score >= 0.75 ? 'hsl(var(--next))' : score >= 0.45 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))');

/**
 * Verses quoted or paraphrased without a reference (and songs being sung),
 * most likely first, with how sure each is. Hover to see it as it would look;
 * click to put it Next; double-click to send it.
 */
export const SuggestionStrip = ({
  suggestions,
  selectedId,
  note,
  onPick,
  onSend,
  onDismiss,
}: {
  suggestions: LiveSuggestion[];
  selectedId?: string;
  note: string;
  onPick: (s: LiveSuggestion) => void;
  onSend: (s: LiveSuggestion) => void;
  onDismiss: (s: LiveSuggestion) => void;
}) => (
  <div className="rounded-[14px] border border-border bg-card flex-shrink-0">
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Suggestions</h2>
      <span className="ml-auto text-xs text-muted-foreground truncate">{note}</span>
    </div>
    {suggestions.length === 0 ? (
      <p className="px-4 py-4 text-sm text-muted-foreground">Verses quoted or paraphrased without a reference, and songs being sung, appear here with how sure the match is.</p>
    ) : (
      <div className="grid gap-2.5 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {suggestions.slice(0, 6).map((s) => {
          const score = s.kind === 'verse' ? s.score : 0.8;
          const live = s.kind === 'verse' ? { verse: s.verse } : s.preview ? { slide: s.preview } : null;
          return (
            <HoverCard key={s.id} openDelay={200} closeDelay={50}>
              <HoverCardTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onPick(s)}
                  onDoubleClick={() => onSend(s)}
                  onKeyDown={(e) => e.key === 'Enter' && onSend(s)}
                  className={`group relative grid grid-cols-[50px_1fr] gap-2.5 items-center rounded-xl border p-2.5 text-left cursor-pointer transition-colors ${
                    selectedId === s.id ? 'border-next bg-next/10' : 'border-border hover:border-primary/60'
                  }`}
                >
                  <span className="w-[50px] h-[50px] rounded-full grid place-items-center" style={{ background: `conic-gradient(${ringColour(score)} ${score * 100}%, hsl(var(--muted)) 0)` }}>
                    <span className="w-10 h-10 rounded-full bg-card grid place-items-center text-[12.5px] font-extrabold tabular-nums">
                      {s.kind === 'song' ? '♪' : `${Math.round(score * 100)}%`}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <b className="block text-sm truncate">{s.kind === 'song' ? s.title : `${s.verse.book} ${s.verse.chapter}:${s.verse.verse}`}</b>
                    <span className="block text-xs text-muted-foreground line-clamp-2">
                      {s.kind === 'song' ? `Sung: “${s.heard}”` : `${s.byAi ? 'AI: ' : ''}${plainVerseText(s.verse.text)}`}
                    </span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(s); }}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="top" className="w-96 space-y-2">
                {live && (
                  <ScaledStage className="aspect-video bg-black rounded-md">
                    <OutputContent live={live} output="projection" preview still />
                  </ScaledStage>
                )}
                <p className="text-xs text-muted-foreground">Click: put it Next · Double-click: send it now</p>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    )}
  </div>
);
