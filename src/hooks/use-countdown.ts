import { useEffect, useState } from 'react';
import { syncService } from '@/lib/syncService';
import { Countdown, countdownOn, Screen } from '@/lib/countdown';

/** Every running countdown, and the time now (updated several times a second while any run). */
export function useCountdowns(): { countdowns: Countdown[]; now: number } {
  const [countdowns, setCountdowns] = useState<Countdown[]>(() => syncService.currentCountdowns());
  const [now, setNow] = useState(Date.now());

  useEffect(
    () =>
      syncService.subscribe((message) => {
        if (message.type === 'COUNTDOWN') setCountdowns(message.data.countdowns ?? (message.data.countdown ? [message.data.countdown] : []));
      }),
    [],
  );

  useEffect(() => {
    if (!countdowns.length) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [countdowns.length]);

  return { countdowns, now };
}

/**
 * The countdown on one screen (the newest started there), or the first one
 * running when no screen is given, with the time left (ms, negative after zero).
 */
export function useCountdown(screen?: Screen): { countdown: Countdown | null; remaining: number } {
  const { countdowns, now } = useCountdowns();
  const countdown = (screen ? countdowns.find((c) => countdownOn(c, screen)) : countdowns[0]) ?? null;
  return { countdown, remaining: countdown ? countdown.endsAt - now : 0 };
}
