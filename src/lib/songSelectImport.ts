/**
 * Songs downloaded from CCLI SongSelect: the lyrics text file (.txt) and the
 * SongSelect import file (.usr). Both keep the song's sections, writers,
 * copyright and CCLI song number, so the song is credited and reported properly.
 */
export interface ImportedSong {
  name: string;
  /** Sections separated by blank lines, each starting with its name ("Verse 1", "Chorus") */
  lyrics: string;
  author?: string;
  copyright?: string;
  ccliNumber?: string;
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The SongSelect import file: INI-style, sections in Fields/Words separated by "/t", lines by "/n". */
function parseUsr(text: string): ImportedSong | null {
  const values = new Map<string, string>();
  let header = '';
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    const section = /^\[(.+)\]$/.exec(line);
    if (section) {
      if (section[1] !== 'File') header = section[1];
      continue;
    }
    const eq = line.indexOf('=');
    if (eq > 0) values.set(line.slice(0, eq).trim().toLowerCase(), line.slice(eq + 1));
  }
  const title = values.get('title');
  const words = values.get('words');
  if (!title || !words) return null;
  const fields = (values.get('fields') ?? '').split('/t');
  const parts = words.split('/t');
  const lyrics = parts
    .map((part, i) => {
      const lines = part.split('/n').map((l) => l.trim()).filter(Boolean);
      return lines.length ? [fields[i]?.trim() || `Verse ${i + 1}`, ...lines].join('\n') : '';
    })
    .filter(Boolean)
    .join('\n\n');
  const number = /\d{3,}/.exec(header)?.[0] ?? values.get('ccli')?.match(/\d+/)?.[0] ?? values.get('songnumber')?.match(/\d+/)?.[0];
  return {
    name: tidy(title),
    lyrics,
    author: values.get('author') ? tidy(values.get('author')!.split('|').map((a) => a.trim()).join(', ')) : undefined,
    copyright: values.get('copyright') ? tidy(values.get('copyright')!) : undefined,
    ccliNumber: number,
  };
}

const SECTION = /^(verse|chorus|pre-?chorus|bridge|tag|intro|outro|ending|refrain|vamp|interlude|instrumental|misc)\b/i;

/**
 * The lyrics text download: the title, then sections ("Verse 1", "Chorus"...)
 * separated by blank lines, then the credits ("CCLI Song # 7115744", the
 * writers, "© 2016 ...", the terms of use and "CCLI License # ...").
 */
function parseTxt(text: string): ImportedSong | null {
  const lines = text.replace(/\r/g, '').replace(/\u00a0/g, ' ').split('\n').map((l) => l.trimEnd());
  const first = lines.findIndex((l) => l.trim());
  if (first < 0) return null;
  const name = tidy(lines[first]);
  const creditsAt = lines.findIndex((l) => /^\s*CCLI\s+Song\s*#?/i.test(l));
  const body = lines.slice(first + 1, creditsAt >= 0 ? creditsAt : undefined);
  const credits = creditsAt >= 0 ? lines.slice(creditsAt).map((l) => l.trim()).filter(Boolean) : [];

  const ccliNumber = credits[0]?.match(/\d+/)?.[0];
  const copyright = credits.find((l) => /^(©|\(c\)|copyright)/i.test(l));
  const author = credits.slice(1).find((l) => l !== copyright && !/songselect|ccli|license|licence|terms of use|www\./i.test(l));

  // Blocks separated by blank lines; a block whose first line names a section keeps it
  const blocks: string[][] = [];
  let block: string[] = [];
  for (const l of body) {
    if (!l.trim()) {
      if (block.length) blocks.push(block);
      block = [];
    } else block.push(l.trim());
  }
  if (block.length) blocks.push(block);
  // SongSelect sometimes puts the section name on its own, followed by a blank line
  const merged: string[][] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].length === 1 && SECTION.test(blocks[i][0]) && blocks[i + 1]) {
      merged.push([blocks[i][0], ...blocks[i + 1]]);
      i++;
    } else merged.push(blocks[i]);
  }
  const lyrics = merged.map((b) => b.join('\n')).join('\n\n').trim();
  if (!lyrics) return null;
  return {
    name,
    lyrics,
    author: author ? tidy(author.split('|').map((a) => a.trim()).join(', ')) : undefined,
    copyright: copyright ? tidy(copyright.replace(/^\(c\)/i, '©')) : undefined,
    ccliNumber,
  };
}

/** A song from a SongSelect download, or null when the file is not one. */
export function parseSongSelectFile(fileName: string, text: string): ImportedSong | null {
  if (/\.usr$/i.test(fileName) || /^\s*\[File\]/i.test(text) || /^Type=SongSelect/im.test(text)) return parseUsr(text);
  return parseTxt(text);
}

export const isSongFile = (name: string) => /\.(usr|txt)$/i.test(name);
