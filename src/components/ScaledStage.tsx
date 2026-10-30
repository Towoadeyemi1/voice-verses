import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const WIDTH = 1920;
const HEIGHT = 1080;

/**
 * Lays its content out on a 1920×1080 canvas and scales that to fit the
 * container, so outputs and previews look the same at any window size.
 */
export const ScaledStage = ({ children, className }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(el.clientWidth / WIDTH, el.clientHeight / HEIGHT));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: WIDTH, height: HEIGHT, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};
