import { CSSProperties, ReactNode, useEffect, useMemo, useState } from 'react';
import { MOTION_CYCLE, MotionBackground as Motion, seeded } from '@/lib/backgrounds';
import { useStageScale, useStageSize } from './ScaledStage';
import { useMotionAllowed } from '@/hooks/use-motion-allowed';
import { probeSmoothness } from '@/lib/motionQuality';

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
 * It stands still when told to (`paused`), in thumbnails, and on a computer
 * too slow to move it smoothly (lib/motionQuality.ts).
 */
export const MotionBackground = ({
  motion,
  base,
  dim = 0,
  paused,
}: {
  motion: Motion;
  base: string;
  dim?: number;
  /** true: stand still; false: move even as a small picture (the one pointed at in a gallery) */
  paused?: boolean;
}) => {
  const stage = useStageSize();
  const scale = useStageScale();
  const allowed = useMotionAllowed();
  const [t0] = useState(() => Date.now() / 1000);
  const [a, b] = motion.colors;
  const onScreen = stage.width * (scale || 0);
  const still = paused === true || !allowed || motion.speed <= 0 || (paused === undefined && scale > 0 && onScreen < STILL_BELOW_PX);
  const cycle = MOTION_CYCLE[motion.style] / Math.max(0.1, motion.speed || 1);

  // On a big screen, check once that this computer keeps it smooth
  useEffect(() => {
    if (!still && onScreen >= 960) probeSmoothness();
  }, [still, onScreen]);

  /** An endless animation, in step with the wall clock so every screen matches. */
  const run = (name: string, length = 1, offset = 0, extra = 'ease-in-out infinite alternate'): CSSProperties => {
    const d = cycle * length;
    const delay = still ? -(offset * d) : -(((t0 % d) + offset * d) % d);
    return { animation: `${name} ${d}s ${extra}`, animationDelay: `${delay}s`, animationPlayState: still ? 'paused' : 'running', willChange: still ? undefined : 'transform' };
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
    return Array.from({ length: 14 }, (_, i) => ({ x: r() * 100, size: 90 + r() * 230, alpha: 0.16 + r() * 0.32, length: 0.6 + r() * 0.7, offset: r(), sway: r(), second: i % 3 === 1 }));
  }, []);
  const scatter = (seed: number, count: number, h = H) => {
    const r = seeded(seed);
    return Array.from({ length: count }, () => ({ x: r() * W, y: r() * h, size: r(), tint: r() }));
  };

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
    case 'flow': {
      // Just big enough to cover the corners while it turns
      const side = diagonal * 1.02;
      scene = layer({
        left: (W - side) / 2,
        top: (H - side) / 2,
        width: side,
        height: side,
        background: [
          `radial-gradient(circle at 30% 30%, ${soft(a, 0.7)}, transparent 34%)`,
          `radial-gradient(circle at 70% 66%, ${soft(b, 0.75)}, transparent 36%)`,
          `radial-gradient(circle at 34% 74%, ${soft(mix(a, base, 60), 0.55)}, transparent 30%)`,
        ].join(','),
        ...run('vv-turn', 1, 0, 'linear infinite'),
      });
      break;
    }
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
            }}
          />,
        ),
      );
      break;
    case 'rays': {
      // Turned around a point above the screen; only as large as the part that can be seen
      const R = diagonal * 0.95;
      scene = (
        <>
          {layer({ left: 0, right: 0, top: 0, height: '75%', background: `radial-gradient(ellipse 60% 70% at 50% 0%, ${soft(a, 0.55)}, transparent)` })}
          {layer({
            left: W / 2 - R,
            top: -H * 0.15 - R,
            width: R * 2,
            height: R * 2,
            background: `repeating-conic-gradient(from 0deg, transparent 0deg, ${soft(mix(a, '#ffffff', 60), 0.22)} 2.5deg, transparent 5deg, transparent 13deg)`,
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 70%)',
            ...run('vv-swing'),
          })}
        </>
      );
      break;
    }
    case 'sunburst': {
      const side = diagonal * 1.02;
      scene = (
        <>
          {layer({
            left: (W - side) / 2,
            top: (H - side) / 2,
            width: side,
            height: side,
            background: `repeating-conic-gradient(from 0deg, ${soft(a, 0.16)} 0deg 6deg, transparent 6deg 15deg)`,
            maskImage: 'radial-gradient(circle at center, black 5%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 5%, transparent 70%)',
            ...run('vv-turn', 1, 0, 'linear infinite'),
          })}
          {layer({ inset: 0, background: `radial-gradient(circle at 50% 50%, ${soft(mix(a, '#ffffff', 55), 0.45)}, ${soft(b, 0.25)} 30%, transparent 60%)` })}
        </>
      );
      break;
    }
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
      // Each star is its own tiny layer: the screen redraws only the few small spots that change
      scene = (
        <>
          {layer({ inset: 0, background: `radial-gradient(ellipse 60% 50% at 30% 75%, ${soft(a, 0.28)}, transparent), radial-gradient(ellipse 50% 45% at 78% 30%, ${soft(b, 0.24)}, transparent)` })}
          {scatter(11, 70, H * 0.85).map((d, i) => {
            const size = 1.5 + d.size * 3.5;
            return layer({ left: d.x, top: d.y, width: size, height: size, borderRadius: '50%', background: d.tint > 0.7 ? mix(a, '#ffffff', 40) : '#ffffff', boxShadow: `0 0 ${size * 2}px ${soft('#ffffff', 0.6)}`, ...run('vv-twinkle', 0.6 + d.tint * 0.9, (i * 0.618) % 1) }, i);
          })}
        </>
      );
      break;
    case 'snow':
      // Each flake falls on its own, in three sizes for depth
      scene = (
        <>
          {layer({ inset: 0, background: `linear-gradient(180deg, ${soft(b, 0.25)}, transparent 60%)` })}
          {scatter(31, 48).map((d, i) => {
            const size = i % 6 === 0 ? 7 : i % 3 === 0 ? 4.5 : 2.5;
            return layer({ left: d.x, top: -0.1 * H, width: size, height: size, ['--vv-drop' as string]: `${H * 1.2}px`, ...run('vv-drop', size > 5 ? 0.6 : size > 3 ? 0.85 : 1.3, (i * 0.618) % 1, 'linear infinite') }, i,
              <div className="absolute inset-0 rounded-full" style={{ background: soft(mix(a, '#ffffff', 30), 0.6 + d.tint * 0.35), boxShadow: `0 0 ${size}px ${soft('#ffffff', 0.5)}`, ...run('vv-sway-x', 0.3 + d.size * 0.2, d.tint) }} />,
            );
          })}
        </>
      );
      break;
    case 'fireflies':
      scene = (
        <>
          {layer({ inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 100%, ${soft(b, 0.3)}, transparent)` })}
          {scatter(51, 30).map((d, i) => {
            const size = 4 + d.size * 5;
            const color = d.tint > 0.5 ? a : mix(a, '#ffffff', 60);
            return layer({ left: d.x, top: d.y, width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 ${size * 2.5}px ${size * 0.6}px ${soft(color, 0.6)}`, ...run('vv-firefly', 0.6 + d.size * 0.8, (i * 0.618) % 1) }, i);
          })}
        </>
      );
      break;
    case 'clouds': {
      // Soft clouds across a strip twice the screen wide, drawn twice so it loops without a seam
      const r = seeded(71);
      const clouds = Array.from({ length: 7 }, () => ({ x: r() * 50, y: 10 + r() * 60, w: 18 + r() * 22, h: 10 + r() * 14, alpha: 0.12 + r() * 0.16 }));
      const puffs = [...clouds, ...clouds.map((c) => ({ ...c, x: c.x + 50 }))]
        .map((c) => `radial-gradient(ellipse ${c.w / 2}% ${c.h}% at ${c.x}% ${c.y}%, ${soft(mix(a, '#ffffff', 50), c.alpha)}, transparent)`)
        .join(',');
      scene = (
        <>
          {layer({ inset: 0, background: `linear-gradient(180deg, ${soft(b, 0.45)}, transparent 75%)` })}
          {layer({ left: 0, top: 0, width: '200%', height: '100%', background: puffs, ...run('vv-slide', 1, 0, 'linear infinite') })}
        </>
      );
      break;
    }
    case 'ripples': {
      const side = diagonal * 0.9;
      scene = (
        <>
          {layer({ inset: 0, background: `radial-gradient(circle at 50% 50%, ${soft(b, 0.3)}, transparent 55%)` })}
          {[0, 1, 2].map((i) =>
            layer(
              {
                left: (W - side) / 2,
                top: (H - side) / 2,
                width: side,
                height: side,
                borderRadius: '50%',
                background: `radial-gradient(circle, transparent 58%, ${soft(a, 0.32)} 64%, transparent 70%)`,
                ...run('vv-ripple', 1, i / 3, 'ease-out infinite'),
              },
              i,
            ),
          )}
        </>
      );
      break;
    }
    case 'cross': {
      // A cross of soft light, sized by the height so it keeps its shape on any screen
      const arm = H * 0.62;
      scene = (
        <>
          {layer({ inset: 0, background: `radial-gradient(circle at 50% 42%, ${soft(b, 0.35)}, transparent 55%)` })}
          {layer({ left: 0, top: 0, width: '100%', height: '100%', ...run('vv-breathe') }, 'cross',
            <>
              <div className="absolute" style={{ left: W / 2 - H * 0.06, top: H * 0.06, width: H * 0.12, height: H * 0.88, background: `radial-gradient(closest-side, ${soft(mix(a, '#ffffff', 60), 0.7)}, ${soft(a, 0.25)} 45%, transparent)` }} />
              <div className="absolute" style={{ left: W / 2 - arm / 2, top: H * 0.27, width: arm, height: H * 0.12, background: `radial-gradient(closest-side, ${soft(mix(a, '#ffffff', 60), 0.7)}, ${soft(a, 0.25)} 45%, transparent)` }} />
            </>,
          )}
        </>
      );
      break;
    }
    case 'streaks':
      // Fine beams at an angle; each set moves exactly one repeat, so it loops without a jump
      scene = [
        { color: a, period: 260, alpha: 0.2, length: 1 },
        { color: b, period: 420, alpha: 0.18, length: 1.6 },
      ].map((s, i) => {
        const shift = s.period / Math.sin((115 * Math.PI) / 180);
        return layer(
          {
            left: -shift,
            top: 0,
            width: W + shift * 2,
            height: '100%',
            background: `repeating-linear-gradient(115deg, transparent 0px, transparent ${s.period - 14}px, ${soft(s.color, s.alpha)} ${s.period - 7}px, transparent ${s.period}px)`,
            ['--vv-shift' as string]: `${shift}px`,
            ...run('vv-shift', s.length, i * 0.5, 'linear infinite'),
          },
          i,
        );
      });
      break;
    case 'sheen':
      scene = (
        <>
          {layer({ inset: 0, background: `linear-gradient(135deg, ${mix(a, base, 28)}, ${base} 55%, ${mix(b, base, 32)})` })}
          {layer({ left: 0, top: '-20%', width: '35%', height: '140%', background: `linear-gradient(90deg, transparent, ${soft(mix(a, '#ffffff', 50), 0.16)}, transparent)`, ...run('vv-sweep', 1, 0, 'ease-in-out infinite') })}
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
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: base }} data-motion={motion.style} data-still={still ? 'yes' : undefined}>
      {scene}
      {/* The soft dark edges and the darkening are one layer, so the screen has less to draw */}
      <div className="absolute inset-0" style={{ background: dim > 0 ? `${VIGNETTE}, rgba(0,0,0,${dim})` : VIGNETTE }} />
    </div>
  );
};
