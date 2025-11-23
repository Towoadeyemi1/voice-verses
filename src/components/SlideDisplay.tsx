import { Slide } from '@/types/service';
import { useEffect, useRef, useState } from 'react';

interface SlideDisplayProps {
  slide: Slide | null;
  className?: string;
}

export const SlideDisplay = ({ slide, className = '' }: SlideDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const baseWidth = 1920;
        const baseHeight = 1080;
        const scaleX = container.clientWidth / baseWidth;
        const scaleY = container.clientHeight / baseHeight;
        setScale(Math.min(scaleX, scaleY));
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [slide]);

  if (!slide) {
    return (
      <div ref={containerRef} className={`flex items-center justify-center h-full w-full ${className}`}>
        <p style={{ fontSize: `${Math.max(24, 48 * scale)}px` }} className="text-muted-foreground">
          No slide selected
        </p>
      </div>
    );
  }

  const fontSize = slide.textFormatting?.fontSize || 'large';
  const alignment = slide.textFormatting?.alignment || 'center';
  const fontSizeMap = {
    small: 48,
    medium: 64,
    large: 80,
    xlarge: 96,
  };
  const baseFontSize = fontSizeMap[fontSize];
  const scaledFontSize = Math.max(16, baseFontSize * scale);
  
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const backgroundStyle = slide.backgroundMedia ? {
    backgroundImage: `url(${slide.backgroundMedia.url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};

  switch (slide.type) {
    case 'scripture':
      return (
        <div ref={containerRef} className={`relative flex flex-col items-center justify-center h-full w-full overflow-hidden ${className}`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full" style={{ padding: `${Math.max(32, 64 * scale)}px` }}>
            <div 
              className={`font-bold text-primary text-center break-words w-full`}
              style={{ fontSize: `${Math.max(20, 48 * scale)}px`, marginBottom: `${Math.max(16, 32 * scale)}px` }}
            >
              {slide.verse.book} {slide.verse.chapter}:{slide.verse.verse}
            </div>
            <div 
              className={`leading-relaxed text-center break-words w-full`}
              style={{ 
                fontSize: `${scaledFontSize}px`,
                lineHeight: '1.6'
              }}
            >
              {slide.verse.text}
            </div>
          </div>
        </div>
      );

    case 'lyrics':
      return (
        <div ref={containerRef} className={`relative flex flex-col items-center justify-center h-full w-full overflow-hidden ${className}`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full" style={{ padding: `${Math.max(32, 64 * scale)}px` }}>
            <div 
              className={`font-semibold text-primary text-center break-words w-full`}
              style={{ fontSize: `${Math.max(18, 36 * scale)}px`, marginBottom: `${Math.max(8, 16 * scale)}px` }}
            >
              {slide.songTitle}
            </div>
            {slide.section && (
              <div 
                className={`text-muted-foreground uppercase text-center break-words w-full`}
                style={{ fontSize: `${Math.max(14, 28 * scale)}px`, marginBottom: `${Math.max(12, 24 * scale)}px` }}
              >
                {slide.section}
              </div>
            )}
            <div 
              className={`leading-relaxed text-center whitespace-pre-line break-words w-full`}
              style={{ 
                fontSize: `${scaledFontSize}px`,
                lineHeight: '1.6'
              }}
            >
              {slide.content}
            </div>
            <div 
              className="text-muted-foreground text-center"
              style={{ fontSize: `${Math.max(12, 24 * scale)}px`, marginTop: `${Math.max(16, 32 * scale)}px` }}
            >
              {slide.slideNumber} / {slide.totalSlides}
            </div>
          </div>
        </div>
      );

    case 'image':
      return (
        <div ref={containerRef} className={`relative h-full w-full ${className}`}>
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {slide.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white" style={{ padding: `${Math.max(12, 32 * scale)}px` }}>
              <p className="text-center" style={{ fontSize: `${Math.max(18, 48 * scale)}px` }}>{slide.caption}</p>
            </div>
          )}
        </div>
      );

    case 'announcement':
      return (
        <div ref={containerRef} className={`flex flex-col items-center justify-center h-full w-full overflow-hidden ${className}`} style={{ padding: `${Math.max(32, 64 * scale)}px` }}>
          {slide.imageUrl && (
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="rounded-lg"
              style={{ maxHeight: `${Math.max(100, 256 * scale)}px`, marginBottom: `${Math.max(16, 32 * scale)}px` }}
            />
          )}
          <div 
            className="font-bold text-primary text-center break-words w-full"
            style={{ fontSize: `${Math.max(24, 64 * scale)}px`, marginBottom: `${Math.max(12, 24 * scale)}px` }}
          >
            {slide.title}
          </div>
          <div 
            className="leading-relaxed text-center whitespace-pre-line break-words w-full"
            style={{ 
              fontSize: `${Math.max(18, 48 * scale)}px`,
              lineHeight: '1.6'
            }}
          >
            {slide.content}
          </div>
        </div>
      );

    default:
      return (
        <div ref={containerRef} className={`flex items-center justify-center h-full w-full ${className}`}>
          <p className="text-muted-foreground" style={{ fontSize: `${Math.max(18, 36 * scale)}px` }}>Unknown slide type</p>
        </div>
      );
  }
};
