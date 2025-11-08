import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Service, Slide, ScriptureSlide, LyricsSlide, ImageSlide, AnnouncementSlide } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { BibleParser } from '@/lib/bibleParser';
import { Book, Music, Image as ImageIcon, MessageSquare, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { toast } from 'sonner';

const ServiceBuilder = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [editingSlide, setEditingSlide] = useState<Partial<Slide> | null>(null);
  const media = ServiceStorage.getMedia();

  useEffect(() => {
    if (serviceId) {
      const services = ServiceStorage.getServices();
      const found = services.find(s => s.id === serviceId);
      if (found) {
        setService(found);
      } else {
        toast.error('Service not found');
        navigate('/service-planner');
      }
    }
  }, [serviceId, navigate]);

  const handleSave = () => {
    if (service) {
      ServiceStorage.saveService(service);
      toast.success('Service saved');
    }
  };

  const handleAddScriptureSlide = async () => {
    const reference = prompt('Enter scripture reference (e.g., John 3:16):');
    if (!reference) return;

    const verse = await BibleParser.parseReference(reference);
    if (!verse) {
      toast.error('Invalid scripture reference');
      return;
    }

    const newSlide: ScriptureSlide = {
      id: Date.now().toString(),
      type: 'scripture',
      title: `${verse.book} ${verse.chapter}:${verse.verse}`,
      verse,
    };

    setService(prev => prev ? {
      ...prev,
      slides: [...prev.slides, newSlide],
    } : null);
    toast.success('Scripture slide added');
  };

  const handleAddLyricsSlide = () => {
    setEditingSlide({
      type: 'lyrics',
      songTitle: '',
      content: '',
    });
  };

  const handleSaveLyricsSlide = () => {
    if (!editingSlide || editingSlide.type !== 'lyrics') return;

    const slides: LyricsSlide[] = [];
    const sections = editingSlide.content?.split('\n\n') || [];
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      const sectionName = lines[0].toLowerCase().includes('verse') ? 'verse' :
                         lines[0].toLowerCase().includes('chorus') ? 'chorus' :
                         lines[0].toLowerCase().includes('bridge') ? 'bridge' : undefined;
      
      const content = sectionName ? lines.slice(1).join('\n') : section;
      
      const slide: LyricsSlide = {
        id: `${Date.now()}-${index}`,
        type: 'lyrics',
        title: `${editingSlide.songTitle} - Slide ${index + 1}`,
        songTitle: editingSlide.songTitle || 'Untitled',
        slideNumber: index + 1,
        totalSlides: sections.length,
        content: content.trim(),
        section: sectionName,
      };
      slides.push(slide);
    });

    setService(prev => prev ? {
      ...prev,
      slides: [...prev.slides, ...slides],
    } : null);

    setEditingSlide(null);
    toast.success('Lyrics slides added');
  };

  const handleAddImageSlide = () => {
    if (media.filter(m => m.type === 'image').length === 0) {
      toast.error('No images in library', {
        description: 'Upload images in Media Library first',
      });
      return;
    }
    
    const imageMedia = media.filter(m => m.type === 'image');
    const imageList = imageMedia.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    const selection = prompt(`Select image:\n${imageList}\n\nEnter number:`);
    
    if (!selection) return;
    
    const index = parseInt(selection) - 1;
    const selectedImage = imageMedia[index];
    
    if (!selectedImage || !selectedImage.url) {
      toast.error('Invalid selection');
      return;
    }

    const newSlide: ImageSlide = {
      id: Date.now().toString(),
      type: 'image',
      title: selectedImage.name,
      imageUrl: selectedImage.url,
    };

    setService(prev => prev ? {
      ...prev,
      slides: [...prev.slides, newSlide],
    } : null);
    toast.success('Image slide added');
  };

  const handleDeleteSlide = (id: string) => {
    setService(prev => prev ? {
      ...prev,
      slides: prev.slides.filter(s => s.id !== id),
    } : null);
    toast.success('Slide deleted');
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    if (!service) return;
    
    const newSlides = [...service.slides];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newSlides.length) return;
    
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    
    setService({
      ...service,
      slides: newSlides,
    });
  };

  if (!service) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Service Builder</h1>
            <p className="text-muted-foreground">{service.name}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={() => navigate('/service-planner')}>
              Back
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Slide Buttons */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add Slide</h2>
            <div className="space-y-2">
              <Button onClick={handleAddScriptureSlide} className="w-full justify-start">
                <Book className="w-4 h-4 mr-2" />
                Scripture
              </Button>
              <Button onClick={handleAddLyricsSlide} className="w-full justify-start">
                <Music className="w-4 h-4 mr-2" />
                Song Lyrics
              </Button>
              <Button onClick={handleAddImageSlide} className="w-full justify-start">
                <ImageIcon className="w-4 h-4 mr-2" />
                Image
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t">
              <Label>Service Info</Label>
              <Input
                value={service.name}
                onChange={(e) => setService({...service, name: e.target.value})}
                className="mt-2 mb-2"
                placeholder="Service name"
              />
              <Input
                type="time"
                value={service.startTime}
                onChange={(e) => setService({...service, startTime: e.target.value})}
                className="mt-2"
              />
            </div>
          </Card>

          {/* Slides List */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">
              Slides ({service.slides.length})
            </h2>

            {service.slides.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No slides yet. Add your first slide using the buttons on the left.
              </div>
            ) : (
              <div className="space-y-2">
                {service.slides.map((slide, index) => (
                  <Card key={slide.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveSlide(index, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveSlide(index, 'down')}
                          disabled={index === service.slides.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {slide.type === 'scripture' && <Book className="w-4 h-4 text-primary" />}
                          {slide.type === 'lyrics' && <Music className="w-4 h-4 text-primary" />}
                          {slide.type === 'image' && <ImageIcon className="w-4 h-4 text-primary" />}
                          {slide.type === 'announcement' && <MessageSquare className="w-4 h-4 text-primary" />}
                          <span className="font-medium">{slide.title}</span>
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {slide.type}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSlide(slide.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Lyrics Editor Modal */}
        {editingSlide?.type === 'lyrics' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl p-6">
              <h2 className="text-2xl font-semibold mb-4">Add Song Lyrics</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="song-title">Song Title</Label>
                  <Input
                    id="song-title"
                    value={(editingSlide as any).songTitle || ''}
                    onChange={(e) => setEditingSlide({...editingSlide, songTitle: e.target.value})}
                    placeholder="Amazing Grace"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="lyrics-content">Lyrics</Label>
                  <Textarea
                    id="lyrics-content"
                    value={(editingSlide as any).content || ''}
                    onChange={(e) => setEditingSlide({...editingSlide, content: e.target.value})}
                    placeholder="Verse 1&#10;Amazing grace how sweet the sound&#10;&#10;Chorus&#10;How precious did that grace appear&#10;&#10;Separate slides with double line breaks"
                    className="mt-2 h-64 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Use double line breaks to separate slides. Label sections as "Verse", "Chorus", "Bridge"
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingSlide(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveLyricsSlide}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Slides
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceBuilder;
