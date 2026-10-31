import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { useDoubleClickFullscreen, usePointerActive } from '@/hooks/use-pointer-active';
import { ConfidenceScreen, ConfidenceSettings, loadConfidenceSettings, saveConfidenceSettings } from '@/components/ConfidenceScreen';

/** The confidence monitor window, with its settings (shown while the mouse moves). */
const Confidence = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConfidenceSettings>(loadConfidenceSettings);
  const pointerActive = usePointerActive();
  useDoubleClickFullscreen();

  const updateSettings = (newSettings: Partial<ConfidenceSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveConfidenceSettings(updated);
  };

  return (
    <>
      <ConfidenceScreen settings={settings} className="h-screen" />

      {/* Settings button, only while the mouse is moving */}
      {(pointerActive || showSettings) && (
        <Button
          onClick={() => setShowSettings(!showSettings)}
          className="fixed top-4 right-4 z-50"
          variant="outline"
          size="icon"
        >
          <Settings className="w-4 h-4" />
        </Button>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Card className="settings-panel fixed top-16 right-4 z-50 w-96 p-6 max-h-[calc(100vh-5rem)] overflow-y-auto bg-background/95 backdrop-blur">
          <h3 className="text-lg font-semibold mb-4">Confidence Monitor Settings</h3>
          
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

            {/* Current Verse Font Size */}
            <div className="space-y-2">
              <Label>Current Verse Font Size: {settings.currentVerseFontSize}px</Label>
              <Slider
                value={[settings.currentVerseFontSize]}
                onValueChange={([value]) => updateSettings({ currentVerseFontSize: value })}
                min={32}
                max={96}
                step={4}
              />
            </div>

            {/* Next Verse Font Size */}
            <div className="space-y-2">
              <Label>Next Verse Font Size: {settings.nextVerseFontSize}px</Label>
              <Slider
                value={[settings.nextVerseFontSize]}
                onValueChange={([value]) => updateSettings({ nextVerseFontSize: value })}
                min={16}
                max={48}
                step={2}
              />
            </div>

            {/* Clock Font Size */}
            <div className="space-y-2">
              <Label>Clock Font Size: {settings.clockFontSize}px</Label>
              <Slider
                value={[settings.clockFontSize]}
                onValueChange={([value]) => updateSettings({ clockFontSize: value })}
                min={24}
                max={64}
                step={4}
              />
            </div>

            {/* Clock Format */}
            <div className="space-y-2">
              <Label>Clock Format</Label>
              <Select
                value={settings.clockFormat}
                onValueChange={(value: '12h' | '24h') => updateSettings({ clockFormat: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Next Verse Count */}
            <div className="space-y-2">
              <Label>Show Next Verses: {settings.nextVerseCount}</Label>
              <Slider
                value={[settings.nextVerseCount]}
                onValueChange={([value]) => updateSettings({ nextVerseCount: value })}
                min={1}
                max={5}
                step={1}
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

export default Confidence;
