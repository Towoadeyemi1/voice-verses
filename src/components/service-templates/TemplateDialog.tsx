import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Service } from '@/types/service';
import { knownTypes, serviceType } from '@/lib/serviceTypes';
import { readyOrderFor, serviceFromStarter } from '@/lib/starters';
import { templateForType, templateFrom, templateName } from '@/lib/serviceTemplates';
import { timelineParts } from '@/components/live/ServiceTimeline';

type From = 'ready' | 'existing' | 'blank';

const Bar = ({ service }: { service: Service | null }) => {
  const parts = timelineParts(service);
  if (!parts.length) return null;
  return (
    <span className="flex gap-[2px] h-1.5 mt-2.5" aria-hidden="true">
      {parts.map((p) => (
        <span key={p.item.id} className="rounded-full" style={{ flex: p.minutes, background: p.color }} />
      ))}
    </span>
  );
};

/**
 * A new service template (1.18.1): a type of service, a name, and what it
 * starts from (the app's ready-made order for that type, a service or template
 * the church has, or nothing). With `source`, it is "Save as a template" for
 * that service, and only asks for the name and type.
 */
export function TemplateDialog({
  open,
  onOpenChange,
  services,
  source,
  initialType,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every service and template, to start from one */
  services: Service[];
  source?: Service;
  initialType?: string;
  onCreate: (template: Service) => void;
}) {
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [named, setNamed] = useState(false);
  const [from, setFrom] = useState<From>('ready');
  const [fromId, setFromId] = useState<string>('');
  const [keepSlides, setKeepSlides] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = initialType ?? (source ? serviceType(source) : 'Sunday service');
    setType(t);
    setName(source ? source.name.replace(/^Sample: /, '') : t);
    setNamed(!!source);
    setFrom(source ? 'existing' : readyOrderFor(t) ? 'ready' : 'blank');
    setFromId(source?.id ?? '');
    setKeepSlides(!!source);
  }, [open, source, initialType]);

  const ready = readyOrderFor(type);
  const readyPreview = useMemo(() => (ready ? serviceFromStarter(ready, new Date()) : null), [ready]);
  const templates = services.filter((s) => s.isTemplate);
  const planned = services.filter((s) => !s.isTemplate).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 40);
  const chosen = source ?? services.find((s) => s.id === fromId) ?? null;
  const canCreate = !!type.trim() && !!name.trim() && (from !== 'existing' || !!chosen);

  const create = () => {
    const t = type.trim();
    const n = name.trim();
    const template = from === 'existing' && chosen ? templateFrom(chosen, n, t, keepSlides) : from === 'ready' && ready ? templateForType(t, n) : templateFrom({ id: 'blank', name: n, date: new Date(), startTime: '10:00', sections: [], isTemplate: false }, n, t, false);
    onCreate(template);
  };

  const card = (id: From, title: string, sub: string, disabled = false, extra?: React.ReactNode) => (
    <button
      key={id}
      type="button"
      role="radio"
      aria-checked={from === id}
      disabled={disabled}
      onClick={() => setFrom(id)}
      className={`text-left rounded-xl p-3.5 transition ${from === id ? 'bg-muted shadow-[0_0_0_2px_hsl(var(--primary))]' : 'bg-muted/40 hover:bg-muted/70'} disabled:opacity-45 disabled:hover:bg-muted/40`}
      data-template-from={id}
    >
      <span className="block text-[14.5px] font-semibold">{title}</span>
      <span className="block text-[13px] text-muted-foreground mt-0.5 leading-snug">{sub}</span>
      {extra}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] p-6 gap-5 rounded-[18px]" data-template-dialog>
        <div>
          <DialogTitle className="text-[22px] font-bold tracking-[-0.02em]">{source ? 'Save as a template' : 'New service template'}</DialogTitle>
          <DialogDescription className="mt-1 text-[14px]">
            {source ? 'Services made from it start with this order.' : 'A starting order for a type of service. Every service made from it starts with this order; change anything after.'}
          </DialogDescription>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="template-type">Type of service</Label>
            <Input
              id="template-type"
              list="template-types"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                if (!named) setName(e.target.value);
                if (from === 'ready' && !readyOrderFor(e.target.value)) setFrom('blank');
              }}
              placeholder="e.g. Friday Night Prayers"
              data-template-type
            />
            <datalist id="template-types">
              {knownTypes(services).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNamed(true);
              }}
              placeholder="e.g. Communion Sunday (first service)"
              data-template-name
            />
          </div>
        </div>

        {!source && (
          <div className="space-y-2">
            <Label>Start from</Label>
            <div role="radiogroup" aria-label="Start from" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {card('ready', ready ? `The ready-made ${ready.name}` : 'A ready-made order', ready ? ready.description : `The app has none for “${type || 'this type'}” yet.`, !ready, <Bar service={readyPreview} />)}
              {card('existing', 'A service or template you have', 'Its parts, timings and notes; its slides too if you like.', !services.length)}
              {card('blank', 'Nothing yet', 'An empty template: add the parts in the editor.')}
            </div>
          </div>
        )}

        {from === 'existing' && (
          <div className="space-y-3 rounded-xl bg-muted/40 p-3.5">
            {!source && (
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger aria-label="Which service or template" data-template-source>
                  <SelectValue placeholder="Choose a service or template" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {templates.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Your templates</SelectLabel>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {templateName(t)} · {serviceType(t)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  <SelectGroup>
                    <SelectLabel>Services</SelectLabel>
                    {planned.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name.replace(/^Sample: /, '')} · {new Date(s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            {chosen && <Bar service={chosen} />}
            <label className="flex items-center justify-between gap-3 text-[14px]">
              <span>
                <b className="block font-semibold">Keep its songs, verses and slides</b>
                <span className="text-[13px] text-muted-foreground">Off: only the parts, their timings and notes.</span>
              </span>
              <Switch checked={keepSlides} onCheckedChange={setKeepSlides} aria-label="Keep its songs, verses and slides" />
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={!canCreate} data-template-create>
            {source ? 'Save template' : 'Create and edit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
