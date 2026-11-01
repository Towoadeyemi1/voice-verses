import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScaledStage } from '@/components/ScaledStage';
import { MotionBackground } from '@/components/MotionBackground';
import { useColorTeam } from '@/hooks/use-color-team';
import { useTemplates } from '@/hooks/use-templates';
import { MOTION_STYLES, MotionStyle } from '@/lib/backgrounds';
import { CONTENT_KINDS, ContentKind, saveTemplates } from '@/lib/templates';

/**
 * The app's own backgrounds, moving in the colour team's colours, and one
 * click to put one behind scripture, songs, announcements or countdowns on
 * the projector (it changes the looks those use).
 */
export const BackgroundGallery = () => {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<MotionStyle>('aurora');
  const [kinds, setKinds] = useState<ContentKind[]>(['scripture', 'lyrics', 'announcement', 'countdown']);
  const team = useColorTeam();
  const { templates, assignments } = useTemplates();
  const chosen = MOTION_STYLES.find((m) => m.id === style)!;

  const apply = () => {
    const ids = new Set(kinds.map((k) => assignments.projection[k]));
    saveTemplates(
      templates.map((t) =>
        ids.has(t.id)
          ? {
              ...t,
              background: {
                ...t.background,
                type: 'motion',
                color: 'team:background',
                motion: { style, colors: t.background.motion?.colors ?? ['team:primary', 'team:secondary'], speed: t.background.motion?.speed || 1 },
                dim: t.background.type === 'motion' ? t.background.dim : 0.2,
              },
            }
          : t,
      ),
    );
    toast.success(`${chosen.label} is now behind ${kinds.map((k) => CONTENT_KINDS.find((c) => c.id === k)?.label.toLowerCase()).join(', ')} on the projector`);
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
              Made by the app in your colour team's colours ({team.name}). They work offline, need no files and have no copyright to
              check. When the team changes, they change with it.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="radiogroup" aria-label="Background">
            {MOTION_STYLES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={style === m.id}
                onClick={() => setStyle(m.id)}
                className={`rounded-2xl p-2 text-left transition ${style === m.id ? 'bg-card ring-2 ring-foreground' : 'bg-muted/40 hover:bg-muted/70'}`}
              >
                <ScaledStage className="aspect-video rounded-xl">
                  <MotionBackground motion={{ style: m.id, colors: [team.colors.primary, team.colors.secondary], speed: 1 }} base={team.colors.background} />
                </ScaledStage>
                <span className="flex items-center gap-1.5 px-1 pt-2 text-sm font-semibold">
                  {style === m.id && <Check className="w-4 h-4" />}
                  {m.label}
                </span>
                <span className="block px-1 pb-1 text-[13px] text-muted-foreground">{m.description}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-muted/40 p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">Put it behind</span>
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
              Use {chosen.label}
            </Button>
          </div>
          <p className="m-0 text-[13px] text-muted-foreground">
            This changes the looks the projector uses for those slides. To fine-tune colours, speed or darkness, open a look and choose
            Background.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};
