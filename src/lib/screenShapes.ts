/**
 * The shape of each screen: standard 16:9, a wide 21:9 or 32:9 monitor or LED
 * wall, an older 4:3 projector, or any size. Looks are laid out in proportions
 * (positions in %, text sized against the height), so on a wider screen the
 * design spreads across the whole width instead of sitting in the middle with
 * black bars. A church can instead keep the design in the middle 16:9 and let
 * only the background fill the rest.
 *
 * "Match the screen" (the default) uses the shape of the window the output is
 * shown in; that window reports its size here, so the operator's previews take
 * the same shape.
 */
import type { Output } from './templates';

export type ShapeId = 'auto' | '16:9' | '16:10' | '21:9' | '32:9' | '4:3' | 'custom';

export interface ScreenShape {
  id: ShapeId;
  /** For "custom": the screen's pixels (or any width and height in proportion) */
  width?: number;
  height?: number;
  /** On screens wider than 16:9: spread the design across, or keep it in the middle */
  layout?: 'spread' | 'middle';
}

export const SHAPES: { id: ShapeId; label: string; ratio?: number }[] = [
  { id: 'auto', label: 'Match the screen' },
  { id: '16:9', label: '16:9 — TVs and most projectors', ratio: 16 / 9 },
  { id: '16:10', label: '16:10 — projectors at 1920×1200', ratio: 16 / 10 },
  { id: '21:9', label: '21:9 — ultrawide (34″–45″, 3440×1440)', ratio: 64 / 27 },
  { id: '32:9', label: '32:9 — super-ultrawide (49″, 5120×1440)', ratio: 32 / 9 },
  { id: '4:3', label: '4:3 — older projectors', ratio: 4 / 3 },
  { id: 'custom', label: 'Custom size' },
];

/** Every look is laid out this tall; only the width changes with the shape. */
export const STAGE_HEIGHT = 1080;
export const STANDARD_WIDTH = 1920;

const SHAPES_KEY = 'voice-verses-screen-shapes';
const MEASURED_KEY = 'voice-verses-screen-measured';
export const SHAPES_CHANGED = 'voice-verses-screen-shapes-changed';

type Saved = Partial<Record<Output, ScreenShape>>;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const loadShapes = (): Saved => read<Saved>(SHAPES_KEY, {});
export const shapeOf = (output: Output): ScreenShape => loadShapes()[output] ?? { id: 'auto', layout: 'spread' };

export function saveShapes(shapes: Saved): void {
  localStorage.setItem(SHAPES_KEY, JSON.stringify(shapes));
  window.dispatchEvent(new Event(SHAPES_CHANGED));
}

export function setShape(output: Output, shape: ScreenShape): void {
  saveShapes({ ...loadShapes(), [output]: shape });
}

/** Width ÷ height an output window last reported (for "Match the screen"). */
export const measuredRatio = (output: Output): number | undefined => read<Partial<Record<Output, number>>>(MEASURED_KEY, {})[output];

/** An output window reports its shape, so previews and the designer can match it. */
export function reportMeasured(output: Output, width: number, height: number): void {
  if (!width || !height) return;
  const ratio = Math.round((width / height) * 1000) / 1000;
  const all = read<Partial<Record<Output, number>>>(MEASURED_KEY, {});
  if (all[output] === ratio) return;
  try {
    localStorage.setItem(MEASURED_KEY, JSON.stringify({ ...all, [output]: ratio }));
    window.dispatchEvent(new Event(SHAPES_CHANGED));
  } catch {
    // Previews stay 16:9
  }
}

/** A ratio close to 16:9 is 16:9 (a window a few pixels off should not reflow). */
const snap = (ratio: number) => (Math.abs(ratio - 16 / 9) < 0.02 ? 16 / 9 : ratio);

/**
 * Width ÷ height of an output. `windowRatio` is the output window's own shape,
 * given by the output itself when it is set to match its screen.
 */
export function shapeRatio(shape: ScreenShape, windowRatio?: number, output?: Output): number {
  if (shape.id === 'custom' && shape.width && shape.height) return shape.width / shape.height;
  const fixed = SHAPES.find((s) => s.id === shape.id)?.ratio;
  if (fixed) return fixed;
  const measured = windowRatio ?? (output ? measuredRatio(output) : undefined);
  return measured && measured > 0.2 && measured < 10 ? snap(measured) : 16 / 9;
}

export interface StageSize {
  width: number;
  height: number;
  /** Where the design goes on a screen wider than 16:9 */
  layout: 'spread' | 'middle';
}

export const STANDARD_STAGE: StageSize = { width: STANDARD_WIDTH, height: STAGE_HEIGHT, layout: 'spread' };

/** The canvas an output's looks are laid out on. */
export function stageFor(shape: ScreenShape, windowRatio?: number, output?: Output): StageSize {
  const ratio = shapeRatio(shape, windowRatio, output);
  return { width: Math.round(STAGE_HEIGHT * ratio), height: STAGE_HEIGHT, layout: shape.layout ?? 'spread' };
}

/** "21:9" or "3440×1440" for labels. */
export function describeShape(shape: ScreenShape, output: Output): string {
  if (shape.id === 'custom' && shape.width && shape.height) return `${shape.width}×${shape.height}`;
  if (shape.id !== 'auto') return shape.id;
  const ratio = shapeRatio(shape, undefined, output);
  const named = SHAPES.find((s) => s.ratio && Math.abs(s.ratio - ratio) < 0.03);
  return named ? named.id : `${ratio.toFixed(2)}:1`;
}
