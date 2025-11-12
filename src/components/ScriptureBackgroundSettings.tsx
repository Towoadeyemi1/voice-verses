import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceStorage } from '@/lib/serviceStorage';
import { MediaItem } from '@/types/service';
import { Book, Upload } from 'lucide-react';
import { toast } from 'sonner';

export interface ScriptureBackgroundConfig {
  autoScriptureEnabled: boolean;
  manualScriptureEnabled: boolean;
  backgroundUrl?: string;
  opacity: number;
}

const defaultConfig: ScriptureBackgroundConfig = {
  autoScriptureEnabled: false,
  manualScriptureEnabled: false,
  opacity: 0.3,
};

export const ScriptureBackgroundSettings = () => {
  const [config, setConfig] = useState<ScriptureBackgroundConfig>(defaultConfig);
  const [media, setMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    ServiceStorage.getMedia().then(items => {
      setMedia(items.filter(m => m.type === 'image' && m.url));
    });
  }, []);

  useEffect(() => {
    const savedConfig = localStorage.getItem('cornerstone-scripture-background');
    if (savedConfig) {
      setConfig({ ...defaultConfig, ...JSON.parse(savedConfig) });
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('cornerstone-scripture-background', JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('scripture-background-updated', { detail: config }));
    toast.success('Scripture background settings saved');
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
      
      setConfig(prev => ({ ...prev, backgroundUrl: imageUrl }));
      toast.success('Background image uploaded');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Book className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">Scripture Backgrounds</h4>
      </div>

      {/* Background Media Selection */}
      <div className="space-y-3">
        <Label>Background Image</Label>
        
        <div className="flex gap-2">
          <Select 
            value={config.backgroundUrl || 'none'} 
            onValueChange={(val) => setConfig(prev => ({ ...prev, backgroundUrl: val === 'none' ? undefined : val }))}
          >
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
            onClick={() => document.getElementById('scripture-bg-upload')?.click()}
            title="Upload new image"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <input
            id="scripture-bg-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {config.backgroundUrl && config.backgroundUrl !== 'none' && (
          <div className="mt-4">
            <Label>Background Opacity: {Math.round(config.opacity * 100)}%</Label>
            <Slider
              value={[config.opacity]}
              onValueChange={([value]) => setConfig(prev => ({ ...prev, opacity: value }))}
              min={0}
              max={1}
              step={0.1}
              className="mt-2"
            />
          </div>
        )}
      </div>

      {/* Toggle Options */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-scripture-bg">Auto Scripture Background</Label>
            <p className="text-xs text-muted-foreground">
              Apply background to scriptures added via voice/auto search
            </p>
          </div>
          <Switch
            id="auto-scripture-bg"
            checked={config.autoScriptureEnabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoScriptureEnabled: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="manual-scripture-bg">Manual Scripture Background</Label>
            <p className="text-xs text-muted-foreground">
              Apply background to scriptures added manually to service
            </p>
          </div>
          <Switch
            id="manual-scripture-bg"
            checked={config.manualScriptureEnabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, manualScriptureEnabled: checked }))}
          />
        </div>
      </div>

      {/* Preview */}
      {config.backgroundUrl && config.backgroundUrl !== 'none' && (
        <div className="space-y-2 pt-4 border-t">
          <Label>Preview</Label>
          <div className="relative w-full h-32 rounded-lg overflow-hidden border">
            <img
              src={config.backgroundUrl}
              alt="Background preview"
              className="w-full h-full object-cover"
              style={{ opacity: config.opacity }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white text-xl font-serif drop-shadow-lg">
                Sample Scripture Text
              </p>
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="w-full">
        Save Scripture Background Settings
      </Button>
    </div>
  );
};
