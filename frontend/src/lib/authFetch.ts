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
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
}

/**
 * Authenticated fetch wrapper.
 * Automatically injects Authorization header if a token is present.
 * Falls through to window.fetch for requests that don't need auth.
 * Automatically cleans localStorage and redirects to /login on 401 or 403.
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

  try {
    const res = await window.fetch(url, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('dpo_token');
      localStorage.removeItem('token');
      localStorage.removeItem('dpo_user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return res;
  } catch (error) {
    console.error('[authFetch] Network error:', error);
    throw error;
  }
}
