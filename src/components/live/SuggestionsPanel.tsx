import { BookOpen, Music, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { ScaledStage } from '../ScaledStage';
import { OutputContent } from '../OutputContent';
import { VerseText } from '../VerseText';

export type LiveSuggestion =
  | { id: string; kind: 'verse'; verse: BibleVerse; byAi: boolean; score: number; heard?: string }
  | { id: string; kind: 'song'; songId: string; title: string; heard: string; preview?: Slide };

const percent = (score: number) => `${Math.round(score * 100)}%`;
const tone = (score: number) =>
  score >= 0.75 ? 'bg-emerald-600 text-white' : score >= 0.45 ? 'bg-amber-500 text-black' : 'bg-muted text-muted-foreground';

/**
 * What the detector thinks may be meant (a quote or a paraphrase without a
 * reference), most likely first, each with how sure it is and a picture of
 * how it would look. Click one to put it in Preview; Send puts it on screen.
 */
export const SuggestionsPanel = ({
  suggestions,
  previewId,
  onPreview,
  onSend,
  onDismiss,
}: {
  suggestions: LiveSuggestion[];
  previewId?: string;
  onPreview: (s: LiveSuggestion) => void;
  onSend: (s: LiveSuggestion) => void;
  onDismiss: (s: LiveSuggestion) => void;
}) => {
  if (!suggestions.length) {
    return <p className="text-xs text-muted-foreground px-1 py-3">Verses quoted or paraphrased without a reference appear here, with how sure the match is.</p>;
  }
  return (
    <div className="space-y-2">
      {suggestions.map((s) => (
        <div
          key={s.id}
          onClick={() => onPreview(s)}
          className={`flex gap-2 rounded-md border p-2 cursor-pointer transition-colors ${previewId === s.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:bg-muted/50'}`}
        >
          <div className="w-28 flex-shrink-0">
            <ScaledStage className="aspect-video bg-black rounded">
              <OutputContent live={s.kind === 'verse' ? { verse: s.verse } : s.preview ? { slide: s.preview } : null} output="projection" preview />
            </ScaledStage>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {s.kind === 'song' ? <Music className="w-3.5 h-3.5 text-primary" /> : s.byAi ? <Sparkles className="w-3.5 h-3.5 text-primary" /> : <BookOpen className="w-3.5 h-3.5 text-primary" />}
              <span className="text-sm font-semibold truncate">{s.kind === 'song' ? s.title : `${s.verse.book} ${s.verse.chapter}:${s.verse.verse}`}</span>
              {s.kind === 'verse' && <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${tone(s.score)}`}>{percent(s.score)}</span>}
              {s.kind === 'song' && <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">SONG</span>}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
              {s.kind === 'verse' ? <VerseText text={s.verse.text} /> : `“${s.heard}”`}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Button size="sm" className="h-6 px-2 text-[11px]" onClick={(e) => { e.stopPropagation(); onSend(s); }}>
                Send
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" title="Dismiss" onClick={(e) => { e.stopPropagation(); onDismiss(s); }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
