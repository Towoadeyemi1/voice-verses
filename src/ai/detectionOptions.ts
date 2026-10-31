import { toast } from 'sonner';
import { BibleVerse } from '@/types/bible';
import type { VerseDetectionOptions } from '@/speech/VerseDetectionController';
import { createVerseAssistant } from './verseAssistant';
import { loadAiSettings } from './settings';

type AssistantOptions = Pick<VerseDetectionOptions, 'assistant' | 'onVerseSuggested' | 'autoDisplayAiMatches'>;

/**
 * VerseDetectionController options for suggestions and the AI verse assistant.
 * Verses the detector is not sure of (a loose quote, or the AI's answer)
 * appear as a notification with a "Show" button that calls `show`.
 */
export function verseAssistantOptions(show: (verse: BibleVerse) => void): AssistantOptions {
  const onVerseSuggested: AssistantOptions['onVerseSuggested'] = (verse, info) => {
    const heard = info.description && info.description.length > 80 ? `${info.description.slice(0, 80)}…` : info.description;
    toast(`${info.engine === 'ai' ? 'AI suggests' : 'Sounds like'} ${verse.book} ${verse.chapter}:${verse.verse}`, {
      description: heard ? `Heard: “${heard}”` : undefined,
      duration: 20_000,
      action: { label: 'Show', onClick: () => show(verse) },
    });
  };

  const settings = loadAiSettings();
  if (!settings.enabled || !settings.model) return { onVerseSuggested };

  return {
    assistant: createVerseAssistant(settings),
    autoDisplayAiMatches: settings.autoDisplay,
    onVerseSuggested,
  };
}
