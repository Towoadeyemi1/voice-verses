import { useEffect, useState } from 'react';
import { BookOpen, BookOpenCheck, ListOrdered, Lock, Music, Sparkles, Timer } from 'lucide-react';
import { accuracy, CueLevel, serviceSummary, loadSpirit, SPIRIT_CHANGED, SpiritLevel, SpiritState, updateSpirit } from '@/lib/spirit';
import { FEATURES_CHANGED, loadFeatures, saveFeatures } from '@/lib/features';
import { SpiritOrb } from '@/components/spirit/SpiritOrb';
import { Hint, Section, Sq, Toggle } from './kit';
import { SpiritSummary } from './SpiritSummary';

/** The current spirit state, kept up to date across windows. */
export function useSpirit(): SpiritState {
  const [state, setState] = useState(loadSpirit);
  useEffect(() => {
    const reload = () => setState(loadSpirit());
    window.addEventListener(SPIRIT_CHANGED, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(SPIRIT_CHANGED, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  return state;
}

function useFeatures() {
  const [features, setFeatures] = useState(loadFeatures);
  useEffect(() => {
    const reload = () => setFeatures(loadFeatures());
    window.addEventListener(FEATURES_CHANGED, reload);
    return () => window.removeEventListener(FEATURES_CHANGED, reload);
  }, []);
  return features;
}

const LEVELS: { id: SpiritLevel; label: string; hint: string; steps: number }[] = [
  { id: 'off', label: 'Off', hint: 'You run everything. Verses said outright still go up.', steps: 0 },
  { id: 'next', label: 'Ready in Next', hint: 'Each part, point or verse waits in Next until you press Take.', steps: 2 },
  { id: 'handsfree', label: 'Hands-free', hint: 'Cues that have earned it go live by themselves after a 3-second countdown you can stop. The rest waits in Next.', steps: 3 },
];

/** Settings → spirit: how much spirit does, how the last service went, and what it knows. */
export function SpiritPage({ onCues }: { onCues: () => void }) {
  const spirit = useSpirit();
  const features = useFeatures();
  const last = serviceSummary(spirit);
  const moments = spirit.cues.filter((c) => (c.moment || c.part) && !c.off);
  const points = spirit.cues.filter((c) => c.point && !c.off);
  const momentsRight = accuracy(moments);
  const pointsRight = accuracy(points);
  const pct = (a: { right: number; total: number }) => (a.total ? `${Math.round((a.right / a.total) * 100)}% right` : 'No record yet');

  /** A kind's trust: Off (its feature switched off), Learning or Ready in Next for all its cues. Hands-free is per cue. */
  const kindLevel = (on: boolean, cues: typeof moments): 'off' | CueLevel => (!on ? 'off' : cues.length && cues.every((c) => c.level === 'learning') ? 'learning' : 'next');
  const setKind = (feature: 'momentAutopilot' | 'sermonPoints', isKind: (c: (typeof moments)[0]) => boolean, level: 'off' | CueLevel) => {
    saveFeatures({ ...loadFeatures(), [feature]: level !== 'off' });
    if (level === 'off') return;
    updateSpirit((s) => ({ ...s, cues: s.cues.map((c) => (isKind(c) && c.level !== 'handsfree' ? { ...c, level, updatedAt: new Date().toISOString() } : c)) }));
  };
  const trust = (value: 'off' | CueLevel, onChange: (l: 'off' | CueLevel) => void, label: string) => (
    <div className="sp-trust" role="radiogroup" aria-label={label}>
      {(['off', 'learning', 'next'] as const).map((l) => (
        <button key={l} type="button" role="radio" aria-checked={value === l} onClick={() => onChange(l)}>
          {l === 'off' ? 'Off' : l === 'learning' ? 'Learning' : 'Ready in Next'}
        </button>
      ))}
      <button type="button" disabled title="Hands-free is chosen for each cue once it has been right 10 times in a row (Cues)">
        <Lock /> Hands-free
      </button>
    </div>
  );

  return (
    <div className="st-page" data-spirit-page>
      <div className="sp-hero">
        <SpiritOrb size={84} />
        <div>
          <h3>{last.day ? (last.right >= last.manual + last.wrong ? 'spirit ran most of your last service.' : 'spirit is learning your service.') : 'spirit is ready to learn your service.'}</h3>
          <p>
            It listens, watches what you do, and gets the next thing ready. Every Take tells it it was right; every correction teaches it. It only goes live by itself where you have
            allowed it, and only once it has earned it.
          </p>
        </div>
      </div>

      <Section title="How much spirit does" aside="You can change this in the middle of a service">
        <div className="sp-levels" role="radiogroup" aria-label="How much spirit does">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={spirit.level === l.id} className="sp-level" onClick={() => updateSpirit((s) => ({ ...s, level: l.id }))}>
              <b>{l.label}</b>
              <span>{l.hint}</span>
              <span className="sp-steps" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <i key={i} className={i < l.steps ? 'on' : ''} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {last.day ? (
        <SpiritSummary summary={last} spirit={spirit} title={`Your last service, ${new Date(last.day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`} />
      ) : (
        <Section title="Your last service">
          <Hint>Nothing yet. spirit starts learning the first time you press Start listening with a service loaded.</Hint>
        </Section>
      )}

      <Section title="What spirit knows" aside="Each can go as far as you allow">
        <div className="sp-knows">
          <div className="sp-know">
            <div className="head">
              <Sq tint="blue" icon={BookOpen} />
              <b>Verses said outright</b>
            </div>
            <p>“John 3:16”, and quotes it is 99% sure of. Always shown at once: the rule for scripture.</p>
            <span className="st-pill accent self-start" style={{ marginLeft: 0 }}>
              Always hands-free
            </span>
          </div>
          <div className="sp-know">
            <div className="head">
              <Sq tint="blue" icon={BookOpenCheck} />
              <b>Following the reading</b>
              <Toggle label="Following the reading" checked={features.readAlong} onChange={(on) => saveFeatures({ ...loadFeatures(), readAlong: on })} />
            </div>
            <p>Each verse goes up as the reader reaches it, when Auto is on above Live.</p>
          </div>
          <div className="sp-know">
            <div className="head">
              <Sq tint="violet" icon={Music} />
              <b>Following the singers</b>
              <Toggle label="Following the singers" checked={features.worshipCues} onChange={(on) => saveFeatures({ ...loadFeatures(), worshipCues: on })} />
            </div>
            <p>Each slide of the song as it is sung, and the leader’s “one more time”.</p>
          </div>
          <div className="sp-know" data-know="moments">
            <div className="head">
              <Sq tint="orange" icon={Sparkles} />
              <b>Moments</b>
            </div>
            <p>
              {moments.length} cues: “let us pray”, the offering, the benediction. {pct(momentsRight)}.
            </p>
            {trust(kindLevel(features.momentAutopilot, moments), (l) => setKind('momentAutopilot', (c) => !!(c.moment || c.part), l), 'Moments')}
          </div>
          <div className="sp-know" data-know="points">
            <div className="head">
              <Sq tint="orange" icon={ListOrdered} />
              <b>Sermon points</b>
            </div>
            <p>“Point number two…” as a point slide. {pct(pointsRight)}.</p>
            {trust(kindLevel(features.sermonPoints, points), (l) => setKind('sermonPoints', (c) => !!c.point, l), 'Sermon points')}
          </div>
          <div className="sp-know">
            <div className="head">
              <Sq tint="slate" icon={Timer} />
              <b>The order of service</b>
              <span className="st-pill">Coming</span>
            </div>
            <p>Moving on when a part’s time is up, and to the part after a song ends. Until then, Move on by time is on the live screen.</p>
          </div>
        </div>
      </Section>
      <Hint>
        spirit learns on this computer. With a library folder (Settings → Library and backup), what it has learned goes to the church’s other computers too. Hands-free is chosen for each
        cue, in{' '}
        <button type="button" className="st-btn link" style={{ display: 'inline', minHeight: 0 }} onClick={onCues}>
          Cues
        </button>
        , once it has been right 10 times in a row.
      </Hint>
    </div>
  );
}
