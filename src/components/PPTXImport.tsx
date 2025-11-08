import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageSlide } from '@/types/service';
import { FileUp, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PPTXImportProps {
  onImport: (slides: ImageSlide[]) => void;
}

export const PPTXImport = ({ onImport }: PPTXImportProps) => {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pptx') && !file.name.endsWith('.ppt')) {
      toast.error('Please select a PowerPoint file (.pptx or .ppt)');
      return;
    }

    setImporting(true);
    
    try {
      // In a real implementation, you would:
      // 1. Use a library like pptx2json or similar to parse the PPTX
      // 2. Extract images or convert slides to images
      // 3. Upload to storage and create slide objects
      
      // For now, we'll simulate this with a placeholder
      toast.info('PPTX import coming soon', {
        description: 'This feature will extract each slide as an image that can be edited and projected.',
      });
      
      // Placeholder implementation - in real world, you'd extract actual slides
      const mockSlides: ImageSlide[] = [];
      
      onImport(mockSlides);
      setOpen(false);
    } catch (error) {
      console.error('Error importing PPTX:', error);
      toast.error('Failed to import PowerPoint file');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <FileUp className="w-4 h-4 mr-2" />
          Import PowerPoint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import PowerPoint Presentation</DialogTitle>
          <DialogDescription>
            Upload a .pptx or .ppt file. Each slide will be imported as an editable image slide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <Label htmlFor="pptx-upload" className="cursor-pointer">
              <span className="text-primary hover:underline">Choose a file</span>
              <span className="text-muted-foreground"> or drag and drop</span>
            </Label>
            <Input
              id="pptx-upload"
              type="file"
              accept=".pptx,.ppt"
              onChange={handleFileSelect}
              disabled={importing}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-2">
              PowerPoint files (.pptx, .ppt) up to 50MB
            </p>
          </div>

          {importing && (
            <div className="text-center text-sm text-muted-foreground">
              Processing presentation...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
