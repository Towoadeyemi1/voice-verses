import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpToLine, Bold, Copy, Highlighter, Image as ImageIcon, ImagePlus, Italic,
  Layers, Palette, Redo2, Square, Trash2, Type, Underline, Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScaledStage } from '@/components/ScaledStage';
import { RenderContent, TemplateRenderer } from '@/components/TemplateRenderer';
import { MediaThumbnail } from '@/components/MediaThumbnail';
import { MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { addPictureToLibrary, addVideoToLibrary } from '@/lib/mediaFiles';
import { useLibraryUpdated } from '@/hooks/use-library-updated';
import { DesignLayer, FONTS, Template } from '@/lib/templates';
import { wrapSelection } from '@/lib/richText';
import { TEAM_COLORS, teamColor } from '@/lib/colorTeams';
import { useColorTeam } from '@/hooks/use-color-team';
import { usePreviewStage } from '@/hooks/use-screen-shape';
import { describeShape, shapeOf, STANDARD_STAGE, StageSize } from '@/lib/screenShapes';

type Selection = 'background' | 'text' | 'label' | 'logo' | string;
type Box = { x: number; y: number; width: number; height: number };

const AREA_PRESETS: { label: string; area: Box }[] = [
  { label: 'Full', area: { x: 6, y: 8, width: 88, height: 80 } },
  { label: 'Lower part', area: { x: 5, y: 58, width: 90, height: 36 } },
  { label: 'Lower third', area: { x: 8, y: 70, width: 84, height: 25 } },
  { label: 'Top', area: { x: 5, y: 6, width: 90, height: 36 } },
  { label: 'Left', area: { x: 4, y: 10, width: 46, height: 80 } },
  { label: 'Right', area: { x: 50, y: 10, width: 46, height: 80 } },
];

const SWATCHES = ['#ffffff', '#000000', '#f5c451', '#ff453a', '#ff9f0a', '#30d158', '#40c8e0', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f', '#8e8e93'];

// ---- Small controls ----------------------------------------------------------------

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-2.5 py-3 border-b border-border last:border-0">
    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
    {children}
  </section>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="min-w-0">{children}</div>
  </div>
);

const Range = ({ value, min, max, step = 1, unit = '', onChange }: { value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) => (
  <div className="flex items-center gap-2.5">
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="flex-1" />
    <span className="text-xs tabular-nums w-11 text-right">
      {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
      {unit}
    </span>
  </div>
);

const Segmented = <T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void }) => (
  <div className="inline-flex p-0.5 rounded-lg bg-muted">
    {options.map((o) => (
      <button
        key={String(o.value)}
        type="button"
        title={o.title}
        onClick={() => onChange(o.value)}
        className={`h-7 min-w-[2rem] px-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/**
 * A colour: the colour team's colours (they change when the team changes),
 * the swatches the church uses most, or any colour.
 */
const ColorPick = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const team = useColorTeam();
  const resolved = teamColor(value, team) ?? '#000000';
  return (
  <div className="space-y-1.5">
  <div className="flex items-center gap-1 flex-wrap" title={`Colour team: ${team.name}`}>
    {TEAM_COLORS.map(({ key, label }) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(`team:${key}`)}
        title={`${label} colour of the colour team (changes with the team)`}
        className={`h-5 pl-0.5 pr-1.5 rounded-full border flex items-center gap-1 text-[10px] font-semibold ${value === `team:${key}` ? 'ring-2 ring-primary ring-offset-1 ring-offset-background border-transparent' : 'border-border'}`}
      >
        <span className="w-3.5 h-3.5 rounded-full" style={{ background: team.colors[key] }} />
        {label}
      </button>
    ))}
  </div>
  <div className="flex items-center gap-1.5 flex-wrap">
    {SWATCHES.map((c) => (
      <button
        key={c}
        type="button"
        title={c}
        onClick={() => onChange(c)}
        className={`w-5 h-5 rounded-full border ${value.toLowerCase() === c ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'}`}
        style={{ background: c }}
      />
    ))}
    <label className="relative w-6 h-6 rounded-full border border-border overflow-hidden cursor-pointer" title="Any colour" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
      <input type="color" value={resolved.slice(0, 7)} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
    </label>
  </div>
  </div>
  );
};

const Toggle = ({ on, onChange, children, title }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode; title: string }) => (
  <button
    type="button"
    title={title}
    onClick={() => onChange(!on)}
    className={`h-8 w-8 rounded-md grid place-items-center border transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
  >
    {children}
  </button>
);

const FontPick = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Select value={FONTS.some((f) => f.value === value) ? value : 'custom'} onValueChange={(v) => v !== 'custom' && onChange(v)}>
    <SelectTrigger className="h-8">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {FONTS.map((f) => (
        <SelectItem key={f.value} value={f.value}>
          <span style={{ fontFamily: f.value }}>{f.label}</span>
        </SelectItem>
      ))}
      {!FONTS.some((f) => f.value === value) && <SelectItem value="custom">{value.split(',')[0]}</SelectItem>}
    </SelectContent>
  </Select>
);

/** Pictures and videos from the media library (and adding new ones). */
const MediaPick = ({ kind, value, onChange }: { kind: 'image' | 'video' | 'any'; value?: string; onChange: (id: string, item: MediaItem) => void }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const load = () => ServiceStorage.getMedia().then((all) => setItems(all.filter((m) => (kind === 'any' ? m.type === 'image' || m.type === 'video' : m.type === kind))));
  useEffect(() => {
    load();
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useLibraryUpdated(load);
  const upload = async (file: File) => {
    const item = file.type.startsWith('video/') ? await addVideoToLibrary(file) : await addPictureToLibrary(file);
    await load();
    onChange(item.id, item);
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.name}
            onClick={() => onChange(m.id, m)}
            className={`aspect-video rounded overflow-hidden border-2 ${value === m.id ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
          >
            <MediaThumbnail item={m} />
          </button>
        ))}
      </div>
      <label className="flex items-center justify-center gap-1.5 h-8 rounded-md border border-dashed border-border text-xs cursor-pointer hover:bg-muted">
        <ImagePlus className="w-3.5 h-3.5" />
        Add {kind === 'video' ? 'a video' : kind === 'image' ? 'a picture' : 'a picture or video'}
        <input type="file" accept={kind === 'video' ? 'video/*' : kind === 'image' ? 'image/*' : 'image/*,video/*'} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
    </div>
  );
};

/** Text with word formatting buttons: select words, then Bold / Italic / Underline / Highlight / a colour. */
const RichField = ({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [color, setColor] = useState('#f5c451');
  const wrap = (open: string, close = open) => {
    const el = ref.current;
    if (!el) return;
    const next = wrapSelection(value, el.selectionStart, el.selectionEnd, open, close);
    onChange(next.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" title="Bold (select words first)" onClick={() => wrap('**')}><Bold className="w-3.5 h-3.5" /></Button>
        <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" title="Italic" onClick={() => wrap('*')}><Italic className="w-3.5 h-3.5" /></Button>
        <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" title="Underline" onClick={() => wrap('__')}><Underline className="w-3.5 h-3.5" /></Button>
        <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" title="Highlight" onClick={() => wrap('==')}><Highlighter className="w-3.5 h-3.5" /></Button>
        <label className="relative h-7 w-7 rounded-md border border-border grid place-items-center cursor-pointer" title="Colour for the selected words">
          <Palette className="w-3.5 h-3.5" style={{ color }} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => wrap(`[${color}]`, '[/]')}>Colour words</Button>
      </div>
      <Textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="text-sm" />
    </div>
  );
};

// ---- The designer -------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const newLayerId = () => `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Designing how slides look, directly on the slide: drag and resize the text
 * box and anything added (text, shapes, pictures); every option for the
 * selected thing on the right; undo and redo. What is shown is exactly what
 * the screens will show.
 */
export const SlideDesigner = ({
  template,
  onChange,
  samples,
  sample,
  onSample,
}: {
  template: Template;
  onChange: (t: Template) => void;
  /** What to preview with: the slide being designed, or examples */
  samples: { id: string; label: string; content: RenderContent }[];
  sample: string;
  onSample: (id: string) => void;
}) => {
  const [selected, setSelected] = useState<Selection>('text');
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const history = useRef<{ past: Template[]; future: Template[] }>({ past: [], future: [] });
  const canvas = useRef<HTMLDivElement>(null);
  const layers = template.layers ?? [];
  // Wide screens set to spread the design: preview (and edit) the look in that shape too
  const projectorStage = usePreviewStage('projection');
  const streamStage = usePreviewStage('stream');
  const wideShapes: { value: string; label: string; stage: StageSize }[] = [
    { value: 'projection', label: `Projector ${describeShape(shapeOf('projection'), 'projection')}`, stage: projectorStage },
    { value: 'stream', label: `Lower third ${describeShape(shapeOf('stream'), 'stream')}`, stage: streamStage },
  ].filter((o) => o.stage.width !== STANDARD_STAGE.width && o.stage.layout === 'spread');
  const [shapeChoice, setShapeChoice] = useState('16:9');
  const stage = wideShapes.find((o) => o.value === shapeChoice)?.stage ?? STANDARD_STAGE;

  const commit = (next: Template, record = true) => {
    if (record) {
      history.current.past = [...history.current.past.slice(-60), template];
      history.current.future = [];
    }
    onChange(next);
  };
  const undo = () => {
    const prev = history.current.past.pop();
    if (!prev) return;
    history.current.future.push(template);
    onChange(prev);
  };
  const redo = () => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push(template);
    onChange(next);
  };

  // ⌘Z / ⌘⇧Z, Delete for an added element
  const keys = useRef({ undo, redo, selected, remove: (_id: string) => {} });
  keys.current = { undo, redo, selected, remove: (id) => commit({ ...template, layers: layers.filter((l) => l.id !== id) }) };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input,textarea,[contenteditable="true"]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) keys.current.redo();
        else keys.current.undo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && keys.current.selected.startsWith('layer-')) {
        keys.current.remove(keys.current.selected);
        setSelected('background');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const set = <K extends keyof Template>(key: K, value: Partial<Template[K]>) => commit({ ...template, [key]: { ...(template[key] as object), ...value } });
  const setLayer = (id: string, change: Partial<DesignLayer>, record = true) =>
    commit({ ...template, layers: layers.map((l) => (l.id === id ? { ...l, ...change } : l)) }, record);

  const addLayer = (kind: DesignLayer['kind']) => {
    const layer: DesignLayer =
      kind === 'text'
        ? { id: newLayerId(), kind, name: 'Text', x: 30, y: 6, width: 40, height: 12, opacity: 1, text: 'Your text', fontFamily: template.text.fontFamily, fontSize: 64, fontWeight: 700, color: '#ffffff', align: 'center', shadow: true, above: true }
        : kind === 'shape'
          ? { id: newLayerId(), kind, name: 'Shape', x: 5, y: 62, width: 90, height: 32, opacity: 0.7, fill: '#000000', radius: 24 }
          : { id: newLayerId(), kind, name: 'Picture', x: 80, y: 6, width: 14, height: 18, opacity: 1, fit: 'contain', above: true };
    commit({ ...template, layers: [...layers, layer] });
    setSelected(layer.id);
  };

  // ---- Dragging and resizing on the canvas, with snapping ----
  const boxOf = (id: Selection): Box | null => (id === 'text' || id === 'label' ? template.area : layers.find((l) => l.id === id) ?? null);
  const startDrag = (e: React.PointerEvent, id: Selection, handle?: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    e.preventDefault();
    setSelected(id);
    const rect = canvas.current?.getBoundingClientRect();
    const start = boxOf(id);
    if (!rect || !start) return;
    const before = template;
    const others = [template.area, ...layers].filter((b) => b !== start);
    const xs = [0, 50, 100, ...others.flatMap((b) => [b.x, b.x + b.width, b.x + b.width / 2])];
    const ys = [0, 50, 100, ...others.flatMap((b) => [b.y, b.y + b.height, b.y + b.height / 2])];
    const snap = (value: number, targets: number[], found: number[]) => {
      for (const t of targets) if (Math.abs(value - t) < 1.2) {
        found.push(t);
        return t;
      }
      return value;
    };
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - e.clientX) / rect.width) * 100;
      const dy = ((ev.clientY - e.clientY) / rect.height) * 100;
      const v: number[] = [];
      const h: number[] = [];
      let b: Box;
      if (!handle) {
        let x = clamp(start.x + dx, -10, 100 - start.width + 10);
        let y = clamp(start.y + dy, -10, 100 - start.height + 10);
        // Snap the left, centre or right edge (and top, middle, bottom)
        const sx = [x, x + start.width / 2, x + start.width].map((p, i) => snap(p, xs, v) - [0, start.width / 2, start.width][i]);
        const sy = [y, y + start.height / 2, y + start.height].map((p, i) => snap(p, ys, h) - [0, start.height / 2, start.height][i]);
        x = sx.find((p) => p !== x) ?? x;
        y = sy.find((p) => p !== y) ?? y;
        b = { ...start, x, y };
      } else {
        let { x, y, width, height } = start;
        if (handle.includes('w')) {
          const nx = snap(clamp(start.x + dx, -10, start.x + start.width - 3), xs, v);
          width = start.width + (start.x - nx);
          x = nx;
        } else width = snap(clamp(start.x + start.width + dx, start.x + 3, 110), xs, v) - start.x;
        if (handle.includes('n')) {
          const ny = snap(clamp(start.y + dy, -10, start.y + start.height - 3), ys, h);
          height = start.height + (start.y - ny);
          y = ny;
        } else height = snap(clamp(start.y + start.height + dy, start.y + 3, 110), ys, h) - start.y;
        b = { x, y, width, height };
      }
      const round = (n: number) => Math.round(n * 10) / 10;
      const r = { x: round(b.x), y: round(b.y), width: round(b.width), height: round(b.height) };
      setGuides({ v, h });
      if (id === 'text' || id === 'label') onChange({ ...template, area: r });
      else onChange({ ...template, layers: layers.map((l) => (l.id === id ? { ...l, ...r } : l)) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setGuides({ v: [], h: [] });
      history.current.past = [...history.current.past.slice(-60), before];
      history.current.future = [];
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const content = samples.find((s) => s.id === sample)?.content ?? samples[0]?.content ?? null;
  const layer = layers.find((l) => l.id === selected);
  const { background, area, panel, text, label, logo } = template;

  const Handles = ({ id }: { id: Selection }) =>
    selected === id ? (
      <>
        {(['nw', 'ne', 'sw', 'se'] as const).map((h) => (
          <span
            key={h}
            onPointerDown={(e) => startDrag(e, id, h)}
            className="absolute w-3 h-3 rounded-full bg-white border-2 border-primary shadow"
            style={{
              left: h.includes('w') ? -6 : undefined,
              right: h.includes('e') ? -6 : undefined,
              top: h.includes('n') ? -6 : undefined,
              bottom: h.includes('s') ? -6 : undefined,
              cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize',
            }}
          />
        ))}
      </>
    ) : null;

  const elements: { id: Selection; label: string; icon: ReactNode }[] = [
    { id: 'background', label: 'Background', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'text', label: 'Main text', icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'label', label: 'Reference / title', icon: <Type className="w-3.5 h-3.5 opacity-60" /> },
    { id: 'logo', label: 'Logo', icon: <ImageIcon className="w-3.5 h-3.5 opacity-60" /> },
    ...layers.map((l) => ({
      id: l.id,
      label: l.kind === 'text' ? (l.text || 'Text').replace(/[*_=]|\[[^\]]*\]/g, '').slice(0, 22) : l.name ?? (l.kind === 'shape' ? 'Shape' : 'Picture'),
      icon: l.kind === 'text' ? <Type className="w-3.5 h-3.5" /> : l.kind === 'shape' ? <Square className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />,
    })),
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[13rem_minmax(0,1fr)_19rem] gap-4 items-start">
      {/* Elements */}
      <div className="rounded-xl border border-border bg-card p-2 space-y-0.5">
        <p className="px-2 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> On this slide</p>
        {elements.map((el) => (
          <button
            key={el.id}
            type="button"
            onClick={() => setSelected(el.id)}
            className={`w-full flex items-center gap-2 text-left text-sm rounded-md px-2 py-1.5 ${selected === el.id ? 'bg-muted text-foreground font-semibold' : 'hover:bg-muted/60 text-muted-foreground'}`}
          >
            {el.icon}
            <span className="truncate">{el.label}</span>
          </button>
        ))}
        <div className="grid grid-cols-3 gap-1 pt-2 mt-1 border-t border-border">
          <Button type="button" size="sm" variant="outline" className="h-8 px-0 text-xs gap-1" onClick={() => addLayer('text')} title="Add text"><Type className="w-3.5 h-3.5" />Text</Button>
          <Button type="button" size="sm" variant="outline" className="h-8 px-0 text-xs gap-1" onClick={() => addLayer('shape')} title="Add a shape"><Square className="w-3.5 h-3.5" />Shape</Button>
          <Button type="button" size="sm" variant="outline" className="h-8 px-0 text-xs gap-1" onClick={() => addLayer('image')} title="Add a picture"><ImageIcon className="w-3.5 h-3.5" />Picture</Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="space-y-2.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Segmented value={sample} onChange={onSample} options={samples.map((s) => ({ value: s.id, label: s.label }))} />
          {wideShapes.length > 0 && (
            <Segmented value={wideShapes.some((o) => o.value === shapeChoice) ? shapeChoice : '16:9'} onChange={(v) => setShapeChoice(String(v))} options={[{ value: '16:9', label: '16:9' }, ...wideShapes.map((o) => ({ value: o.value, label: o.label }))]} />
          )}
          <div className="ml-auto flex gap-1">
            <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" title="Undo (Ctrl+Z)" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
            <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" title="Redo (Ctrl+Shift+Z)" onClick={redo}><Redo2 className="w-4 h-4" /></Button>
          </div>
        </div>
        <div ref={canvas} className="relative rounded-xl overflow-hidden shadow-lg ring-1 ring-border select-none" style={{ aspectRatio: `${stage.width} / ${stage.height}` }} onPointerDown={() => setSelected('background')}>
          <ScaledStage stage={stage} className="absolute inset-0 bg-black">
            <TemplateRenderer template={template} content={content} />
          </ScaledStage>
          {/* What can be moved: the text box and anything added */}
          <div
            onPointerDown={(e) => startDrag(e, 'text')}
            className={`absolute cursor-move ${selected === 'text' || selected === 'label' ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/60'}`}
            style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` }}
          >
            <Handles id={selected === 'label' ? 'label' : 'text'} />
          </div>
          {layers.map((l) => (
            <div
              key={l.id}
              onPointerDown={(e) => startDrag(e, l.id)}
              className={`absolute cursor-move ${selected === l.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/60'}`}
              style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.width}%`, height: `${l.height}%` }}
            >
              <Handles id={l.id} />
            </div>
          ))}
          {guides.v.map((x, i) => <span key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-pink-500 pointer-events-none" style={{ left: `${x}%` }} />)}
          {guides.h.map((y, i) => <span key={`h${i}`} className="absolute left-0 right-0 h-px bg-pink-500 pointer-events-none" style={{ top: `${y}%` }} />)}
        </div>
        <p className="text-xs text-muted-foreground">Drag to move, drag the corners to resize; pink lines show when things line up. Select words in a text and use the buttons to make them bold, italic, highlighted or coloured.</p>
      </div>

      {/* Inspector */}
      <div className="rounded-xl border border-border bg-card px-4 py-1 max-h-[78vh] overflow-y-auto">
        {selected === 'background' && (
          <>
            <Group title="Background">
              <Segmented
                value={background.type}
                onChange={(type) => set('background', { type, gradient: type === 'gradient' ? background.gradient ?? { to: '#1e3a8a', angle: 135 } : background.gradient })}
                options={[
                  { value: 'color', label: 'Colour' },
                  { value: 'gradient', label: 'Gradient' },
                  { value: 'image', label: 'Picture' },
                  { value: 'video', label: 'Video' },
                ]}
              />
              {(background.type === 'color' || background.type === 'gradient') && (
                <Row label={background.type === 'gradient' ? 'From' : 'Colour'}>
                  <ColorPick value={background.color} onChange={(color) => set('background', { color })} />
                </Row>
              )}
              {background.type === 'gradient' && background.gradient && (
                <>
                  <Row label="To"><ColorPick value={background.gradient.to} onChange={(to) => set('background', { gradient: { ...background.gradient!, to } })} /></Row>
                  <Row label="Direction"><Range value={background.gradient.angle} min={0} max={360} unit="°" onChange={(angle) => set('background', { gradient: { ...background.gradient!, angle } })} /></Row>
                </>
              )}
              {(background.type === 'image' || background.type === 'video') && (
                <>
                  <MediaPick kind={background.type} value={background.mediaId} onChange={(mediaId) => set('background', { mediaId })} />
                  <Row label="Darken"><Range value={background.dim} min={0} max={0.9} step={0.05} onChange={(dim) => set('background', { dim })} /></Row>
                  <Row label="Blur"><Range value={background.blur ?? 0} min={0} max={30} unit="px" onChange={(blur) => set('background', { blur })} /></Row>
                </>
              )}
            </Group>
          </>
        )}

        {selected === 'text' && (
          <>
            <Group title="Text">
              <FontPick value={text.fontFamily} onChange={(fontFamily) => set('text', { fontFamily })} />
              <Row label="Largest size"><Range value={text.fontSize} min={20} max={240} unit="px" onChange={(fontSize) => set('text', { fontSize })} /></Row>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Segmented
                  value={text.fontWeight}
                  onChange={(fontWeight) => set('text', { fontWeight })}
                  options={[
                    { value: 400, label: 'Aa', title: 'Regular' },
                    { value: 600, label: <b>Aa</b>, title: 'Semibold' },
                    { value: 700, label: <b>Aa</b>, title: 'Bold' },
                    { value: 800, label: <b style={{ fontWeight: 900 }}>Aa</b>, title: 'Heavy' },
                  ]}
                />
                <Toggle on={!!text.italic} onChange={(italic) => set('text', { italic })} title="Italic"><Italic className="w-4 h-4" /></Toggle>
                <Toggle on={text.uppercase} onChange={(uppercase) => set('text', { uppercase })} title="All capitals"><span className="text-[11px] font-bold">AA</span></Toggle>
              </div>
              <Row label="Colour"><ColorPick value={text.color} onChange={(color) => set('text', { color })} /></Row>
              <Row label="Align">
                <Segmented
                  value={text.align}
                  onChange={(align) => set('text', { align })}
                  options={[
                    { value: 'left', label: <AlignLeft className="w-3.5 h-3.5" /> },
                    { value: 'center', label: <AlignCenter className="w-3.5 h-3.5" /> },
                    { value: 'right', label: <AlignRight className="w-3.5 h-3.5" /> },
                  ]}
                />
              </Row>
              <Row label="Up / down">
                <Segmented
                  value={text.verticalAlign}
                  onChange={(verticalAlign) => set('text', { verticalAlign })}
                  options={[
                    { value: 'top', label: 'Top' },
                    { value: 'middle', label: 'Middle' },
                    { value: 'bottom', label: 'Bottom' },
                  ]}
                />
              </Row>
              <Row label="Line spacing"><Range value={text.lineHeight} min={0.9} max={2} step={0.05} onChange={(lineHeight) => set('text', { lineHeight })} /></Row>
              <Row label="Letters"><Range value={text.letterSpacing ?? 0} min={-4} max={20} unit="px" onChange={(letterSpacing) => set('text', { letterSpacing })} /></Row>
            </Group>
            <Group title="Effects">
              <Row label="Shadow"><Switch checked={text.shadow} onCheckedChange={(shadow) => set('text', { shadow })} /></Row>
              <Row label="Outline"><Range value={text.outline} min={0} max={12} unit="px" onChange={(outline) => set('text', { outline })} /></Row>
              {text.outline > 0 && <Row label="Outline colour"><ColorPick value={text.outlineColor ?? '#000000'} onChange={(outlineColor) => set('text', { outlineColor })} /></Row>}
              <Row label="Highlighted"><ColorPick value={text.highlight ?? '#f5c451'} onChange={(highlight) => set('text', { highlight })} /></Row>
            </Group>
            <Group title="Box behind the text">
              <Row label="Show"><Switch checked={panel.show} onCheckedChange={(show) => set('panel', { show })} /></Row>
              {panel.show && (
                <>
                  <Row label="Colour"><ColorPick value={panel.color} onChange={(color) => set('panel', { color })} /></Row>
                  <Row label="See-through"><Range value={1 - panel.opacity} min={0} max={1} step={0.05} onChange={(v) => set('panel', { opacity: 1 - v })} /></Row>
                  <Row label="Corners"><Range value={panel.radius} min={0} max={60} unit="px" onChange={(radius) => set('panel', { radius })} /></Row>
                </>
              )}
            </Group>
            <Group title="Place">
              <div className="flex flex-wrap gap-1">
                {AREA_PRESETS.map((p) => (
                  <Button key={p.label} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => commit({ ...template, area: p.area })}>{p.label}</Button>
                ))}
              </div>
            </Group>
          </>
        )}

        {selected === 'label' && (
          <Group title="Reference / title">
            <Row label="Show"><Switch checked={label.show} onCheckedChange={(show) => set('label', { show })} /></Row>
            <Row label="Where"><Segmented value={label.position} onChange={(position) => set('label', { position })} options={[{ value: 'above', label: 'Above' }, { value: 'below', label: 'Below' }]} /></Row>
            <Row label="Size"><Range value={label.fontSize} min={16} max={140} unit="px" onChange={(fontSize) => set('label', { fontSize })} /></Row>
            <Row label="Colour"><ColorPick value={label.color} onChange={(color) => set('label', { color })} /></Row>
            <Row label="Translation"><Switch checked={label.includeVersion} onCheckedChange={(includeVersion) => set('label', { includeVersion })} /></Row>
          </Group>
        )}

        {selected === 'logo' && (
          <Group title="Logo">
            <Row label="Show"><Switch checked={logo.show} onCheckedChange={(show) => set('logo', { show })} /></Row>
            <Row label="Corner">
              <Segmented value={logo.position} onChange={(position) => set('logo', { position })} options={[{ value: 'top-left', label: '↖' }, { value: 'top-right', label: '↗' }, { value: 'bottom-left', label: '↙' }, { value: 'bottom-right', label: '↘' }]} />
            </Row>
            <Row label="Size"><Range value={logo.size} min={3} max={30} unit="%" onChange={(size) => set('logo', { size })} /></Row>
            <p className="text-xs text-muted-foreground">The logo itself is set in Settings → Logo.</p>
          </Group>
        )}

        {layer && (
          <>
            {layer.kind === 'text' && (
              <Group title="Text">
                <RichField value={layer.text ?? ''} onChange={(t) => setLayer(layer.id, { text: t })} />
                <FontPick value={layer.fontFamily ?? template.text.fontFamily} onChange={(fontFamily) => setLayer(layer.id, { fontFamily })} />
                <Row label="Size"><Range value={layer.fontSize ?? 48} min={12} max={240} unit="px" onChange={(fontSize) => setLayer(layer.id, { fontSize })} /></Row>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Segmented value={layer.fontWeight ?? 600} onChange={(fontWeight) => setLayer(layer.id, { fontWeight })} options={[{ value: 400, label: 'Aa' }, { value: 600, label: <b>Aa</b> }, { value: 800, label: <b style={{ fontWeight: 900 }}>Aa</b> }]} />
                  <Toggle on={!!layer.italic} onChange={(italic) => setLayer(layer.id, { italic })} title="Italic"><Italic className="w-4 h-4" /></Toggle>
                  <Toggle on={!!layer.uppercase} onChange={(uppercase) => setLayer(layer.id, { uppercase })} title="All capitals"><span className="text-[11px] font-bold">AA</span></Toggle>
                  <Toggle on={!!layer.shadow} onChange={(shadow) => setLayer(layer.id, { shadow })} title="Shadow"><span className="text-[11px] font-bold" style={{ textShadow: '1px 1px 2px currentColor' }}>S</span></Toggle>
                </div>
                <Row label="Colour"><ColorPick value={layer.color ?? '#ffffff'} onChange={(color) => setLayer(layer.id, { color })} /></Row>
                <Row label="Align">
                  <Segmented value={layer.align ?? 'center'} onChange={(align) => setLayer(layer.id, { align })} options={[{ value: 'left', label: <AlignLeft className="w-3.5 h-3.5" /> }, { value: 'center', label: <AlignCenter className="w-3.5 h-3.5" /> }, { value: 'right', label: <AlignRight className="w-3.5 h-3.5" /> }]} />
                </Row>
              </Group>
            )}
            {layer.kind === 'shape' && (
              <Group title="Shape">
                <Row label="Colour"><ColorPick value={layer.fill ?? '#000000'} onChange={(fill) => setLayer(layer.id, { fill })} /></Row>
                <Row label="Gradient to">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!layer.fillTo} onCheckedChange={(on) => setLayer(layer.id, { fillTo: on ? '#1e3a8a' : undefined })} />
                    {layer.fillTo && <ColorPick value={layer.fillTo} onChange={(fillTo) => setLayer(layer.id, { fillTo })} />}
                  </div>
                </Row>
                <Row label="Corners"><Range value={layer.radius ?? 0} min={0} max={200} unit="px" onChange={(radius) => setLayer(layer.id, { radius })} /></Row>
                <Row label="Border"><Range value={layer.borderWidth ?? 0} min={0} max={20} unit="px" onChange={(borderWidth) => setLayer(layer.id, { borderWidth })} /></Row>
                {!!layer.borderWidth && <Row label="Border colour"><ColorPick value={layer.borderColor ?? '#ffffff'} onChange={(borderColor) => setLayer(layer.id, { borderColor })} /></Row>}
              </Group>
            )}
            {layer.kind === 'image' && (
              <Group title="Picture">
                <MediaPick kind="image" value={layer.mediaId} onChange={(mediaId, item) => setLayer(layer.id, { mediaId, name: item.name })} />
                <Row label="Fit"><Segmented value={layer.fit ?? 'contain'} onChange={(fit) => setLayer(layer.id, { fit })} options={[{ value: 'contain', label: 'Whole' }, { value: 'cover', label: 'Fill' }]} /></Row>
              </Group>
            )}
            <Group title="Arrange">
              <Row label="See-through"><Range value={1 - layer.opacity} min={0} max={1} step={0.05} onChange={(v) => setLayer(layer.id, { opacity: 1 - v })} /></Row>
              <Row label="Turn"><Range value={layer.rotation ?? 0} min={-180} max={180} unit="°" onChange={(rotation) => setLayer(layer.id, { rotation })} /></Row>
              <Row label="Layer">
                <Segmented
                  value={layer.above ? 'above' : 'below'}
                  onChange={(v) => setLayer(layer.id, { above: v === 'above' })}
                  options={[
                    { value: 'below', label: <span className="flex items-center gap-1"><ArrowDownToLine className="w-3 h-3" />Behind text</span> },
                    { value: 'above', label: <span className="flex items-center gap-1"><ArrowUpToLine className="w-3 h-3" />In front</span> },
                  ]}
                />
              </Row>
              <div className="flex gap-1.5 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => {
                    const copy = { ...layer, id: newLayerId(), x: layer.x + 2, y: layer.y + 2 };
                    commit({ ...template, layers: [...layers, copy] });
                    setSelected(copy.id);
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />Duplicate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-destructive"
                  onClick={() => {
                    commit({ ...template, layers: layers.filter((l) => l.id !== layer.id) });
                    setSelected('background');
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />Remove
                </Button>
              </div>
            </Group>
          </>
        )}
        {!layer && !['background', 'text', 'label', 'logo'].includes(selected) && <p className="py-4 text-sm text-muted-foreground">Select something on the slide.</p>}
        <div className="py-3 border-t border-border">
          <Row label="Name"><Input value={template.name} onChange={(e) => commit({ ...template, name: e.target.value }, false)} className="h-8" /></Row>
        </div>
      </div>
    </div>
  );
};
