import { MediaItem, Service } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { LibraryKind, LibraryRecord } from './files';
import { FolderStatus, libraryFolder } from './folder';
import { getDeletions, onLocalChange, setDeletion } from './localChanges';
import { LocalAccess, SyncResult, SyncState, syncKind } from './syncEngine';

/**
 * Keeps this computer's services and media in step with the library folder.
 * Syncs at start-up, shortly after each local edit, when the window regains
 * focus, when the folder changes on disk (desktop), and every minute.
 */

export type SyncPhase = 'off' | 'needs-permission' | 'syncing' | 'ok' | 'error';

export interface LibrarySyncStatus extends FolderStatus {
  phase: SyncPhase;
  lastSync: Date | null;
  message?: string;
}

/** Fired on window after the folder brought in changes, so lists can reload. */
export const LIBRARY_UPDATED_EVENT = 'library-updated';

const STATE_KEY = 'library-sync-state';
const SYNC_INTERVAL_MS = 60_000;
const LOCAL_CHANGE_DELAY_MS = 1_500;

function loadState(): SyncState {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function localAccess<T extends { id: string; updatedAt?: string }>(
  kind: LibraryKind,
  getItems: () => Promise<T[]>,
  save: (item: T) => Promise<void>,
  remove: (id: string) => Promise<void>,
  saveConflictCopy?: (item: T) => Promise<void>,
): LocalAccess<T> {
  return {
    records: async () => {
      const items = await getItems();
      const live = new Set(items.map((item) => item.id));
      const deletions = Object.entries(getDeletions(kind))
        .filter(([id]) => !live.has(id))
        .map(([id, deletedAt]): LibraryRecord<T> => ({ id, updatedAt: deletedAt, deleted: true }));
      return [...items.map((item): LibraryRecord<T> => ({ id: item.id, updatedAt: item.updatedAt ?? '', data: item })), ...deletions];
    },
    applyRemote: async (record) => {
      if (record.deleted) {
        await remove(record.id);
        setDeletion(kind, record.id, record.updatedAt);
      } else {
        await save({ ...record.data!, updatedAt: record.updatedAt });
        setDeletion(kind, record.id, null);
      }
    },
    saveConflictCopy,
  };
}

const servicesAccess = localAccess<Service>(
  'services',
  () => ServiceStorage.getServices(),
  (service) => ServiceStorage.saveService(service, { fromSync: true }),
  (id) => ServiceStorage.deleteService(id, { fromSync: true }),
  (service) =>
    ServiceStorage.saveService({
      ...service,
      id: `${service.id}-conflict-${Date.now()}`,
      name: `${service.name} (conflict copy)`,
    }),
);

const mediaAccess = localAccess<MediaItem>(
  'media',
  () => ServiceStorage.getMedia(),
  (item) => ServiceStorage.saveMediaItem(item, { fromSync: true }),
  (id) => ServiceStorage.deleteMediaItem(id, { fromSync: true }),
);

class LibrarySync {
  private status: LibrarySyncStatus = {
    backend: 'unsupported',
    location: null,
    needsPermission: false,
    phase: 'off',
    lastSync: null,
  };
  private listeners = new Set<(status: LibrarySyncStatus) => void>();
  private running: Promise<SyncResult | null> | null = null;
  private rerun = false;
  private started = false;
  private changeTimer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    if (this.started) return;
    this.started = true;

    onLocalChange(() => {
      if (this.changeTimer) clearTimeout(this.changeTimer);
      this.changeTimer = setTimeout(() => this.syncNow(), LOCAL_CHANGE_DELAY_MS);
    });
    window.addEventListener('focus', () => this.syncNow());
    setInterval(() => this.syncNow(), SYNC_INTERVAL_MS);
    libraryFolder.onChange?.(() => this.syncNow());

    this.syncNow();
  }

  getStatus(): LibrarySyncStatus {
    return this.status;
  }

  subscribe(listener: (status: LibrarySyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private update(changes: Partial<LibrarySyncStatus>): void {
    this.status = { ...this.status, ...changes };
    this.listeners.forEach((listener) => listener(this.status));
  }

  /** Pick a (new) folder. Must run from a click. */
  async chooseFolder(): Promise<void> {
    const folder = await libraryFolder.choose();
    // A different folder has a different history
    localStorage.removeItem(STATE_KEY);
    this.update(folder);
    await this.syncNow();
  }

  /** Browser: re-approve folder access after a restart. Must run from a click. */
  async reconnect(): Promise<void> {
    await libraryFolder.reconnect();
    await this.syncNow();
  }

  async forgetFolder(): Promise<void> {
    await libraryFolder.forget();
    localStorage.removeItem(STATE_KEY);
    this.update({ ...(await libraryFolder.status()), phase: 'off', lastSync: null, message: undefined });
  }

  /** Runs a sync now, or once more after the one in progress. */
  syncNow(): Promise<SyncResult | null> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.rerun) {
        this.rerun = false;
        this.syncNow();
      }
    });
    return this.running;
  }

  private async run(): Promise<SyncResult | null> {
    const folder = await libraryFolder.status();
    if (!folder.location) {
      this.update({ ...folder, phase: 'off' });
      return null;
    }
    if (folder.needsPermission) {
      this.update({ ...folder, phase: 'needs-permission' });
      return null;
    }

    this.update({ ...folder, phase: 'syncing' });
    try {
      const state = loadState();
      const services = await syncKind('services', libraryFolder, servicesAccess, state);
      const media = await syncKind('media', libraryFolder, mediaAccess, state);
      localStorage.setItem(STATE_KEY, JSON.stringify(state));

      const result: SyncResult = {
        pulled: services.pulled + media.pulled,
        pushed: services.pushed + media.pushed,
        conflicts: services.conflicts + media.conflicts,
      };
      if (result.pulled > 0) window.dispatchEvent(new CustomEvent(LIBRARY_UPDATED_EVENT));
      this.update({
        phase: 'ok',
        lastSync: new Date(),
        message: result.conflicts
          ? `${result.conflicts} service(s) were edited on two computers at once; the other version was kept as a "conflict copy".`
          : undefined,
      });
      return result;
    } catch (error) {
      console.error('Library sync failed:', error);
      this.update({ phase: 'error', message: error instanceof Error ? error.message : 'Sync failed' });
      return null;
    }
  }
}

export const librarySync = new LibrarySync();
