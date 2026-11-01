import { createContext, ReactNode, useContext, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { STANDARD_STAGE, StageSize } from '@/lib/screenShapes';

const StageContext = createContext<StageSize>(STANDARD_STAGE);
const ScaleContext = createContext(1);

/** The canvas size the content is laid out on (1920×1080 unless the screen is another shape). */
export const useStageSize = () => useContext(StageContext);
/** How much the stage is shrunk to fit on screen (1 = full size; 0 before it is measured). */
export const useStageScale = () => useContext(ScaleContext);

/**
 * Lays its content out on a canvas 1080 tall (1920 wide for 16:9, wider for
 * ultrawide screens) and scales that to fit the container, so outputs and
 * previews look the same at any window size.
 */
export const ScaledStage = ({
  children,
  className,
  stage = STANDARD_STAGE,
  fitShape = false,
}: {
  children: ReactNode;
  className?: string;
  stage?: StageSize;
  /** Give the container the stage's proportions (instead of a fixed aspect class) */
  fitShape?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const { width, height } = stage;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(el.clientWidth / width, el.clientHeight / height));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)} style={fitShape ? { aspectRatio: `${width} / ${height}` } : undefined}>
      <div className="absolute left-1/2 top-1/2" style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <StageContext.Provider value={stage}>
          <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>
        </StageContext.Provider>
      </div>
    </div>
  );
};
