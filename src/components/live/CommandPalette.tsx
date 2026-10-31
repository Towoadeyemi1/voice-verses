import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ListOrdered, Music, Zap } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BibleVerse } from '@/types/bible';
import { MediaItem } from '@/types/service';
import { BibleParser } from '@/lib/bibleParser';
import { plainVerseText } from '@/lib/verseText';
import type { OfflineVersion } from '@/lib/bibleParser';
import type { Cue } from './RunningOrder';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

/** Lower case letters and single spaces only, so "the way the truth" finds "the way, the truth" */
const simplify = (text: string) => text.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Every verse of a free translation with its simplified words, for finding a verse by its words. Loaded once. */
let searchable: Promise<{ verse: BibleVerse; words: string }[]> | null = null;
function allVerses() {
  if (!searchable) {
    const version = BibleParser.getVersion();
    const offline = (['kjv', 'asv', 'web'].includes(version) ? version : 'kjv') as OfflineVersion;
    searchable = BibleParser.getOfflineBooks(offline).then((books) =>
      books.flatMap((b) =>
        b.chapters.flatMap((verses, c) =>
          verses.map((text, v) => ({ verse: { book: b.name, chapter: c + 1, verse: v + 1, text }, words: ` ${simplify(plainVerseText(text))} ` })),
        ),
      ),
    );
  }
  return searchable;
}

const clip = (text: string, n = 90) => (text.length > n ? `${text.slice(0, n)}…` : text);

/**
 * One search for everything (Ctrl+K): a reference, words from a verse, a song,
 * an item of today's service, or an action ("clear", "logo", "countdown 5").
 */
export const CommandPalette = ({
  open,
  onOpenChange,
  songs,
  cues,
  recent,
  actions,
  onVerse,
  onSong,
  onCue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs: MediaItem[];
  cues: Cue[];
  recent: BibleVerse[];
  /** Actions for this query (the workspace knows what "countdown 5" means) */
  actions: (query: string) => PaletteAction[];
  onVerse: (verse: BibleVerse) => void;
  onSong: (song: MediaItem) => void;
  onCue: (cue: Cue) => void;
}) => {
  const [query, setQuery] = useState('');
  const [reference, setReference] = useState<BibleVerse | null>(null);
  const [byWords, setByWords] = useState<BibleVerse[]>([]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    setReference(null);
    setByWords([]);
    if (!q) return;
    BibleParser.parseReference(q).then((v) => !cancelled && setReference(v));
    if (q.length >= 4 && !/\d/.test(q)) {
      const needle = ` ${simplify(q)}`;
      allVerses().then((verses) => {
        if (cancelled) return;
        const found: BibleVerse[] = [];
        for (const v of verses) {
          if (v.words.includes(needle)) found.push(v.verse);
          if (found.length >= 6) break;
        }
        setByWords(found);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [query]);

  const q = query.trim().toLowerCase();
  const songHits = useMemo(
    () => (q ? songs.filter((s) => s.name.toLowerCase().includes(q) || (s.lyrics ?? '').toLowerCase().includes(q)) : songs).slice(0, q ? 6 : 5),
    [songs, q],
  );
  const cueHits = useMemo(() => (q ? cues.filter((c) => `${c.section} ${c.item.name}`.toLowerCase().includes(q)) : cues).slice(0, q ? 5 : 8), [cues, q]);
  const actionHits = actions(q);
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-2xl top-[18%] translate-y-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-14 [&_[cmdk-input]]:text-base [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:rounded-lg"
        >
        <CommandInput value={query} onValueChange={setQuery} placeholder="John 3:16 · words of a verse · a song · countdown 5 · clear" />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>Nothing found. Try “Romans 8:28”, a few words of a verse, or a song title.</CommandEmpty>
          {reference && (
            <CommandGroup heading="Scripture">
              <CommandItem value="ref" onSelect={() => { onVerse(reference); close(); }}>
                <BookOpen className="w-4 h-4 mr-2 text-primary" />
                <span className="font-semibold mr-2">{reference.book} {reference.chapter}:{reference.verse}</span>
                <span className="text-muted-foreground truncate">{clip(plainVerseText(reference.text))}</span>
              </CommandItem>
            </CommandGroup>
          )}
          {actionHits.length > 0 && (
            <CommandGroup heading="Actions">
              {actionHits.map((a) => (
                <CommandItem key={a.id} value={a.id} onSelect={() => { a.run(); close(); }}>
                  <Zap className="w-4 h-4 mr-2 text-primary" />
                  <span className="font-medium">{a.label}</span>
                  {a.hint && <span className="ml-auto text-xs text-muted-foreground">{a.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {cueHits.length > 0 && (
            <CommandGroup heading="Today's service">
              {cueHits.map((c) => (
                <CommandItem key={c.item.id} value={`cue-${c.item.id}`} onSelect={() => { onCue(c); close(); }}>
                  <ListOrdered className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground mr-2">{c.section} →</span>
                  <span className="font-medium">{c.item.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{c.item.slides.length} slides</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {songHits.length > 0 && (
            <CommandGroup heading="Songs">
              {songHits.map((s) => (
                <CommandItem key={s.id} value={`song-${s.id}`} onSelect={() => { onSong(s); close(); }}>
                  <Music className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{s.name}</span>
                  {s.author && <span className="ml-2 text-muted-foreground truncate">· {s.author}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {byWords.length > 0 && (
            <CommandGroup heading="Verses with these words">
              {byWords.map((v) => (
                <CommandItem key={`${v.book}${v.chapter}:${v.verse}`} value={`w-${v.book}-${v.chapter}-${v.verse}`} onSelect={() => { onVerse(v); close(); }}>
                  <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="font-semibold mr-2 whitespace-nowrap">{v.book} {v.chapter}:{v.verse}</span>
                  <span className="text-muted-foreground truncate">{clip(plainVerseText(v.text))}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!q && recent.length > 0 && (
            <CommandGroup heading="Shown recently">
              {recent.slice(0, 5).map((v) => (
                <CommandItem key={`r${v.book}${v.chapter}:${v.verse}`} value={`r-${v.book}-${v.chapter}-${v.verse}`} onSelect={() => { onVerse(v); close(); }}>
                  <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="font-semibold mr-2">{v.book} {v.chapter}:{v.verse}</span>
                  <span className="text-muted-foreground truncate">{clip(plainVerseText(v.text))}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
