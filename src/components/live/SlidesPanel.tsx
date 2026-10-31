import { memo, useEffect, useRef } from 'react';
import { Slide } from '@/types/service';
import { ScaledStage } from '../ScaledStage';
import { OutputContent } from '../OutputContent';

const Thumb = memo(({ slide }: { slide: Slide }) => (
  <ScaledStage className="aspect-video bg-black">
    <OutputContent live={{ slide }} output="projection" preview still />
  </ScaledStage>
));
Thumb.displayName = 'Thumb';

const label = (slide: Slide, i: number) => (slide.type === 'lyrics' ? slide.sectionLabel ?? `Slide ${i + 1}` : slide.title || `Slide ${i + 1}`);

/**
 * A song or a service item: its slides drawn exactly as the screens will show
 * them. For a song, its arrangement runs along the top (the order it is sung).
 * Live is outlined red, Next green.
 */
export const SlidesPanel = ({
  title,
  badge,
  why,
  slides,
  liveId,
  nextId,
  onPick,
}: {
  title: string;
  badge?: string;
  why?: string;
  slides: Slide[];
  liveId?: string;
  nextId?: string;
  /** forceLive: double-click (always sends) */
  onPick: (index: number, forceLive: boolean) => void;
}) => {
  const liveRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    liveRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [liveId]);
  const isSong = slides.some((s) => s.type === 'lyrics');

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-[14px] border border-border bg-card">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{isSong ? 'Song' : 'Slides'}</h2>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary truncate max-w-[50%]">
          {title}
          {badge ? ` · ${badge}` : ''}
        </span>
        {why && <span className="ml-auto text-xs text-muted-foreground truncate">{why}</span>}
      </div>
      {isSong && (
        <div className="flex gap-1.5 px-4 pt-3 flex-wrap">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onPick(i, false)}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                s.id === liveId ? 'border-live text-live' : s.id === nextId ? 'border-next text-next' : 'border-border bg-muted hover:border-primary/50'
              }`}
            >
              {label(s, i)}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {slides.map((s, i) => {
            const live = s.id === liveId;
            const next = s.id === nextId && !live;
            return (
              <button
                key={s.id}
                ref={live ? liveRef : undefined}
                onClick={() => onPick(i, false)}
                onDoubleClick={() => onPick(i, true)}
                className={`rounded-[10px] overflow-hidden border-2 text-left bg-muted transition-colors ${live ? 'border-live' : next ? 'border-next' : 'border-transparent hover:border-primary/60'}`}
              >
                <Thumb slide={s} />
                <div className={`flex justify-between px-2.5 py-1.5 text-xs font-bold ${live ? 'bg-live text-white' : next ? 'bg-next text-white' : 'text-muted-foreground'}`}>
                  <span className="truncate">{label(s, i)}</span>
                  <span>{live ? 'LIVE' : next ? 'NEXT' : i + 1}</span>
                </div>
              </button>
            );
          })}
        </div>
        {slides.length === 0 && <p className="text-sm text-muted-foreground text-center mt-10">This item has no slides yet. Add them in Plan.</p>}
      </div>
    </div>
  );
};
