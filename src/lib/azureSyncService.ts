import { Service, MediaItem } from '@/types/service';

export interface AzureConfig {
  functionUrl: string;
  enabled: boolean;
}

class AzureSyncService {
  private functionUrl: string = '';
  private enabled: boolean = false;
  private syncInProgress: boolean = false;

  configure(config: AzureConfig): void {
    this.functionUrl = config.functionUrl;
    this.enabled = config.enabled;
    this.saveConfig();
  }

  private saveConfig(): void {
    localStorage.setItem('azure-sync-config', JSON.stringify({
      functionUrl: this.functionUrl,
      enabled: this.enabled,
    }));
  }

  loadConfig(): void {
    const saved = localStorage.getItem('azure-sync-config');
    if (saved) {
      const config = JSON.parse(saved);
      this.functionUrl = config.functionUrl;
      this.enabled = config.enabled;
    }
  }

  isEnabled(): boolean {
    // Enabled if the switch is on (functionUrl is optional, defaults to current origin)
    return this.enabled;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }

  async uploadToBlob(filename: string, data: any): Promise<boolean> {
    if (!this.isEnabled()) {
      console.log('Azure sync not enabled');
      return false;
    }

    try {
      this.syncInProgress = true;
      
      // Use the configured URL or default to current origin
      const baseUrl = this.functionUrl || `${window.location.origin}/api`;
      const response = await fetch(`${baseUrl}/blob-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          data: JSON.stringify(data, null, 2),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
      }

      console.log(`Successfully uploaded ${filename} to Azure Blob`);
      return true;
    } catch (error) {
      console.error('Failed to upload to Azure:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  async downloadFromBlob(filename: string): Promise<any | null> {
    if (!this.isEnabled()) {
      console.log('Azure sync not enabled');
      return null;
    }

    try {
      // Use the configured URL or default to current origin
      const baseUrl = this.functionUrl || `${window.location.origin}/api`;
      const response = await fetch(`${baseUrl}/blob-download?filename=${encodeURIComponent(filename)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to download from Azure:', error);
      return null;
    }
  }

  async syncServices(services: Service[]): Promise<boolean> {
    return this.uploadToBlob('services.json', services);
  }

  async syncMedia(media: MediaItem[]): Promise<boolean> {
    return this.uploadToBlob('media.json', media);
  }

  async syncAppState(state: any): Promise<boolean> {
    return this.uploadToBlob('app-state.json', state);
  }

  async restoreServices(): Promise<Service[] | null> {
    const data = await this.downloadFromBlob('services.json');
    if (!data) return null;
    
    return data.map((s: any) => ({
      ...s,
      date: new Date(s.date),
    }));
  }

  async restoreMedia(): Promise<MediaItem[] | null> {
    const data = await this.downloadFromBlob('media.json');
    if (!data) return null;
    
    return data.map((m: any) => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }));
  }

  async restoreAppState(): Promise<any | null> {
    return this.downloadFromBlob('app-state.json');
  }

  async fullSync(services: Service[], media: MediaItem[], appState: any): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      this.syncInProgress = true;
      
      const results = await Promise.all([
        this.syncServices(services),
        this.syncMedia(media),
        this.syncAppState(appState),
      ]);

      return results.every(r => r);
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const azureSyncService = new AzureSyncService();
