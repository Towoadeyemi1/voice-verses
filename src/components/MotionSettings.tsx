import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearSlowFinding, MIN_SMOOTH_FPS, MOTION_CHANGED, MotionMode, motionMode, setMotionMode, slowFinding } from '@/lib/motionQuality';

const CHOICES: { id: MotionMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Automatic', hint: 'Move, unless this computer is found too slow to keep them smooth' },
  { id: 'full', label: 'Always move', hint: 'Move even if this computer struggles' },
  { id: 'still', label: 'Keep still', hint: 'Show every background as a still picture' },
];

/**
 * Settings → Screens: whether moving backgrounds move on this computer. Each
 * computer decides for itself; a slow one keeps them still so the screens
 * never stutter.
 */
export const MotionSettings = () => {
  const [mode, setMode] = useState(motionMode);
  const [slow, setSlow] = useState(slowFinding);
  useEffect(() => {
    const update = () => {
      setMode(motionMode());
      setSlow(slowFinding());
    };
    window.addEventListener(MOTION_CHANGED, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(MOTION_CHANGED, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return (
    <section className="space-y-3 pt-2">
      <div>
        <h3 className="m-0 text-[15px] font-semibold flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          Moving backgrounds on this computer
        </h3>
        <p className="m-0 mt-1 text-sm text-muted-foreground max-w-[70ch]">
          Moving backgrounds are drawn by the graphics chip and never slow down listening, which runs on its own. If this
          computer can't keep them smooth, they stand still by themselves.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Moving backgrounds on this computer">
        {CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={mode === c.id}
            onClick={() => setMotionMode(c.id)}
            className={`min-h-[64px] rounded-xl p-3 text-left transition ${mode === c.id ? 'bg-card ring-2 ring-foreground shadow-sm' : 'bg-muted/50 hover:bg-muted'}`}
          >
            <span className="block text-sm font-semibold">{c.label}</span>
            <span className="block mt-0.5 text-[13px] text-muted-foreground leading-snug">{c.hint}</span>
          </button>
        ))}
      </div>
      {mode === 'auto' && slow && (
        <div className="rounded-xl bg-muted/50 p-3 flex flex-wrap items-center gap-3">
          <p className="m-0 text-sm flex-1 min-w-[16rem]">
            On {new Date(slow.at).toLocaleDateString()} this computer drew moving backgrounds at {slow.fps} frames a second (smooth is{' '}
            {MIN_SMOOTH_FPS} or more), so they stand still here now.
          </p>
          <Button size="sm" variant="outline" onClick={clearSlowFinding}>
            Try moving again
          </Button>
        </div>
      )}
    </section>
  );
};
