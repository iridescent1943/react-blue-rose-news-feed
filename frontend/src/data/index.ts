import type { DataStore } from './DataStore';
import { localStorageStore } from './localStorageStore';
import { apiStore } from './apiStore';

export const dataStore: DataStore =
  import.meta.env.VITE_DATA_BACKEND === 'api' ? apiStore : localStorageStore;

export type { DataStore };
