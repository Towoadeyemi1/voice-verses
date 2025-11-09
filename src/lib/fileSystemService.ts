import { Service, MediaItem } from '@/types/service';

// Extend types for File System Access API
interface ExtendedFileSystemDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission?: (descriptor: { mode: string }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: string }) => Promise<PermissionState>;
}

export interface FileSystemConfig {
  directoryHandle?: FileSystemDirectoryHandle;
  autoSync: boolean;
}

class FileSystemService {
  private directoryHandle: ExtendedFileSystemDirectoryHandle | null = null;
  private autoSync: boolean = true;

  async requestDirectory(): Promise<boolean> {
    try {
      // Request directory access from user
      this.directoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      }) as ExtendedFileSystemDirectoryHandle;
      
      // Save handle permission
      await this.saveDirectoryHandle();
      return true;
    } catch (error) {
      console.error('Failed to request directory:', error);
      return false;
    }
  }

  async hasDirectoryAccess(): Promise<boolean> {
    if (!this.directoryHandle) {
      await this.loadDirectoryHandle();
    }
    
    if (!this.directoryHandle) return false;

    // Check if we still have permission (if API supports it)
    if (this.directoryHandle.queryPermission) {
      try {
        const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' });
        return permission === 'granted';
      } catch {
        // If query fails, assume we have access
        return true;
      }
    }
    
    return true;
  }

  private async saveDirectoryHandle(): Promise<void> {
    if (!this.directoryHandle) return;
    
    // Store the handle in IndexedDB for persistence
    const db = await this.openConfigDB();
    const tx = db.transaction('config', 'readwrite');
    await tx.objectStore('config').put(this.directoryHandle, 'directory-handle');
  }

  private async loadDirectoryHandle(): Promise<void> {
    try {
      const db = await this.openConfigDB();
      const tx = db.transaction('config', 'readonly');
      
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('config').get('directory-handle');
        
        request.onsuccess = async () => {
          const handle = request.result as ExtendedFileSystemDirectoryHandle;
          
          if (handle) {
            this.directoryHandle = handle;
            // Verify permission if API supports it
            if (this.directoryHandle.queryPermission) {
              try {
                const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' });
                if (permission !== 'granted' && this.directoryHandle.requestPermission) {
                  const requestedPermission = await this.directoryHandle.requestPermission({ mode: 'readwrite' });
                  if (requestedPermission !== 'granted') {
                    this.directoryHandle = null;
                  }
                }
              } catch {
                // Permission check failed, clear handle
                this.directoryHandle = null;
              }
            }
          }
          resolve();
        };
        
        request.onerror = () => {
          console.error('Failed to load directory handle:', request.error);
          this.directoryHandle = null;
          resolve();
        };
      });
    } catch (error) {
      console.error('Failed to load directory handle:', error);
      this.directoryHandle = null;
    }
  }

  private async openConfigDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('cornerstone-fs-config', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config');
        }
      };
    });
  }

  async saveToFile(filename: string, data: any): Promise<boolean> {
    if (!this.directoryHandle) {
      const hasAccess = await this.hasDirectoryAccess();
      if (!hasAccess) return false;
    }

    try {
      // Create/get the cornerstone subfolder
      const cornerstoneDir = await this.directoryHandle!.getDirectoryHandle('cornerstone-bible', { create: true });
      
      // Create/get the file
      const fileHandle = await cornerstoneDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  }

  async readFromFile(filename: string): Promise<any | null> {
    if (!this.directoryHandle) {
      const hasAccess = await this.hasDirectoryAccess();
      if (!hasAccess) return null;
    }

    try {
      const cornerstoneDir = await this.directoryHandle!.getDirectoryHandle('cornerstone-bible', { create: false });
      const fileHandle = await cornerstoneDir.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const text = await file.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to read file:', error);
      return null;
    }
  }

  async saveServices(services: Service[]): Promise<boolean> {
    return this.saveToFile('services.json', services);
  }

  async loadServices(): Promise<Service[] | null> {
    const data = await this.readFromFile('services.json');
    if (!data) return null;
    
    return data.map((s: any) => ({
      ...s,
      date: new Date(s.date),
    }));
  }

  async saveMedia(media: MediaItem[]): Promise<boolean> {
    return this.saveToFile('media.json', media);
  }

  async loadMedia(): Promise<MediaItem[] | null> {
    const data = await this.readFromFile('media.json');
    if (!data) return null;
    
    return data.map((m: any) => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }));
  }

  async saveAppState(state: any): Promise<boolean> {
    return this.saveToFile('app-state.json', state);
  }

  async loadAppState(): Promise<any | null> {
    return this.readFromFile('app-state.json');
  }

  setAutoSync(enabled: boolean): void {
    this.autoSync = enabled;
  }

  isAutoSyncEnabled(): boolean {
    return this.autoSync;
  }
}

export const fileSystemService = new FileSystemService();
