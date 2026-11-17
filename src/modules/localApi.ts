/**
 * The local API's side in the operator's window (1.19.5, D33). The server is in the desktop
 * app's main process (electron/api.js); this module
 *  - passes every bus event to it (never practice events: the bus holds them back),
 *  - tells it which modules are here,
 *  - answers its commands through src/core/commands.ts,
 *  - answers "services.list" itself, from the saved services,
 *  - turns it on at start when Settings → Other apps and devices was left on.
 */
import { desktop } from '@/lib/desktop';
import { subscribe } from '@/core/bus';
import { answer, ask } from '@/core/commands';
import { listModules } from '@/core/registry';
import { ServiceStorage } from '@/lib/serviceStorage';
import { loadNetworkSettings } from '@/lib/networkPublisher';
import type { Service } from '@/types/service';

const SETTINGS_KEY = 'voice-verses-api';

export interface ApiSettings {
  enabled: boolean;
}

export function loadApiSettings(): ApiSettings {
  try {
    return { enabled: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return { enabled: false };
  }
}

/** Turns the API on or off (remembered), on the network screens' port. */
export async function configureApi(enabled: boolean) {
  if (!desktop?.api) throw new Error('Other apps and devices need the desktop app.');
  const status = await desktop.api.configure({ enabled, port: loadNetworkSettings().port });
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled }));
  return status;
}

const day = (d: unknown) => {
  const t = new Date(d as string);
  return Number.isNaN(t.getTime()) ? '' : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/** A service as other apps see it: its order, never its pictures. */
export function serviceSummary(s: Service) {
  return {
    id: s.id,
    name: s.name,
    date: day(s.date),
    type: s.type ?? null,
    parts: s.sections.map((sec) => ({ name: sec.name, items: sec.subsections.map((it) => ({ id: it.id, name: it.name, slides: it.slides.length })) })),
  };
}

let started = false;

export function startLocalApiModule(): void {
  if (started || !desktop?.api) return;
  started = true;
  const api = desktop.api;
  subscribe(
    '*',
    (event) => {
      try {
        api.event(event);
      } catch {
        // An event that can't be passed on is skipped
      }
    },
    { fromOtherWindows: false },
  );
  const tell = () => api.setModules(listModules());
  tell();
  subscribe('module.registered', tell, { fromOtherWindows: false });

  answer('services.list', async (body) => {
    const date = typeof body.date === 'string' ? body.date : null;
    const services = (await ServiceStorage.getServices()).filter((s) => !s.isTemplate && (!date || day(s.date) === date));
    return { services: services.map(serviceSummary) };
  });

  api.onCommand(async ({ id, command, body }) => {
    const result = await ask(command, body ?? {});
    void api.reply(id, result);
  });

  if (loadApiSettings().enabled) configureApi(true).catch(() => {});
}
