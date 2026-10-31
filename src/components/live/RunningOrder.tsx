import { useEffect, useRef } from 'react';
import { Service, ServiceSubsection } from '@/types/service';

export interface Cue {
  section: string;
  item: ServiceSubsection;
  /** Planned start, "10:35" */
  at?: string;
}

/** The service's items in order, each with its planned start time where the plan has durations. */
export function cuesFor(service: Service | undefined): Cue[] {
  if (!service) return [];
  const [h, m] = (service.startTime || '').split(':').map(Number);
  let minutes = Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
  const cues: Cue[] = [];
  for (const section of service.sections ?? []) {
    for (const item of section.subsections) {
      const at = Number.isFinite(minutes) ? `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` : undefined;
      cues.push({ section: section.name, item, at });
      // Items timed with a countdown give the next item its start time; after an untimed item, times stop
      const duration = item.countdown?.enabled && item.countdown.mode !== 'until' ? item.countdown.durationMinutes : 0;
      minutes = Number.isFinite(minutes) && duration ? minutes + duration : NaN;
    }
  }
  return cues;
}

/**
 * The running order across the top: every item of the service, what is on now
 * (with how far through it is), what is done. Click one to load it.
 */
export const RunningOrder = ({
  cues,
  nowId,
  progress,
  onPick,
}: {
  cues: Cue[];
  nowId?: string;
  /** 0–1 through the item on now */
  progress: number;
  onPick: (cue: Cue) => void;
}) => {
  const nowRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    nowRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [nowId]);
  const nowIndex = cues.findIndex((c) => c.item.id === nowId);

  if (!cues.length) {
    return (
      <div className="flex items-center h-[74px] px-4 border-b border-border text-sm text-muted-foreground flex-shrink-0">
        No service order. Plan the service in Plan, or just search above and go.
      </div>
    );
  }
  return (
    <nav aria-label="Running order" className="flex items-stretch gap-1.5 px-4 py-3 border-b border-border overflow-x-auto flex-shrink-0 [scrollbar-width:thin]">
      {cues.map((cue, i) => {
        const now = cue.item.id === nowId;
        const done = nowIndex >= 0 && i < nowIndex;
        return (
          <button
            key={cue.item.id}
            ref={now ? nowRef : undefined}
            onClick={() => onPick(cue)}
            className={`relative flex-1 min-w-[132px] max-w-[260px] rounded-[10px] border px-3 py-2 text-left transition-colors ${
              now ? 'border-primary bg-primary/15' : 'border-border bg-card hover:border-primary/50'
            } ${done ? 'opacity-55' : ''}`}
          >
            <span className="block text-[11px] text-muted-foreground tabular-nums truncate">
              {[cue.at, cue.section].filter(Boolean).join(' · ')}
            </span>
            <span className="block text-[13.5px] font-bold truncate">{cue.item.name}</span>
            {now && (
              <>
                <span className="absolute -top-2 right-2.5 text-[10px] font-extrabold tracking-wider bg-primary text-primary-foreground rounded px-1.5">NOW</span>
                <span className="absolute left-0 bottom-0 h-[3px] rounded-bl-[10px] bg-primary transition-all" style={{ width: `${Math.max(4, progress * 100)}%` }} />
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
};
