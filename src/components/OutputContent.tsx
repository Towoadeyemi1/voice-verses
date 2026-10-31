import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { BibleParser } from '@/lib/bibleParser';
import { ContentKind, Output, templateFor } from '@/lib/templates';
import { verseReference } from '@/lib/verseText';
import { useTemplates } from '@/hooks/use-templates';
import { RenderContent, SlideOverrides, TemplateRenderer } from './TemplateRenderer';
import { SlideDisplay } from './SlideDisplay';
import { VerseText } from './VerseText';
import { VideoPlayer } from './VideoPlayer';
import { Countdown, formatRemaining } from '@/lib/countdown';
import { useStageSize } from './ScaledStage';

const SIZE_SCALE = { small: 0.7, medium: 0.85, large: 1, xlarge: 1.15 } as const;

/** What an output shows: a verse from the Scripture page, or a slide from the Presenter. */
export type Live = { verse: BibleVerse } | { slide: Slide } | null;

export function describe(live: Live): { kind: ContentKind; content: RenderContent; overrides?: SlideOverrides; templateId?: string } | null {
  if (!live) return null;
  const version = BibleParser.getVersionLabel();
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
      return { kind: 'lyrics', overrides, templateId: slide.templateId, content: { key: slide.id, label: slide.songTitle, body: slide.content, footer: slide.credits } };
    case 'announcement':
      return { kind: 'announcement', overrides, templateId: slide.templateId, content: { key: slide.id, label: slide.title, body: slide.content } };
    default:
      return null;
  }
}

const countdownContent = (countdown: Countdown, remaining: number): RenderContent => ({
  key: countdown.id,
  label: countdown.message,
  body: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatRemaining(remaining)}</span>,
});

/**
 * The content of one output in the template assigned to it, with a running
 * countdown if it is shown there. Pictures and other slide types are drawn as
 * they are. Lays out on the stage canvas: wrap in ScaledStage.
 */
export const OutputContent = ({
  live,
  output,
  blank,
  countdown,
  remaining = 0,
  preview = false,
  transparent = false,
}: {
  live: Live;
  output: Output;
  blank?: boolean;
  countdown?: Countdown | null;
  remaining?: number;
  /** Operator previews: videos play without sound */
  preview?: boolean;
  /** Draw no background (see-through lower third) */
  transparent?: boolean;
}) => {
  const { templates, assignments } = useTemplates();
  const { width, height } = useStageSize();

  // A countdown can take over the screen (before the service, or on the stream)
  const countdownTakesOver = countdown && (output === 'projection' ? countdown.projector === 'full' : countdown.stream);
  if (countdownTakesOver) {
    return <TemplateRenderer template={templateFor(templates, assignments, output, 'countdown')} content={countdownContent(countdown, remaining)} transparent={transparent} />;
  }

  const described = describe(live);
  const corner =
    countdown && output === 'projection' && countdown.projector === 'corner' ? (
      <div
        className="absolute rounded-xl text-white font-semibold"
        style={{ right: 48, bottom: 40, padding: '12px 28px', fontSize: 72, background: 'rgba(0,0,0,0.65)', fontVariantNumeric: 'tabular-nums' }}
      >
        {formatRemaining(remaining)}
      </div>
    ) : null;

  let screen;
  if (live && 'slide' in live && live.slide.type === 'video') {
    // Video slides play full screen on the projector (with their sound there only)
    screen =
      output === 'projection' ? (
        <div style={{ width, height }} className="bg-black">
          <VideoPlayer mediaId={live.slide.mediaId} loop={live.slide.loop} sound={live.slide.sound && !preview} className="w-full h-full" />
        </div>
      ) : (
        <TemplateRenderer template={templateFor(templates, assignments, output, 'scripture')} content={null} transparent={transparent} />
      );
  } else if (live && 'slide' in live && !described && live.slide.type !== 'blank') {
    // Picture slides fill the screen as they are
    screen =
      output === 'projection' ? (
        <div style={{ width, height }} className="bg-black">
          <SlideDisplay slide={live.slide} className="h-full w-full" />
        </div>
      ) : (
        <TemplateRenderer template={templateFor(templates, assignments, output, 'scripture')} content={null} transparent={transparent} />
      );
  } else {
    const template = templateFor(templates, assignments, output, described?.kind ?? 'scripture', described?.templateId);
    screen = <TemplateRenderer template={template} content={blank ? null : described?.content ?? null} overrides={described?.overrides} transparent={transparent} />;
  }

  return corner ? (
    <div className="relative" style={{ width, height }}>
      {screen}
      {corner}
    </div>
  ) : (
    screen
  );
};
