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

/**
 * What fixes a warning. With `pane`, "Show me the fix" (1.19.11) opens that Settings page,
 * lights up `target` and says `say`; `doIt` offers "Do it for me"; `solved` is said once the
 * check passes again, and the live screen comes back.
 */
export interface BoothFixInfo {
  label: string;
  pane?: Pane;
  action?: 'microphone' | 'plan';
  /** The one control to change (a selector on that Settings page) */
  target?: string;
  /** One short line: what to change */
  say?: string;
  /** Said when it is fixed */
  solved?: string;
  /** Voice Verses can do it: listen to every input and choose the one with the preacher */
  doIt?: 'findSound';
}

/** The fix for "can't hear the preacher" (the input, or no sound for 20 seconds) */
export const LISTENING_FIX: BoothFixInfo = {
  label: 'Listening settings',
  pane: 'listening',
  target: '#mic-device',
  say: 'Choose the input the preacher is on. Its bar moves when the preacher speaks.',
  solved: 'Hearing the preacher again.',
  doIt: 'findSound',
};

export interface BoothCheckItem {
  id: string;
  /** What is checked, e.g. "Projector" */
  label: string;
  state: CheckState;
  /** What was found, from the operator's side */
  detail: string;
  /** What fixes it: a Settings page, the computer's microphone settings, or planning a service */
  fix?: BoothFixInfo;
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
    items.push({ id: 'mic', label: 'Microphone', state: 'problem', detail: 'No microphone or sound input is connected.', fix: { ...LISTENING_FIX, say: 'Connect the sound from the desk, then choose it here.', doIt: undefined } });
  } else if (audioDeviceName && named.length && !named.some((d) => d.label === audioDeviceName)) {
    items.push({
      id: 'mic',
      label: 'Microphone',
      state: 'warn',
      detail: `“${audioDeviceName}” is not connected, so the computer’s default input will be used.`,
      fix: { ...LISTENING_FIX, label: 'Choose the input' },
    });
  } else {
    items.push({ id: 'mic', label: 'Microphone', state: 'ok', detail: audioDeviceName ? `Listening to “${audioDeviceName}”.` : 'Listening to the computer’s default input.' });
  }
  return items;
}

async function speechCheck(): Promise<BoothCheckItem> {
  const { speechEngine } = loadSpeechSettings();
  const base = {
    id: 'speech',
    label: 'Speech recognition',
    fix: { label: 'Listening settings', pane: 'listening' as Pane, target: '[role="radiogroup"][aria-label="Speech engine"]', say: 'Choose how Voice Verses hears speech here.', solved: 'Speech recognition is ready.' },
  };
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
  const [displays, config, deckConfig, deckStatus, ndiConfig, ndiStatus, ndiAvail] = await Promise.all([
    desktop.screens.displays().catch(() => []),
    desktop.screens.get().catch(() => null),
    desktop.decklink?.get().catch(() => null) ?? Promise.resolve(null),
    desktop.decklink?.status().catch(() => null) ?? Promise.resolve(null),
    desktop.ndi?.get().catch(() => null) ?? Promise.resolve(null),
    desktop.ndi?.status().catch(() => null) ?? Promise.resolve(null),
    desktop.ndi?.availability().catch(() => null) ?? Promise.resolve(null),
  ]);
  const items: BoothCheckItem[] = [];
  const fix: BoothFixInfo = { label: 'Screens settings', pane: 'screens' };
  const screenFix = (output: ScreenOutput, how: 'display' | 'decklink' | 'ndi'): BoothFixInfo => ({
    ...fix,
    target: how === 'display' ? `[data-output="${output}"]` : how === 'decklink' ? `[data-decklink-output="${output}"]` : `[data-ndi-output="${output}"]`,
    say:
      how === 'display'
        ? `The ${OUTPUT_NAMES[output].toLowerCase()}’s screen isn’t connected. Check its cable, or choose another screen for it here.`
        : how === 'decklink'
          ? `The ${OUTPUT_NAMES[output].toLowerCase()}’s DeckLink port isn’t sending. Check the port and its format here.`
          : `The ${OUTPUT_NAMES[output].toLowerCase()} isn’t going out over NDI. Check it here.`,
    solved: `The ${OUTPUT_NAMES[output].toLowerCase()} is showing again.`,
  });
  for (const output of Object.keys(OUTPUT_NAMES) as ScreenOutput[]) {
    const label = OUTPUT_NAMES[output];
    const display = config?.[output];
    const port = deckConfig?.[output];
    const sdi = deckStatus?.[output];
    const ndi = ndiConfig?.[output];
    if (ndi) {
      const st = ndiStatus?.[output];
      items.push(
        st?.state === 'sending'
          ? { id: `ndi-${output}`, label: `${label} (NDI)`, state: 'ok', detail: st.receivers ? `Sending; ${st.receivers} watching.` : 'Sending. No one is watching yet.', live: true }
          : {
              id: `ndi-${output}`,
              label: `${label} (NDI)`,
              state: 'problem',
              detail: ndiAvail && !ndiAvail.available ? 'NDI is on, but the free NDI Runtime isn’t on this computer. Install NDI Tools from ndi.video.' : 'NDI is on, but it isn’t sending.',
              fix: screenFix(output, 'ndi'),
              live: true,
            },
      );
    }
    if (display == null && !port) continue;
    if (display != null) {
      const found = displays.find((d) => d.id === display);
      items.push(
        found
          ? { id: `screen-${output}`, label, state: 'ok', detail: `On ${found.label || 'its display'}.`, live: true }
          : { id: `screen-${output}`, label, state: 'problem', detail: 'Its display is not connected. Check the cable, or choose another display.', fix: screenFix(output, 'display'), live: true },
      );
    }
    if (port) {
      items.push(
        sdi?.state === 'sending'
          ? { id: `sdi-${output}`, label: `${label} (DeckLink)`, state: 'ok', detail: `Sending to ${port.device}.`, live: true }
          : { id: `sdi-${output}`, label: `${label} (DeckLink)`, state: 'problem', detail: sdi?.state === 'error' ? sdi.message : `${port.device} is not sending.`, fix: screenFix(output, 'decklink'), live: true },
      );
    }
  }
  if (!items.length) {
    items.push({
      id: 'screens',
      label: 'Screens',
      state: 'warn',
      detail: displays.length > 1 ? 'No output is on a screen yet: the projector is not set to any display.' : 'Only this computer’s own screen is connected. Connect the projector or switcher.',
      fix: { ...fix, target: '[data-output="projection"]', say: 'Choose the screen for the projector here.', solved: 'The projector has a screen.' },
    });
  }
  return items;
}

async function proPresenterCheck(): Promise<BoothCheckItem | null> {
  const settings = loadProPresenterSettings();
  if (!desktop) return null;
  const target = settings.route === 'linked' ? '[data-pp-linked]' : settings.route === 'ndi' ? '[data-pp-route="ndi"]' : '[data-propresenter-status]';
  const say =
    settings.route === 'linked'
      ? 'Check the folder ProPresenter reads: Choose another folder, or Use the default.'
      : settings.route === 'ndi'
        ? 'Switch on Send the projector over NDI here.'
        : 'Check that ProPresenter is open with Network turned on, then press Find and set up.';
  const base = { id: 'propresenter', label: 'ProPresenter', fix: { label: 'ProPresenter settings', pane: 'propresenter' as Pane, target, say, solved: 'ProPresenter is connected again.' }, live: true };
  // A slide with Voice Verses' picture (1.19.3): the projector must be going out over NDI
  if (settings.route === 'ndi') {
    const status = await withTimeout(desktop.ndi?.status() ?? Promise.reject(new Error('no NDI')), 4000).catch(() => null);
    const sending = status?.projection.state === 'sending';
    return sending
      ? { ...base, state: 'ok', detail: 'The projector is going to ProPresenter over NDI.', fix: undefined }
      : { ...base, state: 'warn', detail: 'ProPresenter is set to show Voice Verses’ picture, but the projector isn’t being sent over NDI.' };
  }
  if (!settings.enabled) return null;
  // A slide with linked text (1.19.3): the folder must be there to write to
  if (settings.route === 'linked') {
    const result = await withTimeout(desktop.proPresenter.linked?.check() ?? Promise.reject(new Error('Needs Voice Verses 1.19.3')), 4000).catch((e) => ({ ok: false, folder: '', error: String(e) }));
    return result.ok
      ? { ...base, state: 'ok', detail: `Writing the words for ProPresenter to ${result.folder}.`, fix: undefined }
      : { ...base, state: 'problem', detail: `Can’t write the words for ProPresenter${result.folder ? ` to ${result.folder}` : ''}. Is the shared folder there?` };
  }
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
      fix: { label: 'Bible settings', pane: 'bible', target: '[data-version="kjv"]', say: 'While there’s no internet, choose a Bible on this computer: KJV, ASV or WEB.', solved: 'The Bible is on this computer.' },
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
