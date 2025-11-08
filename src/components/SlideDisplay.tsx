import { Slide } from '@/types/service';

interface SlideDisplayProps {
  slide: Slide | null;
  className?: string;
}

export const SlideDisplay = ({ slide, className = '' }: SlideDisplayProps) => {
  if (!slide) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-4xl text-muted-foreground">No slide selected</p>
      </div>
    );
  }

  const fontSize = slide.textFormatting?.fontSize || 'large';
  const alignment = slide.textFormatting?.alignment || 'center';
  const fontSizeClasses = {
    small: 'text-3xl',
    medium: 'text-4xl',
    large: 'text-5xl',
    xlarge: 'text-6xl',
  };
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
        <div className={`relative flex flex-col items-center justify-center h-full p-12 ${className}`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className={`text-3xl font-bold text-primary mb-8 ${alignmentClasses[alignment]}`}>
              {slide.verse.book} {slide.verse.chapter}:{slide.verse.verse}
            </div>
            <div className={`${fontSizeClasses[fontSize]} leading-relaxed ${alignmentClasses[alignment]} max-w-5xl`}>
              {slide.verse.text}
            </div>
          </div>
        </div>
      );

    case 'lyrics':
      return (
        <div className={`relative flex flex-col items-center justify-center h-full p-12 ${className}`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className={`text-2xl font-semibold text-primary mb-4 ${alignmentClasses[alignment]}`}>
              {slide.songTitle}
            </div>
            {slide.section && (
              <div className={`text-xl text-muted-foreground mb-6 uppercase ${alignmentClasses[alignment]}`}>
                {slide.section}
              </div>
            )}
            <div className={`${fontSizeClasses[fontSize]} leading-relaxed ${alignmentClasses[alignment]} max-w-4xl whitespace-pre-line`}>
              {slide.content}
            </div>
            <div className="text-lg text-muted-foreground mt-8">
              {slide.slideNumber} / {slide.totalSlides}
            </div>
          </div>
        </div>
      );

    case 'image':
      return (
        <div className={`relative h-full ${className}`}>
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {slide.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-6">
              <p className="text-3xl text-center">{slide.caption}</p>
            </div>
          )}
        </div>
      );

    case 'announcement':
      return (
        <div className={`flex flex-col items-center justify-center h-full p-12 ${className}`}>
          {slide.imageUrl && (
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="max-h-64 mb-8 rounded-lg"
            />
          )}
          <div className="text-4xl font-bold text-primary mb-6">
            {slide.title}
          </div>
          <div className="text-3xl leading-relaxed text-center max-w-4xl whitespace-pre-line">
            {slide.content}
          </div>
        </div>
      );

    default:
      return (
        <div className={`flex items-center justify-center h-full ${className}`}>
          <p className="text-2xl text-muted-foreground">Unknown slide type</p>
        </div>
      );
  }
};
