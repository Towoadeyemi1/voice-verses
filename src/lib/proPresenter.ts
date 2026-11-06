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

/** Runs a request if sending is turned on. True when ProPresenter accepted it. */
async function send(action: (settings: ProPresenterSettings) => Promise<void>): Promise<boolean> {
  const settings = loadProPresenterSettings();
  if (!desktop || !settings.enabled) return false;
  try {
    await action(settings);
    if (failing) toast.success('ProPresenter is receiving verses again');
    failing = false;
    return true;
  } catch (error) {
    if (!failing) {
      toast.error('Could not send the verse to ProPresenter', {
        description: error instanceof Error ? error.message : String(error),
        duration: 8000,
      });
    }
    failing = true;
    return false;
  }
}

// Say once when ProPresenter takes verses but shows nothing, until it shows one again
let notShowing = false;

/** What to tell the operator when ProPresenter took the verse but its Messages layer shows nothing. */
export const NOT_SHOWING =
  'ProPresenter took the verse but is not showing it. In ProPresenter, check that the “Voice Verses” message is the one showing (Messages), that no other message is on top of it, and that the current Look has the Messages layer on for the audience screens.';

export function sendVerseToProPresenter(verse: BibleVerse): Promise<boolean> {
  return send(async (settings) => {
    const result = await desktop!.proPresenter.show(connectionOf(settings), {
      reference: verseReference(verse),
      text: plainVerseText(verse.text),
      stage: settings.stage,
    });
    if (result && result.messagesOn === false) {
      if (!notShowing) toast.warning('ProPresenter isn’t showing the verse', { description: NOT_SHOWING, duration: 12000 });
      notShowing = true;
    } else if (result && result.messagesOn) notShowing = false;
  });
}

export function clearProPresenter(): Promise<boolean> {
  return send((settings) => desktop!.proPresenter.clear(connectionOf(settings), { stage: settings.stage }));
}
