import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthSession, UserProfile } from '../types';
import { api } from '../services/api';

interface ResetResult {
  devResetUrl?: string;
  devResetToken?: string;
  message?: string;
}

interface AuthContextValue extends AuthSession {
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<ResetResult>;
  refresh: () => Promise<void>;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface MeResponse {
  user: UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((next: UserProfile | null) => {
    setUser(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<MeResponse>('/auth/me');
      applyUser(res.user);
    } catch {
      applyUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status: loading ? 'loading' : user ? 'authenticated' : 'anonymous',
      entitlements: user?.entitlements ?? [],
      loading,
      signIn: async (email: string, password: string) => {
        const res = await api.post<MeResponse>('/auth/login', { email, password });
        applyUser(res.user);
      },
      signUp: async (email: string, password: string, username: string) => {
        const res = await api.post<MeResponse>('/auth/register', { email, password, username });
        applyUser(res.user);
      },
      signOut: async () => {
        try {
          await api.post('/auth/logout');
        } finally {
          applyUser(null);
        }
      },
      requestPasswordReset: async (email: string) => {
        return api.post<ResetResult>('/auth/forgot-password', { email });
      },
      refresh,
      updateUser: applyUser,
    }),
    [user, loading, applyUser, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
