import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { isDesktop } from '@/lib/desktop';
import { SECRET_LABELS, SecretName, setSecret } from '@/lib/secrets';

const KEY_PAGES: Record<SecretName, { url: string; site: string; placeholder: string }> = {
  openai: { url: 'https://platform.openai.com/api-keys', site: 'OpenAI Platform', placeholder: 'sk-...' },
  anthropic: { url: 'https://console.anthropic.com/settings/keys', site: 'Claude Console', placeholder: 'sk-ant-...' },
};

interface ApiKeyDialogProps {
  open: boolean;
  /** Which provider's key to ask for (default: OpenAI) */
  secret?: SecretName;
  /** Why the key is needed, shown under the title */
  purpose?: string;
  /** Called with true once a key has been saved, false if cancelled */
  onClose: (saved: boolean) => void;
}

export const ApiKeyDialog = ({ open, secret = 'openai', purpose, onClose }: ApiKeyDialogProps) => {
  const label = SECRET_LABELS[secret];
  const keyPage = KEY_PAGES[secret];
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setApiKey('');
  }, [open]);

  const handleSubmit = async () => {
    if (!apiKey.trim() || saving) return;
    setSaving(true);
    try {
      await setSecret(secret, apiKey);
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
          <DialogTitle>{label} API Key</DialogTitle>
          <DialogDescription>
            {purpose ?? `The OpenAI speech engine uses your ${label} account. Enter an API key to continue.`}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {isDesktop
              ? 'The key is encrypted with your operating system keychain and never leaves this computer except to talk to OpenAI.'
              : 'The key is stored only in this browser. Anyone with access to this browser profile could read it.'}{' '}
            Usage is billed to your {label} account.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 py-4">
          <Label htmlFor="apiKey">{label} API Key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder={keyPage.placeholder}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete="off"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Get your API key from{' '}
            <a
              href={keyPage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {keyPage.site}
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
