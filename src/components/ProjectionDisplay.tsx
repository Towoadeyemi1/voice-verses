import { useEffect, useState, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (verse) {
      setShow(false);
      setTimeout(() => setShow(true), 50);
    }
  }, [verse]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const baseWidth = 1920;
        const baseHeight = 1080;
        const scaleX = container.clientWidth / baseWidth;
        const scaleY = container.clientHeight / baseHeight;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
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

  const scaledFontSize = Math.max(16, settings.fontSize * scale);
  const scaledPadding = Math.max(16, settings.padding * scale);

  if (!verse) {
    return (
      <div 
        ref={containerRef}
        className="min-h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
      >
        <div className="text-center space-y-4 px-8">
          <div 
            className="mx-auto rounded-full border-4 flex items-center justify-center"
            style={{ 
              borderColor: `${settings.accentColor}30`,
              width: `${Math.max(48, 96 * scale)}px`,
              height: `${Math.max(48, 96 * scale)}px`
            }}
          >
            <svg
              style={{ 
                color: settings.accentColor,
                width: `${Math.max(24, 48 * scale)}px`,
                height: `${Math.max(24, 48 * scale)}px`
              }}
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="font-light" style={{ color: `${settings.textColor}60`, fontSize: `${Math.max(18, 48 * scale)}px` }}>
            Waiting for Scripture...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ 
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
        padding: `${scaledPadding}px`,
      }}
    >
      <div
        className={`w-full h-full flex flex-col items-center justify-center transition-all duration-500 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ textAlign: settings.textAlign, gap: `${Math.max(16, 32 * scale)}px` }}
      >
        {/* Verse Text - Takes up most of the space */}
        <div className="flex-1 flex items-center justify-center w-full" style={{ paddingLeft: `${Math.max(16, 32 * scale)}px`, paddingRight: `${Math.max(16, 32 * scale)}px` }}>
          <p 
            className="leading-relaxed"
            style={{ 
              fontSize: `${scaledFontSize}px`,
              fontFamily: settings.fontFamily,
              color: settings.textColor,
              lineHeight: '1.4',
              maxWidth: '90%',
            }}
          >
            {verse.text}
          </p>
        </div>

        {/* Reference - Fixed at bottom */}
        {settings.showReference && (
          <div className="w-full border-t" style={{ borderColor: `${settings.accentColor}30`, paddingTop: `${Math.max(12, 24 * scale)}px` }}>
            <p 
              className="font-semibold text-center"
              style={{ 
                fontSize: `${Math.max(14, Math.floor(scaledFontSize * 0.4))}px`,
                color: settings.accentColor,
              }}
            >
              {verse.book} {verse.chapter}:{verse.verse}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
