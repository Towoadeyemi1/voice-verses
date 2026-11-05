import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Loader2, RefreshCw, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BoothCheckItem, needsAttention, runBoothCheck, runLiveChecks } from '@/lib/boothCheck';
import { Mark } from '@/components/settings/kit';

export type BoothFix = NonNullable<BoothCheckItem['fix']>;

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
      <PopoverContent align="end" sideOffset={8} className="vvs w-[min(460px,92vw)] p-0 rounded-[18px] border-0 overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,.5),0_0_0_1px_rgba(255,245,255,.07)]" style={{ background: 'var(--s-win)' }} data-booth-check-list>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="flex-1 min-w-0">
            <h3 className="m-0 text-[15px] font-semibold">Booth check</h3>
            <p className="m-0 text-[13px] text-muted-foreground">{todo.length ? 'Fix these before the service starts.' : 'Everything is ready for the service.'}</p>
          </div>
          <button type="button" onClick={() => void check()} className="st-btn ghost" disabled={checking}>
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
            Check again
          </button>
        </div>
        <ul className="st-list m-0 mx-3 mb-3 p-0 list-none max-h-[min(480px,65vh)] overflow-y-auto">
          {(items ?? []).map((item) => (
            <li key={item.id} className={`st-row ${item.state !== 'ok' ? 'attention' : ''}`} data-check={item.id} data-state={item.state}>
              <Mark state={item.state} />
              <span className="text">
                <span className="t">
                  {item.label}
                  <span className="sr-only">: {WORD[item.state]}</span>
                </span>
                <span className="d">{item.detail}</span>
              </span>
              {item.fix && item.state !== 'ok' && (
                <button
                  type="button"
                  className="st-btn soft"
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
    <div className="vvs absolute left-1/2 -translate-x-1/2 top-[60px] z-30 flex flex-col gap-2 w-[min(640px,92vw)]" role="alert" data-guardian>
      {shown.slice(0, 3).map((p) => (
        <div key={p.id} className="flex items-center gap-3 pl-3.5 pr-2 py-2 rounded-[14px] backdrop-blur" style={{ background: 'color-mix(in srgb, var(--s-raised) 94%, transparent)', boxShadow: '0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px rgba(245,165,36,.45)' }} data-guardian-warning={p.id}>
          <Mark state="problem" />
          <span className="flex-1 min-w-0 text-[14px] leading-snug">
            <b className="font-semibold">{p.label}:</b> {p.detail}
          </span>
          {p.fix && (
            <button type="button" className="st-btn soft" onClick={() => onFix(p.fix!)}>
              {p.fix.label}
            </button>
          )}
          <button type="button" className="st-iconbtn" aria-label="Close this warning" title="Close this warning" onClick={() => setClosed((was) => new Set([...was, p.id]))}>
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
