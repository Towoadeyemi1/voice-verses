/**
 * OpenAI Realtime transcription session configuration.
 *
 * We only need speech-to-text, so we open a transcription session rather than
 * a full voice-conversation session: no model responses, no audio output, and
 * transcription-model pricing. Verse detection stays in VerseDetectionController.
 */

export const OPENAI_API_BASE = 'https://api.openai.com/v1';
export const TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';

// Biases recognition toward scripture references ("First Corinthians 13:4")
const TRANSCRIPTION_PROMPT =
  'A sermon or Bible reading in a church service. Speakers cite scripture references ' +
  'such as John 3:16, 1 Corinthians 13:4-7, Psalm 23, and Romans chapter 8 verse 28.';

export interface TranscriptionSessionConfig {
  type: 'transcription';
  audio: {
    input: {
      format: { type: 'audio/pcm'; rate: 24000 };
      noise_reduction: { type: 'near_field' | 'far_field' } | null;
      transcription: { model: string; language?: string; prompt?: string };
      turn_detection: {
        type: 'server_vad';
        threshold: number;
        prefix_padding_ms: number;
        silence_duration_ms: number;
      };
    };
  };
}

/** OpenAI expects ISO-639-1 codes ("en"), while settings may hold "en-US". */
export function toIsoLanguage(language: string | null | undefined): string | undefined {
  const code = language?.split(/[-_]/)[0]?.toLowerCase();
  return code && /^[a-z]{2}$/.test(code) ? code : undefined;
}

export function buildTranscriptionSession(language?: string | null): TranscriptionSessionConfig {
  return {
    type: 'transcription',
    audio: {
      input: {
        format: { type: 'audio/pcm', rate: 24000 },
        // Church microphones are usually lapel/podium mics, i.e. close to the speaker
        noise_reduction: { type: 'near_field' },
        transcription: {
          model: TRANSCRIPTION_MODEL,
          language: toIsoLanguage(language),
          prompt: TRANSCRIPTION_PROMPT,
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    },
  };
}
