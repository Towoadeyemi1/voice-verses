import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: (apiKey: string | null) => void;
}

export const ApiKeyDialog = ({ open, onClose }: ApiKeyDialogProps) => {
  const [apiKey, setApiKey] = useState('');
  const [saveToLocalStorage, setSaveToLocalStorage] = useState(true);

  useEffect(() => {
    // Load saved API key from localStorage
    const savedKey = localStorage.getItem('dev_openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSubmit = () => {
    if (apiKey.trim()) {
      if (saveToLocalStorage) {
        localStorage.setItem('dev_openai_api_key', apiKey.trim());
      }
      onClose(apiKey.trim());
    }
  };

  const handleCancel = () => {
    onClose(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>OpenAI API Key Required</DialogTitle>
          <DialogDescription>
            This version of the app has no token server. Enter your OpenAI API key to use OpenAI voice recognition.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your key is stored only in this browser. Alternatively, choose the Web Speech or local speech engine in Settings, which need no key.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="saveKey"
              checked={saveToLocalStorage}
              onChange={(e) => setSaveToLocalStorage(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="saveKey" className="text-sm cursor-pointer">
              Save key to browser (for testing convenience)
            </Label>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!apiKey.trim()}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
