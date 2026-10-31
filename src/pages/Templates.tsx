import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ModeNav } from '@/components/ModeNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScaledStage } from '@/components/ScaledStage';
import { RenderContent, TemplateRenderer } from '@/components/TemplateRenderer';
import { VerseText } from '@/components/VerseText';
import { useTemplates } from '@/hooks/use-templates';
import { SlideDesigner } from '@/components/designer/SlideDesigner';
import { TeamsAndThemes } from '@/components/designer/TeamsAndThemes';
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

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <PageHeader title="Templates" description="How scripture, songs and announcements look on each screen" />
        <ModeNav />

        <TeamsAndThemes />

        {/* Where each template is used */}
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Which template each screen uses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="font-normal pb-2 pr-4">Screen</th>
                  {CONTENT_KINDS.map((k) => (
                    <th key={k.id} className="font-normal pb-2 pr-4">
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUTS.map((o) => (
                  <tr key={o.id}>
                    <td className="pr-4 py-1.5">
                      <div className="font-medium">{o.label}</div>
                      <div className="text-xs text-muted-foreground">{o.description}</div>
                    </td>
                    {CONTENT_KINDS.map((k) => (
                      <td key={k.id} className="pr-4 py-1.5 min-w-44">
                        <Select
                          value={assignments[o.id][k.id]}
                          onValueChange={(id) => saveAssignments({ ...assignments, [o.id]: { ...assignments[o.id], [k.id]: id } })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            A slide in the Service Builder can also use its own template. Changes show on the screens straight away.
          </p>
        </Card>

        {/* The looks, as they appear */}
        <Card className="p-3">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} className="flex-shrink-0 w-44 text-left group">
                <div className={`rounded-lg overflow-hidden ring-2 transition ${t.id === template.id ? 'ring-primary' : 'ring-transparent group-hover:ring-primary/40'}`}>
                  <ScaledStage className="aspect-video bg-black">
                    <TemplateRenderer template={t} content={SAMPLES[t.id.includes('lyrics') ? 'song' : t.id.includes('announcement') ? 'announcement' : 'short']} />
                  </ScaledStage>
                </div>
                <p className={`mt-1.5 text-xs truncate ${t.id === template.id ? 'font-semibold' : 'text-muted-foreground'}`}>{t.name}</p>
              </button>
            ))}
            <div className="flex flex-col gap-1.5 flex-shrink-0 justify-center pl-1">
              <Button size="sm" variant="outline" onClick={createNew} className="gap-1.5 justify-start"><Plus className="w-4 h-4" />New</Button>
              <Button size="sm" variant="outline" onClick={duplicate} className="gap-1.5 justify-start"><Copy className="w-4 h-4" />Duplicate</Button>
              {builtIn ? (
                <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 justify-start"><RotateCcw className="w-4 h-4" />Reset</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={remove} className="gap-1.5 justify-start text-destructive"><Trash2 className="w-4 h-4" />Delete</Button>
              )}
            </div>
          </div>
        </Card>

        <SlideDesigner
          key={template.id}
          template={template}
          onChange={(t) => saveTemplates(templates.map((x) => (x.id === t.id ? t : x)))}
          samples={DESIGN_SAMPLES}
          sample={sample}
          onSample={(id) => setSample(id as keyof typeof SAMPLES)}
        />
      </div>
    </div>
  );
};

export default Templates;
