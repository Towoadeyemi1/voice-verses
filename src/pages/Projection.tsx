import { ScaledStage } from '@/components/ScaledStage';
import { OutputContent } from '@/components/OutputContent';
import { AlertBanner } from '@/components/AlertBanner';
import { useLive } from '@/hooks/use-live';
import { useOutputStage } from '@/hooks/use-screen-shape';
import { useCountdown } from '@/hooks/use-countdown';
import { useDoubleClickFullscreen, usePointerActive } from '@/hooks/use-pointer-active';

/**
 * The projector output. Shows what is live in the template assigned to it
 * (Templates page in the operator window); double-click to fill the screen.
 */
const Projection = () => {
  const { live, logo } = useLive();
  const { countdown, remaining } = useCountdown();
  const stage = useOutputStage('projection');
  const pointerActive = usePointerActive();
  useDoubleClickFullscreen();

  return (
    <div className="fixed inset-0 bg-black" style={{ cursor: pointerActive ? 'auto' : 'none' }}>
      {logo !== null && countdown?.projector !== 'full' ? (
        logo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={logo} alt="" className="max-w-[80%] max-h-[80%] object-contain" />
          </div>
        )
      ) : (
        <ScaledStage stage={stage} className="absolute inset-0">
          <OutputContent live={live} output="projection" countdown={countdown} remaining={remaining} />
        </ScaledStage>
      )}
      {/* An alert goes over anything, the logo included */}
      <ScaledStage stage={stage} className="absolute inset-0 pointer-events-none">
        <AlertBanner output="projection" />
      </ScaledStage>
    </div>
  );
};

export default Projection;
