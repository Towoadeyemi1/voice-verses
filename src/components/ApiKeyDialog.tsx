import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { isDesktop } from '@/lib/desktop';
import { setApiKey as saveApiKey } from '@/speech/openai/credentials';

interface ApiKeyDialogProps {
  open: boolean;
  /** Called with true once a key has been saved, false if cancelled */
  onClose: (saved: boolean) => void;
}

export const ApiKeyDialog = ({ open, onClose }: ApiKeyDialogProps) => {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setApiKey('');
  }, [open]);

  const handleSubmit = async () => {
    if (!apiKey.trim() || saving) return;
    setSaving(true);
    try {
      await saveApiKey(apiKey);
      onClose(true);
    } catch (error) {
      toast.error('Could not save API key', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>OpenAI API Key Required</DialogTitle>
          <DialogDescription>
            The OpenAI speech engine uses your OpenAI account. Enter an API key to continue.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {isDesktop
              ? 'The key is encrypted with your operating system keychain and never leaves this computer except to talk to OpenAI.'
              : 'The key is stored only in this browser. Anyone with access to this browser profile could read it.'}{' '}
            Prefer no key? Choose browser or local speech recognition in Settings → Speech Engine.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 py-4">
          <Label htmlFor="apiKey">OpenAI API Key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete="off"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Get your API key from{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              OpenAI Platform
            </a>
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!apiKey.trim() || saving}>
            Save and Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
