/**
 * Worship leader voice cues: what a leader calls out over the music to the
 * band and the room ("one more time", "go to the bridge", "back to the
 * chorus", "verse two", "from the top"), turned into where the lyrics go.
 *
 * Cues are short and called between lines, so only a short utterance counts:
 * a sung line that happens to contain "again" or "the chorus" is not a cue.
 */

export type SectionName = 'verse' | 'chorus' | 'pre-chorus' | 'bridge' | 'tag' | 'intro' | 'outro' | 'vamp' | 'interlude';

export type WorshipCue =
  | { kind: 'again'; heard: string }
  | { kind: 'section'; section: SectionName; number?: number; heard: string }
  | { kind: 'top'; heard: string };

const NUMBERS: Record<string, number> = { one: 1, first: 1, two: 2, second: 2, three: 3, third: 3, four: 4, fourth: 4, five: 5, fifth: 5, six: 6, sixth: 6 };

const clean = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/pre[\s-]+chorus/g, 'prechorus')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SECTION_WORDS: Record<string, SectionName> = {
  chorus: 'chorus',
  refrain: 'chorus',
  prechorus: 'pre-chorus',
  bridge: 'bridge',
  tag: 'tag',
  intro: 'intro',
  outro: 'outro',
  ending: 'outro',
  vamp: 'vamp',
  interlude: 'interlude',
  verse: 'verse',
};
const SECTION = Object.keys(SECTION_WORDS).join('|');

/** The cue in what was just heard, if it is one. */
export function parseWorshipCue(text: string): WorshipCue | null {
  const said = clean(text);
  if (!said) return null;
  const count = said.split(' ').length;
  // Cues are called, not sung: a long sentence is a lyric or speech
  if (count > 10) return null;

  if (/\bfrom the (?:top|beginning|start)\b/.test(said)) return { kind: 'top', heard: said };

  // "verse two", "second verse", "the last verse"
  const numbered = said.match(/\b(?:verse (one|two|three|four|five|six|[1-6])|(first|second|third|fourth|fifth|sixth) verse)\b/);
  if (numbered && (count <= 3 || /\b(?:go|back|to|sing|take|let's|lets|the|into|on)\b/.test(said))) {
    const word = numbered[1] ?? numbered[2];
    const number = NUMBERS[word] ?? Number(word);
    return { kind: 'section', section: 'verse', number, heard: said };
  }

  // "go to the bridge", "back to the chorus", "sing the chorus", "into the tag", or just "chorus!"
  const named =
    said.match(new RegExp(`\\b(?:go|back|going|goes|take (?:it|us)|let's go|lets go|sing|straight|into|to|on) (?:to |into |on )?(?:the )?(${SECTION})\\b`)) ??
    (count <= 3 ? said.match(new RegExp(`^(?:the )?(${SECTION})(?: again)?$`)) : null);
  if (named) {
    const section = SECTION_WORDS[named[1]];
    // A plain "verse" without a number is too vague to jump on
    if (section !== 'verse') return { kind: 'section', section, heard: said };
  }

  // "one more time", "sing it again", "let's sing that again", "again!", "last time", "repeat that"
  if (/\b(?:one more time|sing (?:it|that|this) again|sing (?:it|that|this) one more|let's (?:do|sing) (?:it|that|this) again|lets (?:do|sing) (?:it|that|this) again|do (?:it|that) again|repeat (?:it|that|this))\b/.test(said)) {
    return { kind: 'again', heard: said };
  }
  if (count <= 4 && /^(?:(?:come on|oh|yeah|church|everybody|hey|and) )*(?:again|one more|last time|one more time)(?: (?:church|everybody|now|come on))*$/.test(said)) {
    return { kind: 'again', heard: said };
  }
  return null;
}

/** The section a slide belongs to, from its label ("Chorus (2)" → chorus, "Verse 3" → verse 3). */
export function sectionOf(label: string | undefined): { section: SectionName | null; number?: number } {
  const l = clean(label ?? '');
  if (!l) return { section: null };
  if (l.includes('prechorus')) return { section: 'pre-chorus' };
  for (const [word, section] of Object.entries(SECTION_WORDS)) {
    if (section === 'pre-chorus' || section === 'verse') continue;
    if (new RegExp(`\\b${word}\\b`).test(l)) return { section };
  }
  if (/\bverse\b/.test(l)) {
    const n = l.match(/\bverse (\d+)/);
    return { section: 'verse', number: n ? Number(n[1]) : undefined };
  }
  return { section: null };
}

/** Runs of slides that belong to one sung section (a chorus sung twice is two runs). */
function runsOf(labels: string[]): { label: string; start: number; end: number }[] {
  const runs: { label: string; start: number; end: number }[] = [];
  labels.forEach((label, i) => {
    const last = runs[runs.length - 1];
    if (last && last.label === label && last.end === i - 1) last.end = i;
    else runs.push({ label, start: i, end: i });
  });
  return runs;
}

/**
 * Where the cue takes the song: the slide to show, or null to stay.
 * `labels` are the slides' section labels in the order sung; `current` is
 * the slide showing.
 */
export function cueTarget(cue: WorshipCue, labels: string[], current: number, { justArrived = false }: { justArrived?: boolean } = {}): number | null {
  if (!labels.length) return null;
  const runs = runsOf(labels);
  const here = runs.find((r) => current >= r.start && current <= r.end) ?? runs[0];
  let target: number | null = null;

  if (cue.kind === 'top') target = 0;

  if (cue.kind === 'again') {
    // Called at the end of a section. If the lyrics moved on to the next section's first slide a
    // moment ago, the leader means the section that was just sung.
    const previous = runs[runs.indexOf(here) - 1];
    target = justArrived && current === here.start && previous ? previous.start : here.start;
  }

  if (cue.kind === 'section') {
    const matches = runs.filter((r) => {
      const s = sectionOf(r.label);
      return s.section === cue.section && (cue.number === undefined || s.number === cue.number);
    });
    if (!matches.length) return null;
    // The next time it comes in the song, or else the last time before here
    const ahead = matches.find((r) => r.start > here.end);
    target = (ahead ?? matches.filter((r) => r.start <= current).pop() ?? matches[0]).start;
  }

  return target === null || target === current ? null : target;
}
