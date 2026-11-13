import { Lock, Zap } from 'lucide-react';
import { accuracy, CueLevel, HANDS_FREE_AFTER, moveCanBeHandsFree, MOVES, moveTrust, setMoveLevel, updateSpirit, type MoveKind } from '@/lib/spirit';
import { SpiritOrb } from '@/components/spirit/SpiritOrb';
import { Hint, Section } from './kit';
import { useSpirit } from './SpiritPage';

/**
 * Settings → What spirit does (1.18.0): every kind of move spirit can make in a
 * service, each on its own trust ladder (Learning → Ready in Next → Hands-free
 * after 10 right in a row). Spoken cues have their own page (Cues).
 */
export function MovesPage({ onCues }: { onCues: () => void }) {
  const spirit = useSpirit();
  const groups = [...new Set(MOVES.map((m) => m.group))];
  const earned = MOVES.filter((m) => m.works && moveTrust(spirit, m.id).level !== 'handsfree' && moveCanBeHandsFree(spirit, m.id));
  const moments = spirit.cues.filter((c) => (c.moment || c.part) && !c.off);
  const points = spirit.cues.filter((c) => c.point && !c.off);

  const dots = (record: string[]) => [...Array(10 - record.length).fill('none'), ...record];

  const row = (id: MoveKind) => {
    const m = MOVES.find((x) => x.id === id)!;
    const t = moveTrust(spirit, id);
    const unlocked = moveCanBeHandsFree(spirit, id);
    const right = t.record.filter((o) => o === 'right').length;
    return (
      <div key={id} className={`sp-cue move ${m.works ? '' : 'soon'}`} data-move={id}>
        <span className="p">
          {m.title}
          <small>{m.desc}</small>
        </span>
        <span className="sp-record" aria-label={`${right} of the last ${t.record.length} right`} title={`Last ${t.record.length}: ${right} right`}>
          {dots(t.record).map((o, i) => (
            <i key={i} className={o === 'right' ? '' : o} />
          ))}
        </span>
        {m.works ? (
          <div className="sp-trust" role="radiogroup" aria-label={`How far to trust: ${m.title}`}>
            {(['learning', 'next'] as CueLevel[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={t.level === l} onClick={() => updateSpirit((s) => setMoveLevel(s, id, l))}>
                {l === 'learning' ? 'Learning' : 'Ready in Next'}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              className="hf"
              aria-checked={t.level === 'handsfree'}
              disabled={!unlocked}
              title={!m.handsFree ? 'Hands-free for this comes later, when spirit can tell the singing has finished' : unlocked ? 'Goes live by itself when spirit is Hands-free, after a 3-second countdown' : `Unlocks after ${HANDS_FREE_AFTER} right in a row`}
              onClick={() => updateSpirit((s) => setMoveLevel(s, id, 'handsfree'))}
            >
              {unlocked ? <Zap /> : <Lock />}
              {!m.handsFree ? 'Hands-free soon' : unlocked ? 'Hands-free' : `${Math.min(t.streak, HANDS_FREE_AFTER)} of ${HANDS_FREE_AFTER}`}
            </button>
          </div>
        ) : (
          <span className="st-pill">Coming soon</span>
        )}
        <span />
      </div>
    );
  };

  return (
    <div className="st-page" data-moves-page>
      <Hint>
        Each move starts at Ready in Next: spirit gets it ready, you press Take. It earns Hands-free on its own, after {HANDS_FREE_AFTER} right in a row, and only goes there when you choose.
      </Hint>

      {earned.length > 0 && (
        <div className="sp-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} data-moves-earned>
          <SpiritOrb size={30} />
          <span className="flex-1 min-w-0">
            <b className="block">{earned.length === 1 ? `“${earned[0].title}” has earned Hands-free` : `${earned.length} moves have earned Hands-free`}</b>
            <span className="text-[13.5px]" style={{ color: 'var(--s-ink-2)' }}>
              Right {HANDS_FREE_AFTER} times in a row. Let {earned.length === 1 ? 'it' : 'them'} go live by {earned.length === 1 ? 'itself' : 'themselves'}?
            </span>
          </span>
          <button type="button" className="st-btn primary" onClick={() => updateSpirit((s) => earned.reduce((st, m) => setMoveLevel(st, m.id, 'handsfree'), s))}>
            {earned.length === 1 ? 'Make it Hands-free' : 'Make them Hands-free'}
          </button>
        </div>
      )}

      <Section title="Spoken cues" aside="Taught, built in, or noticed by spirit">
        <div className="st-list">
          {[
            { title: 'Moments on cue', desc: `“Let us pray”, “as the ushers make their way” and your own. ${moments.length} cues.`, a: accuracy(moments) },
            { title: 'Sermon points', desc: '“Point number two…” as a point slide.', a: accuracy(points) },
          ].map((k) => (
            <button key={k.title} type="button" className="st-row clickable w-full text-left" style={{ border: 0, background: 'none', color: 'inherit' }} onClick={onCues}>
              <span className="text">
                <span className="t">{k.title}</span>
                <span className="d">{k.desc}</span>
              </span>
              <span className="text-[13px]" style={{ color: 'var(--s-ink-2)' }}>
                {k.a.total ? `Right ${k.a.right} of the last ${k.a.total}` : 'No record yet'} · Cues ›
              </span>
            </button>
          ))}
        </div>
      </Section>

      {groups.map((g) => (
        <Section key={g} title={g}>
          <div className="st-list">{MOVES.filter((m) => m.group === g).map((m) => row(m.id))}</div>
        </Section>
      ))}
      <Hint>A correction sends a move back to Ready in Next. “Never” in “Not this” sends it back to Learning, where spirit only watches.</Hint>
    </div>
  );
}
