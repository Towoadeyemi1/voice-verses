import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { storageOrchestrator, StorageStatus } from '@/lib/storageOrchestrator';
import { azureSyncService } from '@/lib/azureSyncService';
import { Cloud, HardDrive, Database, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function StorageSettings() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [azureUrl, setAzureUrl] = useState('');
  const [azureEnabled, setAzureEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadStatus();
    loadAzureConfig();
  }, []);

  const loadStatus = async () => {
    const s = await storageOrchestrator.getStatus();
    setStatus(s);
  };

  const loadAzureConfig = () => {
    azureSyncService.loadConfig();
    setAzureEnabled(azureSyncService.isEnabled());
    // Load URL from localStorage
    const saved = localStorage.getItem('azure-sync-config');
    if (saved) {
      const config = JSON.parse(saved);
      setAzureUrl(config.functionUrl || '');
    }
  };

  const handleRequestFileSystem = async () => {
    const success = await storageOrchestrator.requestFileSystemAccess();
    if (success) {
      toast.success('Local directory access granted');
      loadStatus();
    } else {
      toast.error('Failed to get directory access');
    }
  };

  const handleSaveAzure = () => {
    storageOrchestrator.configureAzure(azureUrl, azureEnabled);
    toast.success('Azure configuration saved');
    loadStatus();
  };

  const handleManualSync = async () => {
    if (!azureSyncService.isEnabled()) {
      toast.error('Azure sync is not configured');
      return;
    }

    setIsSyncing(true);
    try {
      await storageOrchestrator.getStatus(); // Trigger sync
      toast.success('Manual sync completed');
      loadStatus();
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Status</CardTitle>
          <CardDescription>
            Your app data is automatically backed up across multiple storage layers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>IndexedDB (Browser)</span>
            </div>
            {status?.indexedDB ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Inactive
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span>Local File System</span>
            </div>
            {status?.fileSystem ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              <span>Azure Blob Storage</span>
            </div>
            {status?.azure ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Syncing
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Not Configured
              </Badge>
            )}
          </div>

          {status?.lastSync && (
            <div className="text-sm text-muted-foreground pt-2 border-t">
              Last synced: {status.lastSync.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local File System Backup</CardTitle>
          <CardDescription>
            Store your data in a local directory for easy backup and access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.fileSystem ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                ✓ Connected to local directory. Files are saved in /cornerstone-bible/
              </p>
            </div>
          ) : (
            <Button onClick={handleRequestFileSystem}>
              <HardDrive className="h-4 w-4 mr-2" />
              Select Local Directory
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Azure Cloud Sync</CardTitle>
          <CardDescription>
            Automatically sync your data to Azure Blob Storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="azure-url">Azure Function URL</Label>
            <Input
              id="azure-url"
              placeholder="https://your-function-app.azurewebsites.net/api"
              value={azureUrl}
              onChange={(e) => setAzureUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter your Azure Function App URL (the base URL without specific endpoints)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="azure-enabled"
              checked={azureEnabled}
              onCheckedChange={setAzureEnabled}
            />
            <Label htmlFor="azure-enabled">Enable Azure Sync</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveAzure}>
              Save Configuration
            </Button>
            
            {azureEnabled && (
              <Button 
                variant="outline" 
                onClick={handleManualSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
