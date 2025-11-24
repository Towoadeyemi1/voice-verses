import { useState, useEffect } from 'react';
import { ProjectionDisplay } from '@/components/ProjectionDisplay';
import { SlideDisplay } from '@/components/SlideDisplay';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { syncService } from '@/lib/syncService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';

export interface ProjectionSettings {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontSize: number;
  showReference: boolean;
  textAlign: 'left' | 'center' | 'right';
  padding: number;
  fontFamily: string;
}

const defaultSettings: ProjectionSettings = {
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  accentColor: '#3B82F6',
  fontSize: 72,
  showReference: true,
  textAlign: 'center',
  padding: 64,
  fontFamily: 'serif',
};

const Projection = () => {
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ProjectionSettings>(defaultSettings);
  const [displayMode, setDisplayMode] = useState<'slide' | 'verse' | 'logo'>('slide');
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('cornerstone-projection-settings');
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
    }

    // Request current slide from presenter on load
    const requestChannel = new BroadcastChannel('cornerstone-display-request');
    requestChannel.postMessage({ type: 'request-current-slide' });
    requestChannel.close();

    // Listen for logo display commands
    const handleLogoDisplay = (event: MessageEvent) => {
      if (event.data?.type === 'show-logo' && event.data?.logoUrl) {
        setLogoUrl(event.data.logoUrl);
        setDisplayMode('logo');
      }
    };

    // Listen via BroadcastChannel
    const channel = new BroadcastChannel('cornerstone-display');
    channel.addEventListener('message', handleLogoDisplay);

    // Check for logo in localStorage on load
    const currentDisplay = localStorage.getItem('cornerstone-current-display');
    if (currentDisplay) {
      try {
        const displayData = JSON.parse(currentDisplay);
        if (displayData.type === 'show-logo' && displayData.logoUrl) {
          setLogoUrl(displayData.logoUrl);
          setDisplayMode('logo');
        }
      } catch (e) {
        console.error('Failed to parse display data', e);
      }
    }

    const unsubscribe = syncService.subscribe((message) => {
      console.log('Projection received message:', message);
      
      // Handle slide updates from Presenter
      if (message.type === 'SLIDE_UPDATE') {
        console.log('Projection handling SLIDE_UPDATE:', message.data);
        
        if (message.data.slide) {
          const slide = message.data.slide;
          setCurrentSlide(slide);
          
          // Extract verse for scripture slides (for legacy ProjectionDisplay component)
          if (slide.type === 'scripture' && slide.verse) {
            setVerse(slide.verse);
          }
          
          setDisplayMode('slide');
          console.log('Projection updated to show slide:', slide.title);
        } else {
          // Clear display when slide is null
          setCurrentSlide(null);
          setVerse(null);
          setDisplayMode('slide');
          console.log('Projection cleared (no slide)');
        }
      }
      // Handle voice-controlled scripture (VERSE_UPDATE from Scripture page)
      else if (message.type === 'VERSE_UPDATE' && message.data.verse) {
        console.log('Projection handling VERSE_UPDATE (voice-controlled):', message.data.verse);
        setVerse(message.data.verse);
        setCurrentSlide(null);
        setDisplayMode('verse');
        console.log('Projection showing voice-controlled verse:', `${message.data.verse.book} ${message.data.verse.chapter}:${message.data.verse.verse}`);
      }
    });

    return () => {
      unsubscribe();
      channel.close();
    };
  }, []);

  const updateSettings = (newSettings: Partial<ProjectionSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('cornerstone-projection-settings', JSON.stringify(updated));
    
    // Dispatch event for display update
    window.dispatchEvent(
      new CustomEvent('projection-settings-updated', { detail: updated })
    );
  };

  return (
    <>
      {displayMode === 'logo' ? (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: settings.backgroundColor }}
        >
          <img 
            src={logoUrl} 
            alt="Service Logo" 
            className="max-w-[80%] max-h-[80%] object-contain"
          />
        </div>
      ) : displayMode === 'slide' && currentSlide ? (
        <div className="fixed inset-0">
          <SlideDisplay slide={currentSlide} className="h-full w-full" />
        </div>
      ) : displayMode === 'verse' ? (
        <ProjectionDisplay verse={verse} settings={settings} />
      ) : (
        <div 
          className="fixed inset-0 flex items-center justify-center text-white/50"
          style={{ backgroundColor: settings.backgroundColor }}
        >
          <p className="text-2xl">Waiting for content...</p>
        </div>
      )}
      
      {/* Settings Toggle Button */}
      <Button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-4 right-4 z-50"
        variant="outline"
        size="icon"
      >
        <Settings className="w-4 h-4" />
      </Button>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="fixed top-16 right-4 z-50 w-96 p-6 max-h-[calc(100vh-5rem)] overflow-y-auto bg-background/95 backdrop-blur">
          <h3 className="text-lg font-semibold mb-4">Projection Settings</h3>
          
          <div className="space-y-6">
            {/* Background Color */}
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.backgroundColor}
                  onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                  className="w-24 px-2 py-1 text-sm border rounded"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => updateSettings({ textColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.textColor}
                  onChange={(e) => updateSettings({ textColor: e.target.value })}
                  className="w-24 px-2 py-1 text-sm border rounded"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label>Accent Color (Reference)</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => updateSettings({ accentColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => updateSettings({ accentColor: e.target.value })}
                  className="w-24 px-2 py-1 text-sm border rounded"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label>Font Size: {settings.fontSize}px</Label>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([value]) => updateSettings({ fontSize: value })}
                min={32}
                max={128}
                step={4}
              />
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => updateSettings({ fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serif">Serif (Classic)</SelectItem>
                  <SelectItem value="sans-serif">Sans-serif (Modern)</SelectItem>
                  <SelectItem value="monospace">Monospace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Alignment */}
            <div className="space-y-2">
              <Label>Text Alignment</Label>
              <Select
                value={settings.textAlign}
                onValueChange={(value: 'left' | 'center' | 'right') => updateSettings({ textAlign: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Padding */}
            <div className="space-y-2">
              <Label>Padding: {settings.padding}px</Label>
              <Slider
                value={[settings.padding]}
                onValueChange={([value]) => updateSettings({ padding: value })}
                min={16}
                max={128}
                step={8}
              />
            </div>

            {/* Show Reference */}
            <div className="flex items-center justify-between">
              <Label>Show Reference</Label>
              <Switch
                checked={settings.showReference}
                onCheckedChange={(checked) => updateSettings({ showReference: checked })}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
            <p>💡 Press ESC or click the settings icon to close this panel</p>
          </div>
        </Card>
      )}
    </>
  );
};

export default Projection;
