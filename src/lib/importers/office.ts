/**
 * Reading PowerPoint (.pptx) and Word (.docx) files (1.19.7). Both are zip files of XML; they
 * are unzipped here (fflate) and read with a few regular expressions, so this also runs in
 * Node for the checks. Only words, pictures and speaker notes are taken: never a layout.
 * Older .ppt and .doc files are not zip files: the review says to save them again as
 * .pptx/.docx (or PDF).
 */
import { unzipSync, strFromU8 } from 'fflate';

export interface PresentationPage {
  /** The slide's title, if it has one */
  title?: string;
  /** All its words, a line per paragraph */
  text: string;
  /** Its biggest picture, as a data: URL */
  picture?: string;
  /** The speaker notes under it */
  notes?: string;
}

export interface NotesDocument {
  /** Paragraphs in order, with what kind each is */
  paragraphs: { text: string; heading: boolean; title: boolean; numbered: boolean }[];
}

/** Says what is wrong with a file, in words for the person adding it. */
export class FileReadError extends Error {}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new FileReadError('This looks like an older PowerPoint or Word file. Open it and save it again as .pptx or .docx (or as PDF), then add it.');
  try {
    return unzipSync(bytes, { filter: (f) => !/\.(mp4|m4v|mov|wav|mp3|m4a|wmv|avi)$/i.test(f.name) });
  } catch {
    throw new FileReadError('This file couldn’t be opened. It may be damaged, or protected with a password.');
  }
}

const text = (files: Record<string, Uint8Array>, path: string) => (files[path] ? strFromU8(files[path]) : '');

/** The relationships of a part: id → target path (resolved against the part's folder). */
function rels(files: Record<string, Uint8Array>, part: string): Map<string, { target: string; type: string }> {
  const dir = part.slice(0, part.lastIndexOf('/'));
  const relPath = `${dir}/_rels/${part.slice(part.lastIndexOf('/') + 1)}.rels`;
  const out = new Map<string, { target: string; type: string }>();
  for (const m of text(files, relPath).matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attr = (n: string) => new RegExp(`${n}="([^"]*)"`).exec(m[1])?.[1] ?? '';
    const target = attr('Target');
    if (!target || attr('TargetMode') === 'External') continue;
    const parts = `${dir}/${target}`.split('/');
    const resolved: string[] = [];
    for (const p of parts) {
      if (p === '..') resolved.pop();
      else if (p && p !== '.') resolved.push(p);
    }
    out.set(attr('Id'), { target: resolved.join('/'), type: attr('Type') });
  }
  return out;
}

/** Paragraphs of DrawingML text (<a:p> with <a:t> runs). */
const drawingParagraphs = (xml: string) =>
  [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>|<a:p\s[^>]*>([\s\S]*?)<\/a:p>/g)]
    .map((p) => decode([...(p[1] ?? p[2] ?? '').matchAll(/<a:t>([\s\S]*?)<\/a:t>|<a:t\s[^>]*>([\s\S]*?)<\/a:t>/g)].map((t) => t[1] ?? t[2] ?? '').join('')).trim())
    .filter(Boolean);

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };

function toDataUrl(bytes: Uint8Array, ext: string): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${MIME[ext]};base64,${btoa(binary)}`;
}

/** The slides of a PowerPoint file, in order: title, words, biggest picture, speaker notes. */
export function readPptx(bytes: Uint8Array): PresentationPage[] {
  const files = unzip(bytes);
  const presentation = text(files, 'ppt/presentation.xml');
  if (!presentation) throw new FileReadError('This isn’t a PowerPoint presentation.');
  const presRels = rels(files, 'ppt/presentation.xml');
  const order = [...presentation.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((m) => presRels.get(m[1])?.target).filter(Boolean) as string[];
  const pages: PresentationPage[] = [];
  for (const path of order.slice(0, 300)) {
    const xml = text(files, path);
    if (!xml || /<p:sld\b[^>]*\bshow="0"/.test(xml)) continue; // a hidden slide
    // The title: the shape whose placeholder is a title
    let title: string | undefined;
    for (const sp of xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
      if (/<p:ph\b[^>]*type="(?:title|ctrTitle)"/.test(sp[1])) {
        title = drawingParagraphs(sp[1]).join(' ') || undefined;
        break;
      }
    }
    // Words, without the slide number, date and footer placeholders
    const body = xml.replace(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<p:ph\b[^>]*type="(?:sldNum|dt|ftr)"[\s\S]*?<\/p:sp>/g, '');
    const lines = drawingParagraphs(body);
    const slideRels = rels(files, path);
    // The biggest picture it uses
    let picture: string | undefined;
    let size = 0;
    for (const blip of xml.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g)) {
      const target = slideRels.get(blip[1])?.target;
      const ext = target?.split('.').pop()?.toLowerCase() ?? '';
      const data = target ? files[target] : undefined;
      if (data && MIME[ext] && data.length > size && data.length < 12_000_000) {
        size = data.length;
        picture = toDataUrl(data, ext);
      }
    }
    // Speaker notes: the notes page's body placeholder
    let notes: string | undefined;
    const notesRel = [...slideRels.values()].find((r) => r.type.endsWith('/notesSlide'));
    if (notesRel) {
      const notesXml = text(files, notesRel.target);
      for (const sp of notesXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
        if (/<p:ph\b[^>]*type="body"/.test(sp[1])) notes = drawingParagraphs(sp[1]).join('\n') || undefined;
      }
    }
    const words = lines.filter((l) => l !== title);
    pages.push({ title, text: words.join('\n'), picture, notes });
  }
  if (!pages.length) throw new FileReadError('No slides were found in this presentation.');
  return pages;
}

/** The paragraphs of a Word document, with headings, the title and numbered lines marked. */
export function readDocx(bytes: Uint8Array): NotesDocument {
  const files = unzip(bytes);
  const xml = text(files, 'word/document.xml');
  if (!xml) throw new FileReadError('This isn’t a Word document.');
  const paragraphs: NotesDocument['paragraphs'] = [];
  for (const p of xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)) {
    const inner = p[1];
    const words = decode(
      [...inner.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)]
        .map((t) => (t[0].startsWith('<w:t') ? t[1] : ' '))
        .join(''),
    )
      .replace(/\s+/g, ' ')
      .trim();
    if (!words) continue;
    const style = /<w:pStyle\b[^>]*w:val="([^"]+)"/.exec(inner)?.[1] ?? '';
    paragraphs.push({
      text: words,
      title: /^(Title|Subtitle)$/i.test(style),
      heading: /^Heading[1-3]$|^berschrift/i.test(style),
      numbered: /<w:numPr>/.test(inner) && !/<w:ilvl\b[^>]*w:val="[1-9]"/.test(inner),
    });
  }
  return { paragraphs };
}

/** Plain text or Markdown notes, read the same way: # headings, numbered lines. */
export function readTextNotes(source: string): NotesDocument {
  const paragraphs: NotesDocument['paragraphs'] = [];
  for (const raw of source.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const md = /^(#{1,3})\s+(.*)$/.exec(line);
    paragraphs.push({
      text: (md ? md[2] : line).replace(/\*\*|__/g, '').trim(),
      title: !!md && md[1] === '#' && paragraphs.length === 0,
      heading: !!md && !(md[1] === '#' && paragraphs.length === 0),
      numbered: /^((\d{1,2}|[IVX]{1,4})[.)]|Point\s+\d+[:.)-])\s+/i.test(line),
    });
  }
  return { paragraphs };
}
