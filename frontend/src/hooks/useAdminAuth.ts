import { useEffect, useState } from 'react';
import { login as apiLogin, logout as apiLogout, fetchSession } from '../data/api/auth';

const IS_API_MODE = import.meta.env.VITE_DATA_BACKEND === 'api';
const ADMIN_AUTH_STORAGE_KEY = 'news-admin-authenticated';
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState(
    () => !IS_API_MODE && sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true'
  );

  useEffect(() => {
    if (!IS_API_MODE) return;
    fetchSession().then(setAuthenticated);
  }, []);

  async function login(username: string, password: string): Promise<string | null> {
    if (IS_API_MODE) {
      const error = await apiLogin(username, password);
      if (error) return error;
      setAuthenticated(true);
      return null;
    }

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return 'Admin credentials are not configured.';
    }

    if (username.trim() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return 'Invalid admin credentials';
    }

    sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
    setAuthenticated(true);
    return null;
  }

  async function logout() {
    if (IS_API_MODE) {
      await apiLogout();
      setAuthenticated(false);
      return;
    }
    sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    setAuthenticated(false);
  }

  return { authenticated, login, logout };
}
