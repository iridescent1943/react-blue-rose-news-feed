import { useState } from 'react';

const ADMIN_AUTH_STORAGE_KEY = 'news-admin-authenticated';
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true'
  );

  function login(username: string, password: string): string | null {
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

  function logout() {
    sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    setAuthenticated(false);
  }

  return { authenticated, login, logout };
}
