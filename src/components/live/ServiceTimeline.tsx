import { useEffect, useMemo, useRef } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Service, ServiceSubsection } from '@/types/service';

/** A part of the service on the timeline, with its planned start and length. */
export interface TimelinePart {
  item: ServiceSubsection;
  section: string;
  start: number; // minutes after the service starts
  minutes: number;
  color: string;
}

// Colour by what the part is (from the section or item name)
const KINDS: [RegExp, string][] = [
  [/worship|song|praise|hymn|choir|music/i, '#8b5cf6'],
  [/word|sermon|message|preach|teach|scripture|reading|bible/i, '#3b82f6'],
  [/pray|intercession/i, '#14b8a6'],
  [/notice|announce/i, '#f59e0b'],
  [/offering|giving|tithe/i, '#22c55e'],
  [/welcome|greet|opening|call to worship/i, '#f97316'],
  [/response|altar|ministry|communion/i, '#f43f5e'],
  [/close|closing|benediction|dismiss|blessing/i, '#6366f1'],
  [/countdown|pre-?service|before/i, '#64748b'],
];
export const colorFor = (name: string) => KINDS.find(([re]) => re.test(name))?.[1] ?? '#64748b';

// Planned length: a timer set on the item, otherwise a typical length for its kind
function minutesFor(section: string, item: ServiceSubsection): number {
  if (item.countdown?.durationMinutes) return item.countdown.durationMinutes;
  const name = `${section} ${item.name}`;
  if (/word|sermon|message|preach|teach/i.test(name)) return 35;
  if (/worship|song|praise|hymn/i.test(name)) return 6;
  if (/welcome|countdown/i.test(name)) return 4;
  return 5;
}

export function timelineParts(service: Service | null): TimelinePart[] {
  if (!service) return [];
  let at = 0;
  return service.sections.flatMap((section) =>
    section.subsections.map((item) => {
      const minutes = minutesFor(section.name, item);
      const part = { item, section: section.name, start: at, minutes, color: colorFor(`${section.name} ${item.name}`) };
      at += minutes;
      return part;
    }),
  );
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const clock = (minutes: number) => `${Math.floor(minutes / 60) % 24}:${String(Math.round(minutes % 60)).padStart(2, '0')}`;
const PX_PER_MINUTE = 22;

/**
 * The order of service as a quiet timeline: each part as wide as its time,
 * tinted by what it is; the part on now is solid with how far it has got.
 * Scrolls sideways; click a part to load it.
 */
export const ServiceTimeline = ({
  service,
  currentId,
  now,
  onPick,
  onPlan,
  timedId,
  timeLeft,
}: {
  service: Service | null;
  /** The part being timed (moving on by time), and its time left ("3:12 left") */
  timedId?: string;
  timeLeft?: string;
  /** The item loaded now (its slides are in the middle) */
  currentId?: string;
  /** Minutes since midnight */
  now: number;
  onPick: (item: ServiceSubsection) => void;
  onPlan: () => void;
}) => {
  const parts = useMemo(() => timelineParts(service), [service]);
  const begins = service ? toMinutes(service.startTime || '10:00') : 0;
  const scroller = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  // The part on now (loaded, or by the clock)
  const byClock = parts.find((p) => now >= begins + p.start && now < begins + p.start + p.minutes);
  const current = parts.find((p) => p.item.id === currentId) ?? byClock;

  useEffect(() => {
    const el = currentRef.current;
    const box = scroller.current;
    if (el && box) box.scrollTo({ left: Math.max(0, el.offsetLeft - 120), behavior: 'smooth' });
  }, [current?.item.id]);

  if (!service || !parts.length) {
    return (
      <button type="button" onClick={onPlan} className="h-11 w-full rounded-xl bg-muted/60 hover:bg-muted text-sm text-muted-foreground flex items-center justify-center gap-2">
        <CalendarPlus className="w-4 h-4" /> Plan today's service to see its order here
      </button>
    );
  }

  return (
    <div ref={scroller} className="overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Order of service">
      <div className="flex gap-[3px] h-11">
        {parts.map((p) => {
          const on = p === current;
          const past = !on && current ? p.start < current.start : false;
          const progress = on && byClock === p ? Math.min(1, Math.max(0, (now - begins - p.start) / p.minutes)) : 0;
          return (
            <button
              key={p.item.id}
              ref={on ? currentRef : undefined}
              type="button"
              onClick={() => onPick(p.item)}
              title={`${clock(begins + p.start)} · ${p.section}: ${p.item.name}`}
              className={`relative flex-shrink-0 h-11 rounded-[10px] px-3 flex items-center gap-2 overflow-hidden whitespace-nowrap text-[13px] font-semibold transition ${past ? 'opacity-40' : ''} ${on ? 'text-white' : 'text-foreground hover:brightness-110'}`}
              style={{ width: Math.max(on ? 220 : 132, p.minutes * PX_PER_MINUTE), background: on ? p.color : `color-mix(in oklab, ${p.color} 16%, transparent)` }}
            >
              {progress > 0 && (
                <span className="absolute inset-y-0 left-0 bg-black/15 pointer-events-none" style={{ width: `${progress * 100}%` }}>
                  <span className="absolute right-0 top-1.5 bottom-1.5 w-0.5 rounded bg-white" />
                </span>
              )}
              <span className="relative w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: on ? '#fff' : p.color }} />
              <span className="relative truncate">{p.item.name}</span>
              <span className={`relative text-xs font-medium tabular-nums ${on ? 'text-white/75' : 'text-muted-foreground'}`} data-time-left={timedId === p.item.id && timeLeft ? '' : undefined}>
                {timedId === p.item.id && timeLeft ? timeLeft : clock(begins + p.start)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** When the planned service ends, and how far over it is running (minutes; 0 when on time). */
export function serviceEnd(service: Service | null, now: number): { ends: string; over: number } | null {
  const parts = timelineParts(service);
  if (!service || !parts.length) return null;
  const begins = toMinutes(service.startTime || '10:00');
  const last = parts[parts.length - 1];
  const end = begins + last.start + last.minutes;
  return { ends: clock(end), over: Math.max(0, Math.round(now - end)) };
}
