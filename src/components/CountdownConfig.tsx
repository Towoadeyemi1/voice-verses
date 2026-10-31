import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountdownConfig } from '@/types/service';
import { Clock, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CountdownConfigProps {
  config?: CountdownConfig;
  onUpdate: (config: CountdownConfig | undefined) => void;
}

export const CountdownConfiguration = ({ config, onUpdate }: CountdownConfigProps) => {
  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<CountdownConfig>(
    config || {
      enabled: false,
      durationMinutes: 5,
      displayTargets: ['confidence'],
      alertEnabled: false,
    }
  );

  const handleSave = () => {
    if (localConfig.enabled) {
      onUpdate(localConfig);
    } else {
      onUpdate(undefined);
    }
    setOpen(false);
  };

  const toggleDisplayTarget = (target: 'main' | 'confidence' | 'stream') => {
    const targets = localConfig.displayTargets.includes(target)
      ? localConfig.displayTargets.filter(t => t !== target)
      : [...localConfig.displayTargets, target];
    setLocalConfig({ ...localConfig, displayTargets: targets });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={config?.enabled ? 'default' : 'outline'}>
          <Clock className="w-4 h-4 mr-2" />
          {config?.enabled ? (config.mode === 'until' ? `to ${config.untilTime}` : `${config.durationMinutes}m`) : 'Add Timer'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Countdown Configuration</DialogTitle>
          <DialogDescription>
            Configure countdown timer for this subsection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="countdown-enabled"
              checked={localConfig.enabled}
              onCheckedChange={(checked) =>
                setLocalConfig({ ...localConfig, enabled: checked as boolean })
              }
            />
            <Label htmlFor="countdown-enabled" className="cursor-pointer">
              Enable countdown timer
            </Label>
          </div>

          {localConfig.enabled && (
            <>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={localConfig.mode !== 'until' ? 'default' : 'outline'}
                  onClick={() => setLocalConfig({ ...localConfig, mode: 'duration' })}
                >
                  Length of time
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={localConfig.mode === 'until' ? 'default' : 'outline'}
                  onClick={() => setLocalConfig({ ...localConfig, mode: 'until', untilTime: localConfig.untilTime ?? '10:00' })}
                >
                  Until a time
                </Button>
              </div>

              {localConfig.mode === 'until' ? (
                <div>
                  <Label htmlFor="until">Count down to</Label>
                  <Input
                    id="until"
                    type="time"
                    value={localConfig.untilTime ?? '10:00'}
                    onChange={(e) => setLocalConfig({ ...localConfig, untilTime: e.target.value })}
                    className="mt-2 w-40"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={localConfig.durationMinutes}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        durationMinutes: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="countdown-message">Message</Label>
                <Input
                  id="countdown-message"
                  value={localConfig.message ?? ''}
                  placeholder="The section name"
                  onChange={(e) => setLocalConfig({ ...localConfig, message: e.target.value || undefined })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="mb-2 block">On the projector</Label>
                <Select
                  value={localConfig.projector ?? (localConfig.displayTargets.includes('main') ? 'corner' : 'off')}
                  onValueChange={(projector) =>
                    setLocalConfig({
                      ...localConfig,
                      projector: projector as 'full' | 'corner' | 'off',
                      displayTargets: localConfig.displayTargets.filter((t) => t !== 'main'),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full screen (e.g. before the service)</SelectItem>
                    <SelectItem value="corner">Small, in the corner</SelectItem>
                    <SelectItem value="off">Not shown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">Also show on</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="target-confidence"
                      checked={localConfig.displayTargets.includes('confidence')}
                      onCheckedChange={() => toggleDisplayTarget('confidence')}
                    />
                    <Label htmlFor="target-confidence" className="cursor-pointer">
                      Confidence Monitor
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="target-stream"
                      checked={localConfig.displayTargets.includes('stream')}
                      onCheckedChange={() => toggleDisplayTarget('stream')}
                    />
                    <Label htmlFor="target-stream" className="cursor-pointer">
                      Stream/Broadcast
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="alert-enabled"
                    checked={localConfig.alertEnabled}
                    onCheckedChange={(checked) =>
                      setLocalConfig({ ...localConfig, alertEnabled: checked as boolean })
                    }
                  />
                  <Label htmlFor="alert-enabled" className="cursor-pointer">
                    Enable time alerts
                  </Label>
                </div>

                {localConfig.alertEnabled && (
                  <div className="ml-6 space-y-3">
                    <div>
                      <Label htmlFor="alert-type">Alert Color</Label>
                      <Select
                        value={localConfig.alertType || 'yellow'}
                        onValueChange={(value) =>
                          setLocalConfig({
                            ...localConfig,
                            alertType: value as 'yellow' | 'red',
                          })
                        }
                      >
                        <SelectTrigger id="alert-type" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yellow">Yellow Warning</SelectItem>
                          <SelectItem value="red">Red Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="alert-threshold">
                        Alert at (seconds remaining)
                      </Label>
                      <Input
                        id="alert-threshold"
                        type="number"
                        min="0"
                        value={localConfig.alertThresholdSeconds || 60}
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            alertThresholdSeconds: parseInt(e.target.value) || 60,
                          })
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Configuration</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
