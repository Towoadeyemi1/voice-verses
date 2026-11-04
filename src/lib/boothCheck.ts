/**
 * Booth check: is everything ready for the service? Each check says what is
 * wrong in plain words and which Settings page fixes it. The live screen shows
 * the result as one light ("Ready" or "2 to check"); during the service the
 * same checks run again quietly, and anything that stops shows as a warning.
 * Works in the browser too: checks that need the desktop app are left out.
 */
import { desktop, ScreenOutput } from '@/lib/desktop';
import { connectionOf, loadProPresenterSettings } from '@/lib/proPresenter';
import { BibleParser } from '@/lib/bibleParser';
import { hasSecret } from '@/lib/secrets';
import { loadSpeechSettings } from '@/speech/SpeechProviderFactory';
import type { Pane } from '@/components/SettingsPanel';

export type CheckState = 'ok' | 'warn' | 'problem';

export interface BoothCheckItem {
  id: string;
  /** What is checked, e.g. "Projector" */
  label: string;
  state: CheckState;
  /** What was found, from the operator's side */
  detail: string;
  /** What fixes it: a Settings page, the computer's microphone settings, or planning a service */
  fix?: { label: string; pane?: Pane; action?: 'microphone' | 'plan' };
  /** Also watched during the service (a screen or port that stops) */
  live?: boolean;
}

const OUTPUT_NAMES: Record<ScreenOutput, string> = { projection: 'Projector', confidence: 'Stage monitor', lowerThird: 'Lower third' };

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

async function microphoneChecks(): Promise<BoothCheckItem[]> {
  const items: BoothCheckItem[] = [];
  const status = desktop?.microphone ? await desktop.microphone.status().catch(() => 'unknown') : 'unknown';
  if (status === 'denied' || status === 'restricted') {
    items.push({
      id: 'mic-access',
      label: 'Microphone',
      state: 'problem',
      detail: 'The computer is not letting Voice Verses use the microphone.',
      fix: { label: 'Open microphone settings', action: 'microphone' },
    });
    return items;
  }
  const { audioDeviceName } = loadSpeechSettings();
  let inputs: MediaDeviceInfo[] = [];
  try {
    inputs = (await navigator.mediaDevices?.enumerateDevices())?.filter((d) => d.kind === 'audioinput') ?? [];
  } catch {
    inputs = [];
  }
  const named = inputs.filter((d) => d.label);
  if (!inputs.length) {
    items.push({ id: 'mic', label: 'Microphone', state: 'problem', detail: 'No microphone or sound input is connected.', fix: { label: 'Listening settings', pane: 'listening' } });
  } else if (audioDeviceName && named.length && !named.some((d) => d.label === audioDeviceName)) {
    items.push({
      id: 'mic',
      label: 'Microphone',
      state: 'warn',
      detail: `“${audioDeviceName}” is not connected, so the computer’s default input will be used.`,
      fix: { label: 'Choose the input', pane: 'listening' },
    });
  } else {
    items.push({ id: 'mic', label: 'Microphone', state: 'ok', detail: audioDeviceName ? `Listening to “${audioDeviceName}”.` : 'Listening to the computer’s default input.' });
  }
  return items;
}

async function speechCheck(): Promise<BoothCheckItem> {
  const { speechEngine } = loadSpeechSettings();
  const base = { id: 'speech', label: 'Speech recognition', fix: { label: 'Listening settings', pane: 'listening' as Pane } };
  if (speechEngine === 'builtin') {
    const ok = await desktop?.speech.isAvailable().catch(() => false);
    return ok
      ? { ...base, state: 'ok', detail: 'On this computer, no internet needed.', fix: undefined }
      : { ...base, state: 'problem', detail: 'The on-device speech engine is missing from this copy of the app. Reinstall Voice Verses, or choose another engine.' };
  }
  if (speechEngine === 'openai') {
    const ok = await hasSecret('openai').catch(() => false);
    return ok
      ? { ...base, state: navigator.onLine ? 'ok' : 'problem', detail: navigator.onLine ? 'OpenAI, over the internet.' : 'OpenAI needs the internet, and this computer is offline.' }
      : { ...base, state: 'problem', detail: 'OpenAI speech needs its key.' };
  }
  return { ...base, state: 'ok', detail: 'The browser’s speech recognition.', fix: undefined };
}

async function screenChecks(): Promise<BoothCheckItem[]> {
  if (!desktop) return [];
  const [displays, config, deckConfig, deckStatus] = await Promise.all([
    desktop.screens.displays().catch(() => []),
    desktop.screens.get().catch(() => null),
    desktop.decklink?.get().catch(() => null) ?? Promise.resolve(null),
    desktop.decklink?.status().catch(() => null) ?? Promise.resolve(null),
  ]);
  const items: BoothCheckItem[] = [];
  const fix = { label: 'Screens settings', pane: 'screens' as Pane };
  for (const output of Object.keys(OUTPUT_NAMES) as ScreenOutput[]) {
    const label = OUTPUT_NAMES[output];
    const display = config?.[output];
    const port = deckConfig?.[output];
    const sdi = deckStatus?.[output];
    if (display == null && !port) continue;
    if (display != null) {
      const found = displays.find((d) => d.id === display);
      items.push(
        found
          ? { id: `screen-${output}`, label, state: 'ok', detail: `On ${found.label || 'its display'}.`, live: true }
          : { id: `screen-${output}`, label, state: 'problem', detail: 'Its display is not connected. Check the cable, or choose another display.', fix, live: true },
      );
    }
    if (port) {
      items.push(
        sdi?.state === 'sending'
          ? { id: `sdi-${output}`, label: `${label} (DeckLink)`, state: 'ok', detail: `Sending to ${port.device}.`, live: true }
          : { id: `sdi-${output}`, label: `${label} (DeckLink)`, state: 'problem', detail: sdi?.state === 'error' ? sdi.message : `${port.device} is not sending.`, fix, live: true },
      );
    }
  }
  if (!items.length) {
    items.push({
      id: 'screens',
      label: 'Screens',
      state: 'warn',
      detail: displays.length > 1 ? 'No output is on a screen yet: the projector is not set to any display.' : 'Only this computer’s own screen is connected. Connect the projector or switcher.',
      fix,
    });
  }
  return items;
}

async function proPresenterCheck(): Promise<BoothCheckItem | null> {
  const settings = loadProPresenterSettings();
  if (!desktop || !settings.enabled) return null;
  const base = { id: 'propresenter', label: 'ProPresenter', fix: { label: 'ProPresenter settings', pane: 'propresenter' as Pane }, live: true };
  try {
    const status = await withTimeout(desktop.proPresenter.status(connectionOf(settings)), 4000);
    if (!status.hasMessage) return { ...base, state: 'warn', detail: 'Connected, but the “Voice Verses” message is missing. Press Find and set up.' };
    if (!status.messageReady) return { ...base, state: 'warn', detail: 'The “Voice Verses” message needs {Verse} and {Reference} in it.' };
    return { ...base, state: 'ok', detail: `Connected to ${status.name || 'ProPresenter'}${status.version ? ` ${status.version}` : ''}.`, fix: undefined };
  } catch {
    return { ...base, state: 'problem', detail: `Can’t reach ProPresenter at ${settings.host}:${settings.port}. Is it open, with Network turned on?` };
  }
}

function bibleCheck(): BoothCheckItem {
  const version = BibleParser.getVersion();
  const name = BibleParser.getVersionLabel(version);
  if (BibleParser.isOnline(version) && !navigator.onLine)
    return {
      id: 'bible',
      label: 'Bible',
      state: 'warn',
      detail: `${name} needs the internet, and this computer is offline. Verses will come from a Bible on this computer instead.`,
      fix: { label: 'Bible settings', pane: 'bible' },
    };
  return { id: 'bible', label: 'Bible', state: 'ok', detail: BibleParser.isOnline(version) ? `${name}, over the internet.` : `${name}, on this computer.` };
}

function serviceCheck(service: { name: string } | null | undefined, today: boolean): BoothCheckItem {
  if (service && today) return { id: 'service', label: 'Today’s service', state: 'ok', detail: `“${service.name}” is loaded.` };
  return {
    id: 'service',
    label: 'Today’s service',
    state: 'warn',
    detail: service ? `No service is planned for today; “${service.name}” is loaded.` : 'No service is planned for today.',
    fix: { label: 'Plan a service', action: 'plan' },
  };
}

/** Every check, in the order a volunteer would walk the booth. */
export async function runBoothCheck(context: { service?: { name: string } | null; serviceIsToday?: boolean }): Promise<BoothCheckItem[]> {
  const [mic, speech, screens, proPresenter] = await Promise.all([microphoneChecks(), speechCheck(), screenChecks(), proPresenterCheck()]);
  return [...mic, speech, ...screens, ...(proPresenter ? [proPresenter] : []), bibleCheck(), serviceCheck(context.service, !!context.serviceIsToday)];
}

/** Only what can stop during a service: screens, DeckLink ports and ProPresenter. */
export async function runLiveChecks(): Promise<BoothCheckItem[]> {
  const [screens, proPresenter] = await Promise.all([screenChecks(), proPresenterCheck()]);
  return [...screens, ...(proPresenter ? [proPresenter] : [])].filter((c) => c.live);
}

export const needsAttention = (items: BoothCheckItem[]) => items.filter((c) => c.state !== 'ok');
