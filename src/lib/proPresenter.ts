import { toast } from 'sonner';
import { BibleVerse } from '@/types/bible';
import { desktop, ProPresenterConnection } from '@/lib/desktop';
import { plainVerseText, verseReference } from '@/lib/verseText';

/**
 * Sends the verses Voice Verses shows to ProPresenter as well (desktop app
 * only; see electron/propresenter.js). Voice Verses' own screens keep working
 * either way, so a church can use one, the other or both.
 */
export interface ProPresenterSettings extends ProPresenterConnection {
  enabled: boolean;
  /** Also show the verse on ProPresenter's stage screens */
  stage: boolean;
}

const STORAGE_KEY = 'voice-verses-propresenter';

const DEFAULTS: ProPresenterSettings = {
  enabled: false,
  host: '127.0.0.1',
  port: 50001,
  stage: false,
};

export function loadProPresenterSettings(): ProPresenterSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function saveProPresenterSettings(settings: ProPresenterSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const connectionOf = ({ host, port }: ProPresenterSettings): ProPresenterConnection => ({ host, port });

// Report a failure once, not for every verse, until sending works again
let failing = false;

async function send(action: (settings: ProPresenterSettings) => Promise<void>): Promise<void> {
  const settings = loadProPresenterSettings();
  if (!desktop || !settings.enabled) return;
  try {
    await action(settings);
    if (failing) toast.success('ProPresenter is receiving verses again');
    failing = false;
  } catch (error) {
    if (!failing) {
      toast.error('Could not send the verse to ProPresenter', {
        description: error instanceof Error ? error.message : String(error),
        duration: 8000,
      });
    }
    failing = true;
  }
}

export function sendVerseToProPresenter(verse: BibleVerse): Promise<void> {
  return send((settings) =>
    desktop!.proPresenter.show(connectionOf(settings), {
      reference: verseReference(verse),
      text: plainVerseText(verse.text),
      stage: settings.stage,
    }),
  );
}

export function clearProPresenter(): Promise<void> {
  return send((settings) => desktop!.proPresenter.clear(connectionOf(settings), { stage: settings.stage }));
}
