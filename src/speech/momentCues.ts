/**
 * Moment autopilot and sermon points on cue (Settings → Features; both off
 * unless switched on). Pure functions: the listening engine calls them on each
 * finished sentence, and the live screen acts. Nothing here ever puts anything
 * on screen: a moment puts the matching part of the order of service in Next,
 * and a sermon point becomes a slide waiting in Next, for the operator to Take.
 *
 * The phrases are deliberately narrow: "let us pray" moves to Prayer, but
 * "we must learn to pray" does not; "receive the offering" moves to Giving, but
 * "Abraham's offering of Isaac" does not.
 */

export type MomentKind = 'prayer' | 'giving' | 'welcome' | 'notices' | 'worship' | 'word' | 'response' | 'communion' | 'close';

export interface Moment {
  /** The kind of moment, for a built-in or kind cue; a cue taught for one part names the part instead */
  kind?: MomentKind;
  /** A taught cue's part, by name ("Offering") */
  part?: string;
  /** The words that were heard, for "spirit heard “let us pray”" */
  heard: string;
  /** Which cue it was (spirit keeps each cue's record) */
  cueId?: string;
}

/**
 * A spoken cue (Voice Verses spirit): words that get a part of the service, or a
 * sermon point, ready. Built-in ones come with the app and can be switched off;
 * a church teaches its own. Plain data, so the listening engine never reads storage.
 */
export interface SpokenCue {
  id: string;
  phrase: string;
  /** A kind of moment (any part of that kind), one part by name, or a sermon point */
  moment?: MomentKind;
  part?: string;
  point?: boolean;
  off?: boolean;
  /** Corrected as "not now" during a song: ignored while singing */
  notDuringSongs?: boolean;
}

/** The phrases the app comes with, for each moment (matched as whole words, any case, any punctuation). */
export const BUILTIN_MOMENT_PHRASES: Record<MomentKind, string[]> = {
  prayer: ['let us pray', "let's pray", 'let us bow', 'bow your heads', 'bow our heads', 'every head bowed', 'pray with me', 'join me in prayer', 'let us go to god in prayer'],
  giving: [
    'tithes and offerings',
    'tithes and offering',
    'time for our giving',
    'time of giving',
    'receive the offering',
    'receive our offering',
    'take up the offering',
    'as the ushers come forward',
    'as the ushers come',
    'ushers please come forward',
    'you can give online',
  ],
  welcome: ['turn to your neighbour', 'turn to your neighbor', 'turn to the person next to you', 'greet someone', 'greet your neighbour', 'greet your neighbor', 'first-time guests', 'first time guests', 'first-time visitors', 'welcome to church', 'welcome everyone'],
  notices: ['a few announcements', 'some announcements', 'our announcements', "this week's announcements", 'a few notices', 'announcements for this week'],
  worship: ['stand and worship', 'rise and worship', "let's stand and sing", 'let us stand and sing', 'let us worship', "let's worship", 'lift your voices'],
  word: ['open your bibles', 'open our bibles', "today's message", 'my message today', 'my sermon today', 'my message this morning'],
  response: ['every eye closed', 'altar call', 'come to the altar', 'come forward to the altar', 'give your life to jesus', 'give your life to christ', 'receive christ', 'receive jesus'],
  communion: ["the lord's table", "the lord's supper", 'take communion', 'share communion', 'holy communion'],
  close: ['the benediction', 'the grace of our lord', 'go in peace', 'as we close', 'before we close', 'before we leave this place', 'until next week', 'until next sunday', 'you are dismissed'],
};

/** The built-in moment cues as cue records (ids stay the same from version to version). */
export const BUILTIN_MOMENT_CUES: SpokenCue[] = (Object.entries(BUILTIN_MOMENT_PHRASES) as [MomentKind, string[]][]).flatMap(([moment, phrases]) =>
  phrases.map((phrase) => ({ id: `builtin:${moment}:${phrase}`, phrase, moment })),
);

/** Words as compared: lower case, curly apostrophes straightened, punctuation gone, single spaces. */
export const normalizeWords = (text: string) =>
  ` ${text
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[^a-z0-9' -]+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

/** Whether the phrase is said in the sentence, as whole words. */
export const says = (sentence: string, phrase: string) => normalizeWords(sentence).includes(normalizeWords(phrase));

/**
 * The moment a finished sentence announces, if any: the church's own cues first
 * (taught ones), then the built-in ones, skipping any switched off.
 */
export function findMoment(sentence: string, cues: SpokenCue[] = BUILTIN_MOMENT_CUES, context: { singing?: boolean } = {}): Moment | null {
  const text = sentence.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const usable = cues.filter((c) => !c.off && !c.point && (c.moment || c.part) && !(context.singing && c.notDuringSongs));
  const ordered = [...usable.filter((c) => !c.id.startsWith('builtin:')), ...usable.filter((c) => c.id.startsWith('builtin:'))];
  for (const cue of ordered) {
    if (says(text, cue.phrase)) return { kind: cue.moment, part: cue.part, heard: cue.phrase, cueId: cue.id };
  }
  return null;
}

/** Which parts of a service a moment can mean, from the section and part names (as the timeline colours them). */
const PART_NAMES: Record<MomentKind, RegExp> = {
  prayer: /pray|intercession/i,
  giving: /offering|giving|tithe/i,
  welcome: /welcome|greet|opening|call to worship/i,
  notices: /notice|announce/i,
  worship: /worship|song|praise|hymn|choir|music/i,
  word: /word|sermon|message|preach|teach|scripture|reading|bible/i,
  response: /response|altar|ministry|salvation/i,
  communion: /communion|lord'?s (supper|table)|eucharist|breaking of bread/i,
  close: /close|closing|benediction|dismiss|blessing|send/i,
};

/**
 * The part a moment points to: the nearest later part of that kind (a little
 * way ahead), else the nearest earlier one that hasn't been passed long ago.
 * `parts` are in service order; `current` is the index of the part on now (-1 for none).
 */
export function partForMoment(kind: MomentKind, parts: { name: string; section: string }[], current: number): number | null {
  const fits = (i: number) => PART_NAMES[kind].test(`${parts[i].section} ${parts[i].name}`);
  if (current >= 0 && current < parts.length && fits(current)) return null; // already there
  for (let i = Math.max(0, current + 1); i < parts.length && i <= current + 6; i++) if (fits(i)) return i;
  for (let i = current - 1; i >= 0 && i >= current - 2; i--) if (fits(i)) return i;
  return null;
}

// ---- Sermon points ----------------------------------------------------------------------------

const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  firstly: 1, secondly: 2, thirdly: 3, fourthly: 4, fifthly: 5,
};
const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const num = (w: string) => NUMBERS[w.toLowerCase()] ?? ORDINALS[w.toLowerCase()] ?? (/^\d{1,2}$/.test(w) ? Number(w) : null);

export interface SermonPoint {
  /** 1, 2, 3… when said ("point number two"); null for "write this down" */
  number: number | null;
  /** The point itself, when it was said in the same sentence; empty to take the next sentence */
  text: string;
}

/** The built-in sermon point cues: an id, how the church sees it, and how it is heard. */
export const BUILTIN_POINT_CUES: (SpokenCue & { pattern: RegExp })[] = [
  // "point number two", "point two", "point 2"
  {
    id: 'builtin:point:number',
    phrase: 'point number …',
    point: true,
    pattern: /\bpoint (?:number )?(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b[\s,:.-]*(?:is (?:this|that)[\s,:.-]*|is[\s,:.-]+)?/i,
  },
  // "my second point", "the third point is", "my final point"
  {
    id: 'builtin:point:my-nth',
    phrase: 'my second point …',
    point: true,
    pattern: /\b(?:my|the|our) (first|second|third|fourth|fifth|sixth|seventh|next|last|final) point\b[\s,:.-]*(?:is (?:this|that)[\s,:.-]*|is[\s,:.-]+)?/i,
  },
  // "number three:" only right at the start of a sentence (not "number three of the apostles")
  { id: 'builtin:point:number-start', phrase: 'number three … (starting a sentence)', point: true, pattern: /^(?:and |so )?number (one|two|three|four|five|six|seven|eight|nine|ten)\b[\s,:.-]+(?:is[\s,:.-]+)?/i },
  // "write this down", "put this in your notes"
  { id: 'builtin:point:write', phrase: 'write this down', point: true, pattern: /\b(?:write this down|write that down|put this in your notes|take note of this)\b[\s,:.-]*/i },
];

/**
 * A sermon point announced in a finished sentence, if any: the built-in cues not
 * switched off, then the church's own point cues (the words after them become the point).
 */
export function findSermonPoint(sentence: string, cues: SpokenCue[] = []): (SermonPoint & { cueId: string }) | null {
  const text = sentence.replace(/\s+/g, ' ').trim();
  const off = new Set(cues.filter((c) => c.off).map((c) => c.id));
  for (const cue of BUILTIN_POINT_CUES) {
    if (off.has(cue.id)) continue;
    const m = cue.pattern.exec(text);
    if (!m) continue;
    const word = m[1];
    const number = word && !/next|last|final/i.test(word) ? num(word) : null;
    return { number, text: tidyPoint(text.slice(m.index + m[0].length)), cueId: cue.id };
  }
  for (const cue of cues) {
    if (!cue.point || cue.off || cue.id.startsWith('builtin:')) continue;
    const at = normalizeWords(text).indexOf(normalizeWords(cue.phrase));
    if (at < 0) continue;
    const after = normalizeWords(text).slice(at + normalizeWords(cue.phrase).length);
    return { number: null, text: tidyPoint(after), cueId: cue.id };
  }
  return null;
}

/** The part a taught cue names, by its name: the nearest one ahead, else just behind. */
export function partByName(name: string, parts: { name: string; section: string }[], current: number): number | null {
  const want = normalizeWords(name);
  const fits = (i: number) => normalizeWords(parts[i].name) === want || normalizeWords(`${parts[i].section} ${parts[i].name}`).includes(want);
  if (current >= 0 && current < parts.length && fits(current)) return null;
  for (let i = Math.max(0, current + 1); i < parts.length; i++) if (fits(i)) return i;
  for (let i = current - 1; i >= 0; i--) if (fits(i)) return i;
  return null;
}

// ---- Learning by watching ------------------------------------------------------------------

const FILLER = new Set(
  'a an and the to of in on at for with as is are was be it its this that we you i me my our your us so now just all let lets let\'s will can would could may please come go get got going do does did have has had not no yes oh amen church everybody everyone somebody okay ok well right'.split(' '),
);

/** The word runs (3 to 6 words) in a sentence that could be a cue: at least one word that isn't filler. */
export function phraseCandidates(sentence: string): string[] {
  const words = normalizeWords(sentence).trim().split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let n = 3; n <= 6; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const run = words.slice(i, i + n);
      if (run.every((w) => FILLER.has(w))) continue;
      if (FILLER.has(run[0]) && FILLER.has(run[run.length - 1]) && run.filter((w) => !FILLER.has(w)).length < 2) continue;
      out.add(run.join(' '));
    }
  }
  return [...out];
}

/**
 * What spirit noticed: words said just before the operator went to the same part
 * on at least two occasions, and never before going anywhere else. The longest run
 * that is said each time wins ("as the ushers make their way" over "the ushers make").
 */
export function noticePatterns(observations: { part: string; sentences: string[] }[], minTimes = 2): { phrase: string; part: string; times: number }[] {
  const byPhrase = new Map<string, Map<string, number>>();
  for (const o of observations) {
    const seen = new Set(o.sentences.flatMap(phraseCandidates));
    for (const p of seen) {
      const parts = byPhrase.get(p) ?? new Map<string, number>();
      parts.set(o.part, (parts.get(o.part) ?? 0) + 1);
      byPhrase.set(p, parts);
    }
  }
  const found: { phrase: string; part: string; times: number }[] = [];
  for (const [phrase, parts] of byPhrase) {
    if (parts.size !== 1) continue; // said before going to different parts: not telling
    const [[part, times]] = [...parts];
    if (times >= minTimes) found.push({ phrase, part, times });
  }
  // Keep the longest of runs inside one another with the same count
  const kept = found.filter((f) => !found.some((g) => g !== f && g.part === f.part && g.times >= f.times && g.phrase.length > f.phrase.length && ` ${g.phrase} `.includes(` ${f.phrase} `)));
  // Runs that overlap ("let us go to the lord" + "us go to the lord together") join into one
  const joined: typeof kept = [];
  for (const f of kept.sort((a, b) => b.times - a.times)) {
    const fw = f.phrase.split(' ');
    const other = joined.find((g) => g.part === f.part && g.times === f.times && overlapJoin(g.phrase.split(' '), fw));
    if (other) other.phrase = overlapJoin(other.phrase.split(' '), fw)!.join(' ');
    else joined.push({ ...f });
  }
  return joined.sort((a, b) => b.times - a.times || b.phrase.split(' ').length - a.phrase.split(' ').length);
}

/** Two word runs that overlap by at least 3 words, as one ("a b c d" + "b c d e" → "a b c d e"); null if they don't. */
function overlapJoin(a: string[], b: string[]): string[] | null {
  for (const [x, y] of [
    [a, b],
    [b, a],
  ]) {
    for (let k = Math.min(x.length, y.length) - 1; k >= 3; k--) {
      if (x.slice(-k).join(' ') === y.slice(0, k).join(' ')) return [...x, ...y.slice(k)];
    }
  }
  return null;
}

/** A point's words as a slide line: no trailing "and", first letter capital, a full stop. */
export function tidyPoint(words: string): string {
  let t = words.replace(/\s+/g, ' ').trim().replace(/^(that|this|is)\s+/i, '').replace(/[\s,;:-]+(and|so|but)?$/i, '').trim();
  if (t.split(' ').length < 3) return '';
  if (t.split(' ').length > 24) t = t.split(' ').slice(0, 24).join(' ') + '…';
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}
