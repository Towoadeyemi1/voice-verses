import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { LyricsSlide, MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { Music, Eye, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { splitLyricsContent } from '@/lib/slideContentSplitter';

interface LyricsEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (slides: LyricsSlide[], subsectionBackground?: { type: 'image'; url: string; opacity: number }) => void;
  initialSongTitle?: string;
  initialLyrics?: string;
}

interface LyricsSection {
  label: string;
  content: string;
  type: 'verse' | 'chorus' | 'bridge' | 'outro' | undefined;
}

interface FontSettings {
  family: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  color: string;
}

export function LyricsEditor({ open, onClose, onSave, initialSongTitle = '', initialLyrics = '' }: LyricsEditorProps) {
  const [songTitle, setSongTitle] = useState(initialSongTitle);
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [linesPerSlide, setLinesPerSlide] = useState(4);
  const [includeTitleCard, setIncludeTitleCard] = useState(true);
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    family: 'Arial',
    size: 'large',
    color: '#ffffff',
  });
  const [backgroundMedia, setBackgroundMedia] = useState<string | undefined>(undefined);
  const [backgroundOpacity, setBackgroundOpacity] = useState(60);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [previewSlides, setPreviewSlides] = useState<LyricsSlide[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      ServiceStorage.getMedia().then(setMedia);
    }
  }, [open]);

  useEffect(() => {
    if (lyrics && songTitle) {
      const slides = parseLyricsToSlides();
      setPreviewSlides(slides);
    }
  }, [lyrics, songTitle, linesPerSlide, includeTitleCard, fontSettings]);

  const parseLyricsToSlides = (): LyricsSlide[] => {
    const slides: LyricsSlide[] = [];
    
    // Add title card if enabled
    if (includeTitleCard && songTitle.trim()) {
      slides.push({
        id: `${songTitle}-title`,
        type: 'lyrics',
        title: songTitle,
        songTitle,
        slideNumber: 1,
        totalSlides: 0,
        content: songTitle,
        textFormatting: {
          fontSize: fontSettings.size,
          alignment: 'center',
        },
        backgroundMedia: backgroundMedia ? {
          type: 'image',
          url: backgroundMedia,
          opacity: backgroundOpacity,
        } : undefined,
      });
    }

    // Parse lyrics into sections
    const sections = parseLyricSections(lyrics);
    
    // Split each section into slides based on lines per slide
    sections.forEach((section, sectionIndex) => {
      const lines = section.content.split('\n').filter(line => line.trim());
      
      // Split lines into chunks
      for (let i = 0; i < lines.length; i += linesPerSlide) {
        const slideLines = lines.slice(i, i + linesPerSlide);
        const slideContent = slideLines.join('\n');
        
        // Further split if content is too long for screen
        const splitSlides = splitLyricsContent(
          slideContent,
          songTitle,
          section.type,
          fontSettings.size,
          slides.length + 1,
          0 // Will be updated later
        );
        
        // Apply background media to all split slides
        splitSlides.forEach(slide => {
          if (backgroundMedia) {
            slide.backgroundMedia = {
              type: 'image',
              url: backgroundMedia,
              opacity: backgroundOpacity,
            };
          }
          slides.push(slide);
        });
      }
    });

    // Update total slides count and slide numbers
    slides.forEach((slide, index) => {
      slide.slideNumber = index + 1;
      slide.totalSlides = slides.length;
    });

    return slides;
  };

  const parseLyricSections = (lyricsText: string): LyricsSection[] => {
    const sections: LyricsSection[] = [];
    const blocks = lyricsText.split(/\n\s*\n/).filter(b => b.trim());

    blocks.forEach(block => {
      const lines = block.trim().split('\n');
      const firstLine = lines[0].toLowerCase();
      
      let label = '';
      let content = block;
      let type: 'verse' | 'chorus' | 'bridge' | 'outro' | undefined = undefined;

      // Check if first line is a label
      if (firstLine.match(/^(verse|chorus|bridge|outro|pre-?chorus|intro|tag)/i)) {
        label = lines[0];
        content = lines.slice(1).join('\n');
        
        if (firstLine.includes('verse')) type = 'verse';
        else if (firstLine.includes('chorus')) type = 'chorus';
        else if (firstLine.includes('bridge')) type = 'bridge';
        else if (firstLine.includes('outro')) type = 'outro';
      }

      sections.push({ label, content, type });
    });

    return sections;
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
        setBackgroundMedia(url);
        toast.success('Background image loaded');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to load image');
    }
  };

  const handleSave = () => {
    if (!songTitle.trim()) {
      toast.error('Please enter a song title');
      return;
    }

    if (!lyrics.trim()) {
      toast.error('Please enter song lyrics');
      return;
    }

    const slides = parseLyricsToSlides();
    const subsectionBackground = backgroundMedia ? {
      type: 'image' as const,
      url: backgroundMedia,
      opacity: backgroundOpacity,
    } : undefined;

    onSave(slides, subsectionBackground);
    onClose();
  };

  const fontFamilies = [
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
    'Verdana',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS',
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Song Lyrics</DialogTitle>
          <DialogDescription>
            Paste the lyrics, choose the formatting and preview the slides
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="input" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Manual Input</TabsTrigger>
            <TabsTrigger value="preview">Preview Slides</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            <TabsContent value="input" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Song Title *</Label>
                        <Input
                          value={songTitle}
                          onChange={(e) => setSongTitle(e.target.value)}
                          placeholder="Enter song title"
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label>Lyrics *</Label>
                        <Textarea
                          value={lyrics}
                          onChange={(e) => setLyrics(e.target.value)}
                          placeholder="Verse 1&#10;Amazing grace, how sweet the sound&#10;That saved a wretch like me&#10;&#10;Chorus&#10;I once was lost, but now I'm found&#10;Was blind but now I see"
                          className="min-h-[300px] font-mono mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Separate sections with blank lines. Include labels like "Verse 1", "Chorus", etc.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Formatting</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Include Title Card</Label>
                        <Switch
                          checked={includeTitleCard}
                          onCheckedChange={setIncludeTitleCard}
                        />
                      </div>

                      <div>
                        <Label>Lines Per Slide: {linesPerSlide}</Label>
                        <Slider
                          value={[linesPerSlide]}
                          onValueChange={([value]) => setLinesPerSlide(value)}
                          min={2}
                          max={8}
                          step={1}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label>Font Family</Label>
                        <Select
                          value={fontSettings.family}
                          onValueChange={(value) => setFontSettings({ ...fontSettings, family: value })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {fontFamilies.map(font => (
                              <SelectItem key={font} value={font}>{font}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Font Size</Label>
                        <Select
                          value={fontSettings.size}
                          onValueChange={(value: any) => setFontSettings({ ...fontSettings, size: value })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                            <SelectItem value="xlarge">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Text Color</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            type="color"
                            value={fontSettings.color}
                            onChange={(e) => setFontSettings({ ...fontSettings, color: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={fontSettings.color}
                            onChange={(e) => setFontSettings({ ...fontSettings, color: e.target.value })}
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Background Media</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Select from Media Library</Label>
                        <Select
                          value={backgroundMedia || 'none'}
                          onValueChange={(value) => setBackgroundMedia(value === 'none' ? undefined : value)}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Choose a background image" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 max-h-[200px]">
                            <SelectItem value="none">No background</SelectItem>
                            {media.filter(m => m.type === 'image' && m.url).length > 0 ? (
                              media.filter(m => m.type === 'image' && m.url).map(m => (
                                <SelectItem key={m.id} value={m.url!}>{m.name}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="empty" disabled>No images in library</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="bg-upload">Upload New Image</Label>
                        <div className="mt-2">
                          <label htmlFor="bg-upload" className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                            <Upload className="w-4 h-4" />
                            <span className="text-sm">Choose image file</span>
                          </label>
                          <Input
                            id="bg-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {backgroundMedia && (
                        <>
                          <div>
                            <Label>Background Opacity: {backgroundOpacity}%</Label>
                            <Slider
                              value={[backgroundOpacity]}
                              onValueChange={([value]) => setBackgroundOpacity(value)}
                              min={0}
                              max={100}
                              step={5}
                              className="mt-2"
                            />
                          </div>

                          <div className="relative aspect-video rounded-lg overflow-hidden border">
                            <img
                              src={backgroundMedia}
                              alt="Background preview"
                              className="w-full h-full object-cover"
                              style={{ opacity: backgroundOpacity / 100 }}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2"
                              onClick={() => setBackgroundMedia(undefined)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewSlides.length === 0 ? (
                  <Card className="col-span-full p-8">
                    <div className="text-center text-muted-foreground">
                      <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Enter song title and lyrics to see preview</p>
                    </div>
                  </Card>
                ) : (
                  previewSlides.map((slide, index) => (
                    <Card key={slide.id} className="overflow-hidden">
                      <div
                        className="aspect-video relative flex items-center justify-center p-4"
                        style={{
                          backgroundImage: slide.backgroundMedia ? `url(${slide.backgroundMedia.url})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {slide.backgroundMedia && (
                          <div
                            className="absolute inset-0 bg-black"
                            style={{ opacity: 1 - (slide.backgroundMedia.opacity || 60) / 100 }}
                          />
                        )}
                        <div className="relative z-10 text-center w-full">
                          <pre
                            className="whitespace-pre-wrap font-sans"
                            style={{
                              fontFamily: fontSettings.family,
                              fontSize: slide.textFormatting?.fontSize === 'small' ? '0.875rem' :
                                        slide.textFormatting?.fontSize === 'medium' ? '1rem' :
                                        slide.textFormatting?.fontSize === 'large' ? '1.25rem' : '1.5rem',
                              color: fontSettings.color,
                              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                            }}
                          >
                            {slide.content}
                          </pre>
                        </div>
                      </div>
                      <div className="p-2 bg-muted/50">
                        <p className="text-xs text-center">
                          Slide {slide.slideNumber} of {slide.totalSlides}
                          {slide.section && ` • ${slide.section}`}
                        </p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            <Music className="w-4 h-4 mr-2" />
            Add {previewSlides.length} Slide{previewSlides.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
