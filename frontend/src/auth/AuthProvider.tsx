import { Center, Loader } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { login as apiLogin, logout as apiLogout, me } from '../api/auth';
import type { User } from '../api/types';
import {
  clearSession,
  getRefreshToken,
  onSessionExpired,
  setSession,
} from '../lib/auth-storage';
import { AuthContext, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() =>
    getRefreshToken() ? 'loading' : 'anonymous',
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getRefreshToken()) {
      return;
    }

    let cancelled = false;

    me()
      .then((current) => {
        if (!cancelled) {
          setUser(current);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          setUser(null);
          setStatus('anonymous');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        setStatus('anonymous');
        queryClient.clear();
      }),
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiLogin({ email, password });
      setSession(result);
      queryClient.clear();
      setUser(result.user);
      setStatus('authenticated');
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      await apiLogout(refreshToken).catch(() => undefined);
    }

    clearSession();
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      status,
      user,
      canWrite: user !== null && user.role !== 'VIEWER',
      isAdmin: user?.role === 'ADMIN',
      login,
      logout,
    }),
    [status, user, login, logout],
  );

  if (status === 'loading') {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
