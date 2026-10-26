import { MediaItem, Service } from '@/types/service';

/**
 * On-disk format of the library folder: one JSON file per item, so that cloud
 * drives sync (and conflict) item by item rather than one big file.
 *
 *   services/<id>.json   media/<id>.json
 *
 * A deleted item keeps its file with `deleted: true`, so the deletion reaches
 * other computers instead of the item being restored from their copy.
 */

export type LibraryKind = 'services' | 'media';

export interface LibraryRecord<T> {
  id: string;
  updatedAt: string;
  deleted?: boolean;
  data?: T;
}

interface LibraryFile<T> {
  app: 'voice-verses';
  kind: LibraryKind;
  version: 1;
  id: string;
  updatedAt: string;
  deleted?: true;
  data?: T;
}

/** Item ids become file names, so keep only characters every file system accepts. */
export function fileNameForId(id: string): string {
  return `${id.replace(/[^A-Za-z0-9._-]/g, '_')}.json`;
}

export function serializeRecord<T>(kind: LibraryKind, record: LibraryRecord<T>): string {
  const file: LibraryFile<T> = {
    app: 'voice-verses',
    kind,
    version: 1,
    id: record.id,
    updatedAt: record.updatedAt,
    ...(record.deleted ? { deleted: true as const } : { data: record.data }),
  };
  return JSON.stringify(file, null, 2);
}

/** Returns null for files that aren't ours or can't be read (e.g. half-synced). */
export function parseRecord<T>(kind: LibraryKind, text: string): LibraryRecord<T> | null {
  try {
    const file = JSON.parse(text) as Partial<LibraryFile<T>>;
    if (file.app !== 'voice-verses' || file.kind !== kind || typeof file.id !== 'string') return null;
    if (!file.deleted && !file.data) return null;
    return {
      id: file.id,
      updatedAt: typeof file.updatedAt === 'string' ? file.updatedAt : '',
      deleted: file.deleted || undefined,
      data: file.deleted ? undefined : reviveDates(kind, file.data as T),
    };
  } catch {
    return null;
  }
}

function reviveDates<T>(kind: LibraryKind, data: T): T {
  if (kind === 'services') {
    const service = data as unknown as Service;
    return { ...service, date: new Date(service.date) } as unknown as T;
  }
  const item = data as unknown as MediaItem;
  return { ...item, createdAt: new Date(item.createdAt) } as unknown as T;
}

/** Standalone export of a single service, for sharing by email or USB stick. */
export const SERVICE_EXPORT_EXTENSION = '.voiceverses.json';

export function exportService(service: Service): string {
  return serializeRecord('services', {
    id: service.id,
    updatedAt: service.updatedAt ?? new Date().toISOString(),
    data: service,
  });
}

export function importService(text: string): Service {
  const record = parseRecord<Service>('services', text);
  if (!record?.data) {
    throw new Error('This file is not a Voice Verses service export.');
  }
  return record.data;
}
