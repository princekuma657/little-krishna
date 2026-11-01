export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Cannot reach the LittleKrishna API. Check your connection and try again.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const payload = body as { code?: string; message?: string; details?: string[] };
    const message = payload.details?.length ? payload.details.join(' ') : payload.message;
    throw new ApiError(res.status, payload.code ?? 'api_error', message ?? 'Request failed.');
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, payload?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(payload ?? {}) }),
  patch: <T>(path: string, payload?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(payload ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function displayError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
