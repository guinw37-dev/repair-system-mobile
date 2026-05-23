import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Base URL — override per hospital slug stored in SecureStore
export const DEFAULT_BASE = 'https://plk.pypl-engineering.online/api/paolo-kaset';

export const api = axios.create({
  baseURL: DEFAULT_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from SecureStore on every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('repair_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const base = await SecureStore.getItemAsync('repair_api_base');
  if (base) config.baseURL = base;
  return config;
});

// Expose helper to update base URL
export async function setApiBase(base: string) {
  await SecureStore.setItemAsync('repair_api_base', base);
  api.defaults.baseURL = base;
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync('repair_token', token);
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync('repair_token');
}
