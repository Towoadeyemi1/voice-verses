import { Pause, Play } from 'lucide-react';
import { SpiritOrb } from '@/components/spirit/SpiritOrb';

export interface SpiritExpectation {
  /** What spirit will get ready, e.g. "Offering" */
  what: string;
  /** When, in words, e.g. "when the preacher says “as the ushers make their way”" */
  when: string;
  /** How far it goes: "Hands-free", "Ready in Next", "Learning", "Always" */
  level: string;
}

/**
 * "What spirit will do next", under the order of service (1.18.0): the next
 * few things spirit is listening or watching for, and how far each goes, with
 * one Pause that hands everything back to the operator for now.
 */
export const SpiritStrip = ({
  paused,
  type,
  expect,
  score,
  onPause,
  onOpen,
}: {
  paused: boolean;
  /** The type of service spirit is running it as */
  type: string;
  expect: SpiritExpectation[];
  /** Moves so far in this service: spirit's, of all */
  score: { right: number; total: number };
  onPause: () => void;
  onOpen: () => void;
}) => (
  <div className="flex items-center gap-2.5 min-w-0" data-spirit-strip aria-label="What spirit will do next">
    <button
      type="button"
      onClick={onOpen}
      className="h-9 pl-2 pr-3 rounded-full flex items-center gap-2 text-[13.5px] font-semibold whitespace-nowrap flex-shrink-0 hover:brightness-110"
      style={{ background: paused ? 'hsl(var(--muted))' : 'linear-gradient(135deg, rgba(240,180,74,.18), rgba(244,114,182,.14))', boxShadow: paused ? undefined : 'inset 0 0 0 1px rgba(240,180,74,.35)' }}
      title="How spirit runs: what it does, and how far it is trusted"
    >
      <SpiritOrb size={18} still />
      {paused ? 'spirit is paused' : `spirit · ${type}`}
    </button>
    <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
      {paused ? (
        <span className="text-[13.5px] text-muted-foreground truncate">Nothing moves by itself and nothing is got ready until you resume. Verses said outright still go up.</span>
      ) : expect.length ? (
        expect.map((e, i) => (
          <span key={i} className="h-9 px-3 rounded-full bg-muted/60 flex items-center gap-2 text-[13.5px] min-w-0 flex-shrink" data-spirit-expect title={`${e.what} ${e.when} · ${e.level}`}>
            <b className="font-semibold whitespace-nowrap">{e.what}</b>
            <span className="text-muted-foreground truncate">{e.when}</span>
            <span
              className="text-[12px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={e.level === 'Hands-free' ? { background: '#f0b44a', color: '#2a1d04' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
            >
              {e.level}
            </span>
          </span>
        ))
      ) : (
        <span className="text-[13.5px] text-muted-foreground truncate">Listening and watching. spirit gets the next part ready when it hears a cue.</span>
      )}
    </div>
    {score.total > 0 && (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap hidden xl:inline" title="Moves in this service that spirit made and you took as they were">
        spirit today: <b className="text-foreground">{score.right} of {score.total}</b>
      </span>
    )}
    <button
      type="button"
      onClick={onPause}
      className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-[13.5px] font-semibold whitespace-nowrap flex-shrink-0 bg-muted/70 hover:bg-muted"
      title={paused ? 'Let spirit carry on (P)' : 'Hand everything back to you for now (P)'}
      data-spirit-pause
    >
      {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      {paused ? 'Resume' : 'Pause'}
      <kbd className="text-[11px] text-muted-foreground font-sans">P</kbd>
    </button>
  </div>
);
