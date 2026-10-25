import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { ApiKeySettings } from './ApiKeySettings';
import {
  AiAssistantSettings as Settings,
  AiProviderType,
  DEFAULT_BASE_URLS,
  DEFAULT_MODELS,
  PROVIDER_LABELS,
  isCloudProvider,
  loadAiSettings,
  saveAiSettings,
} from '@/ai/settings';
import { describeConnectionError, listModels } from '@/ai/providers';
import { createVerseAssistant } from '@/ai/verseAssistant';
import { BibleParser } from '@/lib/bibleParser';
import { extractBestReference, normalizeTranscript } from '@/speech';

const SAMPLE = 'Jesus said I am the good shepherd, and the good shepherd lays down his life for the sheep.';

export const AiAssistantSettings = () => {
  const [settings, setSettings] = useState<Settings>(loadAiSettings);
  const [models, setModels] = useState<string[]>([]);
  const [modelsStatus, setModelsStatus] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const [testText, setTestText] = useState(SAMPLE);
  const [testResult, setTestResult] = useState<{ loading: boolean; text?: string; error?: boolean }>({ loading: false });

  const update = (changes: Partial<Settings>) => {
    const next = { ...settings, ...changes };
    setSettings(next);
    saveAiSettings(next);
  };

  const changeProvider = (provider: AiProviderType) => {
    update({ provider, model: DEFAULT_MODELS[provider], baseUrl: DEFAULT_BASE_URLS[provider] });
    setModels([]);
    setTestResult({ loading: false });
  };

  const refreshModels = async () => {
    setModelsStatus({ loading: true });
    try {
      setModels(await listModels(settings));
      setModelsStatus({ loading: false });
    } catch (error) {
      setModels([]);
      setModelsStatus({ loading: false, error: describeConnectionError(settings.provider, settings.baseUrl, error) });
    }
  };

  useEffect(() => {
    if (settings.enabled) refreshModels();
    // Re-list when the place we list from changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled, settings.provider, settings.baseUrl]);

  const runTest = async () => {
    setTestResult({ loading: true });
    try {
      const match = await createVerseAssistant({ ...settings, trigger: 'every' }).identify(testText, []);
      const reference = match && extractBestReference(normalizeTranscript(match.reference));
      const verse = reference && (await BibleParser.getVerse(reference.book, reference.chapter, reference.startVerse));
      setTestResult({
        loading: false,
        text: verse
          ? `${verse.book} ${verse.chapter}:${verse.verse} (${match!.confidence} confidence) — “${verse.text}”`
          : match
            ? `The model answered "${match.reference}", which isn't a verse in the Bible, so it would be ignored.`
            : 'No specific verse identified.',
      });
    } catch (error) {
      setTestResult({ loading: false, error: true, text: describeConnectionError(settings.provider, settings.baseUrl, error) });
    }
  };

  const local = !isCloudProvider(settings.provider);

  return (
    <div className="space-y-4 p-4 rounded-lg border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" /> AI verse assistant (optional)
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Recognises passages that are quoted or described instead of named, like “the verse about the Good
            Shepherd”. Works with any speech engine. Named references such as “John 3:16” never need AI.
          </p>
        </div>
        <Switch checked={settings.enabled} onCheckedChange={(enabled) => update({ enabled })} aria-label="Enable AI verse assistant" />
      </div>

      {settings.enabled && (
        <>
          <div className="space-y-2">
            <Label>AI provider</Label>
            <Select value={settings.provider} onValueChange={(v) => changeProvider(v as AiProviderType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABELS) as AiProviderType[]).map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {PROVIDER_LABELS[provider]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCloudProvider(settings.provider) ? (
            <ApiKeySettings
              secret={settings.provider}
              description={`Each sentence that sounds like scripture is sent to ${settings.provider === 'anthropic' ? 'Claude' : 'OpenAI'} and billed to your account.`}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ai-base-url">Server address</Label>
              <Input
                id="ai-base-url"
                value={settings.baseUrl}
                onChange={(e) => update({ baseUrl: e.target.value })}
                placeholder={DEFAULT_BASE_URLS[settings.provider]}
              />
              <p className="text-xs text-muted-foreground">
                {settings.provider === 'ollama' ? (
                  <>
                    Free and private: runs on this computer. Install from{' '}
                    <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      ollama.com
                    </a>
                    , then download a model, e.g. <code>ollama pull llama3.2</code>.
                  </>
                ) : (
                  'Any server with an OpenAI-compatible API, such as LM Studio (port 1234) or Jan (port 1337).'
                )}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-model">Model</Label>
              <Button variant="ghost" size="sm" onClick={refreshModels} disabled={modelsStatus.loading}>
                {modelsStatus.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span className="ml-1">{local ? 'Find installed models' : 'Refresh list'}</span>
              </Button>
            </div>
            <Input
              id="ai-model"
              list="ai-model-options"
              value={settings.model}
              onChange={(e) => update({ model: e.target.value })}
              placeholder="Choose or type a model name"
            />
            <datalist id="ai-model-options">
              {models.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
            {modelsStatus.error ? (
              <p className="text-xs text-destructive">{modelsStatus.error}</p>
            ) : (
              models.length > 0 && <p className="text-xs text-muted-foreground">{models.length} models available.</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Ask about every sentence</Label>
                <p className="text-xs text-muted-foreground">
                  Off: only sentences that mention scripture, Jesus, God, a psalm and so on (fewer requests).
                </p>
              </div>
              <Switch
                checked={settings.trigger === 'every'}
                onCheckedChange={(every) => update({ trigger: every ? 'every' : 'cues' })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Show confident matches automatically</Label>
                <p className="text-xs text-muted-foreground">
                  Off: AI matches appear as a suggestion for the operator to show or dismiss.
                </p>
              </div>
              <Switch checked={settings.autoDisplay} onCheckedChange={(autoDisplay) => update({ autoDisplay })} />
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="ai-test">Try it</Label>
            <div className="flex gap-2">
              <Input id="ai-test" value={testText} onChange={(e) => setTestText(e.target.value)} />
              <Button variant="outline" onClick={runTest} disabled={testResult.loading || !testText.trim()}>
                {testResult.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </Button>
            </div>
            {testResult.text && (
              <p className={`text-sm ${testResult.error ? 'text-destructive' : 'text-muted-foreground'}`}>{testResult.text}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
