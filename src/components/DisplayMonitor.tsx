import { useState, useEffect } from 'react';
import { syncService } from '@/lib/syncService';
import { Monitor, MonitorPlay, TvMinimalPlay } from 'lucide-react';
import { Slide } from '@/types/service';
import { SlideDisplay } from './SlideDisplay';

export const DisplayMonitor = () => {
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
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

    // Subscribe to slide updates
    const unsubscribe = syncService.subscribe((message) => {
      console.log('DisplayMonitor received message:', message);
      
      if (message.type === 'SLIDE_UPDATE') {
        console.log('DisplayMonitor handling SLIDE_UPDATE:', message.data);
        
        if (message.data.slide) {
          setCurrentSlide(message.data.slide);
          console.log('DisplayMonitor updated to show slide:', message.data.slide.title);
        } else {
          setCurrentSlide(null);
          console.log('DisplayMonitor cleared (no slide)');
        }
      } else if (message.type === 'VERSE_UPDATE' && message.data.verse) {
        // Legacy verse update support
        const verse = message.data.verse;
        const scriptureSlide: Slide = {
          id: `temp-${Date.now()}`,
          type: 'scripture',
          title: `${verse.book} ${verse.chapter}:${verse.verse}`,
          verse: verse,
          textFormatting: { fontSize: 'medium', alignment: 'center' }
        };
        setCurrentSlide(scriptureSlide);
        console.log('DisplayMonitor updated with legacy verse:', scriptureSlide.title);
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Main Projection Display Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MonitorPlay className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Main Projection</h4>
          </div>
          <span className="text-xs text-muted-foreground">1920×1080</span>
        </div>
        <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-border shadow-lg">
          {currentSlide ? (
            <SlideDisplay slide={currentSlide} className="h-full" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/50">
              <MonitorPlay className="w-12 h-12 mb-2" />
              <p className="text-sm">Waiting for content...</p>
            </div>
          )}
        </div>
      </div>

      {/* Lower Third Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TvMinimalPlay className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Lower Third</h4>
          </div>
          <span className="text-xs text-muted-foreground">Chroma Key</span>
        </div>
        <div className="aspect-video bg-[#00FF00] rounded-lg overflow-hidden border-2 border-border shadow-lg relative">
          {currentSlide && currentSlide.type === 'scripture' ? (
            <div className="absolute inset-0 flex items-end justify-center p-4">
              {lowerThirdSettings?.showBackground ? (
                <div 
                  className="rounded-lg px-6 py-3 max-w-full"
                  style={{
                    backgroundColor: `${lowerThirdSettings.backgroundColor}${Math.round((lowerThirdSettings.backgroundOpacity || 90) * 2.55).toString(16).padStart(2, '0')}`,
                  }}
                >
                  <p 
                    className="font-bold text-center text-sm"
                    style={{ 
                      color: lowerThirdSettings?.textColor || '#FFFFFF'
                    }}
                  >
                    {currentSlide.verse.book} {currentSlide.verse.chapter}:{currentSlide.verse.verse}
                  </p>
                  <p 
                    className="text-center mt-1 text-xs line-clamp-2"
                    style={{ 
                      color: lowerThirdSettings?.textColor || '#FFFFFF',
                      opacity: 0.9
                    }}
                  >
                    {currentSlide.verse.text}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p 
                    className="font-bold text-sm"
                    style={{ 
                      color: lowerThirdSettings?.textColor || '#FFFFFF',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    {currentSlide.verse.book} {currentSlide.verse.chapter}:{currentSlide.verse.verse}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <TvMinimalPlay className="w-12 h-12 text-white/30" />
            </div>
          )}
        </div>
      </div>

      {/* Confidence Monitor Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Confidence Monitor</h4>
          </div>
          <span className="text-xs text-muted-foreground">1920×1080</span>
        </div>
        <div className="aspect-video bg-background rounded-lg overflow-hidden border-2 border-border shadow-lg">
          {currentSlide ? (
            <div className="h-full p-4 flex flex-col">
              <div className="text-center space-y-2">
                <p className="font-bold text-sm text-foreground">
                  {currentSlide.title}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {currentSlide.type}
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center mt-4">
                <div className="w-full aspect-video bg-black/50 rounded overflow-hidden">
                  <SlideDisplay slide={currentSlide} className="h-full scale-75 origin-center" />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Monitor className="w-12 h-12 mb-2" />
              <p className="text-sm">No content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};