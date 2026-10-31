/**
 * Translations read from the internet, a chapter at a time:
 * - API.Bible (the American Bible Society's licensed service): NKJV, NIV, CSB,
 *   NASB, AMP and many more, as licensed to the church's API.Bible key.
 * - ESV (Crossway, api.esv.org) and NLT (Tyndale, api.nlt.to) with their own free keys.
 *
 * A chapter is fetched once and kept in memory for the session, so following a
 * reading needs no further requests. Nothing is stored on disk: the publishers'
 * terms limit keeping their text.
 */

export interface ApiBibleVersion {
  /** API.Bible's id for this Bible */
  id: string;
  abbreviation: string;
  name: string;
}

export interface OnlineChapter {
  verses: Map<number, string>;
  /** API.Bible: reported when a verse from this chapter is shown (fair-use tracking) */
  fumsToken?: string;
  copyright?: string;
}

/** USFM book ids in the order of the 66 books */
export const USFM = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB',
  'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];

const KEYS = { apiBible: 'apibible-key', esv: 'cornerstone-esv-api-key', nlt: 'cornerstone-nlt-api-key' };
const VERSIONS_KEY = 'apibible-versions';
const API = 'https://rest.api.bible/v1';

const read = (key: string) => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

export const apiBibleKey = () => read(KEYS.apiBible);
export function setApiBibleKey(key: string): void {
  localStorage.setItem(KEYS.apiBible, key.trim());
}

/** The API.Bible translations the church has chosen to use. */
export function chosenApiBibles(): ApiBibleVersion[] {
  try {
    return JSON.parse(read(VERSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}
export function setChosenApiBibles(versions: ApiBibleVersion[]): void {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
}

export const isApiBibleVersion = (version: string) => version.startsWith('api:');
export const apiBibleFor = (version: string) => chosenApiBibles().find((b) => `api:${b.id}` === version);

/** Every English Bible the key can read (free ones, plus those licensed to it). */
export async function listApiBibles(key = apiBibleKey()): Promise<ApiBibleVersion[]> {
  const response = await fetch(`${API}/bibles?language=eng`, { headers: { 'api-key': key } });
  if (response.status === 401 || response.status === 403) throw new Error('API.Bible did not accept this key.');
  if (!response.ok) throw new Error(`API.Bible answered ${response.status}.`);
  const data = (await response.json()) as { data: { id: string; abbreviationLocal?: string; abbreviation: string; nameLocal?: string; name: string }[] };
  return data.data
    .map((b) => ({ id: b.id, abbreviation: (b.abbreviationLocal || b.abbreviation).toUpperCase(), name: b.nameLocal || b.name }))
    .sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
}

// ---- Turning each service's text into verses -------------------------------

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–' };
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (ENTITIES[e]) return ENTITIES[e];
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return m;
  });
const tidy = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([,.;:!?’”)])/g, '$1').trim();

/** "[1] In the beginning … [2] And the earth …" (ESV text with verse numbers) */
export function versesFromBracketed(text: string): Map<number, string> {
  const verses = new Map<number, string>();
  const parts = text.split(/\[(\d+)\]/);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    const t = parts[i + 1].replace(/\(ESV\)\s*$/, '').replace(/\s+/g, ' ').trim();
    if (t) verses.set(n, t);
  }
  return verses;
}

/** NLT passage HTML: verse_export blocks (or verse-number spans), without headings and footnotes */
export function versesFromNltHtml(html: string): Map<number, string> {
  const clean = html
    .replace(/<h\d[^>]*>[\s\S]*?<\/h\d>/gi, ' ')
    .replace(/<a\s+class="a-tn"[^>]*>[\s\S]*?<\/a>/gi, '')
    // Footnotes hold a nested reference span: drop that first, then the note
    .replace(/<span\s+class="tn-ref"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+class="tn"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span class="(?:chapter-number|subhead)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' ');
  const verses = new Map<number, string>();
  const blocks = [...clean.matchAll(/<verse_export[^>]*\bvn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/gi)];
  if (blocks.length) {
    for (const [, n, body] of blocks) {
      const text = tidy(body.replace(/<span class="vn"[^>]*>\s*\d+\s*<\/span>/gi, ' '));
      if (text) verses.set(Number(n), text);
    }
    return verses;
  }
  const parts = clean.split(/<span class="vn"[^>]*>\s*(\d+)\s*<\/span>/i);
  for (let i = 1; i < parts.length; i += 2) {
    const text = tidy(parts[i + 1]);
    if (text) verses.set(Number(parts[i]), text);
  }
  return verses;
}

interface JsonNode {
  type?: string;
  text?: string;
  attrs?: { verseId?: string };
  items?: JsonNode[];
}

/** API.Bible JSON content: text nodes carry the verse they belong to (attrs.verseId "JHN.3.16") */
export function versesFromApiBibleJson(content: JsonNode[]): Map<number, string> {
  const parts = new Map<number, string[]>();
  const walk = (nodes: JsonNode[]) => {
    for (const node of nodes) {
      if (node.type === 'text' && node.text && node.attrs?.verseId) {
        const n = Number(node.attrs.verseId.split('.')[2]);
        if (n) parts.set(n, [...(parts.get(n) ?? []), node.text]);
      }
      if (node.items) walk(node.items);
    }
  };
  walk(content);
  return new Map([...parts].map(([n, texts]) => [n, texts.join('').replace(/\s+/g, ' ').replace(/\s+([,.;:!?’”)])/g, '$1').trim()]));
}

// ---- Fetching ------------------------------------------------------------------

const chapters = new Map<string, Promise<OnlineChapter>>();

async function fetchChapter(version: string, book: string, bookIndex: number, chapter: number): Promise<OnlineChapter> {
  if (version === 'esv') {
    const key = read(KEYS.esv);
    if (!key) throw new Error('No ESV key');
    const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(`${book} ${chapter}`)}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-first-verse-numbers=true&include-short-copyright=false&include-passage-references=false`;
    const response = await fetch(url, { headers: { Authorization: `Token ${key}` } });
    if (!response.ok) throw new Error(`ESV ${response.status}`);
    const data = await response.json();
    return { verses: versesFromBracketed(data.passages?.[0] ?? '') };
  }
  if (version === 'nlt') {
    const key = read(KEYS.nlt);
    if (!key) throw new Error('No NLT key');
    const response = await fetch(`https://api.nlt.to/api/passages?ref=${encodeURIComponent(`${book} ${chapter}`)}&version=NLT&key=${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error(`NLT ${response.status}`);
    return { verses: versesFromNltHtml(await response.text()) };
  }
  const bible = apiBibleFor(version);
  const key = apiBibleKey();
  if (!bible || !key) throw new Error('This translation is not set up');
  const id = `${USFM[bookIndex]}.${chapter}`;
  const response = await fetch(`${API}/bibles/${bible.id}/chapters/${id}?content-type=json&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false&include-verse-spans=false`, {
    headers: { 'api-key': key },
  });
  if (!response.ok) throw new Error(`API.Bible ${response.status}`);
  const data = await response.json();
  return { verses: versesFromApiBibleJson(data.data?.content ?? []), fumsToken: data.meta?.fumsToken, copyright: data.data?.copyright };
}

/** A chapter of an online translation; fetched once per session. */
export function onlineChapter(version: string, book: string, bookIndex: number, chapter: number): Promise<OnlineChapter> {
  const key = `${version}|${bookIndex}|${chapter}`;
  let found = chapters.get(key);
  if (!found) {
    found = fetchChapter(version, book, bookIndex, chapter);
    found.catch(() => chapters.delete(key)); // try again next time
    chapters.set(key, found);
  }
  return found;
}

// ---- API.Bible fair-use reporting ---------------------------------------------
// Each time licensed text is shown, its token is reported (required by API.Bible).

const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const sessionId = randomId();
function deviceId(): string {
  let id = read('apibible-device');
  if (!id) {
    id = randomId();
    try {
      localStorage.setItem('apibible-device', id);
    } catch {
      // A new id next time
    }
  }
  return id;
}

/** A verse went on screen: report it if it came from API.Bible. */
export function reportScriptureShown(version: string, bookIndex: number, chapter: number): void {
  if (!isApiBibleVersion(version)) return;
  chapters
    .get(`${version}|${bookIndex}|${chapter}`)
    ?.then((c) => {
      if (!c.fumsToken) return;
      const url = `https://fums.api.bible/f3?t=${encodeURIComponent(c.fumsToken)}&dId=${deviceId()}&sId=${sessionId}`;
      // An image request: no CORS, nothing to wait for
      new Image().src = url;
    })
    .catch(() => {});
}
