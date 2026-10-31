import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { BibleParser } from '@/lib/bibleParser';
import { ContentKind, Output, templateFor } from '@/lib/templates';
import { verseReference } from '@/lib/verseText';
import { useTemplates } from '@/hooks/use-templates';
import { RenderContent, SlideOverrides, TemplateRenderer } from './TemplateRenderer';
import { SlideDisplay } from './SlideDisplay';
import { VerseText } from './VerseText';

const SIZE_SCALE = { small: 0.7, medium: 0.85, large: 1, xlarge: 1.15 } as const;

/** What an output shows: a verse from the Scripture page, or a slide from the Presenter. */
export type Live = { verse: BibleVerse } | { slide: Slide } | null;

function describe(live: Live): { kind: ContentKind; content: RenderContent; overrides?: SlideOverrides; templateId?: string } | null {
  if (!live) return null;
  const version = BibleParser.getVersion().toUpperCase();
  if ('verse' in live) {
    const ref = verseReference(live.verse);
    return { kind: 'scripture', content: { key: ref, label: ref, version, body: <VerseText text={live.verse.text} /> } };
  }
  const slide = live.slide;
  const overrides: SlideOverrides = {
    backgroundUrl: slide.backgroundMedia?.type === 'image' ? slide.backgroundMedia.url : undefined,
    backgroundOpacity: slide.backgroundMedia?.opacity,
    align: slide.textFormatting?.alignment,
    scale: slide.textFormatting?.fontSize ? SIZE_SCALE[slide.textFormatting.fontSize] : undefined,
  };
  switch (slide.type) {
    case 'scripture': {
      const ref = verseReference(slide.verse);
      return { kind: 'scripture', overrides, templateId: slide.templateId, content: { key: slide.id, label: ref, version, body: <VerseText text={slide.verse.text} /> } };
    }
    case 'lyrics':
      return { kind: 'lyrics', overrides, templateId: slide.templateId, content: { key: slide.id, label: slide.songTitle, body: slide.content } };
    case 'announcement':
      return { kind: 'announcement', overrides, templateId: slide.templateId, content: { key: slide.id, label: slide.title, body: slide.content } };
    default:
      return null;
  }
}

/**
 * The content of one output in the template assigned to it. Pictures and
 * other slide types are drawn as they are. Lays out at 1920×1080: wrap in ScaledStage.
 */
export const OutputContent = ({ live, output, blank }: { live: Live; output: Output; blank?: boolean }) => {
  const { templates, assignments } = useTemplates();
  const described = describe(live);

  if (live && 'slide' in live && !described && live.slide.type !== 'blank') {
    // Picture slides fill the screen as they are
    return output === 'projection' ? (
      <div style={{ width: 1920, height: 1080 }} className="bg-black">
        <SlideDisplay slide={live.slide} className="h-full w-full" />
      </div>
    ) : null;
  }

  const template = templateFor(templates, assignments, output, described?.kind ?? 'scripture', described?.templateId);
  return <TemplateRenderer template={template} content={blank ? null : described?.content ?? null} overrides={described?.overrides} />;
};
