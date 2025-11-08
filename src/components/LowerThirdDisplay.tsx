import { useEffect, useState } from 'react';
import { BibleVerse } from '@/types/bible';

interface LowerThirdDisplayProps {
  verse: BibleVerse | null;
}

export type LowerThirdTemplate = 'classic' | 'modern' | 'minimal' | 'elegant' | 'bold';
export type LowerThirdPosition = 'bottom-left' | 'bottom-center' | 'bottom-right';

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

export const LowerThirdDisplay = ({ verse }: LowerThirdDisplayProps) => {
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState<LowerThirdSettings>(defaultSettings);

  useEffect(() => {
    if (verse) {
      setShow(false);
      setTimeout(() => setShow(true), 50);
    }
  }, [verse]);

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
    switch (settings.position) {
      case 'bottom-left':
        return 'items-end justify-start pb-16 pl-16';
      case 'bottom-right':
        return 'items-end justify-end pb-16 pr-16';
      case 'bottom-center':
      default:
        return 'items-end justify-center pb-16';
    }
  };

  const getTemplateClasses = () => {
    const base = settings.showBackground 
      ? `bg-black/[${settings.backgroundOpacity}] backdrop-blur-sm` 
      : '';
    
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

  if (!verse) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#00FF00' }}
      >
        <div className="text-center space-y-4 px-8 bg-black/50 rounded-lg p-8">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-white/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-xl text-white/80 font-light">
            Waiting for Scripture...
          </p>
          <p className="text-sm text-white/60">
            Chroma Key Ready (Green Screen)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen flex ${getPositionClasses()}`}
      style={{ backgroundColor: '#00FF00' }}
    >
      <div
        className={`max-w-4xl transition-all duration-500 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        } ${getTemplateClasses()}`}
        style={{ 
          borderColor: settings.template === 'modern' ? settings.accentColor : undefined,
          borderBottomColor: settings.template === 'minimal' ? settings.accentColor : undefined,
        }}
      >
        {/* Verse Text */}
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
      </div>
    </div>
  );
};
