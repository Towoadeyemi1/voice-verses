/**
 * The module registry (1.19.4, D33): each module tells it what it is, what it answers, the
 * events it sends and the events it listens for. The app (and, from step 2.2, other software
 * through the local API) can ask what is there. A package added later registers the same way.
 */
import { publish } from './bus';
import type { EventName } from './events';

export interface ModuleManifest {
  /** Stable id, e.g. "propresenter" */
  id: string;
  name: string;
  /** The module's own contract version (what it answers and sends), not the app's */
  version: string;
  description: string;
  /** Commands and questions it answers (from step 2.2, through the local API) */
  answers: string[];
  emits: EventName[];
  listens: (EventName | `${string}.*` | '*')[];
}

const modules = new Map<string, ModuleManifest>();

export function registerModule(manifest: ModuleManifest): void {
  const known = modules.get(manifest.id);
  modules.set(manifest.id, manifest);
  if (!known || known.version !== manifest.version) publish('module.registered', { id: manifest.id, name: manifest.name, version: manifest.version }, 'registry');
}

export const listModules = (): ModuleManifest[] => [...modules.values()];
export const getModule = (id: string) => modules.get(id);
