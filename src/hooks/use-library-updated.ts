import { useEffect, useRef } from 'react';
import { LIBRARY_UPDATED_EVENT } from '@/lib/library/librarySync';

/** Runs `onUpdate` whenever the library folder sync brings in changes from another computer. */
export function useLibraryUpdated(onUpdate: () => void): void {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;

  useEffect(() => {
    const listener = () => callback.current();
    window.addEventListener(LIBRARY_UPDATED_EVENT, listener);
    return () => window.removeEventListener(LIBRARY_UPDATED_EVENT, listener);
  }, []);
}
