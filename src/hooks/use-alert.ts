import { useEffect, useState } from 'react';
import { syncService } from '@/lib/syncService';
import type { ScreenAlert } from '@/lib/alerts';

/** The alert on screen now, or null (cleared, or past the time it hides itself). */
export function useAlert(): ScreenAlert | null {
  const [alert, setAlert] = useState<ScreenAlert | null>(() => syncService.currentAlert());
  const [, setTick] = useState(0);

  useEffect(
    () =>
      syncService.subscribe((message) => {
        if (message.type === 'ALERT') setAlert(message.data.alert ?? null);
      }),
    [],
  );

  // Re-check when it is due to hide itself
  useEffect(() => {
    if (!alert?.until) return;
    const timer = window.setTimeout(() => setTick((n) => n + 1), Math.max(0, alert.until - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [alert]);

  return alert && (!alert.until || Date.now() < alert.until) ? alert : null;
}
