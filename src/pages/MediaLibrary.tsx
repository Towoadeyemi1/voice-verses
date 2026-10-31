import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { Film, Image, Music, Plus, Trash2, Search, Pencil } from 'lucide-react';
import { addPictureToLibrary, addVideoToLibrary } from '@/lib/mediaFiles';
import { MediaThumbnail } from '@/components/MediaThumbnail';
import { toast } from 'sonner';
import { useLibraryUpdated } from '@/hooks/use-library-updated';
import { AppShell, Section } from '@/components/shell/AppShell';
import { parseSongSections } from '@/lib/songs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isSongFile, parseSongSelectFile } from '@/lib/songSelectImport';

const MediaLibrary = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'song' | 'presentation'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingSong, setEditingSong] = useState<MediaItem | null>(null);
  const [editLyrics, setEditLyrics] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const categories = ['all', ...new Set(media.map(m => m.category).filter(Boolean))] as string[];

  useEffect(() => {
    loadMedia();
  }, []);

  useLibraryUpdated(() => loadMedia());

  const loadMedia = async () => {
    setMedia(await ServiceStorage.getMedia());
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await addFiles(files);
  };

  /** Pictures, videos and SongSelect song files, chosen or dropped on the page. */
  const addFiles = async (files: File[]) => {
    let added = 0;
    const existing = await ServiceStorage.getMedia();
    for (const file of files) {
      try {
        if (isSongFile(file.name)) {
          const song = parseSongSelectFile(file.name, await file.text());
          if (!song) {
            toast.error(`${file.name} is not a SongSelect song file`);
            continue;
          }
          // The same song again (by CCLI number or title) is updated, not added twice
          const same = existing.find(
            (m) => m.type === 'song' && ((song.ccliNumber && m.ccliNumber === song.ccliNumber) || m.name.toLowerCase() === song.name.toLowerCase()),
          );
          await ServiceStorage.saveMediaItem({
            ...(same ?? { id: `song-${Date.now()}-${added}`, createdAt: new Date(), category: 'SongSelect' }),
            type: 'song',
            name: song.name,
            lyrics: song.lyrics,
            author: song.author,
            copyright: song.copyright,
            ccliNumber: song.ccliNumber,
          } as MediaItem);
          added++;
          continue;
        }
        if (file.type.startsWith('video/')) await addVideoToLibrary(file);
        else if (file.type.startsWith('image/')) await addPictureToLibrary(file);
        else {
          toast.error(`${file.name} is not a picture, video or SongSelect song`);
          continue;
        }
        added++;
      } catch {
        toast.error(`Could not add ${file.name}`);
      }
    }
    await loadMedia();
    if (added) toast.success(`${added} item${added > 1 ? 's' : ''} added`);
  };

  const handleDeleteMedia = (id: string) => {
    ServiceStorage.deleteMediaItem(id);
    loadMedia();
    toast.success('Media deleted');
  };

  const handleEditSong = (song: MediaItem) => {
    setEditingSong(song);
    setEditLyrics(song.lyrics || '');
  };

  const handleSaveLyrics = () => {
    if (!editingSong) return;

    const updatedSong: MediaItem = {
      ...editingSong,
      lyrics: editLyrics,
      slides: parseLyricsToSlides(editLyrics, editingSong.name),
    };

    ServiceStorage.saveMediaItem(updatedSong);
    loadMedia();
    setEditingSong(null);
    toast.success('Lyrics updated');
  };

  const parseLyricsToSlides = (lyrics: string, songTitle: string) => {
    const sections = lyrics.split(/\n\s*\n/);
    const slides: any[] = [];
    
    sections.forEach((section, index) => {
      const trimmed = section.trim();
      if (!trimmed) return;
      
      let sectionType: 'verse' | 'chorus' | 'bridge' | 'outro' | undefined;
      const sectionLower = trimmed.toLowerCase();
      if (sectionLower.includes('verse')) sectionType = 'verse';
      else if (sectionLower.includes('chorus')) sectionType = 'chorus';
      else if (sectionLower.includes('bridge')) sectionType = 'bridge';
      else if (sectionLower.includes('outro')) sectionType = 'outro';
      
      slides.push({
        id: `${songTitle}-slide-${index}`,
        type: 'lyrics',
        title: songTitle,
        songTitle,
        slideNumber: slides.length + 1,
        totalSlides: 0,
        content: trimmed,
        section: sectionType,
      });
    });
    
    slides.forEach(slide => {
      slide.totalSlides = slides.length;
    });
    
    return slides;
  };

  const filteredMedia = media.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesFilter && matchesCategory;
  });

  const counts = { all: media.length, image: media.filter((m) => m.type === 'image').length, video: media.filter((m) => m.type === 'video').length, song: media.filter((m) => m.type === 'song').length };
  const songs = filteredMedia.filter((m) => m.type === 'song');
  const visuals = filteredMedia.filter((m) => m.type === 'image' || m.type === 'video');
  const [dragging, setDragging] = useState(false);

  const addButton = (
    <Button asChild>
      <label className="cursor-pointer">
        <Plus className="w-4 h-4" />
        Add files
        <input type="file" accept="image/*,video/*,.usr,.txt" multiple onChange={handleUpload} className="hidden" aria-label="Add pictures, videos or SongSelect songs" />
      </label>
    </Button>
  );

  return (
    <AppShell
      title="Media"
      subtitle="Pictures, videos and songs for your services. Songs here are recognised when the church sings them."
      actions={addButton}
    >
      <div
        className="relative"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
      >
        {dragging && (
          <div className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-foreground/40 bg-background/80 backdrop-blur grid place-items-center text-lg font-semibold pointer-events-none">
            Drop pictures, videos or SongSelect songs to add them
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex p-1 rounded-full bg-muted/70" role="group" aria-label="Show">
            {([
              ['all', 'Everything', null],
              ['image', 'Pictures', Image],
              ['video', 'Videos', Film],
              ['song', 'Songs', Music],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`h-9 px-3.5 rounded-full flex items-center gap-2 text-sm font-semibold transition ${filter === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
                <span className="text-xs font-medium text-muted-foreground">{counts[value]}</span>
              </button>
            ))}
          </div>
          {categories.length > 2 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-full" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All categories' : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative ml-auto w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11 rounded-full" aria-label="Search media" />
          </div>
        </div>

        {filteredMedia.length === 0 ? (
          <Section>
            <div className="py-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted grid place-items-center mb-4">
                <Image className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="m-0 text-lg font-semibold">{media.length ? 'Nothing matches' : 'Your library is empty'}</p>
              <p className="m-0 mt-1.5 text-sm text-muted-foreground max-w-[56ch] mx-auto">
                Drop pictures (JPG, PNG, WEBP) and videos (MP4, MOV, WEBM) here for backgrounds and slides. For songs, open a song on
                songselect.ccli.com, choose Download → Lyrics (or the import file), and drop the file here: its sections, writers, copyright
                and CCLI number come with it.
              </p>
              <div className="mt-5">{addButton}</div>
            </div>
          </Section>
        ) : (
          <div className="space-y-8">
            {songs.length > 0 && (
              <Section title={`Songs · ${songs.length}`} padded={false}>
                <div className="divide-y divide-border">
                  {songs.map((item) => {
                    const sections = parseSongSections(item.lyrics ?? '');
                    return (
                      <div key={item.id} className="group flex items-center gap-4 px-5 md:px-6 py-3 hover:bg-muted/40">
                        <span className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center flex-shrink-0">
                          <Music className="w-[18px] h-[18px] text-foreground" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[15px] font-semibold truncate">{item.name}</p>
                          <p className="m-0 text-[13px] text-muted-foreground truncate">
                            {[item.author, `${sections.length} section${sections.length === 1 ? '' : 's'}`, item.ccliNumber && `CCLI ${item.ccliNumber}`].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleEditSong(item)}>
                          <Pencil className="w-4 h-4" />
                          Lyrics
                        </Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100" onClick={() => handleDeleteMedia(item.id)} aria-label={`Delete ${item.name}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {visuals.length > 0 && (
              <div>
                <h2 className="m-0 mb-4 text-[17px] font-semibold">Pictures and videos · {visuals.length}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                  {visuals.map((item) => (
                    <figure key={item.id} className="group m-0">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-[0_0_0_1px_hsl(var(--border))]">
                        {item.type === 'image' && item.url ? (
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <MediaThumbnail item={item} />
                        )}
                        {item.type === 'video' && (
                          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                            <Film className="w-3 h-3" />Video
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item.id)}
                          className="absolute right-2 top-2 w-8 h-8 rounded-lg bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-black/80 transition"
                          aria-label={`Delete ${item.name}`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <figcaption className="mt-2 text-sm font-medium truncate">{item.name}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!editingSong} onOpenChange={() => setEditingSong(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Lyrics · {editingSong?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editLyrics}
              onChange={(e) => setEditLyrics(e.target.value)}
              placeholder="Paste lyrics here. Separate sections with a blank line and start each with its name: Verse 1, Chorus…"
              className="min-h-[420px] font-scripture text-base leading-relaxed"
              aria-label="Lyrics"
            />
            <p className="m-0 text-xs text-muted-foreground">Separate sections with a blank line, and start each with its name (Verse 1, Chorus, Bridge).</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingSong(null)}>Cancel</Button>
              <Button onClick={handleSaveLyrics}>Save lyrics</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default MediaLibrary;
