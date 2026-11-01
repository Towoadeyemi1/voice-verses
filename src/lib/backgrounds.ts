/**
 * Moving and still backgrounds made by the app itself: no video files, no
 * downloads and no copyright questions, and they take the colour team's
 * colours, so a new month's team recolours them too.
 *
 * Every one is drawn with gradients and moved only with CSS transforms and
 * opacity, which the graphics card does, so they stay smooth on older Macs.
 * They are timed from the wall clock, so the projector, the lower third and
 * every preview are always at the same point in the movement.
 */

export type MotionStyle = 'aurora' | 'flow' | 'bokeh' | 'rays' | 'waves' | 'stars' | 'glow' | 'horizon' | 'texture';

export interface MotionBackground {
  style: MotionStyle;
  /** Two colours drawn over the background colour (team colours by default) */
  colors: [string, string];
  /** 1 is normal, 0.5 slower, 2 faster; 0 stands still */
  speed: number;
}

export const MOTION_STYLES: { id: MotionStyle; label: string; description: string }[] = [
  { id: 'aurora', label: 'Aurora', description: 'Soft clouds of colour drifting slowly' },
  { id: 'flow', label: 'Colour flow', description: 'A gentle gradient that turns and shifts' },
  { id: 'bokeh', label: 'Lights', description: 'Soft out-of-focus lights rising slowly' },
  { id: 'rays', label: 'Light rays', description: 'Beams of light from above, swaying' },
  { id: 'waves', label: 'Waves', description: 'Layers of soft waves along the bottom' },
  { id: 'stars', label: 'Stars', description: 'Tiny lights twinkling on a dark sky' },
  { id: 'glow', label: 'Glow', description: 'One soft light behind the words, breathing' },
  { id: 'horizon', label: 'Horizon', description: 'Dawn light rising over a horizon' },
  { id: 'texture', label: 'Paper', description: 'A quiet paper texture with soft edges' },
];

export const DEFAULT_MOTION: MotionBackground = { style: 'aurora', colors: ['team:primary', 'team:secondary'], speed: 1 };

/** How long one cycle of each style takes at normal speed, in seconds. */
export const MOTION_CYCLE: Record<MotionStyle, number> = {
  aurora: 40,
  flow: 90,
  bokeh: 60,
  rays: 24,
  waves: 30,
  stars: 8,
  glow: 12,
  horizon: 16,
  texture: 1,
};

/** A small fixed random sequence, so lights land in the same places on every screen. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
