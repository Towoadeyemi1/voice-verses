/**
 * Absolute URL for an in-app route, for opening display windows.
 *
 * The app uses hash routing so it works from a sub-path (GitHub Pages serves
 * it at /voice-verses/) and from file:// in the desktop app, where a plain
 * "/projection" would point outside the app.
 */
export function appUrl(route: string): string {
  const base = window.location.href.split('#')[0];
  return `${base}#${route.startsWith('/') ? route : `/${route}`}`;
}

/** Routes shown on congregation-facing screens: no operator UI, sync or notices there. */
const DISPLAY_ROUTES = /^\/(projection|lower-third|confidence)\b/;

export function isDisplayRoute(path: string): boolean {
  return DISPLAY_ROUTES.test(path);
}

/** Whether this window was opened as a display output (checked once, at start-up). */
export const isDisplayWindow = (): boolean => isDisplayRoute(window.location.hash.replace(/^#/, ''));
