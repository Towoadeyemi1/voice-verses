import { ReactNode } from 'react';
import { ScaledStage } from '../ScaledStage';
import { OutputContent, Live } from '../OutputContent';
import { Countdown } from '@/lib/countdown';
import { usePreviewStage } from '@/hooks/use-screen-shape';

/** The projector, drawn by its own renderer in its own shape, labelled Preview or Live. */
export const ScreenView = ({
  label,
  tone,
  live,
  logo,
  countdown,
  remaining,
  empty,
  actions,
  progress,
}: {
  label: string;
  tone: 'preview' | 'live';
  live: Live;
  /** Logo up instead of content ('' for a cleared screen) */
  logo?: string | null;
  countdown?: Countdown | null;
  remaining?: number;
  empty?: string;
  actions?: ReactNode;
  /** 0–1: how far the reading of the verse on screen has got */
  progress?: number;
}) => {
  const stage = usePreviewStage('projection');
  const ring = tone === 'live' ? 'ring-red-500/80' : 'ring-emerald-500/80';
  const badge = tone === 'live' ? 'bg-red-600' : 'bg-emerald-600';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold tracking-widest text-white px-1.5 py-0.5 rounded ${badge}`}>{label}</span>
        <div className="flex-1" />
        {actions}
      </div>
      <div className={`relative rounded-md ring-2 ${ring} overflow-hidden`}>
        <ScaledStage stage={stage} fitShape className="bg-black">
          {logo !== undefined && logo !== null ? (
            <div className="h-full flex items-center justify-center" style={{ width: stage.width, height: stage.height }}>
              {logo && <img src={logo} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" />}
            </div>
          ) : (
            <OutputContent live={live} output="projection" countdown={countdown} remaining={remaining} preview />
          )}
        </ScaledStage>
        {!live && !logo && empty && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">{empty}</div>
        )}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-300" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        )}
      </div>
    </div>
  );
};
