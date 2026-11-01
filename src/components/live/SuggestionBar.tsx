import { useEffect, useState } from 'react';
import { List as ListIcon, Mic, Music, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { plainVerseText } from '@/lib/verseText';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';

/**
 * Something the app thinks may be meant: a verse quoted without its reference, a library song being
 * sung, or singing that is in no song at all (spontaneous worship, to show and keep).
 */
export type LiveSuggestion =
  | { id: string; kind: 'verse'; verse: BibleVerse; byAi: boolean; score: number; heard?: string; why?: string; utterance?: number; batch?: number }
  | { id: string; kind: 'song'; songId: string; title: string; heard: string; preview?: Slide }
  | { id: string; kind: 'new-song'; lines: string[] };

const Ring = ({ value, size = 44 }: { value: number; size?: number }) => {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const color = value >= 0.9 ? 'hsl(var(--next))' : value >= 0.6 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} aria-label={`${Math.round(value * 100)}% match`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />
      </svg>
      <b className="absolute inset-0 grid place-items-center text-[12.5px]">{Math.round(value * 100)}</b>
    </div>
  );
};

type Timed = LiveSuggestion & { at?: number };

const titleOf = (s: LiveSuggestion) =>
  s.kind === 'verse' ? `${s.byAi ? 'AI suggests' : 'Sounds like'} ${s.verse.book} ${s.verse.chapter}:${s.verse.verse}` : s.kind === 'song' ? `They are singing ${s.title}` : 'Singing something new';
const detailOf = (s: LiveSuggestion) => (s.kind === 'verse' ? plainVerseText(s.verse.text) : s.kind === 'song' ? `“${s.heard}”` : `“${s.lines[s.lines.length - 1]}”`);
/**
 * How strong a match is, in words. The number is how much of the verse's own
 * wording was heard, not the chance it is right: a verse paraphrased or half
 * quoted can be right at 30%, so faint matches are kept, and the reason is shown.
 */
export const strengthOf = (score: number) => (score >= 0.9 ? 'Strong match' : score >= 0.6 ? 'Likely' : score >= 0.35 ? 'Possible' : 'Faint match');
const reasonOf = (s: LiveSuggestion) =>
  s.kind === 'verse' ? `${strengthOf(s.score)}${s.why ? ` · ${s.why}` : ''}` : s.kind === 'song' ? 'from your library' : 'not in your library';
const scoreOf = (s: LiveSuggestion) => (s.kind === 'verse' ? s.score : 0.8);
const ago = (at: number | undefined, now: number) => {
  if (!at) return '';
  const sec = Math.max(0, Math.round((now - at) / 1000));
  return sec < 5 ? 'just now' : sec < 60 ? `${sec} s ago` : `${Math.floor(sec / 60)} min ago`;
};

/** The suggestion shown in the bar: the surest of the last 20 seconds, else the newest. */
export function featuredSuggestion<T extends Timed>(list: T[], now = Date.now()): T | undefined {
  const fresh = list.filter((s) => !s.at || now - s.at < 20_000);
  return [...(fresh.length ? fresh : list.slice(0, 1))].sort((a, b) => scoreOf(b) - scoreOf(a))[0];
}

/**
 * The suggestion bar: the surest recent guess (a verse quoted or told
 * without its reference, or a song), how sure it is, and what to do with it.
 * Clicking it, or "All", opens every suggestion of the last few minutes,
 * newest first, each with Show now and Use.
 */
export const SuggestionBar = ({
  suggestions,
  inNextId,
  onUse,
  onShowNow,
  onDismiss,
  onDismissAll,
}: {
  suggestions: Timed[];
  /** The suggestion now waiting in Next */
  inNextId?: string;
  onUse: (s: LiveSuggestion) => void;
  onShowNow: (s: LiveSuggestion) => void;
  onDismiss: (s: LiveSuggestion) => void;
  onDismissAll?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // "12 s ago" stays right while the list is open
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [open]);
  useEffect(() => {
    if (!suggestions.length) setOpen(false);
  }, [suggestions.length]);
  if (!suggestions.length) return null;
  const s = featuredSuggestion(suggestions) ?? suggestions[0];

  const actions = (x: LiveSuggestion, compact = false) =>
    x.kind === 'new-song' ? (
      <button type="button" className="h-9 px-3.5 rounded-xl bg-primary/20 text-sm font-semibold hover:bg-primary/30" onClick={() => onShowNow(x)} title="Put the words on the screens as they are sung, and keep them as a draft song">
        Show the words live
      </button>
    ) : (
      <>
        <button type="button" className="h-9 px-3 rounded-xl bg-muted/70 text-sm font-semibold hover:bg-muted" onClick={() => onShowNow(x)} title="Put it on the screens now">
          Show now
        </button>
        <button type="button" className={`h-9 ${compact ? 'px-3' : 'px-3.5'} rounded-xl bg-primary/20 text-sm font-semibold hover:bg-primary/30`} onClick={() => onUse(x)} title="Put it in Next; Take sends it">
          {inNextId === x.id ? 'In Next ✓' : x.kind === 'song' ? 'Switch to it' : 'Use'}
        </button>
      </>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div data-suggestion className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 p-3 pl-3.5 rounded-[18px] bg-card shadow-[0_1px_1px_rgba(0,0,0,.3),0_12px_36px_rgba(0,0,0,.35)] animate-fade-in">
          {s.kind === 'verse' ? (
            <Ring value={s.score} />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary/15 grid place-items-center text-primary">{s.kind === 'song' ? <Music className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</div>
          )}
          <button type="button" className="min-w-0 text-left rounded-lg -my-1 py-1" onClick={() => setOpen(true)} title="See every suggestion, newest first">
            <p className="m-0 text-[15px] font-semibold truncate">
              {titleOf(s)}
              <span className="ml-1.5 text-[13px] font-medium text-muted-foreground" data-reason>
                {reasonOf(s)}
              </span>
            </p>
            <p className="m-0 mt-0.5 font-scripture text-[15px] text-muted-foreground truncate">{detailOf(s)}</p>
          </button>
          <div className="flex items-center gap-1.5">
            {suggestions.length > 1 && (
              <button type="button" className="h-9 px-3 rounded-xl bg-muted/70 text-sm font-semibold hover:bg-muted flex items-center gap-1.5" onClick={() => setOpen(!open)} aria-expanded={open} title="Every suggestion, newest first">
                <ListIcon className="w-4 h-4" />
                All {suggestions.length}
              </button>
            )}
            {actions(s)}
            <button type="button" className="w-9 h-9 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onDismiss(s)} title="Not this" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent side="top" align="start" sideOffset={10} className="w-[var(--radix-popover-trigger-width)] min-w-[min(560px,90vw)] max-h-[min(460px,60vh)] p-2 rounded-[18px] bg-card flex flex-col" data-suggestion-list>
        <div className="flex items-center gap-2 px-2 pt-1 pb-2">
          <p className="m-0 text-[13px] font-semibold text-muted-foreground flex-1">Suggestions, newest first</p>
          {onDismissAll && (
            <button type="button" className="h-9 px-3 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => { onDismissAll(); setOpen(false); }}>
              Clear them all
            </button>
          )}
        </div>
        <div className="overflow-y-auto min-h-0 space-y-1" role="list">
          {suggestions.map((x) => (
            <div key={x.id} role="listitem" className={`flex items-center gap-3 p-2 rounded-xl ${x.id === s.id ? 'bg-muted/60' : 'hover:bg-muted/40'}`}>
              {x.kind === 'verse' ? (
                <Ring value={x.score} size={36} />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/15 grid place-items-center text-primary flex-shrink-0">{x.kind === 'song' ? <Music className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-semibold truncate">
                  {titleOf(x)} <span className="text-[13px] font-medium text-muted-foreground">· {reasonOf(x)} · {ago(x.at, now)}</span>
                </p>
                <p className="m-0 font-scripture text-[14px] text-muted-foreground truncate">{detailOf(x)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {actions(x, true)}
                <button type="button" className="w-9 h-9 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onDismiss(x)} title="Not this" aria-label="Dismiss">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
