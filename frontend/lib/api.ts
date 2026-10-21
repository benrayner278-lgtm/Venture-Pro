// Small fetch wrapper for the Venture-Pro backend.
// Adds the JWT from localStorage and sends the user to /login on a 401.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const AUTH_KEYS = ['token', 'userId', 'userName'] as const;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function saveSession(token: string, user: { id: string; name?: string | null }) {
  localStorage.setItem('token', token);
  localStorage.setItem('userId', user.id);
  localStorage.setItem('userName', user.name || '');
}

export function clearSession() {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

type ApiOptions = RequestInit & {
  /** Set false for login/signup so a 401 (wrong password) does not redirect */
  auth?: boolean;
  /** JSON body; sets Content-Type automatically */
  json?: unknown;
};

export async function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
  const { auth = true, json, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);

  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    rest.body = JSON.stringify(json);
  }

  const token = auth ? getToken() : null;
  if (token) finalHeaders.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders });

  if (auth && response.status === 401 && typeof window !== 'undefined') {
    clearSession();
    // Hard redirect on purpose: drops any in-memory state from the expired session
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }

  return response;
}
