import { useEffect, useState } from 'react';
import { syncService } from '@/lib/syncService';
import { alertOn, AlertScreen, ScreenAlert } from '@/lib/alerts';

/** Every alert on screen now (ones past the time they hide themselves are left out). */
export function useAlerts(): ScreenAlert[] {
  const [alerts, setAlerts] = useState<ScreenAlert[]>(() => syncService.currentAlerts());
  const [, setTick] = useState(0);

  useEffect(
    () =>
      syncService.subscribe((message) => {
        if (message.type === 'ALERT') setAlerts(message.data.alerts ?? (message.data.alert ? [message.data.alert] : []));
      }),
    [],
  );

  // Re-check when the next one is due to hide itself
  useEffect(() => {
    const next = Math.min(...alerts.map((a) => a.until ?? Infinity));
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(() => setTick((n) => n + 1), Math.max(0, next - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [alerts]);

  return alerts.filter((a) => !a.until || Date.now() < a.until);
}

/** The alert on one screen (the newest put there), or null. */
export function useAlert(screen: AlertScreen): ScreenAlert | null {
  return useAlerts().find((a) => alertOn(a, screen)) ?? null;
}
