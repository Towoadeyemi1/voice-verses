import { useEffect, useState } from 'react';
import type { Output } from '@/lib/templates';
import { reportMeasured, ScreenShape, shapeOf, SHAPES_CHANGED, StageSize, stageFor } from '@/lib/screenShapes';

/** An output's shape setting, kept current in every window. */
export function useScreenShape(output: Output): ScreenShape {
  const [shape, setShape] = useState(() => shapeOf(output));
  const [, setTick] = useState(0);
  useEffect(() => {
    const reload = () => {
      setShape(shapeOf(output));
      setTick((t) => t + 1); // the measured size may have changed
    };
    window.addEventListener(SHAPES_CHANGED, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(SHAPES_CHANGED, reload);
      window.removeEventListener('storage', reload);
    };
  }, [output]);
  return shape;
}

/** The canvas an operator preview of this output uses (the output's own shape). */
export function usePreviewStage(output: Output): StageSize {
  const shape = useScreenShape(output);
  return stageFor(shape, undefined, output);
}

/**
 * The canvas for the output window itself. Set to match the screen, it takes
 * the window's own shape, and tells the operator's previews about it.
 */
export function useOutputStage(output: Output): StageSize {
  const shape = useScreenShape(output);
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    reportMeasured(output, size.w, size.h);
  }, [output, size.w, size.h]);
  return stageFor(shape, size.h ? size.w / size.h : undefined, output);
}
