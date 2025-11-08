import { useState, useEffect } from 'react';
import { BibleVerse } from '@/types/bible';
import { syncService } from '@/lib/syncService';
import { Monitor, MonitorPlay, TvMinimalPlay } from 'lucide-react';

export const DisplayMonitor = () => {
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [lowerThirdSettings, setLowerThirdSettings] = useState<any>(null);
  const [projectionSettings, setProjectionSettings] = useState<any>(null);

  useEffect(() => {
    // Load settings
    const loadSettings = () => {
      const lowerThird = localStorage.getItem('cornerstone-lowerthird-settings');
      const projection = localStorage.getItem('cornerstone-settings');
      
      if (lowerThird) setLowerThirdSettings(JSON.parse(lowerThird));
      if (projection) setProjectionSettings(JSON.parse(projection));
    };

    loadSettings();

    // Subscribe to verse updates
    const unsubscribe = syncService.subscribe((message) => {
      if (message.type === 'VERSE_UPDATE' && message.data.verse) {
        setVerse(message.data.verse);
      }
    });

    // Listen for settings updates
    const handleSettingsUpdate = () => loadSettings();
    window.addEventListener('settings-updated', handleSettingsUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  return (
    <div className="space-y-3 2xl:grid 2xl:grid-cols-2 2xl:gap-3 2xl:space-y-0">
      {/* Projection Display Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MonitorPlay className="w-3.5 h-3.5 text-primary" />
            <h4 className="font-medium text-xs">Main Projection</h4>
          </div>
          <span className="text-[10px] text-muted-foreground">SDI 1 • 1920×1080</span>
        </div>
        <div className="aspect-video bg-projection-bg rounded-md overflow-hidden border border-border/50">
          <div className="h-full flex flex-col items-center justify-center p-3 text-projection-text">
            {verse ? (
              <div className="space-y-2 text-center w-full">
                <p 
                  className="font-serif leading-snug line-clamp-3"
                  style={{ fontSize: '10px' }}
                >
                  "{verse.text}"
                </p>
                {(projectionSettings?.showReference ?? true) && (
                  <div className="pt-1.5 border-t border-projection-accent/20">
                    <p 
                      className="font-semibold text-projection-accent"
                      style={{ fontSize: '8px' }}
                    >
                      {verse.book} {verse.chapter}:{verse.verse}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-1.5">
                <Monitor className="w-6 h-6 mx-auto text-projection-accent/40" />
                <p className="text-projection-text/50 text-[10px]">Waiting for verse...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Third Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TvMinimalPlay className="w-3.5 h-3.5 text-primary" />
            <h4 className="font-medium text-xs">Lower Third</h4>
          </div>
          <span className="text-[10px] text-muted-foreground">SDI 2 • Chroma Key</span>
        </div>
        <div className="aspect-video bg-[#00FF00] rounded-md overflow-hidden border border-border/50 relative">
          <div className="absolute inset-0 flex items-end justify-center p-2">
            {verse && lowerThirdSettings?.showBackground ? (
              <div 
                className="rounded px-3 py-1.5 max-w-full"
                style={{
                  backgroundColor: `${lowerThirdSettings.backgroundColor}${Math.round((lowerThirdSettings.backgroundOpacity || 90) * 2.55).toString(16).padStart(2, '0')}`,
                }}
              >
                <p 
                  className="font-semibold text-center"
                  style={{ 
                    fontSize: '8px',
                    color: lowerThirdSettings?.textColor || '#FFFFFF'
                  }}
                >
                  {verse.book} {verse.chapter}:{verse.verse}
                </p>
                <p 
                  className="text-center mt-0.5 line-clamp-1"
                  style={{ 
                    fontSize: '7px',
                    color: lowerThirdSettings?.textColor || '#FFFFFF',
                    opacity: 0.9
                  }}
                >
                  {verse.text.substring(0, 60)}...
                </p>
              </div>
            ) : (
              verse && (
                <div className="text-center">
                  <p 
                    className="font-bold"
                    style={{ 
                      fontSize: '8px',
                      color: lowerThirdSettings?.textColor || '#FFFFFF',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                    }}
                  >
                    {verse.book} {verse.chapter}:{verse.verse}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Confidence Monitor Preview */}
      <div className="space-y-2 2xl:col-span-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-primary" />
            <h4 className="font-medium text-xs">Confidence</h4>
          </div>
          <span className="text-[10px] text-muted-foreground">SDI 3 • 1920×1080</span>
        </div>
        <div className="aspect-video bg-background rounded-md overflow-hidden border border-border/50">
          <div className="h-full flex items-center justify-center p-2.5">
            {verse ? (
              <div className="text-center space-y-1 w-full">
                <p className="font-bold text-[10px]">
                  {verse.book} {verse.chapter}:{verse.verse}
                </p>
                <p className="text-[9px] text-muted-foreground line-clamp-2 leading-tight">
                  {verse.text}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-1.5">
                <Monitor className="w-6 h-6 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-[10px]">No verse</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};