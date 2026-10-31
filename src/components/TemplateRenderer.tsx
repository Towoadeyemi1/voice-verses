import { CSSProperties, ReactNode } from 'react';
import { DesignLayer, Template } from '@/lib/templates';
import { RichText } from '@/lib/richText';
import { withTeamColors } from '@/lib/colorTeams';
import { useColorTeam } from '@/hooks/use-color-team';
import { useLogo, useMediaUrl } from '@/hooks/use-templates';
import { FitText } from './FitText';
import { useStageSize } from './ScaledStage';
import { STANDARD_WIDTH } from '@/lib/screenShapes';

export interface RenderContent {
  /** The main text (verse, lyrics lines, announcement) */
  body: ReactNode;
  /** Reference, song title or announcement title, shown if the template shows labels */
  label?: string;
  /** Bible translation, added to the reference if the template includes it */
  version?: string;
  /** Small print along the bottom, e.g. song credits and CCLI licence */
  footer?: string;
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
 * Draws content in a template on the stage canvas (wrap it in ScaledStage):
 * 1920×1080, or wider for an ultrawide screen. On a wide screen the design
 * spreads across it, or stays in the middle 16:9 with the background filling
 * the rest, as set for that screen.
 * The projector, the lower third and every preview use this, so what the
 * operator sees is what the room sees.
 */
export const TemplateRenderer = ({
  template: look,
  content,
  overrides,
  transparent = false,
}: {
  template: Template;
  content: RenderContent | null;
  overrides?: SlideOverrides;
  /** No background at all (for OBS/vMix browser sources, which show what is behind) */
  transparent?: boolean;
}) => {
  // Colours written as "team:…" take the colour team's colours
  const team = useColorTeam();
  const template = withTeamColors(look, team);
  const { background, area, panel, text, label, logo } = template;
  const mediaSrc = useMediaUrl(background.type === 'color' ? undefined : background.mediaId);
  const logoUrl = useLogo();
  const stage = useStageSize();
  const middle = stage.layout === 'middle' && stage.width > STANDARD_WIDTH;

  const backgroundUrl = transparent ? undefined : overrides?.backgroundUrl ?? mediaSrc;
  const blur = background.blur ? `blur(${background.blur}px)` : undefined;
  const fill =
    transparent || backgroundUrl
      ? undefined
      : background.type === 'gradient' && background.gradient
        ? `linear-gradient(${background.gradient.angle}deg, ${background.color}, ${background.gradient.to})`
        : undefined;
  const isVideo = !overrides?.backgroundUrl && background.type === 'video';
  const dim = overrides?.backgroundUrl ? 1 - (overrides.backgroundOpacity ?? 0.3) : background.dim;
  const align = overrides?.align ?? text.align;

  const textStyle: CSSProperties = {
    fontFamily: text.fontFamily,
    fontWeight: text.fontWeight,
    fontStyle: text.italic ? 'italic' : undefined,
    letterSpacing: text.letterSpacing ? `${text.letterSpacing}px` : undefined,
    color: text.color,
    lineHeight: text.lineHeight,
    textAlign: align,
    textTransform: text.uppercase ? 'uppercase' : undefined,
    textShadow: text.shadow ? '0 3px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)' : undefined,
    WebkitTextStroke: text.outline ? `${text.outline}px ${text.outlineColor ?? 'rgba(0,0,0,0.9)'}` : undefined,
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
    <div className="relative overflow-hidden" style={{ width: stage.width, height: stage.height, backgroundColor: transparent ? 'transparent' : background.color, backgroundImage: fill }}>
      {backgroundUrl &&
        (isVideo ? (
          <video src={backgroundUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ filter: blur, transform: blur ? 'scale(1.06)' : undefined }} />
        ) : (
          <img src={backgroundUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: blur, transform: blur ? 'scale(1.06)' : undefined }} />
        ))}
      {backgroundUrl && dim > 0 && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${dim})` }} />}

      {/* Everything but the background: across the whole screen, or in its middle 16:9 */}
      <div className="absolute top-0 bottom-0" style={middle ? { left: (stage.width - STANDARD_WIDTH) / 2, width: STANDARD_WIDTH } : { left: 0, right: 0 }}>
        {!transparent && (template.layers ?? []).filter((l) => !l.above).map((l) => <Layer key={l.id} layer={l} />)}

        {logo.show && logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="absolute object-contain"
            // Sized against the height, so a wide screen does not make it bigger
            style={{ ...logoCorner[logo.position], width: (logo.size / 100) * STANDARD_WIDTH, maxHeight: `${logo.size * 1.78}%` }}
          />
        )}

        {content?.footer && (
          <div
            className="absolute"
            style={{ left: 48, right: 48, bottom: 24, fontFamily: text.fontFamily, fontSize: 22, color: text.color, opacity: 0.75, textAlign: 'center', textShadow: textStyle.textShadow }}
          >
            {content.footer}
          </div>
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
                {typeof content.body === 'string' ? <RichText text={content.body} highlight={text.highlight} /> : content.body}
              </FitText>
              {label.position === 'below' && labelEl}
            </div>
          </div>
        )}

        {!transparent && (template.layers ?? []).filter((l) => l.above).map((l) => <Layer key={l.id} layer={l} />)}
      </div>
    </div>
  );
};

/** A text box, shape or picture added to the template. */
const Layer = ({ layer }: { layer: DesignLayer }) => {
  const src = useMediaUrl(layer.kind === 'image' ? layer.mediaId : undefined);
  const box: CSSProperties = {
    position: 'absolute',
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    height: `${layer.height}%`,
    opacity: layer.opacity,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
  };
  if (layer.kind === 'shape') {
    return (
      <div
        style={{
          ...box,
          background: layer.fillTo ? `linear-gradient(135deg, ${layer.fill ?? '#000'}, ${layer.fillTo})` : layer.fill ?? '#000000',
          borderRadius: layer.radius ?? 0,
          border: layer.borderWidth ? `${layer.borderWidth}px solid ${layer.borderColor ?? '#ffffff'}` : undefined,
        }}
      />
    );
  }
  if (layer.kind === 'image') {
    return src ? <img src={src} alt="" style={{ ...box, objectFit: layer.fit ?? 'contain' }} /> : null;
  }
  return (
    <div
      style={{
        ...box,
        display: 'flex',
        alignItems: 'center',
        justifyContent: layer.align === 'left' ? 'flex-start' : layer.align === 'right' ? 'flex-end' : 'center',
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize ?? 48,
        fontWeight: layer.fontWeight ?? 600,
        fontStyle: layer.italic ? 'italic' : undefined,
        color: layer.color ?? '#ffffff',
        textAlign: layer.align ?? 'center',
        textTransform: layer.uppercase ? 'uppercase' : undefined,
        textShadow: layer.shadow ? '0 3px 12px rgba(0,0,0,0.85)' : undefined,
        whiteSpace: 'pre-line',
        lineHeight: 1.2,
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%' }}>
        <RichText text={layer.text ?? ''} />
      </div>
    </div>
  );
};
