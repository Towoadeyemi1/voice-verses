import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, FolderOpen, HardDrive, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { LibrarySyncStatus, librarySync } from '@/lib/library/librarySync';

export function StorageSettings() {
  const [status, setStatus] = useState<LibrarySyncStatus>(librarySync.getStatus());

  useEffect(() => librarySync.subscribe(setStatus), []);

  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      // Closing the folder picker is not an error
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const hasFolder = !!status.location;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" /> On this computer
          </CardTitle>
          <CardDescription>
            Services, songs and media are always saved on this computer first, so the app works offline.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" /> Library folder
          </CardTitle>
          <CardDescription>
            Also keep a copy in a folder. Choose a folder inside iCloud Drive, Dropbox, OneDrive or Google Drive to
            back up your library and share it between computers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.backend === 'unsupported' ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This browser can't save to a folder. Use the desktop app, or Chrome or Edge.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <div className="font-medium break-all">{status.location ?? 'No folder chosen'}</div>
                <div className="text-muted-foreground flex items-center gap-2">
                  {status.phase === 'syncing' && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Syncing…
                    </>
                  )}
                  {status.phase === 'ok' && (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> Up to date
                      {status.lastSync && ` · last synced ${status.lastSync.toLocaleTimeString()}`}
                    </>
                  )}
                  {status.phase === 'needs-permission' && 'Click "Reconnect" to allow access to this folder again.'}
                  {status.phase === 'error' && <span className="text-destructive">Sync failed: {status.message}</span>}
                  {status.phase === 'off' && 'Library is saved on this computer only.'}
                </div>
                {status.phase === 'ok' && status.message && (
                  <div className="text-amber-600 dark:text-amber-400">{status.message}</div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {status.phase === 'needs-permission' && (
                  <Button onClick={() => run(() => librarySync.reconnect(), 'Folder reconnected')}>Reconnect</Button>
                )}
                <Button
                  variant={hasFolder ? 'outline' : 'default'}
                  onClick={() => run(() => librarySync.chooseFolder(), 'Library folder set')}
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  {hasFolder ? 'Change folder' : 'Choose folder'}
                </Button>
                {hasFolder && status.phase !== 'needs-permission' && (
                  <Button variant="outline" onClick={() => run(() => librarySync.syncNow(), 'Library synced')}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync now
                  </Button>
                )}
                {hasFolder && (
                  <Button variant="ghost" onClick={() => run(() => librarySync.forgetFolder(), 'Stopped using the folder')}>
                    Stop using folder
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Avoid editing the same service on two computers at the same time. If it happens, both versions are
                kept and one is marked "conflict copy". Stopping does not delete anything from the folder.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
