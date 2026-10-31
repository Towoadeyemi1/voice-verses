import { ReactNode } from 'react';
import { Monitor, MonitorPlay, TvMinimalPlay } from 'lucide-react';
import { ScaledStage } from './ScaledStage';
import { OutputContent } from './OutputContent';
import { SlideDisplay } from './SlideDisplay';
import { useLive } from '@/hooks/use-live';
import { useCountdown } from '@/hooks/use-countdown';
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

/** Small live previews of the outputs, drawn exactly as the outputs draw them. */
export const DisplayMonitor = () => {
  const { live, logo } = useLive();
  const { countdown, remaining } = useCountdown();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
      <Preview icon={<MonitorPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />} label="Projector" note="1920×1080">
        <ScaledStage className="aspect-video bg-black rounded-md border border-border/50">
          {logo !== null && countdown?.projector !== 'full' ? (
            <div className="h-full flex items-center justify-center" style={{ width: 1920, height: 1080 }}>
              {logo && <img src={logo} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" />}
            </div>
          ) : (
            <OutputContent live={live} output="projection" countdown={countdown} remaining={remaining} />
          )}
        </ScaledStage>
      </Preview>

      <Preview icon={<TvMinimalPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />} label="Lower third" note="Stream">
        <ScaledStage className="aspect-video rounded-md border border-border/50">
          <OutputContent live={logo !== null ? null : live} output="stream" countdown={countdown} remaining={remaining} />
        </ScaledStage>
      </Preview>

      <Preview icon={<Monitor className="w-3.5 h-3.5 text-primary" />} label="Confidence" note="Stage">
        <ScaledStage className="aspect-video bg-background rounded-md border border-border/50">
          <div style={{ width: 1920, height: 1080 }} className="flex items-center justify-center">
            {live && 'slide' in live ? (
              <SlideDisplay slide={live.slide} className="h-full w-full" />
            ) : live && 'verse' in live ? (
              <p className="text-8xl font-bold text-primary">{verseReference(live.verse)}</p>
            ) : (
              <Monitor className="w-40 h-40 text-muted-foreground" />
            )}
          </div>
        </ScaledStage>
      </Preview>
    </div>
  );
};
