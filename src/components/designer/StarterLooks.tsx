import { useState } from 'react';
import { Check, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScaledStage } from '@/components/ScaledStage';
import { RenderContent, TemplateRenderer } from '@/components/TemplateRenderer';
import { VerseText } from '@/components/VerseText';
import { useTemplates } from '@/hooks/use-templates';
import { ContentKind, saveAssignments, saveTemplates, Template } from '@/lib/templates';
import { addStarterLook, LOOK_KINDS, STARTER_LOOKS, StarterLook } from '@/lib/starters';

// Public-domain words for the previews
const SAMPLE: Record<StarterLook['kind'], RenderContent> = {
  scripture: { key: 's', label: 'Romans 8:28', version: 'KJV', body: <VerseText text="And we know that all things work together for good to them that love God, to them who are the called according to {his} purpose." /> },
  lyrics: { key: 'l', label: 'Amazing Grace', body: 'Amazing grace! how sweet the sound\nThat saved a wretch like me!' },
  announcement: { key: 'a', label: 'Youth night', body: 'This Friday at 7pm in the main hall. Everyone welcome.' },
  countdown: { key: 'c', label: 'Service begins in', body: <span style={{ fontVariantNumeric: 'tabular-nums' }}>4:59</span> },
  lowerThird: { key: 't', label: 'Psalm 46:1', version: 'KJV', body: 'God is our refuge and strength, a very present help in trouble.' },
};

/** Lower thirds are previewed over a stand-in camera picture, as the stream will show them (not on the key green). */
const overCamera = (look: Template): Template => ({
  ...look,
  background: { type: 'gradient', color: '#5a4636', gradient: { to: '#14100d', angle: 170 }, dim: 0 },
});

/**
 * Ready-made looks for every kind of screen, shown as they will look.
 * "Add" copies one into the church's looks to use and change; "Use now" also
 * puts it on the projector (or the lower third) straight away.
 */
export const StarterLooks = ({ onPick }: { onPick?: (id: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<StarterLook['kind']>('scripture');
  const { templates, assignments } = useTemplates();
  const shown = STARTER_LOOKS.filter((s) => s.kind === kind);

  const add = (s: StarterLook) => {
    saveTemplates(addStarterLook(templates, s.look));
    onPick?.(s.look.id);
  };
  const applyNow = (s: StarterLook) => {
    add(s);
    if (s.kind === 'lowerThird') {
      saveAssignments({ ...assignments, stream: { scripture: s.look.id, lyrics: s.look.id, announcement: s.look.id, countdown: s.look.id } });
      toast.success(`The lower third now uses “${s.look.name}”`);
    } else {
      saveAssignments({ ...assignments, projection: { ...assignments.projection, [s.kind as ContentKind]: s.look.id } });
      toast.success(`${LOOK_KINDS.find((k) => k.kind === s.kind)?.label} on the projector now use “${s.look.name}”`);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5 justify-start">
        <LayoutTemplate className="w-4 h-4" />Starter looks
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Starter looks</DialogTitle>
            <DialogDescription>Ready-made looks to begin from. Add one to your looks to change it however you like; colours marked by the team follow your colour team.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-1 p-1 rounded-xl bg-muted/70 w-fit flex-wrap" role="tablist">
            {LOOK_KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                role="tab"
                aria-selected={kind === k.kind}
                onClick={() => setKind(k.kind)}
                className={`h-8 px-3 rounded-lg text-sm font-semibold ${kind === k.kind ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {k.label} <span className="text-muted-foreground font-medium">{STARTER_LOOKS.filter((s) => s.kind === k.kind).length}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((s) => {
              const added = templates.some((t) => t.id === s.look.id);
              return (
                <div key={s.look.id} className="rounded-2xl bg-muted/40 p-2.5 space-y-2.5">
                  <ScaledStage className="aspect-video rounded-xl bg-black">
                    <TemplateRenderer template={s.kind === 'lowerThird' ? overCamera(s.look) : s.look} content={SAMPLE[s.kind]} />
                  </ScaledStage>
                  <div className="px-1">
                    <p className="m-0 text-sm font-semibold">{s.look.name}</p>
                    <p className="m-0 mt-0.5 text-[13px] text-muted-foreground leading-snug">{s.description}</p>
                  </div>
                  <div className="flex gap-2 px-1 pb-1">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => add(s)} disabled={added}>
                      {added ? <><Check className="w-3.5 h-3.5" />In your looks</> : 'Add'}
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => applyNow(s)}>
                      {s.kind === 'lowerThird' ? 'Use on stream' : 'Use on projector'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
