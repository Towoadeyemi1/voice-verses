import { useEffect, useState } from 'react';
import { MOTION_CHANGED, motionAllowed } from '@/lib/motionQuality';

/** Whether moving backgrounds move on this computer; updates when the setting changes in any window. */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(motionAllowed);
  useEffect(() => {
    const update = () => setAllowed(motionAllowed());
    window.addEventListener(MOTION_CHANGED, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(MOTION_CHANGED, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return allowed;
}
