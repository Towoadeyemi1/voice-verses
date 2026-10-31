import { useEffect, useState } from 'react';
import { SyncMessage, syncService } from '@/lib/syncService';
import type { Live } from '@/components/OutputContent';

export interface LiveState {
  live: Live;
  /** Set while the logo is up (Clear to Logo); empty logo means a cleared screen */
  logo: string | null;
}

/** What is on screen now, for output windows and previews; catches up when opened mid-service. */
export function useLive(): LiveState {
  const [state, setState] = useState<LiveState>({ live: null, logo: null });

  useEffect(() => {
    const handle = (message: SyncMessage) => {
      if (message.type === 'LOGO') setState({ live: null, logo: message.data.logoUrl ?? '' });
      else if (message.type === 'SLIDE_UPDATE') setState({ live: message.data.slide ? { slide: message.data.slide } : null, logo: null });
      else if (message.type === 'VERSE_UPDATE' && message.data.verse) setState({ live: { verse: message.data.verse }, logo: null });
    };
    const current = syncService.current();
    if (current) handle(current);
    return syncService.subscribe(handle);
  }, []);

  return state;
}
