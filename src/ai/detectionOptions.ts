import { toast } from 'sonner';
import { BibleVerse } from '@/types/bible';
import type { VerseDetectionOptions } from '@/speech/VerseDetectionController';
import { createVerseAssistant } from './verseAssistant';
import { loadAiSettings } from './settings';
import { plainVerseText } from '@/lib/verseText';

type AssistantOptions = Pick<VerseDetectionOptions, 'assistant' | 'onVerseSuggested' | 'autoDisplayAiMatches'>;

/**
 * VerseDetectionController options for suggestions and the AI verse assistant.
 * Verses the detector is not sure of (a loose quote, or the AI's answer)
 * appear as a notification with a "Show" button that calls `show`.
 */
export function verseAssistantOptions(
  show: (verse: BibleVerse) => void,
  /** Where suggestions go instead of a notification (the Scripture page lists them under the transcript) */
  suggest?: AssistantOptions['onVerseSuggested'],
): AssistantOptions {
  const onVerseSuggested: AssistantOptions['onVerseSuggested'] =
    suggest ??
    ((verse, info) => {
      // The verse's own words, so it can be checked before it is shown
      const text = plainVerseText(verse.text);
      toast(`${info.engine === 'ai' ? 'AI suggests' : 'Sounds like'} ${verse.book} ${verse.chapter}:${verse.verse}`, {
        description: text.length > 160 ? `${text.slice(0, 160)}…` : text,
        duration: 20_000,
        action: { label: 'Show', onClick: () => show(verse) },
      });
    });

  const settings = loadAiSettings();
  if (!settings.enabled || !settings.model) return { onVerseSuggested };

  return {
    assistant: createVerseAssistant(settings),
    autoDisplayAiMatches: settings.autoDisplay,
    onVerseSuggested,
  };
}
