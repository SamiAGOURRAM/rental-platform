import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  guestCheckout as apiGuestCheckout,
  logout as apiLogout,
  verifyMagicLink as apiVerifyMagicLink,
  type AuthUser,
} from '@/api/auth';
import { setAccessToken, setUnauthorizedHandler, fetchApi } from '@/api/client';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  guestCheckout: (data: { email: string; firstName: string; lastName: string }) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchApi<AuthUser>('/users/me');
    setUser(profile);
  }, []);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // On mount: try to restore session via httpOnly refresh cookie
  useEffect(() => {
    setUnauthorizedHandler(clearAuth);

    fetchApi<{ accessToken: string; refreshToken?: string } | null>('/auth/refresh', {
      method: 'POST',
    })
      .then((res) => {
        if (!res?.accessToken) return;
        setAccessToken(res.accessToken);
        return refreshProfile();
      })
      .catch(() => {
        /* No valid session — that's fine */
      })
      .finally(() => setLoading(false));
  }, [clearAuth, refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user: u } = await apiLogin(email, password);
    setAccessToken(accessToken);
    setUser(u);
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const { accessToken, user: u } = await apiRegister(data);
      setAccessToken(accessToken);
      setUser(u);
    },
    [],
  );

  const guestCheckout = useCallback(
    async (data: { email: string; firstName: string; lastName: string }) => {
      const { accessToken, user: u } = await apiGuestCheckout(data);
      setAccessToken(accessToken);
      setUser(u);
    },
    [],
  );

  const verifyMagicLink = useCallback(async (token: string) => {
    const { accessToken, user: u } = await apiVerifyMagicLink(token);
    setAccessToken(accessToken);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        refreshProfile,
        login,
        register,
        guestCheckout,
        verifyMagicLink,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
