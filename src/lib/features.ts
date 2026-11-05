/**
 * Every smart feature can be switched on or off (Settings → Features), so a
 * church uses only what it wants. Saved per computer in localStorage, which
 * every window shares. The listening engine gets the listening ones as plain
 * flags (VerseDetectionController.setFeatures); it never reads this file.
 */

export type FeatureId =
  | 'readAlong'
  | 'chapterWait'
  | 'quotes'
  | 'stories'
  | 'helpFind'
  | 'predictiveNext'
  | 'songRecognition'
  | 'worshipCues'
  | 'newSongs'
  | 'partCountdowns'
  | 'guardian'
  | 'boothCheck'
  | 'momentAutopilot'
  | 'sermonPoints';

export type FeatureGroup = 'Scripture' | 'Worship' | 'The service' | 'Safety';

export interface FeatureInfo {
  id: FeatureId;
  group: FeatureGroup;
  title: string;
  /** What it does, from the operator's side */
  description: string;
  /** On for a new install ("Recommended"); bolder features (acting on their own in new ways) start off */
  recommended: boolean;
  /** Part of "Essentials": the least the app does by itself */
  essential?: boolean;
  /** Not built yet: shown as coming, can't be switched on */
  coming?: boolean;
}

export const FEATURES: FeatureInfo[] = [
  {
    id: 'readAlong',
    group: 'Scripture',
    title: 'Follow the reading',
    description: 'While a passage is read aloud, each verse goes up as the reader gets to it.',
    recommended: true,
    essential: true,
  },
  {
    id: 'chapterWait',
    group: 'Scripture',
    title: 'A chapter alone waits for its verse',
    description:
      '"Somewhere in Isaiah 53" loads the chapter and waits until a verse is read or named. Off: verse 1 goes up at once.',
    recommended: true,
    essential: true,
  },
  {
    id: 'quotes',
    group: 'Scripture',
    title: 'Verses quoted without a reference',
    description: 'Offered as suggestions; shown by themselves only when quoted word for word (99% sure).',
    recommended: true,
  },
  {
    id: 'stories',
    group: 'Scripture',
    title: 'Stories told in the preacher’s own words',
    description: '"Zacchaeus climbed a sycamore tree" offers Luke 19. Always a suggestion, never shown by itself.',
    recommended: true,
  },
  {
    id: 'helpFind',
    group: 'Scripture',
    title: '“Help me find it”',
    description: 'When the preacher asks for help finding a scripture, everything just said is searched at once.',
    recommended: true,
  },
  {
    id: 'predictiveNext',
    group: 'Scripture',
    title: 'Predictive Next',
    description: '"Paul says the same thing in Romans" puts the likely verse in Next. Never shown by itself.',
    recommended: false,
  },
  {
    id: 'songRecognition',
    group: 'Worship',
    title: 'Recognise songs from your library',
    description: 'When a song from your library is being sung, it is offered so you can switch to it.',
    recommended: true,
  },
  {
    id: 'worshipCues',
    group: 'Worship',
    title: 'Worship leader’s cues',
    description: '"One more time", "go to the bridge", "back to the chorus" move the song slides by themselves.',
    recommended: true,
  },
  {
    id: 'newSongs',
    group: 'Worship',
    title: 'Singing something new',
    description: 'Singing that is in no song is offered; you can show the words as they are sung and keep them as a draft song.',
    recommended: false,
  },
  {
    id: 'partCountdowns',
    group: 'The service',
    title: 'A part’s own countdown starts with it',
    description: 'A part with a countdown (such as "Countdown" before the service) starts it when its slide goes on screen.',
    recommended: true,
    essential: true,
  },
  {
    id: 'momentAutopilot',
    group: 'The service',
    title: 'Moment autopilot',
    description:
      '"Let us pray", "as the ushers come forward", "every head bowed": the order of service moves to that part, into Next.',
    recommended: false,
    coming: true,
  },
  {
    id: 'sermonPoints',
    group: 'The service',
    title: 'Sermon points on cue',
    description: '"Point number two…", "write this down…": the preacher’s words become a point slide, ready in Next.',
    recommended: false,
    coming: true,
  },
  {
    id: 'boothCheck',
    group: 'Safety',
    title: 'Booth check',
    description: 'A "Ready" light on the live screen: microphone, screens, DeckLink, ProPresenter and today’s service, with Fix buttons.',
    recommended: true,
    essential: true,
  },
  {
    id: 'guardian',
    group: 'Safety',
    title: 'Warnings during the service',
    description: 'A warning on the live screen if the microphone goes silent or a screen or DeckLink port stops.',
    recommended: true,
    essential: true,
  },
];

export type Features = Record<FeatureId, boolean>;
export type Preset = 'essentials' | 'recommended' | 'everything';

const KEY = 'voice-verses-features';
export const FEATURES_CHANGED = 'voice-verses-features-changed';

export const presetFeatures = (preset: Preset): Features =>
  Object.fromEntries(
    FEATURES.map((f) => [f.id, !f.coming && (preset === 'everything' || (preset === 'recommended' ? f.recommended : !!f.essential))]),
  ) as Features;

/** The features switched on here (Recommended until changed; a feature added later starts as Recommended says). */
export function loadFeatures(): Features {
  const base = presetFeatures('recommended');
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Features>;
    for (const f of FEATURES) if (typeof saved[f.id] === 'boolean' && !f.coming) base[f.id] = saved[f.id]!;
  } catch {
    // Unreadable: Recommended
  }
  return base;
}

export function saveFeatures(features: Features): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(features));
  } catch {
    // Still applies until the app closes
  }
  window.dispatchEvent(new Event(FEATURES_CHANGED));
}

export const setFeature = (id: FeatureId, on: boolean) => saveFeatures({ ...loadFeatures(), [id]: on });

/** Which preset the switches match, if any. */
export function matchingPreset(features: Features): Preset | null {
  for (const p of ['essentials', 'recommended', 'everything'] as Preset[]) {
    const want = presetFeatures(p);
    if (FEATURES.every((f) => f.coming || want[f.id] === features[f.id])) return p;
  }
  return null;
}

/** The listening engine's part, as plain flags. */
export function detectionFeatures(features: Features = loadFeatures()) {
  return {
    readAlong: features.readAlong,
    chapterWait: features.chapterWait,
    quotes: features.quotes,
    stories: features.stories,
    helpFind: features.helpFind,
    predictiveNext: features.predictiveNext,
    songRecognition: features.songRecognition,
    worshipCues: features.worshipCues,
    newSongs: features.newSongs,
  };
}
