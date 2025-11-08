import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { Image, Music, Plus, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SongSelectImport } from '@/components/SongSelectImport';

const MediaLibrary = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'song'>('all');
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();

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

  const filteredMedia = media.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || m.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Media Library</h1>
            <p className="text-muted-foreground">
              Manage images and song lyrics for your services
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/service-planner')}>
              Service Planner
            </Button>
            <Button onClick={() => navigate('/')}>
              Control Panel
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'image' ? 'default' : 'outline'}
                onClick={() => setFilter('image')}
              >
                <Image className="w-4 h-4 mr-2" />
                Images
              </Button>
              <Button
                variant={filter === 'song' ? 'default' : 'outline'}
                onClick={() => setFilter('song')}
              >
                <Music className="w-4 h-4 mr-2" />
                Songs
              </Button>
            </div>
            <Button onClick={() => setShowUpload(!showUpload)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </Card>

        {/* Upload Section */}
        {showUpload && (
          <Card className="p-6 mb-6 animate-fade-in">
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
        <SongSelectImport onImportComplete={loadMedia} />

        {/* Media Grid */}
        {filteredMedia.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No media found. Upload images to get started.
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload First Item
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredMedia.map((item) => (
              <Card key={item.id} className="overflow-hidden group">
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
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {item.type === 'song' && (
                  <div className="aspect-video bg-primary/10 flex items-center justify-center">
                    <Music className="w-12 h-12 text-primary" />
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
      </div>
    </div>
  );
};

export default MediaLibrary;
