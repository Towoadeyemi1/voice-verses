import { desktop } from '@/lib/desktop';
import { LibraryKind } from './files';
import { FolderAccess } from './syncEngine';

/**
 * Where the library folder lives:
 * - desktop: a real folder, read and written by the Electron main process;
 * - browser: a folder granted through the File System Access API (Chrome/Edge),
 *   which needs the user to re-approve access after the browser restarts.
 */

export interface FolderStatus {
  backend: 'desktop' | 'browser' | 'unsupported';
  /** Full path (desktop) or folder name (browser); null when none is chosen */
  location: string | null;
  /** Browser only: a folder is chosen but access must be re-approved with a click */
  needsPermission: boolean;
}

export interface LibraryFolder extends FolderAccess {
  status(): Promise<FolderStatus>;
  /** Ask the user to pick a folder. Must run from a click. */
  choose(): Promise<FolderStatus>;
  /** Browser only: re-approve access to the chosen folder. Must run from a click. */
  reconnect(): Promise<boolean>;
  forget(): Promise<void>;
  onChange?(callback: () => void): () => void;
}

const LIBRARY_DIR_NAME = 'Voice Verses Library';

function desktopFolder(): LibraryFolder {
  const lib = desktop!.library;
  const status = async (): Promise<FolderStatus> => ({
    backend: 'desktop',
    location: await lib.getFolder(),
    needsPermission: false,
  });
  return {
    status,
    choose: async () => {
      await lib.chooseFolder();
      return status();
    },
    reconnect: async () => true,
    forget: () => lib.forgetFolder(),
    list: (dir) => lib.list(dir),
    read: (path) => lib.read(path),
    write: (path, text) => lib.write(path, text),
    onChange: (callback) => lib.onChange(callback),
  };
}

// File System Access API pieces not yet in TypeScript's DOM types
interface PermissionedHandle extends FileSystemDirectoryHandle {
  queryPermission(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
  values(): AsyncIterable<FileSystemHandle>;
}
type DirectoryPicker = (options: { mode: 'readwrite'; startIn?: string }) => Promise<PermissionedHandle>;

const HANDLE_DB = 'voice-verses-library';
const HANDLE_STORE = 'handles';
const HANDLE_KEY = 'folder';

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(HANDLE_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function handleStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const request = run(db.transaction(HANDLE_STORE, mode).objectStore(HANDLE_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function browserFolder(): LibraryFolder {
  let root: PermissionedHandle | null | undefined;

  const loadRoot = async () => {
    if (root === undefined) {
      root = (await handleStore('readonly', (s) => s.get(HANDLE_KEY)).catch(() => null)) ?? null;
    }
    return root;
  };

  const granted = async () => {
    const handle = await loadRoot();
    return !!handle && (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
  };

  const status = async (): Promise<FolderStatus> => {
    const handle = await loadRoot();
    return {
      backend: 'browser',
      location: handle?.name ?? null,
      needsPermission: !!handle && !(await granted()),
    };
  };

  const dir = async (kind: LibraryKind) => {
    if (!(await granted())) throw new Error('Access to the library folder needs to be approved again');
    return root!.getDirectoryHandle(kind, { create: true });
  };

  return {
    status,
    choose: async () => {
      const picker = (window as unknown as { showDirectoryPicker: DirectoryPicker }).showDirectoryPicker;
      const picked = await picker({ mode: 'readwrite', startIn: 'documents' });
      root =
        picked.name === LIBRARY_DIR_NAME
          ? picked
          : ((await picked.getDirectoryHandle(LIBRARY_DIR_NAME, { create: true })) as PermissionedHandle);
      await handleStore('readwrite', (s) => s.put(root, HANDLE_KEY));
      return status();
    },
    reconnect: async () => {
      const handle = await loadRoot();
      return !!handle && (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
    },
    forget: async () => {
      root = null;
      await handleStore('readwrite', (s) => s.delete(HANDLE_KEY));
    },
    list: async (kind) => {
      const names: string[] = [];
      for await (const entry of (await dir(kind) as PermissionedHandle).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) names.push(entry.name);
      }
      return names;
    },
    read: async (path) => {
      const [kind, name] = path.split('/') as [LibraryKind, string];
      try {
        const file = await (await (await dir(kind)).getFileHandle(name)).getFile();
        return await file.text();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') return null;
        throw error;
      }
    },
    write: async (path, text) => {
      const [kind, name] = path.split('/') as [LibraryKind, string];
      const writable = await (await (await dir(kind)).getFileHandle(name, { create: true })).createWritable();
      await writable.write(text);
      await writable.close();
    },
  };
}

function unsupportedFolder(): LibraryFolder {
  const status = async (): Promise<FolderStatus> => ({ backend: 'unsupported', location: null, needsPermission: false });
  const unavailable = async (): Promise<never> => {
    throw new Error('This browser cannot save to a folder. Use Chrome or Edge, or the desktop app.');
  };
  return {
    status,
    choose: unavailable,
    reconnect: async () => false,
    forget: async () => {},
    list: unavailable,
    read: unavailable,
    write: unavailable,
  };
}

export const libraryFolder: LibraryFolder = desktop
  ? desktopFolder()
  : typeof window !== 'undefined' && 'showDirectoryPicker' in window
    ? browserFolder()
    : unsupportedFolder();
