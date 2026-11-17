import { toast } from 'sonner';
import { BibleVerse } from '@/types/bible';
import { desktop, LinkedFile, ProPresenterConnection } from '@/lib/desktop';
import type { Slide } from '@/types/service';
import { BibleParser } from '@/lib/bibleParser';
import { plainVerseText, verseReference } from '@/lib/verseText';
import { practising } from '@/lib/practice';

/**
 * Sends the verses Voice Verses shows to ProPresenter as well (desktop app
 * only; see electron/propresenter.js). Voice Verses' own screens keep working
 * either way, so a church can use one, the other or both.
 */
/**
 * How the words get into ProPresenter (1.19.3):
 * - `linked`: a slide with linked text: Voice Verses writes files a text box on the church's slide reads;
 * - `ndi`: a slide with Voice Verses' picture: the projector output sent over NDI, shown on a ProPresenter slide;
 * - `message`: ProPresenter's "Voice Verses" message, over whatever is on (the first way, 1.12).
 */
export type ProPresenterRoute = 'linked' | 'ndi' | 'message';

export interface ProPresenterSettings extends ProPresenterConnection {
  enabled: boolean;
  /** Also show the verse on ProPresenter's stage screens (the message only) */
  stage: boolean;
  route: ProPresenterRoute;
  /** Linked text: song words as well as verses */
  linkedSongs: boolean;
}

const STORAGE_KEY = 'voice-verses-propresenter';

const DEFAULTS: ProPresenterSettings = {
  enabled: false,
  host: '127.0.0.1',
  port: 50001,
  stage: false,
  route: 'message',
  linkedSongs: false,
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
  if (settings.route !== 'message') return false;
  // Practice never reaches ProPresenter
  if (!desktop || !settings.enabled || practising()) return false;
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

/**
 * Someone pressed Hide in ProPresenter (1.18.5): Voice Verses stops sending verses there, instead of
 * putting the next one straight back over them, until the operator chooses Send again.
 */
let hiddenThere = false;
/** Voice Verses has put a verse on ProPresenter since it last cleared it: only then does it clear (never someone else's stage message) */
let sentSinceClear = false;

export function sendVerseToProPresenter(verse: BibleVerse, opts: { force?: boolean } = {}): Promise<boolean> {
  const route = loadProPresenterSettings().route;
  if (route === 'linked') return writeLinked(plainVerseText(verse.text), `${verseReference(verse)} ${BibleParserLabel(verse)}`.trim());
  // NDI: ProPresenter shows Voice Verses' own picture; nothing to send
  if (route === 'ndi') return Promise.resolve(false);
  if (hiddenThere && !opts.force) return Promise.resolve(false);
  return send(async (settings) => {
    const result = await desktop!.proPresenter.show(connectionOf(settings), {
      reference: verseReference(verse),
      text: plainVerseText(verse.text),
      stage: settings.stage,
      force: opts.force,
    });
    if (result && result.hiddenInProPresenter) {
      hiddenThere = true;
      sentSinceClear = false;
      toast('ProPresenter’s operator hid the verse', {
        description: 'Voice Verses stopped sending verses to ProPresenter, so it doesn’t put them back over them. Its own screens carry on.',
        duration: 20000,
        action: { label: 'Send again', onClick: () => void resumeProPresenter(verse) },
      });
      return;
    }
    hiddenThere = false;
    sentSinceClear = true;
    if (result && result.messagesOn === false) {
      if (!notShowing) toast.warning('ProPresenter isn’t showing the verse', { description: NOT_SHOWING, duration: 12000 });
      notShowing = true;
    } else if (result && result.messagesOn) notShowing = false;
  });
}

/** Sends verses to ProPresenter again after its operator hid one, starting with this verse. */
export function resumeProPresenter(verse?: BibleVerse): Promise<boolean> {
  hiddenThere = false;
  return verse ? sendVerseToProPresenter(verse, { force: true }) : Promise.resolve(true);
}

/** Takes Voice Verses' verse off ProPresenter (the message, and the stage message if it sent one): only when it put one there. */
export function clearProPresenter(): Promise<boolean> {
  const route = loadProPresenterSettings().route;
  if (route === 'linked') return linkedWritten ? writeLinked('', '') : Promise.resolve(false);
  if (route === 'ndi') return Promise.resolve(false);
  if (!sentSinceClear || practising()) return Promise.resolve(false);
  sentSinceClear = false;
  return send((settings) => desktop!.proPresenter.clear(connectionOf(settings), { stage: settings.stage }));
}

// ---- A slide with linked text (1.19.3) -----------------------------------------------------------

/** The translation shown after the reference ("KJV") */
const BibleParserLabel = (_verse: BibleVerse) => BibleParser.getVersionLabel();

/** Something was written since the last clear (so a clear only blanks what Voice Verses put there) */
let linkedWritten = false;
let linkedFailing = false;

/** The three files ProPresenter can read: the words, the reference, and both on two lines */
export const linkedFiles = (text: string, reference: string): Record<LinkedFile, string> => ({
  'verse.txt': text,
  'reference.txt': reference,
  'verse-and-reference.txt': text && reference ? `${text}\n${reference}` : text || reference,
});

/** Writes the words for ProPresenter's linked text box (never in practice, never with sending off). */
async function writeLinked(text: string, reference: string, opts: { test?: boolean } = {}): Promise<boolean> {
  const settings = loadProPresenterSettings();
  const linked = desktop?.proPresenter.linked;
  if (!linked || (!settings.enabled && !opts.test) || (practising() && !opts.test)) return false;
  try {
    await linked.write(linkedFiles(text, reference));
    linkedWritten = !!(text || reference);
    if (linkedFailing) toast.success('ProPresenter’s linked text is being written again');
    linkedFailing = false;
    return true;
  } catch (error) {
    if (!linkedFailing)
      toast.error('Could not write the words for ProPresenter', {
        description: `${error instanceof Error ? error.message : String(error)}. Check the folder in Settings → ProPresenter.`,
        duration: 10000,
      });
    linkedFailing = true;
    return false;
  }
}

/** Settings' "Write a test verse" and "Clear it" for linked text: work even with sending off. */
export const writeLinkedTest = (text: string, reference: string) => writeLinked(text, reference, { test: true });

/**
 * A song or slide went live. Linked text with song words on: its words go to ProPresenter;
 * otherwise the verse comes off ProPresenter (1.18.5).
 */
export function sendSlideToProPresenter(slide: { type: string; content?: string; songTitle?: string; sectionLabel?: string }): Promise<boolean> {
  const settings = loadProPresenterSettings();
  if (settings.route === 'linked' && settings.linkedSongs && slide.type === 'lyrics') {
    return writeLinked((slide.content ?? '').trim(), [slide.songTitle, slide.sectionLabel].filter(Boolean).join(' · '));
  }
  return clearProPresenter();
}
