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
  kind: MomentKind;
  /** The words that were heard, for "Heard “let us pray”" */
  heard: string;
}

const MOMENTS: [MomentKind, RegExp][] = [
  ['prayer', /\b(let us pray|let'?s pray|let us bow|bow (our|your) heads|every head bowed|pray with me|join me in prayer|let us go to god in prayer|let us come before (the lord|god) in prayer)\b/i],
  [
    'giving',
    /\b(tithes? and offerings?|(time|moment) (of|for) (our )?(giving|offering)|(receive|collect|take up|bring) (the|our|this (morning|evening)'?s?) (tithes?|offering)|as the ushers (come|are coming|make their way)|ushers,? (please )?come forward|(let us|let's|we will now|we'll now) give (our|to the lord)|(you can|you may) give (online|by text|through the app))\b/i,
  ],
  ['welcome', /\b(turn to (your|the person next to you|someone)|greet (someone|your neighbou?r|the person)|(our |any )?first[- ]time (guests?|visitors?)|welcome (to church|to our service|everyone|home))\b/i],
  ['notices', /\b((a few|some|our|the|this week'?s) (announcements|notices)|(let me|i want to) (share|give) (a few|some) (announcements|notices)|(announcements|notices) for (this|the) week)\b/i],
  ['worship', /\b((please )?(stand|rise) (to|and|as we) (worship|sing|praise)|let us (stand and )?(worship|sing|praise)|let'?s (stand and )?(worship|sing)|(lift|raise) (your|our) voices)\b/i],
  ['word', /\b(open (your|our) bibles|(turn|go) (with me )?(in your bibles )?to the book of|today'?s (message|sermon|word)|my (message|sermon) (today|this morning|this evening))\b/i],
  ['response', /\b(every eye closed|altar call|come (forward )?to the altar|(give|giving) your life to (jesus|christ)|if you (want|would like) to (receive|accept) (jesus|christ)|raise your hand (if|and))\b/i],
  ['communion', /\b(the lord'?s (supper|table)|(take|share|receive) (holy )?communion|this (bread|cup) (is|represents))\b/i],
  ['close', /\b(the benediction|(may )?the grace of our lord|go in peace|(as|before) we close( (this|our|the) (service|time|meeting))?|before we leave this (place|morning|evening)|until next (week|time|sunday)|you are dismissed)\b/i],
];

/** The moment a finished sentence announces, if any. */
export function findMoment(sentence: string): Moment | null {
  const text = sentence.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  for (const [kind, re] of MOMENTS) {
    const m = re.exec(text);
    if (m) return { kind, heard: m[0] };
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

const POINT_CUES: RegExp[] = [
  // "point number two", "point two", "point 2"
  /\bpoint (?:number )?(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b[\s,:.-]*(?:is (?:this|that)[\s,:.-]*|is[\s,:.-]+)?/i,
  // "my second point", "the third point is", "my final point"
  /\b(?:my|the|our) (first|second|third|fourth|fifth|sixth|seventh|next|last|final) point\b[\s,:.-]*(?:is (?:this|that)[\s,:.-]*|is[\s,:.-]+)?/i,
  // "number three:" only right at the start of a sentence (not "number three of the apostles")
  /^(?:and |so )?number (one|two|three|four|five|six|seven|eight|nine|ten)\b[\s,:.-]+(?:is[\s,:.-]+)?/i,
  // "write this down", "put this in your notes"
  /\b(?:write this down|write that down|put this in your notes|take note of this)\b[\s,:.-]*/i,
];

/** A sermon point announced in a finished sentence, if any. */
export function findSermonPoint(sentence: string): SermonPoint | null {
  const text = sentence.replace(/\s+/g, ' ').trim();
  for (const re of POINT_CUES) {
    const m = re.exec(text);
    if (!m) continue;
    const word = m[1];
    const number = word && !/next|last|final/i.test(word) ? num(word) : null;
    return { number, text: tidyPoint(text.slice(m.index + m[0].length)) };
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
