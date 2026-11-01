import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ScaledStage } from '@/components/ScaledStage';
import { OutputContent } from '@/components/OutputContent';
import { AlertBanner } from '@/components/AlertBanner';
import { useLive } from '@/hooks/use-live';
import { useOutputStage } from '@/hooks/use-screen-shape';
import { useCountdown } from '@/hooks/use-countdown';
import { useDoubleClickFullscreen, usePointerActive } from '@/hooks/use-pointer-active';
import { loadAssignments, loadTemplates, templateFor } from '@/lib/templates';

/**
 * The lower third for a livestream or recording: the stream template (green
 * by default, for keying over the camera in OBS, vMix or a video switcher).
 * Nothing but the key colour shows when nothing is live or the logo is up.
 */
const LowerThird = () => {
  const { live, logo } = useLive();
  const { countdown, remaining } = useCountdown('stream');
  const stage = useOutputStage('stream');
  const pointerActive = usePointerActive();
  useDoubleClickFullscreen();
  // "?transparent=1": no key colour, for OBS/vMix browser sources (Settings → Network)
  const transparent = new URLSearchParams(useLocation().search).has('transparent');
  const keyColor = transparent ? 'transparent' : templateFor(loadTemplates(), loadAssignments(), 'stream', 'scripture').background.color;
  useEffect(() => {
    if (!transparent) return;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }, [transparent]);

  return (
    <div className="fixed inset-0" style={{ backgroundColor: keyColor, cursor: pointerActive ? 'auto' : 'none' }}>
      <ScaledStage stage={stage} className="absolute inset-0">
        <OutputContent live={logo !== null ? null : live} output="stream" countdown={countdown} remaining={remaining} transparent={transparent} />
        <AlertBanner output="stream" />
      </ScaledStage>
      {pointerActive && !live && !countdown?.stream && !transparent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="bg-black/60 text-white/80 rounded-lg px-6 py-4 text-sm">
            Lower third: key out the background colour in your streaming software
          </p>
        </div>
      )}
    </div>
  );
};

export default LowerThird;
