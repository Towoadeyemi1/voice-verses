import { Slide } from '@/types/service';

interface DisplayPreviewSlideProps {
  slide: Slide | null;
  hideReference?: boolean;
}

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

  // Fixed font sizes for 1920x1080 resolution - LARGE for church projection
  const fontSize = slide.textFormatting?.fontSize || 'large';
  const alignment = slide.textFormatting?.alignment || 'center';
  const fontSizeMap = {
    small: 72,
    medium: 96,
    large: 120,
    xlarge: 144,
  };
  const baseFontSize = fontSizeMap[fontSize];
  
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
        <div className={`relative flex items-center justify-center h-full w-full text-white`} style={{ ...backgroundStyle, width: '1920px', height: '1080px', minWidth: '1920px' }}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center h-full" style={{ width: '1600px', padding: '64px' }}>
            {!hideReference && (
              <div 
                className="font-bold text-center"
                style={{ fontSize: '72px', color: '#3B82F6', marginBottom: '48px', width: '100%' }}
              >
                {slide.verse.book} {slide.verse.chapter}:{slide.verse.verse}
              </div>
            )}
            <div 
              className="text-center"
              style={{ 
                fontSize: `${baseFontSize}px`,
                lineHeight: '1.6',
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
      return (
        <div className={`relative flex items-center justify-center h-full w-full text-white`} style={{ ...backgroundStyle, width: '1920px', height: '1080px', minWidth: '1920px' }}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center h-full" style={{ width: '1600px', padding: '64px' }}>
            <div 
              className="font-semibold text-center"
              style={{ fontSize: '56px', color: '#3B82F6', marginBottom: '24px', width: '100%' }}
            >
              {slide.songTitle}
            </div>
            {slide.section && (
              <div 
                className="uppercase text-center"
                style={{ fontSize: '40px', color: '#9CA3AF', marginBottom: '32px', width: '100%' }}
              >
                {slide.section}
              </div>
            )}
            <div 
              className="text-center"
              style={{ 
                fontSize: `${baseFontSize}px`,
                lineHeight: '1.6',
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
              style={{ fontSize: '24px', color: '#9CA3AF', marginTop: '32px' }}
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
