import { Mic, PlayCircle, Search } from 'lucide-react';
import { ScaledStage } from '@/components/ScaledStage';
import { OutputContent } from '@/components/OutputContent';
import type { Service, ServiceSubsection } from '@/types/service';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const QUICK = ['John 3:16', 'Psalm 23', 'Romans 8:28', 'Isaiah 40:31'];

/**
 * What the middle of the live screen shows before anything is on: today's
 * service with a picture of each part (click one to load it), the way to
 * start, and a demo that shows listening in action.
 */
export const WelcomePane = ({
  service,
  listening,
  demoPlaying,
  onItem,
  onListen,
  onDemo,
  onVerse,
  onSearch,
  onPlan,
}: {
  service: Service | null;
  listening: boolean;
  demoPlaying: boolean;
  onItem: (service: Service, item: ServiceSubsection) => void;
  onListen: () => void;
  onDemo: () => void;
  onVerse: (reference: string) => void;
  onSearch: () => void;
  onPlan: () => void;
}) => {
  const items = (service?.sections ?? []).flatMap((sec) => sec.subsections.map((item) => ({ item, section: sec.name }))).filter((x) => x.item.slides.length);

  return (
    <div className="space-y-7 min-w-0" data-welcome>
      <div>
        <p className="m-0 text-[15px] font-semibold text-muted-foreground">{greeting()}</p>
        <h2 className="m-0 mt-1 font-scripture text-[clamp(30px,2.8vw,46px)] leading-tight">
          {service ? `${service.name.replace(/^Sample: /, '')} is ready.` : 'Say a verse, or find one.'}
        </h2>
        <p className="m-0 mt-2 text-[15px] text-muted-foreground max-w-[62ch]">
          {service
            ? 'Click a part to load it, or start listening: verses go up as the preacher reads them, and songs follow the singers.'
            : 'Start listening and verses go up as the preacher reads them. Plan a service to see its order here.'}
          {service?.sample && ' This is a sample service the app comes with; remove the samples on the Services page.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!listening && (
          <button type="button" onClick={onListen} className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold flex items-center gap-2 hover:brightness-110">
            <Mic className="w-4 h-4" />
            Start listening
          </button>
        )}
        {!listening && (
          <button type="button" onClick={onDemo} disabled={demoPlaying} className="h-11 px-4 rounded-xl bg-muted text-[15px] font-semibold flex items-center gap-2 hover:bg-muted/70 disabled:opacity-60">
            <PlayCircle className="w-4 h-4" />
            {demoPlaying ? 'Demo playing…' : 'Watch a 1-minute demo'}
          </button>
        )}
        <button type="button" onClick={onSearch} className="h-11 px-4 rounded-xl bg-muted text-[15px] font-semibold flex items-center gap-2 hover:bg-muted/70">
          <Search className="w-4 h-4" />
          Find a verse, song or item
          <span className="text-[12px] text-muted-foreground">⌘K</span>
        </button>
        {!service && (
          <button type="button" onClick={onPlan} className="h-11 px-4 rounded-xl bg-muted text-[15px] font-semibold hover:bg-muted/70">
            Plan a service
          </button>
        )}
      </div>

      {items.length > 0 && service && (
        <div>
          <p className="m-0 mb-2.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Today's order</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
            {items.slice(0, 12).map(({ item, section }) => (
              <button key={item.id} type="button" onClick={() => onItem(service, item)} className="group text-left rounded-xl p-1.5 bg-muted/40 hover:bg-muted/70 transition" title={`Load ${item.name}`}>
                <ScaledStage className="aspect-video rounded-lg bg-black">
                  <OutputContent live={{ slide: item.slides[0] }} output="projection" preview />
                </ScaledStage>
                <span className="block px-1 pt-1.5 text-[13px] font-semibold truncate">{item.name}</span>
                <span className="block px-1 pb-0.5 text-[12px] text-muted-foreground truncate">
                  {section} · {item.slides.length} {item.slides.length === 1 ? 'slide' : 'slides'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted-foreground mr-1">Show a verse:</span>
        {QUICK.map((r) => (
          <button key={r} type="button" onClick={() => onVerse(r)} className="h-9 px-3 rounded-full bg-muted/60 text-[13px] font-semibold hover:bg-muted">
            {r}
          </button>
        ))}
      </div>
    </div>
  );
};
