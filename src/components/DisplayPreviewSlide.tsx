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

  // Fixed font sizes for 1920x1080 resolution (no dynamic scaling)
  const fontSize = slide.textFormatting?.fontSize || 'large';
  const alignment = slide.textFormatting?.alignment || 'center';
  const fontSizeMap = {
    small: 48,
    medium: 64,
    large: 80,
    xlarge: 96,
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
        <div className={`relative flex items-center justify-center h-full w-full text-white`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-16 py-12">
            {!hideReference && (
              <div 
                className="font-bold text-center break-words w-full mb-8"
                style={{ fontSize: '48px', color: '#3B82F6' }}
              >
                {slide.verse.book} {slide.verse.chapter}:{slide.verse.verse}
              </div>
            )}
            <div 
              className="leading-relaxed text-center break-words w-full max-w-[1600px]"
              style={{ 
                fontSize: `${baseFontSize}px`,
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
        <div className={`relative flex items-center justify-center h-full w-full text-white`} style={backgroundStyle}>
          {slide.backgroundMedia && (
            <div className="absolute inset-0 bg-black" style={{ opacity: 1 - (slide.backgroundMedia.opacity || 0.3) }} />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-16 py-12">
            <div 
              className="font-semibold text-center break-words w-full mb-4"
              style={{ fontSize: '36px', color: '#3B82F6' }}
            >
              {slide.songTitle}
            </div>
            {slide.section && (
              <div 
                className="uppercase text-center break-words w-full mb-6"
                style={{ fontSize: '28px', color: '#9CA3AF' }}
              >
                {slide.section}
              </div>
            )}
            <div 
              className="leading-relaxed text-center whitespace-pre-line break-words w-full max-w-[1600px]"
              style={{ 
                fontSize: `${baseFontSize}px`,
                lineHeight: '1.6'
              }}
            >
              {slide.content}
            </div>
            <div 
              className="text-center mt-8"
              style={{ fontSize: '24px', color: '#9CA3AF' }}
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
        <div className="flex flex-col items-center justify-center h-full w-full text-white px-16 py-12">
          {slide.imageUrl && (
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="rounded-lg mb-8"
              style={{ maxHeight: '256px' }}
            />
          )}
          <div 
            className="font-bold text-center break-words w-full mb-6"
            style={{ fontSize: '64px', color: '#3B82F6' }}
          >
            {slide.title}
          </div>
          <div 
            className="leading-relaxed text-center whitespace-pre-line break-words w-full max-w-[1600px]"
            style={{ 
              fontSize: '48px',
              lineHeight: '1.6'
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
