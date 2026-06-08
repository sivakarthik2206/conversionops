export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  requestId?: string;
  timestamp?: string;
}

function showGlobalToast(message: string, type: 'error' | 'info' | 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('co:toast', { detail: { message, type } }));
}

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Maps raw error codes/messages (Prisma codes, API error codes, network
 * failures) to copy a user can act on — never surface internals like P2025.
 */
export function getUserFriendlyError(error: unknown): string {
  let msg = '';
  if (error instanceof ApiClientError) {
    msg = `${error.error} ${error.message} ${error.statusCode}`;
  } else if (error instanceof Error) {
    msg = error.message;
  } else {
    msg = String(error);
  }

  if (msg.includes('P2025')) return 'Record not found.';
  if (msg.includes('P2002')) return 'This already exists.';
  if (msg.includes('P2003')) return 'Invalid reference.';
  if (msg.includes('UNAUTHORIZED')) return 'Session expired. Please sign in again.';
  if (msg.includes('FORBIDDEN')) return 'You do not have permission to do this.';
  if (msg.includes('QUOTA_EXCEEDED')) return 'AI quota reached. Upgrade your plan.';
  if (msg.includes('TCPA')) return 'Cannot send — number has opted out.';
  if (msg.includes('fetch failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) return 'Connection error. Check your internet.';
  if (msg.includes('500')) return 'Something went wrong. Try again in a moment.';
  return 'Something went wrong. Please try again.';
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('co_token');
}

function buildHeaders(extra?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const hadToken = !!localStorage.getItem('co_token');
      localStorage.removeItem('co_token');
      document.cookie = 'co_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      // Only redirect if there was actually a token (expired) or no token at all.
      // Either way, session is invalid — send to login.
      if (hadToken || !localStorage.getItem('co_token')) {
        window.location.href = '/login';
      }
    }
    throw new ApiClientError(401, 'UNAUTHORIZED', 'Session expired');
  }

  if (!res.ok) {
    let body: Partial<ApiError> = {};
    try {
      body = (await res.json()) as Partial<ApiError>;
    } catch {
      // ignore parse failure
    }

    const apiError = new ApiClientError(
      res.status,
      body.error ?? 'UNKNOWN_ERROR',
      body.message ?? `HTTP ${res.status}`,
      body.requestId,
    );

    if (res.status === 403 || res.status >= 500) {
      showGlobalToast(getUserFriendlyError(apiError), 'error');
    }

    throw apiError;
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

function resolveBaseURL(): string {
  const url = process.env['NEXT_PUBLIC_API_URL'];
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error(
      '[ConversionOps] NEXT_PUBLIC_API_URL is not configured. ' +
      'Set this environment variable in your Vercel project settings.',
    );
  }
  return url ?? 'http://localhost:3001/v1';
}

function getBaseURL(): string {
  if (typeof window === 'undefined') return process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
  return resolveBaseURL();
}

/**
 * Runs a fetch and maps low-level network failures (DNS, offline, CORS) to a
 * friendly toast + ApiClientError — these never reach handleResponse since
 * fetch() rejects before a Response exists.
 */
async function runFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    const networkError = new ApiClientError(0, 'NETWORK_ERROR', e instanceof Error ? e.message : 'fetch failed');
    showGlobalToast(getUserFriendlyError(networkError), 'error');
    throw networkError;
  }
}

export const apiClient = {
  /**
   * GET request with optional query params.
   */
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = `${getBaseURL()}${path}`;
    if (params) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await runFetch(url, { headers: buildHeaders() });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await runFetch(`${getBaseURL()}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await runFetch(`${getBaseURL()}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string): Promise<T> {
    const res = await runFetch(`${getBaseURL()}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    return handleResponse<T>(res);
  },
};
