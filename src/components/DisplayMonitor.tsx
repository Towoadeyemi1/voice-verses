import { useState, useEffect } from 'react';
import { syncService } from '@/lib/syncService';
import { Monitor, MonitorPlay, TvMinimalPlay } from 'lucide-react';
import { Slide } from '@/types/service';
import { SlidePreview } from './SlidePreview';
import { LowerThirdDisplay } from './LowerThirdDisplay';
import { BibleVerse } from '@/types/bible';

export const DisplayMonitor = () => {
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const [lowerThirdSettings, setLowerThirdSettings] = useState<any>(null);
  const [projectionSettings, setProjectionSettings] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    // Load settings
    const loadSettings = () => {
      const lowerThird = localStorage.getItem('cornerstone-lower-third-settings');
      const projection = localStorage.getItem('cornerstone-settings');
      const currentDisplay = localStorage.getItem('cornerstone-current-display');
      
      if (lowerThird) setLowerThirdSettings(JSON.parse(lowerThird));
      if (projection) setProjectionSettings(JSON.parse(projection));
      
      // Check for logo display
      if (currentDisplay) {
        try {
          const displayData = JSON.parse(currentDisplay);
          if (displayData.type === 'show-logo' && displayData.logoUrl) {
            setLogoUrl(displayData.logoUrl);
          }
        } catch (e) {
          console.error('Failed to parse display data', e);
        }
      }
    };

    loadSettings();

    // Listen for logo display commands via BroadcastChannel
    const displayChannel = new BroadcastChannel('cornerstone-display');
    displayChannel.addEventListener('message', (event) => {
      if (event.data?.type === 'show-logo' && event.data?.logoUrl) {
        setLogoUrl(event.data.logoUrl);
      }
    });

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
      displayChannel.close();
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
      {/* Main Projection Display Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <MonitorPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
          <span className="text-[10px] sm:text-[11px] font-medium text-foreground">Main</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-auto">1920×1080</span>
        </div>
        <div className="aspect-video bg-black rounded-md overflow-hidden border border-border/50 relative">
          {currentSlide ? (
            <SlidePreview slide={currentSlide} className="h-full w-full" />
          ) : logoUrl ? (
            <div className="h-full flex items-center justify-center p-4">
              <img 
                src={logoUrl} 
                alt="Service Logo" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/30">
              <MonitorPlay className="w-6 h-6 sm:w-8 sm:h-8 mb-1" />
              <p className="text-[9px] sm:text-[10px]">Waiting...</p>
            </div>
          )}
        </div>
      </div>

      {/* Lower Third Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <TvMinimalPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
          <span className="text-[10px] sm:text-[11px] font-medium text-foreground">Lower</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-auto">Chroma</span>
        </div>
        <div className="aspect-video bg-[#00FF00] rounded-md overflow-hidden border border-border/50 relative">
          <div className="w-[1920px] h-[1080px] origin-top-left absolute" style={{ transform: 'scale(0.13)' }}>
            <LowerThirdDisplay 
              verse={currentSlide?.type === 'scripture' ? currentSlide.verse : null}
              slide={currentSlide?.type === 'lyrics' ? currentSlide : null}
            />
          </div>
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
            <SlidePreview slide={currentSlide} className="h-full w-full" hideReference={true} />
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