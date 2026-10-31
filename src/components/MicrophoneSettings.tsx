import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { loadSpeechSettings, saveSpeechSettings } from '@/speech';
import { channelCountOf, listMicrophones, MAX_CHANNELS, openMicrophone } from '@/speech/audioInput';

/**
 * Choosing what Voice Verses listens to: a microphone, or one channel of a
 * multichannel input such as a sound-desk USB feed. Live meters show which
 * channel moves when the preacher speaks.
 */
export function MicrophoneSettings({ onChange }: { onChange?: () => void }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>(() => loadSpeechSettings().audioDevice || 'default');
  const [channel, setChannel] = useState<number | null>(() => loadSpeechSettings().audioChannel ?? null);
  const [levels, setLevels] = useState<number[] | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopMeters = useRef<(() => void) | null>(null);

  useEffect(() => {
    listMicrophones().then(setDevices).catch(() => setDevices([]));
    return () => stopMeters.current?.();
  }, []);

  const save = (next: { deviceId?: string; channel?: number | null }) => {
    const d = next.deviceId ?? deviceId;
    const c = next.channel !== undefined ? next.channel : channel;
    setDeviceId(d);
    setChannel(c);
    saveSpeechSettings({ audioDevice: d, audioChannel: c });
    onChange?.();
  };

  const showChannels = async (id = deviceId) => {
    stopMeters.current?.();
    setError(null);
    setOpening(true);
    try {
      const stream = await openMicrophone({ deviceId: id, channel: 0 });
      const count = Math.min(channelCountOf(stream), MAX_CHANNELS);
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const splitter = context.createChannelSplitter(count);
      source.connect(splitter);
      const analysers = Array.from({ length: count }, (_, i) => {
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        splitter.connect(analyser, i);
        return analyser;
      });
      const buffer = new Float32Array(1024);
      let frame = 0;
      const tick = () => {
        setLevels(
          analysers.map((a) => {
            a.getFloatTimeDomainData(buffer);
            let sum = 0;
            for (const v of buffer) sum += v * v;
            // Roughly -60 dB → 0, 0 dB → 1
            const db = 20 * Math.log10(Math.sqrt(sum / buffer.length) + 1e-9);
            return Math.max(0, Math.min(1, (db + 60) / 60));
          }),
        );
        frame = requestAnimationFrame(tick);
      };
      tick();
      stopMeters.current = () => {
        cancelAnimationFrame(frame);
        stream.getTracks().forEach((t) => t.stop());
        context.close().catch(() => {});
        stopMeters.current = null;
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this input');
      setLevels(null);
    } finally {
      setOpening(false);
    }
  };

  const hideChannels = () => {
    stopMeters.current?.();
    setLevels(null);
  };

  const deviceName = (id: string) => devices.find((d) => d.deviceId === id)?.label || 'Default input';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mic-device">Input</Label>
        <Select
          value={deviceId}
          onValueChange={(id) => {
            save({ deviceId: id, channel: null });
            if (levels) showChannels(id);
          }}
        >
          <SelectTrigger id="mic-device">
            <SelectValue placeholder="Choose the input" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default input</SelectItem>
            {devices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label || `Input ${d.deviceId.slice(0, 8)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Channel</Label>
        <p className="text-sm">
          {channel === null ? 'Normal microphone input' : `Channel ${channel + 1} of ${deviceName(deviceId)}`}
        </p>
        <p className="text-xs text-muted-foreground">
          Is the sound desk connected over USB, with many channels? Pick the preacher's (pulpit) channel so Voice Verses
          hears only the preacher. Your recording software can keep using the same input.
        </p>
        {levels ? (
          <div className="space-y-2">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {levels.map((level, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => save({ channel: i })}
                  className={`rounded-md border p-1.5 text-xs text-left transition-colors ${
                    channel === i ? 'border-primary bg-primary/15' : 'hover:bg-accent'
                  }`}
                  title={`Use channel ${i + 1}`}
                >
                  <div className="font-medium">Ch {i + 1}</div>
                  <div className="mt-1 h-1.5 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${Math.round(level * 100)}%` }} />
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {levels.length === 1
                ? 'This input has one channel, so the normal input is the right choice.'
                : 'Click the channel whose meter moves when the preacher speaks.'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => save({ channel: null })}>
                Use the normal input instead
              </Button>
              <Button size="sm" variant="ghost" onClick={hideChannels}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => showChannels()} disabled={opening}>
            {opening && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Show the channels
          </Button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
