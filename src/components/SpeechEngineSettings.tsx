import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Wifi, WifiOff, Loader2, Download, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { 
  loadSpeechSettings, 
  saveSpeechSettings, 
  checkLocalServiceHealth,
  SpeechEngineType,
  LocalEngineType 
} from '@/speech';
import { checkOllamaHealth } from '@/speech/SpeechProviderFactory';
import { WebSpeechProvider } from '@/speech/providers/WebSpeechProvider';
import { OllamaSpeechProvider } from '@/speech/providers/OllamaSpeechProvider';

// GitHub release URLs for cornerstone-speech-releases repository
const GITHUB_RELEASES_URL = 'https://github.com/Towoadeyemi1/cornerstone-speech-releases/releases';
const WINDOWS_INSTALLER_URL = `${GITHUB_RELEASES_URL}/latest/download/CornerstoneSpeechService-Windows.zip`;
const MACOS_INSTALLER_URL = `${GITHUB_RELEASES_URL}/latest/download/CornerstoneSpeechService.dmg`;

export const SpeechEngineSettings = () => {
  const [speechEngine, setSpeechEngine] = useState<SpeechEngineType>('openai');
  const [localEngine, setLocalEngine] = useState<LocalEngineType>('sherpa');
  const [localAsrUrl, setLocalAsrUrl] = useState('ws://127.0.0.1:8765');
  const [localStatus, setLocalStatus] = useState<'unknown' | 'checking' | 'online' | 'offline' | 'error'>('unknown');
  const [localStatusMessage, setLocalStatusMessage] = useState<string>('');
  const [availableEngines, setAvailableEngines] = useState<string[]>([]);
  const [webSpeechSupported, setWebSpeechSupported] = useState(true);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [localLlmApiType, setLocalLlmApiType] = useState<'ollama' | 'openai-compatible'>('ollama');
  const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');
  const [ollamaStatusMessage, setOllamaStatusMessage] = useState<string>('');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  useEffect(() => {
    const settings = loadSpeechSettings();
    setSpeechEngine(settings.speechEngine);
    setLocalEngine(settings.localEngine);
    setLocalAsrUrl(settings.localAsrUrl);
    setOllamaUrl(settings.ollamaUrl || 'http://localhost:11434');
    setOllamaModel(settings.ollamaModel || 'llama3.2');
    setLocalLlmApiType(settings.localLlmApiType || 'ollama');
    
    // Check Web Speech API support
    setWebSpeechSupported(WebSpeechProvider.isSupported());
  }, []);

  const handleCheckConnection = async () => {
    setLocalStatus('checking');
    setLocalStatusMessage('');
    const result = await checkLocalServiceHealth(localAsrUrl);
    
    if (result.ok) {
      setLocalStatus('online');
      setAvailableEngines(result.engines || []);
      setLocalStatusMessage(`Ready • ${result.engines?.join(', ') || 'Vosk'}`);
      toast.success('Local service connected', {
        description: `Available engines: ${result.engines?.join(', ') || 'unknown'}`,
      });
    } else {
      setLocalStatus('offline');
      setLocalStatusMessage(result.error || 'Connection failed');
      toast.error('Local service not available', {
        description: result.error || 'Connection failed',
      });
    }
  };

  const handleEngineChange = (value: SpeechEngineType) => {
    setSpeechEngine(value);
    
    // Auto-check local service when switching to local
    if (value === 'local') {
      handleCheckConnection();
    }
  };

  const handleCheckOllama = async () => {
    setOllamaStatus('checking');
    setOllamaStatusMessage('');
    const result = await checkOllamaHealth(ollamaUrl, ollamaModel, localLlmApiType);
    if (result.ok) {
      setOllamaStatus('online');
      setOllamaModels(result.models || []);
      setOllamaStatusMessage(`Ready — model "${ollamaModel}" available`);
      toast.success('Local AI connected', { description: `Model "${ollamaModel}" is ready` });
    } else {
      setOllamaStatus('offline');
      setOllamaModels(result.models || []);
      setOllamaStatusMessage(result.error || 'Connection failed');
      toast.error('Local AI server not available', { description: result.error });
    }
  };

  const handleSave = () => {
    saveSpeechSettings({
      speechEngine,
      localEngine,
      localAsrUrl,
      ollamaUrl,
      ollamaModel,
      localLlmApiType,
    });
    toast.success('Speech settings saved');
  };

  const handleDownload = (platform: 'windows' | 'macos') => {
    const url = platform === 'windows' ? WINDOWS_INSTALLER_URL : MACOS_INSTALLER_URL;
    window.open(url, '_blank');
  };

  const handleFallback = (engine: SpeechEngineType) => {
    setSpeechEngine(engine);
    handleSave();
    toast.info(`Switched to ${engine === 'webspeech' ? 'Quick' : 'Cloud'} mode`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mic className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">Speech Recognition</h4>
      </div>

      {/* Speech Mode Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Speech Mode</Label>
        <RadioGroup 
          value={speechEngine} 
          onValueChange={(v: SpeechEngineType) => handleEngineChange(v)}
          className="space-y-2"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="local" id="local" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="local" className="cursor-pointer font-medium">
                Local (Offline) — Recommended for Churches
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Uses local speech service. Works without internet. Requires one-time setup.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="webspeech" id="webspeech" className="mt-0.5" disabled={!webSpeechSupported} />
            <div className="flex-1">
              <Label htmlFor="webspeech" className={`cursor-pointer font-medium ${!webSpeechSupported ? 'text-muted-foreground' : ''}`}>
                Quick (Internet required) — Works instantly
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {webSpeechSupported 
                  ? "Uses your browser's built-in speech recognition. No setup required."
                  : "Not supported in this browser. Try Chrome, Edge, or Safari."}
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="openai" id="openai" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="openai" className="cursor-pointer font-medium">
                Cloud (Paid) — OpenAI
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                High accuracy cloud transcription. Requires OpenAI API key and incurs usage costs.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="ollama" id="ollama" className="mt-0.5" disabled={!webSpeechSupported} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="ollama" className={`cursor-pointer font-medium ${!webSpeechSupported ? 'text-muted-foreground' : ''}`}>
                  Local AI — Ollama, LM Studio, Jan &amp; more
                </Label>
                <Brain className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Uses your browser’s mic for audio, then a locally-running LLM to intelligently identify Bible verse references. Fully private — no data leaves your device.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Local Mode Settings */}
      {speechEngine === 'local' && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
          {/* Status Banner */}
          {localStatus === 'offline' && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Local Speech Service not running</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleFallback('webspeech')}>
                    Use Quick Mode
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Local Engine Dropdown */}
          <div className="space-y-2">
            <Label>Local Engine</Label>
            <Select value={localEngine} onValueChange={(v: LocalEngineType) => setLocalEngine(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sherpa">Sherpa-ONNX (Default)</SelectItem>
                <SelectItem value="vosk">Vosk (Low CPU)</SelectItem>
                <SelectItem value="whisper">Whisper (Advanced / Highest accuracy)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Local Service URL */}
          <div className="space-y-2">
            <Label>Local Service URL</Label>
            <div className="flex gap-2">
              <Input
                value={localAsrUrl}
                onChange={(e) => setLocalAsrUrl(e.target.value)}
                placeholder="ws://127.0.0.1:8765"
                className="flex-1"
              />
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
            {localStatus === 'checking' ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : localStatus === 'online' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : localStatus === 'offline' ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : localStatus === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm flex-1">
              {localStatus === 'checking' ? 'Checking connection...' :
               localStatus === 'online' ? `✅ ${localStatusMessage}` :
               localStatus === 'offline' ? `❌ ${localStatusMessage || 'Not running / unreachable'}` :
               localStatus === 'error' ? `⚠️ ${localStatusMessage}` :
               'Not checked'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCheckConnection}
              disabled={localStatus === 'checking'}
            >
              {localStatus === 'checking' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDownload('windows')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download (Windows)
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDownload('macos')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download (macOS)
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.open(GITHUB_RELEASES_URL, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Release Page
            </Button>
          </div>
        </div>
      )}

      {/* Quick Mode Info */}
      {speechEngine === 'webspeech' && (
        <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
          <p className="text-sm text-muted-foreground">
            Uses your browser's built-in speech recognition. Requires internet connection. 
            Accuracy varies by browser and device.
          </p>
          {!webSpeechSupported && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Cloud Mode Info */}
      {speechEngine === 'openai' && (
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Using OpenAI Realtime API for high-accuracy transcription. 
            Requires internet and configured API key. Usage incurs costs.
          </p>
        </div>
      )}

      {/* Local AI (Ollama / LM Studio / Jan / etc.) Settings */}
      {speechEngine === 'ollama' && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">

          {/* Server Type */}
          <div className="space-y-2">
            <Label>Server Type</Label>
            <Select
              value={localLlmApiType}
              onValueChange={(v: 'ollama' | 'openai-compatible') => {
                setLocalLlmApiType(v);
                setOllamaStatus('unknown');
                setOllamaModels([]);
                // Auto-fill default URL for known server types
                if (v === 'ollama') setOllamaUrl('http://localhost:11434');
                if (v === 'openai-compatible') setOllamaUrl('http://localhost:1234');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ollama">Ollama (native)</SelectItem>
                <SelectItem value="openai-compatible">OpenAI-compatible server</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick presets</Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Ollama', url: 'http://localhost:11434', type: 'ollama' as const, href: 'https://ollama.com/download' },
                { label: 'LM Studio', url: 'http://localhost:1234', type: 'openai-compatible' as const, href: 'https://lmstudio.ai' },
                { label: 'Jan', url: 'http://localhost:1337', type: 'openai-compatible' as const, href: 'https://jan.ai' },
                { label: 'Llamafile', url: 'http://localhost:8080', type: 'openai-compatible' as const, href: 'https://github.com/Mozilla-Ocho/llamafile' },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  variant={ollamaUrl === preset.url && localLlmApiType === preset.type ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setOllamaUrl(preset.url);
                    setLocalLlmApiType(preset.type);
                    setOllamaStatus('unknown');
                    setOllamaModels([]);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Setup Instructions — dynamic per server type */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Setup</p>
            {localLlmApiType === 'ollama' ? (
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>
                  Download &amp; install Ollama from{' '}
                  <button type="button" onClick={() => window.open('https://ollama.com/download', '_blank')} className="text-primary underline hover:no-underline">ollama.com/download</button>
                </li>
                <li>In your terminal: <code className="bg-background px-1 rounded font-mono">ollama pull {ollamaModel || 'llama3.2'}</code></li>
                <li>Click <strong>Test Connection</strong> below</li>
              </ol>
            ) : (
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Download &amp; install your LLM server (LM Studio, Jan, Llamafile, etc.)</li>
                <li>Load a model inside the application and start the local server</li>
                <li>Set the URL to match your server’s address and enter the model name exactly</li>
                <li>Click <strong>Test Connection</strong> below</li>
              </ol>
            )}
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label>Server URL</Label>
            <Input
              value={ollamaUrl}
              onChange={(e) => { setOllamaUrl(e.target.value); setOllamaStatus('unknown'); }}
              placeholder={localLlmApiType === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label>Model Name</Label>
            <Input
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="llama3.2"
            />
            <p className="text-xs text-muted-foreground">
              {localLlmApiType === 'ollama'
                ? <>Recommended: <code className="bg-background px-1 rounded font-mono">llama3.2</code>, <code className="bg-background px-1 rounded font-mono">mistral</code>, <code className="bg-background px-1 rounded font-mono">phi3</code></>
                : 'Enter the exact model name shown in your LLM server’s interface.'}
            </p>
            {ollamaModels.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Available on your machine: {ollamaModels.join(', ')}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
            {ollamaStatus === 'checking' ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : ollamaStatus === 'online' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : ollamaStatus === 'offline' ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm flex-1">
              {ollamaStatus === 'checking' ? 'Checking server...' :
               ollamaStatus === 'online' ? `✅ ${ollamaStatusMessage}` :
               ollamaStatus === 'offline' ? `❌ ${ollamaStatusMessage}` :
               'Not checked'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckOllama}
              disabled={ollamaStatus === 'checking'}
            >
              {ollamaStatus === 'checking' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
            {localLlmApiType === 'ollama' && (
              <>
                <Button variant="outline" size="sm" onClick={() => window.open('https://ollama.com/download', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Ollama
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`https://ollama.com/library`, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Browse Models
                </Button>
              </>
            )}
            {localLlmApiType === 'openai-compatible' && (
              <>
                <Button variant="outline" size="sm" onClick={() => window.open('https://lmstudio.ai', '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  LM Studio
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('https://jan.ai', '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Jan
                </Button>
              </>
            )}
          </div>

          {!webSpeechSupported && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Local AI mode requires browser speech capture. Please use Chrome, Edge, or Safari.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        Save Speech Settings
      </Button>
    </div>
  );
};
