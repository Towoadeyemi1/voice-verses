import { useEffect, useState } from 'react';
import { desktop, type UpdateState } from '@/lib/desktop';

/** The desktop app's update state (1.19.9): asked for when mounted, then followed. Null in a browser. */
export function useUpdates(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null);
  useEffect(() => {
    const updates = desktop?.updates;
    if (!updates) return;
    let live = true;
    updates.state().then((s) => live && setState(s)).catch(() => {});
    const off = updates.onState((s) => live && setState(s));
    return () => {
      live = false;
      off();
    };
  }, []);
  return state;
}
