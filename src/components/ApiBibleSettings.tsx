import { useState } from 'react';
import { BookOpen, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiBibleVersion, apiBibleKey, chosenApiBibles, listApiBibles, setApiBibleKey, setChosenApiBibles } from '@/lib/onlineBibles';

/**
 * API.Bible (the American Bible Society's licensed Bible service): the church's
 * key, and which of the translations it can read to offer in Voice Verses.
 * NKJV, NIV, CSB, NASB and other copyrighted translations appear once they are
 * licensed to the key on api.bible.
 */
export const ApiBibleSettings = ({ onChange }: { onChange: () => void }) => {
  const [key, setKey] = useState(apiBibleKey);
  const [available, setAvailable] = useState<ApiBibleVersion[] | null>(null);
  const [chosen, setChosen] = useState<ApiBibleVersion[]>(chosenApiBibles);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const find = async () => {
    setBusy(true);
    setError(null);
    try {
      setApiBibleKey(key);
      setAvailable(await listApiBibles(key.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (bible: ApiBibleVersion) => {
    const next = chosen.some((b) => b.id === bible.id) ? chosen.filter((b) => b.id !== bible.id) : [...chosen, bible];
    setChosen(next);
    setChosenApiBibles(next);
    onChange();
  };

  const shown = (available ?? []).filter((b) => `${b.abbreviation} ${b.name}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <h5 className="font-semibold text-sm">More translations from API.Bible (NKJV, NIV, CSB, NASB…)</h5>
      </div>
      <p className="text-xs text-muted-foreground">
        Create a free account at api.bible, license the translations you want (copyrighted ones such as the NKJV are licensed per
        translation), and paste your key here. Translations bought inside ProPresenter can only be used in ProPresenter.
      </p>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="apibible-key" className="sr-only">API.Bible key</Label>
          <Input id="apibible-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="API.Bible key" />
        </div>
        <Button onClick={find} disabled={!key.trim() || busy}>
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Show my translations
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {chosen.length > 0 && (
        <p className="text-xs">
          In use: <span className="font-semibold">{chosen.map((b) => b.abbreviation).join(', ')}</span> (choose one under Translation above)
        </p>
      )}

      {available && (
        <div className="space-y-2">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filter ${available.length} English translations`} className="h-8" />
          <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {shown.map((b) => {
              const on = chosen.some((c) => c.id === b.id);
              return (
                <button key={b.id} onClick={() => toggle(b)} className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${on ? 'bg-primary/10' : ''}`}>
                  <span className={`w-4 h-4 rounded border grid place-items-center ${on ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                    {on && <Check className="w-3 h-3" />}
                  </span>
                  <span className="font-semibold w-16">{b.abbreviation}</span>
                  <span className="text-muted-foreground truncate">{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
