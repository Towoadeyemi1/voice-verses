import { Timer } from 'lucide-react';
import { Service } from '@/types/service';

const toMinutes = (hhmm: string) => {
  const [h, m] = (hhmm || '10:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const byStart = (a: Service, b: Service) => toMinutes(a.startTime) - toMinutes(b.startTime);
const sameDay = (s: Service, day = new Date()) => new Date(s.date).toDateString() === day.toDateString();

/** The church's own services (the samples only while it has none). */
const ownFirst = (services: Service[]) => {
  const own = services.filter((s) => !s.sample);
  return own.length ? own : services;
};

/** Today's services, earliest first: a church can have several on a Sunday. */
export function todaysServices(services: Service[]): Service[] {
  return ownFirst(services).filter((s) => sameDay(s)).sort(byStart);
}

/**
 * The service on the live screen. One the operator chose this session wins;
 * otherwise, of today's services, the one that has started (or starts within
 * 30 minutes); otherwise the one opened last, or the newest.
 */
export function pickService(services: Service[], chosen: { id: string | null; explicit: boolean }): Service | null {
  if (!services.length) return null;
  const picked = chosen.id ? services.find((s) => s.id === chosen.id) : undefined;
  if (picked && chosen.explicit) return picked;
  const today = todaysServices(services);
  if (today.length) {
    if (picked && today.includes(picked)) return picked;
    const d = new Date();
    const now = d.getHours() * 60 + d.getMinutes();
    return [...today].reverse().find((s) => toMinutes(s.startTime) - 30 <= now) ?? today[0];
  }
  return picked ?? [...ownFirst(services)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;
}

const clock = (hhmm: string) => {
  const m = toMinutes(hhmm);
  return new Date(0, 0, 0, Math.floor(m / 60), m % 60).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/** Today's services side by side (9:00 First service · 11:00 Second service), to switch between them. */
export const ServicePicker = ({ services, currentId, onPick }: { services: Service[]; currentId?: string; onPick: (service: Service) => void }) => (
  <div className="flex-shrink-0 flex p-[3px] rounded-[14px] bg-muted/70 max-w-[46%] overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label="Today's services">
    {services.map((s) => (
      <button
        key={s.id}
        type="button"
        role="radio"
        aria-checked={s.id === currentId}
        onClick={() => onPick(s)}
        className={`h-[38px] px-3 rounded-[11px] text-[13px] font-semibold whitespace-nowrap flex items-center gap-2 ${s.id === currentId ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        title={`${s.name}, ${clock(s.startTime)}`}
      >
        <span className="tabular-nums">{clock(s.startTime)}</span>
        <span className="max-w-[160px] truncate font-medium">{s.name.replace(/^Sample: /, '')}</span>
      </button>
    ))}
  </div>
);

/** "Move on by time": each part of the service gives way to the next when its planned time is up. */
export const AutoAdvanceToggle = ({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className={`flex-shrink-0 h-11 px-3.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition ${on ? 'bg-card text-foreground shadow-[0_0_0_1px_hsl(var(--foreground)/0.25)]' : 'bg-muted/60 text-muted-foreground hover:text-foreground'}`}
    title={
      on
        ? 'On: when a part’s planned time is up, the next part is loaded (and shown, if picking a slide goes live). The sermon and verses on screen never move on by themselves. Click to turn off.'
        : 'Move on by time: when a part’s planned time is up, load the next part by itself'
    }
  >
    <Timer className="w-4 h-4" />
    <span className="whitespace-nowrap">Move on by time</span>
    <span className={`w-8 h-[18px] rounded-full p-[2px] transition ${on ? 'bg-[hsl(var(--next))]' : 'bg-muted-foreground/40'}`} aria-hidden>
      <span className={`block w-[14px] h-[14px] rounded-full bg-white transition-transform ${on ? 'translate-x-[14px]' : ''}`} />
    </span>
  </button>
);
