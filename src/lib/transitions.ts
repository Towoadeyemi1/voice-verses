/**
 * How one slide changes to the next on the screens. A look sets its own
 * transition, and a slide in a service can choose a different one. The
 * incoming slide's transition is used, as in other presentation apps.
 *
 * When only the words change (the background is the same), only the words
 * move: the background carries on underneath without a flicker.
 */

export type TransitionKind = 'cut' | 'dissolve' | 'black' | 'lift' | 'push' | 'zoom';

export interface TransitionSpec {
  kind: TransitionKind;
  /** Seconds */
  duration: number;
}

export const TRANSITIONS: { id: TransitionKind; label: string; description: string }[] = [
  { id: 'dissolve', label: 'Dissolve', description: 'The new slide fades in over the old one' },
  { id: 'black', label: 'Through black', description: 'Fades down, then up on the new slide' },
  { id: 'lift', label: 'Lift', description: 'The new words fade in rising gently' },
  { id: 'zoom', label: 'Zoom', description: 'The new slide settles in from slightly larger' },
  { id: 'push', label: 'Push', description: 'The new slide pushes the old one to the left' },
  { id: 'cut', label: 'Cut', description: 'Changes at once, with no movement' },
];

export const DEFAULT_TRANSITION: TransitionSpec = { kind: 'dissolve', duration: 0.5 };

export const MAX_TRANSITION_SECONDS = 3;

/** A transition read from saved settings, made safe to use. */
export function cleanTransition(t: Partial<TransitionSpec> | undefined, fallback = DEFAULT_TRANSITION): TransitionSpec {
  const kind = TRANSITIONS.some((x) => x.id === t?.kind) ? (t!.kind as TransitionKind) : fallback.kind;
  const duration = typeof t?.duration === 'number' && Number.isFinite(t.duration) ? Math.min(MAX_TRANSITION_SECONDS, Math.max(0.1, t.duration)) : fallback.duration;
  return { kind, duration };
}

/**
 * The CSS animations for the slide leaving and the slide arriving.
 * An opaque layer (a background) that is leaving stays fully visible under
 * the new one until it is covered, so a dissolve never dips darker halfway.
 */
export function transitionAnimations(spec: TransitionSpec, opaque = false): { out: string; in: string; total: number } {
  const d = spec.duration;
  const hold = `vv-hold ${d}s linear both`;
  const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';
  switch (spec.kind) {
    case 'black':
      return { out: `vv-out-fade ${d / 2}s ${ease} both`, in: `vv-in-fade ${d / 2}s ${ease} ${d / 2}s both`, total: d };
    case 'lift':
      return { out: opaque ? hold : `vv-out-fade ${d * 0.6}s ${ease} both`, in: `vv-in-lift ${d}s ${ease} both`, total: d };
    case 'zoom':
      return { out: opaque ? hold : `vv-out-zoom ${d}s ${ease} both`, in: `vv-in-zoom ${d}s ${ease} both`, total: d };
    case 'push':
      return { out: `vv-out-push ${d}s ${ease} both`, in: `vv-in-push ${d}s ${ease} both`, total: d };
    case 'cut':
      return { out: 'none', in: 'none', total: 0 };
    default:
      return { out: opaque ? hold : `vv-out-fade ${d}s linear both`, in: `vv-in-fade ${d}s linear both`, total: d };
  }
}
