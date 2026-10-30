import { CSSProperties, ReactNode, useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FitTextProps {
  /** Largest font size in px; text shrinks from here until it fits the box */
  maxFontSize: number;
  minFontSize?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Text that shrinks to fit the space it is given, so a long verse never runs
 * off the screen. The box takes the remaining height of a flex column.
 */
export const FitText = ({ maxFontSize, minFontSize = 12, className, style, children }: FitTextProps) => {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fit = () => {
      const b = box.current;
      const t = text.current;
      if (!b || !t || b.clientHeight === 0) return;
      const fits = (size: number) => {
        t.style.fontSize = `${size}px`;
        return t.scrollHeight <= b.clientHeight && t.scrollWidth <= b.clientWidth;
      };
      if (fits(maxFontSize)) return;
      let lo = minFontSize;
      let hi = maxFontSize;
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      t.style.fontSize = `${lo}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (box.current) observer.observe(box.current);
    return () => observer.disconnect();
  });

  return (
    <div ref={box} className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
      <div ref={text} className={cn('w-full', className)} style={{ ...style, fontSize: maxFontSize }}>
        {children}
      </div>
    </div>
  );
};
