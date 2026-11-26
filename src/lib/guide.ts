/**
 * The guide (1.19.1, approved mock-up docs/design/training/): a voice that
 * says each step, a pointer that moves to the control and clicks it, and a
 * spotlight on the real screen. Used by Training's lessons (Show me: it does
 * each step; Let me try: you do it and it checks) and by the demo, which it
 * narrates.
 *
 * The voice (1.19.13): each line recorded ahead in one natural voice (lib/voiceLines.ts),
 * else the computer's own. It is heard only in a lesson or the demo, after "Hear the
 * guide?" each time, and never while a service is on. The words always show on the card.
 */
import { recordingOf, sentencesOf } from '@/lib/voiceLines';

// ---- Lessons --------------------------------------------------------------------------------

export interface GuideStep {
  /** CSS selector of what the step is about; none: a card in the middle */
  target?: string;
  /** One short line: shown on the card and said aloud */
  say: string;
  /** The longer reason, behind "Why?" (not said) */
  why?: string;
  /** What Show me does once the pointer is there: click it, type into it, then press a key */
  click?: boolean;
  type?: string;
  key?: 'Enter' | 'Escape';
  /** The step is done when this is true (Let me try waits for it; Show me checks it after acting) */
  done?: () => boolean;
  /** Said when it is done ("John 3:16 is on Live") */
  doneSay?: string | (() => string);
  /** Every line a `doneSay` function can return, so each is recorded ahead (tools/voice) */
  sayings?: string[];
  /** Leave this step out when true (e.g. the verse already went live) */
  skip?: () => boolean;
  /** Only watched, never done by the volunteer (Let me try plays it like Show me) */
  watchOnly?: boolean;
  /** The page it happens on ('/' is the live screen) */
  route?: string;
}

export interface Lesson {
  id: string;
  title: string;
  desc: string;
  steps: GuideStep[];
  minutes: number;
  /** Practice: nothing reaches the room (default). The ProPresenter lesson will be the exception. */
  practice?: boolean;
}

export type GuideMode = 'show' | 'try';

export const START_LESSON = 'voice-verses-start-lesson';
const ASKED_KEY = 'voice-verses-start-lesson';

/** Starts a lesson (from Training or a warning). Kept until the guide is there to take it. */
export function startLesson(id: string, mode: GuideMode = 'show', step = 0): void {
  try {
    sessionStorage.setItem(ASKED_KEY, JSON.stringify({ id, mode, step }));
  } catch {
    // The event still reaches a guide that is already there
  }
  window.dispatchEvent(new CustomEvent(START_LESSON, { detail: { id, mode, step } }));
}

export function lessonAsked(): { id: string; mode: GuideMode; step: number } | null {
  try {
    const asked = JSON.parse(sessionStorage.getItem(ASKED_KEY) || 'null');
    sessionStorage.removeItem(ASKED_KEY);
    return asked && typeof asked.id === 'string' ? asked : null;
  } catch {
    return null;
  }
}

// ---- Progress -------------------------------------------------------------------------------

const PROGRESS_KEY = 'voice-verses-training';
export const TRAINING_CHANGED = 'voice-verses-training-changed';

export interface TrainingProgress {
  /** Lessons finished, and when */
  done: Record<string, string>;
  /** The lesson left part-way, to carry on */
  last?: { id: string; step: number; of: number; mode: GuideMode };
}

export function loadProgress(): TrainingProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
    return saved && typeof saved === 'object' ? { done: {}, ...saved } : { done: {} };
  } catch {
    return { done: {} };
  }
}

export function saveProgress(change: (p: TrainingProgress) => TrainingProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(change(loadProgress())));
  } catch {
    // Storage full: progress isn't kept
  }
  window.dispatchEvent(new Event(TRAINING_CHANGED));
}

// ---- The voice ------------------------------------------------------------------------------

const VOICE_KEY = 'voice-verses-guide-voice';
export const voiceOn = () => {
  try {
    return localStorage.getItem(VOICE_KEY) !== 'off';
  } catch {
    return true;
  }
};
export const setVoiceOn = (on: boolean) => {
  try {
    localStorage.setItem(VOICE_KEY, on ? 'on' : 'off');
  } catch {
    // Not kept
  }
  if (!on) stopSpeaking();
};

/** The computer's own voices, best first: used only for a line with no recording. */
const PREFERRED = ['Samantha', 'Ava', 'Allison', 'Daniel', 'Serena', 'Karen', 'Moira', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Guy', 'Microsoft Zira', 'Google UK English Female', 'Google US English'];

function bestVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  if (!voices.length) return null;
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name.startsWith(name) && x.localService) ?? voices.find((x) => x.name.startsWith(name));
    if (v) return v;
  }
  return voices.find((v) => v.localService && v.default) ?? voices.find((v) => v.localService) ?? voices[0];
}

// ---- When the guide may be heard (owner, 26 Nov 2026) ---------------------------------------
// Only in Training's lessons and the demo, and only after "Hear the guide?" is answered with
// Play the voice, each time one starts. Never while a service is on (listening to a real
// microphone): Show me the fix during a service is words only.

let trainingVoice = false;
let serviceOn = false;

/** The lesson or demo now playing may be heard (the answer to "Hear the guide?") */
export function setTrainingVoice(on: boolean): void {
  trainingVoice = on;
  if (!on) stopSpeaking();
}

/** Listening to a real microphone: the guide is silent until it stops */
export function setServiceOn(on: boolean): void {
  serviceOn = on;
  if (on) stopSpeaking();
}

export const audible = () => trainingVoice && !serviceOn && voiceOn();

export const ASK_VOICE = 'voice-verses-ask-voice';

/**
 * "Hear the guide?" before a lesson or the demo: resolves true for Play the voice, false
 * for Words only. Asked every time (the computer's sound may go to the room).
 */
export function askForVoice(): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (yes: boolean) => {
      if (answered) return;
      answered = true;
      resolve(yes);
    };
    window.dispatchEvent(new CustomEvent(ASK_VOICE, { detail: { answer } }));
    // No guide on this page to ask: words only
    window.setTimeout(() => {
      if (!document.querySelector('[data-ask-voice]')) answer(false);
    }, 1500);
  });
}

let speaking: { cancel: () => void } | null = null;

export function stopSpeaking(): void {
  speaking?.cancel();
  speaking = null;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

const GAP_MS = 320;

/** Plays the recordings of a line, sentence by sentence, with a short pause between. */
function playRecordings(urls: string[], finish: () => void): () => void {
  let stopped = false;
  let audio: HTMLAudioElement | null = null;
  let gap = 0;
  const next = (i: number) => {
    if (stopped) return;
    if (i >= urls.length) return finish();
    audio = new Audio(urls[i]);
    audio.onended = () => {
      gap = window.setTimeout(() => next(i + 1), GAP_MS);
    };
    audio.onerror = () => next(i + 1);
    void audio.play().catch(() => finish());
  };
  next(0);
  return () => {
    stopped = true;
    window.clearTimeout(gap);
    audio?.pause();
  };
}

/** Missing recordings are named once each in the console (tools/voice collects them) */
const reported = new Set<string>();

/**
 * Says a line (and resolves when it has been said): its recordings in the guide's voice,
 * else the computer's own voice. When the guide can't be heard (not in a lesson or the demo,
 * Words only, the speaker off, or a service on), it waits about as long as reading it takes,
 * so the pace is the same.
 */
export function speak(text: string): Promise<void> {
  stopSpeaking();
  const reading = 900 + text.split(/\s+/).length * 330;
  return new Promise((resolve) => {
    let finished = false;
    let cancelPlay: (() => void) | null = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallback);
      cancelPlay?.();
      resolve();
    };
    const sentences = sentencesOf(text);
    const recordings = sentences.map((s) => recordingOf(s));
    const recorded = recordings.every(Boolean);
    const playing = recorded ? recordings.reduce((ms, r) => ms + (r?.ms ?? 0) + GAP_MS, 0) : reading * 2;
    // Never wait forever on a voice that doesn't say when it has finished
    const fallback = window.setTimeout(finish, audible() ? playing + 2500 : reading);
    speaking = { cancel: finish };
    if (!recorded) {
      for (const s of sentences.filter((_, i) => !recordings[i]))
        if (!reported.has(s)) {
          reported.add(s);
          console.info(`[voice] no recording: ${s}`);
        }
    }
    if (!audible()) return;
    if (recorded) {
      cancelPlay = playRecordings(
        recordings.map((r) => r!.url),
        finish,
      );
      return;
    }
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    const u = new SpeechSynthesisUtterance(text);
    const voice = bestVoice();
    if (voice) u.voice = voice;
    u.rate = 1;
    u.pitch = 1;
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  });
}

// Voices load late in Chromium: ask once early so the first line has one
if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();

// ---- Narration (the demo) -------------------------------------------------------------------

export const NARRATE = 'voice-verses-narrate';

export interface Narration {
  target?: string;
  say: string;
  /** Said instead of `say` when the words on the card change but the line should not (so it has its recording) */
  spoken?: string;
  /** The pointer clicks the target */
  click?: boolean;
  /** A small label over the card ("Demo") */
  label?: string;
  /** A smaller second line ("Listening carries on. Esc goes back.") */
  note?: string;
  /** A button on the card ("Do it for me") */
  action?: { label: string; run: () => void };
  /** Shown with a tick: the fix worked */
  done?: boolean;
  /** Stays on any page (Show me the fix from Settings), not only the live screen */
  anywhere?: boolean;
}

/**
 * Points at something and says a line (the demo uses it); resolves when said.
 * `null` clears the pointer and the card.
 */
export function narrate(n: Narration | null): Promise<void> {
  window.dispatchEvent(new CustomEvent(NARRATE, { detail: n }));
  if (!n) {
    stopSpeaking();
    return Promise.resolve();
  }
  return speak(n.spoken ?? n.say);
}

// ---- Doing a step for the volunteer ---------------------------------------------------------

/** Waits until `test` is true (checked every 150 ms), up to `ms`. */
export async function until(test: () => boolean, ms: number, alive: () => boolean = () => true): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end && alive()) {
    try {
      if (test()) return true;
    } catch {
      // The page is changing: try again
    }
    await new Promise((r) => window.setTimeout(r, 150));
  }
  return false;
}

export const find = (selector?: string): HTMLElement | null => {
  if (!selector) return null;
  try {
    const all = [...document.querySelectorAll<HTMLElement>(selector)];
    // The visible one, if there are several
    return all.find((el) => el.getClientRects().length > 0) ?? null;
  } catch {
    return null;
  }
};

/** Types into an input the way a person would, a letter at a time (React sees each one). */
export async function typeInto(el: HTMLElement, text: string, alive: () => boolean): Promise<void> {
  const input = el as HTMLInputElement;
  input.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  let value = '';
  for (const ch of text) {
    if (!alive()) return;
    value += ch;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => window.setTimeout(r, 90));
  }
}

export function pressKey(el: HTMLElement, key: 'Enter' | 'Escape'): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true }));
}
