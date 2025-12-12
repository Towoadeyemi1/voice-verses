import { useEffect, useState } from 'react';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';

interface LowerThirdDisplayProps {
  verse: BibleVerse | null;
  slide?: Slide | null;
}

export type LowerThirdTemplate = 'classic' | 'modern' | 'minimal' | 'elegant' | 'bold';
export type LowerThirdPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface LowerThirdSettings {
  template: LowerThirdTemplate;
  position: LowerThirdPosition;
  fontSize: number;
  showBackground: boolean;
  backgroundOpacity: number;
  textColor: string;
  accentColor: string;
}

const defaultSettings: LowerThirdSettings = {
  template: 'classic',
  position: 'bottom-center',
  fontSize: 32,
  showBackground: true,
  backgroundOpacity: 0.8,
  textColor: '#FFFFFF',
  accentColor: '#3B82F6',
};

export const LowerThirdDisplay = ({ verse, slide }: LowerThirdDisplayProps) => {
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState<LowerThirdSettings>(defaultSettings);

  useEffect(() => {
    if (verse || slide) {
      setShow(false);
      setTimeout(() => setShow(true), 50);
    }
  }, [verse, slide]);

  useEffect(() => {
    // Load settings
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('cornerstone-lower-third-settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    };

    loadSettings();

    // Listen for settings updates
    const handleSettingsUpdate = (event: CustomEvent) => {
      setSettings({ ...defaultSettings, ...event.detail });
    };

    window.addEventListener('lower-third-settings-updated', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('lower-third-settings-updated', handleSettingsUpdate as EventListener);
    };
  }, []);

  const getPositionClasses = () => {
    const padding = 'p-16';
    
    switch (settings.position) {
      // Top positions
      case 'top-left':
        return `items-start justify-start ${padding}`;
      case 'top-center':
        return `items-start justify-center ${padding}`;
      case 'top-right':
        return `items-start justify-end ${padding}`;
      
      // Middle positions
      case 'middle-left':
        return `items-center justify-start ${padding}`;
      case 'middle-center':
        return `items-center justify-center ${padding}`;
      case 'middle-right':
        return `items-center justify-end ${padding}`;
      
      // Bottom positions
      case 'bottom-left':
        return `items-end justify-start ${padding}`;
      case 'bottom-center':
        return `items-end justify-center ${padding}`;
      case 'bottom-right':
        return `items-end justify-end ${padding}`;
      
      default:
        return `items-end justify-center ${padding}`;
    }
  };

  const getTemplateClasses = () => {
    const base = settings.showBackground ? 'backdrop-blur-sm' : '';
    
    switch (settings.template) {
      case 'modern':
        return `${base} rounded-2xl border-l-4 pl-6 pr-8 py-4`;
      case 'minimal':
        return `${base} border-b-2 pb-2`;
      case 'elegant':
        return `${base} rounded-lg border border-white/20 px-8 py-5`;
      case 'bold':
        return `${base} px-8 py-6 shadow-2xl`;
      case 'classic':
      default:
        return `${base} rounded px-6 py-4`;
    }
  };

  const getBackgroundStyle = () => {
    if (!settings.showBackground) return {};
    return {
      backgroundColor: `rgba(0, 0, 0, ${settings.backgroundOpacity})`,
    };
  };

  // Determine what content to show
  const hasContent = verse || (slide && slide.type === 'lyrics');

  return (
    <div 
      className={`absolute inset-0 flex ${getPositionClasses()} pointer-events-none`}
      style={{ backgroundColor: '#00FF00', width: '1920px', height: '1080px' }}
    >
      {hasContent && (
        <div
          className={`max-w-4xl transition-all duration-500 ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          } ${getTemplateClasses()}`}
          style={{ 
            ...getBackgroundStyle(),
            borderColor: settings.template === 'modern' ? settings.accentColor : undefined,
            borderBottomColor: settings.template === 'minimal' ? settings.accentColor : undefined,
          }}
        >
        {verse ? (
          // Scripture Display
          <div className="space-y-2">
            <p 
              className="leading-relaxed font-serif"
              style={{ 
                fontSize: `${settings.fontSize}px`,
                color: settings.textColor,
              }}
            >
              "{verse.text}"
            </p>

            {/* Reference */}
            <div className="flex items-center gap-3 pt-2">
              <div 
                className="h-px flex-1"
                style={{ backgroundColor: `${settings.accentColor}40` }}
              />
              <p 
                className="font-semibold"
                style={{ 
                  fontSize: `${Math.floor(settings.fontSize * 0.6)}px`,
                  color: settings.accentColor,
                }}
              >
                {verse.book} {verse.chapter}:{verse.verse}
              </p>
              <div 
                className="h-px flex-1"
                style={{ backgroundColor: `${settings.accentColor}40` }}
              />
            </div>
          </div>
        ) : slide && slide.type === 'lyrics' ? (
          // Lyrics Display
          <div className="space-y-2">
            <p 
              className="leading-relaxed whitespace-pre-line"
              style={{ 
                fontSize: `${settings.fontSize}px`,
                color: settings.textColor,
              }}
            >
              {slide.content}
            </p>

            {/* Song title and section */}
            <div className="flex items-center gap-3 pt-2">
              <div 
                className="h-px flex-1"
                style={{ backgroundColor: `${settings.accentColor}40` }}
              />
              <p 
                className="font-semibold"
                style={{ 
                  fontSize: `${Math.floor(settings.fontSize * 0.6)}px`,
                  color: settings.accentColor,
                }}
              >
                {slide.songTitle}{slide.section ? ` - ${slide.section}` : ''}
              </p>
              <div 
                className="h-px flex-1"
                style={{ backgroundColor: `${settings.accentColor}40` }}
              />
            </div>
          </div>
        ) : null}
        </div>
      )}
    </div>
  );
};
