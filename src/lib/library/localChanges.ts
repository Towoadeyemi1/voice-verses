import { LibraryKind } from './files';

/**
 * Bookkeeping that lets the library folder sync see local edits:
 * a change signal after every save/delete, and deletion markers so a deleted
 * item is removed on other computers instead of being copied back.
 */

const TOMBSTONES_KEY = 'library-tombstones';
type Tombstones = Record<LibraryKind, Record<string, string>>;

function readTombstones(): Tombstones {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOMBSTONES_KEY) || '{}');
    return { services: parsed.services ?? {}, media: parsed.media ?? {} };
  } catch {
    return { services: {}, media: {} };
  }
}

function writeTombstones(tombstones: Tombstones): void {
  localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombstones));
}

export function getDeletions(kind: LibraryKind): Record<string, string> {
  return readTombstones()[kind];
}

export function setDeletion(kind: LibraryKind, id: string, deletedAt: string | null): void {
  const tombstones = readTombstones();
  if (deletedAt) {
    tombstones[kind][id] = deletedAt;
  } else {
    delete tombstones[kind][id];
  }
  writeTombstones(tombstones);
}

const listeners = new Set<() => void>();

export function onLocalChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyLocalChange(): void {
  listeners.forEach((listener) => listener());
}
