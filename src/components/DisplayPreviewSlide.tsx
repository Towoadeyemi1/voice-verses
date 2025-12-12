import { Slide } from '@/types/service';

interface DisplayPreviewSlideProps {
  slide: Slide | null;
  hideReference?: boolean;
}

// Calculate adaptive font size based on text length to fill 85% of screen
const getAdaptiveFontSize = (text: string, maxFontSize: number, minFontSize: number): number => {
  const charCount = text.length;
  
  // Thresholds for different text lengths (optimized for 1920x1080 at 85% fill)
  if (charCount <= 50) return maxFontSize;           // Very short: max size
  if (charCount <= 100) return Math.round(maxFontSize * 0.85);  // Short
  if (charCount <= 150) return Math.round(maxFontSize * 0.7);   // Medium-short
  if (charCount <= 200) return Math.round(maxFontSize * 0.6);   // Medium
  if (charCount <= 300) return Math.round(maxFontSize * 0.5);   // Medium-long
  if (charCount <= 400) return Math.round(maxFontSize * 0.42);  // Long
  if (charCount <= 500) return Math.round(maxFontSize * 0.35);  // Very long
  return minFontSize;  // Extra long: minimum size
};

// Calculate adaptive reference font size
const getAdaptiveReferenceFontSize = (textFontSize: number): number => {
  return Math.max(48, Math.round(textFontSize * 0.5));
};

export const DisplayPreviewSlide = ({ slide, hideReference = false }: DisplayPreviewSlideProps) => {
  if (!slide) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p style={{ fontSize: '48px' }} className="text-muted-foreground">
          No slide selected
        </p>
      </div>
    );
  }

  const alignment = slide.textFormatting?.alignment || 'center';
  
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
      // Adaptive font sizing: max 280px for short verses, min 80px for long verses
      const scriptureFontSize = getAdaptiveFontSize(slide.verse.text, 280, 80);
      const referenceFontSize = getAdaptiveReferenceFontSize(scriptureFontSize);
      
      return (
        <div className={`relative flex items-center justify-center h-full w-full text-white`} style={{ ...backgroundStyle, width: '1920px', height: '1080px', minWidth: '1920px' }}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center" style={{ width: '1840px', height: '920px', padding: '32px' }}>
            {!hideReference && (
              <div 
                className="font-bold text-center"
                style={{ fontSize: `${referenceFontSize}px`, color: '#3B82F6', marginBottom: '40px', width: '100%' }}
              >
                {slide.verse.book} {slide.verse.chapter}:{slide.verse.verse}
              </div>
            )}
            <div 
              className="text-center"
              style={{ 
                fontSize: `${scriptureFontSize}px`,
                lineHeight: '1.3',
                width: '100%',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal'
              }}
            >
              {slide.verse.text}
            </div>
          </div>
        </div>
      );

    case 'lyrics':
      // Adaptive font sizing for lyrics content
      const lyricsFontSize = getAdaptiveFontSize(slide.content || '', 240, 80);
      
      return (
        <div className={`relative flex items-center justify-center h-full w-full text-white`} style={{ ...backgroundStyle, width: '1920px', height: '1080px', minWidth: '1920px' }}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center" style={{ width: '1840px', height: '920px', padding: '32px' }}>
            <div 
              className="font-semibold text-center"
              style={{ fontSize: '100px', color: '#3B82F6', marginBottom: '32px', width: '100%' }}
            >
              {slide.songTitle}
            </div>
            {slide.section && (
              <div 
                className="uppercase text-center"
                style={{ fontSize: '72px', color: '#9CA3AF', marginBottom: '40px', width: '100%' }}
              >
                {slide.section}
              </div>
            )}
            <div 
              className="text-center"
              style={{ 
                fontSize: `${lyricsFontSize}px`,
                lineHeight: '1.3',
                width: '100%',
                whiteSpace: 'pre-line',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
              {slide.content}
            </div>
            <div 
              className="text-center"
              style={{ fontSize: '36px', color: '#9CA3AF', marginTop: '32px' }}
            >
              {slide.slideNumber} / {slide.totalSlides}
            </div>
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="relative h-full w-full">
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {slide.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white" style={{ padding: '32px' }}>
              <p className="text-center" style={{ fontSize: '48px' }}>{slide.caption}</p>
            </div>
          )}
        </div>
      );

    case 'announcement':
      return (
        <div className="flex flex-col items-center justify-center h-full w-full text-white" style={{ width: '1920px', height: '1080px', minWidth: '1920px', padding: '64px' }}>
          {slide.imageUrl && (
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="rounded-lg"
              style={{ maxHeight: '256px', marginBottom: '32px' }}
            />
          )}
          <div 
            className="font-bold text-center"
            style={{ fontSize: '64px', color: '#3B82F6', marginBottom: '24px', width: '100%', maxWidth: '1600px' }}
          >
            {slide.title}
          </div>
          <div 
            className="text-center"
            style={{ 
              fontSize: '48px',
              lineHeight: '1.6',
              width: '100%',
              maxWidth: '1600px',
              whiteSpace: 'pre-line',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {slide.content}
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full w-full">
          <p className="text-muted-foreground" style={{ fontSize: '36px' }}>Unknown slide type</p>
        </div>
      );
  }
};
