/**
 * Turn an HTTP error response into a short, human-readable message.
 * Handles OpenAI-style JSON errors, our own `{ error }` JSON, and HTML error
 * pages (e.g. "405 Not Allowed" from a static host) without dumping markup.
 */
export async function readErrorResponse(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  return describeErrorBody(text, response.status, response.statusText);
}

export function describeErrorBody(body: string, status?: number, statusText?: string): string {
  const fallback = status ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}` : 'Unknown error';
  const trimmed = body.trim();
  if (!trimmed) return fallback;

  try {
    const json = JSON.parse(trimmed);
    const message = typeof json.error === 'string' ? json.error : json.error?.message ?? json.message;
    if (typeof message === 'string' && message) return message;
  } catch {
    // Not JSON
  }

  if (trimmed.startsWith('<')) {
    const title = trimmed.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
    return title || fallback;
  }

  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
}
