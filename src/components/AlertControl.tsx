import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScaledStage } from '@/components/ScaledStage';
import { OutputContent } from '@/components/OutputContent';
import { AlertBanner } from '@/components/AlertBanner';
import { useAlert } from '@/hooks/use-alert';
import { useLive } from '@/hooks/use-live';
import { ALERT_PRESETS, AlertPreset, clearAlert, fillAlert, ScreenAlert, showAlert } from '@/lib/alerts';

const HIDE_AFTER: { label: string; seconds: number }[] = [
  { label: 'Until I clear it', seconds: 0 },
  { label: '15 seconds', seconds: 15 },
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '2 minutes', seconds: 120 },
];

const chip = (on: boolean) =>
  `min-h-9 px-3.5 rounded-full text-[13px] font-semibold transition ${on ? 'bg-card text-foreground shadow-sm ring-1 ring-foreground/30' : 'bg-muted/60 text-muted-foreground hover:text-foreground'}`;

/**
 * Putting an alert on the screens: a message over whatever is showing, for the
 * room (nursery, a car), the stream, or only the stage monitor (a note for the
 * preacher). The button turns amber while one is up, with Clear beside it.
 */
export const AlertControl = ({ className = '' }: { className?: string }) => {
  const current = useAlert();
  const { live } = useLive();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<AlertPreset | null>(ALERT_PRESETS[0]);
  const [value, setValue] = useState('');
  const [text, setText] = useState(fillAlert(ALERT_PRESETS[0], ''));
  const [screens, setScreens] = useState(ALERT_PRESETS[0].screens);
  const [position, setPosition] = useState<ScreenAlert['position']>('bottom');
  const [urgent, setUrgent] = useState(false);
  const [hideAfter, setHideAfter] = useState(0);

  const pick = (p: AlertPreset) => {
    setPreset(p);
    setValue('');
    setText(fillAlert(p, ''));
    setScreens(p.screens);
    setUrgent(!!p.urgent);
  };
  const draft: Omit<ScreenAlert, 'id'> = { text: text.trim(), ...screens, position, urgent, until: hideAfter ? Date.now() + hideAfter * 1000 : undefined };
  const nothingChosen = !screens.projector && !screens.stream && !screens.stage;
  const show = () => {
    showAlert({ ...draft, until: hideAfter ? Date.now() + hideAfter * 1000 : undefined });
    setOpen(false);
  };

  return (
    <>
      <div className={`flex items-center ${className}`}>
        <Button
          variant="outline"
          className={`gap-2 h-full ${current ? 'border-amber-500/70 text-amber-300' : ''}`}
          onClick={() => setOpen(true)}
          title={current ? `On the screens: ${current.text}` : 'Put a message on the screens: nursery, a car, a note for the preacher'}
        >
          <BellRing className="w-4 h-4" />
          <span className="max-w-[12rem] truncate">{current ? 'Alert on' : 'Alert'}</span>
        </Button>
        {current && (
          <Button variant="ghost" size="icon" className="h-full w-9" onClick={clearAlert} title="Take the alert off the screens" aria-label="Clear the alert">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alert</DialogTitle>
            <DialogDescription>A message over whatever is on screen, without changing it.</DialogDescription>
          </DialogHeader>

          {current && (
            <div className="rounded-xl bg-amber-500/15 p-3 flex items-center gap-3">
              <p className="m-0 text-sm flex-1 min-w-0">
                <b>On the screens now:</b> {current.text}
              </p>
              <Button size="sm" variant="outline" onClick={clearAlert}>
                Clear it
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <p className="m-0 text-[13px] font-semibold text-muted-foreground">For the room</p>
            <div className="flex flex-wrap gap-1.5">
              {ALERT_PRESETS.filter((p) => !p.screens.stage).map((p) => (
                <button key={p.id} type="button" className={chip(preset?.id === p.id)} onClick={() => pick(p)}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="m-0 pt-1 text-[13px] font-semibold text-muted-foreground">For the stage only (the preacher and singers)</p>
            <div className="flex flex-wrap gap-1.5">
              {ALERT_PRESETS.filter((p) => p.screens.stage).map((p) => (
                <button key={p.id} type="button" className={chip(preset?.id === p.id)} onClick={() => pick(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {preset?.field && (
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">{preset.field.label}</span>
              <Input
                autoFocus
                value={value}
                placeholder={preset.field.placeholder}
                onChange={(e) => {
                  setValue(e.target.value);
                  setText(fillAlert(preset, e.target.value));
                }}
                className="max-w-xs"
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Message</span>
            <Input value={text} onChange={(e) => { setText(e.target.value); setPreset(null); }} placeholder="Type any message" />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="m-0 text-sm font-semibold">Show it on</p>
              <div className="flex flex-wrap gap-1.5">
                {([['projector', 'Projector'], ['stream', 'Stream'], ['stage', 'Stage monitor']] as const).map(([key, label]) => (
                  <button key={key} type="button" role="checkbox" aria-checked={screens[key]} className={chip(screens[key])} onClick={() => setScreens({ ...screens, [key]: !screens[key] })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="m-0 text-sm font-semibold">Hide it</p>
              <div className="flex flex-wrap gap-1.5">
                {HIDE_AFTER.map((h) => (
                  <button key={h.seconds} type="button" className={chip(hideAfter === h.seconds)} onClick={() => setHideAfter(h.seconds)}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="m-0 text-sm font-semibold">Where on the projector</p>
              <div className="flex gap-1.5">
                {(['bottom', 'top'] as const).map((p) => (
                  <button key={p} type="button" className={chip(position === p)} onClick={() => setPosition(p)}>
                    {p === 'bottom' ? 'Bottom' : 'Top'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="m-0 text-sm font-semibold">Make it stand out</p>
              <button type="button" role="switch" aria-checked={urgent} className={chip(urgent)} onClick={() => setUrgent(!urgent)}>
                {urgent ? 'Amber: urgent' : 'Normal'}
              </button>
            </div>
          </div>

          {(screens.projector || screens.stream) && draft.text && (
            <div>
              <p className="m-0 mb-1.5 text-[13px] font-semibold text-muted-foreground">How the projector will look</p>
              <ScaledStage className="aspect-video rounded-xl bg-black">
                <OutputContent live={live} output="projection" preview />
                <AlertBanner output={screens.projector ? 'projection' : 'stream'} alert={{ ...draft, id: 'preview', projector: true, stream: true }} />
              </ScaledStage>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={show} disabled={!draft.text || nothingChosen}>
              Show on the screens
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
