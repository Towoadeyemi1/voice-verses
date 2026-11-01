import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { AppShell, Section } from '@/components/shell/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScaledStage } from '@/components/ScaledStage';
import { RenderContent, TemplateRenderer } from '@/components/TemplateRenderer';
import { VerseText } from '@/components/VerseText';
import { useTemplates } from '@/hooks/use-templates';
import { SlideDesigner } from '@/components/designer/SlideDesigner';
import { TeamsAndThemes } from '@/components/designer/TeamsAndThemes';
import { StarterLooks } from '@/components/designer/StarterLooks';
import { BackgroundGallery } from '@/components/designer/BackgroundGallery';
import {
  BUILT_IN_TEMPLATES,
  CONTENT_KINDS,
  newTemplateId,
  OUTPUTS,
  saveAssignments,
  saveTemplates,
  Template,
} from '@/lib/templates';

const SAMPLES: Record<string, RenderContent> = {
  short: {
    key: 'short',
    label: 'Romans 8:28',
    version: 'KJV',
    body: <VerseText text="And we know that all things work together for good to them that love God, to them who are the called according to {his} purpose." />,
  },
  long: {
    key: 'long',
    label: 'Esther 8:9',
    version: 'KJV',
    body: (
      <VerseText text="Then were the king's scribes called at that time in the third month, that {is}, the month Sivan, on the three and twentieth {day} thereof; and it was written according to all that Mordecai commanded unto the Jews, and to the lieutenants, and the deputies and rulers of the provinces which {are} from India unto Ethiopia, an hundred twenty and seven provinces, unto every province according to the writing thereof, and unto every people after their language, and to the Jews according to their writing, and according to their language." />
    ),
  },
  song: { key: 'song', label: 'Amazing Grace', body: 'Amazing **grace**, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am ==found==\nWas blind but now I see' },
  announcement: { key: 'announcement', label: 'Welcome', body: 'Join us after the service for refreshments in the hall.' },
};

const DESIGN_SAMPLES = [
  { id: 'short', label: 'Short verse', content: SAMPLES.short },
  { id: 'long', label: 'Long verse', content: SAMPLES.long },
  { id: 'song', label: 'Song', content: SAMPLES.song },
  { id: 'announcement', label: 'Announcement', content: SAMPLES.announcement },
];

const Templates = () => {
  const { templates, assignments } = useTemplates();
  const [selectedId, setSelectedId] = useState(templates[0]?.id);
  const [sample, setSample] = useState<keyof typeof SAMPLES>('short');
  const [tab, setTab] = useState<'design' | 'screens' | 'teams'>('design');
  const template = templates.find((t) => t.id === selectedId) ?? templates[0];
  const builtIn = BUILT_IN_TEMPLATES.find((b) => b.id === template?.id);

  const update = (change: (t: Template) => Template) =>
    saveTemplates(templates.map((t) => (t.id === template.id ? change(t) : t)));

  const duplicate = () => {
    const copy = { ...structuredClone(template), id: newTemplateId(), name: `${template.name} (copy)` };
    saveTemplates([...templates, copy]);
    setSelectedId(copy.id);
  };
  const createNew = () => {
    const fresh = { ...structuredClone(BUILT_IN_TEMPLATES[0]), id: newTemplateId(), name: 'New template' };
    saveTemplates([...templates, fresh]);
    setSelectedId(fresh.id);
  };
  const remove = () => {
    const inUse = OUTPUTS.some((o) => CONTENT_KINDS.some((k) => assignments[o.id][k.id] === template.id));
    if (inUse) {
      toast.error('This template is in use', { description: 'Choose another template for those screens first.' });
      return;
    }
    const rest = templates.filter((t) => t.id !== template.id);
    saveTemplates(rest);
    setSelectedId(rest[0]?.id);
  };
  const reset = () => builtIn && update(() => structuredClone(builtIn));

  if (!template) return null;

  const kindOf = (t: Template) => (t.id.includes('lyrics') ? 'song' : t.id.includes('announce') ? 'announcement' : 'short');

  return (
    <AppShell
      wide
      title="Looks"
      subtitle="How scripture, songs, announcements and countdowns look on each screen. Changes show on the screens straight away."
      actions={
        <>
          <BackgroundGallery />
          <StarterLooks onPick={(id) => { setSelectedId(id); setTab('design'); }} />
          <Button onClick={createNew}><Plus className="w-4 h-4" />New look</Button>
        </>
      }
    >
      <div className="flex p-1 rounded-full bg-muted/70 w-fit mb-6" role="tablist">
        {([
          ['design', 'Design a look'],
          ['screens', 'Which screen uses what'],
          ['teams', 'Colour teams and themes'],
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

      {tab === 'design' && (
        <div className="space-y-6">
          {/* Every look, as it appears */}
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:thin]">
            {templates.map((t) => {
              const used = OUTPUTS.flatMap((o) => CONTENT_KINDS.filter((k) => assignments[o.id][k.id] === t.id).map((k) => `${o.id === 'projection' ? 'Projector' : 'Stream'} ${k.label.toLowerCase()}`));
              return (
                <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} className="flex-shrink-0 w-56 text-left group">
                  <div className={`rounded-xl overflow-hidden transition ${t.id === template.id ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'ring-1 ring-border group-hover:ring-foreground/40'}`}>
                    <ScaledStage className="aspect-video bg-black">
                      <TemplateRenderer template={t} content={SAMPLES[kindOf(t)]} />
                    </ScaledStage>
                  </div>
                  <p className={`m-0 mt-2 text-sm truncate ${t.id === template.id ? 'font-semibold' : 'font-medium'}`}>{t.name}</p>
                  <p className="m-0 text-xs text-muted-foreground truncate">{used.length ? `In use: ${used.join(', ')}` : 'Not in use'}</p>
                </button>
              );
            })}
          </div>

          <Section
            title={template.name}
            description="Drag the text and anything you add on the slide; use the panel on the right for fonts, colours and backgrounds."
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={duplicate}><Copy className="w-4 h-4" />Duplicate</Button>
                {builtIn ? (
                  <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="w-4 h-4" />Reset</Button>
                ) : (
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={remove}><Trash2 className="w-4 h-4" />Delete</Button>
                )}
              </>
            }
          >
            <SlideDesigner
              key={template.id}
              template={template}
              onChange={(t) => saveTemplates(templates.map((x) => (x.id === t.id ? t : x)))}
              samples={DESIGN_SAMPLES}
              sample={sample}
              onSample={(id) => setSample(id as keyof typeof SAMPLES)}
            />
          </Section>
        </div>
      )}

      {tab === 'screens' && (
        <Section title="Which look each screen uses" description="A slide in a service can still choose its own look.">
          <div className="grid gap-4">
            {OUTPUTS.map((o) => (
              <div key={o.id} className="rounded-xl bg-muted/40 p-4">
                <p className="m-0 font-semibold">{o.label}</p>
                <p className="m-0 mb-3 text-sm text-muted-foreground">{o.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {CONTENT_KINDS.map((k) => {
                    const chosen = templates.find((t) => t.id === assignments[o.id][k.id]);
                    return (
                      <div key={k.id} className="space-y-2">
                        <p className="m-0 text-xs font-semibold text-muted-foreground">{k.label}</p>
                        {chosen && (
                          <ScaledStage className="aspect-video bg-black rounded-lg">
                            <TemplateRenderer template={chosen} content={SAMPLES[k.id === 'lyrics' ? 'song' : k.id === 'announcement' ? 'announcement' : 'short']} />
                          </ScaledStage>
                        )}
                        <Select value={assignments[o.id][k.id]} onValueChange={(id) => saveAssignments({ ...assignments, [o.id]: { ...assignments[o.id], [k.id]: id } })}>
                          <SelectTrigger className="h-9" aria-label={`${o.label}: ${k.label}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === 'teams' && <TeamsAndThemes />}
    </AppShell>
  );
};

export default Templates;
