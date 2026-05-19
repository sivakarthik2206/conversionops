export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  requestId?: string;
  timestamp?: string;
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

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
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
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
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
    throw new ApiClientError(
      res.status,
      body.error ?? 'UNKNOWN_ERROR',
      body.message ?? `HTTP ${res.status}`,
      body.requestId,
    );
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

const baseURL =
  typeof window !== 'undefined'
    ? (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1')
    : (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1');

export const apiClient = {
  /**
   * GET request with optional query params.
   */
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = `${baseURL}${path}`;
    if (params) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await fetch(url, { headers: buildHeaders() });
    return handleResponse<T>(res);
  },

  /**
   * POST request with JSON body.
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseURL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  /**
   * PATCH request with JSON body.
   */
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseURL}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  /**
   * DELETE request.
   */
  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${baseURL}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    return handleResponse<T>(res);
  },
};
