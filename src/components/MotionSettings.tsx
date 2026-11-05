import { useEffect, useState } from 'react';
import { clearSlowFinding, MIN_SMOOTH_FPS, MOTION_CHANGED, MotionMode, motionMode, setMotionMode, slowFinding } from '@/lib/motionQuality';
import { Section } from './settings/kit';

const CHOICES: { id: MotionMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Automatic', hint: 'Move, unless this computer is too slow to keep them smooth' },
  { id: 'full', label: 'Always move', hint: 'Move even if this computer struggles' },
  { id: 'still', label: 'Keep still', hint: 'Show every background as a still picture' },
];

/**
 * Whether moving backgrounds move on this computer. Each computer decides for
 * itself; a slow one keeps them still so the screens never stutter.
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
    <Section title="Moving backgrounds on this computer">
      <p className="st-hint">They are drawn by the graphics chip and never slow down listening. If this computer can’t keep them smooth, they stand still by themselves.</p>
      <div className="st-choices" role="radiogroup" aria-label="Moving backgrounds on this computer">
        {CHOICES.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={mode === c.id} onClick={() => setMotionMode(c.id)} className="st-choice">
            <b>{c.label}</b>
            <span>{c.hint}</span>
          </button>
        ))}
      </div>
      {mode === 'auto' && slow && (
        <div className="st-note">
          <span className="flex-1">
            On {new Date(slow.at).toLocaleDateString()} this computer drew moving backgrounds at {slow.fps} frames a second (smooth is {MIN_SMOOTH_FPS} or more), so they stand still here now.
          </span>
          <button type="button" className="st-btn" onClick={clearSlowFinding}>
            Try moving again
          </button>
        </div>
      )}
    </Section>
  );
};
