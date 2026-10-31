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
  /** Turns the confidence monitor timer amber from this many seconds left */
  warnSeconds?: number;
}

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

export function startCountdown(countdown: Omit<Countdown, 'id'>): Countdown {
  const running = { ...countdown, id: `cd-${Date.now()}` };
  syncService.broadcast({ type: 'COUNTDOWN', data: { countdown: running } });
  return running;
}

export function stopCountdown(): void {
  syncService.broadcast({ type: 'COUNTDOWN', data: { countdown: null } });
}

export function extendCountdown(countdown: Countdown, seconds: number): void {
  syncService.broadcast({ type: 'COUNTDOWN', data: { countdown: { ...countdown, endsAt: countdown.endsAt + seconds * 1000 } } });
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
