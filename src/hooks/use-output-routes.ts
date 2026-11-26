import { useEffect, useState } from 'react';
import { desktop, type ScreenOutput } from '@/lib/desktop';
import { loadNetworkSettings } from '@/lib/networkPublisher';

export interface OutputRoute {
  output: ScreenOutput;
  /** Somewhere is set to show it: a display, a DeckLink port, NDI or the network */
  on: boolean;
  /** Where it goes, in the volunteer's words: "HDMI-SDI", "SDI", "NDI", "Browser" */
  where: string[];
}

export const ROUTE_OUTPUTS: ScreenOutput[] = ['projection', 'lowerThird', 'confidence'];
export const ROUTE_NAMES: Record<ScreenOutput, string> = { projection: 'Projector', lowerThird: 'Stream lower third', confidence: 'Stage monitor' };

const CHECK_MS = 5000;

async function readRoutes(): Promise<OutputRoute[]> {
  const network = loadNetworkSettings().enabled;
  // The web version: every output is a browser window the operator opens
  if (!desktop) return ROUTE_OUTPUTS.map((output) => ({ output, on: true, where: ['Browser window'] }));
  const [displays, screens, sdi, ndi] = await Promise.all([
    desktop.screens.displays().catch(() => []),
    desktop.screens.get().catch(() => null),
    desktop.decklink?.get().catch(() => null) ?? Promise.resolve(null),
    desktop.ndi?.get().catch(() => null) ?? Promise.resolve(null),
  ]);
  return ROUTE_OUTPUTS.map((output) => {
    const where: string[] = [];
    const id = screens?.[output];
    if (id != null) {
      const d = displays.find((x) => x.id === id);
      where.push(d ? (d.primary ? 'This screen' : d.label || 'A screen') : 'Unplugged screen');
    }
    if (sdi?.[output]) where.push('SDI');
    if (ndi?.[output]) where.push('NDI');
    if (network) where.push('Browser');
    return { output, on: where.length > 0, where };
  });
}

/**
 * Where each output goes (for Every screen on the live screen). Checked again every
 * 5 seconds and whenever a setting changes, so a screen plugged in shows up by itself.
 */
export function useOutputRoutes(enabled = true): OutputRoute[] {
  const [routes, setRoutes] = useState<OutputRoute[]>(() => ROUTE_OUTPUTS.map((output) => ({ output, on: output === 'projection', where: [] })));
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const check = () =>
      void readRoutes().then((r) => {
        if (!stopped) setRoutes((was) => (JSON.stringify(was) === JSON.stringify(r) ? was : r));
      });
    check();
    const timer = window.setInterval(check, CHECK_MS);
    window.addEventListener('settings-updated', check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener('settings-updated', check);
    };
  }, [enabled]);
  return routes;
}
