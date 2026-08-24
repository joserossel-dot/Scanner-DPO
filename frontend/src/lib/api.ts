const configuredApiUrl = String((import.meta as any).env.VITE_API_URL || '').trim();

function normalizeApiUrl(url: string): string {
  if (!url) return '';
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, '');
}

function inferRenderApiUrl(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  if (!hostname.endsWith('.onrender.com')) return '';

  const serviceName = hostname.slice(0, -'.onrender.com'.length);
  if (!serviceName.endsWith('-dashboard')) return '';
  return `https://${serviceName.slice(0, -'-dashboard'.length)}-api.onrender.com`;
}

/** Canonical backend origin. An explicit VITE_API_URL always takes precedence. */
export const API_BASE = normalizeApiUrl(configuredApiUrl) || inferRenderApiUrl();

/**
 * Extracts a useful API error without assuming every failure response is JSON.
 * The fallback is returned for empty, malformed, or non-object bodies.
 */
export async function getApiError(response: Response, fallback: string): Promise<string> {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      if (body && typeof body === 'object') {
        const message = body.error || body.message || body.detail;
        if (typeof message === 'string' && message.trim()) return message.trim();
      }
    } else {
      const message = (await response.text()).trim();
      if (message && message.length <= 300) return message;
    }
  } catch {
    // Preserve the user-facing fallback when the server response is unreadable.
  }
  return fallback;
}
