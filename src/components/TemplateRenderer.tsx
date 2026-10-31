import { CSSProperties, ReactNode } from 'react';
import { Template } from '@/lib/templates';
import { useLogo, useMediaItem } from '@/hooks/use-templates';
import { FitText } from './FitText';

export interface RenderContent {
  /** The main text (verse, lyrics lines, announcement) */
  body: ReactNode;
  /** Reference, song title or announcement title, shown if the template shows labels */
  label?: string;
  /** Bible translation, added to the reference if the template includes it */
  version?: string;
  /** Changes when the content changes, to fade the new text in */
  key: string;
}

export interface SlideOverrides {
  backgroundUrl?: string;
  backgroundOpacity?: number;
  align?: 'left' | 'center' | 'right';
  /** Multiplies the template's text size */
  scale?: number;
}

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/**
 * Draws content in a template on a 1920×1080 canvas (wrap it in ScaledStage).
 * The projector, the lower third and every preview use this, so what the
 * operator sees is what the room sees.
 */
export const TemplateRenderer = ({
  template,
  content,
  overrides,
}: {
  template: Template;
  content: RenderContent | null;
  overrides?: SlideOverrides;
}) => {
  const { background, area, panel, text, label, logo } = template;
  const media = useMediaItem(background.type === 'color' ? undefined : background.mediaId);
  const logoUrl = useLogo();

  const backgroundUrl = overrides?.backgroundUrl ?? (background.type !== 'color' ? media?.url : undefined);
  const isVideo = !overrides?.backgroundUrl && background.type === 'video';
  const dim = overrides?.backgroundUrl ? 1 - (overrides.backgroundOpacity ?? 0.3) : background.dim;
  const align = overrides?.align ?? text.align;

  const textStyle: CSSProperties = {
    fontFamily: text.fontFamily,
    fontWeight: text.fontWeight,
    color: text.color,
    lineHeight: text.lineHeight,
    textAlign: align,
    textTransform: text.uppercase ? 'uppercase' : undefined,
    textShadow: text.shadow ? '0 3px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)' : undefined,
    WebkitTextStroke: text.outline ? `${text.outline}px rgba(0,0,0,0.9)` : undefined,
    paintOrder: 'stroke fill',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line',
  };
  const labelEl =
    content?.label && label.show ? (
      <div
        style={{
          fontFamily: text.fontFamily,
          fontSize: label.fontSize,
          fontWeight: 600,
          color: label.color,
          textAlign: align,
          textShadow: textStyle.textShadow,
          flexShrink: 0,
          margin: label.position === 'above' ? '0 0 0.35em' : '0.35em 0 0',
        }}
      >
        {content.label}
        {label.includeVersion && content.version ? ` ${content.version}` : ''}
      </div>
    ) : null;

  const logoCorner: Record<Template['logo']['position'], CSSProperties> = {
    'top-left': { top: 40, left: 48 },
    'top-right': { top: 40, right: 48 },
    'bottom-left': { bottom: 40, left: 48 },
    'bottom-right': { bottom: 40, right: 48 },
  };

  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 1080, backgroundColor: background.color }}>
      {backgroundUrl &&
        (isVideo ? (
          <video src={backgroundUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src={backgroundUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ))}
      {backgroundUrl && dim > 0 && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${dim})` }} />}

      {logo.show && logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="absolute object-contain"
          style={{ ...logoCorner[logo.position], width: `${logo.size}%`, maxHeight: `${logo.size * 1.78}%` }}
        />
      )}

      {content && (
        <div
          className="absolute flex flex-col"
          style={{
            left: `${area.x}%`,
            top: `${area.y}%`,
            width: `${area.width}%`,
            height: `${area.height}%`,
            justifyContent:
              text.verticalAlign === 'top' ? 'flex-start' : text.verticalAlign === 'bottom' ? 'flex-end' : 'center',
          }}
        >
          <div
            key={content.key}
            className="flex flex-col min-h-0 max-h-full animate-fade-in"
            style={
              panel.show
                ? { backgroundColor: hexToRgba(panel.color, panel.opacity), borderRadius: panel.radius, padding: '28px 40px' }
                : undefined
            }
          >
            {label.position === 'above' && labelEl}
            <FitText
              maxFontSize={text.fontSize * (overrides?.scale ?? 1)}
              minFontSize={16}
              verticalAlign={text.verticalAlign}
              style={textStyle}
            >
              {content.body}
            </FitText>
            {label.position === 'below' && labelEl}
          </div>
        </div>
      )}
    </div>
  );
};
