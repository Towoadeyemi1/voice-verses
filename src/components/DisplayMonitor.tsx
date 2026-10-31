import { ReactNode } from 'react';
import { Monitor, MonitorPlay, TvMinimalPlay } from 'lucide-react';
import { ScaledStage } from './ScaledStage';
import { OutputContent } from './OutputContent';
import { ConfidenceScreen, loadConfidenceSettings } from './ConfidenceScreen';
import { useLive } from '@/hooks/use-live';
import { useCountdown } from '@/hooks/use-countdown';
import { usePreviewStage } from '@/hooks/use-screen-shape';
import { describeShape, shapeOf } from '@/lib/screenShapes';

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
  const projector = usePreviewStage('projection');
  const stream = usePreviewStage('stream');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
      <Preview icon={<MonitorPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />} label="Projector" note={describeShape(shapeOf('projection'), 'projection')}>
        <ScaledStage stage={projector} fitShape className="bg-black rounded-md border border-border/50">
          {logo !== null && countdown?.projector !== 'full' ? (
            <div className="h-full flex items-center justify-center" style={{ width: projector.width, height: projector.height }}>
              {logo && <img src={logo} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" />}
            </div>
          ) : (
            <OutputContent live={live} output="projection" countdown={countdown} remaining={remaining} preview />
          )}
        </ScaledStage>
      </Preview>

      <Preview icon={<TvMinimalPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />} label="Lower third" note="Stream">
        <ScaledStage stage={stream} fitShape className="rounded-md border border-border/50">
          <OutputContent live={logo !== null ? null : live} output="stream" countdown={countdown} remaining={remaining} />
        </ScaledStage>
      </Preview>

      <Preview icon={<Monitor className="w-3.5 h-3.5 text-primary" />} label="Confidence" note="Stage">
        <ScaledStage className="aspect-video bg-black rounded-md border border-border/50">
          <ConfidenceScreen settings={loadConfidenceSettings()} style={{ width: 1920, height: 1080 }} />
        </ScaledStage>
      </Preview>
    </div>
  );
};
