import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScaledStage } from '@/components/ScaledStage';
import { MotionBackground } from '@/components/MotionBackground';
import { useColorTeam } from '@/hooks/use-color-team';
import { useTemplates } from '@/hooks/use-templates';
import { BACKGROUND_SAMPLES, BackgroundSample, MOTION_STYLES, MotionStyle } from '@/lib/backgrounds';
import { CONTENT_KINDS, ContentKind, saveTemplates, Template } from '@/lib/templates';

/** What was chosen: a style in the colour team's colours, or a ready-made sample. */
export type BackgroundChoice = { team: MotionStyle } | { sample: string };

const sampleOf = (choice: BackgroundChoice) => ('sample' in choice ? BACKGROUND_SAMPLES.find((s) => s.id === choice.sample) : undefined);
const labelOf = (choice: BackgroundChoice) => sampleOf(choice)?.name ?? MOTION_STYLES.find((m) => 'team' in choice && m.id === choice.team)?.label ?? '';

/** A look's background set to the choice (keeping its own speed and darkness for team styles). */
export function withBackground(t: Template, choice: BackgroundChoice): Template {
  const sample = sampleOf(choice);
  if (sample) return { ...t, background: { ...t.background, type: 'motion', color: sample.base, motion: structuredClone(sample.motion), dim: sample.dim } };
  const style = (choice as { team: MotionStyle }).team;
  const own = t.background.motion?.colors.every((c) => c.startsWith('team:'));
  return {
    ...t,
    background: {
      ...t.background,
      type: 'motion',
      color: t.background.color.startsWith('team:') ? t.background.color : 'team:background',
      motion: { style, colors: own && t.background.motion ? t.background.motion.colors : ['team:primary', 'team:secondary'], speed: t.background.motion?.speed || 1 },
      dim: t.background.type === 'motion' ? t.background.dim : 0.2,
    },
  };
}

const GROUPS: BackgroundSample['group'][] = ['Worship', 'Scripture and prayer', 'Seasons', 'Celebration', 'Calm'];

/**
 * Every background the app makes, as small moving pictures: each style in the
 * colour team's colours, and ready-made samples in their own colours. Only
 * the one pointed at or chosen moves, so the gallery itself stays light.
 */
export const BackgroundChooser = ({ value, onChange }: { value: BackgroundChoice; onChange: (c: BackgroundChoice) => void }) => {
  const team = useColorTeam();
  const [tab, setTab] = useState<'team' | 'samples'>('sample' in value ? 'samples' : 'team');
  const [hover, setHover] = useState<string | null>(null);
  const tile = (key: string, selected: boolean, onPick: () => void, preview: JSX.Element, name: string, hint: string) => (
    <button
      key={key}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      title={hint}
      onClick={onPick}
      onMouseEnter={() => setHover(key)}
      onMouseLeave={() => setHover((h) => (h === key ? null : h))}
      onFocus={() => setHover(key)}
      className={`rounded-xl p-1.5 text-left transition ${selected ? 'bg-card ring-2 ring-foreground' : 'bg-muted/40 hover:bg-muted/70'}`}
    >
      <ScaledStage className="aspect-video rounded-lg">{preview}</ScaledStage>
      <span className="flex items-center gap-1 px-1 pt-1.5 text-[13px] font-semibold truncate">
        {selected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
        {name}
      </span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex p-1 rounded-full bg-muted/70 w-fit" role="tablist">
        {([
          ['team', `In your colours (${team.name})`],
          ['samples', `Samples (${BACKGROUND_SAMPLES.length})`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-9 px-4 rounded-full text-sm font-semibold transition ${tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <>
          <p className="m-0 text-[13px] text-muted-foreground">These follow your colour team: when the team changes, they change with it.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Background">
            {MOTION_STYLES.map((m) => {
              const selected = 'team' in value && value.team === m.id;
              return tile(
                `team-${m.id}`,
                selected,
                () => onChange({ team: m.id }),
                <MotionBackground motion={{ style: m.id, colors: [team.colors.primary, team.colors.secondary], speed: 1 }} base={team.colors.background} paused={!selected && hover !== `team-${m.id}`} />,
                m.label,
                m.description,
              );
            })}
          </div>
        </>
      )}

      {tab === 'samples' &&
        GROUPS.map((group) => (
          <section key={group} className="space-y-2">
            <h3 className="m-0 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{group}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5" role="radiogroup" aria-label={group}>
              {BACKGROUND_SAMPLES.filter((s) => s.group === group).map((s) => {
                const selected = 'sample' in value && value.sample === s.id;
                return tile(
                  `sample-${s.id}`,
                  selected,
                  () => onChange({ sample: s.id }),
                  <MotionBackground motion={s.motion} base={s.base} dim={s.dim} paused={!selected && hover !== `sample-${s.id}`} />,
                  s.name,
                  MOTION_STYLES.find((m) => m.id === s.motion.style)?.description ?? '',
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
};

/**
 * Looks → Backgrounds: choose any background and put it behind scripture,
 * songs, announcements and countdowns on the projector in one click (it
 * changes the looks those use).
 */
export const BackgroundGallery = () => {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<BackgroundChoice>({ team: 'aurora' });
  const [kinds, setKinds] = useState<ContentKind[]>(['scripture', 'lyrics', 'announcement', 'countdown']);
  const { templates, assignments } = useTemplates();
  const name = labelOf(choice);

  const apply = () => {
    const ids = new Set(kinds.map((k) => assignments.projection[k]));
    saveTemplates(templates.map((t) => (ids.has(t.id) ? withBackground(t, choice) : t)));
    toast.success(`${name} is now behind ${kinds.map((k) => CONTENT_KINDS.find((c) => c.id === k)?.label.toLowerCase()).join(', ')} on the projector`);
    setOpen(false);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Sparkles className="w-4 h-4" />
        Backgrounds
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Backgrounds</DialogTitle>
            <DialogDescription>
              Made by the app: they work offline, need no files and have no copyright to check. Point at one to see it move.
            </DialogDescription>
          </DialogHeader>

          <BackgroundChooser value={choice} onChange={setChoice} />

          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-background/95 backdrop-blur border-t border-border flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold mr-1">Put it behind</span>
            {CONTENT_KINDS.map((k) => {
              const on = kinds.includes(k.id);
              return (
                <button
                  key={k.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setKinds(on ? kinds.filter((x) => x !== k.id) : [...kinds, k.id])}
                  className={`h-9 px-3.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition ${on ? 'bg-card text-foreground shadow-sm ring-1 ring-foreground/30' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {on && <Check className="w-3.5 h-3.5" />}
                  {k.label}
                </button>
              );
            })}
            <span className="text-[13px] text-muted-foreground">on the projector</span>
            <Button className="ml-auto" disabled={!kinds.length} onClick={apply}>
              Use {name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
