import { Context, HttpRequest } from "@azure/functions";

/**
 * Shared request guard for the public HTTP functions (OpenAI and blob storage).
 *
 * - CORS: only origins listed in ALLOWED_ORIGINS (comma-separated, e.g.
 *   "https://towoadeyemi1.github.io") get CORS headers. Unset = same-origin only
 *   (Azure Static Web Apps serving the app and /api together).
 * - Rate limit: RATE_LIMIT_PER_HOUR requests per client IP (default 60).
 *   In-memory per instance, so it is a speed bump against abuse, not a quota.
 *
 * Origin checks stop other websites from using the endpoint from a browser,
 * but not scripts that forge headers; the rate limit bounds that cost.
 */

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(o => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const limitPerHour = Number(process.env.RATE_LIMIT_PER_HOUR) || 60;
const hits = new Map<string, number[]>();

function clientIp(req: HttpRequest): string {
  const forwarded = req.headers["x-forwarded-for"] || req.headers["x-azure-clientip"] || "";
  // x-forwarded-for may be "ip:port, proxy"; the first entry is the client
  return forwarded.split(",")[0].trim().replace(/:\d+$/, "") || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limitPerHour;
}

export function json(context: Context, status: number, body: unknown, headers: Record<string, string> = {}): void {
  context.res = { status, body, headers: { ...headers, "Content-Type": "application/json" } };
}

/**
 * Applies CORS and abuse checks. Returns the CORS headers to send with the
 * response, or null when the request has already been answered.
 */
export function guardRequest(context: Context, req: HttpRequest, methods = "POST"): Record<string, string> | null {
  const origin = (req.headers["origin"] || "").replace(/\/$/, "");
  const originAllowed = !origin || allowedOrigins.includes(origin);

  const cors: Record<string, string> = originAllowed && origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": `${methods}, OPTIONS`,
        "Vary": "Origin",
      }
    : {};

  if (req.method === "OPTIONS") {
    context.res = { status: originAllowed ? 204 : 403, headers: cors };
    return null;
  }

  if (!originAllowed) {
    json(context, 403, { error: "Origin not allowed" });
    return null;
  }

  if (rateLimited(clientIp(req))) {
    json(context, 429, { error: "Too many requests. Please wait and try again." }, cors);
    return null;
  }

  return cors;
}
