import { useState, useEffect } from 'react';
import { BibleVerse } from '@/types/bible';
import { syncService } from '@/lib/syncService';
import { Card } from '@/components/ui/card';
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Projection Display Preview */}
      <Card className="p-3 space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b">
          <MonitorPlay className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Main Projection</h3>
        </div>
        <div className="aspect-video bg-projection-bg rounded-lg overflow-hidden border-2 border-border">
          <div className="h-full flex flex-col items-center justify-center p-4 text-projection-text">
            {verse ? (
              <div className="space-y-3 text-center">
                <p 
                  className="font-serif leading-relaxed"
                  style={{ fontSize: `${(projectionSettings?.fontSize || 72) / 6}px` }}
                >
                  "{verse.text}"
                </p>
                {(projectionSettings?.showReference ?? true) && (
                  <div className="pt-2 border-t border-projection-accent/20">
                    <p 
                      className="font-semibold text-projection-accent"
                      style={{ fontSize: `${(projectionSettings?.fontSize || 72) / 12}px` }}
                    >
                      {verse.book} {verse.chapter}:{verse.verse}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Monitor className="w-8 h-8 mx-auto text-projection-accent/60" />
                <p className="text-projection-text/60 text-xs">Waiting for verse...</p>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          SDI 1 • 1920x1080
        </div>
      </Card>

      {/* Lower Third Preview */}
      <Card className="p-3 space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b">
          <TvMinimalPlay className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Lower Third</h3>
        </div>
        <div className="aspect-video bg-[#00FF00] rounded-lg overflow-hidden border-2 border-border relative">
          <div className="absolute inset-0 flex items-end justify-center p-2">
            {verse && lowerThirdSettings?.showBackground ? (
              <div 
                className="rounded-lg px-4 py-2 max-w-4xl"
                style={{
                  backgroundColor: `${lowerThirdSettings.backgroundColor}${Math.round((lowerThirdSettings.backgroundOpacity || 90) * 2.55).toString(16).padStart(2, '0')}`,
                }}
              >
                <p 
                  className="font-semibold text-center"
                  style={{ 
                    fontSize: `${(lowerThirdSettings?.fontSize || 48) / 6}px`,
                    color: lowerThirdSettings?.textColor || '#FFFFFF'
                  }}
                >
                  {verse.book} {verse.chapter}:{verse.verse}
                </p>
                <p 
                  className="text-center mt-1"
                  style={{ 
                    fontSize: `${(lowerThirdSettings?.fontSize || 48) / 9}px`,
                    color: lowerThirdSettings?.textColor || '#FFFFFF',
                    opacity: 0.9
                  }}
                >
                  {verse.text.substring(0, 80)}...
                </p>
              </div>
            ) : (
              verse && (
                <div className="text-center">
                  <p 
                    className="font-bold"
                    style={{ 
                      fontSize: `${(lowerThirdSettings?.fontSize || 48) / 6}px`,
                      color: lowerThirdSettings?.textColor || '#FFFFFF',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    {verse.book} {verse.chapter}:{verse.verse}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          SDI 2 • Chroma Key
        </div>
      </Card>

      {/* Confidence Monitor Preview */}
      <Card className="p-3 space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Monitor className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Confidence</h3>
        </div>
        <div className="aspect-video bg-background rounded-lg overflow-hidden border-2 border-border">
          <div className="h-full flex items-center justify-center p-3">
            {verse ? (
              <div className="text-center space-y-1">
                <p className="font-bold text-sm">
                  {verse.book} {verse.chapter}:{verse.verse}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {verse.text}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Monitor className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground text-xs">No verse</p>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          SDI 3 • 1920x1080
        </div>
      </Card>
    </div>
  );
};
