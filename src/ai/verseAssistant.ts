import { chat } from './providers';
import { AiAssistantSettings } from './settings';

/**
 * Asks the configured AI model which Bible passage a speaker is referring to
 * when they describe or quote it instead of naming it. The answer is only a
 * candidate: VerseDetectionController looks it up in the Bible before use.
 */

export interface AiVerseMatch {
  /** e.g. "John 10:11" */
  reference: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface VerseAssistant {
  shouldAsk(text: string): boolean;
  identify(text: string, context: string[], signal?: AbortSignal): Promise<AiVerseMatch | null>;
}

const SYSTEM_PROMPT = `You help church presentation software put the right Bible passage on screen during a live service.

You receive the latest sentence from a speech transcript, plus a few sentences before it for context. Decide whether the speaker is quoting, paraphrasing or describing one specific Bible verse. Explicit references like "John 3:16" are already handled elsewhere; your job is the cases where the passage is described ("the verse about the Good Shepherd laying down his life") or quoted without a reference ("for God so loved the world").

Reply with JSON only: {"reference": "<Book Chapter:Verse>", "confidence": "high" | "medium" | "low"}.
- Use full English book names, e.g. "1 Corinthians 13:4".
- Give the single best verse, not a range.
- Use an empty reference ("") when no specific verse is meant, or when you are unsure which one. A wrong verse on screen is worse than none.
- Transcripts come from speech recognition and may contain misheard words.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reference: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['reference', 'confidence'],
  additionalProperties: false,
};

// Words that suggest scripture is being talked about
const SCRIPTURE_CUES =
  /\b(verse|scripture|bible|written|the word|says|said|jesus|christ|lord|god|psalm|psalmist|proverb|prophet|apostle|paul|peter|moses|david|book of|chapter|passage|parable|gospel|blessed|amen)\b/i;

const MIN_WORDS = 5;

/** Pull the JSON object out of a reply, tolerating code fences or extra text from local models. */
export function parseMatch(reply: string): AiVerseMatch | null {
  const json = reply.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { reference?: unknown; confidence?: unknown };
    if (typeof parsed.reference !== 'string' || !parsed.reference.trim()) return null;
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence as string)
      ? (parsed.confidence as AiVerseMatch['confidence'])
      : 'low';
    return { reference: parsed.reference.trim(), confidence };
  } catch {
    return null;
  }
}

export function createVerseAssistant(settings: AiAssistantSettings): VerseAssistant {
  return {
    shouldAsk(text) {
      if (text.trim().split(/\s+/).length < MIN_WORDS) return false;
      return settings.trigger === 'every' || SCRIPTURE_CUES.test(text);
    },

    async identify(text, context, signal) {
      const earlier = context.length ? `Earlier sentences:\n${context.map((c) => `- ${c}`).join('\n')}\n\n` : '';
      const reply = await chat(settings, {
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `${earlier}Latest sentence:\n${text}` }],
        jsonSchema: RESPONSE_SCHEMA,
        signal,
      });
      return parseMatch(reply);
    },
  };
}
