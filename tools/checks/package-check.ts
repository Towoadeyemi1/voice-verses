/**
 * Checks the service package (1.19.6, src/lib/servicePackage.ts) in Node: the example in
 * docs/api/examples/sunday-package.json becomes a service with its parts, songs (and the
 * song library), scriptures expected in the sermon, announcements and notes; the same
 * package again updates that service; a broken package is refused in plain words; and a
 * service goes back out as a package. Storage is kept in memory here. CI CHECK 12:
 *   npx esbuild tools/checks/package-check.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/package-check.cjs && node /tmp/package-check.cjs
 */
const store = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
(globalThis as unknown as Record<string, unknown>).window = globalThis;
import { readFileSync } from 'node:fs';
import { ServiceStorage } from '@/lib/serviceStorage';
import { PackageError, packageFromService, parsePackage, receivePackage } from '@/lib/servicePackage';
import { subscribe } from '@/core/bus';
import type { MediaItem, Service } from '@/types/service';

const services: Service[] = [];
const media: MediaItem[] = [];
Object.assign(ServiceStorage, {
  getServices: async () => services.map((s) => ({ ...s })),
  saveService: async (s: Service) => {
    const i = services.findIndex((x) => x.id === s.id);
    if (i >= 0) services[i] = s;
    else services.push(s);
  },
  getMedia: async () => media.slice(),
  saveMediaItem: async (m: MediaItem) => void media.push(m),
});

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

(async () => {
  const example = JSON.parse(readFileSync('docs/api/examples/sunday-package.json', 'utf8'));
  const events: string[] = [];
  subscribe('package.received', (e) => events.push(JSON.stringify(e.data)));

  const got = await receivePackage(example);
  const s = got.service;
  check('the example makes a new service', got.created && services.length === 1);
  check('…on its own day and time, with its type', new Date(s.date).getDate() === 22 && new Date(s.date).getMonth() === 10 && s.startTime === '09:00' && s.type === 'Sunday service');
  check('…remembering where it came from', s.from?.app === 'CCCG Dashboard' && s.from.id === 'cccg-2026-11-22-0900');
  check('every part in order, plus the announcement not placed', s.sections.map((x) => x.name).join('|') === 'Countdown|Worship|Announcements|The Word|Offering|Announcements', s.sections.map((x) => x.name).join('|'));
  const worship = s.sections[1];
  check('songs become their slides, credited', worship.subsections.map((i) => i.name).join('|') === 'Amazing Grace|Holy, Holy, Holy' && worship.subsections[0].slides.length === 2 && worship.subsections[0].slides[0].type === 'lyrics' && /John Newton/.test((worship.subsections[0].slides[0] as { credits?: string }).credits ?? ''));
  check('songs with words go into the song library', got.songsAdded === 2 && media.some((m) => m.name === 'Amazing Grace' && m.type === 'song'));
  check('a part keeps its length, shared by its items', worship.subsections.reduce((t, i) => t + (i.countdown?.durationMinutes ?? 0), 0) === 20 && worship.subsections[0].countdown?.durationMinutes === 10 && s.sections.flatMap((x) => x.subsections).filter((i) => i.countdown).reduce((t, i) => t + i.countdown!.durationMinutes, 0) === 75);
  const word = s.sections[3];
  const scripture = word.subsections.find((i) => i.slides.some((sl) => sl.type === 'scripture'));
  const refs = scripture?.slides.map((sl) => sl.title) ?? [];
  check('the sermon holds its scriptures and the expected ones (a range verse by verse)', refs.join(',') === 'John 3:16,Romans 5:8,Ephesians 2:8,Ephesians 2:9,Titus 2:11', refs.join(','));
  check('…with the Bible’s words', scripture?.slides[0].type === 'scripture' && /For God so loved/.test(scripture.slides[0].verse.text));
  check('sermon points become slides', word.subsections.some((i) => i.slides.length === 2 && i.slides.every((sl) => sl.type === 'announcement')));
  check('the part’s notes reach the stage', word.subsections[0].presenterNotes === 'Three points on grace.');
  check('announcements', s.sections[2].subsections[0].slides[0].type === 'announcement' && s.sections[5].subsections[0].name === 'Prayer meeting');
  check('nothing to check', got.warnings.length === 0, got.warnings.join(' | '));
  check('package.received is announced', events.length === 1 && JSON.parse(events[0]).created === true);

  // The same package again updates that service
  const again = await receivePackage({ ...example, service: { ...example.service, name: 'Sunday Celebration (updated)' } });
  check('the same id updates the same service', !again.created && services.length === 1 && services[0].id === s.id && services[0].name === 'Sunday Celebration (updated)');
  check('…and adds no song twice', again.songsAdded === 0 && media.length === 2);

  // A package without an id, from another app, makes another service
  const other = await receivePackage({ package: '1.0', service: { name: 'Midweek', date: '2026-11-25' }, order: [{ part: 'Worship', songs: ['Amazing Grace', 'Unknown Song'] }], expectedScriptures: [{ reference: 'Hezekiah 4:4' }, { reference: 'Psalm 23' }] }, { app: 'Phone' });
  check('without an id: a new service', other.created && services.length === 2 && other.service.from?.app === 'Phone');
  check('a song from the library by title', other.service.sections[0].subsections[0].slides.length === 2);
  check('what couldn’t be used is said plainly', other.warnings.some((w) => /Unknown Song/.test(w)) && other.warnings.some((w) => /Hezekiah 4:4/.test(w)), other.warnings.join(' | '));
  const loose = other.service.sections.find((x) => x.name === 'Scriptures expected');
  check('expected scriptures with no sermon get their own part; a chapter as its first verse', loose?.subsections[0].slides.map((x) => x.title).join() === 'Psalms 23', loose?.subsections[0].slides.map((x) => x.title).join());

  // Refused
  const refused = (value: unknown) => {
    try {
      parsePackage(value);
      return '';
    } catch (e) {
      return e instanceof PackageError ? e.message : 'other error';
    }
  };
  check('a package without a date is refused, saying why', /service\.date/.test(refused({ package: '1.0', service: { name: 'X' }, order: [] })));
  check('a bad date is refused', /YYYY-MM-DD/.test(refused({ package: '1.0', service: { name: 'X', date: '22/11/2026' } })));
  check('a picture must be http(s) or a data:image', /media/.test(refused({ package: '1.0', service: { name: 'X', date: '2026-11-22' }, media: [{ id: 'm', kind: 'image', url: 'file:///etc/passwd' }] })));
  check('a newer major version is refused', /package/.test(refused({ package: '2.0', service: { name: 'X', date: '2026-11-22' } })));

  // Back out as a package
  const out = packageFromService(services[0]);
  check('a service goes out as a package that reads back', !!parsePackage(out) && out.service.date === '2026-11-22' && out.id === 'cccg-2026-11-22-0900');
  check('…with its order, songs and scriptures', out.order.map((p) => p.part).join('|') === services[0].sections.map((x) => x.name).join('|') && out.songs?.some((x) => x.title === 'Amazing Grace' && /Verse 2/.test(x.lyrics ?? '')) === true && out.order[3].scriptures?.includes('Romans 5:8') === true);
  const round = await receivePackage({ ...out, id: 'round-trip' }, { app: 'Round trip' });
  check('…and in again, the same scriptures', round.service.sections[3].subsections.flatMap((i) => i.slides).filter((x) => x.type === 'scripture').length === 5);

  if (failed) {
    console.error(`\n${failed} package check(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ Service package checks passed');
})();
