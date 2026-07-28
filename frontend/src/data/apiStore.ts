import type { DataStore } from './DataStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export const apiStore: DataStore = {
  async load<T>(key: string, fallback: T): Promise<T> {
    const res = await fetch(`${API_BASE_URL}/store/${encodeURIComponent(key)}`);
    if (res.status === 404) return fallback;
    if (!res.ok) throw new Error(`Failed to load "${key}": HTTP ${res.status}`);
    return (await res.json()) as T;
  },

  async save<T>(key: string, value: T): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/store/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    if (!res.ok) throw new Error(`Failed to save "${key}": HTTP ${res.status}`);
  },
};
