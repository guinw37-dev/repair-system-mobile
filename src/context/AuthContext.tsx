import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getMe } from '../api/auth';
import { setApiBase } from '../api/client';

export interface User {
  id: number; name: string; username: string;
  role: string; hospital: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isTech: boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await SecureStore.getItemAsync('repair_token');
        if (t) {
          setToken(t);
          const u = await getMe();
          setUser(u);
        }
      } catch {
        await SecureStore.deleteItemAsync('repair_token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn(t: string, u: User) {
    await SecureStore.setItemAsync('repair_token', t);
    setToken(t);
    setUser(u);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('repair_token');
    setToken(null);
    setUser(null);
  }

  const role = user?.role ?? '';
  const isAdmin = role === 'admin' || role === 'dev_admin' || role === 'supervisor';
  const isTech  = role === 'technician' || role === 'tech';

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, isAdmin, isTech }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
