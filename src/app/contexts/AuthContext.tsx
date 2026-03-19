import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type UserResponse, type AuthResponse, refreshToken as refreshTokenApi, logout as logoutApi } from '../api/auth';

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (data: AuthResponse) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuth = useCallback((data: AuthResponse) => {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
  }, []);

  const clearAuth = useCallback(() => {
    const rt = localStorage.getItem('refresh_token');
    if (rt) {
      logoutApi(rt).catch(() => {});
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const rt = localStorage.getItem('refresh_token');
    const savedUser = localStorage.getItem('user');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        clearAuth();
      }
    } else if (rt) {
      refreshTokenApi(rt)
        .then((data) => {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          const u = localStorage.getItem('user');
          if (u) setUser(JSON.parse(u));
        })
        .catch(() => clearAuth());
    }
    setIsLoading(false);
  }, [clearAuth]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  // Refresh token periodically (every 25 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const rt = localStorage.getItem('refresh_token');
      if (rt) {
        refreshTokenApi(rt)
          .then((data) => {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
          })
          .catch(() => clearAuth());
      }
    }, 25 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, clearAuth]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}