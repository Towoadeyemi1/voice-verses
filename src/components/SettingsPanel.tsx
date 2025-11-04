import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  return (
    <Card className="p-6 border-border bg-card">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="input-device" className="text-foreground">Audio Input Device</Label>
            <Select defaultValue="default">
              <SelectTrigger id="input-device">
                <SelectValue placeholder="Select input device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Microphone</SelectItem>
                <SelectItem value="line-in">Line In</SelectItem>
                <SelectItem value="usb">USB Microphone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="translation" className="text-foreground">Bible Translation</Label>
            <Select defaultValue="kjv">
              <SelectTrigger id="translation">
                <SelectValue placeholder="Select translation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kjv">King James Version (KJV)</SelectItem>
                <SelectItem value="niv" disabled>NIV (Coming Soon)</SelectItem>
                <SelectItem value="esv" disabled>ESV (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-foreground">Projection Font Size</Label>
            <div className="flex items-center gap-4">
              <Slider defaultValue={[48]} min={32} max={96} step={4} className="flex-1" />
              <span className="text-sm text-muted-foreground min-w-[4ch]">48px</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="theme" className="text-foreground">Projection Theme</Label>
            <Select defaultValue="dark">
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="church">Church Branded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Button onClick={onClose} className="w-full gradient-divine">
            Save Settings
          </Button>
        </div>
      </div>
    </Card>
  );
};
