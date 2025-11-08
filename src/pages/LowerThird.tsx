import { useState, useEffect } from 'react';
import { LowerThirdDisplay, LowerThirdSettings } from '@/components/LowerThirdDisplay';
import { BibleVerse } from '@/types/bible';
import { syncService } from '@/lib/syncService';
import { Button } from '@/components/ui/button';
import { Settings, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

const LowerThird = () => {
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<LowerThirdSettings>({
    template: 'classic',
    position: 'bottom-center',
    fontSize: 32,
    showBackground: true,
    backgroundOpacity: 0.8,
    textColor: '#FFFFFF',
    accentColor: '#3B82F6',
  });

  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('cornerstone-lower-third-settings');
    if (savedSettings) {
      setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
    }

    // Subscribe to verse updates
    const unsubscribe = syncService.subscribe((message) => {
      if (message.type === 'VERSE_UPDATE' && message.data.verse) {
        setVerse(message.data.verse);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateSettings = (newSettings: Partial<LowerThirdSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('cornerstone-lower-third-settings', JSON.stringify(updated));
    
    // Dispatch event for display component
    window.dispatchEvent(
      new CustomEvent('lower-third-settings-updated', { detail: updated })
    );
  };

  return (
    <div className="relative">
      <LowerThirdDisplay verse={verse} />
      
      {/* Settings Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-50 bg-background/95 backdrop-blur"
        onClick={() => setShowSettings(!showSettings)}
      >
        {showSettings ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
      </Button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-6 space-y-6 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div>
            <h2 className="text-lg font-semibold mb-4">Lower Third Settings</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Customize your broadcast overlay appearance
            </p>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select 
              value={settings.template} 
              onValueChange={(value) => updateSettings({ template: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="elegant">Elegant</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position Selection */}
          <div className="space-y-2">
            <Label>Position</Label>
            <Select 
              value={settings.position} 
              onValueChange={(value) => updateSettings({ position: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="bottom-center">Bottom Center</SelectItem>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label>Font Size: {settings.fontSize}px</Label>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => updateSettings({ fontSize: value })}
              min={20}
              max={64}
              step={2}
            />
          </div>

          {/* Show Background */}
          <div className="flex items-center justify-between">
            <Label>Show Background</Label>
            <Switch
              checked={settings.showBackground}
              onCheckedChange={(checked) => updateSettings({ showBackground: checked })}
            />
          </div>

          {/* Background Opacity */}
          {settings.showBackground && (
            <div className="space-y-2">
              <Label>Background Opacity: {Math.round(settings.backgroundOpacity * 100)}%</Label>
              <Slider
                value={[settings.backgroundOpacity * 100]}
                onValueChange={([value]) => updateSettings({ backgroundOpacity: value / 100 })}
                min={0}
                max={100}
                step={5}
              />
            </div>
          )}

          {/* Text Color */}
          <div className="space-y-2">
            <Label>Text Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.textColor}
                onChange={(e) => updateSettings({ textColor: e.target.value })}
                className="w-12 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={settings.textColor}
                onChange={(e) => updateSettings({ textColor: e.target.value })}
                className="flex-1 px-3 py-2 rounded border bg-background"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => updateSettings({ accentColor: e.target.value })}
                className="w-12 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={settings.accentColor}
                onChange={(e) => updateSettings({ accentColor: e.target.value })}
                className="flex-1 px-3 py-2 rounded border bg-background"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">Chroma Key Setup:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Use #00FF00 green for keying</li>
              <li>Apply chroma key in your broadcast software</li>
              <li>Adjust tolerance as needed</li>
              <li>Position this window in your capture</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default LowerThird;
