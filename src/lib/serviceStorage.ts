import { Service, MediaItem } from '@/types/service';

const SERVICES_KEY = 'cornerstone-services';
const MEDIA_KEY = 'cornerstone-media';

export class ServiceStorage {
  static getServices(): Service[] {
    const data = localStorage.getItem(SERVICES_KEY);
    if (!data) return [];
    const services = JSON.parse(data);
    // Convert date strings back to Date objects
    return services.map((s: any) => ({
      ...s,
      date: new Date(s.date),
    }));
  }

  static saveService(service: Service): void {
    const services = this.getServices();
    const index = services.findIndex(s => s.id === service.id);
    if (index >= 0) {
      services[index] = service;
    } else {
      services.push(service);
    }
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  }

  static deleteService(id: string): void {
    const services = this.getServices().filter(s => s.id !== id);
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  }

  static getServicesByDate(date: Date): Service[] {
    return this.getServices().filter(s => 
      s.date.toDateString() === date.toDateString()
    );
  }

  static getTemplates(): Service[] {
    return this.getServices().filter(s => s.isTemplate);
  }

  static getMedia(): MediaItem[] {
    const data = localStorage.getItem(MEDIA_KEY);
    if (!data) return [];
    const items = JSON.parse(data);
    return items.map((m: any) => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }));
  }

  static saveMediaItem(item: MediaItem): void {
    const items = this.getMedia();
    const index = items.findIndex(m => m.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    localStorage.setItem(MEDIA_KEY, JSON.stringify(items));
  }

  static deleteMediaItem(id: string): void {
    const items = this.getMedia().filter(m => m.id !== id);
    localStorage.setItem(MEDIA_KEY, JSON.stringify(items));
  }

  static getMediaByType(type: 'image' | 'song'): MediaItem[] {
    return this.getMedia().filter(m => m.type === type);
  }
}
