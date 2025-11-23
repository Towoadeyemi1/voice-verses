import { Slide } from '@/types/service';

interface SlidePreviewProps {
  slide: Slide | null;
  className?: string;
  hideReference?: boolean;
}

export const SlidePreview = ({ slide, className = '', hideReference = false }: SlidePreviewProps) => {
  if (!slide) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-muted-foreground text-xs">No content</p>
      </div>
    );
  }

  const backgroundStyle = slide.backgroundMedia?.url
    ? {
        backgroundImage: `url(${slide.backgroundMedia.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { backgroundColor: '#000000' };

  switch (slide.type) {
    case 'scripture':
      return (
        <div className={`relative h-full w-full overflow-hidden ${className}`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-3 text-center">
            {!hideReference && (
              <div className="text-primary font-semibold text-[10px] mb-1.5 line-clamp-1">
                {slide.verse?.book} {slide.verse?.chapter}:{slide.verse?.verse}
              </div>
            )}
            <div className="text-white text-[11px] leading-relaxed line-clamp-4">
              {slide.verse?.text}
            </div>
          </div>
        </div>
      );

    case 'lyrics':
      return (
        <div className={`relative h-full w-full overflow-hidden ${className}`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-3 text-center">
            <div className="text-primary font-semibold text-[9px] mb-1 line-clamp-1">
              {slide.songTitle} {slide.section && `- ${slide.section}`}
            </div>
            <div className="text-white text-[11px] leading-relaxed line-clamp-4">
              {slide.content}
            </div>
            {slide.slideNumber && (
              <div className="text-muted-foreground text-[8px] mt-1">
                {slide.slideNumber}
              </div>
            )}
          </div>
        </div>
      );

    case 'image':
      return (
        <div className={`relative h-full w-full overflow-hidden ${className}`} style={backgroundStyle}>
          {slide.imageUrl && (
            <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-contain" />
          )}
          {slide.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-white text-[10px] text-center">
              {slide.caption}
            </div>
          )}
        </div>
      );

    case 'announcement':
      return (
        <div className={`relative h-full w-full overflow-hidden ${className}`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-3 text-center">
            <div className="text-primary font-bold text-[11px] mb-1.5 line-clamp-1">
              {slide.title}
            </div>
            <div className="text-white text-[10px] leading-relaxed line-clamp-3">
              {slide.content}
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className={`flex items-center justify-center h-full ${className}`}>
          <p className="text-muted-foreground text-xs">Unknown slide type</p>
        </div>
      );
  }
};
