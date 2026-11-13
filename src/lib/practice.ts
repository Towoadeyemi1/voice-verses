/**
 * Practice mode (1.19.0): the live screen works as usual (Live, Next, Take,
 * Clear, songs, the demo) but nothing reaches the room. While practising, the
 * operator window keeps what it shows to itself: no other window (projector,
 * lower third, stage, DeckLink, NDI), no network screen and no ProPresenter
 * hears of it, and spirit learns nothing from it. When practice ends, this
 * window goes back to what the room was showing all along.
 *
 * It lives in this window only (not in storage), so a crash or a reload
 * always comes back out of practice.
 */
export const PRACTICE_CHANGED = 'voice-verses-practice-changed';

let on = false;
/** Why practice is on, for the band ("the demo", "Your first Sunday") */
let reason = '';

export const practising = () => on;
export const practiceReason = () => reason;

export function setPractice(next: boolean, why = '') {
  if (next === on && why === reason) return;
  on = next;
  reason = next ? why : '';
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PRACTICE_CHANGED, { detail: { on, reason } }));
}
