/**
 * Set up your booth (1.19.0, docs/design/training/SetUp.dc.html): Voice Verses
 * finds the preacher's microphone, the screens, ProPresenter and the church's
 * services; the volunteer confirms or changes each. It opens by itself the
 * first time Voice Verses starts on a computer (never for a church that was
 * already using it), and from Settings → Booth check at any time.
 */
import { channelCountOf, isVideoCardInput, listMicrophones, MAX_CHANNELS, openMicrophone } from '@/speech/audioInput';

export type SetupPart = 'sound' | 'screens' | 'propresenter' | 'services';
export const SETUP_PARTS: SetupPart[] = ['sound', 'screens', 'propresenter', 'services'];

export interface BoothSetupState {
  /** Voice Verses started with nothing saved on this computer: a new booth */
  firstRun?: boolean;
  /** When each part was confirmed */
  confirmed: Partial<Record<SetupPart, string>>;
  /** All confirmed and closed */
  finishedAt?: string;
  /** "Finish later": it doesn't open by itself again */
  laterAt?: string;
}

const KEY = 'voice-verses-booth-setup';
const TYPES_KEY = 'voice-verses-church-types';
export const BOOTH_SETUP_CHANGED = 'voice-verses-booth-setup-changed';

export function loadBoothSetup(): BoothSetupState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return saved && typeof saved === 'object' ? { confirmed: {}, ...saved } : { confirmed: {} };
  } catch {
    return { confirmed: {} };
  }
}

export function saveBoothSetup(state: BoothSetupState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full: it still applies until the app closes
  }
  window.dispatchEvent(new Event(BOOTH_SETUP_CHANGED));
}

export const updateBoothSetup = (change: (state: BoothSetupState) => BoothSetupState) => {
  const next = change(loadBoothSetup());
  saveBoothSetup(next);
  return next;
};

/**
 * Called once before the app draws: with nothing at all saved on this computer,
 * this is a new booth, so Set up your booth opens by itself. A church already
 * using Voice Verses has its settings saved and is never interrupted.
 */
export function noteFirstRun(): void {
  try {
    if (localStorage.length === 0) localStorage.setItem(KEY, JSON.stringify({ firstRun: true, confirmed: {} } satisfies BoothSetupState));
  } catch {
    // No storage: nothing to remember either way
  }
}

/** Whether Set up your booth should open by itself now. */
export const opensByItself = (s = loadBoothSetup()) => !!s.firstRun && !s.finishedAt && !s.laterAt;

export const confirmedCount = (s: BoothSetupState) => SETUP_PARTS.filter((p) => s.confirmed[p]).length;

// ---- The church's types of service ---------------------------------------------------------

/** The types of service this church holds, chosen in Set up your booth (empty: not chosen yet). */
export function loadChurchTypes(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(TYPES_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function saveChurchTypes(types: string[]): void {
  try {
    localStorage.setItem(TYPES_KEY, JSON.stringify(types));
  } catch {
    // Storage full
  }
}

/** The church's own types first, in the order given, then the rest as they were. */
export function churchTypesFirst<T>(items: T[], typeOf: (item: T) => string, church = loadChurchTypes()): T[] {
  if (!church.length) return items;
  const rank = (item: T) => {
    const i = church.indexOf(typeOf(item));
    return i < 0 ? church.length : i;
  };
  return items.map((item, i) => ({ item, i })).sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i).map((x) => x.item);
}

// ---- Finding the preacher's microphone -----------------------------------------------------

export interface HeardInput {
  deviceId: string;
  label: string;
  /** Loudest level heard on each channel, 0–1 */
  channels: number[];
}

/** Below this, an input is taken as silent (the meters' scale: -60 dB → 0, 0 dB → 1). */
export const SOUND_LEVEL = 0.15;

/** Listens to one input for a moment and says how loud each of its channels got. */
async function listenTo(device: MediaDeviceInfo, ms: number): Promise<HeardInput> {
  const stream = await openMicrophone({ deviceId: device.deviceId, deviceName: device.label, channel: 0 });
  const context = new AudioContext();
  try {
    if (context.state === 'suspended') await context.resume().catch(() => {});
    const count = Math.min(channelCountOf(stream), MAX_CHANNELS);
    const source = context.createMediaStreamSource(stream);
    const splitter = context.createChannelSplitter(count);
    source.connect(splitter);
    const analysers = Array.from({ length: count }, (_, i) => {
      const a = context.createAnalyser();
      a.fftSize = 1024;
      splitter.connect(a, i);
      return a;
    });
    const peaks = new Array(count).fill(0);
    const buffer = new Float32Array(1024);
    const end = performance.now() + ms;
    while (performance.now() < end) {
      analysers.forEach((a, i) => {
        a.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (const v of buffer) sum += v * v;
        const db = 20 * Math.log10(Math.sqrt(sum / buffer.length) + 1e-9);
        peaks[i] = Math.max(peaks[i], Math.max(0, Math.min(1, (db + 60) / 60)));
      });
      await new Promise((r) => setTimeout(r, 50));
    }
    return { deviceId: device.deviceId, label: device.label, channels: peaks };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    context.close().catch(() => {});
  }
}

export interface SoundFound {
  /** Every input listened to (video cards and virtual devices are skipped: they are silent without a cable's sound) */
  heard: HeardInput[];
  /** The best guess: the loudest channel heard, or null when nothing was heard */
  best: { deviceId: string; label: string; channel: number | null; level: number } | null;
}

/**
 * Listens to every input in turn and picks where the sound is: on a desk feed
 * with many channels, the loudest channel (the preacher, if they are speaking).
 */
export async function findSound(ms = 1500): Promise<SoundFound> {
  const devices = (await listMicrophones()).filter((d) => !isVideoCardInput(d.label));
  const heard: HeardInput[] = [];
  for (const d of devices) {
    try {
      heard.push(await listenTo(d, ms));
    } catch {
      // Busy or unplugged: leave it out
    }
  }
  let best: SoundFound['best'] = null;
  for (const h of heard) {
    h.channels.forEach((level, i) => {
      if (level >= SOUND_LEVEL && (!best || level > best.level)) {
        // One or two channels is a normal microphone input; more is a desk feed, where the channel matters
        best = { deviceId: h.deviceId, label: h.label, channel: h.channels.length > 2 ? i : null, level };
      }
    });
  }
  return { heard, best };
}

// ---- Opening it from elsewhere --------------------------------------------------------------

export const SHOW_BOOTH_SETUP = 'voice-verses-show-booth-setup';
const ASKED_KEY = 'voice-verses-show-booth-setup';

/**
 * Opens (or closes) Set up your booth on the live screen. From another page the
 * live screen isn't there yet, so the wish is kept until it opens.
 */
export function showBoothSetup(open = true): void {
  try {
    if (open) sessionStorage.setItem(ASKED_KEY, '1');
    else sessionStorage.removeItem(ASKED_KEY);
  } catch {
    // No session storage: the event still reaches an open live screen
  }
  window.dispatchEvent(new CustomEvent(SHOW_BOOTH_SETUP, { detail: { open } }));
}

/** Whether something asked for Set up your booth before the live screen opened (asked once). */
export function boothSetupAsked(): boolean {
  try {
    const asked = sessionStorage.getItem(ASKED_KEY) === '1';
    sessionStorage.removeItem(ASKED_KEY);
    return asked;
  } catch {
    return false;
  }
}
