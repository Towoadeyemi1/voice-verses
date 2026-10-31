import { useEffect, useRef, useState } from 'react';
import { wordsAhead } from '@/speech/readingTracker';

/**
 * The word to light up while a verse is read: the last word heard, carried on
 * at the reader's pace between the speech engine's results so the follower
 * keeps up with a fast reader. Never past `last` (the end of the verse).
 */
export function usePacedWord(word: number, verseKey: string | undefined, last: number): number {
  const history = useRef<{ word: number; at: number }[]>([]);
  const key = useRef(verseKey);
  const [now, setNow] = useState(Date.now());

  if (key.current !== verseKey) {
    key.current = verseKey;
    history.current = [];
  }
  const latest = history.current[history.current.length - 1];
  if (word >= 0 && (!latest || word > latest.word)) history.current = [...history.current.slice(-12), { word, at: Date.now() }];

  // A gentle tick while reading, to move the light on between results
  useEffect(() => {
    if (word < 0 || word >= last) return;
    const timer = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(timer);
  }, [word, last]);

  if (word < 0) return word;
  return Math.min(last, word + wordsAhead(history.current, now));
}
