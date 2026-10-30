import { ReactNode, useState, useEffect } from 'react';
import { SyncMessage, syncService } from '@/lib/syncService';
import { Monitor, MonitorPlay, TvMinimalPlay } from 'lucide-react';
import { Slide } from '@/types/service';
import { SlideDisplay } from './SlideDisplay';
import { ProjectionDisplay } from './ProjectionDisplay';
import { BibleVerse } from '@/types/bible';
import { LowerThirdDisplay } from './LowerThirdDisplay';
import { ScaledStage } from './ScaledStage';
import { verseReference } from '@/lib/verseText';

const Preview = ({ icon, label, note, children }: { icon: ReactNode; label: string; note: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 px-1">
      {icon}
      <span className="text-[10px] sm:text-[11px] font-medium text-foreground">{label}</span>
      <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-auto">{note}</span>
    </div>
    {children}
  </div>
);

/** Small live previews of the projection, lower third and confidence outputs. */
export const DisplayMonitor = () => {
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  // Set for voice-controlled verses, which the projection shows in its own style
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    const handle = (message: SyncMessage) => {
      if (message.type === 'LOGO') {
        setLogoUrl(message.data.logoUrl ?? '');
        setCurrentSlide(null);
        setVerse(null);
      } else if (message.type === 'SLIDE_UPDATE') {
        setCurrentSlide(message.data.slide ?? null);
        setVerse(null);
        setLogoUrl('');
      } else if (message.type === 'VERSE_UPDATE' && message.data.verse) {
        const verse = message.data.verse;
        setVerse(verse);
        setCurrentSlide({
          id: `verse-${verseReference(verse)}`,
          type: 'scripture',
          title: verseReference(verse),
          verse,
          textFormatting: { fontSize: 'medium', alignment: 'center' },
        });
        setLogoUrl('');
      }
    };

    const live = syncService.current();
    if (live) handle(live);
    return syncService.subscribe(handle);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
      <Preview icon={<MonitorPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />} label="Main" note="1920×1080">
        <ScaledStage className="aspect-video bg-background rounded-md border border-border/50">
          {verse ? (
            <ProjectionDisplay verse={verse} />
          ) : currentSlide ? (
            <SlideDisplay slide={currentSlide} className="h-full w-full" />
          ) : logoUrl ? (
            <div className="h-full flex items-center justify-center">
              <img src={logoUrl} alt="Service logo" className="max-w-[80%] max-h-[80%] object-contain" />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/30">
              <MonitorPlay className="w-40 h-40 mb-6" />
              <p className="text-6xl">Waiting...</p>
            </div>
          )}
        </ScaledStage>
      </Preview>

      <Preview icon={<TvMinimalPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />} label="Lower" note="Chroma">
        <ScaledStage className="aspect-video bg-[#00FF00] rounded-md border border-border/50">
          <LowerThirdDisplay
            verse={currentSlide?.type === 'scripture' ? currentSlide.verse : null}
            slide={currentSlide?.type === 'lyrics' ? currentSlide : null}
          />
        </ScaledStage>
      </Preview>

      <Preview icon={<Monitor className="w-3.5 h-3.5 text-primary" />} label="Confidence" note="1920×1080">
        <ScaledStage className="aspect-video bg-background rounded-md border border-border/50">
          {currentSlide ? (
            <SlideDisplay slide={currentSlide} className="h-full w-full" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Monitor className="w-40 h-40 mb-6" />
              <p className="text-6xl">No content</p>
            </div>
          )}
        </ScaledStage>
      </Preview>
    </div>
  );
};
