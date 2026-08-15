/**
 * authFetch.ts
 * 
 * Centralized authenticated fetch helper.
 * Reads the JWT token from localStorage and injects it automatically
 * into every outbound request as `Authorization: Bearer <token>`.
 *
 * Usage:
 *   import { authFetch } from '@/lib/authFetch';
 *   const res = await authFetch('/api/ropa', { method: 'GET' });
 */

const TOKEN_KEY = 'dpo_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Authenticated fetch wrapper.
 * Automatically injects Authorization header if a token is present.
 * Falls through to window.fetch for requests that don't need auth
 * (the token simply won't be present in localStorage if the user is logged out).
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();

  const existingHeaders = (options.headers as Record<string, string>) || {};

  const headers: Record<string, string> = {
    ...existingHeaders
  };

  // Inject Authorization header if token exists and header not already set
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return window.fetch(url, { ...options, headers });
}
