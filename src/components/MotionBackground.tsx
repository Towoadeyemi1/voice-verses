import { CSSProperties, ReactNode, useMemo, useState } from 'react';
import { MOTION_CYCLE, MotionBackground as Motion, seeded } from '@/lib/backgrounds';
import { useStageScale, useStageSize } from './ScaledStage';

/** Below this width on screen (a thumbnail), backgrounds stand still to save the computer's effort. */
const STILL_BELOW_PX = 240;

// Colours are worked out here rather than with CSS color-mix, which older Safari and SVG pictures don't understand
const rgb = (color: string): [number, number, number] | null => {
  const h = color.trim().replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) return null;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
/** `pct`% of a, the rest b. */
const mix = (a: string, b: string, pct: number) => {
  const x = rgb(a);
  const y = rgb(b);
  if (!x || !y) return `color-mix(in srgb, ${a} ${pct}%, ${b})`;
  return hex([0, 1, 2].map((i) => (x[i] * pct + y[i] * (100 - pct)) / 100) as [number, number, number]);
};
/** The colour, see-through. */
const soft = (color: string, alpha: number) => {
  const c = rgb(color);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})` : `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
};

const VIGNETTE = 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)';

// A quiet paper grain, made by the browser (no picture file)
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

// One period of a soft wave; tiled sideways it joins up seamlessly
const wave = (color: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 200' preserveAspectRatio='none'><path fill='${color}' d='M0 60 C240 0 480 0 720 60 S1200 120 1440 60 V200 H0 Z'/></svg>`,
  )}")`;

/**
 * A background made by the app (see lib/backgrounds.ts), filling the stage.
 * Colours must already be real colours (team colours filled in).
 */
export const MotionBackground = ({ motion, base }: { motion: Motion; base: string }) => {
  const stage = useStageSize();
  const scale = useStageScale();
  const [t0] = useState(() => Date.now() / 1000);
  const [a, b] = motion.colors;
  const still = motion.speed <= 0 || (scale > 0 && stage.width * scale < STILL_BELOW_PX);
  const cycle = MOTION_CYCLE[motion.style] / Math.max(0.1, motion.speed || 1);

  /** An endless animation, in step with the wall clock so every screen matches. */
  const run = (name: string, length = 1, offset = 0, extra = 'ease-in-out infinite alternate'): CSSProperties => {
    const d = cycle * length;
    const delay = still ? -(offset * d) : -(((t0 % d) + offset * d) % d);
    return { animation: `${name} ${d}s ${extra}`, animationDelay: `${delay}s`, animationPlayState: still ? 'paused' : 'running', willChange: still ? undefined : 'transform, opacity' };
  };

  const W = stage.width;
  const H = stage.height;
  const diagonal = Math.hypot(W, H);
  const layer = (style: CSSProperties, key?: string | number, children?: ReactNode) => (
    <div key={key} className="absolute" style={style}>
      {children}
    </div>
  );

  // Positions that look random but are the same on every screen
  const lights = useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: 16 }, (_, i) => ({ x: r() * 100, size: 90 + r() * 230, alpha: 0.16 + r() * 0.32, length: 0.6 + r() * 0.7, offset: r(), sway: r(), second: i % 3 === 1 }));
  }, []);
  const stars = useMemo(() => {
    const r = seeded(11);
    return Array.from({ length: 80 }, () => ({ x: r() * 100, y: r() * 82, size: 1.5 + r() * 3.5, offset: r(), length: 0.6 + r() * 0.9, tinted: r() > 0.7 }));
  }, []);

  let scene: ReactNode = null;
  switch (motion.style) {
    case 'aurora':
      scene = (
        <>
          {layer({ left: '-25%', top: '-35%', width: '85%', height: '120%', background: `radial-gradient(closest-side, ${soft(a, 0.75)}, transparent)`, ...run('vv-drift-a') })}
          {layer({ right: '-25%', bottom: '-40%', width: '85%', height: '125%', background: `radial-gradient(closest-side, ${soft(b, 0.7)}, transparent)`, ...run('vv-drift-b', 1.3, 0.4) })}
          {layer({ left: '20%', top: '10%', width: '60%', height: '80%', background: `radial-gradient(closest-side, ${soft(mix(a, '#ffffff', 70), 0.35)}, transparent)`, ...run('vv-drift-c', 0.8, 0.7) })}
        </>
      );
      break;
    case 'flow':
      scene = layer({
        left: (W - diagonal * 1.3) / 2,
        top: (H - diagonal * 1.3) / 2,
        width: diagonal * 1.3,
        height: diagonal * 1.3,
        background: [
          `radial-gradient(circle at 32% 30%, ${soft(a, 0.7)}, transparent 32%)`,
          `radial-gradient(circle at 70% 64%, ${soft(b, 0.75)}, transparent 34%)`,
          `radial-gradient(circle at 36% 74%, ${soft(mix(a, base, 60), 0.55)}, transparent 30%)`,
        ].join(','),
        ...run('vv-turn', 1, 0, 'linear infinite'),
      });
      break;
    case 'bokeh':
      scene = lights.map((l, i) =>
        layer({ left: 0, top: 0, width: '100%', height: '100%', ...run('vv-rise', l.length, l.offset, 'linear infinite') }, i,
          <div
            className="absolute rounded-full"
            style={{
              left: `${l.x}%`,
              top: '108%',
              width: l.size,
              height: l.size,
              marginLeft: -l.size / 2,
              background: `radial-gradient(circle, ${soft(l.second ? b : a, l.alpha + 0.1)} 0%, ${soft(l.second ? b : a, l.alpha)} 40%, transparent 70%)`,
              ...run('vv-sway-x', 0.25 + l.sway * 0.2, l.sway),
            }}
          />,
        ),
      );
      break;
    case 'rays':
      scene = (
        <>
          {layer({ left: 0, right: 0, top: 0, height: '75%', background: `radial-gradient(ellipse 60% 70% at 50% 0%, ${soft(a, 0.55)}, transparent)` })}
          {layer({
            left: W / 2 - diagonal,
            top: -H * 0.15 - diagonal,
            width: diagonal * 2,
            height: diagonal * 2,
            background: `repeating-conic-gradient(from 0deg, transparent 0deg, ${soft(mix(a, '#ffffff', 60), 0.22)} 2.5deg, transparent 5deg, transparent 13deg)`,
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 55%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 55%)',
            ...run('vv-swing'),
          })}
        </>
      );
      break;
    case 'waves':
      scene = (
        <>
          {layer({ left: 0, right: 0, top: 0, height: '60%', background: `radial-gradient(ellipse 70% 80% at 50% 0%, ${soft(b, 0.35)}, transparent)` })}
          {[
            { color: soft(b, 0.4), height: '36%', length: 1.4, reverse: true },
            { color: soft(a, 0.32), height: '27%', length: 1, reverse: false },
            { color: soft(mix(b, base, 55), 0.75), height: '18%', length: 0.7, reverse: true },
          ].map((w, i) =>
            layer(
              {
                left: 0,
                bottom: 0,
                width: '200%',
                height: w.height,
                backgroundImage: wave(w.color),
                backgroundSize: '50% 100%',
                backgroundRepeat: 'repeat-x',
                ...run(w.reverse ? 'vv-slide-back' : 'vv-slide', w.length, i * 0.3, 'linear infinite'),
              },
              i,
            ),
          )}
        </>
      );
      break;
    case 'stars':
      scene = (
        <>
          {layer({ inset: 0, background: `radial-gradient(ellipse 60% 50% at 30% 75%, ${soft(a, 0.28)}, transparent), radial-gradient(ellipse 50% 45% at 78% 30%, ${soft(b, 0.24)}, transparent)` })}
          {stars.map((s, i) =>
            layer({ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: '50%', background: s.tinted ? mix(a, '#ffffff', 40) : '#ffffff', boxShadow: `0 0 ${s.size * 2}px ${soft('#ffffff', 0.6)}`, ...run('vv-twinkle', s.length, s.offset) }, i),
          )}
        </>
      );
      break;
    case 'glow':
      scene = (
        <>
          {layer({ left: '10%', right: '10%', top: '5%', bottom: '5%', background: `radial-gradient(closest-side, ${soft(a, 0.6)}, transparent)`, ...run('vv-breathe') })}
          {layer({ left: '30%', width: '40%', top: '20%', height: '60%', background: `radial-gradient(closest-side, ${soft(b, 0.3)}, transparent)`, ...run('vv-breathe', 1.4, 0.5) })}
        </>
      );
      break;
    case 'horizon':
      scene = (
        <>
          {layer({ inset: 0, background: `linear-gradient(180deg, transparent 0%, ${soft(b, 0.45)} 55%, ${soft(a, 0.35)} 70%, transparent 71%)` })}
          {layer({ left: '15%', right: '15%', top: '38%', height: '70%', background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${soft(mix(a, '#ffffff', 60), 0.85)}, ${soft(a, 0.4)} 35%, transparent 70%)`, ...run('vv-dawn') })}
          {layer({ left: 0, right: 0, top: '70.5%', bottom: 0, background: `linear-gradient(180deg, ${mix(base, '#000000', 70)}, ${mix(base, '#000000', 40)})` })}
          {layer({ left: '10%', right: '10%', top: '70%', height: 3, background: `linear-gradient(90deg, transparent, ${soft(mix(a, '#ffffff', 50), 0.7)}, transparent)` })}
        </>
      );
      break;
    case 'texture':
      scene = (
        <>
          {layer({ inset: 0, background: `radial-gradient(ellipse 80% 70% at 25% 20%, ${soft(a, 0.2)}, transparent), radial-gradient(ellipse 70% 60% at 85% 90%, ${soft(b, 0.18)}, transparent)` })}
          {layer({ inset: 0, backgroundImage: GRAIN, backgroundSize: '320px 320px', opacity: 0.35, mixBlendMode: 'overlay' })}
        </>
      );
      break;
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: base }} data-motion={motion.style}>
      {scene}
      <div className="absolute inset-0" style={{ background: VIGNETTE }} />
    </div>
  );
};
