import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, KeyRound, Server } from 'lucide-react';
import { toast } from 'sonner';
import { ApiKeyDialog } from './ApiKeyDialog';
import { clearApiKey, getCredentialMode, hasApiKey } from '@/speech/openai/credentials';

/** Shows where the OpenAI key lives and lets the user add, replace or remove it. */
export const OpenAIKeySettings = () => {
  const mode = getCredentialMode();
  const [keySaved, setKeySaved] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = () => {
    hasApiKey().then(setKeySaved).catch(() => setKeySaved(false));
  };

  useEffect(refresh, []);

  if (mode === 'token-server') {
    return (
      <div className="p-4 rounded-lg border bg-muted/30 flex gap-2 text-sm text-muted-foreground">
        <Server className="w-4 h-4 mt-0.5 shrink-0" />
        OpenAI access is provided by this site's token server. No API key needed.
      </div>
    );
  }

  const handleRemove = async () => {
    await clearApiKey();
    refresh();
    toast.success('OpenAI API key removed');
  };

  return (
    <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
      <p className="text-sm text-muted-foreground">
        High-accuracy transcription billed to your OpenAI account.{' '}
        {mode === 'desktop'
          ? 'Your key is encrypted with the operating system keychain.'
          : 'Your key is stored only in this browser.'}
      </p>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          {keySaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" /> API key saved
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4 text-muted-foreground" /> No API key saved
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            {keySaved ? 'Replace key' : 'Add key'}
          </Button>
          {keySaved && (
            <Button size="sm" variant="ghost" onClick={handleRemove}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <ApiKeyDialog
        open={dialogOpen}
        onClose={(saved) => {
          setDialogOpen(false);
          if (saved) {
            refresh();
            toast.success('OpenAI API key saved');
          }
        }}
      />
    </div>
  );
};
