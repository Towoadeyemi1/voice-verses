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
import { Countdown, countdownTone, formatRemaining, TONE_COLOR } from '@/lib/countdown';
import { useStageSize } from './ScaledStage';
import { Transition } from './Transition';
import { cleanTransition } from '@/lib/transitions';

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
    transition: slide.transition,
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

/** Yellow when close, red when done; blinking then if the countdown asks for it. */
const toneStyle = (countdown: Countdown, remaining: number) => {
  const tone = countdownTone(countdown, remaining);
  return { color: TONE_COLOR[tone], className: countdown.flash && tone !== 'normal' ? 'vv-blink' : undefined, tone };
};

const countdownContent = (countdown: Countdown, remaining: number): RenderContent => {
  const { color, className } = toneStyle(countdown, remaining);
  return {
    key: countdown.id,
    label: countdown.message,
    body: (
      <span className={className} style={{ fontVariantNumeric: 'tabular-nums', color }}>
        {formatRemaining(remaining)}
      </span>
    ),
  };
};

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
  const described = countdownTakesOver ? null : describe(live);
  const corner =
    !countdownTakesOver && countdown && output === 'projection' && countdown.projector === 'corner' ? (
      <div
        className={`absolute rounded-xl text-white font-semibold ${toneStyle(countdown, remaining).className ?? ''}`}
        style={{
          right: 48,
          bottom: 40,
          padding: '12px 28px',
          fontSize: 72,
          background: { normal: 'rgba(0,0,0,0.65)', warn: 'rgba(161, 98, 7, 0.92)', over: 'rgba(185, 28, 28, 0.92)' }[toneStyle(countdown, remaining).tone],
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatRemaining(remaining)}
      </div>
    ) : null;

  // What kind of screen it is; changing between them (a look, a video, a picture, a countdown) plays a transition too
  let mode = 'look';
  let screen;
  let template = templateFor(templates, assignments, output, 'scripture');
  const slide = live && 'slide' in live ? live.slide : null;
  if (countdownTakesOver) {
    template = templateFor(templates, assignments, output, 'countdown');
    mode = 'countdown';
    screen = <TemplateRenderer template={template} content={countdownContent(countdown, remaining)} transparent={transparent} />;
  } else if (slide?.type === 'video' && output === 'projection') {
    // Video slides play full screen on the projector (with their sound there only)
    mode = `video:${slide.id}`;
    screen = (
      <div style={{ width, height }} className="bg-black">
        <VideoPlayer mediaId={slide.mediaId} loop={slide.loop} sound={slide.sound && !preview} className="w-full h-full" />
      </div>
    );
  } else if (slide && !described && slide.type !== 'blank' && slide.type !== 'video' && output === 'projection') {
    // Picture slides fill the screen as they are
    mode = `picture:${slide.id}`;
    screen = (
      <div style={{ width, height }} className="bg-black">
        <SlideDisplay slide={slide} className="h-full w-full" />
      </div>
    );
  } else if (slide && !described && slide.type !== 'blank') {
    // Videos and pictures don't go to the lower third: it shows its look with nothing on it
    screen = <TemplateRenderer template={template} content={null} transparent={transparent} />;
  } else {
    template = templateFor(templates, assignments, output, described?.kind ?? 'scripture', described?.templateId);
    screen = <TemplateRenderer template={template} content={blank ? null : described?.content ?? null} overrides={described?.overrides} transparent={transparent} />;
  }
  const spec = cleanTransition(slide?.transition ?? template.transition);

  return (
    <div className="relative" style={{ width, height }}>
      <Transition id={mode} spec={spec} opaque={!transparent}>
        {screen}
      </Transition>
      {corner}
    </div>
  );
};
