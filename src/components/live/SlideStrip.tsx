import { ReactNode, useEffect, useRef } from 'react';
import { LayoutGrid, Pencil, Rows3 } from 'lucide-react';
import { ScaledStage } from '../ScaledStage';
import { OutputContent, Live } from '../OutputContent';
import { usePreviewStage } from '@/hooks/use-screen-shape';

export interface StripItem {
  key: string;
  /** V1, C, 3… */
  label: string;
  item: Live;
  state: 'live' | 'next' | 'done' | '';
  /** For a verse: its words, shown as a card instead of a picture of the slide */
  text?: string;
  /** Its first words, under the picture */
  caption?: string;
}

const TILE = 'w-[184px]';

/**
 * Every slide of what is loaded (a song, a service part, a chapter), so the
 * operator sees the whole of it at once: a strip along the bottom of the
 * middle, or every slide as a grid. Live is framed red, Next green, each with
 * its word. Click puts a slide in Next (or straight on screen, as chosen above
 * Live); double-click shows it now; the pencil opens Quick edit.
 */
export const SlideStrip = ({
  items,
  expanded,
  onExpand,
  onPick,
  onTake,
  onEdit,
  extra,
}: {
  items: StripItem[];
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  onPick: (index: number) => void;
  onTake: (index: number) => void;
  /** Not given for verses: Bible text is not edited here */
  onEdit?: (index: number) => void;
  /** Shown beside the title (the part's countdown) */
  extra?: ReactNode;
}) => {
  const stage = usePreviewStage('projection');
  const scroller = useRef<HTMLDivElement>(null);
  const focusKey = (items.find((i) => i.state === 'live') ?? items.find((i) => i.state === 'next'))?.key;

  // Keep the slide on screen (or the next one) in view
  useEffect(() => {
    const box = scroller.current;
    const el = focusKey ? box?.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`) : null;
    if (!box || !el) return;
    if (expanded) {
      const top = el.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' });
    } else {
      const left = el.offsetLeft - box.offsetLeft;
      if (left < box.scrollLeft || left + el.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollTo({ left: Math.max(0, left - 180), behavior: 'smooth' });
    }
  }, [focusKey, expanded]);

  if (!items.length) return null;
  const verses = items.every((i) => i.text !== undefined);

  return (
    <section className={`min-w-0 flex flex-col gap-2 ${expanded ? 'min-h-0 h-full' : ''}`} aria-label={verses ? 'Verses' : 'Slides'}>
      <div className="flex items-center gap-3 min-h-9">
        <p className="m-0 text-[13px] font-semibold text-muted-foreground">
          {verses ? 'Verses' : 'Slides'} <span className="font-medium">· {items.length}</span>
        </p>
        {extra}
        <button
          type="button"
          onClick={() => onExpand(!expanded)}
          className="ml-auto h-9 px-3 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5"
          title={expanded ? 'Back to the words, large, with the slides along the bottom' : `See every ${verses ? 'verse' : 'slide'} at once`}
        >
          {expanded ? <Rows3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          {expanded ? 'Show the words large' : `See all ${verses ? 'verses' : 'slides'}`}
        </button>
      </div>

      <div
        ref={scroller}
        className={
          expanded
            ? 'min-h-0 flex-1 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] content-start gap-x-3 gap-y-4 pr-1 pb-1'
            : 'flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]'
        }
        role="list"
      >
        {items.map((it, i) => {
          const ring =
            it.state === 'live'
              ? 'shadow-[0_0_0_2.5px_hsl(var(--live))]'
              : it.state === 'next'
                ? 'shadow-[0_0_0_2.5px_hsl(var(--next))]'
                : 'shadow-[0_0_0_1px_hsl(var(--border))] hover:shadow-[0_0_0_2px_hsl(var(--foreground)/0.35)]';
          return (
            <div key={it.key} data-key={it.key} role="listitem" className={`group relative flex-shrink-0 [content-visibility:auto] ${expanded ? '' : TILE} ${it.state === 'done' ? 'opacity-55 hover:opacity-100' : ''}`}>
              <button
                type="button"
                onClick={() => onPick(i)}
                onDoubleClick={() => onTake(i)}
                className="block w-full text-left rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={it.state === 'live' ? 'On the screens now' : it.state === 'next' ? 'In Next: press Space or Take to show it' : 'Click to pick it, double-click to show it now'}
                data-state={it.state || undefined}
              >
                <div className={`relative rounded-[10px] overflow-hidden transition-shadow ${ring}`} style={{ aspectRatio: `${stage.width} / ${stage.height}` }}>
                  {it.text !== undefined ? (
                    <div className="absolute inset-0 bg-card p-2.5 pt-7">
                      <p className="m-0 font-scripture text-[13px] leading-snug text-foreground/90 line-clamp-3">{it.text}</p>
                    </div>
                  ) : (
                    <ScaledStage stage={stage} fitShape className="bg-black pointer-events-none">
                      <OutputContent live={it.item} output="projection" preview />
                    </ScaledStage>
                  )}
                  <span
                    className={`absolute top-1.5 left-1.5 h-[22px] min-w-[22px] px-1.5 rounded-md text-[12px] font-bold grid place-items-center ${
                      it.state === 'live' ? 'bg-[hsl(var(--live))] text-white' : it.state === 'next' ? 'bg-[hsl(var(--next))] text-black' : 'bg-black/60 text-white'
                    }`}
                  >
                    {it.state === 'live' ? `Live · ${it.label}` : it.state === 'next' ? `Next · ${it.label}` : it.label}
                  </span>
                </div>
                {it.caption !== undefined && <p className="m-0 mt-1.5 px-0.5 text-[13px] text-muted-foreground truncate">{it.caption || ' '}</p>}
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(i)}
                  className="absolute top-1 right-1 w-9 h-9 rounded-lg grid place-items-center bg-black/65 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition"
                  title="Quick edit: change the words or the look"
                  aria-label={`Edit slide ${it.label}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
