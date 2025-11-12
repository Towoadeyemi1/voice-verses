import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { Image, Music, Plus, Trash2, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { SongSelectImport } from '@/components/SongSelectImport';
import { PowerPointImport } from '@/components/PowerPointImport';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { PageHeader } from '@/components/PageHeader';
import { ModeNav } from '@/components/ModeNav';
import { EmptyState } from '@/components/EmptyState';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Monitor, ChevronDown, ExternalLink } from 'lucide-react';
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

const MediaLibrary = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'song' | 'presentation'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [editingSong, setEditingSong] = useState<MediaItem | null>(null);
  const [editLyrics, setEditLyrics] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const categories = ['all', ...new Set(media.map(m => m.category).filter(Boolean))] as string[];

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = () => {
    setMedia(ServiceStorage.getMedia());
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const newMedia: MediaItem = {
          id: Date.now().toString(),
          type: 'image',
          name: file.name.replace(/\.[^/.]+$/, ''),
          url,
          createdAt: new Date(),
        };
        ServiceStorage.saveMediaItem(newMedia);
        loadMedia();
        toast.success('Image uploaded');
        setShowUpload(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Upload failed');
    }
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

  const handleOpenLowerThird = () => {
    window.open('/lower-third', '_blank', 'width=1280,height=720');
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="w-full mx-auto px-4">
        <PageHeader
          title="Media Library"
          description="Manage images and song lyrics for your services"
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          showDisplayMonitor={showDisplayMonitor}
          onToggleDisplayMonitor={() => setShowDisplayMonitor(!showDisplayMonitor)}
          onOpenLowerThird={handleOpenLowerThird}
        />

        <div className="space-y-4 sm:space-y-6">
          <ModeNav />

          {/* Settings Panel */}
          {showSettings && (
            <div className="animate-fade-in">
              <SettingsPanel onClose={() => setShowSettings(false)} />
            </div>
          )}

          {/* Display Monitor Section */}
          {showDisplayMonitor && (
            <Card className="p-5 animate-fade-in">
              <Collapsible defaultOpen>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Display Monitor</h3>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-primary/10 rounded">Live</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open('/display-manager', '_blank', 'width=1400,height=900')}
                      className="h-7 px-2 hover:bg-primary/10"
                      title="Open in window"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10">
                        <ChevronDown className="w-4 h-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <DisplayMonitor />
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Search and Filter */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Search media items"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  size="sm"
                  aria-pressed={filter === 'all'}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'image' ? 'default' : 'outline'}
                  onClick={() => setFilter('image')}
                  size="sm"
                  aria-pressed={filter === 'image'}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Images
                </Button>
                <Button
                  variant={filter === 'song' ? 'default' : 'outline'}
                  onClick={() => setFilter('song')}
                  size="sm"
                  aria-pressed={filter === 'song'}
                >
                  <Music className="w-4 h-4 mr-2" />
                  Songs
                </Button>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]" aria-label="Filter by category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowUpload(!showUpload)} className="shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </Card>

          {/* Upload Section */}
          {showUpload && (
            <Card className="p-6 animate-fade-in">
              <h2 className="text-xl font-semibold mb-4">Upload Media</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="image-upload">Upload Image</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mt-2"
                    aria-label="Select image file to upload"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: JPG, PNG, WEBP (for backgrounds, announcements)
                  </p>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Song lyrics can be added when building your service. 
                    Use the Service Builder to create lyric slides.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* SongSelect Integration */}
          <div className="space-y-4">
            <SongSelectImport onImportComplete={loadMedia} />
            <PowerPointImport onImportComplete={loadMedia} />
          </div>

          {/* Media Grid */}
          {filteredMedia.length === 0 ? (
            <EmptyState
              icon={Image}
              title="No media found"
              description="Upload images or import songs to get started with your media library."
              action={{
                label: 'Upload First Item',
                onClick: () => setShowUpload(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <Card key={item.id} className="overflow-hidden group hover-lift">
                  {item.type === 'image' && item.url && (
                    <div className="aspect-video bg-muted relative">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMedia(item.id)}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {item.type === 'song' && (
                    <div className="aspect-video bg-primary/10 flex items-center justify-center relative">
                      <Music className="w-12 h-12 text-primary" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditSong(item)}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMedia(item.id)}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {item.type}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

        {/* Edit Lyrics Dialog */}
        <Dialog open={!!editingSong} onOpenChange={() => setEditingSong(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Edit Lyrics - {editingSong?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Lyrics</Label>
                <Textarea
                  value={editLyrics}
                  onChange={(e) => setEditLyrics(e.target.value)}
                  placeholder="Paste lyrics here... Separate sections with blank lines"
                  className="min-h-[400px] font-mono"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Separate sections with blank lines. Include labels like "Verse 1", "Chorus", etc.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSong(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveLyrics}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
