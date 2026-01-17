import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mic, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  loadSpeechSettings, 
  saveSpeechSettings, 
  checkLocalServiceHealth,
  SpeechEngineType,
  LocalEngineType 
} from '@/speech';

export const SpeechEngineSettings = () => {
  const [speechEngine, setSpeechEngine] = useState<SpeechEngineType>('openai');
  const [localEngine, setLocalEngine] = useState<LocalEngineType>('vosk');
  const [localAsrUrl, setLocalAsrUrl] = useState('ws://127.0.0.1:8765');
  const [localStatus, setLocalStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');
  const [availableEngines, setAvailableEngines] = useState<string[]>([]);

  useEffect(() => {
    const settings = loadSpeechSettings();
    setSpeechEngine(settings.speechEngine);
    setLocalEngine(settings.localEngine);
    setLocalAsrUrl(settings.localAsrUrl);
  }, []);

  const handleCheckConnection = async () => {
    setLocalStatus('checking');
    const result = await checkLocalServiceHealth(localAsrUrl);
    
    if (result.ok) {
      setLocalStatus('online');
      setAvailableEngines(result.engines || []);
      toast.success('Local service connected', {
        description: `Available engines: ${result.engines?.join(', ') || 'unknown'}`,
      });
    } else {
      setLocalStatus('offline');
      toast.error('Local service not available', {
        description: result.error || 'Connection failed',
      });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mic className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">Speech Engine</h4>
      </div>

      <div className="space-y-2">
        <Label>Speech Recognition Engine</Label>
        <Select value={speechEngine} onValueChange={(v: SpeechEngineType) => setSpeechEngine(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI (Cloud)</SelectItem>
            <SelectItem value="local">Local (Offline)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {speechEngine === 'openai' 
            ? 'Uses OpenAI Realtime API - requires internet' 
            : 'Uses local speech service - works offline'}
        </p>
      </div>

      {speechEngine === 'local' && (
        <>
          <div className="space-y-2">
            <Label>Local Engine</Label>
            <Select value={localEngine} onValueChange={(v: LocalEngineType) => setLocalEngine(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vosk">Vosk (Recommended)</SelectItem>
                <SelectItem value="sherpa">Sherpa-ONNX</SelectItem>
                <SelectItem value="whisper">Whisper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Local Service URL</Label>
            <div className="flex gap-2">
              <Input
                value={localAsrUrl}
                onChange={(e) => setLocalAsrUrl(e.target.value)}
                placeholder="ws://127.0.0.1:8765"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCheckConnection}
                disabled={localStatus === 'checking'}
              >
                {localStatus === 'checking' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : localStatus === 'online' ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Status: {localStatus === 'online' ? '✅ Connected' : localStatus === 'offline' ? '❌ Not running' : 'Not checked'}
            </p>
          </div>
        </>
      )}

      <Button onClick={handleSave} className="w-full">
        Save Speech Settings
      </Button>
    </div>
  );
};
