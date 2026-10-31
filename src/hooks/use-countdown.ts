import { useEffect, useState } from 'react';
import { syncService } from '@/lib/syncService';
import type { Countdown } from '@/lib/countdown';

/** The running countdown and the time left (ms, negative after zero), updated several times a second. */
export function useCountdown(): { countdown: Countdown | null; remaining: number } {
  const [countdown, setCountdown] = useState<Countdown | null>(() => syncService.currentCountdown());
  const [now, setNow] = useState(Date.now());

  useEffect(
    () =>
      syncService.subscribe((message) => {
        if (message.type === 'COUNTDOWN') setCountdown(message.data.countdown ?? null);
      }),
    [],
  );

  useEffect(() => {
    if (!countdown) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [countdown]);

  return { countdown, remaining: countdown ? countdown.endsAt - now : 0 };
}
