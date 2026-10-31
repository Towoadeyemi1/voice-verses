import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ListMusic, Music, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BibleVerse } from '@/types/bible';
import { MediaItem, Service, ServiceSubsection } from '@/types/service';
import { plainVerseText } from '@/lib/verseText';

/**
 * The library, like ProPresenter's left side: the Bible (search, chapter,
 * history), the song library, and the services planned in Service.
 */
export const LibraryPanel = ({
  chapter,
  recent,
  songs,
  services,
  onSearch,
  onChapter,
  onVerse,
  onSong,
  onServiceItem,
}: {
  chapter: { book: string; chapter: number } | null;
  recent: BibleVerse[];
  songs: MediaItem[];
  services: Service[];
  /** A reference typed in ("john 3:16", "psalm 23"); resolves to false when not found */
  onSearch: (text: string) => Promise<boolean>;
  onChapter: (book: string, chapter: number) => void;
  onVerse: (verse: BibleVerse) => void;
  onSong: (song: MediaItem) => void;
  onServiceItem: (service: Service, item: ServiceSubsection) => void;
}) => {
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [songFilter, setSongFilter] = useState('');
  const [serviceId, setServiceId] = useState<string>('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!serviceId && services[0]) setServiceId(services[0].id);
  }, [services, serviceId]);

  const filteredSongs = useMemo(
    () => songs.filter((s) => s.name.toLowerCase().includes(songFilter.toLowerCase()) || (s.lyrics ?? '').toLowerCase().includes(songFilter.toLowerCase())),
    [songs, songFilter],
  );
  const service = services.find((s) => s.id === serviceId);

  const search = async () => {
    if (!query.trim()) return;
    const found = await onSearch(query);
    setNotFound(!found);
    if (found) setQuery('');
  };

  return (
    <Tabs defaultValue="bible" className="h-full flex flex-col rounded-lg border border-border bg-card min-h-0">
      <TabsList className="grid grid-cols-3 m-2">
        <TabsTrigger value="bible" className="gap-1 text-xs"><BookOpen className="w-3.5 h-3.5" />Bible</TabsTrigger>
        <TabsTrigger value="songs" className="gap-1 text-xs"><Music className="w-3.5 h-3.5" />Songs</TabsTrigger>
        <TabsTrigger value="service" className="gap-1 text-xs"><ListMusic className="w-3.5 h-3.5" />Service</TabsTrigger>
      </TabsList>

      <TabsContent value="bible" className="flex-1 min-h-0 flex flex-col mt-0 px-2 pb-2 gap-2 data-[state=inactive]:hidden">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="John 3:16, Psalm 23…  (Ctrl+K)"
            className="pl-8 h-9"
          />
        </div>
        {notFound && <p className="text-xs text-destructive px-1">Not found. Try “Romans 8:28” or “Psalm 23”.</p>}
        {chapter && (
          <div className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={chapter.chapter <= 1} onClick={() => onChapter(chapter.book, chapter.chapter - 1)} title="Previous chapter">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex-1 text-center text-sm font-semibold">{chapter.book} {chapter.chapter}</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onChapter(chapter.book, chapter.chapter + 1)} title="Next chapter">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground px-1 pt-1">History</p>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {recent.length === 0 && <p className="text-xs text-muted-foreground px-1">Verses shown appear here.</p>}
          {recent.map((v) => (
            <button key={`${v.book}${v.chapter}:${v.verse}`} onClick={() => onVerse(v)} className="w-full text-left rounded px-2 py-1.5 hover:bg-muted/60">
              <p className="text-xs font-semibold">{v.book} {v.chapter}:{v.verse}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{plainVerseText(v.text)}</p>
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="songs" className="flex-1 min-h-0 flex flex-col mt-0 px-2 pb-2 gap-2 data-[state=inactive]:hidden">
        <Input value={songFilter} onChange={(e) => setSongFilter(e.target.value)} placeholder="Find a song (title or words)" className="h-9" />
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filteredSongs.length === 0 && <p className="text-xs text-muted-foreground px-1">No songs. Add songs in Media → Songs.</p>}
          {filteredSongs.map((s) => (
            <button key={s.id} onClick={() => onSong(s)} className="w-full text-left rounded px-2 py-1.5 hover:bg-muted/60">
              <p className="text-sm font-medium truncate">{s.name}</p>
              {s.author && <p className="text-[11px] text-muted-foreground truncate">{s.author}</p>}
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="service" className="flex-1 min-h-0 flex flex-col mt-0 px-2 pb-2 gap-2 data-[state=inactive]:hidden">
        <Select value={serviceId} onValueChange={setServiceId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Choose a service" /></SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1 overflow-y-auto min-h-0">
          {!service && <p className="text-xs text-muted-foreground px-1">No services yet. Plan one in Service.</p>}
          {service?.sections.map((section) => (
            <div key={section.id} className="mb-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground px-1 py-1">{section.name}</p>
              {section.subsections.map((item) => (
                <button key={item.id} onClick={() => onServiceItem(service, item)} className="w-full text-left rounded px-2 py-1.5 hover:bg-muted/60 flex items-center gap-2">
                  <span className="text-sm truncate flex-1">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground">{item.slides.length}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};
