import { ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ModeNav } from '@/components/ModeNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScaledStage } from '@/components/ScaledStage';
import { RenderContent, TemplateRenderer } from '@/components/TemplateRenderer';
import { VerseText } from '@/components/VerseText';
import { MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { useLibraryUpdated } from '@/hooks/use-library-updated';
import { useTemplates } from '@/hooks/use-templates';
import {
  BUILT_IN_TEMPLATES,
  CONTENT_KINDS,
  FONTS,
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
  song: { key: 'song', label: 'Amazing Grace', body: 'Amazing grace, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind but now I see' },
  announcement: { key: 'announcement', label: 'Welcome', body: 'Join us after the service for refreshments in the hall.' },
};

const AREA_PRESETS: { label: string; area: Template['area'] }[] = [
  { label: 'Full screen', area: { x: 6, y: 8, width: 88, height: 80 } },
  { label: 'Lower part', area: { x: 5, y: 58, width: 90, height: 36 } },
  { label: 'Lower third', area: { x: 8, y: 70, width: 84, height: 25 } },
  { label: 'Upper part', area: { x: 5, y: 6, width: 90, height: 36 } },
  { label: 'Left half', area: { x: 4, y: 10, width: 46, height: 80 } },
  { label: 'Right half', area: { x: 50, y: 10, width: 46, height: 80 } },
];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
    <h3 className="font-semibold text-sm">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div>{children}</div>
  </div>
);

const Range = ({ value, min, max, step = 1, unit = '', onChange }: { value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) => (
  <div className="flex items-center gap-3">
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="flex-1" />
    <span className="text-xs tabular-nums w-12 text-right">
      {Number.isInteger(step) ? value : value.toFixed(2)}
      {unit}
    </span>
  </div>
);

const Choice = <T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) => (
  <div className="flex gap-1 flex-wrap">
    {options.map((o) => (
      <Button key={o.value} type="button" size="sm" variant={value === o.value ? 'default' : 'outline'} className="h-7 px-2 text-xs" onClick={() => onChange(o.value)}>
        {o.label}
      </Button>
    ))}
  </div>
);

const Templates = () => {
  const { templates, assignments } = useTemplates();
  const [selectedId, setSelectedId] = useState(templates[0]?.id);
  const [sample, setSample] = useState<keyof typeof SAMPLES>('short');
  const [pictures, setPictures] = useState<MediaItem[]>([]);

  const loadPictures = () => ServiceStorage.getMedia().then((m) => setPictures(m.filter((i) => i.type === 'image' && i.url)));
  useEffect(() => {
    loadPictures();
  }, []);
  useLibraryUpdated(loadPictures);

  const template = templates.find((t) => t.id === selectedId) ?? templates[0];
  const builtIn = BUILT_IN_TEMPLATES.find((b) => b.id === template?.id);

  const update = (change: (t: Template) => Template) =>
    saveTemplates(templates.map((t) => (t.id === template.id ? change(t) : t)));
  const set = <K extends keyof Template>(key: K, value: Partial<Template[K]>) =>
    update((t) => ({ ...t, [key]: typeof value === 'object' ? { ...(t[key] as object), ...value } : value }));

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

  const uploadPicture = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const item: MediaItem = { id: Date.now().toString(), type: 'image', name: file.name.replace(/\.[^.]+$/, ''), url: String(reader.result), createdAt: new Date() };
      await ServiceStorage.saveMediaItem(item);
      await loadPictures();
      set('background', { type: 'image', mediaId: item.id });
    };
    reader.readAsDataURL(file);
  };

  if (!template) return null;
  const { background, area, panel, text, label, logo } = template;
  const customFont = !FONTS.some((f) => f.value === text.fontFamily);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <PageHeader title="Templates" description="How scripture, songs and announcements look on each screen" />
        <ModeNav />

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

        <div className="grid lg:grid-cols-[14rem_1fr_22rem] gap-4 items-start">
          {/* Template list */}
          <Card className="p-3 space-y-1">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left text-sm rounded-md px-3 py-2 ${t.id === template.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                {t.name}
              </button>
            ))}
            <div className="flex gap-1 pt-2 border-t mt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={createNew} title="New template">
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={duplicate} title="Duplicate">
                <Copy className="w-4 h-4" />
              </Button>
              {builtIn ? (
                <Button size="sm" variant="outline" className="flex-1" onClick={reset} title="Reset to the original">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="flex-1" onClick={remove} title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>

          {/* Preview */}
          <div className="space-y-2 lg:sticky lg:top-4">
            <ScaledStage className="aspect-video rounded-lg border overflow-hidden bg-black">
              <TemplateRenderer template={template} content={SAMPLES[sample]} />
            </ScaledStage>
            <Choice
              value={sample}
              onChange={setSample}
              options={[
                { value: 'short', label: 'Short verse' },
                { value: 'long', label: 'Long verse' },
                { value: 'song', label: 'Song' },
                { value: 'announcement', label: 'Announcement' },
              ]}
            />
          </div>

          {/* Controls */}
          <Card className="p-4 space-y-4">
            <Field label="Name">
              <Input value={template.name} onChange={(e) => set('name', e.target.value as never)} />
            </Field>

            <Section title="Background">
              <Choice
                value={background.type === 'video' ? 'color' : background.type}
                onChange={(type) => set('background', { type })}
                options={[
                  { value: 'color', label: 'Colour' },
                  { value: 'image', label: 'Picture' },
                ]}
              />
              <Field label="Colour">
                <input type="color" value={background.color} onChange={(e) => set('background', { color: e.target.value })} className="h-8 w-16 rounded border bg-transparent" />
              </Field>
              {background.type === 'image' && (
                <>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {pictures.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => set('background', { mediaId: p.id })}
                        className={`aspect-video rounded overflow-hidden border-2 ${background.mediaId === p.id ? 'border-primary' : 'border-transparent'}`}
                        title={p.name}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                    <label className="aspect-video rounded border border-dashed flex items-center justify-center cursor-pointer hover:bg-accent" title="Add a picture">
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPicture(e.target.files[0])} />
                    </label>
                  </div>
                  <Field label="Darken">
                    <Range value={background.dim} min={0} max={0.9} step={0.05} onChange={(dim) => set('background', { dim })} />
                  </Field>
                </>
              )}
            </Section>

            <Section title="Text area">
              <div className="flex flex-wrap gap-1">
                {AREA_PRESETS.map((p) => (
                  <Button key={p.label} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => set('area', p.area)}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <Field label="From left">
                <Range value={area.x} min={0} max={90} unit="%" onChange={(x) => set('area', { x, width: Math.min(area.width, 100 - x) })} />
              </Field>
              <Field label="From top">
                <Range value={area.y} min={0} max={90} unit="%" onChange={(y) => set('area', { y, height: Math.min(area.height, 100 - y) })} />
              </Field>
              <Field label="Width">
                <Range value={area.width} min={10} max={100 - area.x} unit="%" onChange={(width) => set('area', { width })} />
              </Field>
              <Field label="Height">
                <Range value={area.height} min={10} max={100 - area.y} unit="%" onChange={(height) => set('area', { height })} />
              </Field>
            </Section>

            <Section title="Font">
              <Field label="Font">
                <Select value={customFont ? 'custom' : text.fontFamily} onValueChange={(v) => v !== 'custom' && set('text', { fontFamily: v })}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        <span style={{ fontFamily: f.value }}>{f.label}</span>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Another font on this computer…</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {customFont && (
                <Field label="Font name">
                  <Input value={text.fontFamily} placeholder="e.g. Montserrat" onChange={(e) => set('text', { fontFamily: e.target.value })} />
                </Field>
              )}
              <Field label="Largest size">
                <Range value={text.fontSize} min={24} max={180} unit="px" onChange={(fontSize) => set('text', { fontSize })} />
              </Field>
              <Field label="Weight">
                <Choice
                  value={String(text.fontWeight) as '400' | '600' | '700' | '800'}
                  onChange={(w) => set('text', { fontWeight: Number(w) as Template['text']['fontWeight'] })}
                  options={[
                    { value: '400', label: 'Regular' },
                    { value: '600', label: 'Semi-bold' },
                    { value: '700', label: 'Bold' },
                    { value: '800', label: 'Heavy' },
                  ]}
                />
              </Field>
              <Field label="Colour">
                <input type="color" value={text.color} onChange={(e) => set('text', { color: e.target.value })} className="h-8 w-16 rounded border bg-transparent" />
              </Field>
              <Field label="Align">
                <Choice value={text.align} onChange={(align) => set('text', { align })} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }]} />
              </Field>
              <Field label="Position">
                <Choice
                  value={text.verticalAlign}
                  onChange={(verticalAlign) => set('text', { verticalAlign })}
                  options={[{ value: 'top', label: 'Top' }, { value: 'middle', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }]}
                />
              </Field>
              <Field label="Line spacing">
                <Range value={text.lineHeight} min={1} max={2} step={0.05} onChange={(lineHeight) => set('text', { lineHeight })} />
              </Field>
              <Field label="Capitals">
                <Switch checked={text.uppercase} onCheckedChange={(uppercase) => set('text', { uppercase })} />
              </Field>
              <Field label="Shadow">
                <Switch checked={text.shadow} onCheckedChange={(shadow) => set('text', { shadow })} />
              </Field>
              <Field label="Outline">
                <Range value={text.outline} min={0} max={8} unit="px" onChange={(outline) => set('text', { outline })} />
              </Field>
            </Section>

            <Section title="Box behind the text">
              <Field label="Show">
                <Switch checked={panel.show} onCheckedChange={(show) => set('panel', { show })} />
              </Field>
              {panel.show && (
                <>
                  <Field label="Colour">
                    <input type="color" value={panel.color} onChange={(e) => set('panel', { color: e.target.value })} className="h-8 w-16 rounded border bg-transparent" />
                  </Field>
                  <Field label="Opacity">
                    <Range value={panel.opacity} min={0.1} max={1} step={0.05} onChange={(opacity) => set('panel', { opacity })} />
                  </Field>
                  <Field label="Rounded">
                    <Range value={panel.radius} min={0} max={48} unit="px" onChange={(radius) => set('panel', { radius })} />
                  </Field>
                </>
              )}
            </Section>

            <Section title="Reference / title">
              <Field label="Show">
                <Switch checked={label.show} onCheckedChange={(show) => set('label', { show })} />
              </Field>
              {label.show && (
                <>
                  <Field label="Where">
                    <Choice value={label.position} onChange={(position) => set('label', { position })} options={[{ value: 'above', label: 'Above' }, { value: 'below', label: 'Below' }]} />
                  </Field>
                  <Field label="Size">
                    <Range value={label.fontSize} min={16} max={120} unit="px" onChange={(fontSize) => set('label', { fontSize })} />
                  </Field>
                  <Field label="Colour">
                    <input type="color" value={label.color} onChange={(e) => set('label', { color: e.target.value })} className="h-8 w-16 rounded border bg-transparent" />
                  </Field>
                  <Field label="Translation">
                    <div className="flex items-center gap-2">
                      <Switch checked={label.includeVersion} onCheckedChange={(includeVersion) => set('label', { includeVersion })} />
                      <span className="text-xs text-muted-foreground">e.g. “John 3:16 KJV”</span>
                    </div>
                  </Field>
                </>
              )}
            </Section>

            <Section title="Logo">
              <Field label="Show">
                <Switch checked={logo.show} onCheckedChange={(show) => set('logo', { show })} />
              </Field>
              {logo.show && (
                <>
                  <Field label="Corner">
                    <Select value={logo.position} onValueChange={(position) => set('logo', { position: position as Template['logo']['position'] })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Top left</SelectItem>
                        <SelectItem value="top-right">Top right</SelectItem>
                        <SelectItem value="bottom-left">Bottom left</SelectItem>
                        <SelectItem value="bottom-right">Bottom right</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Size">
                    <Range value={logo.size} min={3} max={25} unit="%" onChange={(size) => set('logo', { size })} />
                  </Field>
                  {!localStorage.getItem('global-service-logo') && (
                    <p className="text-xs text-muted-foreground">Add your logo in Settings → Logo.</p>
                  )}
                </>
              )}
            </Section>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Templates;
