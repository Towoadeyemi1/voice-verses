import { useState } from 'react';
import { ArrowUp, LayoutPanelTop, Pencil, RectangleHorizontal } from 'lucide-react';
import { ClickMode } from '@/lib/clickMode';
import { ScaledStage } from '../ScaledStage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SpiritOrb } from '@/components/spirit/SpiritOrb';
import type { Correction } from '@/lib/spirit';
import '@/components/settings/settings.css';
import { OutputContent, Live } from '../OutputContent';
import { AlertBanner } from '../AlertBanner';
import { ConfidenceScreen, loadConfidenceSettings } from '../ConfidenceScreen';
import { Countdown } from '@/lib/countdown';
import { usePreviewStage } from '@/hooks/use-screen-shape';
import { ROUTE_NAMES, ROUTE_OUTPUTS, useOutputRoutes } from '@/hooks/use-output-routes';
import type { ScreenOutput } from '@/lib/desktop';

import { BIG_KEY, type LiveView } from '@/lib/liveView';

function loadBig(): ScreenOutput {
  try {
    const v = localStorage.getItem(BIG_KEY);
    return v === 'lowerThird' || v === 'confidence' ? v : 'projection';
  } catch {
    return 'projection';
  }
}

const Label = ({ tone, title, detail, children }: { tone: 'live' | 'next'; title: string; detail?: string; children?: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-sm font-semibold min-h-[30px]">
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: `hsl(var(--${tone}))` }} />
    {title}
    {detail && (
      <span className="font-medium text-muted-foreground truncate" data-label-detail={tone} title={detail}>
        {detail}
      </span>
    )}
    <span className="ml-auto flex items-center gap-1">{children}</span>
  </div>
);

/**
 * The screens, like a video switcher: Live (what the room sees, framed red)
 * above, one Take button, and Next (framed green) below. The other screens
 * show as small tallies, or as live pictures on a wide monitor. With Every
 * screen, Live shows each output that is on, live, in its own shape: one big
 * (click another to make it big), like a switcher's multiview.
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
  clickMode,
  onClickMode,
  onEditLive,
  practice = false,
  onEditNext,
  nextCountdown,
  onNotThis,
  view = 'one',
  onView,
  onChooseScreens,
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
  /** What picking a slide does: straight to Live, or into Next first */
  clickMode: ClickMode;
  onClickMode: (mode: ClickMode) => void;
  /** Quick edit (only for a slide, not a verse) */
  onEditLive?: () => void;
  /** Practice (1.19.0): Live shows what the room would see, but the room doesn't */
  practice?: boolean;
  onEditNext?: () => void;
  /** The countdown Next will start (a part with its own countdown), shown in its picture */
  nextCountdown?: { countdown: Countdown; remaining: number } | null;
  /** When spirit got Next ready: "Not this", with why (spirit learns from it) */
  onNotThis?: (correction: Correction) => void;
  /** What Live shows: the projector only, or every screen that is on */
  view?: LiveView;
  onView?: (view: LiveView) => void;
  /** Settings → Screens, for an output that isn't on any screen yet */
  onChooseScreens?: () => void;
}) => {
  const projector = usePreviewStage('projection');
  const stream = usePreviewStage('stream');
  const logoUp = logo !== null;
  const all = view === 'all';
  const routes = useOutputRoutes();
  const onCount = routes.filter((r) => r.on).length;
  const [big, setBig] = useState<ScreenOutput>(loadBig);
  const makeBig = (output: ScreenOutput) => {
    setBig(output);
    try {
      localStorage.setItem(BIG_KEY, output);
    } catch {
      // Kept for this session only
    }
  };
  const fit = all ? 'wall-fit' : 'monitor-fit';
  const ratio = { ['--ratio' as string]: projector.width / projector.height };

  /** What one output shows right now, drawn by the real renderer (rule 5) */
  const picture = (output: ScreenOutput) => {
    if (output === 'confidence')
      return (
        <ScaledStage className="aspect-video bg-black">
          <ConfidenceScreen settings={loadConfidenceSettings()} style={{ width: 1920, height: 1080 }} />
        </ScaledStage>
      );
    if (output === 'lowerThird')
      return (
        <ScaledStage stage={stream} fitShape className="bg-black">
          {/* See-through over the camera: shown over a stand-in for the camera picture */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(22% 42% at 52% 40%, #8a6a52, transparent 70%), linear-gradient(180deg, #2b2220, #120e0c)' }} />
          <OutputContent live={logoUp ? null : live} output="stream" countdown={countdown} remaining={remaining} preview transparent />
          <AlertBanner output="stream" />
        </ScaledStage>
      );
    return (
      <>
        <ScaledStage stage={projector} fitShape className="bg-black">
          {logoUp ? (
            <div className="h-full flex items-center justify-center" style={{ width: projector.width, height: projector.height }}>
              {logo && <img src={logo} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" />}
            </div>
          ) : (
            <OutputContent live={live} output="projection" countdown={countdown} remaining={remaining} preview />
          )}
          <AlertBanner output="projection" />
        </ScaledStage>
        {progress > 0 && <div className="absolute bottom-0 left-0 h-1 bg-[hsl(var(--live))] transition-all duration-300" style={{ width: `${Math.min(100, progress * 100)}%` }} />}
      </>
    );
  };

  /** One output on the wall: big with its name and where it goes on it, or small with them underneath */
  const tile = (output: ScreenOutput, isBig: boolean) => {
    const route = routes.find((r) => r.output === output)!;
    const name = ROUTE_NAMES[output];
    const pick = isBig ? undefined : () => makeBig(output);
    return (
      <div
        key={output}
        className={`relative min-w-0 ${pick ? 'group cursor-pointer rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--primary))] focus-visible:outline-offset-2' : ''}`}
        data-live-tile={output}
        data-big={isBig ? 'true' : undefined}
        data-on={route.on ? 'true' : 'false'}
        role={pick ? 'button' : undefined}
        tabIndex={pick ? 0 : undefined}
        title={pick ? `Make the ${name.toLowerCase()} big` : undefined}
        aria-label={pick ? `${name}: make it big` : undefined}
        onClick={pick}
        onKeyDown={
          pick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  pick();
                }
              }
            : undefined
        }
      >
        <div
          className={`relative rounded-[14px] overflow-hidden transition-transform duration-200 ${pick ? 'group-hover:-translate-y-0.5 motion-reduce:transform-none' : ''} ${
            route.on ? (isBig ? 'shadow-[0_0_0_2px_hsl(var(--live)),0_18px_50px_-24px_hsl(var(--live))]' : 'shadow-[0_0_0_1.5px_hsl(var(--live))]') : 'shadow-[inset_0_0_0_1.5px_hsl(var(--border))] bg-muted/40'
          }`}
        >
          {route.on ? (
            picture(output)
          ) : (
            <div className="aspect-video grid place-items-center content-center gap-1 px-3 text-center text-[13px] text-muted-foreground">
              Not on any screen yet
              {onChooseScreens && (
                <button
                  type="button"
                  className="h-9 px-2 rounded-lg font-semibold text-primary hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChooseScreens();
                  }}
                >
                  Choose where it goes
                </button>
              )}
            </div>
          )}
          {isBig && (
            <span className="absolute left-3 top-3 z-[3] inline-flex items-center gap-1.5 h-[30px] pl-2.5 pr-3 rounded-full bg-black/65 backdrop-blur text-white text-[13.5px] font-semibold">
              <i className={`w-[7px] h-[7px] rounded-full ${route.on ? 'bg-[hsl(var(--live))] shadow-[0_0_0_3px_hsl(var(--live)/0.25)]' : 'bg-white/40'}`} />
              {name}
            </span>
          )}
          {isBig && route.where.length > 0 && (
            <span className="absolute right-3 top-3 z-[3] hidden sm:flex gap-1">
              {route.where.map((w) => (
                <span key={w} className="h-6 px-2 rounded-full bg-black/60 backdrop-blur text-white/90 text-[12px] font-semibold leading-6 whitespace-nowrap">
                  {w}
                </span>
              ))}
            </span>
          )}
        </div>
        {!isBig && (
          <div className="mt-1.5 flex items-center gap-1.5 min-w-0 text-[13px] font-semibold text-foreground/80 whitespace-nowrap">
            <i className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${route.on ? 'bg-[hsl(var(--live))]' : 'bg-muted-foreground/60'}`} />
            {name}
            {route.where.length > 0 && <small className="text-[12.5px] font-medium text-muted-foreground truncate">· {route.where.join(' · ')}</small>}
          </div>
        )}
      </div>
    );
  };
  const order = [big, ...ROUTE_OUTPUTS.filter((o) => o !== big)];

  const nextActions = (
    <>
      {onNotThis && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="h-[30px] px-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 whitespace-nowrap flex-shrink-0" data-not-this title="spirit got this ready: tell it what was wrong">
              <SpiritOrb size={14} still /> Not this
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="vvs w-[340px] p-3.5 rounded-[14px] border-0 space-y-2.5" style={{ background: 'var(--s-raised)', boxShadow: 'var(--s-lift), 0 0 0 1px rgba(255,245,255,.07)' }}>
            <p className="m-0 text-[14px] font-semibold">Tell spirit what was wrong. It will remember.</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="What was wrong">
              {(
                [
                  ['wrong-part', 'Wrong part'],
                  ['not-now', 'Not now'],
                  ['never', 'Never for these words'],
                ] as [Correction, string][]
              ).map(([c, text]) => (
                <button key={c} type="button" className="st-btn" style={{ borderRadius: 999 }} onClick={() => onNotThis(c)}>
                  {text}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      {onEditNext && (
        <button type="button" onClick={onEditNext} className="h-[30px] px-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5" title="Quick edit: change the words or the look of the slide in Next">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      )}
    </>
  );

  const nextPicture = (
    <div data-guide="next" className={`${all ? '' : 'monitor-fit'} relative rounded-[14px] overflow-hidden shadow-[0_0_0_2px_hsl(var(--next))] flex-shrink-0 min-w-0`} style={ratio}>
      <ScaledStage stage={projector} fitShape className="bg-black">
        <OutputContent live={next} output="projection" countdown={nextCountdown?.countdown} remaining={nextCountdown?.remaining ?? 0} preview />
      </ScaledStage>
      {!next && <div className="absolute inset-0 grid place-items-center px-3 text-center text-sm text-white/45">The next verse or slide waits here</div>}
    </div>
  );

  /** The switch beside Live: the projector only, or every screen that is on */
  const viewSwitch = onView && (
    <div className="flex p-[3px] rounded-[11px] bg-muted/70 mr-1" role="radiogroup" aria-label="What Live shows" data-live-view={view}>
      {(['one', 'all'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          aria-label={v === 'one' ? 'One screen' : `Every screen (${onCount})`}
          onClick={() => onView(v)}
          title={v === 'one' ? 'Live shows the projector only' : 'Live shows every screen that is on: the projector, the stream lower third and the stage monitor'}
          className={`h-[30px] min-w-[36px] px-2 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {v === 'one' ? <RectangleHorizontal className="w-4 h-4" /> : <LayoutPanelTop className="w-4 h-4" />}
          <span className="hidden min-[1900px]:inline">{v === 'one' ? 'One screen' : 'Every screen'}</span>
          {v === 'all' && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[11.5px] grid place-items-center ${view === 'all' ? 'bg-[hsl(var(--live)/0.18)] text-[hsl(var(--live))]' : 'bg-muted'}`}>{onCount}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <section className="min-h-0 flex flex-col gap-3 pl-2 pr-6 pt-1 pb-5 overflow-y-auto" aria-label="Screens">
      {/* What picking a slide does: the operator's choice, kept for next time */}
      <div className={`${fit} flex items-center gap-2 flex-shrink-0`} style={ratio}>
        <span className="text-[13px] font-semibold text-muted-foreground whitespace-nowrap">When I pick a slide</span>
        <div className="ml-auto flex p-[3px] rounded-full bg-muted/70" role="radiogroup" aria-label="When I pick a slide">
          {(['live', 'next'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={clickMode === m}
              onClick={() => onClickMode(m)}
              className={`h-[30px] px-3 rounded-full text-[13px] font-semibold flex items-center gap-1.5 whitespace-nowrap ${clickMode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title={m === 'live' ? 'Clicking a slide, verse or part of the service shows it on the screens straight away' : 'Clicking a slide, verse or part waits in Next until you press Take (Space)'}
            >
              <i className="w-[7px] h-[7px] rounded-full" style={{ background: `hsl(var(--${m}))` }} />
              {m === 'live' ? 'Goes live' : 'Waits in Next'}
            </button>
          ))}
        </div>
      </div>

      <div className={`${all ? 'wall-fit' : ''} flex-shrink-0`} style={ratio}>
        <Label tone="live" title={practice ? 'Live in practice' : 'Live'} detail={logoUp ? (logo ? 'Logo' : 'Clear') : liveLabel}>
          {viewSwitch}
          {onEditLive && !logoUp && (
            <button type="button" onClick={onEditLive} className="h-[30px] px-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5" title="Quick edit: change the words or the look of what is on the screens">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          <button type="button" onClick={onLogo} data-guide="logo" className="h-[30px] px-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" title="Show the church logo on every screen">
            Logo
          </button>
          <button type="button" onClick={onClear} data-guide="clear" className="h-[30px] px-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" title="Take the words off the screens (Esc)">
            Clear <kbd className="ml-0.5 text-[11px] text-muted-foreground font-sans">Esc</kbd>
          </button>
        </Label>
      </div>

      {all ? (
        // Every screen: one big, the others beside it (a wide window) or under it, each live in its own shape
        <div data-guide="live" data-every-screen className="wall-fit flex-shrink-0 grid gap-2.5 min-[1900px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] min-[1900px]:items-start" style={ratio}>
          {tile(order[0], true)}
          <div className="grid grid-cols-2 gap-2.5 min-[1900px]:grid-cols-1">{order.slice(1).map((o) => tile(o, false))}</div>
        </div>
      ) : (
        <div data-guide="live" className="monitor-fit relative rounded-[14px] overflow-hidden shadow-[0_0_0_2px_hsl(var(--live)),0_18px_50px_-22px_hsl(var(--live))] flex-shrink-0" style={ratio}>
          {picture('projection')}
        </div>
      )}

      <button
        type="button"
        onClick={onTake}
        data-guide="take"
        style={ratio}
        // A quiet raised graphite button: colour stays for meaning (red live, green next)
        className={`${fit} h-14 flex-shrink-0 rounded-2xl text-foreground flex items-center justify-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em] bg-gradient-to-b from-[hsl(260_7%_21%)] to-[hsl(260_7%_16%)] hover:from-[hsl(260_7%_24%)] hover:to-[hsl(260_7%_19%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_0_0_1px_rgba(255,255,255,0.06),0_12px_28px_-14px_rgba(0,0,0,0.9)] active:scale-[0.985] transition`}
        title="Put Next on the screens (Space)"
      >
        <ArrowUp className={`w-[18px] h-[18px] ${next ? 'text-[hsl(var(--next))]' : 'text-muted-foreground'}`} strokeWidth={2.4} />
        Take
        <kbd className="font-sans text-xs font-semibold px-1.5 py-0.5 rounded-md bg-white/[0.07] text-muted-foreground">Space</kbd>
      </button>

      {all ? (
        // Next beside its words, so every screen still fits on a laptop
        <div className="wall-fit flex-shrink-0 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] min-[1900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3.5 items-center" style={ratio}>
          {nextPicture}
          <div className="min-w-0 grid gap-1 content-center">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--next))' }} />
              Next
            </span>
            <b className="text-[15px] leading-snug line-clamp-2" data-label-detail="next" title={nextLabel}>
              {nextLabel || 'Nothing yet'}
            </b>
            <p className="m-0 text-[13.5px] text-muted-foreground">Take puts it on every screen.</p>
            <div className="flex flex-wrap items-center gap-1 -ml-2.5 mt-0.5">{nextActions}</div>
          </div>
        </div>
      ) : (
        <>
          <Label tone="next" title="Next" detail={nextLabel}>
            {nextActions}
          </Label>
          {nextPicture}

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
                  <AlertBanner output="stream" />
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
        </>
      )}
    </section>
  );
};
