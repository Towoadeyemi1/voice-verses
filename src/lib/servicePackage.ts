/**
 * The service package (1.19.6, architecture step 2.3, D35): everything one service needs, in one
 * JSON document, from anywhere: the CCCG Dashboard, Planning Center, a church's own app,
 * sermon preparation, or a file. Voice Verses turns it into a service of that day, with:
 *  - the order of service (parts, with how long each lasts),
 *  - songs with their words and credits (also kept in the song library),
 *  - the scriptures expected, as scripture slides in their part: detection then finds them
 *    more easily (today's plan, +12%, never enough to go up by itself: rule 1), and loading
 *    the part puts the first one in Next,
 *  - announcements, pictures and notes.
 *
 * A package with an `id` updates the service it made before (same source and id); without
 * one, it makes a new service. Described for developers in docs/api/service-package.md.
 */
import { z } from 'zod';
import { BibleParser } from '@/lib/bibleParser';
import { buildSongSlides, ccliLicence } from '@/lib/songs';
import { serviceType } from '@/lib/serviceTypes';
import { ServiceStorage } from '@/lib/serviceStorage';
import { publish } from '@/core/bus';
import type { AnnouncementSlide, ImageSlide, MediaItem, ScriptureSlide, Service, ServiceSection, ServiceSubsection, Slide } from '@/types/service';

export const PACKAGE_VERSION = '1.0';

const text = (max: number) => z.string().trim().max(max);
const id = z.string().trim().min(1).max(120);

const SongSchema = z.object({
  id: id.optional(),
  title: text(200).min(1),
  writers: text(400).optional(),
  copyright: text(400).optional(),
  ccli: text(20).optional(),
  /** Sections separated by blank lines, each starting with its name ("Verse 1", "Chorus") */
  lyrics: text(20_000).optional(),
  arrangement: z.array(text(60)).max(60).optional(),
});

const AnnouncementSchema = z.object({
  id: id.optional(),
  title: text(200).min(1),
  text: text(4000).optional(),
  /** A picture in `media`, by id */
  image: id.optional(),
});

const MediaSchema = z.object({
  id,
  kind: z.enum(['image', 'video', 'presentation', 'document']),
  url: z
    .string()
    .trim()
    .max(3_000_000)
    .refine((u) => /^https?:\/\//i.test(u) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(u), 'an http(s) address or a data:image'),
  name: text(200).optional(),
});

const PartSchema = z.object({
  part: text(120).min(1),
  minutes: z.number().min(0).max(600).optional(),
  /** Songs in `songs`, by id or title (or in the church's song library, by title) */
  songs: z.array(text(200)).max(40).optional(),
  /** References read in this part, e.g. "John 3:16", "Romans 8:28-30" */
  scriptures: z.array(text(60)).max(100).optional(),
  /** Announcements in `announcements`, by id or title */
  announcements: z.array(text(200)).max(40).optional(),
  /** Slides of words, e.g. sermon points */
  slides: z.array(z.object({ title: text(200).optional(), text: text(4000) })).max(100).optional(),
  /** Pictures in `media`, by id */
  media: z.array(id).max(60).optional(),
  notes: text(4000).optional(),
});

export const ServicePackageSchema = z.object({
  package: z.string().regex(/^1\.\d+$/, 'package must be "1.0"'),
  /** The sender's own id for this service: a later package with the same id updates it */
  id: id.optional(),
  service: z.object({
    name: text(200).min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'service.date must be YYYY-MM-DD'),
    time: z.string().regex(/^\d{1,2}:\d{2}$/, 'service.time must be HH:MM').optional(),
    type: text(80).optional(),
  }),
  source: z.object({ app: text(80).min(1), updatedAt: text(40).optional(), url: text(500).optional() }).optional(),
  order: z.array(PartSchema).max(100).default([]),
  expectedScriptures: z.array(z.object({ reference: text(60).min(1), part: text(120).optional() })).max(200).optional(),
  songs: z.array(SongSchema).max(60).optional(),
  announcements: z.array(AnnouncementSchema).max(60).optional(),
  media: z.array(MediaSchema).max(100).optional(),
  notes: text(20_000).optional(),
});

export type ServicePackage = z.infer<typeof ServicePackageSchema>;

/** Why a package can't be used, in words for the person who sent it. */
export class PackageError extends Error {}

/** Checks a package; throws PackageError with what is wrong. */
export function parsePackage(input: unknown): ServicePackage {
  const result = ServicePackageSchema.safeParse(input);
  if (result.success) return result.data;
  const first = result.error.issues.slice(0, 3).map((i) => `${i.path.join('.') || 'package'}: ${i.message}`);
  throw new PackageError(`This isn’t a service package Voice Verses can read (${first.join('; ')}).`);
}

export const looksLikePackage = (value: unknown): boolean => !!value && typeof value === 'object' && 'package' in (value as object) && 'service' in (value as object);

const same = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** A local date from "YYYY-MM-DD" (not UTC midnight, which is the day before west of London). */
const localDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The part the sermon is in, for expected scriptures that don't name one. */
const SERMON = /word|sermon|message|preach|teaching|bible/i;

/**
 * A written reference as scripture slides, a verse per slide: "John 3:16", "Romans 8:28-30"
 * (at most 30 verses), "Psalm 23" (a chapter alone: its first verse). None if not in the Bible.
 */
export async function scriptureSlidesFor(reference: string, newId: () => string): Promise<ScriptureSlide[]> {
  const ref = reference.replace(/[–—]/g, '-').trim();
  let verses = /[:.]\s*\d+\s*-\s*\d+$/.test(ref) || /^\D*\d*\s*\D+\s+\d+$/.test(ref) ? await BibleParser.parseReferenceRange(ref).catch(() => []) : [];
  if (!verses.length) {
    const one = await BibleParser.parseReference(ref).catch(() => null);
    verses = one ? [one] : [];
  }
  const chapterOnly = !/[:.]\s*\d+/.test(ref);
  return (chapterOnly ? verses.slice(0, 1) : verses.slice(0, 30)).map((v) => ({
    id: newId(),
    type: 'scripture',
    title: chapterOnly ? `${v.book} ${v.chapter}` : `${v.book} ${v.chapter}:${v.verse}`,
    verse: v,
  }));
}

export interface Received {
  service: Service;
  created: boolean;
  /** What couldn't be used, in plain words */
  warnings: string[];
  /** Songs added to the song library */
  songsAdded: number;
}

/**
 * Turns a package into a service and saves it (updating the one it made before, if any).
 * Songs with words go into the song library too, unless already there.
 */
export async function receivePackage(input: unknown, how: { app?: string } = {}): Promise<Received> {
  const pkg = parsePackage(input);
  const warnings: string[] = [];
  const app = pkg.source?.app ?? how.app ?? 'a file';
  const stamp = Date.now().toString(36);
  let n = 0;
  const newId = (kind: string) => `pkg-${stamp}-${kind}${n++}`;

  // Songs: from the package, or the church's library by title or CCLI number
  const library = (await ServiceStorage.getMedia()).filter((m) => m.type === 'song');
  const findSong = (key: string) => {
    const s = (pkg.songs ?? []).find((x) => x.id === key || same(x.title, key));
    if (s) return { title: s.title, lyrics: s.lyrics, author: s.writers, copyright: s.copyright, ccliNumber: s.ccli, arrangement: s.arrangement };
    const m = library.find((x) => same(x.name, key) || (x.ccliNumber && x.ccliNumber === key));
    return m ? { title: m.name, lyrics: m.lyrics, author: m.author, copyright: m.copyright, ccliNumber: m.ccliNumber, arrangement: m.arrangement } : null;
  };
  let songsAdded = 0;
  for (const s of pkg.songs ?? []) {
    if (!s.lyrics) continue;
    const known = library.find((m) => (s.ccli && m.ccliNumber === s.ccli) || same(m.name, s.title));
    if (known) continue;
    const item: MediaItem = { id: newId('song'), type: 'song', name: s.title, lyrics: s.lyrics, author: s.writers, copyright: s.copyright, ccliNumber: s.ccli, arrangement: s.arrangement, category: 'From a service package', createdAt: new Date() };
    await ServiceStorage.saveMediaItem(item);
    library.push(item);
    songsAdded++;
  }

  const licence = ccliLicence();
  const songItem = (key: string): ServiceSubsection => {
    const song = findSong(key);
    if (!song) warnings.push(`No words for “${key}”: add the song to the library, or send its words.`);
    else if (!song.lyrics) warnings.push(`No words for “${song.title}”.`);
    const slides = song?.lyrics ? buildSongSlides({ title: song.title, lyrics: song.lyrics, author: song.author, copyright: song.copyright, ccliNumber: song.ccliNumber, arrangement: song.arrangement }, { licence }) : [];
    slides.forEach((s) => (s.id = newId('slide')));
    return { id: newId('item'), name: song?.title ?? key, slides };
  };

  const mediaById = new Map((pkg.media ?? []).map((m) => [m.id, m]));
  const picture = (mediaId: string, title: string): ImageSlide | null => {
    const m = mediaById.get(mediaId);
    if (!m) {
      warnings.push(`No picture “${mediaId}” in the package.`);
      return null;
    }
    if (m.kind !== 'image') {
      warnings.push(`“${m.name ?? m.id}” is a ${m.kind}: add it to the service from a file.`);
      return null;
    }
    return { id: newId('slide'), type: 'image', title: m.name ?? title, imageUrl: m.url };
  };

  const announcementSlides = (key: string): Slide[] => {
    const a = (pkg.announcements ?? []).find((x) => x.id === key || same(x.title, key));
    if (!a) {
      warnings.push(`No announcement “${key}” in the package.`);
      return [];
    }
    const slide: AnnouncementSlide = { id: newId('slide'), type: 'announcement', title: a.title, content: a.text ? `${a.title}\n${a.text}` : a.title };
    if (a.image) {
      const img = mediaById.get(a.image);
      if (img?.kind === 'image') slide.imageUrl = img.url;
    }
    return [slide];
  };

  // Scripture: each reference as slides, a verse per slide (a chapter alone: its first verse)
  const scriptureSlides = async (reference: string): Promise<ScriptureSlide[]> => {
    const slides = await scriptureSlidesFor(reference, () => newId('slide'));
    if (!slides.length) warnings.push(`Couldn’t find “${reference}” in the Bible.`);
    return slides;
  };

  // Expected scriptures go to the part they name, else the sermon
  const expectedFor = new Map<string, string[]>();
  const unplaced: string[] = [];
  for (const e of pkg.expectedScriptures ?? []) {
    const part = e.part ? pkg.order.find((p) => same(p.part, e.part)) : pkg.order.find((p) => SERMON.test(p.part));
    if (part) expectedFor.set(part.part, [...(expectedFor.get(part.part) ?? []), e.reference]);
    else unplaced.push(e.reference);
  }

  const sections: ServiceSection[] = [];
  for (const part of pkg.order) {
    const items: ServiceSubsection[] = [];
    for (const key of part.songs ?? []) items.push(songItem(key));
    const refs = [...(part.scriptures ?? []), ...(expectedFor.get(part.part) ?? [])].filter((r, i, all) => all.findIndex((x) => same(x, r)) === i);
    if (refs.length) {
      const slides = (await Promise.all(refs.map(scriptureSlides))).flat();
      if (slides.length) items.push({ id: newId('item'), name: refs.length === 1 ? refs[0] : 'Scripture', slides });
    }
    if (part.slides?.length) {
      items.push({
        id: newId('item'),
        name: part.part,
        slides: part.slides.map((s, i) => ({ id: newId('slide'), type: 'announcement', title: s.title ?? `${part.part} ${i + 1}`, content: s.title ? `${s.title}\n${s.text}` : s.text })),
      });
    }
    for (const key of part.announcements ?? []) {
      const slides = announcementSlides(key);
      if (slides.length) items.push({ id: newId('item'), name: slides[0].title, slides });
    }
    const pictures = (part.media ?? []).map((m) => picture(m, part.part)).filter(Boolean) as ImageSlide[];
    if (pictures.length) items.push({ id: newId('item'), name: pictures.length === 1 ? pictures[0].title : `${part.part}: pictures`, slides: pictures });
    if (!items.length) items.push({ id: newId('item'), name: part.part, slides: [] });
    // The part's length, shared by its items (the timeline and Move on by time read each item's)
    if (part.minutes) {
      const each = Math.round((part.minutes / items.length) * 10) / 10;
      items.forEach((it, i) => (it.countdown = { enabled: false, durationMinutes: i === items.length - 1 ? Math.round((part.minutes! - each * (items.length - 1)) * 10) / 10 : each, displayTargets: ['confidence'], alertEnabled: false }));
    }
    if (part.notes) items[0].presenterNotes = part.notes;
    sections.push({ id: newId('part'), name: part.part, subsections: items });
  }
  if (unplaced.length) {
    const slides = (await Promise.all(unplaced.map(scriptureSlides))).flat();
    if (slides.length) sections.push({ id: newId('part'), name: 'Scriptures expected', subsections: [{ id: newId('item'), name: 'Scripture', slides }] });
  }
  // Announcements not placed in a part get their own
  const placed = new Set(pkg.order.flatMap((p) => p.announcements ?? []).map((k) => k.toLowerCase()));
  const loose = (pkg.announcements ?? []).filter((a) => !placed.has(a.title.toLowerCase()) && !(a.id && placed.has(a.id.toLowerCase())));
  if (loose.length) sections.push({ id: newId('part'), name: 'Announcements', subsections: loose.map((a) => ({ id: newId('item'), name: a.title, slides: announcementSlides(a.id ?? a.title) })) });

  const services = await ServiceStorage.getServices();
  const previous = pkg.id ? services.find((s) => s.from?.id === pkg.id && same(s.from.app, app)) : undefined;
  const date = localDate(pkg.service.date);
  const base = {
    name: pkg.service.name,
    date,
    startTime: pkg.service.time?.padStart(5, '0') ?? previous?.startTime ?? '10:00',
    sections,
    isTemplate: false,
    notes: pkg.notes,
    from: { app, id: pkg.id, updatedAt: pkg.source?.updatedAt, receivedAt: new Date().toISOString() },
  };
  const service: Service = previous
    ? { ...previous, ...base, type: pkg.service.type ?? previous.type }
    : { id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, ...base, type: pkg.service.type ?? serviceType({ name: pkg.service.name, date }) };
  await ServiceStorage.saveService(service);
  publish('package.received', { serviceId: service.id, name: service.name, date: pkg.service.date, from: app, created: !previous, warnings: warnings.length }, 'services');
  return { service, created: !previous, warnings, songsAdded };
}

/** A service as a package, for other apps (GET /api/v1/services/{id}/package) and for saving. */
export function packageFromService(service: Service): ServicePackage {
  const d = new Date(service.date);
  const day = Number.isNaN(d.getTime()) ? '1970-01-01' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Songs rebuilt from their slides: each section's words once, its order as the arrangement
  const songs = new Map<string, { sections: Map<string, string[]>; arrangement: string[]; last: string | null; firstTime: boolean }>();
  const announcements: NonNullable<ServicePackage['announcements']> = [];
  const media: NonNullable<ServicePackage['media']> = [];
  const order = service.sections.map((sec) => {
    const part: ServicePackage['order'][number] = { part: sec.name };
    const minutes = sec.subsections.reduce((t, it) => t + (it.countdown?.durationMinutes ?? 0), 0);
    if (minutes) part.minutes = minutes;
    for (const item of sec.subsections) {
      for (const sl of item.slides) {
        if (sl.type === 'lyrics') {
          if (!songs.has(sl.songTitle)) songs.set(sl.songTitle, { sections: new Map(), arrangement: [], last: null, firstTime: true });
          const song = songs.get(sl.songTitle)!;
          const label = sl.sectionLabel || `Part ${song.sections.size + 1}`;
          if (label !== song.last) {
            // A new section begins: sung before (a repeat) or for the first time
            song.arrangement.push(label);
            song.firstTime = !song.sections.has(label);
            if (song.firstTime) song.sections.set(label, []);
            song.last = label;
          }
          // A long section runs over several slides: keep its lines the first time only
          if (song.firstTime) song.sections.get(label)!.push(sl.content);
          part.songs = [...new Set([...(part.songs ?? []), sl.songTitle])];
        } else if (sl.type === 'scripture') {
          part.scriptures = [...(part.scriptures ?? []), `${sl.verse.book} ${sl.verse.chapter}:${sl.verse.verse}`];
        } else if (sl.type === 'announcement') {
          const [title, ...rest] = sl.content.split('\n');
          announcements.push({ id: sl.id, title: sl.title || title, text: rest.join('\n') || undefined });
          part.announcements = [...(part.announcements ?? []), sl.id];
        } else if (sl.type === 'image' && /^https?:/i.test(sl.imageUrl)) {
          media.push({ id: sl.id, kind: 'image', url: sl.imageUrl, name: sl.title });
          part.media = [...(part.media ?? []), sl.id];
        }
      }
    }
    return part;
  });
  return {
    package: PACKAGE_VERSION,
    id: service.from?.id ?? service.id,
    service: { name: service.name, date: day, time: service.startTime, type: service.type },
    source: { app: 'Voice Verses', updatedAt: service.updatedAt },
    order,
    songs: [...songs.entries()].map(([title, song]) => ({
      title,
      lyrics: [...song.sections.entries()].map(([label, lines]) => `${label}\n${lines.join('\n')}`).join('\n\n'),
      arrangement: song.arrangement,
    })),
    announcements,
    media,
    notes: service.notes,
  };
}
