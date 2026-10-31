import { useEffect, useRef } from 'react';

export interface GridItem {
  key: string;
  /** Shown under the slide: verse number, section name */
  label: string;
  text: string;
}

/**
 * The slides of what is loaded (a chapter's verses, a song, a service item),
 * like ProPresenter's slide view. The live slide is outlined red, the one in
 * Preview green. Click: send (or preview, in Preview-first mode); double-click: send.
 */
export const SlideGrid = ({
  title,
  items,
  liveKey,
  previewKey,
  onPick,
}: {
  title: string;
  items: GridItem[];
  liveKey?: string;
  previewKey?: string;
  onPick: (index: number, forceLive: boolean) => void;
}) => {
  const liveRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    liveRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [liveKey]);

  return (
    <div className="h-full flex flex-col rounded-lg border border-border bg-card min-h-0">
      <div className="px-3 py-2 border-b border-border text-sm font-semibold truncate">{title}</div>
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-10">
            Search for a passage, or pick a song or service item on the left.
          </p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
            {items.map((item, i) => {
              const live = item.key === liveKey;
              const preview = item.key === previewKey;
              return (
                <button
                  key={item.key}
                  ref={live ? liveRef : undefined}
                  onClick={() => onPick(i, false)}
                  onDoubleClick={() => onPick(i, true)}
                  className={`group text-left rounded-md overflow-hidden border-2 transition-colors ${
                    live ? 'border-red-500' : preview ? 'border-emerald-500' : 'border-transparent hover:border-primary/60'
                  }`}
                >
                  <div className="aspect-video bg-black flex items-center justify-center p-2">
                    <p className="text-[11px] leading-snug text-white text-center line-clamp-6 whitespace-pre-line">{item.text}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 text-[11px] ${live ? 'bg-red-600 text-white' : preview ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    <span className="truncate flex-1">{item.label}</span>
                    {live && <span className="font-bold">LIVE</span>}
                    {preview && !live && <span className="font-bold">PREVIEW</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
