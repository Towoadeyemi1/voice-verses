import { ReactNode, useMemo } from 'react';
import { Mic, Search } from 'lucide-react';
import { BibleVerse } from '@/types/bible';
import { readingTokens } from '@/speech/readingTracker';
import { usePacedWord } from '@/hooks/use-paced-word';

export interface Step {
  key: string;
  label: string;
  state: 'done' | 'live' | 'next' | '';
}

/** Words of the verse: those read so far bright, the word being read underlined in the accent. */
const ReadAlong = ({ verse, word }: { verse: BibleVerse; word: number }) => {
  const tokens = useMemo(() => readingTokens(verse.text), [verse]);
  const shown = usePacedWord(word, `${verse.book}${verse.chapter}:${verse.verse}`, tokens.length - 1);
  return (
    <p className="font-scripture text-[clamp(32px,3.2vw,60px)] leading-[1.28] tracking-[-0.012em] max-w-[30ch] [text-wrap:pretty] m-0">
      {tokens.map((t, i) => (
        <span
          key={i}
          className={`transition-colors duration-200 ${shown < 0 || i <= shown ? 'text-foreground' : 'text-muted-foreground/60'} ${i === shown ? 'underline decoration-primary decoration-[3px] underline-offset-8' : ''}`}
        >
          {t.text}{' '}
        </span>
      ))}
    </p>
  );
};

/**
 * What is being said or sung, large; what comes next, faded underneath.
 * The same for a passage being read, a song and anything else loaded.
 */
export const NowPane = ({
  title,
  sub,
  steps,
  onStep,
  verse,
  word,
  text,
  next,
  heard,
  children,
  onSearch,
  empty,
  titleExtra,
  strip,
  expanded = false,
}: {
  title: string | null;
  sub?: string;
  steps: Step[];
  onStep: (index: number) => void;
  /** A verse being read (lit word by word) … */
  verse?: BibleVerse | null;
  word?: number;
  /** … or slide text (a song's lines, an announcement) */
  text?: string | null;
  next?: { label: string; text: string } | null;
  heard?: string;
  /** Shown instead of the empty message when nothing is loaded */
  empty?: ReactNode;
  /** The suggestion bar */
  children?: ReactNode;
  onSearch: () => void;
  /** Beside the title: the Bible translation */
  titleExtra?: ReactNode;
  /** Every slide of what is loaded, along the bottom (or filling the middle when expanded) */
  strip?: ReactNode;
  expanded?: boolean;
}) => (
  <main className={`min-h-0 grid gap-3 px-6 xl:px-10 pt-3 pb-5 ${strip ? (expanded ? 'grid-rows-[auto_minmax(0,1fr)_auto]' : 'grid-rows-[auto_minmax(0,1fr)_auto_auto]') : 'grid-rows-[auto_minmax(0,1fr)_auto]'}`}>
    <div className="flex items-center gap-x-4 gap-y-2 flex-wrap min-h-9">
      {title ? (
        <>
          <h1 className="m-0 text-[28px] xl:text-[30px] font-bold tracking-[-0.025em] leading-tight">{title}</h1>
          {titleExtra}
          {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
        </>
      ) : null}
      {steps.length > 0 && (
        <div className="flex gap-1.5 ml-auto flex-wrap justify-end">
          {steps.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onStep(i)}
              className={`min-w-9 h-9 px-2.5 rounded-full text-sm font-semibold transition ${
                s.state === 'live'
                  ? 'bg-[hsl(var(--live))] text-white'
                  : s.state === 'next'
                    ? 'shadow-[inset_0_0_0_2px_hsl(var(--next))] text-foreground'
                    : s.state === 'done'
                      ? 'text-muted-foreground hover:bg-muted'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
              title={s.state === 'live' ? 'On the screens now' : s.state === 'next' ? 'Next' : 'Show this'}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>

    {strip && expanded ? (
      strip
    ) : (
    <div className="self-center min-w-0 overflow-hidden">
      {verse ? (
        <ReadAlong verse={verse} word={word ?? -1} />
      ) : text ? (
        <p className="font-scripture text-[clamp(30px,3vw,54px)] leading-[1.3] m-0 whitespace-pre-line max-w-[30ch]">{text}</p>
      ) : empty ? (
        empty
      ) : (
        <div className="space-y-4 max-w-xl">
          <p className="font-scripture text-[clamp(30px,3vw,48px)] leading-tight text-muted-foreground m-0">Say a verse, or find one.</p>
          <p className="text-muted-foreground m-0">
            Start listening and the verses the preacher reads appear here as they are read. Or press{' '}
            <button type="button" onClick={onSearch} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-foreground font-medium">
              <Search className="w-3.5 h-3.5" />⌘K
            </button>{' '}
            to find a verse, song or service item.
          </p>
        </div>
      )}
      {next && (
        <p className="mt-7 mb-0 font-scripture text-[clamp(17px,1.3vw,22px)] leading-[1.45] text-muted-foreground max-w-[52ch] line-clamp-3">
          <b className="font-sans text-[13px] font-semibold text-[hsl(var(--next))] mr-2">Next · {next.label}</b>
          {next.text}
        </p>
      )}
    </div>
    )}
    {strip && !expanded && <div className="min-w-0">{strip}</div>}

    <div className="space-y-2.5 min-w-0">
      {heard !== undefined && (
        <div className="flex items-center gap-2.5 text-[14.5px] text-muted-foreground whitespace-nowrap overflow-hidden">
          <Mic className="w-4 h-4 flex-shrink-0" />
          <span className="overflow-hidden text-ellipsis [direction:rtl] text-left">
            <bdi className="[direction:ltr]">{heard}</bdi>
          </span>
        </div>
      )}
      {children}
    </div>
  </main>
);
