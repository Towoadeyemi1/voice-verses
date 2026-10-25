import { toast } from 'sonner';
import { BibleVerse } from '@/types/bible';
import type { VerseDetectionOptions } from '@/speech/VerseDetectionController';
import { createVerseAssistant } from './verseAssistant';
import { loadAiSettings } from './settings';

type AssistantOptions = Pick<VerseDetectionOptions, 'assistant' | 'onVerseSuggested' | 'autoDisplayAiMatches'>;

/**
 * VerseDetectionController options for the AI verse assistant, from the saved
 * settings. Suggestions appear as a notification with a "Show" button that
 * calls `show`.
 */
export function verseAssistantOptions(show: (verse: BibleVerse) => void): AssistantOptions {
  const settings = loadAiSettings();
  if (!settings.enabled || !settings.model) return {};

  return {
    assistant: createVerseAssistant(settings),
    autoDisplayAiMatches: settings.autoDisplay,
    onVerseSuggested: (verse, info) => {
      const heard = info.description && info.description.length > 80 ? `${info.description.slice(0, 80)}…` : info.description;
      toast(`AI suggests ${verse.book} ${verse.chapter}:${verse.verse}`, {
        description: heard ? `Heard: “${heard}”` : undefined,
        duration: 20_000,
        action: { label: 'Show', onClick: () => show(verse) },
      });
    },
  };
}
