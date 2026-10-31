import { BookOpen, Music, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { ScaledStage } from './ScaledStage';
import { OutputContent } from './OutputContent';
import { VerseText } from './VerseText';

export type Suggestion =
  | { id: string; kind: 'verse'; verse: BibleVerse; byAi: boolean; heard?: string }
  | { id: string; kind: 'song'; songId: string; title: string; heard: string; preview?: Slide };

/** How the suggestion would look on the projector, drawn by the projector's own renderer. */
const ProjectorPreview = ({ suggestion }: { suggestion: Suggestion }) => {
  const live = suggestion.kind === 'verse' ? { verse: suggestion.verse } : suggestion.preview ? { slide: suggestion.preview } : null;
  if (!live) return null;
  return (
    <ScaledStage className="aspect-video bg-black rounded-md border border-border/50">
      <OutputContent live={live} output="projection" preview />
    </ScaledStage>
  );
};

/**
 * Verses and songs the detector is not sure of, each with its words so the
 * operator can judge before showing it. Hovering (or focusing) one shows it
 * exactly as it would look on the projector.
 */
export const LiveSuggestions = ({
  suggestions,
  onShow,
  onDismiss,
}: {
  suggestions: Suggestion[];
  onShow: (s: Suggestion) => void;
  onDismiss: (s: Suggestion) => void;
}) => {
  if (!suggestions.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Suggestions — check, then Show</p>
      {suggestions.map((s) => (
        <HoverCard key={s.id} openDelay={150} closeDelay={50}>
          <HoverCardTrigger asChild>
            <div
              tabIndex={0}
              className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <div className="mt-0.5 text-primary">
                {s.kind === 'song' ? <Music className="w-4 h-4" /> : s.byAi ? <Sparkles className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  <span className="font-normal text-muted-foreground">
                    {s.kind === 'song' ? 'Song: ' : s.byAi ? 'AI suggests ' : 'Sounds like '}
                  </span>
                  {s.kind === 'song' ? s.title : `${s.verse.book} ${s.verse.chapter}:${s.verse.verse}`}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {s.kind === 'song' ? `“${s.heard}”` : <VerseText text={s.verse.text} />}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="sm" className="h-7 px-3" onClick={() => onShow(s)}>
                  {s.kind === 'song' ? 'Show lyrics' : 'Show'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onDismiss(s)} title="Dismiss">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-96 space-y-2">
            <ProjectorPreview suggestion={s} />
            {s.kind === 'verse' && (
              <p className="text-sm leading-relaxed">
                <VerseText text={s.verse.text} />
              </p>
            )}
            {s.kind === 'verse' && s.heard && <p className="text-xs text-muted-foreground">Heard: “{s.heard}”</p>}
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  );
};
