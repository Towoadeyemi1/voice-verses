import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { chipClass } from './ScreenPicker';
import { FEATURES, FEATURES_CHANGED, FeatureGroup, loadFeatures, matchingPreset, Preset, presetFeatures, saveFeatures } from '@/lib/features';

const PRESETS: { id: Preset; label: string; hint: string }[] = [
  { id: 'essentials', label: 'Essentials', hint: 'Verses said or read, and the safety checks. Nothing else happens by itself.' },
  { id: 'recommended', label: 'Recommended', hint: 'What most churches want. New, bolder features stay off.' },
  { id: 'everything', label: 'Everything', hint: 'Every feature on.' },
];
const GROUPS: FeatureGroup[] = ['Scripture', 'Worship', 'The service', 'Safety'];

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
    <div className="space-y-6" data-feature-settings>
      <div className="space-y-2">
        <p className="m-0 text-sm text-muted-foreground">
          A verse said outright, such as “John 3:16”, always works, whatever is switched off here.
        </p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Preset">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} className={chipClass(preset === p.id)} onClick={() => save(presetFeatures(p.id))} title={p.hint}>
              {p.label}
            </button>
          ))}
          {!preset && <span className="self-center text-[13px] text-muted-foreground px-2">Your own choice</span>}
        </div>
        <p className="m-0 text-[13px] text-muted-foreground">{PRESETS.find((p) => p.id === preset)?.hint ?? 'Some features changed from a preset.'}</p>
      </div>

      {GROUPS.map((group) => (
        <section key={group} className="space-y-1">
          <h3 className="m-0 text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">{group}</h3>
          <div className="rounded-xl bg-muted/40 divide-y divide-border/60">
            {FEATURES.filter((f) => f.group === group).map((f) => (
              <label key={f.id} className={`flex items-start gap-4 p-3.5 ${f.coming ? 'opacity-60' : 'cursor-pointer'}`} htmlFor={`feature-${f.id}`}>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold">
                    {f.title}
                    {f.coming && <span className="ml-2 text-[12px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Coming</span>}
                  </span>
                  <span className="block text-[13px] text-muted-foreground mt-0.5">{f.description}</span>
                </span>
                <Switch
                  id={`feature-${f.id}`}
                  checked={!f.coming && features[f.id]}
                  disabled={f.coming}
                  onCheckedChange={(on) => save({ ...features, [f.id]: on })}
                  aria-label={f.title}
                />
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
