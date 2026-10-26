import { LyricsSlide, Service, ServiceSection, ServiceSubsection } from '@/types/service';

export const WORSHIP_SONGS_TEMPLATE = `Song Title,Lyrics
"Amazing Grace","Verse 1
Amazing grace how sweet the sound
That saved a wretch like me

Chorus
I once was lost but now I'm found
Was blind but now I see

Verse 2
Through many dangers toils and snares
I have already come"
"Example Song 2","Verse 1
First verse line 1
First verse line 2

Chorus
Chorus line 1
Chorus line 2"`;

/**
 * Minimal RFC 4180 CSV parser: quoted fields may contain commas, newlines
 * and doubled quotes (""). Song lyrics span several lines, so splitting the
 * file on newlines first would break them apart.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => cell.trim()));
}

const SECTION_LABELS: Array<NonNullable<LyricsSlide['section']>> = ['verse', 'chorus', 'bridge', 'outro'];

/** Split lyrics into one slide per blank-line-separated block; "Verse 1"-style first lines become section labels. */
export function lyricsToSlides(songTitle: string, lyrics: string, idPrefix: string): LyricsSlide[] {
  const blocks = lyrics.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  return blocks.map((block, slideIndex) => {
    const lines = block.split('\n');
    const firstLine = lines[0].trim().toLowerCase();
    // Only treat the first line as a label when it is short, e.g. "Chorus" or "Verse 2"
    const section = firstLine.length <= 20 ? SECTION_LABELS.find(label => firstLine.startsWith(label)) : undefined;
    const content = section && lines.length > 1 ? lines.slice(1).join('\n') : block;

    return {
      id: `${idPrefix}-${slideIndex}`,
      type: 'lyrics',
      title: `${songTitle} - Slide ${slideIndex + 1}`,
      songTitle,
      slideNumber: slideIndex + 1,
      totalSlides: blocks.length,
      content: content.trim(),
      section,
    };
  });
}

export interface WorshipSongImportResult {
  songs: ServiceSubsection[];
  /** Titles that had no lyrics and were skipped */
  skipped: string[];
}

/** Parse a "Song Title,Lyrics" CSV into one subsection per song. */
export function parseWorshipSongsCsv(text: string): WorshipSongImportResult {
  const [header, ...rows] = parseCsv(text);
  const hasHeader = header && header[0]?.trim().toLowerCase() === 'song title';
  const dataRows = hasHeader ? rows : [header, ...rows].filter(Boolean);

  const stamp = Date.now();
  const songs: ServiceSubsection[] = [];
  const skipped: string[] = [];

  dataRows.forEach(([title = '', lyrics = ''], index) => {
    const songTitle = title.trim();
    if (!songTitle) return;

    const slides = lyricsToSlides(songTitle, lyrics, `slide-import-${stamp}-${index}`);
    if (slides.length === 0) {
      skipped.push(songTitle);
      return;
    }

    songs.push({ id: `subsection-import-${stamp}-${index}`, name: songTitle, slides });
  });

  return { songs, skipped };
}

/** Append songs to the service's "Worship" section, creating it if needed. */
export function addSongsToWorshipSection(service: Service, songs: ServiceSubsection[]): Service {
  const sections = service.sections || [];
  const worship = sections.find(s => s.name.toLowerCase() === 'worship');

  if (worship) {
    return {
      ...service,
      sections: sections.map(s => (s.id === worship.id ? { ...s, subsections: [...s.subsections, ...songs] } : s)),
    };
  }

  const newSection: ServiceSection = { id: `section-${Date.now()}`, name: 'Worship', subsections: songs };
  return { ...service, sections: [...sections, newSection] };
}
