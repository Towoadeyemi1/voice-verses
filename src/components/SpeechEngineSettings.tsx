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
import { Mic, Wifi, WifiOff, Loader2, Download, ExternalLink, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  loadSpeechSettings, 
  saveSpeechSettings, 
  checkLocalServiceHealth,
  SpeechEngineType,
  LocalEngineType 
} from '@/speech';
import { WebSpeechProvider } from '@/speech/providers/WebSpeechProvider';

// GitHub release URLs - update after first release
const GITHUB_RELEASES_URL = 'https://github.com/cornerstone-church/cornerstone-bible/releases/latest';
const WINDOWS_INSTALLER_URL = `${GITHUB_RELEASES_URL}/download/CornerstoneSpeechServiceSetup.exe`;
const MACOS_INSTALLER_URL = `${GITHUB_RELEASES_URL}/download/CornerstoneSpeechService.dmg`;

export const SpeechEngineSettings = () => {
  const [speechEngine, setSpeechEngine] = useState<SpeechEngineType>('openai');
  const [localEngine, setLocalEngine] = useState<LocalEngineType>('sherpa');
  const [localAsrUrl, setLocalAsrUrl] = useState('ws://127.0.0.1:8765');
  const [localStatus, setLocalStatus] = useState<'unknown' | 'checking' | 'online' | 'offline' | 'error'>('unknown');
  const [localStatusMessage, setLocalStatusMessage] = useState<string>('');
  const [availableEngines, setAvailableEngines] = useState<string[]>([]);
  const [webSpeechSupported, setWebSpeechSupported] = useState(true);

  useEffect(() => {
    const settings = loadSpeechSettings();
    setSpeechEngine(settings.speechEngine);
    setLocalEngine(settings.localEngine);
    setLocalAsrUrl(settings.localAsrUrl);
    
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

  const handleSave = () => {
    saveSpeechSettings({
      speechEngine,
      localEngine,
      localAsrUrl,
    });
    toast.success('Speech settings saved');
  };

  const handleDownload = (platform: 'windows' | 'macos') => {
    // For now, open releases page. Update to direct downloads after first release
    window.open(GITHUB_RELEASES_URL, '_blank');
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

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        Save Speech Settings
      </Button>
    </div>
  );
};
