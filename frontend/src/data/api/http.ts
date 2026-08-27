const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

interface Envelope<T> {
  data?: T;
  error?: string;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  let body: Envelope<T> | null = null;
  try {
    body = await res.json();
  } catch {
    // Empty body (e.g. a 204 No Content) — leave body as null.
  }

  if (!res.ok) {
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }

  return body?.data as T;
}
