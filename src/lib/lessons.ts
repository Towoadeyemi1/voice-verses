/**
 * Training's lessons (1.19.1). Each step points at a real control on the live
 * screen; Show me does it, Let me try waits for the volunteer and checks what
 * the app really did. Lessons run in practice: nothing reaches the room.
 *
 * Every lesson has its own automatic test (tools/e2e/training.cjs), so a change
 * to the screens can't break one unnoticed.
 */
import type { GuideStep, Lesson } from '@/lib/guide';

const text = (selector: string) => document.querySelector(selector)?.textContent ?? '';
const onLive = (ref: string) => text('[data-label-detail="live"]').includes(ref);
const inNext = (ref: string) => text('[data-label-detail="next"]').includes(ref);
const paletteOpen = () => !!document.querySelector('[cmdk-input]');
const typed = (part: string) => ((document.querySelector('[cmdk-input]') as HTMLInputElement | null)?.value ?? '').includes(part);

const firstSunday: GuideStep[] = [
  { say: 'This is the live screen. Everything for the service happens here.', why: 'In this lesson nothing reaches the projector, the stream, the stage or ProPresenter.', watchOnly: true, route: '/' },
  { target: '[data-guide="live"]', say: 'Red is Live. It is what the room sees right now.', watchOnly: true },
  { target: '[data-guide="next"]', say: 'Green is Next. It waits here until you put it up.', watchOnly: true },
  { target: '[data-guide="search"]', say: 'To find a verse, click Search.', why: 'Command K does the same from anywhere on the live screen.', click: true, done: paletteOpen },
  { target: '[cmdk-input]', say: 'Type the verse: John 3:16.', type: 'John 3:16', done: () => typed('3:16') },
  {
    target: '[cmdk-input]',
    say: 'Press Return to get it ready.',
    key: 'Enter',
    done: () => !paletteOpen() && (inNext('John 3:16') || onLive('John 3:16')),
    doneSay: () => (onLive('John 3:16') ? 'John 3:16 is on Live.' : 'John 3:16 is waiting in Next.'),
  },
  {
    target: '[data-guide="take"]',
    say: 'Press Take to put it on the screens.',
    why: 'The Space bar does the same.',
    click: true,
    skip: () => onLive('John 3:16'),
    done: () => onLive('John 3:16'),
    doneSay: 'John 3:16 is on Live. In a service, the room would see it now.',
  },
  { target: '[data-guide="clear"]', say: 'Clear takes the words off the screens.', why: 'Esc does the same.', click: true, done: () => !onLive('John 3:16'), doneSay: 'The screens are clear.' },
  { target: '[data-guide="listen"]', say: 'When the service starts, press Start listening. Verses go up as the preacher reads them.', watchOnly: true },
  { say: 'That is your first Sunday. Next, watch the demo to see listening in action.', watchOnly: true },
];

const boothCheck: GuideStep[] = [
  { target: '[data-booth-check]', say: 'This light checks the booth every minute. Amber means something needs a look.', click: true, done: () => !!document.querySelector('[data-booth-check-list]'), route: '/' },
  { target: '[data-booth-check-list]', say: 'Each thing to check has a button that takes you straight to it.', watchOnly: true },
  { target: '[data-booth-check-list]', say: 'During a service, a warning appears with the same button. Fix it, and carry on.', watchOnly: true, key: 'Escape' },
];

export interface LessonCard {
  lesson: Lesson;
  group: 'everyone' | 'setting-up' | 'before-sunday';
  /** Not a step-by-step lesson: Training opens it */
  kind?: 'demo' | 'booth-setup';
}

export const LESSONS: LessonCard[] = [
  { group: 'everyone', lesson: { id: 'first-sunday', title: 'Your first Sunday', desc: 'Red and green, find a verse, Take, Clear, and listening.', steps: firstSunday, minutes: 3 } },
  { group: 'everyone', kind: 'demo', lesson: { id: 'demo', title: 'Watch the demo', desc: 'A short sermon and a hymn, with every step pointed out and explained aloud.', steps: [], minutes: 2 } },
  { group: 'everyone', lesson: { id: 'booth-check', title: 'When something goes wrong', desc: 'The booth check light, and the button that fixes each thing.', steps: boothCheck, minutes: 1 } },
  { group: 'setting-up', kind: 'booth-setup', lesson: { id: 'booth-setup', title: 'Set up your booth', desc: 'Voice Verses finds your microphone, screens and ProPresenter; you confirm each.', steps: [], minutes: 5 } },
];

/** Lessons still to come, shown so the team knows what Training will cover */
export const COMING: { group: LessonCard['group']; title: string; desc: string }[] = [
  { group: 'setting-up', title: 'ProPresenter: verses on your own slide', desc: 'One slide your team puts up and clears. Uses ProPresenter for real.' },
  { group: 'setting-up', title: 'Screens and outputs', desc: 'Projector, stream lower third and stage, by HDMI, SDI or NDI.' },
  { group: 'before-sunday', title: 'Plan a service from a template', desc: 'Pick the type of service, use its template, add songs and verses.' },
  { group: 'before-sunday', title: 'Songs and slides', desc: 'Import a song, edit a slide, change its look.' },
  { group: 'before-sunday', title: 'Teach spirit a cue', desc: '“When the preacher says … get … ready”, and correcting it.' },
];

export const GROUPS: { id: LessonCard['group']; title: string; who: string }[] = [
  { id: 'everyone', title: 'Everyone', who: 'Volunteers on Sunday' },
  { id: 'setting-up', title: 'Setting up', who: 'Once, by whoever sets up the booth' },
  { id: 'before-sunday', title: 'Before Sunday', who: 'Planning' },
];

export const lessonById = (id: string) => LESSONS.find((c) => c.lesson.id === id);
