/**
 * Add from a file (1.19.7, D36): a presentation (PDF, PowerPoint) or sermon notes (Word,
 * text, Markdown) read into what the review screen shows, then into parts of a service.
 *  - Presentation: its pages or slides (as pictures for a PDF, or as words in the church's
 *    look), speaker notes for the stage monitor, and the scriptures written on them.
 *  - Notes: the scriptures written in them (each with its words, a chapter alone left
 *    unticked), the points (headings and numbered lines, each a slide), and the rest for the
 *    stage monitor.
 * Scriptures become scripture slides, so detection expects them as with a service package.
 */
import { BibleParser } from '@/lib/bibleParser';
import { plainVerseText } from '@/lib/verseText';
import { scriptureSlidesFor } from '@/lib/servicePackage';
import type { AnnouncementSlide, ImageSlide, ServiceSubsection, Slide } from '@/types/service';
import { FileReadError, readDocx, readPptx, readTextNotes, type NotesDocument, type PresentationPage } from './office';
import { findWrittenReferences, type WrittenReference } from './references';

export { FileReadError } from './office';

export const ADD_FROM_FILE_ACCEPT = '.pdf,.pptx,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown';

export interface FoundScripture extends WrittenReference {
  /** The start of its words, in the church's translation */
  preview: string;
  /** Ticked to begin with: yes, except a chapter alone */
  chosen: boolean;
}

export type Found =
  | { kind: 'presentation'; from: 'pdf' | 'pptx'; name: string; pages: (PresentationPage & { image?: string })[]; scriptures: FoundScripture[] }
  | { kind: 'notes'; name: string; scriptures: FoundScripture[]; points: string[]; notes: string };

const MAX_BYTES = 150 * 1024 * 1024;

const kindOf = (name: string) => {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'docx') return 'docx';
  if (ext === 'txt' || ext === 'md' || ext === 'markdown') return 'text';
  if (ext === 'ppt' || ext === 'doc' || ext === 'key' || ext === 'pages') return 'old';
  return 'other';
};

/** The scriptures in some text, with a preview of each (those not in the Bible are dropped). */
export async function scripturesIn(text: string): Promise<FoundScripture[]> {
  const out: FoundScripture[] = [];
  for (const r of findWrittenReferences(text).slice(0, 80)) {
    const verse = await BibleParser.getVerse(r.book, r.chapter, r.verse ?? 1).catch(() => null);
    if (!verse) continue;
    const words = plainVerseText(verse.text);
    out.push({ ...r, preview: r.chapterOnly ? `${r.book} ${r.chapter}, from verse 1: ${words}` : words, chosen: !r.chapterOnly });
  }
  return out;
}

const NUMBERING = /^((\d{1,2}|[IVX]{1,4})[.)]|Point\s+\d+\s*[:.)-])\s*/i;
/** A written reference, to see whether a line is nothing more */
const REFERENCE_TEXT = /((?:[1-3]|I{1,3})\s*)?[A-Z][a-z]+(?:\s+of\s+[A-Z][a-z]+)?\.?\s+\d{1,3}(?:\s*[:.]\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)?(?:\s*,\s*\d{1,3})*/g;

/** Points (headings and short numbered lines), and the notes as plain text. */
export function pointsAndNotes(doc: NotesDocument): { points: string[]; notes: string } {
  const points: string[] = [];
  for (const p of doc.paragraphs) {
    if (p.title || !(p.heading || p.numbered)) continue;
    const text = p.text.replace(NUMBERING, '').trim();
    if (!text || text.length > 120) continue;
    // A line that is only a reference is a scripture, not a point
    if (findWrittenReferences(text).length && !/[A-Za-z]{3,}/.test(text.replace(REFERENCE_TEXT, ''))) continue;
    if (!points.includes(text)) points.push(text);
    if (points.length >= 12) break;
  }
  const notes = doc.paragraphs.map((p) => p.text).join('\n').slice(0, 8000);
  return { points, notes };
}

/** Reads a file for the review screen. Throws FileReadError with words for the operator. */
export async function readForService(file: File, onProgress?: (done: number, total: number) => void): Promise<Found> {
  if (file.size > MAX_BYTES) throw new FileReadError('This file is larger than 150 MB. Save a smaller copy (fewer or smaller pictures), then add it.');
  const kind = kindOf(file.name);
  const name = file.name.replace(/\.[^.]+$/, '');
  if (kind === 'old') throw new FileReadError('Save it again as PDF (Keynote: File → Export To → PDF; PowerPoint: File → Export → PDF), or as .pptx or .docx, then add it.');
  if (kind === 'other') throw new FileReadError('Voice Verses can add a PDF, a PowerPoint (.pptx), a Word document (.docx) or text notes (.txt, .md).');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (kind === 'pdf' || kind === 'pptx') {
    const pages = kind === 'pdf' ? await (await import('./pdf')).readPdf(bytes, onProgress) : readPptx(bytes);
    const scriptures = (await scripturesIn(pages.map((p) => `${p.title ?? ''}\n${p.text}\n${p.notes ?? ''}`).join('\n'))).filter((s) => !s.chapterOnly);
    return { kind: 'presentation', from: kind, name, pages, scriptures };
  }
  const doc = kind === 'docx' ? readDocx(bytes) : readTextNotes(new TextDecoder().decode(bytes));
  if (!doc.paragraphs.length) throw new FileReadError('No words were found in this file.');
  const { points, notes } = pointsAndNotes(doc);
  return { kind: 'notes', name, scriptures: await scripturesIn(notes), points, notes };
}

export interface PresentationChoice {
  /** Pages to add, by index */
  pages: number[];
  /** As pictures, exactly as made (PDF only), or as words in the church's look */
  as: 'pictures' | 'words';
  /** Speaker notes to the stage monitor */
  notesToStage: boolean;
}

export interface NotesChoice {
  scriptures: string[];
  points: string[];
  notesToStage: boolean;
}

let counter = 0;
const newId = (kind: string) => `file-${Date.now().toString(36)}-${kind}${counter++}`;

/** The parts to add to the service, from what the operator chose. */
export async function partsFrom(found: Found, choice: PresentationChoice | NotesChoice): Promise<ServiceSubsection[]> {
  const parts: ServiceSubsection[] = [];
  const scriptures = async (refs: string[]) => {
    const slides = (await Promise.all(refs.map((r) => scriptureSlidesFor(r, () => newId('slide'))))).flat();
    if (slides.length) parts.push({ id: newId('part'), name: 'Scripture', slides });
  };
  if (found.kind === 'presentation') {
    const c = choice as PresentationChoice;
    const slides: Slide[] = c.pages
      .map((i) => found.pages[i])
      .filter(Boolean)
      .map((p, n) => {
        const notes = c.notesToStage ? p.notes : undefined;
        const title = p.title || `${found.name} ${n + 1}`;
        if (c.as === 'pictures' && p.image) return { id: newId('slide'), type: 'image', title, imageUrl: p.image, slideNotes: notes } as ImageSlide;
        // As words: a picture alone stays a picture
        if (!p.text && p.picture && !p.title) return { id: newId('slide'), type: 'image', title, imageUrl: p.picture, slideNotes: notes } as ImageSlide;
        return { id: newId('slide'), type: 'announcement', title, content: [p.title, p.text].filter(Boolean).join('\n') || title, imageUrl: p.picture, slideNotes: notes } as AnnouncementSlide;
      });
    if (slides.length) parts.push({ id: newId('part'), name: found.name, slides });
    await scriptures(found.scriptures.filter((s) => s.chosen).map((s) => s.reference));
  } else {
    const c = choice as NotesChoice;
    await scriptures(c.scriptures);
    if (c.points.length) {
      parts.push({
        id: newId('part'),
        name: 'Points',
        slides: c.points.map((text, i) => ({ id: newId('slide'), type: 'announcement', title: `Point ${i + 1}`, content: text }) as AnnouncementSlide),
      });
    }
    if (c.notesToStage && found.notes && parts[0]) parts[0].presenterNotes = found.notes;
  }
  return parts;
}
