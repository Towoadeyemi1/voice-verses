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
    <div className="grid grid-cols-3 gap-3">
      {/* Main Projection Display Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <MonitorPlay className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-medium text-foreground">Main</span>
          <span className="text-[10px] text-muted-foreground ml-auto">1920×1080</span>
        </div>
        <div className="aspect-video bg-black rounded-md overflow-hidden border border-border/50 relative">
          {currentSlide ? (
            <div className="absolute inset-0">
              <div className="w-[1920px] h-[1080px] origin-top-left" style={{ transform: 'scale(0.13)' }}>
                <SlideDisplay slide={currentSlide} className="h-full w-full" />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/30">
              <MonitorPlay className="w-8 h-8 mb-1" />
              <p className="text-[10px]">Waiting...</p>
            </div>
          )}
        </div>
      </div>

      {/* Lower Third Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <TvMinimalPlay className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-medium text-foreground">Lower</span>
          <span className="text-[10px] text-muted-foreground ml-auto">Chroma</span>
        </div>
        <div className="aspect-video bg-[#00FF00] rounded-md overflow-hidden border border-border/50 relative">
          {currentSlide && currentSlide.type === 'scripture' ? (
            <div className="absolute inset-0 flex items-end justify-center p-3">
              {lowerThirdSettings?.showBackground ? (
                <div 
                  className="rounded px-4 py-2 max-w-full"
                  style={{
                    backgroundColor: `${lowerThirdSettings.backgroundColor}${Math.round((lowerThirdSettings.backgroundOpacity || 90) * 2.55).toString(16).padStart(2, '0')}`,
                  }}
                >
                  <p 
                    className="font-bold text-center text-[10px]"
                    style={{ 
                      color: lowerThirdSettings?.textColor || '#FFFFFF'
                    }}
                  >
                    {currentSlide.verse.book} {currentSlide.verse.chapter}:{currentSlide.verse.verse}
                  </p>
                </div>
              ) : (
                <p 
                  className="font-bold text-[10px]"
                  style={{ 
                    color: lowerThirdSettings?.textColor || '#FFFFFF',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                  }}
                >
                  {currentSlide.verse.book} {currentSlide.verse.chapter}:{currentSlide.verse.verse}
                </p>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <TvMinimalPlay className="w-8 h-8 text-white/20" />
            </div>
          )}
        </div>
      </div>

      {/* Confidence Monitor Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <Monitor className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-medium text-foreground">Confidence</span>
          <span className="text-[10px] text-muted-foreground ml-auto">1920×1080</span>
        </div>
        <div className="aspect-video bg-background rounded-md overflow-hidden border border-border/50 relative">
          {currentSlide ? (
            <div className="absolute inset-0 flex flex-col p-1.5">
              <div className="text-center mb-1">
                <p className="font-bold text-[9px] text-foreground truncate">
                  {currentSlide.title}
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center relative">
                <div className="w-full h-full bg-black/50 rounded-sm overflow-hidden relative">
                  <div className="w-[1920px] h-[1080px] origin-top-left absolute" style={{ transform: 'scale(0.11)' }}>
                    <SlideDisplay slide={currentSlide} className="h-full w-full" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Monitor className="w-8 h-8 mb-1" />
              <p className="text-[10px]">No content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};