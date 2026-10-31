import { useEffect, useState } from 'react';
import { Copy, Loader2, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { desktop, NetworkStatus } from '@/lib/desktop';
import { configureNetwork, DEFAULT_NETWORK_PORT, loadNetworkSettings } from '@/lib/networkPublisher';

const SCREENS = [
  { path: '#/projection', label: 'Projector' },
  { path: '#/confidence', label: 'Confidence monitor' },
  { path: '#/lower-third', label: 'Lower third (green)' },
  { path: '#/lower-third?transparent=1', label: 'Lower third (see-through, for OBS / vMix)' },
];

/** Settings → Network: show the screens on other devices over the church network. */
export function NetworkOutputSettings() {
  const [settings, setSettings] = useState(loadNetworkSettings);
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    desktop?.network.status().then(setStatus).catch(() => {});
    const timer = setInterval(() => desktop?.network.status().then(setStatus).catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, []);

  if (!desktop) {
    return (
      <Alert>
        <Wifi className="h-4 w-4" />
        <AlertDescription>Showing the screens on other devices needs the Voice Verses desktop app.</AlertDescription>
      </Alert>
    );
  }

  const apply = async (next: typeof settings) => {
    setSettings(next);
    setBusy(true);
    setError(null);
    try {
      setStatus(await configureNetwork(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success('Address copied'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5" /> Screens on the network
        </CardTitle>
        <CardDescription>
          Show the projector, confidence monitor or lower third on any device on the church network: another computer, a
          smart TV's browser, a tablet on stage, or OBS / vMix as a browser source. Open the address in a web browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="network-enabled" className="font-medium">
            Share the screens on the network
          </Label>
          <div className="flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <Switch id="network-enabled" checked={settings.enabled} onCheckedChange={(enabled) => apply({ ...settings, enabled })} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="network-port" className="text-sm text-muted-foreground">
            Port
          </Label>
          <Input
            id="network-port"
            className="w-28"
            inputMode="numeric"
            value={settings.port}
            onChange={(e) => setSettings({ ...settings, port: Number(e.target.value.replace(/\D/g, '')) || DEFAULT_NETWORK_PORT })}
            onBlur={() => settings.enabled && apply(settings)}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status?.running && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {status.viewers === 0 ? 'No devices are showing a screen yet.' : `${status.viewers} device${status.viewers > 1 ? 's are' : ' is'} showing a screen.`}
            </p>
            {status.urls.length === 0 && <p className="text-sm text-amber-500">This computer is not connected to a network.</p>}
            {status.urls.map((base) => (
              <div key={base} className="rounded-lg border divide-y">
                {SCREENS.map((screen) => {
                  const url = `${base}${screen.path}`;
                  return (
                    <div key={screen.path} className="flex items-center gap-3 p-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{screen.label}</div>
                        <code className="text-xs text-muted-foreground break-all">{url}</code>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copy(url)} title="Copy the address">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              If macOS or Windows asks whether Voice Verses may accept incoming network connections, choose Allow. In OBS,
              add a Browser source with the see-through lower-third address at 1920×1080.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
