import { LibraryKind, LibraryRecord, fileNameForId, parseRecord, serializeRecord } from './files';

/**
 * Two-way merge between this computer's library and the library folder.
 *
 * Each item carries `updatedAt` (set on every local edit). For each item id:
 * - only one side has it, or one side is newer: copy the newer side across;
 * - both sides changed since the last sync: the newer one wins, and for
 *   services the other version is kept as a "conflict copy" so no work is lost.
 *
 * Kept free of browser and Electron APIs so it can be tested on its own.
 */

export interface FolderAccess {
  list(dir: LibraryKind): Promise<string[]>;
  read(path: string): Promise<string | null>;
  write(path: string, text: string): Promise<void>;
}

export interface LocalAccess<T extends { id: string; updatedAt?: string }> {
  /** Live items plus deletion markers (tombstones) */
  records(): Promise<LibraryRecord<T>[]>;
  /** Apply a remote change without marking it as a new local edit */
  applyRemote(record: LibraryRecord<T>): Promise<void>;
  /** Save a copy of a losing version as a new item (services only) */
  saveConflictCopy?(item: T): Promise<void>;
}

/** Last version both sides agreed on, per "kind/id" */
export type SyncState = Record<string, string>;

export interface SyncResult {
  pulled: number;
  pushed: number;
  conflicts: number;
}

const version = (record: LibraryRecord<unknown> | undefined) =>
  record ? record.updatedAt || '0' : null;

export async function syncKind<T extends { id: string; updatedAt?: string }>(
  kind: LibraryKind,
  folder: FolderAccess,
  local: LocalAccess<T>,
  state: SyncState,
): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, conflicts: 0 };

  const localRecords = new Map((await local.records()).map((r) => [r.id, r]));
  const remoteRecords = new Map<string, LibraryRecord<T>>();
  for (const name of await folder.list(kind)) {
    const text = await folder.read(`${kind}/${name}`);
    const record = text ? parseRecord<T>(kind, text) : null;
    if (record) remoteRecords.set(record.id, record);
  }

  for (const id of new Set([...localRecords.keys(), ...remoteRecords.keys()])) {
    const localRecord = localRecords.get(id);
    const remoteRecord = remoteRecords.get(id);
    const localVersion = version(localRecord);
    const remoteVersion = version(remoteRecord);
    const stateKey = `${kind}/${id}`;
    const synced = state[stateKey];

    if (localVersion === remoteVersion) {
      state[stateKey] = localVersion!;
      continue;
    }

    const remoteWins = localVersion === null || (remoteVersion !== null && remoteVersion > localVersion);
    const winner = remoteWins ? remoteRecord! : localRecord!;
    const loser = remoteWins ? localRecord : remoteRecord;

    // Both sides edited since the last sync: keep the losing edit as a copy
    const bothEdited =
      loser && !loser.deleted && !winner.deleted && localVersion !== synced && remoteVersion !== synced;
    if (bothEdited && loser.data && local.saveConflictCopy) {
      await local.saveConflictCopy(loser.data);
      result.conflicts++;
    }

    if (remoteWins) {
      await local.applyRemote(winner);
      result.pulled++;
    } else {
      await folder.write(`${kind}/${fileNameForId(id)}`, serializeRecord(kind, winner));
      result.pushed++;
    }
    state[stateKey] = version(winner)!;
  }

  return result;
}
