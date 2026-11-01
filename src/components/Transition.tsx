import { ReactNode, useEffect, useRef, useState } from 'react';
import { TransitionSpec, transitionAnimations } from '@/lib/transitions';

interface Leaving {
  gen: number;
  node: ReactNode;
  animation: string;
}

/**
 * Plays a transition whenever `id` changes: the last thing shown stays on
 * screen while it leaves, and the new one arrives over it. Nothing moves
 * when it first appears (opening an output window, a thumbnail).
 *
 * The old content keeps its place in the tree while it leaves, so a video
 * behind it keeps playing instead of starting again.
 */
export const Transition = ({
  id,
  spec,
  opaque = false,
  children,
}: {
  /** What is shown; a new id plays the transition */
  id: string;
  spec: TransitionSpec;
  /** A background: the old one stays fully visible until it is covered */
  opaque?: boolean;
  children: ReactNode;
}) => {
  const [state, setState] = useState<{ id: string; gen: number; leaving: Leaving[]; enter: string | null }>({ id, gen: 0, leaving: [], enter: null });
  const shown = useRef<ReactNode>(children);

  // A new id: what was shown starts leaving (React's way to update state from props during render)
  if (state.id !== id) {
    const anim = transitionAnimations(spec, opaque);
    const moving = spec.kind !== 'cut';
    setState({
      id,
      gen: state.gen + 1,
      leaving: moving ? [...state.leaving.slice(-1), { gen: state.gen, node: shown.current, animation: anim.out }] : [],
      enter: moving ? anim.in : null,
    });
  }
  shown.current = children;

  // Take the old content away when it has gone (also if the window was hidden and the animation never ran)
  const total = transitionAnimations(spec, opaque).total;
  useEffect(() => {
    if (!state.leaving.length) return;
    const timer = window.setTimeout(() => setState((s) => ({ ...s, leaving: [] })), total * 1000 + 250);
    return () => window.clearTimeout(timer);
  }, [state.gen, state.leaving.length, total]);

  return (
    <>
      {state.leaving.map((l) => (
        <div
          key={l.gen}
          className="absolute inset-0 pointer-events-none"
          style={{ animation: l.animation }}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setState((s) => ({ ...s, leaving: s.leaving.filter((x) => x.gen !== l.gen) }));
          }}
          aria-hidden
        >
          {l.node}
        </div>
      ))}
      <div key={state.gen} className="absolute inset-0" style={state.enter ? { animation: state.enter } : undefined}>
        {children}
      </div>
    </>
  );
};
