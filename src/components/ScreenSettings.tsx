import { useEffect, useState } from 'react';
import { AlertTriangle, MonitorPlay, MonitorSmartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { desktop, DisplayInfo, ScreenConfig, ScreenOutput } from '@/lib/desktop';

const OUTPUTS: { output: ScreenOutput; label: string; hint: string }[] = [
  { output: 'projection', label: 'Projector', hint: 'Scripture, songs, pictures, videos, countdown and logo for the room' },
  { output: 'confidence', label: 'Confidence monitor', hint: 'What the preacher and singers see: the verse, the next slide, the clock' },
  { output: 'lowerThird', label: 'Lower third', hint: 'For the livestream, on green (key it out on the switcher or in OBS/vMix)' },
];

const OFF = 'off';

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

  useEffect(() => {
    if (!desktop) return;
    const refresh = () => desktop!.screens.displays().then(setDisplays).catch(() => {});
    refresh();
    desktop.screens.get().then(setConfig).catch(() => {});
    // Displays come and go (an HDMI-to-SDI converter switched on later, a cable moved)
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!desktop) {
    return (
      <Alert>
        <MonitorSmartphone className="h-4 w-4" />
        <AlertDescription>
          Choosing a screen for each output needs the Voice Verses desktop app. In a browser, open the output windows
          and drag each one to its screen.
        </AlertDescription>
      </Alert>
    );
  }

  const choose = async (output: ScreenOutput, value: string) => {
    if (!config) return;
    const next = { ...config, [output]: value === OFF ? null : Number(value) };
    setConfig(next);
    setConfig(await desktop!.screens.set(next));
  };

  const onMain = config ? OUTPUTS.filter(({ output }) => displays.find((d) => d.id === config[output])?.primary) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
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
        {OUTPUTS.map(({ output, label, hint }) => {
          const chosen = config?.[output] ?? null;
          const missing = chosen !== null && !displays.some((d) => d.id === chosen);
          return (
            <div key={output} className="space-y-1.5">
              <Label htmlFor={`screen-${output}`}>{label}</Label>
              <Select value={chosen === null ? OFF : String(chosen)} onValueChange={(v) => choose(output, v)} disabled={!config}>
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
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{hint}</p>
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
            <strong className="text-foreground">DeckLink:</strong> sending straight out of a DeckLink card's SDI ports is
            coming; when it is, the DeckLink outputs will be listed here too.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
