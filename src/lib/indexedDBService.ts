import { Service, MediaItem } from '@/types/service';
import { BibleVerse } from '@/types/bible';

const DB_NAME = 'cornerstone-bible-db';
const DB_VERSION = 1;

export interface AppState {
  services: Service[];
  media: MediaItem[];
  settings: Record<string, any>;
  lastSync: Date;
  currentService?: Service;
  lastVerse?: BibleVerse;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('services')) {
          db.createObjectStore('services', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state');
        }
      };
    });
  }

  async saveServices(services: Service[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('services', 'readwrite');
    const store = tx.objectStore('services');
    
    // Clear existing and save new
    await store.clear();
    for (const service of services) {
      await store.put(service);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getServices(): Promise<Service[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('services', 'readonly');
    const store = tx.objectStore('services');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const services = request.result.map((s: any) => ({
          ...s,
          date: new Date(s.date),
        }));
        resolve(services);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveMedia(media: MediaItem[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('media', 'readwrite');
    const store = tx.objectStore('media');
    
    await store.clear();
    for (const item of media) {
      await store.put(item);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMedia(): Promise<MediaItem[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('media', 'readonly');
    const store = tx.objectStore('media');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const items = request.result.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    
    await store.put(settings, 'app-settings');
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSettings(): Promise<Record<string, any>> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('app-settings');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || {});
      request.onerror = () => reject(request.error);
    });
  }

  async saveAppState(state: Partial<AppState>): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('state', 'readwrite');
    const store = tx.objectStore('state');
    
    const currentState = await this.getAppState();
    const newState = { ...currentState, ...state, lastSync: new Date() };
    await store.put(newState, 'app-state');
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAppState(): Promise<AppState> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('state', 'readonly');
    const store = tx.objectStore('state');
    const request = store.get('app-state');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const state = request.result || {
          services: [],
          media: [],
          settings: {},
          lastSync: new Date(),
        };
        resolve({
          ...state,
          lastSync: new Date(state.lastSync),
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    const storeNames = ['services', 'media', 'settings', 'state'];
    
    for (const storeName of storeNames) {
      const tx = this.db!.transaction(storeName, 'readwrite');
      await tx.objectStore(storeName).clear();
    }
  }
}

export const indexedDBService = new IndexedDBService();
