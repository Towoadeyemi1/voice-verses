import { Service, MediaItem } from '@/types/service';
import { indexedDBService, AppState } from './indexedDBService';
import { fileSystemService } from './fileSystemService';
import { azureSyncService } from './azureSyncService';
import { ServiceStorage } from './serviceStorage';

export type StorageStatus = {
  indexedDB: boolean;
  fileSystem: boolean;
  azure: boolean;
  lastSync: Date | null;
};

class StorageOrchestrator {
  private syncInterval: NodeJS.Timeout | null = null;
  private autoSyncEnabled: boolean = true;

  async initialize(): Promise<void> {
    console.log('Initializing storage orchestrator...');
    
    // Initialize IndexedDB
    await indexedDBService.init();
    
    // Load Azure config
    azureSyncService.loadConfig();
    
    // Restore state from best available source
    await this.restoreState();
    
    // Start auto-sync if enabled
    if (this.autoSyncEnabled) {
      this.startAutoSync();
    }
  }

  private async restoreState(): Promise<void> {
    console.log('Restoring app state...');
    
    // Try to load from IndexedDB first (fastest)
    const indexedState = await indexedDBService.getAppState();
    
    // If IndexedDB has recent data, use it
    if (indexedState.services.length > 0 || indexedState.media.length > 0) {
      console.log('Restored from IndexedDB');
      this.applyState(indexedState);
      
      // Sync with Azure in background
      if (navigator.onLine && azureSyncService.isEnabled()) {
        this.backgroundSyncFromAzure();
      }
      return;
    }
    
    // Try file system next
    const hasFS = await fileSystemService.hasDirectoryAccess();
    if (hasFS) {
      const fsServices = await fileSystemService.loadServices();
      const fsMedia = await fileSystemService.loadMedia();
      
      if (fsServices || fsMedia) {
        console.log('Restored from file system');
        const state: AppState = {
          services: fsServices || [],
          media: fsMedia || [],
          settings: {},
          lastSync: new Date(),
        };
        this.applyState(state);
        await indexedDBService.saveAppState(state);
        return;
      }
    }
    
    // Finally try Azure
    if (navigator.onLine && azureSyncService.isEnabled()) {
      const azureServices = await azureSyncService.restoreServices();
      const azureMedia = await azureSyncService.restoreMedia();
      
      if (azureServices || azureMedia) {
        console.log('Restored from Azure');
        const state: AppState = {
          services: azureServices || [],
          media: azureMedia || [],
          settings: {},
          lastSync: new Date(),
        };
        this.applyState(state);
        await indexedDBService.saveAppState(state);
      }
    }
    
    console.log('No previous state found, starting fresh');
  }

  private applyState(state: AppState): void {
    // Apply to localStorage (for backward compatibility)
    if (state.services.length > 0) {
      state.services.forEach(service => ServiceStorage.saveService(service));
    }
    
    if (state.media.length > 0) {
      state.media.forEach(item => ServiceStorage.saveMediaItem(item));
    }
  }

  private async backgroundSyncFromAzure(): Promise<void> {
    try {
      const azureState = await azureSyncService.restoreAppState();
      if (azureState) {
        const currentState = await indexedDBService.getAppState();
        
        // Simple conflict resolution: use Azure if it's newer
        if (new Date(azureState.lastSync) > currentState.lastSync) {
          console.log('Azure has newer data, updating local...');
          this.applyState(azureState);
          await indexedDBService.saveAppState(azureState);
        }
      }
    } catch (error) {
      console.error('Background sync from Azure failed:', error);
    }
  }

  async saveService(service: Service): Promise<void> {
    // Save to localStorage first (immediate)
    ServiceStorage.saveService(service);
    
    const services = ServiceStorage.getServices();
    
    // Save to IndexedDB (fast)
    await indexedDBService.saveServices(services);
    
    // Save to file system (background)
    if (await fileSystemService.hasDirectoryAccess()) {
      fileSystemService.saveServices(services).catch(console.error);
    }
    
    // Sync to Azure (background, when online)
    if (navigator.onLine && azureSyncService.isEnabled()) {
      this.debouncedAzureSync();
    }
  }

  async saveMediaItem(item: MediaItem): Promise<void> {
    ServiceStorage.saveMediaItem(item);
    
    const media = ServiceStorage.getMedia();
    
    await indexedDBService.saveMedia(media);
    
    if (await fileSystemService.hasDirectoryAccess()) {
      fileSystemService.saveMedia(media).catch(console.error);
    }
    
    if (navigator.onLine && azureSyncService.isEnabled()) {
      this.debouncedAzureSync();
    }
  }

  private syncTimeout: NodeJS.Timeout | null = null;
  private debouncedAzureSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(() => {
      this.syncToAzure();
    }, 5000); // Wait 5 seconds of inactivity before syncing
  }

  private async syncToAzure(): Promise<void> {
    try {
      const services = ServiceStorage.getServices();
      const media = ServiceStorage.getMedia();
      const state: AppState = {
        services,
        media,
        settings: {},
        lastSync: new Date(),
      };
      
      await azureSyncService.fullSync(services, media, state);
      console.log('Synced to Azure successfully');
    } catch (error) {
      console.error('Azure sync failed:', error);
    }
  }

  private startAutoSync(): void {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && azureSyncService.isEnabled()) {
        this.syncToAzure();
      }
    }, 5 * 60 * 1000);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async getStatus(): Promise<StorageStatus> {
    const state = await indexedDBService.getAppState();
    
    return {
      indexedDB: true,
      fileSystem: await fileSystemService.hasDirectoryAccess(),
      azure: azureSyncService.isEnabled(),
      lastSync: state.lastSync,
    };
  }

  async requestFileSystemAccess(): Promise<boolean> {
    const success = await fileSystemService.requestDirectory();
    if (success) {
      // Sync current data to file system
      const services = ServiceStorage.getServices();
      const media = ServiceStorage.getMedia();
      await fileSystemService.saveServices(services);
      await fileSystemService.saveMedia(media);
    }
    return success;
  }

  configureAzure(functionUrl: string, enabled: boolean): void {
    azureSyncService.configure({ functionUrl, enabled });
    
    if (enabled && navigator.onLine) {
      this.syncToAzure();
    }
  }
}

export const storageOrchestrator = new StorageOrchestrator();
