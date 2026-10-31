import { ArrowUp } from 'lucide-react';
import { ScaledStage } from '../ScaledStage';
import { OutputContent, Live } from '../OutputContent';
import { ConfidenceScreen, loadConfidenceSettings } from '../ConfidenceScreen';
import { Countdown } from '@/lib/countdown';
import { usePreviewStage } from '@/hooks/use-screen-shape';

const Label = ({ tone, title, detail, children }: { tone: 'live' | 'next'; title: string; detail?: string; children?: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-sm font-semibold min-h-[30px]">
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: `hsl(var(--${tone}))` }} />
    {title}
    {detail && <span className="font-medium text-muted-foreground truncate">{detail}</span>}
    <span className="ml-auto flex items-center gap-1">{children}</span>
  </div>
);

/**
 * The screens, like a video switcher: Live (what the room sees, framed red)
 * above, one Take button, and Next (framed green) below. The other screens
 * show as small tallies, or as live pictures on a wide monitor.
 */
export const ScreensColumn = ({
  live,
  logo,
  next,
  countdown,
  remaining,
  liveLabel,
  nextLabel,
  progress,
  onTake,
  onClear,
  onLogo,
}: {
  live: Live;
  logo: string | null;
  next: Live;
  countdown: Countdown | null;
  remaining: number;
  liveLabel: string;
  nextLabel: string;
  /** 0–1: how far the reading of the verse on screen has got */
  progress: number;
  onTake: () => void;
  onClear: () => void;
  onLogo: () => void;
}) => {
  const projector = usePreviewStage('projection');
  const stream = usePreviewStage('stream');
  const logoUp = logo !== null;

  return (
    <section className="min-h-0 flex flex-col gap-3 pl-2 pr-6 pt-1 pb-5 overflow-y-auto" aria-label="Screens">
      <Label tone="live" title="Live" detail={logoUp ? (logo ? 'Logo' : 'Clear') : liveLabel}>
        <button type="button" onClick={onLogo} className="h-[30px] px-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" title="Show the church logo on every screen">
          Logo
        </button>
        <button type="button" onClick={onClear} className="h-[30px] px-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" title="Take the words off the screens (Esc)">
          Clear <kbd className="ml-0.5 text-[11px] text-muted-foreground font-sans">Esc</kbd>
        </button>
      </Label>
      <div className="monitor-fit relative rounded-[14px] overflow-hidden shadow-[0_0_0_2px_hsl(var(--live)),0_18px_50px_-22px_hsl(var(--live))] flex-shrink-0" style={{ ['--ratio' as string]: projector.width / projector.height }}>
        <ScaledStage stage={projector} fitShape className="bg-black">
          {logoUp ? (
            <div className="h-full flex items-center justify-center" style={{ width: projector.width, height: projector.height }}>
              {logo && <img src={logo} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" />}
            </div>
          ) : (
            <OutputContent live={live} output="projection" countdown={countdown} remaining={remaining} preview />
          )}
        </ScaledStage>
        {progress > 0 && <div className="absolute bottom-0 left-0 h-1 bg-[hsl(var(--live))] transition-all duration-300" style={{ width: `${Math.min(100, progress * 100)}%` }} />}
      </div>

      <button
        type="button"
        onClick={onTake}
        style={{ ['--ratio' as string]: projector.width / projector.height }}
        className="monitor-fit h-14 flex-shrink-0 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em] shadow-[0_8px_24px_-10px_hsl(var(--primary))] active:scale-[0.985] transition-transform"
        title="Put Next on the screens (Space)"
      >
        <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.4} />
        Take
        <kbd className="font-sans text-xs font-semibold px-1.5 py-0.5 rounded-md bg-black/15">Space</kbd>
      </button>

      <Label tone="next" title="Next" detail={nextLabel} />
      <div className="monitor-fit relative rounded-[14px] overflow-hidden shadow-[0_0_0_2px_hsl(var(--next))] flex-shrink-0" style={{ ['--ratio' as string]: projector.width / projector.height }}>
        <ScaledStage stage={projector} fitShape className="bg-black">
          <OutputContent live={next} output="projection" preview />
        </ScaledStage>
        {!next && <div className="absolute inset-0 grid place-items-center text-sm text-white/45">The next verse or slide waits here</div>}
      </div>

      {/* The other screens: tallies on a laptop, live pictures on a wide monitor */}
      <div className="mt-auto pt-1">
        <div className="flex gap-2 flex-wrap min-[1900px]:hidden">
          {['Stream lower third', 'Stage monitor'].map((name) => (
            <span key={name} className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-muted/70 text-[13.5px] font-medium text-muted-foreground">
              <i className="w-[7px] h-[7px] rounded-full bg-[hsl(var(--live))]" />
              {name}
            </span>
          ))}
        </div>
        <div className="hidden min-[1900px]:grid grid-cols-2 gap-3">
          <div>
            <p className="m-0 mb-1.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><i className="w-[7px] h-[7px] rounded-full bg-[hsl(var(--live))]" />Stream lower third</p>
            <ScaledStage stage={stream} fitShape className="rounded-[10px]">
              <OutputContent live={logoUp ? null : live} output="stream" countdown={countdown} remaining={remaining} />
            </ScaledStage>
          </div>
          <div>
            <p className="m-0 mb-1.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><i className="w-[7px] h-[7px] rounded-full bg-[hsl(var(--live))]" />Stage monitor</p>
            <ScaledStage className="aspect-video bg-black rounded-[10px]">
              <ConfidenceScreen settings={loadConfidenceSettings()} style={{ width: 1920, height: 1080 }} />
            </ScaledStage>
          </div>
        </div>
      </div>
    </section>
  );
};
