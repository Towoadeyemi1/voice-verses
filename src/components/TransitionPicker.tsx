import { Play } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { MAX_TRANSITION_SECONDS, TransitionKind, TransitionSpec, TRANSITIONS } from '@/lib/transitions';

/**
 * Choosing how slides arrive: the kind (dissolve, through black…) and how long
 * it takes. With `inherit`, the first choice is "the look's own transition".
 */
export const TransitionPicker = ({
  value,
  onChange,
  inherit,
  onPlay,
}: {
  value: TransitionSpec | undefined;
  onChange: (t: TransitionSpec | undefined) => void;
  /** Name of what is used when nothing is chosen, e.g. "Its look's (Dissolve)" */
  inherit?: string;
  /** Plays the transition on the preview */
  onPlay?: () => void;
}) => {
  const current = value ?? (inherit ? undefined : { kind: 'dissolve' as TransitionKind, duration: 0.5 });
  const choose = (kind: TransitionKind) => onChange({ kind, duration: current?.duration ?? 0.5 });
  const option = (selected: boolean) =>
    `min-h-9 px-2 rounded-lg text-[13px] font-semibold text-left transition ${selected ? 'bg-card text-foreground shadow-sm ring-1 ring-foreground/30' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Transition">
        {inherit && (
          <button type="button" role="radio" aria-checked={!value} onClick={() => onChange(undefined)} className={`${option(!value)} col-span-2`}>
            {inherit}
          </button>
        )}
        {TRANSITIONS.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={current?.kind === t.id} title={t.description} onClick={() => choose(t.id)} className={option(!!value || !inherit ? current?.kind === t.id : false)}>
            {t.label}
          </button>
        ))}
      </div>
      {current && current.kind !== 'cut' && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground w-14 flex-shrink-0">Length</span>
          <Slider
            value={[current.duration]}
            min={0.2}
            max={MAX_TRANSITION_SECONDS}
            step={0.1}
            onValueChange={([duration]) => onChange({ ...current, duration })}
            className="flex-1"
            aria-label="How long the transition takes"
          />
          <span className="text-[13px] tabular-nums w-10 text-right">{current.duration.toFixed(1)}s</span>
        </div>
      )}
      {current && <p className="m-0 text-[13px] text-muted-foreground">{TRANSITIONS.find((t) => t.id === current.kind)?.description}.</p>}
      {onPlay && (
        <button type="button" onClick={onPlay} className="h-9 w-full rounded-lg bg-muted hover:bg-muted/70 text-[13px] font-semibold flex items-center justify-center gap-1.5">
          <Play className="w-3.5 h-3.5" />
          Play it on the preview
        </button>
      )}
    </div>
  );
};
