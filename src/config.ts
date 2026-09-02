// frontend/src/config.ts
// Normalizes VITE_API_URL into a fully-qualified base URL for API requests.
// Railway injects service domains without a protocol (e.g. "fastapi-production-f3ed3.up.railway.app"),
// so we need to make sure we always end up with an absolute URL like
// "https://fastapi-production-f3ed3.up.railway.app" rather than treating the domain as a relative path.
const rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim();

function normalizeApiBaseUrl(url: string): string {
  // Strip trailing slashes up front so subsequent checks are consistent.
  let normalized = url.replace(/\/+$/, "");

  const isLocalHost =
    normalized.startsWith("http://localhost") ||
    normalized.startsWith("https://localhost") ||
    normalized.includes("127.0.0.1");

  if (isLocalHost) {
    // Local development: keep as-is, just make sure it has a protocol.
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `http://${normalized}`;
    }
    return normalized.replace(/\/+$/, "");
  }

  // Any other host (e.g. Railway domains like "*.up.railway.app") must be treated
  // as an absolute URL with an https:// protocol.
  if (/^https?:\/\//i.test(normalized)) {
    // Force https even if http was provided, since Railway domains are always https.
    normalized = normalized.replace(/^http:\/\//i, "https://");
  } else {
    normalized = `https://${normalized}`;
  }

  return normalized.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(rawApiUrl);
