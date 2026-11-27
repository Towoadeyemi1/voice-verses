import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { useDoubleClickFullscreen, usePointerActive } from '@/hooks/use-pointer-active';
import { ConfidenceScreen, ConfidenceSettings, loadConfidenceSettings, saveConfidenceSettings } from '@/components/ConfidenceScreen';
import { STAGE_PRESETS } from '@/lib/starters';

/** The confidence monitor window, with its settings (shown while the mouse moves). */
const Confidence = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConfidenceSettings>(loadConfidenceSettings);
  const pointerActive = usePointerActive();
  const measure = () => ({ width: window.innerWidth, scale: window.innerHeight / 1080 });
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const resize = () => setSize(measure());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useDoubleClickFullscreen();

  const updateSettings = (newSettings: Partial<ConfidenceSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveConfidenceSettings(updated);
  };

  return (
    <>
      {/* Drawn at 1080 tall and scaled to the TV (a 4K or 720p TV shows the same as a 1080p one) */}
      <div className="fixed inset-0 overflow-hidden bg-black">
        <ConfidenceScreen settings={settings} style={{ width: size.width / size.scale, height: 1080, transform: `scale(${size.scale})`, transformOrigin: '0 0' }} />
      </div>

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
          <h3 className="text-lg font-semibold mb-4">Stage monitor</h3>

          <div className="space-y-2 mb-6">
            <Label>Start from a layout</Label>
            <div className="grid grid-cols-2 gap-2">
              {STAGE_PRESETS.map((p) => (
                <button key={p.id} type="button" onClick={() => updateSettings(p.settings)} className="text-left rounded-lg border border-border hover:bg-muted p-2.5" title={p.description}>
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted-foreground leading-snug">{p.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {/* Background Color */}
            <div className="space-y-2">
              <Label>Background</Label>
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
              <Label>Words</Label>
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
              <Label>Highlights (verse numbers, notes, countdown)</Label>
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
              <Label>Words now, at most: {settings.currentVerseFontSize} px</Label>
              <Slider
                value={[settings.currentVerseFontSize]}
                onValueChange={([value]) => updateSettings({ currentVerseFontSize: value })}
                min={48}
                max={140}
                step={4}
              />
            </div>

            {/* Next Verse Font Size */}
            <div className="space-y-2">
              <Label>What comes next: {settings.nextVerseFontSize} px</Label>
              <Slider
                value={[settings.nextVerseFontSize]}
                onValueChange={([value]) => updateSettings({ nextVerseFontSize: value })}
                min={32}
                max={80}
                step={2}
              />
            </div>

            {/* Clock Font Size */}
            <div className="space-y-2">
              <Label>Clock: {settings.clockFontSize} px</Label>
              <Slider
                value={[settings.clockFontSize]}
                onValueChange={([value]) => updateSettings({ clockFontSize: value })}
                min={32}
                max={110}
                step={4}
              />
            </div>

            {/* Clock Format */}
            <div className="space-y-2">
              <Label>Clock style</Label>
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
              <Label>Show what comes next: {settings.nextVerseCount ? `${settings.nextVerseCount} thing${settings.nextVerseCount > 1 ? 's' : ''}` : 'Off'}</Label>
              <Slider
                value={[settings.nextVerseCount]}
                onValueChange={([value]) => updateSettings({ nextVerseCount: value })}
                min={0}
                max={3}
                step={1}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
            <p>Sizes are for a 1920 × 1080 screen; the stage monitor scales to any TV. Press Esc or the settings button to close this.</p>
          </div>
        </Card>
      )}
    </>
  );
};

export default Confidence;
