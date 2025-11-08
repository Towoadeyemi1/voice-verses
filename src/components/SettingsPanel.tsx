import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Mic, Type, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { BibleVersionSettings } from './BibleVersionSettings';
import { BibleParser } from '@/lib/bibleParser';
import { BibleVersionType } from '@/types/bibleVersion';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [fontSize, setFontSize] = useState<number>(72);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showReference, setShowReference] = useState(true);
  const [bibleVersion, setBibleVersion] = useState<BibleVersionType>('kjv');

  useEffect(() => {
    // Initialize Bible version
    BibleParser.initializeVersion();
    setBibleVersion(BibleParser.getVersion());

    // Load saved settings
    const savedSettings = localStorage.getItem('cornerstone-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setFontSize(settings.fontSize || 72);
      setTheme(settings.theme || 'dark');
      setAutoScroll(settings.autoScroll ?? true);
      setShowReference(settings.showReference ?? true);
      setSelectedDevice(settings.audioDevice || 'default');
    }

    // Get audio devices
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const audioInputs = devices.filter((device) => 
        device.kind === 'audioinput' && device.deviceId !== ''
      );
      setAudioDevices(audioInputs);
    });
  }, []);

  const saveSettings = () => {
    const settings = {
      fontSize,
      theme,
      autoScroll,
      showReference,
      audioDevice: selectedDevice,
    };
    localStorage.setItem('cornerstone-settings', JSON.stringify(settings));
    
    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Broadcast settings update
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
    
    toast.success('Settings saved', {
      description: 'Your preferences have been updated',
    });
  };

  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gradient">Settings</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-8">
        {/* Audio Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Audio Settings</h4>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio-device">Microphone / Input Device</Label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger id="audio-device">
                <SelectValue placeholder="Select audio device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                {audioDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the microphone or line-in input for voice recognition
            </p>
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Projection Display</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size">Font Size</Label>
                <span className="text-sm text-muted-foreground">{fontSize}px</span>
              </div>
              <Slider
                id="font-size"
                min={48}
                max={120}
                step={4}
                value={[fontSize]}
                onValueChange={(value) => setFontSize(value[0])}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Adjust the verse text size on projection display
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-reference">Show Reference</Label>
                <p className="text-xs text-muted-foreground">
                  Display book, chapter, and verse on projection
                </p>
              </div>
              <Switch
                id="show-reference"
                checked={showReference}
                onCheckedChange={setShowReference}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-scroll">Auto Scroll</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically scroll to new verses in transcript
                </p>
              </div>
              <Switch
                id="auto-scroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
            </div>
          </div>
        </div>

        {/* Bible Version Settings */}
        <BibleVersionSettings 
          currentVersion={bibleVersion}
          onVersionChange={setBibleVersion}
        />

        {/* Theme Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Appearance</h4>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Interface Theme</Label>
            <Select value={theme} onValueChange={(value: 'light' | 'dark') => setTheme(value)}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the control panel theme (projection display stays dark)
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-border">
          <Button onClick={saveSettings} className="w-full gradient-divine">
            Save Settings
          </Button>
        </div>
      </div>
    </Card>
  );
};
