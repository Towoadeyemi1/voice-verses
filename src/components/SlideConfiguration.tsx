import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Slider } from '@/components/ui/slider';
import { Slide } from '@/types/service';
import { Settings2, Image as ImageIcon } from 'lucide-react';
import { ServiceStorage } from '@/lib/serviceStorage';

interface SlideConfigurationProps {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
}

export const SlideConfiguration = ({ slide, onUpdate }: SlideConfigurationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState(slide.backgroundMedia?.url || 'none');
  const [backgroundOpacity, setBackgroundOpacity] = useState(slide.backgroundMedia?.opacity || 0.3);
  const [linesPerSlide, setLinesPerSlide] = useState(slide.textFormatting?.linesPerSlide || 4);
  const [fontSize, setFontSize] = useState(slide.textFormatting?.fontSize || 'large');
  const [alignment, setAlignment] = useState(slide.textFormatting?.alignment || 'center');

  const media = ServiceStorage.getMedia().filter(m => m.type === 'image' && m.url);

  const handleSave = () => {
    const updatedSlide: Slide = {
      ...slide,
      backgroundMedia: backgroundUrl && backgroundUrl !== 'none' ? {
        type: 'image',
        url: backgroundUrl,
        opacity: backgroundOpacity,
      } : undefined,
      textFormatting: {
        linesPerSlide,
        fontSize: fontSize as any,
        alignment: alignment as any,
      },
    };
    onUpdate(updatedSlide);
    setIsOpen(false);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        <Settings2 className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Slide Configuration</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Background Media */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Background Media</Label>
              
              <div>
                <Label>Select Background Image</Label>
                <Select value={backgroundUrl} onValueChange={setBackgroundUrl}>
                  <SelectTrigger className="mt-2">
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
              </div>

              {backgroundUrl && backgroundUrl !== 'none' && (
                <div>
                  <Label>Background Opacity: {Math.round(backgroundOpacity * 100)}%</Label>
                  <Slider
                    value={[backgroundOpacity]}
                    onValueChange={([value]) => setBackgroundOpacity(value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            {/* Text Formatting */}
            {(slide.type === 'lyrics' || slide.type === 'scripture') && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Text Formatting</Label>

                <div>
                  <Label>Lines Per Slide</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={linesPerSlide}
                    onChange={(e) => setLinesPerSlide(parseInt(e.target.value) || 4)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of text lines to display per slide
                  </p>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Select value={fontSize} onValueChange={(val) => setFontSize(val as any)}>
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
                  <Label>Text Alignment</Label>
                  <Select value={alignment} onValueChange={(val) => setAlignment(val as any)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
