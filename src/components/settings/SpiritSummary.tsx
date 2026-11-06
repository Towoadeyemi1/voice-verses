import { forgive, MOVES, ServiceSummary, setCueLevel, setMoveLevel, SpiritState, updateSpirit, type MoveKind } from '@/lib/spirit';
import { SpiritOrb } from '@/components/spirit/SpiritOrb';
import { Hint, Section } from './kit';

/**
 * How a service went (1.18.0): spirit's score, the service from start to end,
 * the corrections worth a look ("Just this once" undoes one), and what has
 * earned Hands-free. Shown when listening stops, and in Settings → How spirit runs.
 */
export function SpiritSummary({ summary, spirit, title }: { summary: ServiceSummary; spirit: SpiritState; title?: string }) {
  const total = summary.right + summary.wrong + summary.manual;
  const pct = total ? Math.round((summary.right / total) * 100) : 0;
  const what = (at: string) => {
    const e = summary.corrections.find((x) => x.at === at);
    if (!e) return '';
    if (e.what) return e.what;
    if (e.move) return MOVES.find((m) => m.id === e.move)?.title ?? 'A move';
    const c = spirit.cues.find((x) => x.id === e.cueId) ?? e.undo?.cue;
    return c ? `“${c.phrase}”` : 'A cue';
  };
  const headline = !total
    ? 'Nothing to show yet.'
    : pct >= 60
      ? 'spirit ran most of this service.'
      : summary.right > 0
        ? 'spirit is learning this service.'
        : 'spirit watched, and learned from what you did.';

  return (
    <div className="flex flex-col gap-6" data-spirit-summary>
      <Section title={title ?? 'How it went'} aside={summary.type ?? undefined}>
        <div className="flex items-center gap-5 p-5 rounded-2xl" style={{ background: 'var(--s-surface)' }}>
          <div
            role="img"
            aria-label={`spirit made ${summary.right} of ${total} moves`}
            className="w-[112px] h-[112px] flex-none rounded-full grid place-items-center"
            style={{ background: `conic-gradient(#f0b44a 0, #f472b6 ${pct}%, var(--s-fill-2) ${pct}% 100%)` }}
          >
            <div className="w-[90px] h-[90px] rounded-full grid place-items-center text-center" style={{ background: 'var(--s-surface)' }}>
              <div>
                <b className="block text-[30px] leading-none font-extrabold tracking-[-0.03em]" data-spirit-score>{summary.right}</b>
                <span className="text-[13px]" style={{ color: 'var(--s-ink-2)' }}>of {total} moves</span>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <b className="block text-[18px] leading-snug">{headline}</b>
            <span className="text-[13.5px]" style={{ color: 'var(--s-ink-2)' }}>
              spirit made {summary.right} {summary.right === 1 ? 'move' : 'moves'} you took as they were. You made {summary.manual} yourself and corrected {summary.wrong}.
            </span>
          </div>
        </div>
        {summary.runs.length > 0 && (
          <>
            <div className="sp-run" aria-label="Who moved the service on, from start to end">
              {summary.runs.map((k, i) => (
                <i key={i} className={k} />
              ))}
            </div>
            <div className="sp-legend">
              <span><i style={{ background: 'linear-gradient(135deg, rgba(240,180,74,.85), rgba(244,114,182,.75))' }} />spirit got it right</span>
              <span><i style={{ background: 'var(--s-fill-2)' }} />You chose</span>
              <span><i style={{ background: 'repeating-linear-gradient(135deg, var(--s-warn) 0 3px, transparent 3px 6px)' }} />Corrected</span>
            </div>
          </>
        )}
      </Section>

      {summary.corrections.length > 0 && (
        <Section title={`Worth a look: ${summary.corrections.length} ${summary.corrections.length === 1 ? 'correction' : 'corrections'}`} aside="spirit already changed what it does; undo any that was a one-off">
          <div className="st-list">
            {summary.corrections.map((e) => (
              <div key={e.at} className="st-row" data-correction>
                <time className="w-[68px] flex-none text-[13px] tabular-nums whitespace-nowrap" style={{ color: 'var(--s-ink-2)' }}>
                  {new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </time>
                <span className="text">
                  <span className="t">{what(e.at)}</span>
                  <span className="d">{e.forgiven ? 'Undone: it counts as if it never happened' : `You said: ${e.note ?? 'not this'}. spirit will remember.`}</span>
                </span>
                {!e.forgiven && (
                  <button type="button" className="st-btn ghost" onClick={() => updateSpirit((s) => forgive(s, e.at))} title="This was a one-off: put the cue or move back as it was">
                    Just this once
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {summary.earned.length > 0 && (
        <Section title="Ready to go further">
          <div className="st-list">
            {summary.earned.map((x) => (
              <div key={x.id} className="st-row" data-earned={x.id}>
                <SpiritOrb size={26} />
                <span className="text">
                  <span className="t">{x.title}</span>
                  <span className="d">Right 10 times in a row. Let it go live by itself, after a 3-second countdown you can stop?</span>
                </span>
                <button
                  type="button"
                  className="st-btn primary"
                  onClick={() => updateSpirit((s) => (x.kind === 'cue' ? setCueLevel(s, x.id, 'handsfree') : setMoveLevel(s, x.id as MoveKind, 'handsfree')))}
                >
                  Make it Hands-free
                </button>
              </div>
            ))}
          </div>
          <Hint>Hands-free also needs spirit set to Hands-free, at the top of How spirit runs.</Hint>
        </Section>
      )}
    </div>
  );
}
