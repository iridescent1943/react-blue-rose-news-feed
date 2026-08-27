import { apiRequest } from './http';

interface SessionUser {
  user_id: number;
  email: string;
  role: string;
}

export async function login(email: string, password: string): Promise<string | null> {
  try {
    await apiRequest<SessionUser>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Login failed';
  }
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/session', { method: 'DELETE' });
}

export async function fetchSession(): Promise<boolean> {
  const result = await apiRequest<{ authenticated: boolean; user: SessionUser | null }>('/session');
  return result.authenticated;
}
