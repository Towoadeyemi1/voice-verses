/**
 * Show me the fix (1.19.11, the approved Training mock-up, screen 6): a warning's fix as one
 * thing lit up on the right Settings page, in one line (shown, never said aloud: a service may be
 * on, 1.19.13), with "Do it for me" where Voice Verses
 * can; as soon as the check passes, "✓ Hearing the preacher again", and back to the live screen
 * in 2 seconds (unless the volunteer has moved on to another page, where it just ends). Esc
 * (closing Settings) goes back at any time. Listening carries on throughout.
 */
import { find, narrate, until } from '@/lib/guide';
import type { BoothFixInfo } from '@/lib/boothCheck';
import type { Pane } from '@/components/SettingsPanel';

export interface FixContext {
  /** Opens Settings on the page */
  open: (pane: Pane) => void;
  /** Settings is still open (Esc ends the fix) */
  isOpen: () => boolean;
  /** Back to where the volunteer was */
  close: () => void;
  /** True once the warning has cleared */
  check: () => Promise<boolean>;
  /** "Do it for me": true when it was done */
  doIt?: () => Promise<boolean>;
}

const LABEL = 'Show me the fix';
const POLL_MS = 1500;
const GIVE_UP_MS = 5 * 60_000;
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

let current = 0;

/** Stops a fix in progress (another one started, or the screen is leaving). */
export function stopFix(): void {
  current++;
  void narrate(null);
}

/** Runs a fix; resolves true if the warning cleared. */
export async function showMeTheFix(fix: BoothFixInfo, ctx: FixContext): Promise<boolean> {
  if (!fix.pane) return false;
  const run = ++current;
  const alive = () => run === current && ctx.isOpen();
  ctx.open(fix.pane);
  // The page draws in a moment; the control may be further down it
  await until(() => ctx.isOpen() && (!fix.target || !!find(fix.target)), 3000, () => run === current);
  if (run !== current) return false;
  const el = find(fix.target);
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Light it once it has arrived, so the light and the line land on it, not where it was
    await sleep(500);
    if (run !== current) return false;
  }

  const base = { target: fix.target, label: LABEL, anywhere: true };
  const ask = (say: string, note = 'Listening carries on. Esc goes back.') =>
    narrate({
      ...base,
      say,
      note,
      action: ctx.doIt
        ? {
            label: 'Do it for me',
            run: async () => {
              if (run !== current) return;
              void narrate({ ...base, say: 'Listening to every input for the preacher…', note: 'A second or two.' });
              const done = await ctx.doIt!();
              if (run !== current) return;
              if (!done) void ask('No input has the preacher’s sound right now. Check the desk channel and the cable, then choose it here.');
            },
          }
        : undefined,
    });
  void ask(fix.say ?? `Fix it here: ${fix.label}.`);

  // The volunteer went to another page: they are doing something else, so the fix ends quietly
  const onPage = () => !fix.target || !!find(fix.target);
  let away = 0;
  const until_ = Date.now() + GIVE_UP_MS;
  while (alive() && Date.now() < until_) {
    await sleep(POLL_MS);
    if (!alive()) break;
    away = onPage() ? 0 : away + 1;
    if (away >= 2) break;
    if (await ctx.check().catch(() => false)) {
      if (run !== current) return false;
      void narrate({ ...base, say: fix.solved ?? 'Fixed.', note: 'Back to the live screen in 2 seconds.', done: true });
      await sleep(2000);
      if (run !== current) return true;
      current++;
      void narrate(null);
      if (ctx.isOpen() && onPage()) ctx.close();
      return true;
    }
  }
  if (run === current) {
    current++;
    void narrate(null);
  }
  return false;
}
