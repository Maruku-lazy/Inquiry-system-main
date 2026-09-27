import type { ApiErrorBody } from '../types';


const API_BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'inquiry_tracker_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: ApiErrorBody['details'];

  constructor(status: number, body: ApiErrorBody) {
    super(body.error || 'Request failed');
    this.status = status;
    this.details = body.details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | undefined>;
}

// bearer token, JSON (de)serialization, and turning non-2xx responses into
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value);
    }
    const qsString = qs.toString();
    if (qsString) url += `?${qsString}`;
  }

  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(res.status, data ?? { error: res.statusText });
  }

  return data as T;
}
