import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { ApiKeyDialog } from './ApiKeyDialog';
import { isDesktop } from '@/lib/desktop';
import { SECRET_LABELS, SecretName, clearSecret, hasSecret } from '@/lib/secrets';

interface ApiKeySettingsProps {
  secret: SecretName;
  description: string;
}

/** Shows whether a provider key is saved and lets the user add, replace or remove it. */
export const ApiKeySettings = ({ secret, description }: ApiKeySettingsProps) => {
  const label = SECRET_LABELS[secret];
  const [keySaved, setKeySaved] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = () => {
    hasSecret(secret).then(setKeySaved).catch(() => setKeySaved(false));
  };

  useEffect(refresh, [secret]);

  const handleRemove = async () => {
    await clearSecret(secret);
    refresh();
    toast.success(`${label} API key removed`);
  };

  return (
    <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
      <p className="text-sm text-muted-foreground">
        {description}{' '}
        {isDesktop
          ? 'Your key is encrypted with the operating system keychain.'
          : 'Your key is stored only in this browser.'}
      </p>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          {keySaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" /> {label} key saved
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4 text-muted-foreground" /> No {label} key saved
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
        secret={secret}
        purpose={description}
        onClose={(saved) => {
          setDialogOpen(false);
          if (saved) {
            refresh();
            toast.success(`${label} API key saved`);
          }
        }}
      />
    </div>
  );
};
