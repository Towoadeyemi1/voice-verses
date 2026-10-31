import { useState } from 'react';
import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Countdown, endsAtFor, extendCountdown, formatRemaining, startCountdown, stopCountdown } from '@/lib/countdown';
import { useCountdown } from '@/hooks/use-countdown';
import { COUNTDOWN_PRESETS } from '@/lib/starters';

const SETTINGS_KEY = 'voice-verses-countdown-setup';

interface Setup {
  mode: 'duration' | 'until';
  minutes: number;
  until: string;
  message: string;
  projector: Countdown['projector'];
  confidence: boolean;
  stream: boolean;
}

const DEFAULT_SETUP: Setup = {
  mode: 'duration',
  minutes: 5,
  until: '10:00',
  message: 'Service begins in',
  projector: 'full',
  confidence: true,
  stream: false,
};

function loadSetup(): Setup {
  try {
    return { ...DEFAULT_SETUP, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return DEFAULT_SETUP;
  }
}

const Toggle = <T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) => (
  <div className="flex gap-1 flex-wrap">
    {options.map((o) => (
      <Button key={o.value} type="button" size="sm" variant={value === o.value ? 'default' : 'outline'} onClick={() => onChange(o.value)}>
        {o.label}
      </Button>
    ))}
  </div>
);

/** Start, adjust and stop a countdown: before the service, or to time a segment. */
export const CountdownControl = ({ className }: { className?: string }) => {
  const [open, setOpen] = useState(false);
  const [setup, setSetup] = useState<Setup>(loadSetup);
  const { countdown, remaining } = useCountdown();

  const change = (next: Partial<Setup>) => {
    const updated = { ...setup, ...next };
    setSetup(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  };

  const start = () => {
    startCountdown({
      message: setup.message,
      endsAt: endsAtFor(setup.mode === 'until' ? { until: setup.until } : { minutes: setup.minutes }),
      projector: setup.projector,
      confidence: setup.confidence,
      stream: setup.stream,
    });
    setOpen(false);
  };

  return (
    <>
      <Button variant={countdown ? 'default' : 'outline'} className={`gap-2 ${className ?? ''}`} onClick={() => setOpen(true)}>
        <Timer className="w-4 h-4" />
        <span className="tabular-nums">{countdown ? formatRemaining(remaining) : 'Countdown'}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Countdown</DialogTitle>
            <DialogDescription>Before the service, or to time a segment for the speaker.</DialogDescription>
          </DialogHeader>

          {countdown && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{countdown.message}</span>
                <span className="text-4xl font-bold tabular-nums">{formatRemaining(remaining, { overrun: true })}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => extendCountdown(countdown, 60)}>
                  +1 min
                </Button>
                <Button size="sm" variant="outline" onClick={() => extendCountdown(countdown, -60)}>
                  −1 min
                </Button>
                <Button size="sm" variant="destructive" className="ml-auto" onClick={stopCountdown}>
                  Stop
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Quick start</Label>
              <div className="flex gap-1.5 flex-wrap">
                {COUNTDOWN_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() =>
                      change({
                        mode: p.mode,
                        ...(p.minutes ? { minutes: p.minutes } : {}),
                        ...(p.until ? { until: p.until } : {}),
                        message: p.message,
                        projector: p.projector,
                        confidence: p.confidence,
                        stream: p.stream,
                      })
                    }
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
            </div>
            <Toggle
              value={setup.mode}
              onChange={(mode) => change({ mode })}
              options={[
                { value: 'duration', label: 'Length of time' },
                { value: 'until', label: 'Until a time' },
              ]}
            />
            {setup.mode === 'duration' ? (
              <div className="flex items-center gap-2">
                <Input type="number" min={1} max={600} value={setup.minutes} onChange={(e) => change({ minutes: Math.max(1, Number(e.target.value) || 1) })} className="w-24" />
                <span className="text-sm">minutes</span>
              </div>
            ) : (
              <Input type="time" value={setup.until} onChange={(e) => change({ until: e.target.value })} className="w-40" />
            )}
            <div className="space-y-1">
              <Label htmlFor="countdown-message">Message</Label>
              <Input id="countdown-message" value={setup.message} onChange={(e) => change({ message: e.target.value })} placeholder="Service begins in" />
            </div>
            <div className="space-y-2">
              <Label>On the projector</Label>
              <Toggle
                value={setup.projector}
                onChange={(projector) => change({ projector })}
                options={[
                  { value: 'full', label: 'Full screen' },
                  { value: 'corner', label: 'Small, in the corner' },
                  { value: 'off', label: 'Not shown' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="countdown-confidence">On the confidence monitor</Label>
              <Switch id="countdown-confidence" checked={setup.confidence} onCheckedChange={(confidence) => change({ confidence })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="countdown-stream">On the lower third / stream</Label>
              <Switch id="countdown-stream" checked={setup.stream} onCheckedChange={(stream) => change({ stream })} />
            </div>
            <Button className="w-full" onClick={start}>
              {countdown ? 'Start a new countdown' : 'Start countdown'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
