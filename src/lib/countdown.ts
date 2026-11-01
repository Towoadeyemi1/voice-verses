import { CountdownConfig } from '@/types/service';
import { syncService } from '@/lib/syncService';

/**
 * A running countdown. Outputs work out the time left from `endsAt` themselves,
 * so every screen shows the same time and a reopened window is right at once.
 */
export interface Countdown {
  id: string;
  /** Shown with the time, e.g. "Service begins in" */
  message: string;
  /** When it reaches zero (ms since 1970) */
  endsAt: number;
  /** Projector: the whole screen (before a service), a small timer in the corner, or nothing */
  projector: 'full' | 'corner' | 'off';
  confidence: boolean;
  stream: boolean;
  /** Turns the timer yellow from this many seconds left (red after zero) */
  warnSeconds?: number;
  /** Blinks while yellow or red, to catch the eye */
  flash?: boolean;
}

/** The screens a countdown or alert can be on. */
export type Screen = 'projector' | 'stage' | 'stream';

/** Whether a countdown shows on this screen. */
export const countdownOn = (c: Countdown, screen: Screen) => (screen === 'projector' ? c.projector !== 'off' : screen === 'stage' ? c.confidence : c.stream);

/** Normal, yellow when close to the end, red when done. */
export function countdownTone(c: Countdown, remaining: number): 'normal' | 'warn' | 'over' {
  if (remaining <= 0) return 'over';
  return remaining <= (c.warnSeconds ?? 60) * 1000 ? 'warn' : 'normal';
}
export const TONE_COLOR = { normal: undefined, warn: '#facc15', over: '#ef4444' } as const;

export type CountdownTarget = { minutes: number; seconds?: number } | { until: string };

/** When a countdown of this length, or to this time of day ("10:30"), ends. */
export function endsAtFor(target: CountdownTarget, now = Date.now()): number {
  if ('until' in target) {
    const [h, m] = target.until.split(':').map(Number);
    const end = new Date(now);
    end.setHours(h || 0, m || 0, 0, 0);
    return end.getTime();
  }
  return now + (target.minutes * 60 + (target.seconds ?? 0)) * 1000;
}

/** "4:59", "1:02:03"; after zero "0:00" (or "+0:15" with overrun, for the stage). */
export function formatRemaining(ms: number, { overrun = false } = {}): string {
  const late = ms < 0;
  if (late && !overrun) return '0:00';
  const total = Math.ceil(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const text = h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  return late ? `+${text}` : text;
}

const publish = (countdowns: Countdown[]) =>
  syncService.broadcast({ type: 'COUNTDOWN', data: { countdowns, countdown: countdowns[0] ?? null } });

/**
 * Starts a countdown on the screens it names. Countdowns already running keep
 * their other screens, so each screen can show its own: the room "Service
 * begins in", the stage the sermon timer.
 */
export function startCountdown(countdown: Omit<Countdown, 'id'>): Countdown {
  const running = { ...countdown, id: `cd-${Date.now()}` };
  const others = syncService
    .currentCountdowns()
    .map((c) => ({
      ...c,
      projector: running.projector !== 'off' ? ('off' as const) : c.projector,
      confidence: running.confidence ? false : c.confidence,
      stream: running.stream ? false : c.stream,
    }))
    .filter((c) => c.projector !== 'off' || c.confidence || c.stream);
  publish([running, ...others]);
  return running;
}

/** Stops one countdown, or all of them. */
export function stopCountdown(id?: string): void {
  publish(id ? syncService.currentCountdowns().filter((c) => c.id !== id) : []);
}

export function extendCountdown(countdown: Countdown, seconds: number): void {
  publish(syncService.currentCountdowns().map((c) => (c.id === countdown.id ? { ...c, endsAt: c.endsAt + seconds * 1000 } : c)));
}

/** A section timer from the Service Builder, as a running countdown. */
export function countdownFromConfig(config: CountdownConfig, message: string): Omit<Countdown, 'id'> {
  const projector = config.projector ?? (config.displayTargets.includes('main') ? 'corner' : 'off');
  return {
    message: config.message ?? message,
    endsAt: endsAtFor(config.mode === 'until' && config.untilTime ? { until: config.untilTime } : { minutes: config.durationMinutes }),
    projector,
    confidence: config.displayTargets.includes('confidence'),
    stream: config.displayTargets.includes('stream'),
    warnSeconds: config.alertEnabled ? config.alertThresholdSeconds ?? 60 : 60,
  };
}
