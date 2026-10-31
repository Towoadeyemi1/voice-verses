import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Music, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LyricsSlide, MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { buildSongSlides, ccliLicence, effectiveArrangement, parseSongSections, Song } from '@/lib/songs';

interface LyricsEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (slides: LyricsSlide[], subsectionBackground?: { type: 'image'; url: string; opacity: number }) => void;
  initialSongTitle?: string;
  initialLyrics?: string;
}

const EMPTY: Song = { title: '', lyrics: '', author: '', copyright: '', ccliNumber: '', arrangement: [] };
const PLACEHOLDER = `Verse 1
Amazing grace, how sweet the sound
That saved a wretch like me

Chorus
My chains are gone, I've been set free

Verse 2
'Twas grace that taught my heart to fear`;

/**
 * Adding a song to a service: from the song library or typed in, with its
 * arrangement (the order the sections are sung), saved back to the library.
 */
export function LyricsEditor({ open, onClose, onSave, initialSongTitle = '', initialLyrics = '' }: LyricsEditorProps) {
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [song, setSong] = useState<Song>(EMPTY);
  const [linesPerSlide, setLinesPerSlide] = useState(2);
  const [titleCard, setTitleCard] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [backgroundId, setBackgroundId] = useState('none');
  const [backgroundOpacity, setBackgroundOpacity] = useState(40);

  useEffect(() => {
    if (!open) return;
    ServiceStorage.getMedia().then((items) => {
      setLibrary(items);
      const saved = initialSongTitle && items.find((m) => m.type === 'song' && m.name.toLowerCase() === initialSongTitle.toLowerCase());
      if (saved) load(saved);
      else {
        setLibraryId(null);
        setSong({ ...EMPTY, title: initialSongTitle, lyrics: initialLyrics });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSongTitle, initialLyrics]);

  const songs = library.filter((m) => m.type === 'song').sort((a, b) => a.name.localeCompare(b.name));
  const pictures = library.filter((m) => m.type === 'image' && m.url);

  function load(item: MediaItem) {
    setLibraryId(item.id);
    setSong({
      title: item.name,
      lyrics: item.lyrics ?? '',
      author: item.author ?? '',
      copyright: item.copyright ?? '',
      ccliNumber: item.ccliNumber ?? '',
      arrangement: item.arrangement ?? [],
    });
  }

  const change = (next: Partial<Song>) => setSong((s) => ({ ...s, ...next }));
  const sections = useMemo(() => parseSongSections(song.lyrics), [song.lyrics]);
  const arrangement = effectiveArrangement(song, sections);
  const customOrder = (song.arrangement ?? []).some((l) => sections.some((s) => s.label === l));
  const slides = useMemo(
    () => buildSongSlides({ ...song, arrangement }, { linesPerSlide, titleCard, licence: ccliLicence() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [song, arrangement.join('|'), linesPerSlide, titleCard],
  );

  const addToOrder = (label: string) => change({ arrangement: [...arrangement, label] });
  const removeFromOrder = (index: number) => change({ arrangement: arrangement.filter((_, i) => i !== index) });

  const handleSave = async () => {
    if (!song.title.trim()) return toast.error('Please enter the song title');
    if (!sections.length) return toast.error('Please enter the lyrics');

    const background = pictures.find((p) => p.id === backgroundId);
    const withBackground = background
      ? slides.map((s) => ({ ...s, backgroundMedia: { type: 'image' as const, url: background.url!, opacity: backgroundOpacity / 100 } }))
      : slides;

    if (saveToLibrary) {
      const existing = library.find((m) => m.id === libraryId) ?? library.find((m) => m.type === 'song' && m.name.toLowerCase() === song.title.trim().toLowerCase());
      await ServiceStorage.saveMediaItem({
        ...(existing ?? { id: `song-${Date.now()}`, type: 'song', createdAt: new Date() }),
        type: 'song',
        name: song.title.trim(),
        lyrics: song.lyrics,
        author: song.author || undefined,
        copyright: song.copyright || undefined,
        ccliNumber: song.ccliNumber || undefined,
        arrangement: customOrder ? arrangement : undefined,
        category: existing?.category ?? 'Songs',
      } as MediaItem);
    }
    onSave(withBackground, background ? { type: 'image', url: background.url!, opacity: backgroundOpacity / 100 } : undefined);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" /> Song
          </DialogTitle>
          <DialogDescription>Choose a song from the library or type one in, and set the order it is sung.</DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>From the song library</Label>
              <Select
                value={libraryId ?? 'new'}
                onValueChange={(id) => {
                  if (id === 'new') {
                    setLibraryId(null);
                    setSong(EMPTY);
                  } else {
                    const item = songs.find((s) => s.id === id);
                    if (item) load(item);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="new">A new song</SelectItem>
                  {songs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.author ? ` — ${s.author}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="song-title">Title</Label>
                <Input id="song-title" value={song.title} onChange={(e) => change({ title: e.target.value })} placeholder="Amazing Grace" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="song-author">Author</Label>
                <Input id="song-author" value={song.author} onChange={(e) => change({ author: e.target.value })} placeholder="John Newton" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="song-ccli">CCLI song number</Label>
                <Input id="song-ccli" value={song.ccliNumber} onChange={(e) => change({ ccliNumber: e.target.value })} placeholder="22025" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="song-copyright">Copyright</Label>
                <Input id="song-copyright" value={song.copyright} onChange={(e) => change({ copyright: e.target.value })} placeholder="Public Domain" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="song-lyrics">Lyrics</Label>
              <Textarea id="song-lyrics" value={song.lyrics} onChange={(e) => change({ lyrics: e.target.value })} placeholder={PLACEHOLDER} className="min-h-64 font-mono text-sm" />
              <p className="text-xs text-muted-foreground">
                Leave a blank line between sections. Start a section with its name (Verse 1, Chorus, Bridge…) so it can be
                repeated in the order below. Type each chorus once.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Order sung</Label>
                {customOrder && (
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => change({ arrangement: [] })}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> As written
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-9 rounded-md border p-2">
                {arrangement.map((label, i) => (
                  <span key={`${label}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium">
                    {label}
                    <button type="button" onClick={() => removeFromOrder(i)} title="Remove" className="opacity-60 hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {!arrangement.length && <span className="text-xs text-muted-foreground">Type the lyrics to see the sections</span>}
              </div>
              {sections.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground mr-1">Add:</span>
                  {sections.map((s) => (
                    <Button key={s.label} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => addToOrder(s.label)}>
                      + {s.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Lines on each slide: {linesPerSlide}</Label>
              <Slider value={[linesPerSlide]} min={1} max={8} step={1} onValueChange={([v]) => setLinesPerSlide(v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="title-card">Start with a title slide</Label>
              <Switch id="title-card" checked={titleCard} onCheckedChange={setTitleCard} />
            </div>

            <div className="space-y-2">
              <Label>Background picture</Label>
              <Select value={backgroundId} onValueChange={setBackgroundId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">The template's background</SelectItem>
                  {pictures.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {backgroundId !== 'none' && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Picture strength: {backgroundOpacity}%</Label>
                  <Slider value={[backgroundOpacity]} min={10} max={100} step={5} onValueChange={([v]) => setBackgroundOpacity(v)} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{slides.length} slides</Label>
              <div className="max-h-56 overflow-y-auto rounded-md border divide-y text-xs">
                {slides.map((s, i) => (
                  <div key={s.id} className="p-2 flex gap-3">
                    <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-primary">{s.sectionLabel ?? 'Title'}</div>
                      <div className="whitespace-pre-line text-muted-foreground">{s.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              {slides[0]?.credits && <p className="text-xs text-muted-foreground">On screen with the first slide: {slides[0].credits}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:mr-auto">
            <Switch id="save-song" checked={saveToLibrary} onCheckedChange={setSaveToLibrary} />
            <Label htmlFor="save-song" className="text-sm">
              Save to the song library
            </Label>
          </div>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!slides.length}>
            Add {slides.length} slides
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
