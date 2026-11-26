/**
 * Training's lessons (1.19.1). Each step points at a real control on the live
 * screen; Show me does it, Let me try waits for the volunteer and checks what
 * the app really did. Lessons run in practice: nothing reaches the room.
 *
 * Every lesson has its own automatic test (tools/e2e/training.cjs), so a change
 * to the screens can't break one unnoticed.
 */
import type { GuideStep, Lesson } from '@/lib/guide';
import { loadSpirit, removeCue, updateSpirit } from '@/lib/spirit';

/** Said when a step is done and has nothing of its own to say */
export const THATS_IT = 'That’s it.';

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
    sayings: ['John 3:16 is on Live.', 'John 3:16 is waiting in Next.'],
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
  { target: '[data-booth-check-list]', say: 'Each thing to check has Show me the fix: it opens the right page and lights up the one thing to change.', watchOnly: true },
  { target: '[data-booth-check-list]', say: 'During a service, a warning appears with the same button. When it is fixed, you are back here by yourself.', watchOnly: true, key: 'Escape' },
];

// ---- Screens and outputs (1.19.14) ---------------------------------------------------------

const screens: GuideStep[] = [
  { target: '[data-pane="screens"]', say: 'Screens and outputs is in Settings, under In the booth.', click: true, done: () => !!document.querySelector('[data-screens-page]'), route: '/settings' },
  { target: '[data-guide="room"]', say: 'This is your room. Every screen this computer can reach is drawn here.', watchOnly: true },
  { target: '[data-identify]', say: 'Identify screens shows a big number on each screen, so you know which is which.', watchOnly: true },
  { target: '[data-output="projection"]', say: 'Each output has its own card. The projector is for the room.', watchOnly: true },
  { target: '[data-send-output="projection"]', say: 'Choose where it goes. A screen, a DeckLink port, NDI, or any browser on the network.', watchOnly: true },
  { target: '[data-output="lowerThird"]', say: 'The lower third is for the stream. Its background is see-through, over the camera.', watchOnly: true },
  { target: '[data-output="confidence"]', say: 'The stage monitor shows the preacher what is on, what is next, and the time.', watchOnly: true },
  { target: '[data-guide="ways"]', say: 'These are the ways to connect a screen. Each one says what it needs.', watchOnly: true },
  { target: '[data-live-view]', say: 'On the live screen, Every screen shows each output at once.', watchOnly: true, route: '/' },
  { say: 'That is Screens and outputs. The booth check light tells you if one stops.', watchOnly: true },
];

// ---- Plan a service from a template (1.19.14) -----------------------------------------------

const planned = () => document.querySelectorAll('[data-day-service]').length;
/** How many services the chosen day had when the step began (Let me try waits for one more) */
let plannedBefore = 0;

const plan: GuideStep[] = [
  {
    target: '[data-guide="calendar"]',
    say: 'This is Services. First, pick the day on the calendar.',
    watchOnly: true,
    route: '/service-planner',
    done: () => {
      plannedBefore = planned();
      return true;
    },
  },
  { target: '[data-ready-orders]', say: 'Each type of service has a ready-made order, with a time for each part.', watchOnly: true },
  { target: '[data-make-template]', say: 'Make it a template, and it becomes your own starting order.', watchOnly: true },
  {
    target: '[data-ready-order] button',
    say: 'Use for the day plans that day from it. Try it now.',
    why: 'In Let me try this plans a real service for the chosen day. Keep it, or delete it from the day afterwards.',
    tryOnly: true,
    click: true,
    // Use for the day opens the new service in the editor
    done: () => planned() > plannedBefore || /service-builder/.test(location.hash),
    doneSay: 'The service is planned.',
  },
  { target: '[data-day-service]', say: 'Your plans for the day are here. Edit opens one to add songs, verses, and files.', watchOnly: true, route: '/service-planner' },
  { target: '[data-new-template]', say: 'New template starts one from nothing, or from a service you planned.', watchOnly: true },
  { say: 'On the day, the live screen follows the order by itself.', watchOnly: true },
];

// ---- Teach spirit a cue (1.19.14) -----------------------------------------------------------

/** The words Show me types; the cue it makes is removed when the lesson ends */
const EXAMPLE_CUE = 'the ushers will come forward';
let cuesBefore = new Set<string>();
const cueIds = () => new Set(loadSpirit().cues.map((c) => c.id));
const typedCue = () => ((document.getElementById('cue-phrase') as HTMLInputElement | null)?.value ?? '').trim().split(/\s+/).filter(Boolean).length >= 2;

const teachCue: GuideStep[] = [
  { target: '[data-pane="cues"]', say: 'Open Cues, in Settings under spirit.', click: true, done: () => !!document.querySelector('[data-cues-page]'), route: '/settings' },
  { target: '.sp-sentence', say: 'A cue is one sentence. When the preacher says these words, spirit gets something ready.', watchOnly: true },
  {
    target: '#cue-phrase',
    say: 'Type words your preacher always says, such as the ushers will come forward.',
    why: 'At least two words. Words said only at that moment work best.',
    type: EXAMPLE_CUE,
    done: typedCue,
  },
  { target: '[aria-label="What to get ready"]', say: 'Then choose what to get ready. A part of this service, or any part of a kind.', watchOnly: true },
  {
    target: '[data-teach-cue]',
    say: 'Press Teach spirit.',
    click: true,
    done: () => [...cueIds()].some((id) => !cuesBefore.has(id)),
    doneSay: 'spirit knows it now.',
  },
  { target: '[data-cue]', say: 'A new cue only puts things in Next at first. You press Take to show them.', watchOnly: true },
  { say: 'If spirit gets it wrong, press Not this beside Next. One tap teaches it.', watchOnly: true },
  { say: 'After ten right in a row, you can let a cue go up by itself.', watchOnly: true },
];

// ---- Songs and slides (1.19.17) ------------------------------------------------------------

const find = (selector: string) => document.querySelector(selector);
/** The slide on the screens, in the strip (its key), so the next Take can be seen to move on */
const liveSlide = () => find('[aria-label="Slides"] [role="listitem"]:has([data-state="live"])')?.getAttribute('data-key') ?? '';
let firstLive = '';
/** Notes the slide on Live, for the step after (true when there is one) */
const noteLive = () => !!(firstLive = liveSlide());

const songs: GuideStep[] = [
  {
    target: '[data-add-files]',
    say: 'Your songs are kept in Media. To add one from SongSelect, download its words, then press Add files.',
    why: 'On songselect.ccli.com, open the song and choose Download, then Lyrics. Its writers, copyright and CCLI number come with it. You can also drop the file on this page.',
    watchOnly: true,
    route: '/media-library',
  },
  {
    target: '[data-edit-lyrics]',
    say: 'Lyrics opens a song’s words. Each part, like a verse or the chorus, becomes its own slides.',
    watchOnly: true,
  },
  {
    target: '[data-guide="library"]',
    say: 'On the live screen, open the Library.',
    why: 'On a wide screen the Library is always open on the left.',
    click: true,
    route: '/',
    skip: () => !!find('[data-library]'),
    done: () => !!find('[data-library]'),
  },
  {
    target: '[data-library-tab="songs"]',
    say: 'Click Songs.',
    click: true,
    done: () => find('[data-library-tab="songs"]')?.getAttribute('data-state') === 'active',
  },
  {
    target: '[data-library-song]',
    say: 'Pick a song. Its slides appear along the bottom.',
    click: true,
    done: () => !!find('[aria-label="Slides"] [data-state]'),
  },
  {
    target: '[data-guide="take"]',
    say: 'Press Take to put the first slide on the screens.',
    why: 'The Space bar does the same.',
    click: true,
    skip: noteLive,
    done: noteLive,
    doneSay: 'The first slide is on Live.',
  },
  {
    target: '[data-guide="take"]',
    say: 'Press Take again for the next slide. Each press moves on one.',
    why: 'The Space bar does the same, so you can follow the singers without looking down.',
    click: true,
    done: () => !!liveSlide() && liveSlide() !== firstLive,
    doneSay: 'The next slide is on Live.',
  },
  {
    target: '[aria-label="Slides"] [role="listitem"]:has([data-state="live"]) [data-quick-edit]',
    say: 'To fix a word, press the pencil on the slide.',
    why: 'Quick edit works during the service too. Saving updates the screens at once.',
    click: true,
    done: () => !!find('[data-quick-edit-dialog]'),
  },
  {
    target: '[data-quick-look]',
    say: 'Change the words above, or pick another look here. You see the slide as the room will.',
    watchOnly: true,
  },
  {
    target: '[data-open-designer]',
    say: 'For more, Open the full designer.',
    watchOnly: true,
    skip: () => !find('[data-open-designer]'),
  },
  {
    target: '[data-quick-cancel]',
    say: 'Cancel closes it, and nothing changes.',
    watchOnly: true,
    click: true,
    done: () => !find('[data-quick-edit-dialog]'),
  },
  {
    target: '[data-see-all]',
    say: 'See all slides shows every slide at once.',
    watchOnly: true,
  },
  {
    say: 'To change how every song looks, open Looks. Change a look, and every slide that uses it changes.',
    watchOnly: true,
  },
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
  { group: 'everyone', lesson: { id: 'booth-check', title: 'When something goes wrong', desc: 'The booth check light, and Show me the fix on each thing to check.', steps: boothCheck, minutes: 1 } },
  { group: 'setting-up', kind: 'booth-setup', lesson: { id: 'booth-setup', title: 'Set up your booth', desc: 'Voice Verses finds your microphone, screens and ProPresenter; you confirm each.', steps: [], minutes: 5 } },
  { group: 'setting-up', lesson: { id: 'screens', title: 'Screens and outputs', desc: 'Projector, stream lower third and stage, and the ways to connect them.', steps: screens, minutes: 2 } },
  {
    group: 'before-sunday',
    lesson: {
      id: 'plan',
      title: 'Plan a service from a template',
      desc: 'Pick the day, use the order for your type of service, then add to it.',
      steps: plan,
      minutes: 2,
      onStart: () => {
        plannedBefore = planned();
      },
    },
  },
  {
    group: 'before-sunday',
    lesson: {
      id: 'songs',
      title: 'Songs and slides',
      desc: 'Add a song, put it on the screens slide by slide, and fix a word or its look.',
      steps: songs,
      minutes: 2,
      onStart: () => {
        firstLive = '';
      },
    },
  },
  {
    group: 'before-sunday',
    lesson: {
      id: 'teach-cue',
      title: 'Teach spirit a cue',
      desc: '“When the preacher says … get … ready”, and correcting it.',
      steps: teachCue,
      minutes: 2,
      onStart: () => {
        cuesBefore = cueIds();
      },
      // Show me's example is not the church's own: take it out again
      onEnd: (mode) => {
        if (mode !== 'show') return;
        updateSpirit((st) => st.cues.filter((c) => !cuesBefore.has(c.id) && c.phrase === EXAMPLE_CUE).reduce((acc, c) => removeCue(acc, c.id), st));
      },
    },
  },
];

/** Lessons still to come, shown so the team knows what Training will cover */
export const COMING: { group: LessonCard['group']; title: string; desc: string }[] = [
  { group: 'setting-up', title: 'ProPresenter: verses on your own slide', desc: 'One slide your team puts up and clears. Uses ProPresenter for real.' },
];

export const GROUPS: { id: LessonCard['group']; title: string; who: string }[] = [
  { id: 'everyone', title: 'Everyone', who: 'Volunteers on Sunday' },
  { id: 'setting-up', title: 'Setting up', who: 'Once, by whoever sets up the booth' },
  { id: 'before-sunday', title: 'Before Sunday', who: 'Planning' },
];

export const lessonById = (id: string) => LESSONS.find((c) => c.lesson.id === id);
