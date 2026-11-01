import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadSpeechSettings, saveSpeechSettings } from '@/speech';
import { channelCountOf, explainMicrophoneError, listMicrophones, MAX_CHANNELS, openMicrophone } from '@/speech/audioInput';
import { desktop } from '@/lib/desktop';

const NOT_ALLOWED = new Set(['denied', 'restricted']);

/**
 * Choosing what Voice Verses listens to: a microphone, or one channel of a
 * multichannel input such as a sound-desk USB feed. A sound check runs while
 * this is open: every channel's meter moves, so the preacher's channel is easy
 * to find, and it is plain when no sound arrives at all.
 */
export function MicrophoneSettings({ onChange }: { onChange?: () => void }) {
  const saved = loadSpeechSettings();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>(saved.audioDevice || 'default');
  const [deviceName, setDeviceName] = useState<string | null>(saved.audioDeviceName ?? null);
  const [channel, setChannel] = useState<number | null>(saved.audioChannel ?? null);
  const [levels, setLevels] = useState<number[] | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<string>('granted');
  const stopMeters = useRef<(() => void) | null>(null);
  /** When sound last came in on what Voice Verses listens to (so the message doesn't flicker between words) */
  const lastSound = useRef(0);
  const listenedChannel = useRef<number | null>(channel);
  listenedChannel.current = channel;

  const checkAccess = async () => {
    const status = (await desktop?.microphone?.status().catch(() => 'unknown')) ?? 'granted';
    setAccess(status);
    return status;
  };

  const refresh = async () => {
    await checkAccess();
    const list = await listMicrophones().catch(() => [] as MediaDeviceInfo[]);
    setDevices(list);
    // The same input with a new id (after an update or replugging): find it by its name
    const current = loadSpeechSettings();
    if (current.audioDevice && current.audioDevice !== 'default' && !list.some((d) => d.deviceId === current.audioDevice)) {
      const byName = current.audioDeviceName ? list.find((d) => d.label === current.audioDeviceName) : undefined;
      if (byName) {
        setDeviceId(byName.deviceId);
        saveSpeechSettings({ audioDevice: byName.deviceId });
      }
    }
    return list;
  };

  useEffect(() => {
    refresh().then(() => showChannels(loadSpeechSettings().audioDevice || 'default'));
    return () => stopMeters.current?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (next: { deviceId?: string; channel?: number | null }) => {
    const d = next.deviceId ?? deviceId;
    const c = next.channel !== undefined ? next.channel : channel;
    const name = d === 'default' ? null : devices.find((x) => x.deviceId === d)?.label || deviceName;
    setDeviceId(d);
    setDeviceName(name);
    setChannel(c);
    saveSpeechSettings({ audioDevice: d, audioDeviceName: name, audioChannel: c });
    onChange?.();
  };

  const showChannels = async (id = deviceId) => {
    stopMeters.current?.();
    setError(null);
    setOpening(true);
    try {
      const stream = await openMicrophone({ deviceId: id, deviceName, channel: 0 });
      const count = Math.min(channelCountOf(stream), MAX_CHANNELS);
      const context = new AudioContext();
      if (context.state === 'suspended') await context.resume().catch(() => {});
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
        setLevels(() => {
          const next = analysers.map((a) => {
            a.getFloatTimeDomainData(buffer);
            let sum = 0;
            for (const v of buffer) sum += v * v;
            // Roughly -60 dB → 0, 0 dB → 1
            const db = 20 * Math.log10(Math.sqrt(sum / buffer.length) + 1e-9);
            return Math.max(0, Math.min(1, (db + 60) / 60));
          });
          const c = listenedChannel.current;
          const level = c === null ? Math.max(...next.slice(0, 2)) : next[c] ?? 0;
          if (level > 0.05) lastSound.current = performance.now();
          return next;
        });
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
      setError(explainMicrophoneError(e));
      setLevels(null);
      await checkAccess();
    } finally {
      setOpening(false);
    }
  };

  const fixAccess = async () => {
    const allowed = await desktop?.microphone?.ask().catch(() => false);
    if (!allowed) await desktop?.microphone?.openSettings().catch(() => {});
    await refresh();
    showChannels();
  };

  const known = deviceId === 'default' || devices.some((d) => d.deviceId === deviceId);
  const deviceLabel = (id: string) => devices.find((d) => d.deviceId === id)?.label || (id === 'default' ? 'Default input' : deviceName || 'The chosen input');
  const heard = levels ? (channel === null ? Math.max(...levels.slice(0, 2)) : levels[channel] ?? 0) : 0;

  return (
    <div className="space-y-5">
      {NOT_ALLOWED.has(access) && (
        <div className="rounded-xl bg-destructive/15 p-4 space-y-2.5" role="alert">
          <p className="m-0 text-[15px] font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            The computer is not letting Voice Verses use the microphone
          </p>
          <p className="m-0 text-sm text-muted-foreground">
            This can happen after an update. Open the microphone settings and switch Voice Verses on. If it is already on, switch it
            off and on again, then come back here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={fixAccess}>Open microphone settings</Button>
            <Button size="sm" variant="ghost" onClick={() => refresh().then(() => showChannels())}>
              <RefreshCw className="w-4 h-4" />
              Check again
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="mic-device">Input</Label>
        <Select
          value={deviceId}
          onValueChange={(id) => {
            save({ deviceId: id, channel: null });
            showChannels(id);
          }}
        >
          <SelectTrigger id="mic-device" aria-label="Input to listen to">
            <SelectValue placeholder="Choose the input" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default input</SelectItem>
            {devices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label || `Input ${d.deviceId.slice(0, 8)}`}
              </SelectItem>
            ))}
            {!known && <SelectItem value={deviceId}>{deviceName || 'The chosen input'} (not connected now)</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Sound check: is anything arriving on what Voice Verses listens to? */}
      <div className="rounded-xl bg-muted/50 p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-sm font-semibold">
            Sound check: {channel === null ? deviceLabel(deviceId) : `channel ${channel + 1} of ${deviceLabel(deviceId)}`}
          </p>
          {opening && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
        <div className="h-3 rounded-full bg-background overflow-hidden" aria-label="Sound level">
          <div className="h-full rounded-full bg-[hsl(var(--next))] transition-[width] duration-75" style={{ width: `${Math.round(heard * 100)}%` }} />
        </div>
        <p className="m-0 text-[13px] text-muted-foreground">
          {error
            ? error
            : !levels
              ? 'Opening the input…'
              : performance.now() - lastSound.current < 2500
                ? 'Sound is coming in. Speak into the microphone and the bar moves.'
                : 'No sound yet. Speak into the microphone; if the bar does not move, check the input, the channel and the cable.'}
        </p>
        {error && (
          <Button size="sm" variant="outline" onClick={() => showChannels()}>
            Try again
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label>Channel</Label>
        <p className="m-0 text-sm">{channel === null ? 'The normal microphone input' : `Channel ${channel + 1} only`}</p>
        <p className="m-0 text-[13px] text-muted-foreground">
          Is the sound desk connected over USB, with many channels? Click the preacher's channel, the one whose meter moves when
          they speak, so Voice Verses hears only the preacher. Your recording software can keep using the same input.
        </p>
        {levels && (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5" role="radiogroup" aria-label="Channel">
              {levels.map((level, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={channel === i}
                  onClick={() => save({ channel: i })}
                  className={`min-h-[44px] rounded-lg p-2 text-[13px] text-left transition ${channel === i ? 'bg-card ring-2 ring-foreground' : 'bg-muted/60 hover:bg-muted'}`}
                  title={`Listen to channel ${i + 1} only`}
                >
                  <div className="font-semibold">Ch {i + 1}</div>
                  <div className="mt-1 h-1.5 rounded bg-background overflow-hidden">
                    <div className="h-full bg-[hsl(var(--next))]" style={{ width: `${Math.round(level * 100)}%` }} />
                  </div>
                </button>
              ))}
            </div>
            <p className="m-0 text-[13px] text-muted-foreground">
              This input gives Voice Verses {levels.length} {levels.length === 1 ? 'channel' : 'channels'}.
              {levels.length <= 2 &&
                ' If your desk sends more than that, the computer is only passing the first ones on: in Logic or Audio MIDI Setup, send the preacher’s channel to one of these, or to an output that comes back in here.'}
            </p>
            {channel !== null && (
              <Button size="sm" variant="outline" onClick={() => save({ channel: null })}>
                Use the normal input instead
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
