/**
 * Resolve the server endpoint that mints OpenAI Realtime ephemeral tokens.
 *
 * Static hosts (GitHub Pages, Electron, local dev) have no /api backend, so
 * POSTing there returns 405. In that case this returns null and callers fall
 * back to the user's own OpenAI API key.
 */
export function getRealtimeTokenUrl(): string | null {
  const configured = import.meta.env.VITE_REALTIME_TOKEN_URL;
  if (configured) return configured;

  // Azure Static Web Apps serves azure-functions under /api
  if (window.location.hostname.endsWith('azurestaticapps.net')) {
    return `${window.location.origin}/api/realtime-token`;
  }

  return null;
}
