import { desktop, NetworkStatus } from '@/lib/desktop';
import { syncService } from '@/lib/syncService';
import { loadAssignments, loadTemplates, TEMPLATES_CHANGED } from '@/lib/templates';
import { activeTeam, TEAM_CHANGED } from '@/lib/colorTeams';
import { loadShapes, SHAPES_CHANGED } from '@/lib/screenShapes';
import { indexedDBService } from '@/lib/indexedDBService';
import { ServiceStorage } from '@/lib/serviceStorage';
import { BibleParser } from '@/lib/bibleParser';
import type { NetworkSnapshot } from '@/lib/networkView';

/**
 * Operator side of network outputs (desktop app): keeps the built-in server
 * (electron/network.js) supplied with what is on screen, the templates, the
 * logo and the pictures and videos they use.
 */
export interface NetworkSettings {
  enabled: boolean;
  port: number;
}

const SETTINGS_KEY = 'voice-verses-network';
export const DEFAULT_NETWORK_PORT = 47100;

export function loadNetworkSettings(): NetworkSettings {
  try {
    return { enabled: false, port: DEFAULT_NETWORK_PORT, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return { enabled: false, port: DEFAULT_NETWORK_PORT };
  }
}

let running = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const uploaded = new Set<string>();

function snapshot(): NetworkSnapshot {
  return {
    live: syncService.current(),
    countdown: syncService.currentCountdown(),
    templates: loadTemplates(),
    assignments: loadAssignments(),
    logo: localStorage.getItem('global-service-logo') || '',
    bibleVersion: BibleParser.getVersion(),
    colorTeam: activeTeam(),
    shapes: loadShapes(),
  };
}

/** Pictures and videos the screens may need: template backgrounds and the live video. */
function mediaIds(state: NetworkSnapshot): string[] {
  const ids = new Set(state.templates.map((t) => t.background.mediaId).filter(Boolean) as string[]);
  const slide = state.live?.data.slide;
  if (slide?.type === 'video') ids.add(slide.mediaId);
  return [...ids];
}

async function upload(ids: string[]) {
  const missing = ids.filter((id) => !uploaded.has(id));
  if (!missing.length) return;
  const items = await ServiceStorage.getMedia();
  for (const id of missing) {
    if (await desktop!.network.hasMedia(id)) {
      uploaded.add(id);
      continue;
    }
    const item = items.find((m) => m.id === id);
    if (!item) continue;
    const blob = item.type === 'video' ? await indexedDBService.getFile(id) : item.url ? await (await fetch(item.url)).blob() : undefined;
    if (!blob) continue;
    await desktop!.network.putMedia(id, blob.type || item.mimeType || 'application/octet-stream', await blob.arrayBuffer());
    uploaded.add(id);
  }
}

async function publishNow() {
  if (!running || !desktop) return;
  const state = snapshot();
  try {
    await upload(mediaIds(state));
  } catch {
    // The screens still update; a missing picture shows as the background colour
  }
  desktop.network.publish(state);
}

function schedule() {
  if (!running) return;
  clearTimeout(timer);
  timer = setTimeout(publishNow, 60);
}

/** Turns network outputs on or off; remembered for the next start. */
export async function configureNetwork(settings: NetworkSettings): Promise<NetworkStatus> {
  if (!desktop) throw new Error('Network outputs need the desktop app.');
  const status = await desktop.network.configure(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  running = status.running;
  schedule();
  return status;
}

/** Called once by the operator window at start-up. */
export function startNetworkPublisher(): void {
  if (!desktop) return;
  syncService.subscribe(schedule);
  window.addEventListener(TEMPLATES_CHANGED, schedule);
  window.addEventListener(TEAM_CHANGED, schedule);
  window.addEventListener(SHAPES_CHANGED, schedule);
  window.addEventListener('storage', schedule);
  const settings = loadNetworkSettings();
  if (settings.enabled) configureNetwork(settings).catch(() => {});
}
