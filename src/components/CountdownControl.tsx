import { useState } from 'react';
import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Countdown, countdownTone, endsAtFor, extendCountdown, formatRemaining, startCountdown, stopCountdown, TONE_COLOR } from '@/lib/countdown';
import { useCountdowns } from '@/hooks/use-countdown';
import { chipClass, describeScreens, ScreenPicker } from '@/components/ScreenPicker';
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
  /** Yellow from this many seconds left */
  warnSeconds: number;
  /** Blink while yellow or red */
  flash: boolean;
}

const DEFAULT_SETUP: Setup = {
  mode: 'duration',
  minutes: 5,
  until: '10:00',
  message: 'Service begins in',
  projector: 'full',
  confidence: true,
  stream: false,
  warnSeconds: 60,
  flash: true,
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

const WARN: { label: string; seconds: number }[] = [
  { label: '30 s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
];

const screensOf = (c: Pick<Countdown, 'projector' | 'confidence' | 'stream'>) => ({ projector: c.projector !== 'off', stage: c.confidence, stream: c.stream });

/**
 * Countdowns: before the service, or to time a segment for the speaker. Several
 * can run at once, each on the screens chosen for it (the room counts down to
 * the start while the stage times the sermon). Each turns yellow near the end
 * and red when done, blinking if chosen.
 */
export const CountdownControl = ({ className }: { className?: string }) => {
  const [open, setOpen] = useState(false);
  const [setup, setSetup] = useState<Setup>(loadSetup);
  const { countdowns, now } = useCountdowns();
  const first = countdowns[0];

  const change = (next: Partial<Setup>) => {
    const updated = { ...setup, ...next };
    setSetup(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  };
  const screens = screensOf(setup);
  const replaced = countdowns.filter((c) => (screens.projector && c.projector !== 'off') || (screens.stage && c.confidence) || (screens.stream && c.stream));

  const start = () => {
    startCountdown({
      message: setup.message,
      endsAt: endsAtFor(setup.mode === 'until' ? { until: setup.until } : { minutes: setup.minutes }),
      projector: setup.projector,
      confidence: setup.confidence,
      stream: setup.stream,
      warnSeconds: setup.warnSeconds,
      flash: setup.flash,
    });
    setOpen(false);
  };

  const tone = first ? countdownTone(first, first.endsAt - now) : 'normal';

  return (
    <>
      <Button
        variant={first ? 'default' : 'outline'}
        className={`gap-2 ${className ?? ''} ${first?.flash && tone !== 'normal' ? 'vv-blink' : ''}`}
        style={first && tone !== 'normal' ? { backgroundColor: TONE_COLOR[tone], color: '#111' } : undefined}
        onClick={() => setOpen(true)}
        title={countdowns.map((c) => `${c.message}: ${formatRemaining(c.endsAt - now, { overrun: true })} on ${describeScreens(screensOf(c))}`).join('\n') || 'Start a countdown'}
      >
        <Timer className="w-4 h-4" />
        <span className="tabular-nums">{first ? formatRemaining(first.endsAt - now) : 'Countdown'}</span>
        {countdowns.length > 1 && <span className="text-[12px] opacity-80">+{countdowns.length - 1}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Countdown</DialogTitle>
            <DialogDescription>Before the service, or to time a segment for the speaker. Each screen can count down to something of its own.</DialogDescription>
          </DialogHeader>

          {countdowns.length > 0 && (
            <div className="rounded-xl bg-muted/50 p-3 space-y-3" data-countdowns-on>
              <p className="m-0 text-[13px] font-semibold">Running now</p>
              {countdowns.map((c) => {
                const left = c.endsAt - now;
                const t = countdownTone(c, left);
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-semibold truncate">{c.message}</p>
                      <p className="m-0 text-[13px] text-muted-foreground">On {describeScreens(screensOf(c))}{c.projector === 'corner' ? ' (projector: small, in the corner)' : ''}</p>
                    </div>
                    <span className={`text-3xl font-bold tabular-nums ${c.flash && t !== 'normal' ? 'vv-blink' : ''}`} style={{ color: TONE_COLOR[t] }}>
                      {formatRemaining(left, { overrun: true })}
                    </span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => extendCountdown(c, 60)}>+1 min</Button>
                      <Button size="sm" variant="outline" onClick={() => extendCountdown(c, -60)}>−1 min</Button>
                      <Button size="sm" variant="outline" onClick={() => stopCountdown(c.id)}>Stop</Button>
                    </div>
                  </div>
                );
              })}
              {countdowns.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => stopCountdown()}>
                  Stop them all
                </Button>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Quick start</Label>
              <div className="flex gap-1.5 flex-wrap">
                {COUNTDOWN_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={chipClass(false)}
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
                  </button>
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
                <Input type="number" min={1} max={600} value={setup.minutes} onChange={(e) => change({ minutes: Math.max(1, Number(e.target.value) || 1) })} className="w-24" aria-label="Minutes" />
                <span className="text-sm">minutes</span>
              </div>
            ) : (
              <Input type="time" value={setup.until} onChange={(e) => change({ until: e.target.value })} className="w-40" aria-label="Until" />
            )}
            <div className="space-y-1">
              <Label htmlFor="countdown-message">Message</Label>
              <Input id="countdown-message" value={setup.message} onChange={(e) => change({ message: e.target.value })} placeholder="Service begins in" />
            </div>
            <div className="space-y-1.5">
              <Label>Show it on</Label>
              <ScreenPicker
                value={screens}
                onChange={(s) => change({ projector: s.projector ? (setup.projector === 'off' ? 'full' : setup.projector) : 'off', confidence: s.stage, stream: s.stream })}
              />
              {screens.projector && (
                <div className="flex gap-1.5 pt-1">
                  {([['full', 'Projector: full screen'], ['corner', 'Projector: small, in the corner']] as const).map(([v, label]) => (
                    <button key={v} type="button" className={chipClass(setup.projector === v)} onClick={() => change({ projector: v })}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {replaced.length > 0 && (
                <p className="m-0 text-[13px] text-muted-foreground">It takes over from “{replaced[0].message}” on the screens they share; the others keep theirs.</p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Turn yellow with</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {WARN.map((w) => (
                    <button key={w.seconds} type="button" className={chipClass(setup.warnSeconds === w.seconds)} onClick={() => change({ warnSeconds: w.seconds })}>
                      {w.label} left
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Blink</Label>
                <button type="button" role="switch" aria-checked={setup.flash} className={chipClass(setup.flash)} onClick={() => change({ flash: !setup.flash })}>
                  {setup.flash ? 'Blink when yellow and red' : 'Do not blink'}
                </button>
              </div>
            </div>
            <p className="m-0 text-[13px] text-muted-foreground">It turns red when the time is up, and the stage monitor shows how far over it is.</p>
            <Button className="w-full" onClick={start} disabled={!screens.projector && !screens.stage && !screens.stream}>
              Start on {describeScreens(screens)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
