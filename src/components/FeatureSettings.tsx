import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightToLine,
  AudioLines,
  BookOpen,
  BookOpenCheck,
  Check,
  CircleHelp,
  ListOrdered,
  Music,
  PenLine,
  Quote,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { FEATURES, FEATURES_CHANGED, FeatureGroup, FeatureId, loadFeatures, matchingPreset, Preset, presetFeatures, saveFeatures } from '@/lib/features';
import { List, Note, Row, Section, Sq, Tint, Toggle } from './settings/kit';

const PRESETS: { id: Preset; label: string; hint: string; icon: LucideIcon; tint: Tint }[] = [
  { id: 'essentials', label: 'Essentials', hint: 'Verses said or read, and the safety checks. Nothing else happens by itself.', icon: ShieldCheck, tint: 'teal' },
  { id: 'recommended', label: 'Recommended', hint: 'What most churches want. Newer, bolder features wait until you switch them on.', icon: Star, tint: 'gold' },
  { id: 'everything', label: 'Everything', hint: 'Every feature on, including the newest.', icon: Sparkles, tint: 'violet' },
];
const GROUPS: { id: FeatureGroup; tint: Tint }[] = [
  { id: 'Scripture', tint: 'blue' },
  { id: 'Worship', tint: 'violet' },
  { id: 'The service', tint: 'orange' },
  { id: 'Safety', tint: 'teal' },
];
const ICONS: Record<FeatureId, LucideIcon> = {
  readAlong: BookOpenCheck,
  chapterWait: BookOpen,
  quotes: Quote,
  stories: Users,
  helpFind: CircleHelp,
  predictiveNext: ArrowRightToLine,
  songRecognition: Music,
  worshipCues: AudioLines,
  newSongs: PenLine,
  partCountdowns: Timer,
  momentAutopilot: Sparkles,
  sermonPoints: ListOrdered,
  boothCheck: ShieldCheck,
  guardian: AlertTriangle,
};
const BUILT = FEATURES.filter((f) => !f.coming);

/**
 * Settings → Features: every smart feature can be switched on or off, one by
 * one or with a preset. A reference said outright ("John 3:16") always works.
 */
export function FeatureSettings() {
  const [features, setFeatures] = useState(loadFeatures);
  useEffect(() => {
    const reload = () => setFeatures(loadFeatures());
    window.addEventListener(FEATURES_CHANGED, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(FEATURES_CHANGED, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  const preset = matchingPreset(features);
  const save = (next: typeof features) => {
    setFeatures(next);
    saveFeatures(next);
  };

  return (
    <div className="st-page" data-feature-settings>
      <div className="st-presets" role="radiogroup" aria-label="Start from a preset">
        {PRESETS.map((p) => {
          const want = presetFeatures(p.id);
          const on = BUILT.filter((f) => want[f.id]).length;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} className="st-preset" onClick={() => save(presetFeatures(p.id))}>
              <span className="st-tick" aria-hidden="true">
                <Check strokeWidth={3} />
              </span>
              <Sq tint={p.tint} icon={p.icon} size="lg" />
              <b>{p.label}</b>
              <span className="p">{p.hint}</span>
              <span className="st-count" title={`${on} of ${BUILT.length} features on`} aria-label={`${on} of ${BUILT.length} features on`}>
                {BUILT.map((f) => (
                  <i key={f.id} className={want[f.id] ? 'on' : ''} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {!preset && <Note icon={SlidersHorizontal}>Your own choice: some switches differ from the presets.</Note>}
      <Note icon={Quote}>
        A verse said outright, like <span className="ref">“John 3:16”</span>, <b>always</b> goes up, whatever is switched off below.
      </Note>

      {GROUPS.map(({ id: group, tint }) => {
        const list = FEATURES.filter((f) => f.group === group);
        const built = list.filter((f) => !f.coming);
        return (
          <Section key={group} title={group} aside={`${built.filter((f) => features[f.id]).length} of ${built.length} on`}>
            <List>
              {list.map((f) => (
                <Row
                  key={f.id}
                  dim={f.coming}
                  lead={<Sq tint={tint} icon={ICONS[f.id]} />}
                  title={
                    <>
                      {f.title}
                      {f.coming && <span className="st-pill">Coming</span>}
                    </>
                  }
                  desc={f.description}
                >
                  <Toggle id={`feature-${f.id}`} label={f.title} checked={!f.coming && features[f.id]} disabled={f.coming} onChange={(on) => save({ ...features, [f.id]: on })} />
                </Row>
              ))}
            </List>
          </Section>
        );
      })}
    </div>
  );
}

