import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceSubsection } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface SubsectionBackgroundConfigProps {
  subsection: ServiceSubsection;
  onUpdate: (subsection: ServiceSubsection) => void;
}

export const SubsectionBackgroundConfig = ({ subsection, onUpdate }: SubsectionBackgroundConfigProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState(subsection.backgroundMedia?.url || 'none');
  const [opacity, setOpacity] = useState(subsection.backgroundMedia?.opacity || 0.3);
  const media = ServiceStorage.getMedia().filter(m => m.type === 'image' && m.url);

  const handleSave = () => {
    const updated: ServiceSubsection = {
      ...subsection,
      backgroundMedia: backgroundUrl && backgroundUrl !== 'none' ? {
        type: 'image',
        url: backgroundUrl,
        opacity,
      } : undefined,
    };
    onUpdate(updated);
    setIsOpen(false);
    toast.success('Background updated');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      
      // Save to media library
      const newMedia = {
        id: `media-${Date.now()}`,
        type: 'image' as const,
        name: file.name,
        url: imageUrl,
        createdAt: new Date(),
      };
      ServiceStorage.saveMediaItem(newMedia);
      
      setBackgroundUrl(imageUrl);
      toast.success('Background image uploaded');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-7 w-7 p-0"
        title="Set background"
      >
        <ImageIcon className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subsection Background</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Background Image</Label>
              <div className="flex gap-2">
                <Select value={backgroundUrl} onValueChange={setBackgroundUrl}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="No background" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="none">No background</SelectItem>
                    {media.map(m => (
                      <SelectItem key={m.id} value={m.url!}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => document.getElementById('subsection-bg-upload')?.click()}
                  title="Upload new image"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <input
                  id="subsection-bg-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This background will apply to all slides in this subsection
              </p>
            </div>

            {backgroundUrl && backgroundUrl !== 'none' && (
              <div>
                <Label>Background Opacity: {Math.round(opacity * 100)}%</Label>
                <Slider
                  value={[opacity]}
                  onValueChange={([value]) => setOpacity(value)}
                  min={0}
                  max={1}
                  step={0.1}
                  className="mt-2"
                />
              </div>
            )}

            {/* Preview */}
            {backgroundUrl && backgroundUrl !== 'none' && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                  <img
                    src={backgroundUrl}
                    alt="Background preview"
                    className="w-full h-full object-cover"
                    style={{ opacity }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-lg font-medium drop-shadow-lg">
                      Sample Text
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Background
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
