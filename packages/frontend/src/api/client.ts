const BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Module-level token — set by AuthContext on login/refresh, cleared on logout
let _accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  _accessToken = token;
}
export function getAccessToken() {
  return _accessToken;
}

// Called by AuthContext when 401 forces a logout
let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

async function doFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (options?.body != null) headers['Content-Type'] = 'application/json';
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // Let the caller decide whether to retry on 401
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? `Request failed with status ${response.status}`,
    );
  }

  const json = await response.json();
  return json.data as T;
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await doFetch<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // Token reuse detected — force re-authentication
      if (err.code === 'REFRESH_REVOKED') {
        setAccessToken(null);
        _onUnauthorized?.();
        window.location.href = '/login?reason=session_invalidated';
        throw err;
      }

      // Do not attempt refresh on auth endpoints (login, register, etc.)
      // to avoid redundant requests on expected 401 failures.
      if (path.startsWith('/auth/')) {
        setAccessToken(null);
        _onUnauthorized?.();
        throw err;
      }

      // Try to refresh the session
      try {
        const refresh = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refresh.ok) {
          const json = await refresh.json();
          const newToken = json?.data?.accessToken as string | undefined;
          if (newToken) {
            setAccessToken(newToken);
            return await doFetch<T>(path, options);
          }
        }
      } catch {
        // refresh failed
      }
      // Could not recover — clear token and notify
      setAccessToken(null);
      _onUnauthorized?.();
    }
    throw err;
  }
}
