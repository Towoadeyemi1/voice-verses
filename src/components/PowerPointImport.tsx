import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { MediaItem, ImageSlide } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';

interface PowerPointImportProps {
  onImportComplete?: () => void;
}

export const PowerPointImport = ({ onImportComplete }: PowerPointImportProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pptx') && !file.name.endsWith('.ppt')) {
      toast.error('Please upload a PowerPoint file (.ppt or .pptx)');
      return;
    }

    setIsProcessing(true);

    try {
      // For now, we'll create a placeholder presentation
      // In a full implementation, this would use a library to parse the PPTX
      toast.info('PowerPoint Import', {
        description: 'PowerPoint parsing will be available soon. For now, export your slides as images and upload them individually.',
        duration: 7000,
      });

      // Placeholder implementation - would parse PPTX and extract slides as images
      const presentationName = file.name.replace(/\.(pptx?|PPT[X]?)$/i, '');
      
      const newMedia: MediaItem = {
        id: Date.now().toString(),
        type: 'presentation',
        name: presentationName,
        category: 'presentations',
        createdAt: new Date(),
        presentationSlides: [], // Would contain parsed slides
      };

      ServiceStorage.saveMediaItem(newMedia);
      onImportComplete?.();
      
      toast.info('Manual Import Required', {
        description: 'Export your PowerPoint slides as images (File > Export > Image) and upload them to the Media Library.',
        duration: 10000,
      });

    } catch (error) {
      toast.error('Import failed');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Presentation className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">PowerPoint Import</h3>
            <p className="text-sm text-muted-foreground">
              Import presentations from PowerPoint files
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="ppt-upload">Upload PowerPoint File</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="ppt-upload"
              type="file"
              accept=".ppt,.pptx"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            <Button disabled={isProcessing}>
              <FileUp className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Upload'}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Workaround:</p>
          <p>
            1. Open your PowerPoint presentation<br />
            2. Go to File → Export → Change File Type → PNG or JPEG<br />
            3. Export all slides as images<br />
            4. Upload the images to the Media Library above
          </p>
        </div>
      </div>
    </Card>
  );
};
