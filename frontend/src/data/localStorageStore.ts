import type { DataStore } from './DataStore';

export const localStorageStore: DataStore = {
  async load<T>(key: string, fallback: T): Promise<T> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return fallback;
      return JSON.parse(stored) as T;
    } catch {
      return fallback;
    }
  },

  async save<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  },
};
