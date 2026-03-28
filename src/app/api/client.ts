const API_BASE = '/api/v1';

// ── snake_case → camelCase deep converter ───────────────────

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

function convertKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(convertKeys);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = convertKeys(value);
    }
    return result;
  }
  return obj;
}

// ── camelCase → snake_case deep converter (for request bodies) ──

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (ch) => '_' + ch.toLowerCase());
}

function convertKeysToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(convertKeysToSnake);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[camelToSnake(key)] = convertKeysToSnake(value);
    }
    return result;
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Convert camelCase request body to snake_case
  let processedOptions = options;
  if (options.body && typeof options.body === 'string') {
    try {
      const parsed = JSON.parse(options.body);
      processedOptions = { ...options, body: JSON.stringify(convertKeysToSnake(parsed)) };
    } catch { /* not JSON, send as-is */ }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...processedOptions,
    headers,
  });

  // Handle 401 by attempting a token refresh and retrying once
  if (response.status === 401) {
    const rt = localStorage.getItem('refresh_token');
    if (rt) {
      try {
        const refreshResp = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (refreshResp.ok) {
          const refreshData = await refreshResp.json();
          const tokens = convertKeys(refreshData) as any;
          if (tokens.success && tokens.data) {
            localStorage.setItem('access_token', tokens.data.accessToken);
            localStorage.setItem('refresh_token', tokens.data.refreshToken);
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${tokens.data.accessToken}`;
            const retryResponse = await fetch(`${API_BASE}${endpoint}`, { ...processedOptions, headers });
            if (retryResponse.status === 204) return null as T;
            const retryRaw = await retryResponse.json();
            const retryBody = convertKeys(retryRaw) as APIResponse<T>;
            if (!retryBody.success || retryBody.error) {
              throw new ApiError(
                retryBody.error?.code || 'UNKNOWN_ERROR',
                retryBody.error?.message || 'Произошла неизвестная ошибка',
                retryResponse.status,
              );
            }
            return retryBody.data as T;
          }
        }
      } catch (e) {
        if (e instanceof ApiError) throw e;
        /* refresh failed, fall through to original error */
      }
    }
  }

  if (response.status === 204) {
    return null as T;
  }

  const raw = await response.json();
  // Convert snake_case response to camelCase
  const body = convertKeys(raw) as APIResponse<T>;

  if (!body.success || body.error) {
    throw new ApiError(
      body.error?.code || 'UNKNOWN_ERROR',
      body.error?.message || 'Произошла неизвестная ошибка',
      response.status,
    );
  }

  return body.data as T;
}