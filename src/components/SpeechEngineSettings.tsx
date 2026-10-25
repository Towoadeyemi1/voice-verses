import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Download, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { loadSpeechSettings, saveSpeechSettings, SpeechEngineType } from '@/speech';
import { getDefaultSpeechEngine } from '@/speech/SpeechProviderFactory';
import { desktop, isDesktop } from '@/lib/desktop';
import { DOWNLOAD_PAGE_URL } from '@/lib/releases';
import { ApiKeySettings } from './ApiKeySettings';
import { RecordingTest } from './RecordingTest';
import { WebSpeechProvider } from '@/speech/providers/WebSpeechProvider';

interface EngineOption {
  value: SpeechEngineType;
  title: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
}

export const SpeechEngineSettings = () => {
  const [speechEngine, setSpeechEngine] = useState<SpeechEngineType>(getDefaultSpeechEngine);
  const [builtInReady, setBuiltInReady] = useState<boolean | null>(null);

  useEffect(() => {
    setSpeechEngine(loadSpeechSettings().speechEngine);
    desktop?.speech.isAvailable().then(setBuiltInReady).catch(() => setBuiltInReady(false));
  }, []);

  const webSpeechSupported = WebSpeechProvider.isSupported();
  const options: EngineOption[] = [
    {
      value: 'builtin',
      title: 'Built-in (offline) — Recommended',
      description: 'Runs on this computer. Works without internet, free and private. Desktop app only.',
      available: isDesktop,
      unavailableReason: 'Available in the Voice Verses desktop app.',
    },
    {
      value: 'webspeech',
      title: 'Browser (internet required)',
      description: "Uses the browser's built-in speech recognition. Free, no setup. Audio is processed by the browser maker (e.g. Google for Chrome).",
      available: webSpeechSupported,
      unavailableReason: isDesktop
        ? 'Not available in the desktop app; use Built-in instead.'
        : 'Not supported in this browser. Try Chrome or Edge.',
    },
    {
      value: 'openai',
      title: 'OpenAI (internet required, paid)',
      description: 'Cloud transcription billed to your OpenAI account.',
      available: true,
    },
  ];

  const handleSave = () => {
    saveSpeechSettings({ speechEngine });
    toast.success('Speech settings saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mic className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">Speech Recognition</h4>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Speech engine</Label>
        <RadioGroup value={speechEngine} onValueChange={(v) => setSpeechEngine(v as SpeechEngineType)} className="space-y-2">
          {options.map((option) => (
            <div key={option.value} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <RadioGroupItem value={option.value} id={`engine-${option.value}`} className="mt-0.5" disabled={!option.available} />
              <div className="flex-1">
                <Label
                  htmlFor={`engine-${option.value}`}
                  className={`cursor-pointer font-medium ${option.available ? '' : 'text-muted-foreground'}`}
                >
                  {option.title}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {option.available ? option.description : option.unavailableReason}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {!isDesktop && (
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>For offline, free speech recognition, install the desktop app.</span>
            <Button size="sm" variant="outline" onClick={() => window.open(DOWNLOAD_PAGE_URL, '_blank')}>
              Download
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {speechEngine === 'builtin' && isDesktop && (
        <div className="p-4 rounded-lg border bg-muted/30 text-sm flex items-center gap-2">
          {builtInReady === false ? (
            <>
              <AlertTriangle className="w-4 h-4 text-destructive" />
              The speech model is missing from this installation. Reinstall Voice Verses.
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              English speech model (NVIDIA Parakeet) installed. The first start takes a few seconds while it loads.
            </>
          )}
        </div>
      )}

      {speechEngine === 'openai' && (
        <ApiKeySettings secret="openai" description="High-accuracy transcription billed to your OpenAI account." />
      )}

      <Button onClick={handleSave} className="w-full">
        Save Speech Settings
      </Button>

      {isDesktop && <RecordingTest />}
    </div>
  );
};
