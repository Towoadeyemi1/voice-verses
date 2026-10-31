import { useEffect, useState } from 'react';

/**
 * True while the mouse has moved recently. Output windows use it to show their
 * settings button and cursor only when someone is at the computer, never to
 * the congregation or the livestream.
 */
export function usePointerActive(timeoutMs = 2500): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onActivity = () => {
      setActive(true);
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), timeoutMs);
    };
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('mousedown', onActivity);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('mousedown', onActivity);
    };
  }, [timeoutMs]);

  return active;
}

/** Double-click anywhere in an output window to make it fill its screen (and again to restore it). */
export function useDoubleClickFullscreen(): void {
  useEffect(() => {
    const toggle = (event: MouseEvent) => {
      // Not when double-clicking in the settings panel
      if ((event.target as HTMLElement).closest('input, button, [role="dialog"], .settings-panel')) return;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
    };
    window.addEventListener('dblclick', toggle);
    return () => window.removeEventListener('dblclick', toggle);
  }, []);
}
