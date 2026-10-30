import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Loader2, Mic, MicOff, Send, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualSearch } from '@/components/ManualSearch';
import { VerseText } from '@/components/VerseText';
import { ProPresenterSettings } from '@/components/ProPresenterSettings';
import { MicrophoneSettings } from '@/components/MicrophoneSettings';
import { SpeechEngineSettings } from '@/components/SpeechEngineSettings';
import { AiAssistantSettings } from '@/components/AiAssistantSettings';
import { BibleVerse } from '@/types/bible';
import { BibleParser } from '@/lib/bibleParser';
import { desktop } from '@/lib/desktop';
import { hasSecret } from '@/lib/secrets';
import { saveAppMode } from '@/lib/appMode';
import { verseReference } from '@/lib/verseText';
import {
  clearProPresenter,
  connectionOf,
  loadProPresenterSettings,
  sendVerseToProPresenter,
} from '@/lib/proPresenter';
import { verseAssistantOptions } from '@/ai/detectionOptions';
import { createSpeechProvider, ISpeechProvider, loadSpeechSettings, VerseDetectionController } from '@/speech';

type Connection =
  | { state: 'checking' }
  | { state: 'ready'; label: string }
  | { state: 'problem'; message: string };

type SettingsTab = 'propresenter' | 'microphone' | 'speech';

const ASK_FIRST_KEY = 'voice-verses-ask-first';
const same = (a: BibleVerse | null, b: BibleVerse | null) =>
  !!a && !!b && a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;

function inputLabel(): string {
  const { audioChannel } = loadSpeechSettings();
  return audioChannel === null || audioChannel === undefined ? 'Microphone' : `Channel ${audioChannel + 1}`;
}

/**
 * The whole app for a church that runs ProPresenter: listen to the preacher,
 * and put each verse heard on ProPresenter's screens. By default the operator
 * approves each verse before it is sent.
 */
const ProPresenterLive = () => {
  const [connection, setConnection] = useState<Connection>({ state: 'checking' });
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const [askFirst, setAskFirst] = useState(() => localStorage.getItem(ASK_FIRST_KEY) !== 'false');
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [heard, setHeard] = useState('');
  const [pending, setPending] = useState<BibleVerse | null>(null);
  const [live, setLive] = useState<BibleVerse | null>(null);
  const [recent, setRecent] = useState<BibleVerse[]>([]);
  const [input, setInput] = useState(inputLabel);

  const provider = useRef<ISpeechProvider | null>(null);
  const controller = useRef<VerseDetectionController | null>(null);
  const askFirstRef = useRef(askFirst);
  const liveRef = useRef<BibleVerse | null>(null);
  askFirstRef.current = askFirst;
  liveRef.current = live;

  const checkConnection = useCallback(async () => {
    const settings = loadProPresenterSettings();
    if (!desktop) return setConnection({ state: 'problem', message: 'Sending to ProPresenter needs the desktop app.' });
    if (!settings.enabled) return setConnection({ state: 'problem', message: 'Sending to ProPresenter is turned off.' });
    setConnection({ state: 'checking' });
    try {
      const status = await desktop.proPresenter.status(connectionOf(settings));
      if (!status.messageReady) {
        setConnection({ state: 'problem', message: 'Connected, but the “Voice Verses” message is not set up yet.' });
      } else {
        setConnection({ state: 'ready', label: status.name || status.version || 'ProPresenter' });
      }
    } catch (error) {
      setConnection({ state: 'problem', message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const send = useCallback(async (verse: BibleVerse) => {
    setPending((p) => (same(p, verse) ? null : p));
    if (!(await sendVerseToProPresenter(verse))) {
      checkConnection();
      return;
    }
    setLive(verse);
    controller.current?.setCurrentVerse(verse);
    setRecent((list) => [verse, ...list.filter((v) => !same(v, verse))].slice(0, 8));
  }, [checkConnection]);

  // Something the preacher said: send it, or hold it for the operator
  const detected = useCallback((verse: BibleVerse, needsApproval = false) => {
    if (same(verse, liveRef.current)) return;
    if (askFirstRef.current || needsApproval) {
      setPending(verse);
      // "Next verse" and reading along stay relative to what is on screen
      controller.current?.setCurrentVerse(liveRef.current);
    } else {
      send(verse);
    }
  }, [send]);

  const step = async (offset: number) => {
    if (!live) return;
    const verse = await BibleParser.getVerse(live.book, live.chapter, live.verse + offset);
    if (verse) send(verse);
  };

  const clear = async () => {
    setPending(null);
    if (await clearProPresenter()) setLive(null);
  };

  const stop = useCallback(() => {
    provider.current?.disconnect();
    provider.current = null;
    controller.current?.reset();
    controller.current = null;
    setListening(false);
    setVolume(0);
    desktop?.setListening(false);
  }, []);

  const start = async () => {
    const settings = loadSpeechSettings();
    if (settings.speechEngine === 'openai' && !(await hasSecret('openai'))) {
      toast.error('Add your OpenAI key first, or choose the Built-in speech engine', {
        action: { label: 'Settings', onClick: () => setSettingsTab('speech') },
      });
      return;
    }
    setStarting(true);
    try {
      const ai = verseAssistantOptions((verse) => detected(verse, true));
      controller.current = new VerseDetectionController({
        onVerseDetected: (verse) => detected(verse),
        onTranscriptUpdate: (text) => setHeard(text),
        ...ai,
        // AI guesses always wait for the operator
        onVerseSuggested: ai.assistant ? (verse) => detected(verse, true) : undefined,
        autoDisplayAiMatches: false,
      });
      controller.current.setCurrentVerse(liveRef.current);
      controller.current.setEngine(settings.speechEngine);
      provider.current = createSpeechProvider(settings, {
        onTranscript: (text, isFinal) => controller.current?.onTranscript(text, isFinal),
        onVolumeUpdate: setVolume,
        onError: (error) => toast.error('Speech recognition problem', { description: error.message }),
      });
      await provider.current.init();
      setListening(true);
      desktop?.setListening(true);
    } catch (error) {
      stop();
      toast.error('Could not start listening', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => stop, [stop]);

  // Enter sends, Escape ignores, arrows step through verses (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [role="dialog"]')) return;
      if (e.key === 'Enter' && pending) send(pending);
      else if (e.key === 'Escape' && pending) setPending(null);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const closeSettings = () => {
    setSettingsTab(null);
    setInput(inputLabel());
    checkConnection();
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}cornerstone-logo.png`} alt="" className="w-10 h-10 object-contain" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">Voice Verses</h1>
            <p className="text-sm text-muted-foreground">Hears the verse, puts it on ProPresenter</p>
          </div>
          <button
            type="button"
            onClick={() => (connection.state === 'ready' ? checkConnection() : setSettingsTab('propresenter'))}
            className={`text-xs rounded-full px-3 py-1.5 border ${
              connection.state === 'ready'
                ? 'border-green-500/50 text-green-500'
                : connection.state === 'checking'
                  ? 'text-muted-foreground'
                  : 'border-amber-500/60 text-amber-500'
            }`}
          >
            {connection.state === 'ready'
              ? `● ProPresenter: ${connection.label}`
              : connection.state === 'checking'
                ? 'Checking ProPresenter…'
                : '● ProPresenter not connected'}
          </button>
          <Button variant="outline" size="icon" onClick={() => setSettingsTab('propresenter')} title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
        </header>

        {connection.state === 'problem' && (
          <Card className="p-4 border-amber-500/50 flex flex-wrap items-center gap-3 justify-between">
            <p className="text-sm">{connection.message}</p>
            <Button size="sm" onClick={() => setSettingsTab('propresenter')}>
              Connect to ProPresenter
            </Button>
          </Card>
        )}

        {/* Listening */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            {listening ? (
              <Button size="lg" variant="destructive" className="flex-1 h-14 text-base" onClick={stop}>
                <MicOff className="w-5 h-5 mr-2" /> Stop listening
              </Button>
            ) : (
              <Button size="lg" className="flex-1 h-14 text-base" onClick={start} disabled={starting}>
                {starting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Mic className="w-5 h-5 mr-2" />}
                {starting ? 'Loading the speech model…' : 'Start listening'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground whitespace-nowrap">{input}</span>
            <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-green-500 transition-[width]" style={{ width: `${listening ? volume : 0}%` }} />
            </div>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setSettingsTab('microphone')}>
              Change
            </Button>
          </div>
          <p className="text-sm text-muted-foreground min-h-5 line-clamp-2" aria-live="polite">
            {listening ? (heard ? `Hearing: “${heard.slice(-160)}”` : 'Listening…') : 'Not listening'}
          </p>
          <div className="flex items-center gap-2">
            <Switch
              id="ask-first"
              checked={askFirst}
              onCheckedChange={(on) => {
                setAskFirst(on);
                localStorage.setItem(ASK_FIRST_KEY, String(on));
              }}
            />
            <Label htmlFor="ask-first" className="text-sm">
              Ask me before sending each verse
            </Label>
          </div>
        </Card>

        {/* Waiting for approval */}
        {pending && (
          <Card className="p-5 border-2 border-amber-500 space-y-3 animate-fade-in">
            <p className="text-xs uppercase tracking-wide text-amber-500 font-semibold">Heard</p>
            <h2 className="text-3xl font-bold">{verseReference(pending)}</h2>
            <p className="text-lg leading-relaxed">
              <VerseText text={pending.text} />
            </p>
            <div className="flex gap-2">
              <Button size="lg" className="flex-1 h-12" onClick={() => send(pending)}>
                <Send className="w-4 h-4 mr-2" /> Send to ProPresenter <kbd className="ml-2 text-xs opacity-70">Enter</kbd>
              </Button>
              <Button size="lg" variant="outline" className="h-12" onClick={() => setPending(null)}>
                Ignore <kbd className="ml-2 text-xs opacity-70">Esc</kbd>
              </Button>
            </div>
          </Card>
        )}

        {/* On screen */}
        <Card className="p-5 space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">On ProPresenter now</p>
          {live ? (
            <>
              <h2 className="text-2xl font-bold text-primary">{verseReference(live)}</h2>
              <p className="leading-relaxed">
                <VerseText text={live.text} />
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Nothing from Voice Verses</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => step(-1)} disabled={!live}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous verse
            </Button>
            <Button variant="outline" onClick={() => step(1)} disabled={!live}>
              Next verse <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" className="ml-auto" onClick={clear}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
        </Card>

        {/* Typing a verse sends it straight away: the operator chose it */}
        <ManualSearch onVerseSelect={(verse) => send(verse)} />

        {recent.length > 0 && (
          <Card className="p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Recent (click to show again)</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((verse) => (
                <Button key={verseReference(verse)} size="sm" variant={same(verse, live) ? 'default' : 'secondary'} onClick={() => send(verse)}>
                  {verseReference(verse)}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Not using ProPresenter for your screens?{' '}
          <button type="button" className="underline" onClick={() => saveAppMode('screens')}>
            Use Voice Verses' own screens and service planning
          </button>
        </p>
      </div>

      <Dialog open={settingsTab !== null} onOpenChange={(open) => !open && closeSettings()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <Tabs value={settingsTab ?? 'propresenter'} onValueChange={(v) => setSettingsTab(v as SettingsTab)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="propresenter">ProPresenter</TabsTrigger>
              <TabsTrigger value="microphone">Microphone</TabsTrigger>
              <TabsTrigger value="speech">Speech &amp; AI</TabsTrigger>
            </TabsList>
            <TabsContent value="propresenter" className="mt-4">
              <ProPresenterSettings />
            </TabsContent>
            <TabsContent value="microphone" className="mt-4">
              <MicrophoneSettings onChange={() => setInput(inputLabel())} />
              {listening && <p className="text-xs text-muted-foreground mt-3">Stop and start listening to use the new input.</p>}
            </TabsContent>
            <TabsContent value="speech" className="mt-4 space-y-6">
              <SpeechEngineSettings />
              <AiAssistantSettings />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProPresenterLive;
