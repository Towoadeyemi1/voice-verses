/**
 * ProPresenter as a module on the event bus (1.19.4): it listens for what the screens show and
 * follows it, whichever page or part of the app put it there. Nothing calls it directly.
 * Practice events never reach it (the bus holds them back, and lib/proPresenter checks too).
 */
import { subscribe } from '@/core/bus';
import type { EventMap } from '@/core/events';
import { clearProPresenter, sendSlideToProPresenter, sendVerseToProPresenter } from '@/lib/proPresenter';

export function startProPresenterModule(): () => void {
  return subscribe(
    'live.changed',
    (event) => {
      const live = event.data as EventMap['live.changed'];
      if (live.kind === 'verse' && live.verse) void sendVerseToProPresenter(live.verse);
      else if (live.kind === 'slide' && live.slide) void sendSlideToProPresenter(live.slide);
      else void clearProPresenter();
    },
    // Only this window drives ProPresenter: another window's events are its own business
    { fromOtherWindows: false },
  );
}
