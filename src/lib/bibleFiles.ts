/**
 * Reading Bible files (1.19.15): the free formats Bibles are shared in, read on the computer
 * with nothing else to install, into the shape the built-in Bibles use (66 books, in order).
 *
 * - OSIS XML (CrossWire, eBible.org): verses as containers or as milestones (sID/eID).
 * - USFX XML (eBible.org).
 * - Zefania XML.
 * - USFM text (Paratext, eBible.org): one file per book, several joined, or a .zip of them.
 * - JSON: the built-in format, and BibleSuperSearch's.
 *
 * Footnotes and cross-references are left out. Words the translators added (KJV italics) are
 * kept as {word}, which the screens show in italics, as for the built-in KJV. Books outside the
 * 66 (the Apocrypha) are left out and named. Only add a Bible the church may use: public domain,
 * or licensed to it.
 */
import { strFromU8, unzipSync } from 'fflate';

export interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

export type BibleFileFormat = 'OSIS' | 'USFX' | 'Zefania' | 'USFM' | 'JSON';

export interface ReadBible {
  /** The Bible's own name, from the file ("World English Bible"), else the file's name */
  name: string;
  /** A short name for the screens ("WEB"), from the file when it says, else made from the name */
  abbreviation: string;
  format: BibleFileFormat;
  books: BibleBook[];
  /** Verses with words */
  verses: number;
  /** Books of the 66 the file doesn't have */
  missing: string[];
  /** Books in the file outside the 66, left out */
  leftOut: string[];
}

// ---- The 66 books: our abbreviations and names, OSIS ids and USFM codes ----------------------

const BOOKS: [abbrev: string, name: string, osis: string, usfm: string][] = [
  ['gn', 'Genesis', 'Gen', 'GEN'], ['ex', 'Exodus', 'Exod', 'EXO'], ['lv', 'Leviticus', 'Lev', 'LEV'], ['nm', 'Numbers', 'Num', 'NUM'],
  ['dt', 'Deuteronomy', 'Deut', 'DEU'], ['js', 'Joshua', 'Josh', 'JOS'], ['jud', 'Judges', 'Judg', 'JDG'], ['rt', 'Ruth', 'Ruth', 'RUT'],
  ['1sm', '1 Samuel', '1Sam', '1SA'], ['2sm', '2 Samuel', '2Sam', '2SA'], ['1kgs', '1 Kings', '1Kgs', '1KI'], ['2kgs', '2 Kings', '2Kgs', '2KI'],
  ['1ch', '1 Chronicles', '1Chr', '1CH'], ['2ch', '2 Chronicles', '2Chr', '2CH'], ['ezr', 'Ezra', 'Ezra', 'EZR'], ['ne', 'Nehemiah', 'Neh', 'NEH'],
  ['et', 'Esther', 'Esth', 'EST'], ['job', 'Job', 'Job', 'JOB'], ['ps', 'Psalms', 'Ps', 'PSA'], ['prv', 'Proverbs', 'Prov', 'PRO'],
  ['ec', 'Ecclesiastes', 'Eccl', 'ECC'], ['so', 'Song of Solomon', 'Song', 'SNG'], ['is', 'Isaiah', 'Isa', 'ISA'], ['jr', 'Jeremiah', 'Jer', 'JER'],
  ['lm', 'Lamentations', 'Lam', 'LAM'], ['ez', 'Ezekiel', 'Ezek', 'EZK'], ['dn', 'Daniel', 'Dan', 'DAN'], ['ho', 'Hosea', 'Hos', 'HOS'],
  ['jl', 'Joel', 'Joel', 'JOL'], ['am', 'Amos', 'Amos', 'AMO'], ['ob', 'Obadiah', 'Obad', 'OBA'], ['jn', 'Jonah', 'Jonah', 'JON'],
  ['mi', 'Micah', 'Mic', 'MIC'], ['na', 'Nahum', 'Nah', 'NAM'], ['hk', 'Habakkuk', 'Hab', 'HAB'], ['zp', 'Zephaniah', 'Zeph', 'ZEP'],
  ['hg', 'Haggai', 'Hag', 'HAG'], ['zc', 'Zechariah', 'Zech', 'ZEC'], ['ml', 'Malachi', 'Mal', 'MAL'], ['mt', 'Matthew', 'Matt', 'MAT'],
  ['mk', 'Mark', 'Mark', 'MRK'], ['lk', 'Luke', 'Luke', 'LUK'], ['jo', 'John', 'John', 'JHN'], ['act', 'Acts', 'Acts', 'ACT'],
  ['rm', 'Romans', 'Rom', 'ROM'], ['1co', '1 Corinthians', '1Cor', '1CO'], ['2co', '2 Corinthians', '2Cor', '2CO'], ['gl', 'Galatians', 'Gal', 'GAL'],
  ['eph', 'Ephesians', 'Eph', 'EPH'], ['ph', 'Philippians', 'Phil', 'PHP'], ['cl', 'Colossians', 'Col', 'COL'], ['1ts', '1 Thessalonians', '1Thess', '1TH'],
  ['2ts', '2 Thessalonians', '2Thess', '2TH'], ['1tm', '1 Timothy', '1Tim', '1TI'], ['2tm', '2 Timothy', '2Tim', '2TI'], ['tt', 'Titus', 'Titus', 'TIT'],
  ['phm', 'Philemon', 'Phlm', 'PHM'], ['hb', 'Hebrews', 'Heb', 'HEB'], ['jm', 'James', 'Jas', 'JAS'], ['1pe', '1 Peter', '1Pet', '1PE'],
  ['2pe', '2 Peter', '2Pet', '2PE'], ['1jo', '1 John', '1John', '1JN'], ['2jo', '2 John', '2John', '2JN'], ['3jo', '3 John', '3John', '3JN'],
  ['jd', 'Jude', 'Jude', 'JUD'], ['re', 'Revelation', 'Rev', 'REV'],
];
const byCode = new Map<string, number>();
BOOKS.forEach(([abbrev, name, osis, usfm], i) => {
  for (const k of [abbrev, name, osis, usfm, name.replace(/\s/g, '')]) byCode.set(k.toLowerCase(), i);
});
// Names and codes other files use
for (const [k, i] of Object.entries({ psalm: 18, 'song of songs': 21, canticles: 21, 'revelation of john': 65, 'the revelation': 65, sir: -1 })) if (i >= 0) byCode.set(k, i);

/** The index (0–65) of a book from any of its codes or names, or -1 */
export function bookIndex(code: string): number {
  return byCode.get(code.trim().toLowerCase()) ?? -1;
}

// ---- Shared building ---------------------------------------------------------------------------

class Builder {
  readonly chapters: (string[] | undefined)[][] = BOOKS.map(() => []);
  readonly leftOut = new Set<string>();
  add(book: number, chapter: number, verse: number, text: string) {
    if (book < 0 || chapter < 1 || verse < 1) return;
    const clean = tidy(text);
    if (!clean) return;
    const ch = (this.chapters[book][chapter - 1] ??= []);
    // Some files give a verse in pieces (across paragraphs): join them
    ch[verse - 1] = ch[verse - 1] ? `${ch[verse - 1]} ${clean}` : clean;
  }
  done(name: string, abbreviation: string, format: BibleFileFormat): ReadBible {
    // Front matter, glossaries and indexes aren't books
    for (const code of [...this.leftOut]) if (/^(FRT|BAK|OTH|INT|CNC|GLO|TDX|NDX|XX[A-G]|front|back)$/i.test(code)) this.leftOut.delete(code);
    const books: BibleBook[] = [];
    const missing: string[] = [];
    let verses = 0;
    BOOKS.forEach(([abbrev, bookName], i) => {
      const chapters = this.chapters[i];
      if (!chapters.length) {
        missing.push(bookName);
        books.push({ abbrev, name: bookName, chapters: [] });
        return;
      }
      const filled = Array.from({ length: chapters.length }, (_, c) => Array.from({ length: chapters[c]?.length ?? 0 }, (_, v) => chapters[c]![v] ?? ''));
      verses += filled.reduce((n, ch) => n + ch.filter(Boolean).length, 0);
      books.push({ abbrev, name: bookName, chapters: filled });
    });
    if (!verses) throw new Error('No verses were found in this file. It may not be a Bible, or it may be in a format Voice Verses can’t read yet.');
    return { name, abbreviation: abbreviation || shortName(name), format, books, verses, missing, leftOut: [...this.leftOut] };
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m));

/** One line of words: no stray spaces, no space before punctuation, braces tight around added words */
const tidy = (s: string) =>
  s
    .replace(/¶/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\{\s+/g, '{')
    .replace(/\s+\}/g, '}')
    .replace(/\{\}/g, '')
    .replace(/\s+([,.;:!?’”)])/g, '$1')
    .trim();

/** "World English Bible" → "WEB"; a short name stays as it is */
const shortName = (name: string) => {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(the|of|and|in)$/i.test(w));
  return words.length > 1 ? words.map((w) => w[0].toUpperCase()).join('').slice(0, 6) : (words[0] ?? 'Bible').slice(0, 8);
};

// ---- A small tag reader for the XML formats (no DOM needed, so it also runs in checks) ----------

interface Tag {
  name: string;
  close: boolean;
  selfClose: boolean;
  attrs: Record<string, string>;
}

function* xmlTokens(xml: string): Generator<{ text: string } | { tag: Tag }> {
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m.index > last) yield { text: decode(xml.slice(last, m.index)) };
    last = re.lastIndex;
    if (m[1] !== undefined) {
      yield { text: m[1] };
      continue;
    }
    if (!m[3]) continue;
    const attrs: Record<string, string> = {};
    for (const a of (m[4] ?? '').matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[a[1].toLowerCase()] = decode(a[3] ?? a[4] ?? '');
    yield { tag: { name: m[3].toLowerCase().replace(/^.*:/, ''), close: m[2] === '/', selfClose: m[5] === '/', attrs } };
  }
  if (last < xml.length) yield { text: decode(xml.slice(last)) };
}

/** Paragraphs, lines and breaks: a verse that runs across them needs a space where they meet */
const BLOCK = new Set(['p', 'l', 'lg', 'lb', 'br', 'q', 'q1', 'q2', 'q3', 'q4', 'div', 'b', 'line', 'm', 'mi', 'pi', 'pi1', 'pi2', 'li', 'li1', 'li2', 'nb', 'pc', 'pr', 'qr', 'qc', 'qm', 'item', 'list', 'caption']);

/** Elements whose words are not part of the verse: notes, references, headings, Strong's numbers */
const SKIP_OSIS = new Set(['note', 'title', 'reference', 'rdg', 'milestone']);
const SKIP_USFX = new Set(['f', 'x', 'fe', 'ref', 'rem', 'h', 'toc', 's', 'ms', 'mt', 'cl', 'ca', 'va', 'cp', 'vp', 'periph', 'id', 'ide', 'ib', 'imt', 'ip', 'is']);
const SKIP_ZEF = new Set(['note', 'gr', 'caption', 'remark', 'xref']);

function readOsis(xml: string, fileName: string): ReadBible {
  const b = new Builder();
  let title = '';
  let abbr = '';
  let inTitle = false;
  let skip = 0;
  let book = -1;
  let chapter = 0;
  let verse = 0;
  let open = false; // inside a verse (container or between milestones)
  let text = '';
  const flush = () => {
    if (open && verse) b.add(book, chapter, verse, text);
    text = '';
  };
  for (const t of xmlTokens(xml)) {
    if ('text' in t) {
      if (inTitle) title += t.text;
      else if (open && !skip) text += t.text;
      continue;
    }
    const { name, close, selfClose, attrs } = t.tag;
    if (BLOCK.has(name) && open && !skip) text += ' ';
    if (name === 'title' && !title && !open && book < 0) {
      inTitle = !close && !selfClose;
      continue;
    }
    if (inTitle && close) inTitle = false;
    if (name === 'work' && !close && attrs.osiswork && !abbr) abbr = attrs.osiswork;
    if (SKIP_OSIS.has(name) && !selfClose) {
      skip += close ? -1 : 1;
      if (skip < 0) skip = 0;
      continue;
    }
    if (name === 'transchange' && (attrs.type ?? 'added') === 'added') {
      if (open && !skip) text += close ? '}' : '{';
      continue;
    }
    if (name === 'div' && !close && attrs.type === 'book') {
      const id = attrs.osisid ?? '';
      book = bookIndex(id);
      if (book < 0 && id) b.leftOut.add(id);
      continue;
    }
    if (name === 'chapter' && !close) {
      const id = attrs.osisid ?? attrs.sid ?? '';
      const n = Number(id.split('.')[1] ?? attrs.n);
      if (n) chapter = n;
      continue;
    }
    if (name === 'verse') {
      if (attrs.eid !== undefined) {
        flush();
        open = false;
        continue;
      }
      if (close) {
        flush();
        open = false;
        continue;
      }
      const id = (attrs.osisid ?? attrs.sid ?? '').split(/\s+/)[0];
      const [bk, ch, vs] = id.split('.');
      if (!bk || !vs) continue;
      flush();
      const bi = bookIndex(bk);
      if (bi < 0) {
        b.leftOut.add(bk);
        open = false;
        continue;
      }
      book = bi;
      chapter = Number(ch);
      verse = Number(vs);
      // A container verse, or a milestone that starts one; a self-closed verse with no sID is empty
      open = !selfClose || attrs.sid !== undefined;
    }
  }
  flush();
  return b.done(tidy(title) || stripExt(fileName), abbr.replace(/^Bible\./i, ''), 'OSIS');
}

function readUsfx(xml: string, fileName: string): ReadBible {
  const b = new Builder();
  let book = -1;
  let chapter = 0;
  let verse = 0;
  let open = false;
  let skip = 0;
  let text = '';
  const flush = () => {
    if (open && verse && book >= 0) b.add(book, chapter, verse, text);
    text = '';
  };
  for (const t of xmlTokens(xml)) {
    if ('text' in t) {
      if (open && !skip) text += t.text;
      continue;
    }
    const { name, close, selfClose, attrs } = t.tag;
    if (BLOCK.has(name) && open && !skip) text += ' ';
    if (name === 'book' && !close) {
      flush();
      open = false;
      book = bookIndex(attrs.id ?? '');
      if (book < 0 && attrs.id) b.leftOut.add(attrs.id);
      chapter = 0;
      continue;
    }
    if (name === 'c' && !close) {
      flush();
      open = false;
      chapter = Number(attrs.id);
      continue;
    }
    if (name === 'v' && !close) {
      flush();
      verse = Number((attrs.id ?? '').split('-')[0]);
      open = !!verse;
      continue;
    }
    if (name === 've') {
      flush();
      open = false;
      continue;
    }
    if (name === 'add') {
      if (open && !skip) text += close ? '}' : '{';
      continue;
    }
    if (SKIP_USFX.has(name) && !selfClose) {
      skip += close ? -1 : 1;
      if (skip < 0) skip = 0;
      continue;
    }
  }
  flush();
  return b.done(stripExt(fileName), '', 'USFX');
}

function readZefania(xml: string, fileName: string): ReadBible {
  const b = new Builder();
  let book = -1;
  let chapter = 0;
  let verse = 0;
  let open = false;
  let skip = 0;
  let text = '';
  let title = '';
  let abbr = '';
  let meta = '';
  for (const t of xmlTokens(xml)) {
    if ('text' in t) {
      if (meta === 'title' && !title) title = t.text;
      if (meta === 'identifier' && !abbr) abbr = t.text;
      if (open && !skip) text += t.text;
      continue;
    }
    const { name, close, selfClose, attrs } = t.tag;
    if (BLOCK.has(name) && open && !skip) text += ' ';
    if (name === 'title' || name === 'identifier') {
      meta = close || selfClose ? '' : name;
      continue;
    }
    if (name === 'xmlbible' && !close && attrs.biblename && !title) title = attrs.biblename;
    if (name === 'biblebook' && !close) {
      const n = Number(attrs.bnumber);
      book = n >= 1 && n <= 66 ? n - 1 : bookIndex(attrs.bname ?? attrs.bsname ?? '');
      if (book < 0) b.leftOut.add(attrs.bname ?? `book ${attrs.bnumber}`);
      continue;
    }
    if (name === 'chapter' && !close) {
      chapter = Number(attrs.cnumber);
      continue;
    }
    if (name === 'vers') {
      if (close) {
        if (open && book >= 0) b.add(book, chapter, verse, text);
        open = false;
        text = '';
      } else {
        verse = Number(attrs.vnumber);
        open = !selfClose;
        text = '';
      }
      continue;
    }
    if (SKIP_ZEF.has(name) && !selfClose) {
      skip += close ? -1 : 1;
      if (skip < 0) skip = 0;
    }
  }
  return b.done(tidy(title) || stripExt(fileName), tidy(abbr), 'Zefania');
}

// ---- USFM ----------------------------------------------------------------------------------------

/** Character styles whose words stay (the marker goes); notes and references go with their words */
function usfmVerseText(s: string): string {
  return s
    .replace(/\\(f|fe|x|ef|ex)\s[\s\S]*?\\\1\*/g, ' ')
    .replace(/\\\+?add\s([\s\S]*?)\\\+?add\*/g, '{$1}')
    .replace(/\\\+?w\s([^|\\]*)(\|[^\\]*)?\\\+?w\*/g, '$1')
    .replace(/\\(fig)\s[\s\S]*?\\fig\*/g, ' ')
    .replace(/\\(?:z\w*|jmp|rb)\s[\s\S]*?\\(?:z\w*|jmp|rb)\*/g, ' ')
    .replace(/\\\+?[a-z]+\d*\*?/g, ' ');
}

function readUsfmFiles(files: { name: string; text: string }[], fileName: string): ReadBible {
  const b = new Builder();
  for (const f of files) {
    let book = -1;
    let chapter = 0;
    // Each \v starts a verse; text runs until the next \v or \c
    const lines = f.text.replace(/\r\n?/g, '\n');
    const id = /\\id\s+(\w{3})/.exec(lines);
    if (!id) continue;
    book = bookIndex(id[1]);
    if (book < 0) {
      b.leftOut.add(id[1]);
      continue;
    }
    const parts = lines.split(/(?=\\c\s+\d+)|(?=\\v\s+\d+)/);
    for (const p of parts) {
      const c = /^\\c\s+(\d+)/.exec(p);
      if (c) {
        chapter = Number(c[1]);
        continue;
      }
      const v = /^\\v\s+(\d+)(?:-\d+)?\s?([\s\S]*)$/.exec(p);
      if (!v || !chapter) continue;
      // Headings, paragraph marks and the like between verses carry no verse words
      const body = v[2].replace(/\\(?:s\d?|ms\d?|mr|r|d|sp|cl|cp|cd|rem|periph|toc\d|h|mt\d?|imt\d?|ip|is\d?)\s[^\n]*/g, ' ');
      b.add(book, chapter, Number(v[1]), usfmVerseText(body));
    }
  }
  return b.done(stripExt(fileName), '', 'USFM');
}

// ---- JSON (the built-in format, and BibleSuperSearch's) -----------------------------------------

function readJson(text: string, fileName: string): ReadBible {
  const data = JSON.parse(text);
  const b = new Builder();
  let name = stripExt(fileName);
  let abbr = '';
  if (Array.isArray(data) && data[0]?.chapters) {
    data.forEach((book: BibleBook, i: number) => {
      const bi = bookIndex(book.abbrev ?? '') >= 0 ? bookIndex(book.abbrev) : bookIndex(book.name ?? '') >= 0 ? bookIndex(book.name) : data.length === 66 ? i : -1;
      if (bi < 0) {
        b.leftOut.add(book.name ?? book.abbrev);
        return;
      }
      book.chapters.forEach((ch, c) => ch.forEach((v, n) => b.add(bi, c + 1, n + 1, String(v ?? ''))));
    });
  } else if (data?.verses && Array.isArray(data.verses)) {
    name = data.metadata?.name ?? name;
    abbr = data.metadata?.shortname ?? '';
    for (const v of data.verses) {
      const bi = v.book >= 1 && v.book <= 66 ? v.book - 1 : bookIndex(v.book_name ?? '');
      if (bi < 0) b.leftOut.add(v.book_name ?? String(v.book));
      else b.add(bi, Number(v.chapter), Number(v.verse), String(v.text ?? ''));
    }
  } else {
    throw new Error('This JSON file isn’t a Bible Voice Verses knows. It reads the built-in format and BibleSuperSearch’s.');
  }
  return b.done(name, abbr, 'JSON');
}

// ---- Reading any file ----------------------------------------------------------------------------

const stripExt = (n: string) => n.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Bible';

function textOf(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');
}

/**
 * The Bible's own name in a package: Digital Bible Library metadata (eBible.org's zips:
 * "World English Bible Classic", "WEB"), else the title of its copyright page.
 */
function nameFromPackage(files: { name: string; text: string }[]): { name?: string; abbreviation?: string } {
  const meta = files.find((f) => /<DBLMetadata\b/i.test(f.text.slice(0, 600)));
  if (meta) {
    const tag = (t: string) => decode(new RegExp(`<${t}>([^<]*)</${t}>`, 'i').exec(meta.text)?.[1] ?? '').trim();
    const name = tag('nameLocal') || tag('name');
    if (name) return { name, abbreviation: tag('abbreviationLocal') || undefined };
  }
  const copr = files.find((f) => /copr\.html?$/i.test(f.name));
  const title = copr && decode(/<title>([^<]*)<\/title>/i.exec(copr.text)?.[1] ?? '').trim();
  return title ? { name: title } : {};
}

function withName(read: ReadBible, named: { name?: string; abbreviation?: string }): ReadBible {
  if (!named.name) return read;
  return { ...read, name: named.name, abbreviation: named.abbreviation || shortName(named.name) };
}

/** Reads a Bible file (XML, USFM, JSON, or a .zip of USFM or XML files) into the 66 books */
export function readBibleFile(fileName: string, bytes: Uint8Array): ReadBible {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const files = Object.entries(unzipSync(bytes))
      .filter(([n, d]) => d.length && !n.endsWith('/') && !/(^|\/)(__MACOSX|\.)/.test(n))
      .map(([n, d]) => ({ name: n, text: textOf(d) }));
    const named = nameFromPackage(files);
    const usfm = files.filter((f) => /\\id\s+\w{3}/.test(f.text));
    if (usfm.length) return withName(readUsfmFiles(usfm, fileName), named);
    const xml = files.find((f) => /<(osis|usfx|xmlbible)\b/i.test(f.text));
    if (xml) return withName(readBibleText(xml.name, xml.text, stripExt(fileName)), named);
    throw new Error('No Bible was found in this .zip. Voice Verses reads USFM, OSIS, USFX and Zefania files.');
  }
  return readBibleText(fileName, textOf(bytes));
}

function readBibleText(fileName: string, text: string, nameIfNone?: string): ReadBible {
  const head = text.slice(0, 4000);
  const name = nameIfNone ?? fileName;
  if (/^\s*[[{]/.test(head)) return readJson(text, name);
  if (/<osis\b/i.test(head)) return readOsis(text, name);
  if (/<usfx\b/i.test(head)) return readUsfx(text, name);
  if (/<xmlbible\b/i.test(head)) return readZefania(text, name);
  if (/\\id\s+\w{3}/.test(head)) {
    // Several books joined in one file: split at each \id
    const books = text.split(/(?=\\id\s+\w{3})/).map((t, i) => ({ name: `${i}`, text: t }));
    return readUsfmFiles(books, name);
  }
  throw new Error('Voice Verses can’t read this file as a Bible. It reads OSIS, USFX and Zefania XML, USFM, and JSON.');
}
