import { ReactNode } from 'react';
import { ScaledStage } from '../ScaledStage';
import { OutputContent, Live } from '../OutputContent';
import { Countdown } from '@/lib/countdown';

/** A 16:9 screen drawn by the projector's own renderer: LIVE (red) or NEXT (green). */
export const ScreenView = ({
  tone,
  live,
  logo,
  countdown,
  remaining,
  caption,
  empty,
  action,
  progress,
}: {
  tone: 'live' | 'next';
  live: Live;
  /** Logo up instead of content ('' for a black screen) */
  logo?: string | null;
  countdown?: Countdown | null;
  remaining?: number;
  caption?: string;
  empty?: string;
  action?: ReactNode;
  /** 0–1: how far the reading of the verse on screen has got */
  progress?: number;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-[11px] font-extrabold tracking-[0.12em] text-white px-2 py-0.5 rounded-md ${tone === 'live' ? 'bg-live' : 'bg-next'}`}>
        {tone === 'live' ? 'LIVE' : 'NEXT'}
      </span>
      <span className="text-xs text-muted-foreground truncate">{caption}</span>
      <div className="ml-auto flex-shrink-0">{action}</div>
    </div>
    <div className={`relative rounded-xl overflow-hidden ring-2 ${tone === 'live' ? 'ring-live' : 'ring-next'}`}>
      <ScaledStage className="aspect-video bg-black">
        {logo !== undefined && logo !== null ? (
          <div className="h-full flex items-center justify-center" style={{ width: 1920, height: 1080 }}>
            {logo && <img src={logo} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" />}
          </div>
        ) : (
          <OutputContent live={live} output="projection" countdown={countdown} remaining={remaining} preview />
        )}
      </ScaledStage>
      {!live && logo == null && empty && <div className="absolute inset-0 grid place-items-center text-xs text-white/45 px-6 text-center">{empty}</div>}
      {progress !== undefined && progress > 0 && (
        <span className="absolute left-0 bottom-0 h-1 bg-live transition-all duration-300" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      )}
    </div>
  </div>
);
