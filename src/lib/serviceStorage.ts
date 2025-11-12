import { Service, MediaItem } from '@/types/service';
import { indexedDBService } from './indexedDBService';

const SERVICES_KEY = 'cornerstone-services';
const MEDIA_KEY = 'cornerstone-media';

export class ServiceStorage {
  static async getServices(): Promise<Service[]> {
    try {
      // Try IndexedDB first
      const services = await indexedDBService.getServices();
      if (services.length > 0) {
        return services.map((s: any) => {
          // Migrate old structure to new section-based structure
          if (s.slides && !s.sections) {
            return {
              ...s,
              date: new Date(s.date),
              sections: [{
                id: 'legacy',
                name: 'Service',
                subsections: [{
                  id: 'legacy-main',
                  name: 'Main',
                  slides: s.slides,
                }],
              }],
            };
          }
          return {
            ...s,
            date: new Date(s.date),
          };
        });
      }
      
      // Fallback to localStorage for migration
      const data = localStorage.getItem(SERVICES_KEY);
      if (!data) return [];
      const localServices = JSON.parse(data);
      const migratedServices = localServices.map((s: any) => {
        if (s.slides && !s.sections) {
          return {
            ...s,
            date: new Date(s.date),
            sections: [{
              id: 'legacy',
              name: 'Service',
              subsections: [{
                id: 'legacy-main',
                name: 'Main',
                slides: s.slides,
              }],
            }],
          };
        }
        return {
          ...s,
          date: new Date(s.date),
        };
      });
      
      // Migrate to IndexedDB
      if (migratedServices.length > 0) {
        await indexedDBService.saveServices(migratedServices);
        localStorage.removeItem(SERVICES_KEY); // Clear old data
      }
      
      return migratedServices;
    } catch (error) {
      console.error('Error getting services:', error);
      return [];
    }
  }

  static async saveService(service: Service): Promise<void> {
    try {
      const services = await this.getServices();
      const index = services.findIndex(s => s.id === service.id);
      if (index >= 0) {
        services[index] = service;
      } else {
        services.push(service);
      }
      await indexedDBService.saveServices(services);
    } catch (error) {
      console.error('Error saving service:', error);
      throw error;
    }
  }

  static async deleteService(id: string): Promise<void> {
    try {
      const services = await this.getServices();
      const filtered = services.filter(s => s.id !== id);
      await indexedDBService.saveServices(filtered);
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  }

  static async getServicesByDate(date: Date): Promise<Service[]> {
    const services = await this.getServices();
    return services.filter(s => 
      s.date.toDateString() === date.toDateString()
    );
  }

  static async getTemplates(): Promise<Service[]> {
    const services = await this.getServices();
    return services.filter(s => s.isTemplate);
  }

  static async getMedia(): Promise<MediaItem[]> {
    try {
      // Try IndexedDB first
      const items = await indexedDBService.getMedia();
      if (items.length > 0) {
        return items;
      }
      
      // Fallback to localStorage for migration
      const data = localStorage.getItem(MEDIA_KEY);
      if (!data) return [];
      const localItems = JSON.parse(data);
      const migratedItems = localItems.map((m: any) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      }));
      
      // Migrate to IndexedDB
      if (migratedItems.length > 0) {
        await indexedDBService.saveMedia(migratedItems);
        localStorage.removeItem(MEDIA_KEY);
      }
      
      return migratedItems;
    } catch (error) {
      console.error('Error getting media:', error);
      return [];
    }
  }

  static async saveMediaItem(item: MediaItem): Promise<void> {
    try {
      const items = await this.getMedia();
      const index = items.findIndex(m => m.id === item.id);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
      await indexedDBService.saveMedia(items);
    } catch (error) {
      console.error('Error saving media item:', error);
      throw error;
    }
  }

  static async deleteMediaItem(id: string): Promise<void> {
    try {
      const items = await this.getMedia();
      const filtered = items.filter(m => m.id !== id);
      await indexedDBService.saveMedia(filtered);
    } catch (error) {
      console.error('Error deleting media item:', error);
      throw error;
    }
  }

  static async getMediaByType(type: 'image' | 'song'): Promise<MediaItem[]> {
    const media = await this.getMedia();
    return media.filter(m => m.type === type);
  }
}
