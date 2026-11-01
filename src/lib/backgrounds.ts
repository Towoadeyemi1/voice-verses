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

export type MotionStyle =
  | 'aurora'
  | 'flow'
  | 'bokeh'
  | 'rays'
  | 'waves'
  | 'stars'
  | 'glow'
  | 'horizon'
  | 'texture'
  | 'cross'
  | 'clouds'
  | 'snow'
  | 'fireflies'
  | 'ripples'
  | 'sunburst'
  | 'streaks'
  | 'sheen';

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
  { id: 'cross', label: 'Cross of light', description: 'A soft glowing cross behind the words' },
  { id: 'clouds', label: 'Clouds', description: 'Soft clouds drifting across the sky' },
  { id: 'snow', label: 'Snow', description: 'Gentle snow falling: for Christmas and winter' },
  { id: 'fireflies', label: 'Fireflies', description: 'Warm specks of light floating and glowing' },
  { id: 'ripples', label: 'Ripples', description: 'Circles spreading slowly, like water' },
  { id: 'sunburst', label: 'Sunburst', description: 'Rays turning slowly from the centre' },
  { id: 'streaks', label: 'Light streaks', description: 'Fine beams of light gliding at an angle' },
  { id: 'sheen', label: 'Sheen', description: 'A soft band of light sweeping across' },
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
  cross: 14,
  clouds: 120,
  snow: 28,
  fireflies: 20,
  ripples: 12,
  sunburst: 160,
  streaks: 40,
  sheen: 14,
};

/** A ready-made background: a style with its own colours. */
export interface BackgroundSample {
  id: string;
  name: string;
  group: 'Worship' | 'Scripture and prayer' | 'Seasons' | 'Celebration' | 'Calm';
  /** The colour underneath */
  base: string;
  motion: MotionBackground;
  /** How dark to keep it under words, 0–1 */
  dim: number;
}

const sample = (id: string, name: string, group: BackgroundSample['group'], style: MotionStyle, base: string, colors: [string, string], speed = 1, dim = 0.15): BackgroundSample => ({
  id,
  name,
  group,
  base,
  motion: { style, colors, speed },
  dim,
});

/** Ready-made backgrounds in their own colours, to pick from (they don't follow the colour team). */
export const BACKGROUND_SAMPLES: BackgroundSample[] = [
  // Worship
  sample('golden-aurora', 'Golden aurora', 'Worship', 'aurora', '#0b0a14', ['#f0b44a', '#3b2a8a']),
  sample('violet-aurora', 'Violet aurora', 'Worship', 'aurora', '#0d0718', ['#a855f7', '#ec4899']),
  sample('teal-aurora', 'Northern lights', 'Worship', 'aurora', '#03121a', ['#2dd4bf', '#6366f1']),
  sample('rose-lights', 'Rose lights', 'Worship', 'bokeh', '#14070d', ['#fb7185', '#fbbf24'], 0.8),
  sample('gold-lights', 'Candlelight', 'Worship', 'bokeh', '#120c05', ['#fbbf24', '#f97316'], 0.7),
  sample('blue-lights', 'City lights', 'Worship', 'bokeh', '#050b18', ['#60a5fa', '#a78bfa'], 0.8),
  sample('deep-flow', 'Deep ocean flow', 'Worship', 'flow', '#020b16', ['#0ea5e9', '#1e3a8a']),
  sample('ember-flow', 'Embers', 'Worship', 'flow', '#140604', ['#ef4444', '#f59e0b']),
  sample('violet-streaks', 'Violet streaks', 'Worship', 'streaks', '#0c0618', ['#c084fc', '#38bdf8']),
  sample('ocean-waves', 'Ocean waves', 'Worship', 'waves', '#03101c', ['#38bdf8', '#1d4ed8'], 0.8),
  // Scripture and prayer
  sample('heaven-rays', 'Rays from heaven', 'Scripture and prayer', 'rays', '#07101f', ['#fde68a', '#1e3a8a'], 0.6),
  sample('dawn', 'Dawn', 'Scripture and prayer', 'horizon', '#0a0d1c', ['#fcd34d', '#7c3aed'], 0.7),
  sample('cross-gold', 'Cross of gold', 'Scripture and prayer', 'cross', '#0b0906', ['#f5c451', '#7c2d12'], 0.6, 0.2),
  sample('cross-white', 'Cross of light', 'Scripture and prayer', 'cross', '#070a12', ['#e0f2fe', '#3b82f6'], 0.6, 0.2),
  sample('prayer-glow', 'Prayer', 'Scripture and prayer', 'glow', '#06080f', ['#6366f1', '#14b8a6'], 0.5, 0.2),
  sample('candle-glow', 'Candle glow', 'Scripture and prayer', 'glow', '#0f0904', ['#f59e0b', '#b45309'], 0.5, 0.2),
  sample('parchment', 'Parchment', 'Scripture and prayer', 'texture', '#2a2014', ['#d6b98c', '#7c5a2e'], 0, 0.1),
  sample('slate-paper', 'Slate', 'Scripture and prayer', 'texture', '#14161c', ['#94a3b8', '#334155'], 0, 0.05),
  sample('still-waters', 'Still waters', 'Scripture and prayer', 'ripples', '#041018', ['#5eead4', '#0ea5e9'], 0.5),
  sample('night-sky', 'Night sky', 'Scripture and prayer', 'stars', '#03050d', ['#93c5fd', '#a78bfa'], 0.8, 0.05),
  // Seasons
  sample('advent', 'Advent', 'Seasons', 'aurora', '#0e0618', ['#7c3aed', '#f5d0fe'], 0.7),
  sample('christmas-snow', 'Christmas snow', 'Seasons', 'snow', '#071226', ['#ffffff', '#c8102e'], 0.8, 0.05),
  sample('silent-night', 'Silent night', 'Seasons', 'stars', '#050816', ['#fde68a', '#1e3a8a'], 0.8, 0.05),
  sample('christmas-lights', 'Christmas lights', 'Seasons', 'bokeh', '#0a0705', ['#c8102e', '#f2c14e'], 0.7),
  sample('lent', 'Lent', 'Seasons', 'glow', '#0b0612', ['#6b21a8', '#3b0764'], 0.4, 0.2),
  sample('good-friday', 'Good Friday', 'Seasons', 'cross', '#050505', ['#a8a29e', '#7f1d1d'], 0.4, 0.25),
  sample('easter-morning', 'Easter morning', 'Seasons', 'sunburst', '#120d04', ['#fde68a', '#f59e0b'], 0.6),
  sample('pentecost', 'Pentecost fire', 'Seasons', 'fireflies', '#140604', ['#f97316', '#ef4444']),
  sample('harvest', 'Harvest', 'Seasons', 'sheen', '#160b04', ['#f59e0b', '#65a30d'], 0.7),
  sample('spring', 'Spring', 'Seasons', 'clouds', '#06231c', ['#bbf7d0', '#34d399'], 0.8),
  // Celebration
  sample('celebration', 'Celebration', 'Celebration', 'sunburst', '#10061a', ['#f472b6', '#facc15'], 1),
  sample('youth-neon', 'Neon', 'Celebration', 'streaks', '#07040f', ['#22d3ee', '#ec4899'], 1.2),
  sample('summer', 'Summer sky', 'Celebration', 'clouds', '#0b2a4a', ['#ffffff', '#7dd3fc'], 1, 0.2),
  sample('gold-sheen', 'Gold sheen', 'Celebration', 'sheen', '#0e0a04', ['#fcd34d', '#a16207'], 1),
  sample('fireflies-green', 'Summer evening', 'Celebration', 'fireflies', '#04120a', ['#bef264', '#facc15'], 0.8),
  // Calm
  sample('mist', 'Mist', 'Calm', 'clouds', '#0d1117', ['#cbd5e1', '#64748b'], 0.6, 0.2),
  sample('graphite', 'Graphite', 'Calm', 'flow', '#0e0e11', ['#52525b', '#27272a'], 0.5),
  sample('blush', 'Blush', 'Calm', 'glow', '#140a0e', ['#f9a8d4', '#be185d'], 0.5, 0.2),
  sample('sea-glass', 'Sea glass', 'Calm', 'waves', '#04161a', ['#99f6e4', '#0f766e'], 0.5),
  sample('dusk', 'Dusk', 'Calm', 'horizon', '#0b0b1a', ['#fb923c', '#6d28d9'], 0.5),
];

/** A small fixed random sequence, so lights land in the same places on every screen. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
