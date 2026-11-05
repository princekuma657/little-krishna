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

const DEV_API_URL = 'https://little-krishna-2-bwx1.onrender.com/api/v1';
const PRODUCTION_API_URL = 'https://little-krishna-2-bwx1.onrender.com/api/v1';

/**
 * API base URL resolution.
 * - Dev: the relative `/api/v1` path rides the Vite dev proxy to the backend.
 * - Production (AWS Amplify): the browser must call the Render service
 *   directly. When `VITE_API_URL` is configured in the Amplify build
 *   environment as an absolute http(s) URL it wins; otherwise we fall back
 *   to the deployed Render endpoint so a missing or relative value can
 *   never 404 against the Amplify origin again.
 * This is a public, browser-facing URL only — no backend secrets belong
 * in frontend environment variables.
 */
const configured = (import.meta.env.VITE_API_URL ?? '').trim();
const BASE_URL = import.meta.env.PROD
  ? /^https?:\/\//i.test(configured)
    ? configured
    : PRODUCTION_API_URL
  : configured || DEV_API_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Cannot reach the LittleKrishna API at ' + BASE_URL + '. If you are running locally, start the backend with "npm run dev" from the repo root, or check that the Render backend is awake.');
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
