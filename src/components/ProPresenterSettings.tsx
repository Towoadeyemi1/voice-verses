import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Loader2, MonitorPlay, Send } from 'lucide-react';
import { toast } from 'sonner';
import { desktop, ProPresenterStatus, ProPresenterThemeSlide } from '@/lib/desktop';
import {
  connectionOf,
  loadProPresenterSettings,
  ProPresenterSettings as Settings,
  saveProPresenterSettings,
} from '@/lib/proPresenter';
import { DOWNLOAD_PAGE_URL } from '@/lib/releases';
import { loadAppMode, saveAppMode } from '@/lib/appMode';

const TEST_VERSE = {
  reference: 'John 3:16',
  text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function ProPresenterSettings() {
  const [settings, setSettings] = useState<Settings>(loadProPresenterSettings);
  const [status, setStatus] = useState<ProPresenterStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [themes, setThemes] = useState<ProPresenterThemeSlide[]>([]);
  const [theme, setTheme] = useState<string>('');

  const update = (changes: Partial<Settings>) => {
    const next = { ...settings, ...changes };
    setSettings(next);
    saveProPresenterSettings(next);
    if ('host' in changes || 'port' in changes) {
      setStatus(null);
      setError(null);
    }
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const check = () =>
    run(async () => {
      setError(null);
      const result = await desktop!.proPresenter.status(connectionOf(settings));
      setStatus(result);
      if (!result.hasMessage) {
        const slides = await desktop!.proPresenter.themes(connectionOf(settings));
        setThemes(slides);
        setTheme(slides[0]?.id.uuid ?? '');
      }
    });

  // Check once on open when already set up
  useEffect(() => {
    if (desktop && settings.enabled) check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMessage = () =>
    run(async () => {
      const slide = themes.find((t) => t.id.uuid === theme);
      if (!slide) throw new Error('Choose a theme for the verse.');
      setStatus(await desktop!.proPresenter.createMessage(connectionOf(settings), slide.id));
      toast.success('Created the "Voice Verses" message in ProPresenter');
    });

  const sendTest = () =>
    run(async () => {
      await desktop!.proPresenter.show(connectionOf(settings), { ...TEST_VERSE, stage: settings.stage });
      toast.success('Sent John 3:16 to ProPresenter');
    });

  const clearTest = () =>
    run(async () => {
      await desktop!.proPresenter.clear(connectionOf(settings), { stage: settings.stage });
    });

  if (!desktop) {
    return (
      <Alert>
        <MonitorPlay className="h-4 w-4" />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>Sending verses to ProPresenter needs the Voice Verses desktop app.</span>
          <Button size="sm" variant="outline" onClick={() => window.open(DOWNLOAD_PAGE_URL, '_blank')}>
            Download
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5" /> ProPresenter
          </CardTitle>
          <CardDescription>
            Show the verses Voice Verses finds on your ProPresenter screens, in your own ProPresenter theme. Works with
            ProPresenter 7.9 and later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pp-enabled" className="font-medium">
              Send verses to ProPresenter
            </Label>
            <Switch id="pp-enabled" checked={settings.enabled} onCheckedChange={(enabled) => update({ enabled })} />
          </div>

          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>
              In ProPresenter, open <strong>Settings → Network</strong> and turn on <strong>Enable Network</strong>.
            </li>
            <li>
              Enter the port shown there. If ProPresenter runs on a different computer from Voice Verses, also enter
              the IP address shown there (both computers must be on the same network).
            </li>
          </ol>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pp-host">Computer</Label>
              <Input
                id="pp-host"
                value={settings.host}
                placeholder="127.0.0.1 (this computer)"
                onChange={(e) => update({ host: e.target.value.trim() })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-port">Port</Label>
              <Input
                id="pp-port"
                inputMode="numeric"
                value={settings.port || ''}
                onChange={(e) => update({ port: Number(e.target.value.replace(/\D/g, '')) })}
              />
            </div>
          </div>

          <Button onClick={check} disabled={busy} variant="outline" className="w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Test connection
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status && (
            <div className="rounded-lg border p-3 text-sm space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Connected to {status.version || 'ProPresenter'}
                {status.name ? ` on “${status.name}”` : ''}
              </div>

              {!status.hasMessage && (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Voice Verses shows verses through a ProPresenter message called “Voice Verses”. Choose the theme
                    it should use, then create it:
                  </p>
                  {themes.length > 0 ? (
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger>
                        <SelectValue placeholder="Theme" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {themes.map((t) => (
                          <SelectItem key={t.id.uuid} value={t.id.uuid}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-muted-foreground">No themes found in ProPresenter.</p>
                  )}
                  <Button onClick={createMessage} disabled={busy || !theme} className="w-full">
                    Create the “Voice Verses” message
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Or create it yourself in ProPresenter's Messages with the text <code>{'{Verse} — {Reference}'}</code>.
                  </p>
                </div>
              )}

              {status.hasMessage && !status.messageReady && (
                <p className="text-amber-500">
                  The “Voice Verses” message needs both a <code>{'{Verse}'}</code> and a <code>{'{Reference}'}</code>{' '}
                  token. Edit it in ProPresenter's Messages.
                </p>
              )}

              {status.messageReady && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={sendTest} disabled={busy} className="gap-2">
                    <Send className="w-3.5 h-3.5" /> Send a test verse
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearTest} disabled={busy}>
                    Clear it
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="pp-stage" className="font-medium">
                Also show on stage screens
              </Label>
              <p className="text-xs text-muted-foreground">Sends the verse to ProPresenter's stage message too.</p>
            </div>
            <Switch id="pp-stage" checked={settings.stage} onCheckedChange={(stage) => update({ stage })} />
          </div>
        </CardContent>
      </Card>

      {loadAppMode() === 'screens' && (
        <div className="rounded-lg border p-4 text-sm space-y-2">
          <p className="font-medium">Optional: companion screen</p>
          <p className="text-muted-foreground">
            For a second operator whose only job is sending verses to ProPresenter, Voice Verses can open on a
            stripped-down screen: listen, approve each verse, previous/next, clear. Everything else stays available.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              update({ enabled: true });
              saveAppMode('propresenter');
            }}
          >
            Open the companion screen
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it looks in ProPresenter</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Verses appear on ProPresenter's <strong>Messages</strong> layer, on the screens your Look sends messages to
            (for example the audience screen and the livestream).
          </p>
          <p>
            To change the wording, theme, size or position, edit the “Voice Verses” message in ProPresenter. Keep the{' '}
            <code>{'{Verse}'}</code> and <code>{'{Reference}'}</code> tokens. Set the theme's text box to shrink
            text to fit, so long verses fit.
          </p>
          <p>
            Remove a verse with ProPresenter's clear Messages button, or with <strong>Clear to Logo</strong> in Voice
            Verses.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
