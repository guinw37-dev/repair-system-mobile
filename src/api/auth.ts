import { api, setToken, clearAuth } from './client';

export interface LoginPayload { username: string; password: string; }
export interface User {
  id: number; name: string; username: string;
  role: string; hospital: string;
}

export async function login(payload: LoginPayload): Promise<{ token: string; user: User }> {
  const { data } = await api.post('/auth/login', payload);
  await setToken(data.token);
  return data;
}

export async function logout() {
  await clearAuth();
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data;
}
