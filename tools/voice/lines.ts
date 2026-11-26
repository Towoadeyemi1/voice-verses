/**
 * Every sentence the guide can say (in Training's lessons and the demo), for the recordings
 * (tools/voice/record.cjs) and the check that each has one (tools/voice/check-lines.ts).
 * A new line in a lesson or the demo is found here by itself; a line made at run time needs
 * its possible wordings listed (`sayings` on a step, `spoken` on a narration).
 */
import { LESSONS, THATS_IT } from '@/lib/lessons';
import { DEMO_FEATURES_OFF, DEMO_STEPS } from '@/lib/demoScript';
import { sentencesOf } from '@/lib/voiceLines';

export function guideLines(): { line: string; from: string }[] {
  const out: { line: string; from: string }[] = [];
  for (const card of LESSONS)
    card.lesson.steps.forEach((s, i) => {
      const from = `lesson ${card.lesson.id} step ${i + 1}`;
      out.push({ line: s.say, from });
      if (typeof s.doneSay === 'string') out.push({ line: s.doneSay, from });
      for (const x of s.sayings ?? []) out.push({ line: x, from });
    });
  for (const s of DEMO_STEPS) if (s.kind === 'caption') out.push({ line: s.text, from: 'demo' });
  out.push({ line: DEMO_FEATURES_OFF, from: 'demo' }, { line: THATS_IT, from: 'lessons' });
  return out;
}

/** Each sentence once, with where it is said */
export function guideSentences(): { sentence: string; from: string }[] {
  const seen = new Map<string, string>();
  for (const { line, from } of guideLines()) for (const s of sentencesOf(line)) if (!seen.has(s)) seen.set(s, from);
  return [...seen].map(([sentence, from]) => ({ sentence, from }));
}
