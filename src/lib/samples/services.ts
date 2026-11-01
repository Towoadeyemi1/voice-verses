/**
 * Three complete sample services, so a new church sees what Voice Verses does
 * from the first opening: countdown, welcome, worship, prayer, notices,
 * offering, a sermon with its scripture outline, response and blessing.
 * Scripture comes from the bundled KJV; songs are public domain.
 */
import { BibleParser } from '@/lib/bibleParser';
import { buildSongSlides } from '@/lib/songs';
import type { CountdownConfig, Service, ServiceSection, ServiceSubsection, Slide } from '@/types/service';
import { SAMPLE_HYMNS, SampleSong } from './hymns';
import { SAMPLE_CAROLS } from './carols';

export const ALL_SAMPLE_SONGS: SampleSong[] = [...SAMPLE_HYMNS, ...SAMPLE_CAROLS];

let n = 0;
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(n++).toString(36)}`;

const note = (title: string, content: string, templateId?: string): Slide => ({ id: id('slide'), type: 'announcement', title, content, templateId });

async function verses(book: string, chapter: number, from: number, to = from, templateId?: string): Promise<Slide[]> {
  const out: Slide[] = [];
  for (let v = from; v <= to; v++) {
    const verse = await BibleParser.getVerse(book, chapter, v);
    if (verse) out.push({ id: id('slide'), type: 'scripture', title: `${book} ${chapter}:${v}`, verse, templateId });
  }
  return out;
}

const song = (songId: string, templateId?: string): Slide[] => {
  const s = ALL_SAMPLE_SONGS.find((x) => x.id === songId)!;
  return buildSongSlides(s, { linesPerSlide: 2 }).map((slide) => ({ ...slide, id: id('slide'), templateId }));
};

const countdown = (minutes: number): CountdownConfig => ({
  enabled: true,
  mode: 'duration',
  durationMinutes: minutes,
  message: 'We begin in',
  projector: 'full',
  displayTargets: ['main', 'confidence', 'stream'],
  alertEnabled: false,
});
const timer = (minutes: number): CountdownConfig => ({ enabled: false, durationMinutes: minutes, displayTargets: ['confidence'], alertEnabled: false });

const item = (name: string, slides: Slide[], minutes: number, extra: Partial<ServiceSubsection> = {}): ServiceSubsection => ({
  id: id('item'),
  name,
  slides,
  countdown: timer(minutes),
  ...extra,
});
const section = (name: string, subsections: ServiceSubsection[]): ServiceSection => ({ id: id('section'), name, subsections });

const at = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const nextWeekday = (day: number) => {
  const d = at(new Date());
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7 || 7));
  return d;
};

async function sundayCelebration(): Promise<Service> {
  return {
    id: id('service'),
    name: 'Sample: Sunday Celebration',
    date: at(new Date()),
    startTime: '10:00',
    isTemplate: false,
    sample: true,
    sections: [
      section('Before the service', [
        item('Countdown', [note('Welcome', 'We are glad you are here. The service begins in a few minutes.')], 5, { countdown: countdown(5) }),
        item('Welcome', [note('Welcome home', 'New here? Visit the welcome desk after the service.'), note('Before we begin', 'Please set your phone to silent.')], 3),
      ]),
      section('Worship', [
        item('Holy, Holy, Holy', song('sample-song-holy-holy-holy'), 5),
        item('Blessed Assurance', song('sample-song-blessed-assurance'), 5),
        item('Amazing Grace', song('sample-song-amazing-grace'), 5),
      ]),
      section('Prayer', [item('Prayer', await verses('Philippians', 4, 6, 7), 4)]),
      section('Notices', [
        item('Notices', [
          note('Youth night', 'Friday at 7pm in the main hall. Everyone aged 11–18 welcome.'),
          note('Baptism class', 'Thinking about baptism? The next class starts Sunday at 12:30.'),
          note('Serve with us', 'The media team needs volunteers. No experience needed: we will train you.'),
        ], 4),
      ]),
      section('Offering', [item('Offering', [...(await verses('2 Corinthians', 9, 7)), note('Giving', 'Give at the back, by card at the welcome desk, or online.')], 4)]),
      section('The Word', [
        item('Reading: Ephesians 2', await verses('Ephesians', 2, 4, 10), 4),
        item('Sermon: Grace that changes everything', [
          note('Grace that changes everything', 'Ephesians 2:8–9'),
          ...(await verses('Ephesians', 2, 8, 9)),
          note('1. Grace finds us', 'God loved us before we ever loved Him.'),
          ...(await verses('Romans', 5, 8)),
          note('2. Grace changes us', 'Grace saves us, and then it teaches us how to live.'),
          ...(await verses('Titus', 2, 11, 12)),
          note('3. Grace sends us', 'What we have received, we give away.'),
          ...(await verses('John', 3, 16)),
        ], 35),
      ]),
      section('Response', [item('It Is Well with My Soul', song('sample-song-it-is-well'), 5)]),
      section('Closing', [
        item('The Doxology', song('sample-song-doxology'), 2),
        item('Blessing', await verses('Numbers', 6, 24, 26), 2),
      ]),
    ],
  };
}

async function carolService(): Promise<Service> {
  const year = new Date().getMonth() === 11 && new Date().getDate() > 20 ? new Date().getFullYear() + 1 : new Date().getFullYear();
  const stars = 'starter-scripture-stars';
  const lights = 'starter-lyrics-lights';
  return {
    id: id('service'),
    name: 'Sample: Christmas Carols by Candlelight',
    date: new Date(year, 11, 20),
    startTime: '18:00',
    isTemplate: false,
    sample: true,
    sections: [
      section('Welcome', [item('Countdown', [note('Carols by Candlelight', 'Welcome. We begin in a few minutes.')], 5, { countdown: countdown(5) })]),
      section('First reading', [item('Isaiah 9', await verses('Isaiah', 9, 6, 7, stars), 3)]),
      section('Carols', [item('O Come, All Ye Faithful', song('sample-song-o-come-all-ye-faithful', lights), 5)]),
      section('Second reading', [item('Luke 2', await verses('Luke', 2, 8, 14, stars), 4)]),
      section('Carols', [item('Silent Night', song('sample-song-silent-night', lights), 5)]),
      section('Third reading', [item('John 1', await verses('John', 1, 14, 14, stars), 2)]),
      section('Closing', [item('Joy to the World', song('sample-song-joy-to-the-world', lights), 4)]),
    ],
  };
}

async function bibleStudy(): Promise<Service> {
  return {
    id: id('service'),
    name: 'Sample: Midweek Bible Study',
    date: nextWeekday(3),
    startTime: '19:00',
    isTemplate: false,
    sample: true,
    sections: [
      section('Opening', [item('Be Thou My Vision', song('sample-song-be-thou-my-vision'), 4)]),
      section('Study', [
        item('Psalm 23', await verses('Psalms', 23, 1, 6), 10),
        item('Talk together', [
          note('Talk together', 'Where have you seen God lead you this year?'),
          note('Talk together', 'Which line of the psalm do you need most this week?'),
        ], 25),
      ]),
      section('Prayer', [item('Prayer', [note('Pray for one another', 'Share one thing to pray about, then pray in twos or threes.')], 15)]),
    ],
  };
}

/** The sample services, built fresh (with today's dates). */
export async function buildSampleServices(): Promise<Service[]> {
  return [await sundayCelebration(), await carolService(), await bibleStudy()];
}
