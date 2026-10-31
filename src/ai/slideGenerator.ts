import { AnnouncementSlide, ScriptureSlide, Slide } from '@/types/service';
import { BibleParser } from '@/lib/bibleParser';
import { chat } from './providers';
import { AiAssistantSettings } from './settings';

/**
 * Slides written by AI from the church's own text: a bulletin or notices
 * become announcement slides; sermon notes become a slide per point, with the
 * scripture the notes cite. Nothing is invented: dates, times and places are
 * kept as given, and only references that are in the notes are used.
 */
export type SlideSource = 'announcements' | 'sermon';

interface DraftSlide {
  title: string;
  body: string;
  /** A Bible reference cited in the notes for this point, e.g. "John 3:16" */
  scripture?: string;
}

const SCHEMA = {
  type: 'object',
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          scripture: { type: 'string' },
        },
        required: ['title', 'body'],
        additionalProperties: false,
      },
    },
  },
  required: ['slides'],
  additionalProperties: false,
};

const RULES = `Reply with JSON only: {"slides":[{"title":"...","body":"...","scripture":"..."}]}.
Write for a church projector read from the back of the room:
- title: at most 5 words.
- body: at most 22 words, plain sentences, no bullet characters, no emoji.
- At most 10 slides.
- Use only facts in the text. Keep dates, times, places, names, phone numbers and web addresses exactly as written. Never add details that are not there.`;

const PROMPTS: Record<SlideSource, string> = {
  announcements: `You turn a church bulletin or notices into announcement slides, one slide per notice, in the order given.\n${RULES}\nLeave "scripture" out.`,
  sermon: `You turn sermon notes into slides: a title slide (the sermon title and the preacher, if given), then one slide per main point in order.\n${RULES}\nFor a point that cites a Bible reference in the notes, put that reference in "scripture" (for example "Romans 8:28"). Only use references written in the notes; never add one.`,
};

function parseDrafts(reply: string): DraftSlide[] {
  const json = reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1);
  const data = JSON.parse(json) as { slides?: unknown };
  if (!Array.isArray(data.slides)) throw new Error('The AI did not return any slides.');
  return data.slides
    .filter((s): s is DraftSlide => !!s && typeof (s as DraftSlide).title === 'string' && typeof (s as DraftSlide).body === 'string')
    .slice(0, 10);
}

const id = (n: number) => `ai-${Date.now().toString(36)}-${n}`;

/** Ask the AI for slides, then turn its drafts into announcement and scripture slides. */
export async function generateSlides(settings: AiAssistantSettings, source: SlideSource, text: string, signal?: AbortSignal): Promise<Slide[]> {
  if (!text.trim()) return [];
  const reply = await chat(settings, {
    system: PROMPTS[source],
    messages: [{ role: 'user', content: text.slice(0, 12000) }],
    jsonSchema: SCHEMA,
    signal,
  });
  const drafts = parseDrafts(reply);
  const slides: Slide[] = [];
  for (const draft of drafts) {
    const announcement: AnnouncementSlide = { id: id(slides.length), type: 'announcement', title: draft.title.trim(), content: draft.body.trim() };
    slides.push(announcement);
    // The verse itself follows its point, when the notes cite one that exists
    if (source === 'sermon' && draft.scripture) {
      const verse = await BibleParser.parseReference(draft.scripture).catch(() => null);
      if (verse) {
        const scripture: ScriptureSlide = { id: id(slides.length), type: 'scripture', title: `${verse.book} ${verse.chapter}:${verse.verse}`, verse };
        slides.push(scripture);
      }
    }
  }
  return slides;
}
