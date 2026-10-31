import { LyricsSlide } from '@/types/service';

/**
 * Songs are written once in sections ("Verse 1", "Chorus", "Bridge"...) and
 * sung in an arrangement: the order of sections, with repeats. Slides follow
 * the arrangement, so a chorus is typed once and shown every time it is sung.
 */
export interface SongSection {
  label: string;
  lines: string[];
}

export interface Song {
  title: string;
  lyrics: string;
  author?: string;
  copyright?: string;
  ccliNumber?: string;
  arrangement?: string[];
}

const LABEL = /^\[?\s*((?:verse|chorus|pre-?chorus|bridge|tag|intro|outro|ending|refrain|vamp|interlude)\b[^\]]*?)\s*\]?\s*:?\s*$/i;

/** Splits lyrics into sections at blank lines; a first line like "Chorus" or "[Verse 2]" names the section. */
export function parseSongSections(lyrics: string): SongSection[] {
  const sections: SongSection[] = [];
  let verse = 0;
  for (const block of lyrics.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const named = LABEL.exec(lines[0]);
    let label = named ? named[1].replace(/\s+/g, ' ') : '';
    const body = named ? lines.slice(1) : lines;
    if (!body.length) continue;
    if (!label) label = `Verse ${++verse}`;
    else if (/^verse$/i.test(label)) label = `Verse ${++verse}`;
    else if (/^verse\s*\d+/i.test(label)) verse = Math.max(verse, Number(label.match(/\d+/)![0]));
    label = label.replace(/\b\w/g, (c) => c.toUpperCase());
    // The same name twice: keep both, e.g. "Chorus" and "Chorus (2)"
    let unique = label;
    for (let n = 2; sections.some((s) => s.label === unique); n++) unique = `${label} (${n})`;
    sections.push({ label: unique, lines: body });
  }
  return sections;
}

/** The arrangement to use: the song's own (sections that still exist), else the sections in order. */
export function effectiveArrangement(song: Song, sections = parseSongSections(song.lyrics)): string[] {
  const names = new Set(sections.map((s) => s.label));
  const own = (song.arrangement ?? []).filter((label) => names.has(label));
  return own.length ? own : sections.map((s) => s.label);
}

/** "Amazing Grace · John Newton · © Public Domain · CCLI Song # 22025 · CCLI Licence # 123456" */
export function songCredits(song: Song, licence?: string): string {
  return [
    song.title,
    song.author,
    song.copyright && (song.copyright.startsWith('©') ? song.copyright : `© ${song.copyright}`),
    song.ccliNumber && `CCLI Song # ${song.ccliNumber}`,
    licence && `CCLI Licence # ${licence}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

const sectionType = (label: string): LyricsSlide['section'] => {
  const l = label.toLowerCase();
  if (l.includes('chorus') || l.includes('refrain')) return 'chorus';
  if (l.includes('bridge')) return 'bridge';
  if (l.includes('outro') || l.includes('ending') || l.includes('tag')) return 'outro';
  return 'verse';
};

/** Slides for a song, following its arrangement. Credits go on the first slide. */
export function buildSongSlides(
  song: Song,
  { linesPerSlide = 4, titleCard = false, licence }: { linesPerSlide?: number; titleCard?: boolean; licence?: string } = {},
): LyricsSlide[] {
  const sections = parseSongSections(song.lyrics);
  const byLabel = new Map(sections.map((s) => [s.label, s]));
  const stamp = Date.now();
  const slides: LyricsSlide[] = [];
  const add = (content: string, label?: string) =>
    slides.push({
      id: `song-${stamp}-${slides.length}`,
      type: 'lyrics',
      title: song.title,
      songTitle: song.title,
      slideNumber: slides.length + 1,
      totalSlides: 0,
      content,
      section: label ? sectionType(label) : undefined,
      sectionLabel: label,
    });

  if (titleCard) add(song.title);
  for (const label of effectiveArrangement(song, sections)) {
    const section = byLabel.get(label);
    if (!section) continue;
    for (let i = 0; i < section.lines.length; i += linesPerSlide) {
      add(section.lines.slice(i, i + linesPerSlide).join('\n'), label);
    }
  }
  slides.forEach((s) => (s.totalSlides = slides.length));
  if (slides[0]) slides[0].credits = songCredits(song, licence);
  return slides;
}

/** The church's CCLI licence number (Settings → CCLI). */
export function ccliLicence(): string | undefined {
  try {
    return JSON.parse(localStorage.getItem('cornerstone-settings') ?? '{}').ccliLicense || undefined;
  } catch {
    return undefined;
  }
}
