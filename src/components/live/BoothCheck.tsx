import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Loader2, RefreshCw, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BoothCheckItem, needsAttention, runBoothCheck, runLiveChecks } from '@/lib/boothCheck';

export type BoothFix = NonNullable<BoothCheckItem['fix']>;

const ICON = {
  ok: <CheckCircle2 className="w-[18px] h-[18px] text-muted-foreground flex-shrink-0" aria-hidden="true" />,
  warn: <CircleAlert className="w-[18px] h-[18px] text-amber-500 flex-shrink-0" aria-hidden="true" />,
  problem: <AlertTriangle className="w-[18px] h-[18px] text-amber-500 flex-shrink-0" aria-hidden="true" />,
};
const WORD = { ok: 'Ready', warn: 'Check', problem: 'Not working' };

/**
 * The "Ready" light on the live top bar. Click it for every check, each with a
 * Fix button. Checks again every minute, and whenever the list is opened.
 * (Amber, never red or green: those mean On Air and Next.)
 */
export function BoothCheckLight({ service, serviceIsToday, onFix }: { service?: { name: string } | null; serviceIsToday: boolean; onFix: (fix: BoothFix) => void }) {
  const [items, setItems] = useState<BoothCheckItem[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);
  const context = useRef({ service, serviceIsToday });
  context.current = { service, serviceIsToday };

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setItems(await runBoothCheck(context.current));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    const again = () => void check();
    window.addEventListener('settings-updated', again);
    window.addEventListener('online', again);
    window.addEventListener('offline', again);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('settings-updated', again);
      window.removeEventListener('online', again);
      window.removeEventListener('offline', again);
    };
  }, [check]);
  useEffect(() => void check(), [service?.name, serviceIsToday, check]);

  const todo = items ? needsAttention(items) : [];
  const label = !items ? 'Checking…' : todo.length ? `${todo.length} to check` : 'Ready';

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void check();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-[13px] font-semibold border transition-colors ${
            todo.length ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title="Booth check: is everything ready for the service?"
          data-booth-check={todo.length ? 'todo' : items ? 'ready' : 'checking'}
        >
          {!items ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : todo.length ? <CircleAlert className="w-4 h-4" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(440px,92vw)] p-0 rounded-[18px] bg-card overflow-hidden" data-booth-check-list>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="flex-1 min-w-0">
            <h3 className="m-0 text-[15px] font-semibold">Booth check</h3>
            <p className="m-0 text-[13px] text-muted-foreground">{todo.length ? 'Fix these before the service starts.' : 'Everything is ready for the service.'}</p>
          </div>
          <button type="button" onClick={() => void check()} className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" disabled={checking}>
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
            Check again
          </button>
        </div>
        <ul className="m-0 p-2 pt-0 list-none max-h-[min(480px,65vh)] overflow-y-auto">
          {(items ?? []).map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-2 py-2.5 rounded-xl" data-check={item.id} data-state={item.state}>
              <span className="mt-0.5">{ICON[item.state]}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold">
                  {item.label}
                  <span className="sr-only">: {WORD[item.state]}</span>
                </span>
                <span className="block text-[13px] text-muted-foreground">{item.detail}</span>
              </span>
              {item.fix && item.state !== 'ok' && (
                <button
                  type="button"
                  className="h-9 px-3 rounded-lg text-[13px] font-semibold bg-muted hover:bg-muted/70 flex-shrink-0"
                  onClick={() => {
                    setOpen(false);
                    onFix(item.fix!);
                  }}
                >
                  {item.fix.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

const SILENT_MS = 20_000;
const WATCH_MS = 5_000;

/**
 * Warnings during the service: the microphone has gone quiet while listening,
 * or a screen, DeckLink port or ProPresenter has stopped. Each can be closed;
 * it comes back only if it clears and happens again.
 */
export function Guardian({ listening, muted, lastSound, onFix }: { listening: boolean; muted: boolean; lastSound: () => number; onFix: (fix: BoothFix) => void }) {
  const [problems, setProblems] = useState<BoothCheckItem[]>([]);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const state = useRef({ listening, muted, lastSound });
  state.current = { listening, muted, lastSound };

  useEffect(() => {
    let stopped = false;
    const watch = async () => {
      const found = needsAttention(await runLiveChecks().catch(() => [])).filter((c) => c.state === 'problem');
      const { listening: on, muted: quiet, lastSound: last } = state.current;
      if (on && !quiet && Date.now() - last() > SILENT_MS)
        found.unshift({
          id: 'silent',
          label: 'Microphone',
          state: 'problem',
          detail: 'No sound for 20 seconds. Check the desk channel and the input in Listening settings.',
          fix: { label: 'Listening settings', pane: 'listening' },
        });
      if (stopped) return;
      setProblems(found);
      // A problem that cleared can warn again next time
      setClosed((was) => new Set([...was].filter((id) => found.some((c) => c.id === id))));
    };
    void watch();
    const timer = window.setInterval(() => void watch(), WATCH_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  const shown = problems.filter((p) => !closed.has(p.id));
  if (!shown.length) return null;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-[60px] z-30 flex flex-col gap-2 w-[min(640px,92vw)]" role="alert" data-guardian>
      {shown.slice(0, 3).map((p) => (
        <div key={p.id} className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl border border-amber-500/50 bg-card/95 shadow-lg backdrop-blur" data-guardian-warning={p.id}>
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0 text-[14px] leading-snug">
            <b className="font-semibold">{p.label}:</b> {p.detail}
          </span>
          {p.fix && (
            <button type="button" className="h-9 px-3 rounded-lg text-[13px] font-semibold bg-muted hover:bg-muted/70 flex-shrink-0" onClick={() => onFix(p.fix!)}>
              {p.fix.label}
            </button>
          )}
          <button type="button" className="w-9 h-9 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0" aria-label="Close this warning" title="Close this warning" onClick={() => setClosed((was) => new Set([...was, p.id]))}>
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
