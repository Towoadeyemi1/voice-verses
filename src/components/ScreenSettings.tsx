import { useEffect, useState } from 'react';
import { AlertTriangle, MonitorPlay, MonitorSmartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeckLinkConfig, DeckLinkDevices, DeckLinkStatus, desktop, DisplayInfo, ScreenConfig, ScreenOutput } from '@/lib/desktop';
import { DECKLINK_MODES, DEFAULT_DECKLINK_MODE, decklinkModeLabel } from '@/lib/decklinkModes';
import { Button } from '@/components/ui/button';
import type { Output } from '@/lib/templates';
import { ScreenShapePicker } from './ScreenShapePicker';
import { chipClass } from './ScreenPicker';

const OUTPUTS: { output: ScreenOutput; label: string; hint: string }[] = [
  { output: 'projection', label: 'Projector', hint: 'Scripture, songs, pictures, videos, countdown and logo for the room' },
  { output: 'confidence', label: 'Confidence monitor', hint: 'What the preacher and singers see: the verse, the next slide, the clock' },
  { output: 'lowerThird', label: 'Lower third', hint: 'For the livestream, on green (key it out on the switcher or in OBS/vMix)' },
];

const OFF = 'off';

/** Outputs drawn from looks have a shape; the confidence monitor fills any screen by itself. */
const SHAPED: Partial<Record<ScreenOutput, Output>> = { projection: 'projection', lowerThird: 'stream' };

const describe = (d: DisplayInfo) =>
  `${d.label} — ${d.width}×${d.height}${d.primary ? " (this computer's main screen)" : ''}`;

/**
 * Settings → Screens: which display each output goes to. The desktop app opens
 * each output full screen on its display by itself, every time it starts, and
 * keeps it there; the Voice Verses window does not need to be on that screen.
 */
export function ScreenSettings() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [config, setConfig] = useState<ScreenConfig | null>(null);
  /** DeckLink ports (SDI out), what each output sends there, and how it is going */
  const [decklink, setDeckLink] = useState<DeckLinkDevices | null>(null);
  const [dlConfig, setDlConfig] = useState<DeckLinkConfig | null>(null);
  const [dlStatus, setDlStatus] = useState<DeckLinkStatus | null>(null);

  useEffect(() => {
    if (!desktop) return;
    const dl = desktop.decklink;
    const refresh = () => {
      desktop!.screens.displays().then(setDisplays).catch(() => {});
      dl?.devices().then(setDeckLink).catch(() => {});
      dl?.status().then(setDlStatus).catch(() => {});
    };
    refresh();
    desktop.screens.get().then(setConfig).catch(() => {});
    dl?.get().then(setDlConfig).catch(() => {});
    // Displays come and go (an HDMI-to-SDI converter switched on later, a cable moved)
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!desktop) {
    return (
      <div className="space-y-4">
        <Alert>
          <MonitorSmartphone className="h-4 w-4" />
          <AlertDescription>
            Choosing a screen for each output needs the Voice Verses desktop app. In a browser, open the output windows
            and drag each one to its screen.
          </AlertDescription>
        </Alert>
        <ScreenShapePicker output="projection" label="Projector screen shape" />
        <ScreenShapePicker output="stream" label="Lower-third screen shape" />
      </div>
    );
  }

  const choose = async (output: ScreenOutput, value: string) => {
    if (!config) return;
    const dl = desktop!.decklink;
    // A DeckLink port ("dl:<name>") or a display: an output goes to one place at a time
    const port = value.startsWith('dl:') ? value.slice(3) : null;
    if (dl && dlConfig && (port || dlConfig[output])) {
      const nextDl = { ...dlConfig, [output]: port ? { device: port, mode: dlConfig[output]?.mode ?? DEFAULT_DECKLINK_MODE } : null };
      setDlConfig(nextDl);
      setDlConfig(await dl.set(nextDl));
      window.setTimeout(() => dl.status().then(setDlStatus).catch(() => {}), 1200);
    }
    const next = { ...config, [output]: port || value === OFF ? null : Number(value) };
    setConfig(next);
    setConfig(await desktop!.screens.set(next));
  };

  const chooseFormat = async (output: ScreenOutput, mode: string) => {
    const dl = desktop!.decklink;
    const current = dlConfig?.[output];
    if (!dl || !dlConfig || !current) return;
    const nextDl = { ...dlConfig, [output]: { ...current, mode } };
    setDlConfig(nextDl);
    setDlConfig(await dl.set(nextDl));
    window.setTimeout(() => dl.status().then(setDlStatus).catch(() => {}), 1200);
  };

  const ports = decklink?.available ? decklink.devices.filter((d) => d.canOutput) : [];

  // Per screen: what it shows now, and one click to change it
  const SHORT: Record<ScreenOutput, string> = { projection: 'Projector', confidence: 'Stage monitor', lowerThird: 'Lower third' };
  const showsOn = (value: string) =>
    OUTPUTS.filter(({ output }) => (value.startsWith('dl:') ? dlConfig?.[output]?.device === value.slice(3) : !dlConfig?.[output] && config?.[output] === Number(value)));
  const clearScreen = async (value: string) => {
    for (const { output } of showsOn(value)) await choose(output, OFF);
  };
  const tiles = [
    ...displays.map((d, i) => ({ value: String(d.id), number: String(i + 1), name: d.label, detail: `${d.width}×${d.height}`, main: d.primary, sdi: false })),
    ...ports.map((p) => ({ value: `dl:${p.name}`, number: 'SDI', name: p.name, detail: 'Blackmagic DeckLink, SDI out', main: false, sdi: true })),
  ];
  const usedBy = (name: string, except: ScreenOutput) => OUTPUTS.find(({ output }) => output !== except && dlConfig?.[output]?.device === name)?.label;

  const onMain = config ? OUTPUTS.filter(({ output }) => displays.find((d) => d.id === config[output])?.primary) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorPlay className="w-5 h-5 text-primary" />
          Screens
        </CardTitle>
        <CardDescription>
          Choose where each output goes. Voice Verses opens it full screen on that display by itself, every time it
          starts, and puts it back if the display is unplugged and reconnected. Keep working in this window; nothing
          needs to be dragged or kept open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {tiles.length > 0 && (
          <div className="space-y-2" data-screen-tiles>
            <div className="flex items-center gap-2">
              <p className="m-0 text-sm font-semibold flex-1">Your screens</p>
              {desktop.screens.identify && (
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => desktop!.screens.identify?.()} title="Shows a big number on every display for a few seconds">
                  Identify screens
                </Button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {tiles.map((t) => {
                const shows = showsOn(t.value);
                return (
                  <div key={t.value} className="rounded-xl bg-muted/50 p-3 space-y-2" data-screen-tile={t.name}>
                    <div className="flex items-center gap-3">
                      <span className={`min-w-10 h-10 px-2 rounded-lg grid place-items-center font-bold ${t.sdi ? 'text-[12px] bg-primary/20' : 'text-lg bg-card'}`}>{t.number}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold truncate">{t.name}</span>
                        <span className="block text-[13px] text-muted-foreground truncate">
                          {t.detail}
                          {t.main ? ' · where you work' : ''}
                        </span>
                      </span>
                    </div>
                    <p className="m-0 text-[13px]">
                      Shows: <b>{shows.length ? shows.map((o) => SHORT[o.output]).join(' and ') : 'nothing'}</b>
                    </p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`What ${t.name} shows`}>
                      {OUTPUTS.map(({ output }) => {
                        const on = shows.some((o) => o.output === output);
                        return (
                          <button key={output} type="button" aria-pressed={on} className={chipClass(on)} onClick={() => (on ? choose(output, OFF) : choose(output, t.value))} title={on ? `Stop showing the ${SHORT[output].toLowerCase()} here` : `Show the ${SHORT[output].toLowerCase()} on ${t.name}`}>
                            {SHORT[output]}
                          </button>
                        );
                      })}
                      {shows.length > 0 && (
                        <button type="button" className={chipClass(false)} onClick={() => clearScreen(t.value)}>
                          Nothing
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {displays.length <= 1 && (
          <Alert data-one-display>
            <MonitorSmartphone className="h-4 w-4" />
            <AlertDescription className="space-y-1.5">
              <span className="block font-semibold text-foreground">Only this computer's own screen is connected</span>
              <span className="block">
                Another display appears here as soon as something is plugged into a video output and switched on: a TV or projector, or an
                HDMI-to-SDI converter on the eGPU's free HDMI port for the switcher.
              </span>
              <span className="block">
                {decklink?.available
                  ? 'Your Blackmagic DeckLink ports are listed under each output too: choose one to send that output out of its SDI port.'
                  : decklink?.reason === 'drivers'
                    ? 'To send through a Blackmagic DeckLink card, install Blackmagic Desktop Video (it comes with the card); its SDI ports are then listed here.'
                    : "A Blackmagic DeckLink card isn't a display to the computer. Sending through its SDI ports works in the Mac app."}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {OUTPUTS.map(({ output, label, hint }) => {
          const chosen = config?.[output] ?? null;
          const missing = chosen !== null && !displays.some((d) => d.id === chosen);
          const sdi = dlConfig?.[output] ?? null;
          const sdiMissing = !!sdi && !ports.some((p) => p.name === sdi.device);
          const status = dlStatus?.[output];
          return (
            <div key={output} className="space-y-1.5">
              <Label htmlFor={`screen-${output}`}>{label}</Label>
              <Select value={sdi ? `dl:${sdi.device}` : chosen === null ? OFF : String(chosen)} onValueChange={(v) => choose(output, v)} disabled={!config}>
                <SelectTrigger id={`screen-${output}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OFF}>Off</SelectItem>
                  {displays.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {describe(d)}
                    </SelectItem>
                  ))}
                  {missing && <SelectItem value={String(chosen)}>Not connected now — opens when it is</SelectItem>}
                  {ports.map((p) => {
                    const other = usedBy(p.name, output);
                    return (
                      <SelectItem key={`dl:${p.name}`} value={`dl:${p.name}`} disabled={!!other}>
                        {p.name} — SDI out (Blackmagic DeckLink){other ? ` · used by ${other}` : ''}
                      </SelectItem>
                    );
                  })}
                  {sdiMissing && sdi && <SelectItem value={`dl:${sdi.device}`}>{sdi.device} — not connected now</SelectItem>}
                </SelectContent>
              </Select>
              {sdi && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-2" data-decklink-output={output}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={`format-${output}`} className="text-[13px]">
                      Video format
                    </Label>
                    <Select value={sdi.mode} onValueChange={(m) => chooseFormat(output, m)}>
                      <SelectTrigger id={`format-${output}`} className="w-44 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DECKLINK_MODES.map((m) => (
                          <SelectItem key={m.key} value={m.key}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9"
                      disabled={status?.state !== 'sending'}
                      onClick={() => desktop!.decklink?.test(output)}
                      title="Colour bars on this port for 8 seconds, to find it on the switcher"
                    >
                      Show test colours
                    </Button>
                  </div>
                  <p className="m-0 text-[13px] text-muted-foreground">
                    Choose the format your switcher runs at (on an ATEM: Settings → Video standard), or its input stays black.
                  </p>
                  {status?.state === 'sending' && (
                    <p className="m-0 text-[13px] flex items-center gap-1.5" role="status">
                      <i className="w-2 h-2 rounded-full bg-[hsl(var(--live))]" aria-hidden />
                      Sending to {status.device} · {decklinkModeLabel(status.mode)} · {status.framesPerSecond} pictures a second
                    </p>
                  )}
                  {status?.state === 'error' && (
                    <p className="m-0 text-[13px] text-amber-400 flex items-start gap-1.5" role="alert">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
                      {status.message}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{hint}</p>
              {SHAPED[output] && <ScreenShapePicker output={SHAPED[output]!} />}
            </div>
          );
        })}

        {onMain.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {onMain.map((o) => o.label).join(' and ')} would cover this computer's main screen, where you work. Choose
              another display, or Off. (Press Esc there to get back if it happens.)
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
          <p>
            <strong className="text-foreground">To SDI:</strong> plug an HDMI-to-SDI converter into a spare video output
            (for example the eGPU's free HDMI port). It appears here as a display; choose it for the Projector, and route
            its SDI into a free switcher input.
          </p>
          <p>
            <strong className="text-foreground">Over the network:</strong> confidence TVs and streaming computers can show
            any output in a browser instead (Settings → Network).
          </p>
          <p>
            <strong className="text-foreground">DeckLink:</strong> each free SDI port of a Blackmagic DeckLink card is listed
            under the outputs (Mac, with Blackmagic Desktop Video installed). A port another app uses, such as ProPresenter,
            can't be shared; choose a free one, set to output in Blackmagic Desktop Video Setup.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
