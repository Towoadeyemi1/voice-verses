import { useEffect, useState } from 'react';
import { BibleVerse } from '@/types/bible';
import { ProjectionSettings } from '@/pages/Projection';

interface ProjectionDisplayProps {
  verse: BibleVerse | null;
  settings?: ProjectionSettings;
}

const defaultSettings: ProjectionSettings = {
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  accentColor: '#3B82F6',
  fontSize: 72,
  showReference: true,
  textAlign: 'center',
  padding: 64,
  fontFamily: 'serif',
};

export const ProjectionDisplay = ({ verse, settings: propSettings }: ProjectionDisplayProps) => {
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState<ProjectionSettings>(propSettings || defaultSettings);

  useEffect(() => {
    if (verse) {
      setShow(false);
      setTimeout(() => setShow(true), 50);
    }
  }, [verse]);

  useEffect(() => {
    if (propSettings) {
      setSettings(propSettings);
      return;
    }

    // Load settings from localStorage if not provided as prop
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('cornerstone-projection-settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    };

    loadSettings();

    // Listen for settings updates
    const handleSettingsUpdate = (event: CustomEvent) => {
      setSettings({ ...defaultSettings, ...event.detail });
    };

    window.addEventListener('projection-settings-updated', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('projection-settings-updated', handleSettingsUpdate as EventListener);
    };
  }, [propSettings]);

  if (!verse) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
      >
        <div className="text-center space-y-4 px-8">
          <div 
            className="w-24 h-24 mx-auto rounded-full border-4 flex items-center justify-center"
            style={{ borderColor: `${settings.accentColor}30` }}
          >
            <svg
              className="w-12 h-12"
              style={{ color: settings.accentColor }}
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-3xl font-light" style={{ color: `${settings.textColor}60` }}>
            Waiting for Scripture...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ 
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
        padding: `${settings.padding}px`,
      }}
    >
      <div
        className={`max-w-6xl w-full space-y-12 transition-all duration-500 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ textAlign: settings.textAlign }}
      >
        {/* Verse Text */}
        <div>
          <p 
            className="leading-relaxed"
            style={{ 
              fontSize: `${settings.fontSize}px`,
              fontFamily: settings.fontFamily,
              color: settings.textColor,
            }}
          >
            "{verse.text}"
          </p>
        </div>

        {/* Reference */}
        {settings.showReference && (
          <div className="pt-8 border-t" style={{ borderColor: `${settings.accentColor}20` }}>
            <p 
              className="font-semibold"
              style={{ 
                fontSize: `${Math.floor(settings.fontSize * 0.5)}px`,
                color: settings.accentColor,
              }}
            >
              {verse.book} {verse.chapter}:{verse.verse}
            </p>
            <p 
              className="mt-2"
              style={{ 
                fontSize: `${Math.floor(settings.fontSize * 0.3)}px`,
                color: `${settings.textColor}60`,
              }}
            >
              King James Version
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
